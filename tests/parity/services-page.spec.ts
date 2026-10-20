import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const evidenceDirectory = join(tmpdir(), 'brandworks-services-evidence')

test.beforeAll(async () => {
  await mkdir(evidenceDirectory, { recursive: true })
})

test('services page preserves content and supports hover and keyboard previews', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('/_next/hmr')) consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('http://localhost:3000/services', { waitUntil: 'networkidle' })
  await expect(page.locator('.bw-pl')).toHaveCount(0, { timeout: 15_000 })

  await expect(page.getByRole('heading', { level: 1, name: 'From how a brand thinks to how the world sees it.' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Capabilities' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'BrandWorks services' }).getByRole('link')).toHaveCount(10)
  expect(consoleErrors).toEqual([])
  await expect(page.getByLabel('Featured service: Strategy')).toBeVisible()
  await expect(page.getByLabel('Featured service: Strategy').getByText('01 / 10', { exact: true })).toBeVisible()

  const graphicDesign = page.getByRole('link', { name: 'Explore Graphic Design services' })
  await graphicDesign.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await graphicDesign.hover()
  await expect(page.getByLabel('Featured service: Graphic Design')).toBeVisible()
  await expect(page.getByLabel('Featured service: Graphic Design').getByText('02 / 10', { exact: true })).toBeVisible()
  await expect(graphicDesign.getByText('Visual identities, campaign systems and graphic communication designed to make brands clearer, more consistent and easier to recognise.').first()).toBeVisible()

  const photography = page.getByRole('link', { name: 'Explore Photography services' })
  await page.mouse.move(0, 0)
  await photography.focus()
  await expect(page.getByLabel('Featured service: Photography')).toBeVisible()
  await expect(photography).toBeFocused()

  const stickyColumn = page.getByLabel('Featured service: Photography')
  await expect(stickyColumn).toHaveCSS('position', 'sticky')
  await expect.poll(() => stickyColumn.getByAltText('Commercial and campaign photography by BrandWorks').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.screenshot({ path: join(evidenceDirectory, 'services-desktop-1440x1000.png'), fullPage: true })
  expect(consoleErrors).toEqual([])
})

test('services page has intentional tablet and mobile layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('http://localhost:3000/services', { waitUntil: 'networkidle' })
  await expect(page.locator('.bw-pl')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByLabel('Featured service: Strategy')).toBeVisible()
  await expect.poll(() => page.getByLabel('Featured service: Strategy').locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.screenshot({ path: join(evidenceDirectory, 'services-tablet-1024x900.png'), fullPage: true })

  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload()
  await expect(page.locator('.bw-pl')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByLabel('Featured service: Strategy')).toBeHidden()
  await expect(page.getByRole('link', { name: 'Explore Strategy services' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explore Strategy services' }).locator('.bw-services__description-mobile')).toBeVisible()
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 375)
  await page.screenshot({ path: join(evidenceDirectory, 'services-mobile-375x812.png'), fullPage: true })
})

test('services page respects reduced motion', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('http://localhost:3000/services', { waitUntil: 'networkidle' })
  await expect(page.locator('.bw-pl')).toHaveCount(0, { timeout: 15_000 })
  const strategyLink = page.getByRole('link', { name: 'Explore Strategy services' })
  await expect(strategyLink).toBeVisible()
  await expect(strategyLink.locator('.bw-services__name')).toHaveCSS('transition-duration', '0s')
  expect(runtimeErrors).toEqual([])
})
