import { chromium } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
]

const browser = await chromium.launch({ headless: true })

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' })
  await page.goto('http://127.0.0.1:3101', { waitUntil: 'domcontentloaded' })

  const heading = page.getByRole('heading', { name: 'Cinematography' })
  const section = heading.locator('xpath=ancestor::section[1]')
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)

  const measurements = await section.evaluate((element) => {
    const sectionRect = element.getBoundingClientRect()
    const visibleDescendants = [...element.querySelectorAll('*')].filter((node) => {
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1
    })
    const bounds = visibleDescendants.reduce(
      (current, node) => {
        const rect = node.getBoundingClientRect()
        return {
          top: Math.min(current.top, rect.top),
          right: Math.max(current.right, rect.right),
          bottom: Math.max(current.bottom, rect.bottom),
          left: Math.min(current.left, rect.left),
        }
      },
      { top: Infinity, right: -Infinity, bottom: -Infinity, left: Infinity },
    )

    return {
      section: {
        top: Math.round(sectionRect.top),
        right: Math.round(sectionRect.right),
        bottom: Math.round(sectionRect.bottom),
        left: Math.round(sectionRect.left),
        width: Math.round(sectionRect.width),
        height: Math.round(sectionRect.height),
      },
      content: {
        top: Math.round(bounds.top),
        right: Math.round(bounds.right),
        bottom: Math.round(bounds.bottom),
        left: Math.round(bounds.left),
      },
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      headingOpacity: getComputedStyle(element.querySelector('h2')).opacity,
    }
  })

  const fitsVertically = measurements.content.top >= measurements.section.top && measurements.content.bottom <= measurements.section.bottom
  const fitsHorizontally = measurements.content.left >= measurements.section.left && measurements.content.right <= measurements.section.right

  console.log(
    JSON.stringify({
      viewport,
      fitsVertically,
      fitsHorizontally,
      ...measurements,
    }),
  )

  await section.screenshot({ path: `scratch/cinematography-${viewport.name}.png`, animations: 'disabled' })
  await page.close()
}

await browser.close()
