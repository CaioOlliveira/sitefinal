-- Execute este arquivo uma vez no SQL Editor do projeto Supabase.
-- A chave secreta/service_role nunca deve ser colocada no frontend.

create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  category text not null check (category in ('Tênis', 'Roupas', 'Acessórios')),
  subtitle text not null,
  price numeric(10,2) not null check (price >= 0),
  old_price numeric(10,2),
  image text not null,
  badge text,
  description text not null,
  sizes text[] not null,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

create or replace function public.valid_cpf(value text)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  clean text := regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g');
  position integer;
  digit integer;
  total integer;
begin
  if length(clean) <> 11 or clean = repeat(left(clean, 1), 11) then return false; end if;
  for position in 9..10 loop
    total := 0;
    for digit in 1..position loop
      total := total + substring(clean from digit for 1)::integer * (position + 2 - digit);
    end loop;
    if substring(clean from position + 1 for 1)::integer <> case when (total * 10) % 11 = 10 then 0 else (total * 10) % 11 end then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  cpf text check (cpf is null or cpf = '' or public.valid_cpf(cpf)),
  phone text not null default '',
  default_address jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_movva on auth.users;
create trigger on_auth_user_created_movva
after insert on auth.users for each row execute function public.create_profile_for_user();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'simulado',
  payment_method text not null check (payment_method in ('pix','boleto','cartao')),
  address jsonb not null,
  shipping numeric(10,2) not null check (shipping >= 0),
  total numeric(10,2) not null check (total >= 0)
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  name text not null,
  size text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);

alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products" on public.products for select to anon, authenticated using (active);

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid()))
);

create or replace function public.shipping_for_cep(p_cep text, p_subtotal numeric)
returns numeric language plpgsql immutable set search_path = public as $$
begin
  if p_cep !~ '^[0-9]{8}$' then raise exception 'CEP inválido'; end if;
  if p_subtotal >= 399 then return 0; end if;
  return case substring(p_cep from 1 for 1)
    when '0' then 14.90 when '1' then 14.90
    when '2' then 19.90 when '3' then 19.90
    when '4' then 24.90 when '5' then 29.90
    when '6' then 34.90 when '7' then 24.90
    when '8' then 19.90 when '9' then 19.90
  end;
end;
$$;

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

  for v_item in select * from jsonb_to_recordset(p_items) as item(product_id text, size text, quantity integer) loop
    if v_item.quantity is null or v_item.quantity not between 1 and 10 then raise exception 'Quantidade inválida'; end if;
    select * into v_product from public.products where id = v_item.product_id and active = true;
    if not found or v_item.size is null or not (v_item.size = any(v_product.sizes)) then raise exception 'Produto ou tamanho indisponível'; end if;
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
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.orders, public.order_items to authenticated;

insert into public.products (id,slug,name,category,subtitle,price,old_price,image,badge,description,sizes,featured,sort_order) values
('1','tenis-velocity-red','Tênis Velocity Red','Tênis','Corrida • Unissex',329.90,429.90,'/images/shoe-red.jpg','MAIS VENDIDO','Leveza para acompanhar cada quilômetro. Cabedal respirável e solado macio para o movimento diário.',array['34','35','36','37','38','39','40','41','42','43'],true,1),
('2','tenis-court-classic','Tênis Court Classic','Tênis','Lifestyle • Unissex',289.90,null,'/images/shoe-white.jpg','NOVO','O clássico branco que combina com qualquer rotina. Linhas minimalistas e conforto do primeiro ao último passo.',array['34','35','36','37','38','39','40','41','42'],true,2),
('3','tenis-air-pulse','Tênis Air Pulse','Tênis','Treino • Unissex',419.90,499.90,'/images/shoe-neutral.jpg','-16%','Amortecimento responsivo e presença marcante para treinar ou explorar a cidade.',array['36','37','38','39','40','41','42','43'],true,3),
('4','tenis-street-jump','Tênis Street Jump','Tênis','Lifestyle • Unissex',379.90,null,'/images/shoe-black.jpg',null,'Atitude urbana para quem encontra estilo em cada movimento.',array['35','36','37','38','39','40','41','42','43'],true,4),
('5','camiseta-street-signal','Camiseta Street Signal','Roupas','Casual • Feminino',119.90,159.90,'/images/tee.jpg','-25%','Uma peça leve e descontraída para compor looks cheios de personalidade.',array['PP','P','M','G','GG'],false,5),
('6','jaqueta-city-edge','Jaqueta City Edge','Roupas','Lifestyle • Unissex',359.90,null,'/images/jacket.jpg','NOVO','Camada de atitude para os dias frios, com corte marcante e acabamento confortável.',array['P','M','G','GG'],false,6),
('7','conjunto-sun-move','Conjunto Sun Move','Roupas','Lifestyle • Feminino',249.90,299.90,'/images/category-style.jpg','-17%','Cor, conforto e energia em um conjunto feito para acompanhar o seu ritmo.',array['PP','P','M','G'],false,7),
('8','mochila-daily-track','Mochila Daily Track','Acessórios','Urbano • Unissex',189.90,null,'/images/bag.jpg',null,'Espaço na medida para levar o essencial do treino à rua.',array['Único'],false,8)
on conflict (id) do nothing;
