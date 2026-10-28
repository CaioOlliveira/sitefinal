import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, CreditCard, LockKeyhole, MapPin, Menu, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Trash2, Truck, UserRound } from 'lucide-react'
import { digits, lookupCep, money, shippingForCep, validCpf, type Address, type Product } from './data'
import { useShop } from './store'
import { isDemo } from './supabase'
import './style.css'
import './auth.css'

const Admin = lazy(() => import('./Admin'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function PageMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const titles: Record<string, string> = { '/': 'movva. — Vista o seu movimento', '/catalogo': 'Tênis, roupas e acessórios | movva.', '/carrinho': 'Meu carrinho | movva.', '/entrar': 'Entrar ou criar conta | movva.', '/checkout': 'Finalizar compra | movva.', '/conta': 'Minha conta | movva.' }
    if (pathname.startsWith('/admin')) { document.title = 'Painel administrativo | movva.'; return }
    document.title = titles[pathname] || (pathname.startsWith('/produto/') ? 'Produto | movva.' : 'Pedido | movva.')
  }, [pathname])
  return null
}

function Header() {
  const { cartCount, customer, isAdmin } = useShop()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [term, setTerm] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => { setMenuOpen(false); setSearchOpen(false) }, [location.pathname])
  function submitSearch(event: FormEvent) { event.preventDefault(); navigate(`/catalogo?busca=${encodeURIComponent(term.trim())}`); setSearchOpen(false) }
  return <>
    <div className="topline"><span>FRETE GRÁTIS A PARTIR DE R$ 399</span><span className="topline-right">MOVIMENTO É PARA TODO MUNDO <Sparkles size={13} /></span></div>
    <header className="site-header">
      <div className="header-inner container">
        <button className="icon-button mobile-only" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={24} /></button>
        <Link to="/" className="logo" aria-label="Movva, página inicial">movva<span className="logo-dot">.</span></Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <NavLink to="/catalogo">Novidades</NavLink>
          <NavLink to="/catalogo?categoria=Tênis">Tênis</NavLink>
          <NavLink to="/catalogo?categoria=Roupas">Roupas</NavLink>
          <NavLink to="/catalogo?categoria=Acessórios">Acessórios</NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Buscar produtos"><Search size={21} strokeWidth={1.8} /></button>
          <Link className="icon-button desktop-action" to={customer ? '/conta' : '/entrar'} aria-label="Minha conta"><UserRound size={21} strokeWidth={1.8} /></Link>
          <Link className="icon-button bag-link" to="/carrinho" aria-label={`Carrinho com ${cartCount} itens`}><ShoppingBag size={21} strokeWidth={1.8} />{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}</Link>
        </div>
      </div>
      {searchOpen && <form className="search-panel container" onSubmit={submitSearch}><Search size={19}/><input autoFocus value={term} onChange={event => setTerm(event.target.value)} placeholder="O que você procura?" aria-label="Buscar produtos"/><button type="submit">Buscar <ArrowRight size={16}/></button></form>}
      {menuOpen && <nav className="mobile-nav" aria-label="Menu mobile"><Link to="/catalogo">Ver todos</Link><Link to="/catalogo?categoria=Tênis">Tênis</Link><Link to="/catalogo?categoria=Roupas">Roupas</Link><Link to="/catalogo?categoria=Acessórios">Acessórios</Link><Link to={customer ? '/conta' : '/entrar'}>Minha conta</Link>{isAdmin && <Link to="/admin">Painel administrativo</Link>}</nav>}
    </header>
  </>
}

function Footer() {
  return <footer className="footer"><div className="container footer-grid"><div><Link className="logo footer-logo" to="/">movva<span className="logo-dot">.</span></Link><p>Feita para quem vive em movimento. Encontre o seu próximo passo com estilo e atitude.</p><span className="footer-small">Projeto acadêmico • Loja demonstrativa</span></div><div><h4>EXPLORE</h4><Link to="/catalogo">Todos os produtos</Link><Link to="/catalogo?categoria=Tênis">Tênis</Link><Link to="/catalogo?categoria=Roupas">Roupas</Link><Link to="/catalogo?categoria=Acessórios">Acessórios</Link></div><div><h4>SUA CONTA</h4><Link to="/conta">Meus pedidos</Link><Link to="/carrinho">Meu carrinho</Link><Link to="/entrar">Entrar ou cadastrar</Link></div><div><h4>COMPRA TRANQUILA</h4><p>Entrega calculada pelo CEP. Pagamentos apenas simulados para fins acadêmicos.</p><div className="footer-trust"><ShieldCheck size={19}/> Ambiente de demonstração</div></div></div><div className="container footer-bottom"><span>© 2026 movva. Projeto de e-commerce.</span><span>Feito para acompanhar o seu ritmo.</span></div></footer>
}

