# movva. — e-commerce de moda e tênis

Projeto final de Desenvolvimento Web (3º DS), feito com React, TypeScript, Vite e Supabase. O site tem páginas de início, catálogo, produto, carrinho, login/cadastro, checkout, confirmação e área do cliente. O layout se adapta a desktop, tablet e celular.

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
2. Cole e execute todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Authentication → URL Configuration**, configure `Site URL` e os endereços de redirecionamento do ambiente local e do site publicado.
4. Em **Authentication → Providers → Email**, mantenha a confirmação por e-mail e teste o link de confirmação. Se preferir desligá-la apenas durante a apresentação, reative-a depois.
5. Reinicie o servidor local. O aviso “Catálogo de exemplo” deve desaparecer quando a tabela `products` estiver acessível.

Sem o SQL, a loja mostra produtos de exemplo, mas **não consegue gravar pedidos no Supabase**. Para testar o fluxo inteiro sem configurar o banco, acrescente `VITE_DEMO_MODE=1` ao `.env.local` e reinicie o Vite. Nesse modo, os dados ficam apenas no `localStorage` do navegador; login e pedidos são simulações.

## Como funciona

- **Catálogo público:** lista, pesquisa, filtros por categoria e ordenação; os dados vêm da tabela `products` quando o Supabase está pronto.
- **Conta:** cadastro e login com Supabase Auth. A sessão é persistida pelo SDK. Cada usuário acessa apenas seu perfil e seus pedidos graças às políticas RLS.
- **Carrinho:** itens e quantidades ficam no navegador até a compra.
- **Entrega:** consulta o endereço na [API oficial do ViaCEP](https://viacep.com.br/) e calcula um **frete demonstrativo** pela faixa inicial do CEP. A função SQL recalcula o frete na confirmação. Compras a partir de R$ 399 têm frete grátis. A estimativa de prazo é ilustrativa.
- **Pagamento:** Pix, boleto e cartão são **simulados**. O site não coleta número, validade nem código de segurança de cartão e não gera cobranças reais.
- **Pedidos:** a função `place_order` valida usuário, itens, tamanhos e quantidades; lê os preços do banco; calcula o total e cria pedido e itens em uma transação.
- **Dados:** CPF é validado por dígitos verificadores no formulário e no banco. O React escapa o texto exibido; consultas usam o SDK Supabase, sem SQL concatenado pelo cliente.

### Organização do código (MVC)

| Camada | Arquivos | Responsabilidade |
| --- | --- | --- |
| Visão | `src/App.tsx`, `src/style.css` | Páginas, componentes, formulários e responsividade |
| Controle | `src/store.tsx` | Sessão, carrinho, pedidos e chamadas de dados |
| Modelo/regras | `src/data.ts`, `src/supabase.ts`, `supabase/schema.sql` | Tipos, validações, frete, persistência, RLS e transação |

## Publicar com HTTPS

1. Execute `npm run build`.
2. Publique a pasta `dist/` em uma hospedagem estática com HTTPS, como Netlify ou Vercel.
3. Configure a hospedagem para entregar `index.html` nas rotas internas do React Router. Em Netlify, o arquivo `public/_redirects` já prepara isso.
4. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de build da hospedagem. São **valores públicos**. Não configure a chave secreta.
5. Adicione o domínio HTTPS publicado às URLs permitidas em Supabase Authentication.
6. Teste cadastro, confirmação de e-mail, login, CEP, pedido e histórico no domínio publicado antes de entregar o link no Teams.

O endereço HTTPS definitivo depende da conta de hospedagem e ainda precisa ser gerado. O arquivo `public/robots.txt`, títulos por página, HTML semântico, descrições e imagens locais apoiam o SEO. Como a loja é uma SPA, páginas de produto seriam indexadas com mais robustez se fossem pré-renderizadas ou migradas para renderização no servidor em uma versão de produção.

### Plano de SEM para apresentação

Campanha de pesquisa hipotética para termos como **“tênis casual unissex”**, **“roupas streetwear feminino”** e **“tênis para corrida confortável”**, direcionando cada anúncio à categoria ou ao produto correspondente. O público inicial seria de pessoas de 16 a 30 anos interessadas em moda e esporte no Brasil. Mensuraríamos cliques, visitas ao produto e pedidos simulados para avaliar relevância. Nenhuma campanha real ou investimento é necessário neste projeto.

## Verificação

```bash
npm run build
```

O fluxo completo em modo de demonstração foi exercitado no navegador: escolher produto e tamanho, adicionar ao carrinho, consultar CEP, entrar, concluir pedido e consultar o histórico. As fotos locais foram obtidas do [Unsplash](https://unsplash.com/) para fins acadêmicos; imagens de marcas visíveis são ilustrativas e não indicam parceria comercial.
