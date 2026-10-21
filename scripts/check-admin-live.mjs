import { readFileSync } from 'node:fs'

const env = readFileSync('.env.local', 'utf8')
const projectUrl = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim().replace(/\/$/, '')
const publishableKey = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim()
if (!projectUrl || !publishableKey) throw new Error('Configure .env.local antes de verificar o Supabase.')

async function check(name, path, options = {}) {
  try {
    const response = await fetch(`${projectUrl}${path}`, {
      ...options,
      headers: { apikey: publishableKey, ...options.headers },
    })
    const body = await response.text()
    console.log(`${name}: HTTP ${response.status}${response.ok ? ` · ${body.slice(0, 160)}` : ''}`)
  } catch (error) {
    console.log(`${name}: indisponível (${error.cause?.code || error.name})`)
  }
}

await check('Produtos com estoque', '/rest/v1/products?select=id,stock&limit=1')
await check('Administradores sem login', '/rest/v1/admin_users?select=user_id&limit=1')
await check('Função admin sem login', '/rest/v1/rpc/is_admin', { method: 'POST' })
