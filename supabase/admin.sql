-- Execute depois de schema.sql no SQL Editor do Supabase.
-- Execute novamente sem risco caso precise reaplicar esta atualização.
-- Para autorizar sua conta, veja a consulta separada no README.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
drop policy if exists "admin sees own membership" on public.admin_users;
create policy "admin sees own membership" on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Um administrador pode autorizar contas já cadastradas. Senhas nunca são
-- lidas ou geradas pelo painel; cada pessoa usa a própria conta do Auth.
create or replace function public.admin_list_users()
returns table(user_id uuid, email text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return query
    select a.user_id, u.email::text, a.created_at
    from public.admin_users as a
    join auth.users as u on u.id = a.user_id
    order by a.created_at, u.email;
end;
$$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_add_user(p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select u.id into v_user_id from auth.users as u
  where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then
    raise exception 'Conta não encontrada. A pessoa precisa se cadastrar na loja primeiro.';
  end if;
  insert into public.admin_users (user_id) values (v_user_id)
  on conflict (user_id) do nothing;
  return v_user_id;
end;
$$;
revoke all on function public.admin_add_user(text) from public, anon;
grant execute on function public.admin_add_user(text) to authenticated;

create or replace function public.admin_remove_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Você não pode remover seu próprio acesso.';
  end if;
  lock table public.admin_users in exclusive mode;
  if (select count(*) from public.admin_users) <= 1 then
    raise exception 'A loja precisa manter pelo menos um administrador.';
  end if;
  delete from public.admin_users where user_id = p_user_id;
  if not found then raise exception 'Administrador não encontrado.'; end if;
end;
$$;
revoke all on function public.admin_remove_user(uuid) from public, anon;
grant execute on function public.admin_remove_user(uuid) to authenticated;

alter table public.products add column if not exists stock integer not null default 20;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_stock_nonnegative') then
    alter table public.products add constraint products_stock_nonnegative check (stock >= 0);
  end if;
end $$;

grant select, insert, update on public.products to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
revoke insert, update, delete on public.products from anon;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke delete on public.products from authenticated;

-- Produtos com pedidos ficam no histórico e só podem ser arquivados.
create or replace function public.admin_delete_product(p_product_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_image text;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select image into v_image from public.products where id = p_product_id for update;
  if not found then raise exception 'Produto não encontrado.'; end if;
  if exists (select 1 from public.order_items where product_id = p_product_id) then
    raise exception 'Este produto já aparece em pedidos. Arquive-o para preservar o histórico.';
  end if;
  delete from public.products where id = p_product_id;
  if exists (select 1 from public.products where image = v_image) then return null; end if;
  return v_image;
end;
$$;
revoke all on function public.admin_delete_product(text) from public, anon;
grant execute on function public.admin_delete_product(text) to authenticated;

drop policy if exists "admin reads all products" on public.products;
create policy "admin reads all products" on public.products
for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin adds products" on public.products;
create policy "admin adds products" on public.products
for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin edits products" on public.products;
create policy "admin edits products" on public.products
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admin reads all orders" on public.orders;
create policy "admin reads all orders" on public.orders
for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin reads all order items" on public.order_items;
create policy "admin reads all order items" on public.order_items
for select to authenticated using ((select public.is_admin()));

-- Exponha apenas uma função estreita para alterar o status. O navegador não
-- recebe permissão direta de UPDATE na tabela de pedidos.
create or replace function public.admin_set_order_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_previous text;
  v_item record;
  v_stock integer;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if p_status not in ('simulado', 'separando', 'enviado', 'entregue', 'cancelado') then
    raise exception 'Status inválido';
  end if;
  select status into v_previous from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_previous = p_status then return; end if;
  if v_previous <> 'cancelado' and p_status = 'cancelado' then
    for v_item in select product_id, sum(quantity)::integer as quantity from public.order_items
      where order_id = p_order_id group by product_id order by product_id loop
      update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
    end loop;
  elsif v_previous = 'cancelado' and p_status <> 'cancelado' then
    for v_item in select product_id, sum(quantity)::integer as quantity from public.order_items
      where order_id = p_order_id group by product_id order by product_id loop
      select stock into v_stock from public.products where id = v_item.product_id for update;
      if v_stock < v_item.quantity then raise exception 'Estoque insuficiente para reativar pedido'; end if;
      update public.products set stock = stock - v_item.quantity where id = v_item.product_id;
    end loop;
  end if;
  update public.orders set status = p_status where id = p_order_id;
end;
$$;
revoke all on function public.admin_set_order_status(uuid,text) from public, anon;
grant execute on function public.admin_set_order_status(uuid,text) to authenticated;

-- O estoque é verificado e reservado na mesma transação do pedido.
create or replace function public.place_order(p_items jsonb, p_address jsonb, p_payment_method text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_item record;
  v_product public.products%rowtype;
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_order_id uuid;
begin
  if v_user is null then raise exception 'Faça login para comprar'; end if;
  if p_payment_method not in ('pix','boleto','cartao') then raise exception 'Forma de pagamento inválida'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Carrinho inválido';
  end if;
  if jsonb_typeof(p_address) is distinct from 'object'
     or coalesce(p_address->>'cep','') !~ '^[0-9]{8}$'
     or length(trim(coalesce(p_address->>'street',''))) < 2
     or length(trim(coalesce(p_address->>'number',''))) < 1
     or length(trim(coalesce(p_address->>'district',''))) < 2
     or length(trim(coalesce(p_address->>'city',''))) < 2
     or coalesce(p_address->>'state','') !~ '^[A-Z]{2}$' then
    raise exception 'Endereço inválido';
  end if;
  for v_item in
    select * from jsonb_to_recordset(p_items) as item(product_id text, size text, quantity integer)
    order by product_id, size
  loop
    if v_item.quantity is null or v_item.quantity not between 1 and 10 then raise exception 'Quantidade inválida'; end if;
    select * into v_product from public.products where id = v_item.product_id and active = true for update;
    if not found or v_item.size is null or not (v_item.size = any(v_product.sizes)) then
      raise exception 'Produto ou tamanho indisponível';
    end if;
    if v_product.stock < v_item.quantity then raise exception 'Estoque insuficiente para %', v_product.name; end if;
    update public.products set stock = stock - v_item.quantity where id = v_product.id;
    v_subtotal := v_subtotal + v_product.price * v_item.quantity;
  end loop;
  v_shipping := public.shipping_for_cep(p_address->>'cep', v_subtotal);
  insert into public.orders(user_id, payment_method, address, shipping, total)
  values (v_user, p_payment_method, p_address, v_shipping, v_subtotal + v_shipping)
  returning id into v_order_id;
  for v_item in select * from jsonb_to_recordset(p_items) as item(product_id text, size text, quantity integer) loop
    select * into v_product from public.products where id = v_item.product_id;
    insert into public.order_items(order_id, product_id, name, size, quantity, unit_price)
    values (v_order_id, v_product.id, v_product.name, v_item.size, v_item.quantity, v_product.price);
  end loop;
  return v_order_id;
end;
$$;
revoke all on function public.place_order(jsonb,jsonb,text) from public, anon;
grant execute on function public.place_order(jsonb,jsonb,text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin uploads product images" on storage.objects;
create policy "admin uploads product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists "admin removes product images" on storage.objects;
create policy "admin removes product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));
