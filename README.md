# movva. — e-commerce de moda e tênis

Projeto final de Desenvolvimento Web (3º DS), feito com React, TypeScript, Vite e Supabase. O site tem páginas de início, catálogo, produto, carrinho, login/cadastro, checkout, confirmação, área do cliente e painel administrativo. O layout se adapta a desktop, tablet e celular.

## Rodar localmente

Requisitos: Node.js 20.19+ ou 22.12+ e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, copie o arquivo com `Copy-Item .env.example .env.local`. Abra o endereço mostrado pelo Vite.

O arquivo `.env.local` já foi configurado neste computador com **somente a URL e a chave publicável** do projeto Supabase informado. Ele é ignorado pelo Git. Nunca coloque uma chave `sb_secret_...` ou `service_role` no frontend.

## Preparar o Supabase

1. Abra o projeto em [Supabase](https://supabase.com/dashboard) → **SQL Editor** → **New query**.
2. Cole e execute todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Se já executou antes, não precisa repetir.
3. Cole e execute todo o conteúdo de [`supabase/admin.sql`](supabase/admin.sql) para ativar o painel, o estoque e o armazenamento das imagens.
4. Em **Authentication → URL Configuration**, configure `Site URL` e os endereços de redirecionamento do ambiente local e do site publicado.
5. Em **Authentication → Providers → Email**, mantenha a confirmação por e-mail e teste o link de confirmação. Se preferir desligá-la apenas durante a apresentação, reative-a depois.
6. Reinicie o servidor local. O aviso “Catálogo de exemplo” deve desaparecer quando a tabela `products` estiver acessível.

### Criar o primeiro administrador

1. Não existe um e-mail padrão da loja. Abra `/entrar`, clique em **Criar conta** e use um e-mail seu, ao qual você tenha acesso, com uma senha escolhida por você. Confirme o e-mail recebido se a confirmação estiver ativa. Nunca envie sua senha a outra pessoa.
2. No **SQL Editor** do Supabase, substitua o e-mail abaixo pelo da conta criada e execute:

```sql
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('SEU_EMAIL_AQUI')
on conflict (user_id) do nothing
returning user_id;
```

3. A consulta retorna um `user_id` na primeira autorização. Se aparecer “No rows returned”, a conta pode não existir ou já estar autorizada. Confira com a consulta abaixo, usando o mesmo e-mail:

```sql
select u.email, a.user_id
from auth.users u
left join public.admin_users a on a.user_id = u.id
where lower(u.email) = lower('SEU_EMAIL_AQUI');
```

Se não vier nenhuma linha, crie a conta em `/entrar`. Se `user_id` vier vazio, execute o `insert` novamente com o e-mail correto. Se aparecer um UUID em `user_id`, atualize a página da loja; o link **Admin** aparecerá no menu. A rota direta é `/admin`.

Não crie uma opção de cadastro de administrador no site: essa permissão só deve ser concedida pelo SQL Editor. A tabela `admin_users` e as políticas RLS impedem que clientes comuns atribuam essa permissão a si mesmos.

Sem o SQL, a loja mostra produtos de exemplo, mas **não consegue gravar pedidos no Supabase**. Para testar o fluxo inteiro sem configurar o banco, acrescente `VITE_DEMO_MODE=1` ao `.env.local` e reinicie o Vite. Nesse modo, os dados ficam apenas no `localStorage` do navegador; login e pedidos são simulações.
O painel administrativo exige Supabase e fica indisponível nesse modo.

## Como funciona

- **Catálogo público:** lista, pesquisa, filtros por categoria e ordenação; os dados vêm da tabela `products` quando o Supabase está pronto.
- **Conta:** cadastro e login com Supabase Auth. A sessão é persistida pelo SDK. Cada usuário acessa apenas seu perfil e seus pedidos graças às políticas RLS.
- **Carrinho:** itens e quantidades ficam no navegador até a compra.
- **Entrega:** consulta o endereço na [API oficial do ViaCEP](https://viacep.com.br/) e calcula um **frete demonstrativo** pela faixa inicial do CEP. A função SQL recalcula o frete na confirmação. Compras a partir de R$ 399 têm frete grátis. A estimativa de prazo é ilustrativa.
- **Pagamento:** Pix, boleto e cartão são **simulados**. O site não coleta número, validade nem código de segurança de cartão e não gera cobranças reais.
- **Pedidos:** a função `place_order` valida usuário, itens, tamanhos e quantidades; lê os preços do banco; calcula o total e cria pedido e itens em uma transação.
- **Admin:** `/admin` exibe pedidos, valor demonstrativo acumulado, produtos ativos e alertas de estoque. Em **Produtos**, é possível cadastrar/editar itens, enviar fotos, definir preços, tamanhos, destaque e estoque, além de arquivar/reativar. Em **Pedidos**, é possível ver itens e endereço e atualizar o status. Cancelar um pedido devolve as unidades ao estoque; reativá-lo reserva novamente. A autorização é verificada no banco.
- **Dados:** CPF é validado por dígitos verificadores no formulário e no banco. O React escapa o texto exibido; consultas usam o SDK Supabase, sem SQL concatenado pelo cliente.

### Organização do código (MVC)

| Camada | Arquivos | Responsabilidade |
| --- | --- | --- |
| Visão | `src/App.tsx`, `src/Admin.tsx`, `src/style.css`, `src/admin.css` | Páginas, componentes, formulários e responsividade |
| Controle | `src/store.tsx` | Sessão, carrinho, pedidos e chamadas de dados |
| Modelo/regras | `src/data.ts`, `src/supabase.ts`, `supabase/schema.sql`, `supabase/admin.sql` | Tipos, validações, frete, persistência, RLS e transação |

## Publicar com HTTPS na Vercel

1. Envie o projeto para um repositório e importe-o na Vercel como projeto **Vite**. Use `npm run build` e a pasta de saída `dist`.
2. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na Vercel com a URL do projeto Supabase e **somente a chave publicável**. Nunca configure a chave `sb_secret_...` no frontend.
3. O arquivo [`vercel.json`](vercel.json) faz as rotas internas do React Router abrirem diretamente, como `/admin` e `/produto/...`.
4. Adicione o domínio HTTPS da Vercel em **Supabase Authentication → URL Configuration**.
5. Teste cadastro, confirmação de e-mail, login, criação de produto, pedido e painel no domínio publicado antes de compartilhar o link no Teams.

O arquivo `public/robots.txt`, títulos por página, HTML semântico, descrições e imagens locais apoiam o SEO. Como a loja é uma SPA, páginas de produto seriam indexadas com mais robustez se fossem pré-renderizadas ou migradas para renderização no servidor em uma versão de produção.

### Plano de SEM para apresentação

Campanha de pesquisa hipotética para termos como **“tênis casual unissex”**, **“roupas streetwear feminino”** e **“tênis para corrida confortável”**, direcionando cada anúncio à categoria ou ao produto correspondente. O público inicial seria de pessoas de 16 a 30 anos interessadas em moda e esporte no Brasil. Mensuraríamos cliques, visitas ao produto e pedidos simulados para avaliar relevância. Nenhuma campanha real ou investimento é necessário neste projeto.

## Verificação

```bash
npm run build
```

O fluxo completo em modo de demonstração foi exercitado no navegador: escolher produto e tamanho, adicionar ao carrinho, consultar CEP, entrar, concluir pedido e consultar o histórico. As fotos locais foram obtidas do [Unsplash](https://unsplash.com/) para fins acadêmicos; imagens de marcas visíveis são ilustrativas e não indicam parceria comercial.
