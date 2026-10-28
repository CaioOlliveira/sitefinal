import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BarChart3, Boxes, Check, ChevronDown, CircleAlert, ImagePlus, Package, Pencil, Plus, RefreshCw, Search, ShoppingBag, Trash2, UserPlus, Users, X } from 'lucide-react'
import { money, type Address, type Category, type Product } from './data'
import { useShop } from './store'
import { isDemo, supabase } from './supabase'
import './admin.css'
import './admin-extra.css'

type AdminOrder = {
  id: string
  created_at: string
  status: string
  total: number
  shipping: number
  payment_method: string
  address: Address
  order_items: { id: number; name: string; size: string; quantity: number; unit_price: number }[]
}

type AdminUser = { user_id: string; email: string; created_at: string }

type ProductForm = {
  name: string; slug: string; category: Category; subtitle: string; price: string; old_price: string
  image: string; badge: string; description: string; sizes: string; stock: string; featured: boolean; active: boolean
}

const emptyForm: ProductForm = {
  name: '', slug: '', category: 'Tênis', subtitle: '', price: '', old_price: '', image: '', badge: '',
  description: '', sizes: '36, 37, 38, 39, 40, 41, 42', stock: '10', featured: false, active: true,
}
const statuses = ['simulado', 'separando', 'enviado', 'entregue', 'cancelado'] as const
const statusNames: Record<string, string> = { simulado: 'Novo pedido', separando: 'Separando', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' }
const date = (value: string) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Admin() {
  const { customer, authLoading, isAdmin, adminLoading, refreshProducts } = useShop()
  const { pathname } = useLocation()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [busyAdmin, setBusyAdmin] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('todos')
  const [orderQuery, setOrderQuery] = useState('')
  const [orderFilter, setOrderFilter] = useState('todos')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const imagePreview = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : form.image, [imageFile, form.image])
  useEffect(() => { if (imageFile) return () => URL.revokeObjectURL(imagePreview) }, [imageFile, imagePreview])
  const [saving, setSaving] = useState(false)
  const [busyOrder, setBusyOrder] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [today] = useState(() => new Date())

  async function load() {
    if (!supabase) return
    setLoading(true); setError('')
    const productResult = await supabase.from('products').select('*').order('sort_order', { ascending: true })
    const allOrders: AdminOrder[] = []
    let orderError = ''
    for (let offset = 0; !orderError; offset += 500) {
      const result = await supabase.from('orders').select('id,created_at,status,total,shipping,payment_method,address,order_items(id,name,size,quantity,unit_price)').order('created_at', { ascending: false }).range(offset, offset + 499)
      if (result.error) { orderError = result.error.message; break }
      allOrders.push(...(result.data || []) as AdminOrder[])
      if (!result.data || result.data.length < 500) break
    }
    if (productResult.error || orderError) setError(productResult.error?.message || orderError)
    else { setProducts((productResult.data || []) as Product[]); setOrders(allOrders) }
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) void load() }, [isAdmin])

  async function loadAdmins() {
    if (!supabase) return
    const { data, error: resultError } = await supabase.rpc('admin_list_users')
    if (resultError) setError(resultError.message)
    else setAdmins((data || []) as AdminUser[])
  }

  useEffect(() => { if (isAdmin && pathname.startsWith('/admin/equipe')) void loadAdmins() }, [isAdmin, pathname])

  const activeProducts = products.filter(product => product.active !== false)
  const validOrders = useMemo(() => orders.filter(order => order.status !== 'cancelado'), [orders])
  const revenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0)
  const lowStock = activeProducts.filter(product => (product.stock ?? 0) <= 5)
  const visibleProducts = useMemo(() => products.filter(product => {
    const match = `${product.name} ${product.category} ${product.slug}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
    return match && (filter === 'todos' || (filter === 'ativos' ? product.active !== false : product.active === false))
  }), [products, query, filter])
  const visibleOrders = useMemo(() => orders.filter(order => {
    const searchText = `${order.id} ${order.address.city} ${order.address.state} ${order.order_items.map(item => item.name).join(' ')}`.toLocaleLowerCase('pt-BR')
    return (orderFilter === 'todos' || order.status === orderFilter) && searchText.includes(orderQuery.toLocaleLowerCase('pt-BR'))
  }), [orders, orderQuery, orderFilter])
  const chart = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.getTime()); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - 6 + index)
    const value = validOrders.filter(order => new Date(order.created_at).toDateString() === day.toDateString()).reduce((sum, order) => sum + Number(order.total), 0)
    return { label: day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), value }
  }), [validOrders, today])
  const chartMax = Math.max(1, ...chart.map(day => day.value))

  if (isDemo) return <main className="admin-gate"><CircleAlert size={34}/><h1>Ative o Supabase para usar o painel.</h1><p>O modo de demonstração guarda dados só neste navegador e não oferece acesso administrativo seguro.</p><Link className="button button-dark" to="/">VOLTAR À LOJA</Link></main>
  if (authLoading || adminLoading) return <main className="admin-gate"><RefreshCw className="admin-spin" size={30}/><p>Verificando acesso...</p></main>
  if (!customer) return <Navigate to={`/entrar?proximo=${encodeURIComponent(pathname)}`} replace/>
  if (!isAdmin) return <main className="admin-gate"><CircleAlert size={34}/><h1>Acesso restrito.</h1><p>Esta conta não tem permissão de administrador. A autorização é feita no SQL Editor do Supabase.</p><Link className="button button-dark" to="/conta">MINHA CONTA</Link></main>

  function openProduct(product?: Product) {
    setNotice(''); setError(''); setImageFile(null)
    setEditing(product || 'new')
    setForm(product ? {
      name: product.name, slug: product.slug, category: product.category, subtitle: product.subtitle,
      price: String(product.price), old_price: product.old_price == null ? '' : String(product.old_price),
      image: product.image, badge: product.badge || '', description: product.description,
      sizes: product.sizes.join(', '), stock: String(product.stock ?? 0), featured: product.featured, active: product.active !== false,
    } : emptyForm)
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !editing) return
    const name = form.name.trim(); const slug = slugify(form.slug.trim() || name)
    const sizes = [...new Set(form.sizes.split(',').map(size => size.trim()).filter(Boolean))]
    const price = Number(form.price); const oldPrice = form.old_price.trim() ? Number(form.old_price) : null
    const stock = Number(form.stock)
    if (name.length < 2 || !slug || form.subtitle.trim().length < 2 || form.description.trim().length < 10 || !sizes.length || !Number.isFinite(price) || price <= 0 || (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= 0)) || !Number.isInteger(stock) || stock < 0 || (!form.image.trim() && !imageFile)) {
      setError('Confira nome, subtítulo, descrição, preço, estoque, tamanhos e imagem.'); return
    }
    setSaving(true); setError(''); setNotice('')
    let image = form.image.trim(); let uploadedPath: string | null = null
    try {
      if (imageFile) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type) || imageFile.size > 5 * 1024 * 1024) throw new Error('Use uma imagem JPG, PNG ou WebP de até 5 MB.')
        uploadedPath = `${crypto.randomUUID()}.${imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg'}`
        const uploaded = await supabase.storage.from('product-images').upload(uploadedPath, imageFile, { contentType: imageFile.type, upsert: false })
        if (uploaded.error) throw uploaded.error
        image = supabase.storage.from('product-images').getPublicUrl(uploadedPath).data.publicUrl
      }
      const payload = {
        slug, name, category: form.category, subtitle: form.subtitle.trim(), price,
        old_price: oldPrice, image, badge: form.badge.trim() || null,
        description: form.description.trim(), sizes, stock, featured: form.featured, active: form.active,
      }
      const result = editing === 'new'
        ? await supabase.from('products').insert({ ...payload, id: crypto.randomUUID(), sort_order: Math.max(0, ...products.map(product => product.sort_order ?? 0)) + 1 })
        : await supabase.from('products').update(payload).eq('id', editing.id).select('id').single()
      if (result.error) throw result.error
      setEditing(null); setImageFile(null); setNotice(editing === 'new' ? 'Produto cadastrado com sucesso.' : 'Produto atualizado com sucesso.')
      await Promise.all([load(), refreshProducts()])
    } catch (cause) {
      if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath])
      setError((cause as Error).message || 'Não foi possível salvar o produto.')
    } finally { setSaving(false) }
  }

  async function toggleProduct(product: Product) {
    if (!supabase) return
    setError(''); setNotice('')
    const { error: resultError } = await supabase.from('products').update({ active: product.active === false }).eq('id', product.id).select('id').single()
    if (resultError) { setError(resultError.message); return }
    setNotice(product.active === false ? 'Produto reativado.' : 'Produto arquivado e removido da vitrine.')
    await Promise.all([load(), refreshProducts()])
  }

  async function deleteProduct(product: Product) {
    if (!supabase || !window.confirm(`Remover “${product.name}” definitivamente? Produtos que já aparecem em pedidos devem ser arquivados.`)) return
    setDeletingProduct(product.id); setError(''); setNotice('')
    try {
      const { data: image, error: resultError } = await supabase.rpc('admin_delete_product', { p_product_id: product.id })
      if (resultError) throw resultError
      let imageWarning = ''
      if (typeof image === 'string') {
        const imageUrl = new URL(image, window.location.origin)
        const storageOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin
        const prefix = '/storage/v1/object/public/product-images/'
        if (imageUrl.origin === storageOrigin && imageUrl.pathname.startsWith(prefix)) {
          try {
            const imagePath = decodeURIComponent(imageUrl.pathname.slice(prefix.length))
            const removed = await supabase.storage.from('product-images').remove([imagePath])
            if (removed.error) imageWarning = ' A foto enviada continua no armazenamento; remova-a no Supabase.'
          } catch { imageWarning = ' A foto enviada continua no armazenamento; remova-a no Supabase.' }
        }
      }
      setNotice(`Produto removido.${imageWarning}`)
      await Promise.all([load(), refreshProducts()])
    } catch (cause) { setError((cause as Error).message || 'Não foi possível remover o produto.') }
    finally { setDeletingProduct(null) }
  }

  async function addAdmin(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusyAdmin(true); setError(''); setNotice('')
    const { error: resultError } = await supabase.rpc('admin_add_user', { p_email: newAdminEmail.trim().toLowerCase() })
    if (resultError) setError(resultError.message)
    else { setNewAdminEmail(''); setNotice('Administrador adicionado. A pessoa já pode acessar /admin com a própria conta.'); await loadAdmins() }
    setBusyAdmin(false)
  }

  async function removeAdmin(admin: AdminUser) {
    if (!supabase || !window.confirm(`Remover o acesso de ${admin.email} ao painel?`)) return
    setBusyAdmin(true); setError(''); setNotice('')
    const { error: resultError } = await supabase.rpc('admin_remove_user', { p_user_id: admin.user_id })
    if (resultError) setError(resultError.message)
    else { setNotice('Acesso administrativo removido.'); await loadAdmins() }
    setBusyAdmin(false)
  }

  async function changeStatus(order: AdminOrder, status: string) {
    if (!supabase || status === order.status) return
    setBusyOrder(order.id); setError(''); setNotice('')
    const { error: resultError } = await supabase.rpc('admin_set_order_status', { p_order_id: order.id, p_status: status })
    if (resultError) setError(resultError.message)
    else { setNotice('Status do pedido atualizado.'); await Promise.all([load(), refreshProducts()]) }
    setBusyOrder(null)
  }

  const section = pathname.startsWith('/admin/produtos') ? 'products' : pathname.startsWith('/admin/pedidos') ? 'orders' : pathname.startsWith('/admin/equipe') ? 'team' : 'dashboard'
  return <main className="admin-shell">
    <div className="container admin-hero"><div><span className="eyebrow">MOVVA / GESTÃO</span><h1>Painel da loja<span className="accent-dot">.</span></h1><p>Olá, {customer.name.split(' ')[0]}. Acompanhe a operação da sua loja em um só lugar.</p></div><Link to="/" className="admin-store-link"><ArrowLeft size={17}/> VER LOJA</Link></div>
    <div className="container admin-layout"><aside className="admin-sidebar"><div className="admin-sidebar-title">MENU PRINCIPAL</div><NavLink end to="/admin"><BarChart3 size={19}/> Visão geral <ArrowRight size={16}/></NavLink><NavLink to="/admin/produtos"><Boxes size={19}/> Produtos <ArrowRight size={16}/></NavLink><NavLink to="/admin/pedidos"><ShoppingBag size={19}/> Pedidos <ArrowRight size={16}/></NavLink><NavLink to="/admin/equipe"><Users size={19}/> Equipe <ArrowRight size={16}/></NavLink><div className="admin-side-note"><span>LOJA DEMONSTRATIVA</span><p>Os valores exibidos representam pedidos sem cobrança real.</p></div></aside>
      <section className="admin-content">
        {error && <div className="admin-alert error" role="alert"><CircleAlert size={18}/>{error}<button onClick={() => setError('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
        {notice && <div className="admin-alert success" role="status"><Check size={18}/>{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
        {loading ? <div className="admin-loading"><RefreshCw className="admin-spin" size={28}/> Carregando painel...</div> : section === 'dashboard' ? <>
          <div className="admin-section-head"><div><span className="eyebrow">RESUMO DA OPERAÇÃO</span><h2>Visão geral</h2></div><button className="admin-quiet" onClick={() => void load()}><RefreshCw size={16}/> ATUALIZAR</button></div>
          <div className="admin-metrics"><div><span>PEDIDOS REGISTRADOS</span><strong>{orders.length}</strong><small>Todos os pedidos simulados</small><ShoppingBag size={24}/></div><div><span>VOLUME DE PEDIDOS</span><strong>{money(revenue)}</strong><small>Exclui pedidos cancelados</small><BarChart3 size={24}/></div><div><span>PRODUTOS ATIVOS</span><strong>{activeProducts.length}</strong><small>{products.length - activeProducts.length} arquivado(s)</small><Boxes size={24}/></div><div><span>ESTOQUE BAIXO</span><strong>{lowStock.length}</strong><small>5 unidades ou menos</small><Package size={24}/></div></div>
          <div className="admin-dashboard-grid"><div className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">ÚLTIMOS 7 DIAS</span><h3>Pedidos por dia</h3></div><strong>{money(chart.reduce((sum, day) => sum + day.value, 0))}</strong></div><div className="admin-chart">{chart.map((day, index) => <div className="admin-chart-column" key={index}><span title={money(day.value)} style={{ height: `${Math.max(4, day.value / chartMax * 100)}%` }}/><small>{day.label}</small></div>)}</div><p className="admin-chart-caption">Valor de pedidos demonstrativos, sem pagamento real.</p></div><div className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">AÇÃO RÁPIDA</span><h3>O que fazer agora?</h3></div></div><Link className="admin-action-row" to="/admin/produtos"><span><Plus size={18}/></span><div><strong>Gerenciar produtos</strong><small>Cadastre peças, fotos e estoque</small></div><ArrowRight size={17}/></Link><Link className="admin-action-row" to="/admin/pedidos"><span><ShoppingBag size={18}/></span><div><strong>Acompanhar pedidos</strong><small>Veja detalhes e atualize status</small></div><ArrowRight size={17}/></Link>{lowStock.length > 0 && <p className="admin-stock-alert"><CircleAlert size={16}/> {lowStock.length} produto(s) precisam de reposição.</p>}</div></div>
          <div className="admin-panel admin-recent"><div className="admin-panel-head"><div><span className="eyebrow">ACOMPANHAMENTO</span><h3>Pedidos recentes</h3></div><Link to="/admin/pedidos">VER TODOS <ArrowRight size={16}/></Link></div>{orders.length ? orders.slice(0, 5).map(order => <div className="admin-recent-row" key={order.id}><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><span>{date(order.created_at)}</span><span className={`admin-status ${order.status}`}>{statusNames[order.status] || order.status}</span><b>{money(Number(order.total))}</b></div>) : <p className="admin-empty">Ainda não há pedidos. Eles aparecerão aqui após a primeira compra.</p>}</div>
        </> : section === 'products' ? <>
          <div className="admin-section-head"><div><span className="eyebrow">CATÁLOGO / ESTOQUE</span><h2>Produtos</h2><p>{products.length} itens cadastrados · {activeProducts.length} na vitrine</p></div><button className="button button-lime" onClick={() => openProduct()}><Plus size={17}/> NOVO PRODUTO</button></div>
          <div className="admin-toolbar"><label className="admin-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome, categoria ou slug"/></label><select aria-label="Filtrar produtos" value={filter} onChange={event => setFilter(event.target.value)}><option value="todos">Todos</option><option value="ativos">Ativos</option><option value="arquivados">Arquivados</option></select></div>
          <div className="admin-products">{visibleProducts.length ? visibleProducts.map(product => <div className="admin-product-row" key={product.id}><img src={product.image} alt=""/><div className="admin-product-name"><strong>{product.name}</strong><span>{product.category} · {product.subtitle}</span></div><div className="admin-product-price"><strong>{money(Number(product.price))}</strong><small>{product.stock ?? 0} em estoque</small></div><span className={`admin-pill ${product.active === false ? 'inactive' : (product.stock ?? 0) <= 5 ? 'warning' : ''}`}>{product.active === false ? 'Arquivado' : (product.stock ?? 0) === 0 ? 'Esgotado' : (product.stock ?? 0) <= 5 ? 'Baixo estoque' : 'Ativo'}</span><div className="admin-row-actions"><button title="Editar produto" aria-label={`Editar ${product.name}`} onClick={() => openProduct(product)}><Pencil size={17}/></button><button className="admin-archive" onClick={() => void toggleProduct(product)}>{product.active === false ? 'Reativar' : 'Arquivar'}</button><button className="admin-delete" title="Remover produto" aria-label={`Remover ${product.name}`} disabled={deletingProduct === product.id} onClick={() => void deleteProduct(product)}><Trash2 size={17}/></button></div></div>) : <div className="admin-empty">Nenhum produto encontrado.</div>}</div>
        </> : section === 'orders' ? <>
          <div className="admin-section-head"><div><span className="eyebrow">VENDAS / ENTREGA</span><h2>Pedidos</h2><p>{orders.length} pedidos demonstrativos registrados</p></div><button className="admin-quiet" onClick={() => void load()}><RefreshCw size={16}/> ATUALIZAR</button></div>
          <div className="admin-toolbar"><label className="admin-search"><Search size={18}/><input value={orderQuery} onChange={event => setOrderQuery(event.target.value)} placeholder="Buscar pedido, cidade ou produto"/></label><select aria-label="Filtrar pedidos por status" value={orderFilter} onChange={event => setOrderFilter(event.target.value)}><option value="todos">Todos os status</option>{statuses.map(status => <option key={status} value={status}>{statusNames[status]}</option>)}</select></div><div className="admin-orders">{visibleOrders.length ? visibleOrders.map(order => <div className="admin-order" key={order.id}><button className="admin-order-head" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} aria-expanded={expandedOrder === order.id}><span><small>PEDIDO</small><strong>#{order.id.slice(0, 12).toUpperCase()}</strong></span><span><small>DATA</small><strong>{date(order.created_at)}</strong></span><span><small>ITENS</small><strong>{order.order_items.reduce((sum, item) => sum + item.quantity, 0)}</strong></span><span><small>TOTAL</small><strong>{money(Number(order.total))}</strong></span><span className={`admin-status ${order.status}`}>{statusNames[order.status] || order.status}</span><ChevronDown size={18}/></button>{expandedOrder === order.id && <div className="admin-order-details"><div><h4>Itens do pedido</h4>{order.order_items.map(item => <p key={item.id}>{item.quantity} × {item.name} · Tam. {item.size}<strong>{money(Number(item.unit_price) * item.quantity)}</strong></p>)}<p className="admin-order-shipping">Frete <strong>{money(Number(order.shipping))}</strong></p></div><div><h4>Entrega</h4><p>{order.address.street}, {order.address.number}{order.address.complement ? ` · ${order.address.complement}` : ''}<br/>{order.address.district} · {order.address.city}/{order.address.state}<br/>CEP {order.address.cep}</p><small>Pagamento: {order.payment_method === 'cartao' ? 'Cartão' : order.payment_method === 'pix' ? 'Pix' : 'Boleto'} (simulado)</small><label className="admin-status-select">Alterar status<select disabled={busyOrder === order.id} value={order.status} onChange={event => void changeStatus(order, event.target.value)}>{statuses.map(status => <option value={status} key={status}>{statusNames[status]}</option>)}</select></label></div></div>}</div>) : <div className="admin-empty"><Package size={31}/><p>Nenhum pedido encontrado para este filtro.</p></div>}</div>
        </> : <>
          <div className="admin-section-head"><div><span className="eyebrow">ACESSO / EQUIPE</span><h2>Administradores</h2><p>Autorize pessoas que já criaram uma conta na loja.</p></div><button className="admin-quiet" onClick={() => void loadAdmins()}><RefreshCw size={16}/> ATUALIZAR</button></div>
          <div className="admin-panel admin-team-panel"><div className="admin-panel-head"><div><span className="eyebrow">NOVO ACESSO</span><h3>Adicionar administrador</h3></div><UserPlus size={24}/></div><p>A pessoa precisa se cadastrar e confirmar o e-mail. Ela usará a própria senha para entrar.</p><form className="admin-team-form" onSubmit={event => void addAdmin(event)}><label>E-mail da conta<input type="email" required maxLength={254} value={newAdminEmail} onChange={event => setNewAdminEmail(event.target.value)} placeholder="pessoa@exemplo.com"/></label><button className="button button-dark" disabled={busyAdmin} type="submit">ADICIONAR <ArrowRight size={16}/></button></form></div>
          <div className="admin-panel admin-team-panel"><div className="admin-panel-head"><div><span className="eyebrow">ACESSOS ATIVOS</span><h3>Equipe da loja</h3></div><strong>{admins.length}</strong></div><div className="admin-team-list">{admins.length ? admins.map(admin => <div className="admin-team-row" key={admin.user_id}><span className="admin-team-avatar"><Users size={19}/></span><div><strong>{admin.email}</strong><small>Desde {date(admin.created_at)}{admin.user_id === customer.id ? ' · Você' : ''}</small></div><button type="button" disabled={busyAdmin || admin.user_id === customer.id} onClick={() => void removeAdmin(admin)} aria-label={`Remover acesso de ${admin.email}`}>REMOVER</button></div>) : <p className="admin-empty">Nenhum administrador encontrado.</p>}</div></div>
        </>}
      </section></div>
    {editing && <div className="admin-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditing(null) }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label={editing === 'new' ? 'Novo produto' : 'Editar produto'}><div className="admin-modal-head"><div><span className="eyebrow">CATÁLOGO MOVVA</span><h2>{editing === 'new' ? 'Novo produto' : 'Editar produto'}</h2></div><button onClick={() => setEditing(null)} disabled={saving} aria-label="Fechar"><X size={22}/></button></div><form onSubmit={saveProduct} className="admin-form"><div className="admin-form-grid"><label className="wide">Nome do produto<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Tênis Urban Flow"/></label><label>Categoria<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as Category })}><option>Tênis</option><option>Roupas</option><option>Acessórios</option></select></label><label>Subtítulo<input required value={form.subtitle} onChange={event => setForm({ ...form, subtitle: event.target.value })} placeholder="Corrida • Unissex"/></label><label className="wide">Slug da URL <small>(opcional; gerado pelo nome)</small><input value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} placeholder="tenis-urban-flow"/></label><label>Preço (R$)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="299.90"/></label><label>Preço anterior (R$)<input type="number" min="0.01" step="0.01" value={form.old_price} onChange={event => setForm({ ...form, old_price: event.target.value })} placeholder="Opcional"/></label><label>Estoque<input required type="number" min="0" step="1" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })}/></label><label>Selo <small>(opcional)</small><input value={form.badge} onChange={event => setForm({ ...form, badge: event.target.value })} placeholder="NOVO"/></label><label className="wide">Tamanhos <small>(separados por vírgula)</small><input required value={form.sizes} onChange={event => setForm({ ...form, sizes: event.target.value })} placeholder="P, M, G, GG"/></label><label className="wide">Descrição<textarea required rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Conte os detalhes da peça..."/></label><label className="wide">URL da imagem <small>(ou envie um arquivo abaixo)</small><input value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} placeholder="https://..."/></label><label className="wide admin-upload"><ImagePlus size={22}/><span>{imageFile ? imageFile.name : 'Escolher foto JPG, PNG ou WebP · até 5 MB'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setImageFile(event.target.files?.[0] || null)}/></label>{(imageFile || form.image) && <div className="admin-image-preview"><img src={imagePreview} alt="Prévia do produto"/></div>}<label className="admin-check"><input type="checkbox" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })}/> Destacar na página inicial</label><label className="admin-check"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })}/> Produto ativo na loja</label></div>{error && <p className="form-message error" role="alert">{error}</p>}<div className="admin-form-footer"><button type="button" className="button button-outline" onClick={() => setEditing(null)} disabled={saving}>CANCELAR</button><button type="submit" className="button button-dark" disabled={saving}>{saving ? 'SALVANDO...' : 'SALVAR PRODUTO'} <ArrowRight size={17}/></button></div></form></section></div>}
  </main>
}
