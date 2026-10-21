import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = readFileSync('.env.local', 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim()
if (!url) throw new Error('Configure .env.local para testar o painel.')
const projectRef = new URL(url).hostname.split('.')[0]
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'admin@example.test', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { name: 'Admin Teste' }, created_at: new Date().toISOString() }
const session = { access_token: 'mock-token', refresh_token: 'mock-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
const product = { id: '1', slug: 'tenis-velocity-red', name: 'Tênis Velocity Red', category: 'Tênis', subtitle: 'Corrida • Unissex', price: 329.9, old_price: 429.9, image: '/images/shoe-red.jpg', badge: 'NOVO', description: 'Tênis de corrida confortável.', sizes: ['38', '39', '40'], featured: true, active: true, sort_order: 1, stock: 4 }
const order = { id: '22222222-2222-4222-8222-222222222222', created_at: new Date().toISOString(), status: 'simulado', total: 329.9, shipping: 0, payment_method: 'pix', address: { street: 'Rua Exemplo', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', cep: '01001000' }, order_items: [{ id: 1, name: product.name, size: '39', quantity: 1, unit_price: 329.9 }] }

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: `sb-${projectRef}-auth-token`, value: session })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.route('**/auth/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
await page.route('**/rest/v1/**', route => {
  const path = new URL(route.request().url()).pathname
  const data = path.endsWith('/profiles') ? { name: 'Admin Teste', cpf: '', phone: '', default_address: null }
    : path.endsWith('/admin_users') ? { user_id: user.id }
      : path.endsWith('/products') ? [product]
        : path.endsWith('/orders') ? [order]
          : []
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
})

try {
  await page.goto('http://127.0.0.1:5174/admin', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Visão geral' }).waitFor()
  const screenshot = join(tmpdir(), 'movva-admin-dashboard.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) throw new Error('Painel estoura a largura no celular.')
  const mobileScreenshot = join(tmpdir(), 'movva-admin-mobile.png')
  await page.screenshot({ path: mobileScreenshot, fullPage: true })
  await page.getByRole('link', { name: /Produtos/ }).first().click()
  await page.getByRole('heading', { name: 'Produtos' }).waitFor()
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) throw new Error('Produtos estouram a largura no celular.')
  await page.getByRole('button', { name: /NOVO PRODUTO/ }).click()
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) throw new Error('Formulário estoura a largura no celular.')
  await page.getByRole('button', { name: 'CANCELAR' }).click()
  await page.getByRole('link', { name: /Pedidos/ }).first().click()
  await page.getByRole('heading', { name: 'Pedidos' }).waitFor()
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) throw new Error('Pedidos estouram a largura no celular.')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('link', { name: /Produtos/ }).first().click()
  await page.getByRole('heading', { name: 'Produtos' }).waitFor()
  await page.getByRole('button', { name: /NOVO PRODUTO/ }).click()
  await page.getByRole('dialog', { name: 'Novo produto' }).waitFor()
  await page.getByRole('button', { name: 'CANCELAR' }).click()
  await page.getByRole('link', { name: /Pedidos/ }).first().click()
  await page.getByRole('heading', { name: 'Pedidos' }).waitFor()
  await page.locator('.admin-order-head').click()
  await page.getByText('Rua Exemplo').waitFor()
  if (errors.length) throw new Error(`Erros no navegador: ${errors.join(' | ')}`)
  console.log('Painel, produtos, formulário e detalhes do pedido: OK')
  console.log(`Captura visual: ${screenshot}`)
  console.log(`Captura celular: ${mobileScreenshot}`)
} finally {
  await browser.close()
}
