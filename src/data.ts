export type Category = 'Tênis' | 'Roupas' | 'Acessórios'

export type Product = {
  id: string
  slug: string
  name: string
  category: Category
  subtitle: string
  price: number
  old_price: number | null
  image: string
  badge: string | null
  description: string
  sizes: string[]
  featured: boolean
  active?: boolean
  sort_order?: number
  stock?: number
}

export const demoProducts: Product[] = [
  { id: '1', slug: 'tenis-velocity-red', name: 'Tênis Velocity Red', category: 'Tênis', subtitle: 'Corrida • Unissex', price: 329.90, old_price: 429.90, image: '/images/shoe-red.jpg', badge: 'MAIS VENDIDO', description: 'Leveza para acompanhar cada quilômetro. Cabedal respirável e solado macio para o movimento diário.', sizes: ['34','35','36','37','38','39','40','41','42','43'], featured: true },
  { id: '2', slug: 'tenis-court-classic', name: 'Tênis Court Classic', category: 'Tênis', subtitle: 'Lifestyle • Unissex', price: 289.90, old_price: null, image: '/images/shoe-white.jpg', badge: 'NOVO', description: 'O clássico branco que combina com qualquer rotina. Linhas minimalistas e conforto do primeiro ao último passo.', sizes: ['34','35','36','37','38','39','40','41','42'], featured: true },
  { id: '3', slug: 'tenis-air-pulse', name: 'Tênis Air Pulse', category: 'Tênis', subtitle: 'Treino • Unissex', price: 419.90, old_price: 499.90, image: '/images/shoe-neutral.jpg', badge: '-16%', description: 'Amortecimento responsivo e presença marcante para treinar ou explorar a cidade.', sizes: ['36','37','38','39','40','41','42','43'], featured: true },
  { id: '4', slug: 'tenis-street-jump', name: 'Tênis Street Jump', category: 'Tênis', subtitle: 'Lifestyle • Unissex', price: 379.90, old_price: null, image: '/images/shoe-black.jpg', badge: null, description: 'Atitude urbana para quem encontra estilo em cada movimento.', sizes: ['35','36','37','38','39','40','41','42','43'], featured: true },
  { id: '5', slug: 'camiseta-street-signal', name: 'Camiseta Street Signal', category: 'Roupas', subtitle: 'Casual • Feminino', price: 119.90, old_price: 159.90, image: '/images/tee.jpg', badge: '-25%', description: 'Uma peça leve e descontraída para compor looks cheios de personalidade.', sizes: ['PP','P','M','G','GG'], featured: false },
  { id: '6', slug: 'jaqueta-city-edge', name: 'Jaqueta City Edge', category: 'Roupas', subtitle: 'Lifestyle • Unissex', price: 359.90, old_price: null, image: '/images/jacket.jpg', badge: 'NOVO', description: 'Camada de atitude para os dias frios, com corte marcante e acabamento confortável.', sizes: ['P','M','G','GG'], featured: false },
  { id: '7', slug: 'conjunto-sun-move', name: 'Conjunto Sun Move', category: 'Roupas', subtitle: 'Lifestyle • Feminino', price: 249.90, old_price: 299.90, image: '/images/category-style.jpg', badge: '-17%', description: 'Cor, conforto e energia em um conjunto feito para acompanhar o seu ritmo.', sizes: ['PP','P','M','G'], featured: false },
  { id: '8', slug: 'mochila-daily-track', name: 'Mochila Daily Track', category: 'Acessórios', subtitle: 'Urbano • Unissex', price: 189.90, old_price: null, image: '/images/bag.jpg', badge: null, description: 'Espaço na medida para levar o essencial do treino à rua.', sizes: ['Único'], featured: false },
]

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const digits = (value: string) => value.replace(/\D/g, '')

export function validCpf(input: string) {
  const cpf = digits(input)
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  for (let position = 9; position <= 10; position++) {
    const sum = [...cpf.slice(0, position)].reduce((acc, digit, index) => acc + Number(digit) * (position + 1 - index), 0)
    const check = (sum * 10) % 11
    if (Number(cpf[position]) !== (check === 10 ? 0 : check)) return false
  }
  return true
}

export function shippingForCep(cep: string, subtotal: number) {
  const clean = digits(cep)
  if (clean.length !== 8) throw new Error('Informe um CEP com 8 dígitos.')
  if (subtotal >= 399) return 0
  const fees = [14.9, 14.9, 19.9, 19.9, 24.9, 29.9, 34.9, 24.9, 19.9, 19.9]
  return fees[Number(clean[0])]
}

export type Address = {
  cep: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
}

export async function lookupCep(cep: string): Promise<Partial<Address>> {
  const clean = digits(cep)
  if (clean.length !== 8) throw new Error('Informe um CEP com 8 dígitos.')
  const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
  if (!response.ok) throw new Error('Não foi possível consultar o CEP.')
  const result = await response.json()
  if (result.erro) throw new Error('CEP não encontrado.')
  return { cep: clean, street: result.logradouro, district: result.bairro, city: result.localidade, state: result.uf }
}
