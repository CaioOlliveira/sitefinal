import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.stack || error.message))
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()) })
page.on('response', response => { if (response.status() >= 400) console.log('HTTP', response.status(), response.url().split('?')[0]) })
try {
  await page.goto(process.argv[2] || 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  console.log('title:', await page.title())
  console.log('body:', (await page.locator('body').innerText()).slice(0, 500))
  console.log('errors so far:', errors)
  if (errors.length) throw new Error('Browser errors found')
  console.log('hero:', await page.locator('h1').first().textContent())
  console.log('cards:', await page.locator('.product-card').count())
  await page.screenshot({ path: `${process.env.TEMP}\\movva-qa-desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${process.env.TEMP}\\movva-qa-mobile.png`, fullPage: true })
  console.log('body scroll width:', await page.evaluate(() => document.body.scrollWidth))
  console.log('errors:', errors)
} finally {
  await browser.close()
}
