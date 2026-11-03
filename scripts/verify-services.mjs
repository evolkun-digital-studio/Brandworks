import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => {
  window.hoverTasks = []
  new PerformanceObserver(list => window.hoverTasks.push(...list.getEntries().map(e => e.duration))).observe({ type: 'longtask' })
})
const baseURL = process.env.SERVICES_BASE_URL || 'http://localhost:3100'
await page.goto(`${baseURL}/services`, { waitUntil: 'networkidle' })
await page.locator('.service-preview').scrollIntoViewIfNeeded()
await page.waitForFunction(() => [...document.querySelectorAll('.service-preview img')].every(img => img.complete && img.naturalWidth > 0))
assert.equal(await page.locator('.service-preview img').count(), 10)
assert.equal(await page.locator('.service-preview__title').count(), 1)
await page.evaluate(() => { window.hoverTasks = [] })
const links = page.locator('.service-index-row__link')
for (const index of [1, 4, 7, 9, 0]) {
  await links.nth(index).hover()
  await page.waitForTimeout(370)
  const visible = await page.locator('.service-preview img').evaluateAll(imgs => imgs.filter(img => getComputedStyle(img).opacity === '1').length)
  assert.equal(visible, 1)
  assert.equal(await page.locator('.service-preview__title').count(), 1)
}
const hoverTasks = await page.evaluate(() => window.hoverTasks)
assert.equal(hoverTasks.some(duration => duration > 50), false, 'Hover must not create long tasks')
// A sweep that leaves before intent expires must not change the preview.
await page.locator('.service-index-row').nth(5).dispatchEvent('pointerenter', { pointerType: 'mouse' })
await page.locator('.service-index-row').nth(5).dispatchEvent('pointerleave', { pointerType: 'mouse' })
await page.waitForTimeout(100)
assert.equal(await page.locator('.service-preview__title').textContent(), 'Strategy')
await links.nth(7).focus()
await page.waitForTimeout(320)
assert.equal(await page.locator('.service-preview__title').textContent(), 'Performance Marketing')
assert.equal(await page.locator('.site-header').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
assert.equal(await page.locator('.site-header.is-scrolled').count(), 1)
assert.equal(await page.locator('.footer-video').getAttribute('src'), null)
await page.emulateMedia({ reducedMotion: 'reduce' })
await links.nth(3).focus()
assert.equal(await page.locator('.service-preview__image.is-active').evaluate(el => getComputedStyle(el).transitionDuration), '0s')
await mkdir('test-results/services', { recursive: true })
await page.screenshot({ path: 'test-results/services/desktop.png' })
for (const width of [320, 768, 1024]) {
  await page.setViewportSize({ width, height: 900 })
  await page.evaluate(() => window.scrollTo(0, 0))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  if (width < 1024) {
    assert.equal(await page.locator('.service-preview').isVisible(), false)
    const details = page.locator('.service-index-row__mobile').first()
    if ((await details.getAttribute('open')) === null) await details.locator('summary').click()
    assert.equal(await details.locator('img').isVisible(), true)
    await page.screenshot({ path: `test-results/services/${width}.png` })
  }
}
await page.locator('#footer').scrollIntoViewIfNeeded()
await page.waitForFunction(() => document.querySelector('.footer-video')?.getAttribute('src'))
assert.equal(await page.locator('.footer-video').getAttribute('preload'), 'none')

// A first hover must keep a decoded image on screen while the requested image
// is still downloading. A late download must not override a newer selection.
const slowPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
slowPage.on('pageerror', error => errors.push(error.message))
let releaseImage
const imageGate = new Promise(resolve => { releaseImage = resolve })
await slowPage.route('**/_next/image?**', async route => {
  if (new URL(route.request().url()).searchParams.get('url') === '/services/8.webp') await imageGate
  await route.continue()
})
await slowPage.goto(`${baseURL}/services`, { waitUntil: 'domcontentloaded' })
await slowPage.locator('.service-preview').scrollIntoViewIfNeeded()
await slowPage.waitForFunction(() => {
  const image = document.querySelector('.service-preview img')
  return image?.complete && image.naturalWidth > 0
})
const slowLinks = slowPage.locator('.service-index-row__link')
await slowLinks.nth(7).focus()
await slowPage.waitForTimeout(180)
assert.equal(await slowPage.locator('.service-preview__title').textContent(), 'Strategy')
await slowLinks.nth(3).focus()
await slowPage.waitForFunction(() => document.querySelector('.service-preview__title')?.textContent === 'Photography')
releaseImage()
await slowPage.waitForFunction(() => {
  const image = document.querySelectorAll('.service-preview img')[7]
  return image?.complete && image.naturalWidth > 0
})
await slowPage.waitForTimeout(320)
assert.equal(await slowPage.locator('.service-preview__title').textContent(), 'Photography')
await slowLinks.nth(7).focus()
await slowPage.waitForFunction(() => document.querySelector('.service-preview__title')?.textContent === 'Performance Marketing')
await slowPage.close()
assert.deepEqual(errors, [])
const result = { passed: true, slowImageAndStaleDownload: true, hoverLongTasks: hoverTasks, consoleErrors: errors, viewports: [320, 768, 1024, 1440] }
await writeFile('test-results/services/browser.json', JSON.stringify(result, null, 2))
console.log(result)
await browser.close()
