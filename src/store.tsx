import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoProducts, shippingForCep, type Address, type Product } from './data'
import { isDemo, supabase } from './supabase'

export type Customer = { id: string; email: string; name: string; cpf: string; phone: string; default_address?: Address }
export type CartItem = { productId: string; size: string; quantity: number }
export type Order = { id: string; created_at: string; total: number; status: string; payment_method: string; shipping: number; address: Address; items: { name: string; size: string; quantity: number; unit_price: number }[] }

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}

type ShopContextType = {
  products: Product[]
  cart: CartItem[]
  customer: Customer | null
  authLoading: boolean
  setupNeeded: boolean
  isAdmin: boolean
  adminLoading: boolean
  orders: Order[]
  cartCount: number
  addItem: (productId: string, size: string, quantity?: number) => void
  changeQuantity: (productId: string, size: string, quantity: number) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<string>
  verifyEmail: (email: string, token: string) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  signOut: () => Promise<void>
  saveProfile: (profile: Pick<Customer, 'name' | 'cpf' | 'phone' | 'default_address'>) => Promise<void>
  placeOrder: (address: Address, payment: string) => Promise<string>
  refreshOrders: () => Promise<void>
  refreshProducts: () => Promise<void>
}

const ShopContext = createContext<ShopContextType | null>(null)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [cart, setCart] = useState<CartItem[]>(() => read('movva-cart', []))
  const [customer, setCustomer] = useState<Customer | null>(() => isDemo ? read('movva-demo-user', null) : null)
  const [orders, setOrders] = useState<Order[]>([])
  const [authLoading, setAuthLoading] = useState(!isDemo)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(!isDemo)

  useEffect(() => { localStorage.setItem('movva-cart', JSON.stringify(cart)) }, [cart])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    void refreshProducts()
    async function loadUser(id: string, email: string) {
      const { data } = await client.from('profiles').select('name,cpf,phone,default_address').eq('id', id).maybeSingle()
      setCustomer({ id, email, name: data?.name || email.split('@')[0], cpf: data?.cpf || '', phone: data?.phone || '', default_address: data?.default_address as Address | undefined })
      setAuthLoading(false)
      const { data: membership } = await client.from('admin_users').select('user_id').eq('user_id', id).maybeSingle()
      setIsAdmin(Boolean(membership))
      setAdminLoading(false)
    }
    client.auth.getUser().then(({ data }) => {
      if (data.user) void loadUser(data.user.id, data.user.email || '')
      else { setAuthLoading(false); setAdminLoading(false) }
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setIsAdmin(false); setAdminLoading(true); void loadUser(session.user.id, session.user.email || '') }
      else { setCustomer(null); setOrders([]); setIsAdmin(false); setAuthLoading(false); setAdminLoading(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function refreshProducts() {
    if (!supabase) return
    const { data, error } = await supabase.from('products').select('*').eq('active', true).order('sort_order')
    if (error) { setSetupNeeded(true); return }
    const availableProducts = (data || []) as Product[]
    const availableIds = new Set(availableProducts.map(product => product.id))
    setProducts(availableProducts)
    setCart(current => current.every(item => availableIds.has(item.productId)) ? current : current.filter(item => availableIds.has(item.productId)))
    setSetupNeeded(false)
  }

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  function addItem(productId: string, size: string, quantity = 1) {
    setCart(current => {
      const existing = current.find(item => item.productId === productId && item.size === size)
      if (existing) return current.map(item => item === existing ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item)
      return [...current, { productId, size, quantity }]
    })
  }

  function changeQuantity(productId: string, size: string, quantity: number) {
    setCart(current => current.map(item => item.productId === productId && item.size === size ? { ...item, quantity } : item).filter(item => item.quantity > 0))
  }

  async function signIn(email: string, password: string) {
    if (isDemo) {
      if (!email.includes('@') || password.length < 6) throw new Error('Informe um e-mail e uma senha com pelo menos 6 caracteres.')
      const saved = read<Customer | null>('movva-demo-user', null)
      const next = saved?.email === email ? saved : { id: email, email, name: email.split('@')[0], cpf: '', phone: '' }
      localStorage.setItem('movva-demo-user', JSON.stringify(next))
      setCustomer(next)
      return
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Não foi possível entrar. Confira seu e-mail e senha.')
  }

  async function signUp(name: string, email: string, password: string) {
    if (isDemo) {
      const next = { id: email, email, name, cpf: '', phone: '' }
      localStorage.setItem('movva-demo-user', JSON.stringify(next))
      setCustomer(next)
      return 'Conta de demonstração criada.'
    }
    const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/entrar` } })
    if (error) throw new Error(error.message)
    return data.session ? 'Conta criada com sucesso.' : 'Conta criada! Digite o código enviado por e-mail ou abra o link de confirmação.'
  }

  async function verifyEmail(email: string, token: string) {
    if (isDemo) throw new Error('A confirmação por e-mail não é usada no modo demonstração.')
    const { error } = await supabase!.auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw new Error('Código inválido ou expirado. Confira o e-mail ou solicite outro código.')
  }

  async function resendConfirmation(email: string) {
    if (isDemo) throw new Error('A confirmação por e-mail não é usada no modo demonstração.')
    const { error } = await supabase!.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/entrar` } })
    if (error) throw new Error(error.message)
  }

  async function signOut() {
    if (isDemo) { localStorage.removeItem('movva-demo-user'); setCustomer(null); setOrders([]); return }
    const { error } = await supabase!.auth.signOut()
    if (error) throw new Error(error.message)
  }

  async function saveProfile(profile: Pick<Customer, 'name' | 'cpf' | 'phone' | 'default_address'>) {
    if (!customer) throw new Error('Entre na sua conta.')
    if (isDemo) {
      const updated = { ...customer, ...profile }
      localStorage.setItem('movva-demo-user', JSON.stringify(updated))
      setCustomer(updated)
      return
    }
    const { error } = await supabase!.from('profiles').upsert({ id: customer.id, ...profile })
    if (error) throw new Error(error.message)
    setCustomer({ ...customer, ...profile })
  }

  async function refreshOrders() {
    if (!customer) return
    if (isDemo) {
      setOrders(read<Order[]>(`movva-orders-${customer.id}`, []))
      return
    }
    const { data, error } = await supabase!.from('orders').select('id,created_at,total,status,payment_method,shipping,address,order_items(name,size,quantity,unit_price)').eq('user_id', customer.id).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    setOrders((data || []).map((order) => ({ ...order, address: order.address as Address, items: order.order_items as Order['items'] })) as Order[])
  }

  async function placeOrder(address: Address, payment: string) {
    if (!customer) throw new Error('Entre na sua conta para finalizar.')
    if (!cart.length) throw new Error('Seu carrinho está vazio.')
    if (isDemo) {
      const items = cart.map(item => {
        const product = products.find(product => product.id === item.productId)!
        return { name: product.name, size: item.size, quantity: item.quantity, unit_price: product.price }
      })
      const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      const shipping = shippingForCep(address.cep, subtotal)
      const id = `MOV-${Date.now().toString().slice(-8)}`
      const order: Order = { id, created_at: new Date().toISOString(), total: subtotal + shipping, status: 'simulado', payment_method: payment, shipping, address, items }
      const current = read<Order[]>(`movva-orders-${customer.id}`, [])
      localStorage.setItem(`movva-orders-${customer.id}`, JSON.stringify([order, ...current]))
      setOrders([order, ...current])
      setCart([])
      return id
    }
    const { data, error } = await supabase!.rpc('place_order', { p_items: cart.map(item => ({ product_id: item.productId, size: item.size, quantity: item.quantity })), p_address: address, p_payment_method: payment })
    if (error) throw new Error(error.message)
    setCart([])
    await Promise.all([refreshOrders(), refreshProducts()])
    return data as string
  }

  return <ShopContext.Provider value={{ products, cart, customer, authLoading, setupNeeded, isAdmin, adminLoading, orders, cartCount, addItem, changeQuantity, signIn, signUp, verifyEmail, resendConfirmation, signOut, saveProfile, placeOrder, refreshOrders, refreshProducts }}>{children}</ShopContext.Provider>
}

export function useShop() {
  const value = useContext(ShopContext)
  if (!value) throw new Error('ShopProvider ausente')
  return value
}
