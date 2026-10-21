import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

try {
  await page.goto('http://127.0.0.1:5174/admin', { waitUntil: 'networkidle' })
  await page.waitForURL('**/entrar?proximo=%2Fadmin')
  if (await page.getByRole('link', { name: 'Admin' }).count()) throw new Error('Link administrativo visível sem login.')
  if (errors.length) throw new Error(`Erros no navegador: ${errors.join(' | ')}`)
  console.log('Acesso anônimo protegido: OK')
} finally {
  await browser.close()
}