function ProductCard({ product }: { product: Product }) {
  return <Link to={`/produto/${product.slug}`} className="product-card"><div className="product-image"><img src={product.image} alt={product.name} loading="lazy"/>{product.badge && <span className="product-badge">{product.badge}</span>}<span className="product-arrow"><ArrowRight size={19}/></span></div><div className="product-meta"><span>{product.subtitle}</span><h3>{product.name}</h3><div className="price-line"><strong>{money(product.price)}</strong>{product.old_price && <del>{money(product.old_price)}</del>}</div></div></Link>
}

function SectionTitle({ eyebrow, title, link, href }: { eyebrow: string; title: string; link?: string; href?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{link && <Link to={href || '/catalogo'} className="text-link">{link}<ArrowRight size={18}/></Link>}</div>
}

function Home() {
  const { products } = useShop()
  return <main>
    <section className="hero"><div className="hero-copy"><span className="hero-kicker"><span></span> NOVA TEMPORADA / 2026</span><h1>VISTA O<br/><em>SEU</em><br/>MOVIMENTO.</h1><p>Peças que acompanham o seu ritmo. Do treino às ruas, encontre um novo jeito de ir mais longe.</p><Link to="/catalogo" className="button button-lime">EXPLORAR COLEÇÃO <ArrowRight size={19}/></Link><div className="hero-index"><span>01</span><div></div><span>03</span><small>ESTILO EM CADA PASSO</small></div></div><div className="hero-visual"><img src="/images/category-style.jpg" alt="Modelo usando conjunto esportivo amarelo"/><span className="hero-stamp">MOVE<br/>WITH<br/>STYLE <ArrowRight size={26}/></span><div className="hero-vertical">MADE TO MOVE • MADE TO MOVE • MADE TO MOVE</div></div></section>
    <div className="benefits container"><div><Truck size={27}/><span><strong>FRETE GRÁTIS</strong><small>Nas compras acima de R$ 399</small></span></div><div><ShieldCheck size={27}/><span><strong>COMPRA SEGURA</strong><small>Seus dados com proteção</small></span></div><div><Package size={27}/><span><strong>ESTILO SEM PAUSA</strong><small>Novidades para todo momento</small></span></div></div>
    <section className="section container"><SectionTitle eyebrow="ESCOLHAS QUE MOVEM" title="Destaques da vez." link="VER TODOS"/><div className="product-grid">{products.filter(p => p.featured).slice(0, 4).map(product => <ProductCard key={product.id} product={product}/>)}</div></section>
    <section className="categories-section container"><SectionTitle eyebrow="ENCONTRE SEU RITMO" title="Escolha seu caminho."/><div className="category-grid"><Link to="/catalogo?categoria=Tênis" className="category-card category-shoes"><img src="/images/shoe-black.jpg" alt="Tênis em destaque"/><div><span>01 / ESSENCIAIS</span><h3>Tênis</h3><span className="round-arrow"><ArrowRight size={20}/></span></div></Link><Link to="/catalogo?categoria=Roupas" className="category-card category-clothes"><img src="/images/category-style.jpg" alt="Coleção de roupas"/><div><span>02 / EXPRESSE-SE</span><h3>Roupas</h3><span className="round-arrow"><ArrowRight size={20}/></span></div></Link><Link to="/catalogo?categoria=Acessórios" className="category-card category-accessories"><img src="/images/bag.jpg" alt="Mochila e acessórios"/><div><span>03 / COMPLETE O LOOK</span><h3>Acessórios</h3><span className="round-arrow"><ArrowRight size={20}/></span></div></Link></div></section>
    <section className="manifesto"><div className="container manifesto-inner"><div><span className="eyebrow">O SEU PRÓXIMO PASSO COMEÇA AQUI</span><h2>O estilo nunca<br/><em>fica parado.</em></h2><p>Para correr, criar, explorar ou simplesmente ser você. O movimento é o nosso ponto de partida.</p><Link to="/catalogo" className="button button-dark">DESCOBRIR PRODUTOS <ArrowRight size={18}/></Link></div><div className="manifesto-number">MOVE<br/>MORE<span>↗</span></div></div></section>
    <section className="section container"><SectionTitle eyebrow="PARA IR ALÉM" title="Mais para você." link="VER CATÁLOGO"/><div className="product-grid">{products.filter(p => !p.featured).slice(0,4).map(product => <ProductCard key={product.id} product={product}/>)}</div></section>
    <section className="newsletter container"><div><span className="eyebrow">#MOVVASEMPRE</span><h2>Seu ritmo. Suas regras.</h2><p>Encontre peças que combinam com a sua energia.</p></div><Link to="/catalogo" className="button button-outline">ENCONTRE SEU ESTILO <ArrowRight size={18}/></Link></section>
  </main>
}

function Catalog() {
  const { products } = useShop()
  const [params, setParams] = useSearchParams()
  const category = params.get('categoria') || 'Todos'
  const search = params.get('busca') || ''
  const [sort, setSort] = useState('destaques')
  const filtered = useMemo(() => {
    const result = products.filter(p => (category === 'Todos' || p.category === category) && `${p.name} ${p.subtitle} ${p.category}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
    if (sort === 'menor') result.sort((a,b) => a.price - b.price)
    if (sort === 'maior') result.sort((a,b) => b.price - a.price)
    if (sort === 'nome') result.sort((a,b) => a.name.localeCompare(b.name))
    return result
  }, [products, category, search, sort])
  return <main className="container inner-page"><div className="breadcrumb"><Link to="/">Início</Link><ChevronRight size={14}/>Catálogo</div><div className="catalog-heading"><div><span className="eyebrow">EXPLORE A MOVVA</span><h1>{search ? `Resultados para “${search}”` : category === 'Todos' ? 'Encontre seu próximo passo.' : category}</h1><p>Estilo, conforto e movimento para todos os seus dias.</p></div><div className="catalog-count">{filtered.length} PRODUTOS</div></div><div className="catalog-toolbar"><div className="category-tabs">{['Todos','Tênis','Roupas','Acessórios'].map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => { const next = new URLSearchParams(params); if (item === 'Todos') next.delete('categoria'); else next.set('categoria', item); setParams(next) }}>{item}</button>)}</div><label className="sort-control"><SlidersHorizontal size={17}/><span>Ordenar:</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="destaques">Destaques</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option><option value="nome">Nome A–Z</option></select><ChevronDown size={15}/></label></div>{filtered.length ? <div className="product-grid catalog-grid">{filtered.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <div className="empty-state"><Search size={42}/><h2>Nenhum produto encontrado</h2><p>Tente outra busca ou explore todo o catálogo.</p><Link to="/catalogo" className="button button-dark">VER TODOS OS PRODUTOS</Link></div>}</main>
}

function ProductDetail() {
  const { slug } = useParams()
  const { products, addItem } = useShop()
  const product = products.find(p => p.slug === slug)
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  useEffect(() => { setSize(''); setQuantity(1); setMessage('') }, [slug])
  if (!product) return <main className="container empty-state"><h1>Produto não encontrado.</h1><Link className="button button-dark" to="/catalogo">VOLTAR AO CATÁLOGO</Link></main>
  function add() { if (product?.stock === 0) { setMessage('Produto esgotado no momento.'); return } if (!size) { setMessage('Selecione um tamanho para continuar.'); return } if (product?.stock !== undefined && quantity > product.stock) { setMessage(`Restam ${product.stock} unidade(s) em estoque.`); return } addItem(product!.id, size, quantity); setMessage('Produto adicionado ao carrinho!') }
  return <main className="container inner-page"><div className="breadcrumb"><Link to="/">Início</Link><ChevronRight size={14}/><Link to="/catalogo">Catálogo</Link><ChevronRight size={14}/>{product.name}</div><div className="detail-layout"><div className="detail-image"><img src={product.image} alt={product.name}/>{product.badge && <span className="product-badge">{product.badge}</span>}</div><div className="detail-info"><span className="eyebrow">MOVVA / {product.category.toUpperCase()}</span><h1>{product.name}</h1><p className="detail-subtitle">{product.subtitle}</p><div className="detail-price">{product.old_price && <del>{money(product.old_price)}</del>}<strong>{money(product.price)}</strong><small>ou até 6x de {money(product.price/6)} sem juros*</small></div><div className="divider"/><p className="detail-description">{product.description}</p>{product.stock !== undefined && <p className="detail-stock">{product.stock === 0 ? 'Esgotado no momento' : product.stock <= 5 ? `Últimas ${product.stock} unidade(s) disponíveis` : 'Em estoque'}</p>}<div className="size-heading"><strong>ESCOLHA O TAMANHO</strong><small>{size ? `Selecionado: ${size}` : 'Selecione uma opção'}</small></div><div className="size-list">{product.sizes.map(item => <button key={item} onClick={() => { setSize(item); setMessage('') }} className={size === item ? 'selected' : ''}>{item}</button>)}</div><div className="purchase-row"><div className="qty-control"><button onClick={() => setQuantity(Math.max(1, quantity-1))} aria-label="Diminuir quantidade"><Minus size={16}/></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(10, product.stock ?? 10, quantity+1))} aria-label="Aumentar quantidade"><Plus size={16}/></button></div><button onClick={add} disabled={product.stock === 0} className="button button-dark add-button">{product.stock === 0 ? 'ESGOTADO' : 'ADICIONAR AO CARRINHO'} <ShoppingBag size={18}/></button></div>{message && <p className={`form-message ${message === 'Produto adicionado ao carrinho!' ? 'success' : 'error'}`}>{message} {message === 'Produto adicionado ao carrinho!' && <Link to="/carrinho">Ver carrinho →</Link>}</p>}<div className="detail-perks"><div><Truck size={20}/> Frete grátis a partir de R$ 399</div><div><ShieldCheck size={20}/> Compra demonstrativa segura</div></div><small className="demo-disclaimer">* Parcelamento ilustrativo. Nenhuma cobrança real é efetuada.</small></div></div><section className="detail-related"><SectionTitle eyebrow="TALVEZ VOCÊ GOSTE" title="Continue explorando."/><div className="product-grid">{products.filter(p => p.id !== product.id).slice(0,4).map(p => <ProductCard key={p.id} product={p}/>)}</div></section></main>
}

function Cart() {
  const { cart, products, changeQuantity, customer } = useShop()
  const [cep, setCep] = useState('')
  const [shipping, setShipping] = useState<number | null>(null)
  const [shippingText, setShippingText] = useState('')
  const navigate = useNavigate()
  const items = cart.map(item => ({ ...item, product: products.find(p => p.id === item.productId) })).filter(item => item.product)
  const subtotal = items.reduce((sum, item) => sum + item.product!.price * item.quantity, 0)
  async function calculateShipping(event: FormEvent) {
    event.preventDefault(); setShippingText('Consultando CEP...')
    try { const address = await lookupCep(cep); setShipping(shippingForCep(cep, subtotal)); setShippingText(`${address.city} / ${address.state} • Entrega estimada em 5 a 10 dias úteis`) }
    catch (error) { setShipping(null); setShippingText((error as Error).message) }
  }
  if (!items.length) return <main className="container inner-page"><div className="breadcrumb"><Link to="/">Início</Link><ChevronRight size={14}/>Carrinho</div><div className="empty-state"><ShoppingBag size={48}/><h1>Seu carrinho está esperando.</h1><p>Escolha suas peças favoritas e dê o próximo passo.</p><Link to="/catalogo" className="button button-dark">EXPLORAR PRODUTOS <ArrowRight size={18}/></Link></div></main>
  return <main className="container inner-page"><div className="breadcrumb"><Link to="/">Início</Link><ChevronRight size={14}/>Carrinho</div><div className="page-title-row"><div><span className="eyebrow">QUASE LÁ</span><h1>Meu carrinho<span className="title-count">{cart.length}</span></h1></div><Link className="text-link" to="/catalogo"><ArrowLeft size={17}/> CONTINUAR COMPRANDO</Link></div><div className="checkout-layout"><div className="cart-list"><div className="list-title">SEUS PRODUTOS</div>{items.map(item => <div className="cart-item" key={`${item.productId}-${item.size}`}><Link to={`/produto/${item.product!.slug}`} className="cart-thumb"><img src={item.product!.image} alt={item.product!.name}/></Link><div className="cart-item-body"><span className="eyebrow">{item.product!.category}</span><Link to={`/produto/${item.product!.slug}`} className="cart-item-name">{item.product!.name}</Link><small>Tamanho: {item.size}</small><div className="cart-item-bottom"><div className="qty-control small"><button onClick={() => changeQuantity(item.productId, item.size, item.quantity-1)} aria-label="Diminuir quantidade"><Minus size={14}/></button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.productId, item.size, Math.min(10,item.quantity+1))} aria-label="Aumentar quantidade"><Plus size={14}/></button></div><strong>{money(item.product!.price * item.quantity)}</strong></div></div><button className="remove-button" onClick={() => changeQuantity(item.productId,item.size,0)} aria-label={`Remover ${item.product!.name}`}><Trash2 size={18}/></button></div>)}<div className="shipping-estimator"><Truck size={24}/><div><strong>Calcule seu frete</strong><p>Informe o CEP para consultar a entrega.</p><form onSubmit={calculateShipping}><input inputMode="numeric" value={cep} maxLength={9} onChange={e => setCep(e.target.value)} placeholder="00000-000" aria-label="CEP para frete"/><button type="submit">CALCULAR</button></form>{shippingText && <small>{shippingText}</small>}</div></div></div><aside className="order-summary"><h2>Resumo do pedido</h2><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Frete</span><strong>{shipping === null ? 'Calcular no checkout' : shipping === 0 ? 'Grátis' : money(shipping)}</strong></div><div className="summary-total"><span>Total estimado</span><strong>{money(subtotal + (shipping || 0))}</strong></div>{subtotal < 399 && <p className="free-shipping-hint">Faltam {money(399-subtotal)} para ganhar frete grátis!</p>}{subtotal >= 399 && <p className="free-shipping-hint success"><Check size={17}/> Você ganhou frete grátis!</p>}<button className="button button-dark full" onClick={() => navigate(customer ? '/checkout' : '/entrar?proximo=%2Fcheckout')}>FINALIZAR COMPRA <ArrowRight size={18}/></button><small className="summary-note"><LockKeyhole size={13}/> Pagamento acadêmico simulado.</small></aside></div></main>
}

function AuthPage() {
  const { signIn, signUp, verifyEmail, resendConfirmation, customer } = useShop()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { if (customer) navigate(params.get('proximo') || '/conta', { replace: true }) }, [customer, navigate, params])
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage('')
    if (mode === 'verify') {
      if (!/^\d{6,8}$/.test(token)) { setMessage('Digite o código numérico recebido por e-mail.'); return }
      setLoading(true)
      try { await verifyEmail(email.trim().toLowerCase(), token); setMessage('E-mail confirmado com sucesso!') }
      catch (error) { setMessage((error as Error).message) }
      finally { setLoading(false) }
      return
    }
    if (password.length < 6) { setMessage('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (mode === 'register' && password !== confirm) { setMessage('As senhas não coincidem.'); return }
    if (mode === 'register' && name.trim().length < 2) { setMessage('Informe seu nome.'); return }
    setLoading(true)
    try {
      if (mode === 'register') {
        const result = await signUp(name.trim(), email.trim().toLowerCase(), password)
        if (!isDemo && result.startsWith('Conta criada!')) setMode('verify')
        setMessage(result)
      } else await signIn(email.trim().toLowerCase(), password)
    }
    catch (error) { setMessage((error as Error).message) }
    finally { setLoading(false) }
  }
  async function resend() {
    if (!email.trim()) { setMessage('Informe seu e-mail para reenviar o código.'); return }
    setLoading(true); setMessage('')
    try { await resendConfirmation(email.trim().toLowerCase()); setMessage('Novo código enviado. Confira sua caixa de entrada e o spam.') }
    catch (error) { setMessage((error as Error).message) }
    finally { setLoading(false) }
  }
  return <main className="auth-page"><div className="auth-visual"><img src="/images/category-run.jpg" alt="Pessoas correndo ao ar livre"/><div><span className="eyebrow">SEU MOVIMENTO COMEÇA AQUI</span><h2>O próximo<br/>passo é seu.</h2></div></div><div className="auth-form-wrap"><div className="auth-form"><span className="eyebrow">BEM-VINDO À MOVVA</span><h1>{mode === 'login' ? 'Entre no seu ritmo.' : mode === 'register' ? 'Crie sua conta.' : 'Confirme seu e-mail.'}</h1><p>{mode === 'login' ? 'Acesse sua conta para continuar sua compra e acompanhar pedidos.' : mode === 'register' ? 'Junte-se a quem vive cada dia em movimento.' : 'Leia o código no celular e digite aqui, mesmo que o link do e-mail não abra no celular.'}</p><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage('') }}>ENTRAR</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage('') }}>CRIAR CONTA</button>{!isDemo && <button type="button" className={mode === 'verify' ? 'active' : ''} onClick={() => { setMode('verify'); setMessage('') }}>CONFIRMAR E-MAIL</button>}</div><form onSubmit={submit} className="form-grid">{mode === 'register' && <label>Nome completo<input required value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Seu nome"/></label>}<label>E-mail<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="voce@exemplo.com"/></label>{mode === 'verify' ? <label>Código de confirmação<input required value={token} onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" placeholder="Código recebido por e-mail"/></label> : <label>Senha<input required type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres"/></label>}{mode === 'register' && <label>Confirmar senha<input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repita sua senha"/></label>}{message && <p role="status" className={`form-message ${message.includes('sucesso') || message.includes('enviado') || message.includes('confirmou') || message.includes('demonstração criada') ? 'success' : 'error'}`}>{message}</p>}<button type="submit" className="button button-dark full" disabled={loading}>{loading ? 'AGUARDE...' : mode === 'login' ? 'ENTRAR NA MINHA CONTA' : mode === 'register' ? 'CRIAR MINHA CONTA' : 'CONFIRMAR E-MAIL'} <ArrowRight size={18}/></button>{mode === 'verify' && <button type="button" className="auth-resend" onClick={resend} disabled={loading}>REENVIAR CÓDIGO</button>}</form><p className="auth-footnote"><LockKeyhole size={16}/>{isDemo ? 'Modo demonstração: contas locais, sem segurança de produção.' : 'Autenticação segura pelo Supabase.'}</p></div></div></main>
}

const emptyAddress: Address = { cep: '', street: '', number: '', complement: '', district: '', city: '', state: '' }

function Checkout() {
  const { customer, authLoading, cart, products, placeOrder } = useShop()
  const navigate = useNavigate()
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [payment, setPayment] = useState('pix')
  const [error, setError] = useState('')
  const [cepInfo, setCepInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const subtotal = cart.reduce((sum, item) => sum + (products.find(p => p.id === item.productId)?.price || 0) * item.quantity, 0)
  const shipping = digits(address.cep).length === 8 ? shippingForCep(address.cep, subtotal) : null
  useEffect(() => { if (!authLoading && !customer) navigate('/entrar?proximo=%2Fcheckout', { replace: true }) }, [authLoading, customer, navigate])
  useEffect(() => { if (!cart.length) navigate('/carrinho', { replace: true }) }, [])
  useEffect(() => { if (customer?.default_address) setAddress(customer.default_address) }, [customer?.id])
  async function findCep() {
    setCepInfo('Consultando CEP...')
    try { const result = await lookupCep(address.cep); setAddress(current => ({ ...current, ...result })); setCepInfo('Endereço encontrado. Confira os dados e informe o número.') }
    catch (e) { setCepInfo((e as Error).message) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (digits(address.cep).length !== 8 || !address.street.trim() || !address.number.trim() || !address.district.trim() || !address.city.trim() || !/^[A-Za-z]{2}$/.test(address.state)) { setError('Confira o CEP e preencha todos os dados obrigatórios do endereço.'); return }
    try { await lookupCep(address.cep) } catch (e) { setError((e as Error).message); return }
    setLoading(true)
    try { const orderId = await placeOrder({ ...address, cep: digits(address.cep), state: address.state.toUpperCase() }, payment); navigate(`/pedido/${encodeURIComponent(orderId)}`, { replace: true }) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }
  if (authLoading || !customer) return <main className="container inner-page">Carregando sua conta...</main>
  return <main className="container inner-page"><div className="breadcrumb"><Link to="/carrinho">Carrinho</Link><ChevronRight size={14}/>Finalizar compra</div><div className="page-title-row"><div><span className="eyebrow">ÚLTIMO PASSO</span><h1>Finalizar compra.</h1></div><span className="secure-label"><LockKeyhole size={16}/> DEMONSTRAÇÃO SEGURA</span></div><form onSubmit={submit} className="checkout-layout"><div className="checkout-fields"><section className="checkout-section"><div className="checkout-section-title"><span>01</span><div><h2>Entrega</h2><p>Informe onde você quer receber seu pedido.</p></div></div><div className="form-grid address-grid"><label className="field-cep">CEP<div className="input-action"><input required inputMode="numeric" value={address.cep} maxLength={9} onChange={e => setAddress({ ...address, cep: e.target.value })} placeholder="00000-000"/><button type="button" onClick={findCep}>BUSCAR</button></div></label>{cepInfo && <p className="field-note">{cepInfo}</p>}<label className="field-wide">Rua / Avenida<input required value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} placeholder="Nome da rua"/></label><label>Número<input required value={address.number} onChange={e => setAddress({ ...address, number: e.target.value })} placeholder="Número"/></label><label>Complemento <small>(opcional)</small><input value={address.complement} onChange={e => setAddress({ ...address, complement: e.target.value })} placeholder="Apto, bloco..."/></label><label>Bairro<input required value={address.district} onChange={e => setAddress({ ...address, district: e.target.value })} placeholder="Bairro"/></label><label>Cidade<input required value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} placeholder="Cidade"/></label><label>UF<input required value={address.state} maxLength={2} onChange={e => setAddress({ ...address, state: e.target.value.toUpperCase() })} placeholder="SP"/></label></div></section><section className="checkout-section"><div className="checkout-section-title"><span>02</span><div><h2>Pagamento</h2><p>Escolha uma opção para simular a conclusão do pedido.</p></div></div><div className="payment-options">{[{ id: 'pix', label: 'Pix', description: 'Aprovação simulada', icon: <Sparkles size={21}/> }, { id: 'boleto', label: 'Boleto bancário', description: 'Emissão simulada', icon: <Package size={21}/> }, { id: 'cartao', label: 'Cartão de crédito', description: 'Sem informar dados de cartão', icon: <CreditCard size={21}/> }].map(option => <label key={option.id} className={payment === option.id ? 'selected' : ''}><input type="radio" name="payment" value={option.id} checked={payment === option.id} onChange={() => setPayment(option.id)}/>{option.icon}<span><strong>{option.label}</strong><small>{option.description}</small></span><span className="radio-mark"/></label>)}</div><p className="payment-warning"><ShieldCheck size={17}/> Nenhum pagamento real será cobrado. Não informe dados de cartão.</p></section></div><aside className="order-summary checkout-summary"><h2>Seu pedido</h2><div className="summary-products">{cart.map(item => { const product = products.find(p => p.id === item.productId); return product && <div key={`${item.productId}-${item.size}`}><img src={product.image} alt=""/><span>{product.name}<small>{item.quantity} × {item.size}</small></span><strong>{money(product.price * item.quantity)}</strong></div> })}</div><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Frete</span><strong>{shipping === null ? 'Informe o CEP' : shipping === 0 ? 'Grátis' : money(shipping)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(subtotal + (shipping || 0))}</strong></div>{error && <p className="form-message error">{error}</p>}<button type="submit" className="button button-dark full" disabled={loading}>{loading ? 'FINALIZANDO...' : 'CONFIRMAR PEDIDO'} <ArrowRight size={18}/></button><small className="summary-note"><LockKeyhole size={13}/> Pedido acadêmico sem cobrança real.</small></aside></form></main>
}

function Account() {
  const { customer, authLoading, orders, refreshOrders, saveProfile, signOut } = useShop()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'orders' | 'profile'>('orders')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { if (!authLoading && !customer) navigate('/entrar?proximo=%2Fconta', { replace: true }) }, [authLoading, customer, navigate])
  useEffect(() => { if (customer) { setName(customer.name); setCpf(customer.cpf); setPhone(customer.phone); setAddress(customer.default_address || emptyAddress); void refreshOrders() } }, [customer?.id])
  async function findCep() { try { const result = await lookupCep(address.cep); setAddress(current => ({ ...current, ...result })); setMessage('CEP encontrado. Confira os dados.'); } catch (error) { setMessage((error as Error).message) } }
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage('')
    if (cpf && !validCpf(cpf)) { setMessage('CPF inválido. Confira os dígitos verificadores.'); return }
    if (address.cep && (digits(address.cep).length !== 8 || !address.street || !address.number || !address.city || !address.state)) { setMessage('Preencha o endereço completo ou deixe-o vazio.'); return }
    setLoading(true)
    try { await saveProfile({ name: name.trim(), cpf: digits(cpf), phone: digits(phone), default_address: address.cep ? { ...address, cep: digits(address.cep) } : undefined }); setMessage('Dados salvos com sucesso.') }
    catch (error) { setMessage((error as Error).message) }
    finally { setLoading(false) }
  }
  if (authLoading || !customer) return <main className="container inner-page">Carregando sua conta...</main>
  return <main className="container inner-page account-page"><div className="breadcrumb"><Link to="/">Início</Link><ChevronRight size={14}/>Minha conta</div><div className="page-title-row"><div><span className="eyebrow">ÁREA DO CLIENTE</span><h1>Olá, {customer.name.split(' ')[0]}<span className="accent-dot">.</span></h1><p>Acompanhe seus pedidos e mantenha seus dados atualizados.</p></div><button className="text-link" onClick={async () => { await signOut(); navigate('/') }}>SAIR DA CONTA <ArrowRight size={17}/></button></div><div className="account-layout"><aside className="account-sidebar"><button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><Package size={19}/> Meus pedidos <ChevronRight size={16}/></button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><UserRound size={19}/> Meus dados <ChevronRight size={16}/></button><div className="account-help"><Sparkles size={22}/><strong>Continue em movimento</strong><p>Tem novidade te esperando no catálogo.</p><Link to="/catalogo">EXPLORAR <ArrowRight size={15}/></Link></div></aside><div className="account-content">{tab === 'orders' ? <><div className="account-content-heading"><h2>Meus pedidos</h2><span>{orders.length} PEDIDO{orders.length !== 1 ? 'S' : ''}</span></div>{orders.length ? <div className="orders-list">{orders.map(order => <div className="order-card" key={order.id}><div className="order-card-head"><div><small>PEDIDO</small><strong>#{order.id.slice(0, 12).toUpperCase()}</strong></div><div><small>DATA</small><strong>{new Date(order.created_at).toLocaleDateString('pt-BR')}</strong></div><div><small>TOTAL</small><strong>{money(order.total)}</strong></div><span className="order-status"><Check size={14}/> {order.status === 'simulado' ? 'NOVO PEDIDO' : order.status.toLocaleUpperCase('pt-BR')}</span></div><div className="order-card-items">{order.items.map((item,index) => <span key={index}>{item.quantity}× {item.name} · Tam. {item.size}</span>)}</div><div className="order-card-foot"><span><MapPin size={16}/> {order.address.city} / {order.address.state}</span><span>{order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'cartao' ? 'Cartão' : 'Boleto'} • sem cobrança real</span></div></div>)}</div> : <div className="empty-orders"><Package size={40}/><h3>Ainda não há pedidos.</h3><p>Quando você concluir sua primeira compra, ela aparecerá aqui.</p><Link to="/catalogo" className="button button-dark">EXPLORAR PRODUTOS <ArrowRight size={17}/></Link></div>}</> : <><div className="account-content-heading"><h2>Meus dados</h2><span>CADASTRO E ENTREGA</span></div><form onSubmit={save} className="form-grid profile-form"><label>Nome completo<input required value={name} onChange={e => setName(e.target.value)} autoComplete="name"/></label><label>E-mail<input value={customer.email} disabled/></label><label>CPF <small>(opcional)</small><input value={cpf} inputMode="numeric" onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" maxLength={14}/></label><label>Telefone <small>(opcional)</small><input value={phone} inputMode="tel" onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999"/></label><h3>Endereço de entrega</h3><label className="field-cep">CEP <small>(opcional)</small><div className="input-action"><input value={address.cep} onChange={e => setAddress({ ...address, cep: e.target.value })} inputMode="numeric" maxLength={9} placeholder="00000-000"/><button type="button" onClick={findCep}>BUSCAR</button></div></label><label>Rua / Avenida<input value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })}/></label><label>Número<input value={address.number} onChange={e => setAddress({ ...address, number: e.target.value })}/></label><label>Complemento<input value={address.complement} onChange={e => setAddress({ ...address, complement: e.target.value })}/></label><label>Bairro<input value={address.district} onChange={e => setAddress({ ...address, district: e.target.value })}/></label><label>Cidade<input value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })}/></label><label>UF<input value={address.state} onChange={e => setAddress({ ...address, state: e.target.value.toUpperCase() })} maxLength={2}/></label>{message && <p className={`form-message ${message.includes('sucesso') || message.includes('encontrado') ? 'success' : 'error'}`}>{message}</p>}<button disabled={loading} className="button button-dark">{loading ? 'SALVANDO...' : 'SALVAR DADOS'} <ArrowRight size={17}/></button></form></>}</div></div></main>
}

function OrderSuccess() {
  const { id } = useParams()
  const { customer, orders, refreshOrders } = useShop()
  useEffect(() => { if (customer) void refreshOrders() }, [customer?.id, id])
  const order = orders.find(item => item.id === id)
  return <main className="container success-page"><div className="success-icon"><Check size={40}/></div><span className="eyebrow">PEDIDO CONFIRMADO</span><h1>Seu próximo passo<br/>já começou<span className="accent-dot">.</span></h1><p>Seu pedido de demonstração foi registrado com sucesso. Nenhuma cobrança real foi realizada.</p><div className="success-order"><span>NÚMERO DO PEDIDO</span><strong>#{id?.slice(0, 12).toUpperCase()}</strong>{order && <small>Total: {money(order.total)} • {order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'cartao' ? 'Cartão de crédito' : 'Boleto'} simulado</small>}</div><div className="success-actions"><Link className="button button-dark" to="/conta">VER MEUS PEDIDOS <ArrowRight size={18}/></Link><Link className="button button-outline" to="/catalogo">CONTINUAR EXPLORANDO</Link></div></main>
}

function AppRoutes() {
  const { setupNeeded } = useShop()
  return <><ScrollToTop/><PageMeta/><Header/>{isDemo && <div className="demo-banner"><span>LOJA DEMONSTRATIVA</span> Configure o Supabase para usar banco de dados e login real.</div>}{setupNeeded && <div className="demo-banner"><span>CATÁLOGO DE EXEMPLO</span> O banco ainda precisa ser preparado para registrar pedidos.</div>}<Routes><Route path="/" element={<Home/>}/><Route path="/catalogo" element={<Catalog/>}/><Route path="/produto/:slug" element={<ProductDetail/>}/><Route path="/carrinho" element={<Cart/>}/><Route path="/entrar" element={<AuthPage/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/conta" element={<Account/>}/><Route path="/pedido/:id" element={<OrderSuccess/>}/><Route path="/admin/*" element={<Suspense fallback={<main className="container inner-page">Carregando painel...</main>}><Admin/></Suspense>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes><Footer/></>
}

export default function App() { return <BrowserRouter><AppRoutes/></BrowserRouter> }
