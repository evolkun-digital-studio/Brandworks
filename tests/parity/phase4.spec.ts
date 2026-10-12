import { expect, test } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const defaultRoutes = [
  '/',
  '/about',
  '/services/photography',
  '/services/social-media',
  '/admin/login',
]

const routes = process.env.PARITY_ROUTES?.split(',').filter(Boolean) ?? defaultRoutes
const defaultViewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]
const viewports = process.env.PARITY_VIEWPORTS
  ? process.env.PARITY_VIEWPORTS.split(',').map(size => {
      const [width, height] = size.split('x').map(Number)
      return { width, height }
    })
  : defaultViewports

const output = join(tmpdir(), 'brandworks-phase4-playwright')
mkdirSync(output, { recursive: true })

type BrowserEvents = {
  pageErrors: string[]
  consoleErrors: string[]
  consoleWarnings: string[]
  failedRequests: string[]
  badResponses: string[]
}

function watchPage(page: import('@playwright/test').Page): BrowserEvents {
  const events: BrowserEvents = {
    pageErrors: [],
    consoleErrors: [],
    consoleWarnings: [],
    failedRequests: [],
    badResponses: [],
  }
  page.on('pageerror', error => events.pageErrors.push(`${page.url()}\n${error.stack ?? error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') events.consoleErrors.push(message.text())
    if (message.type() === 'warning') events.consoleWarnings.push(message.text())
  })
  page.on('requestfailed', request => {
    events.failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`)
  })
  page.on('response', response => {
    if (response.status() >= 400) events.badResponses.push(`${response.status()} ${response.url()}`)
  })
  return events
}

async function navigateAndSettle(page: import('@playwright/test').Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const preloader = page.locator('.bw-pl')
  // In Next the loader is mounted after client hydration; don't mistake its
  // server-rendered absence for a completed intro. Admin intentionally has
  // no public preloader.
  if (!new URL(url).pathname.startsWith('/admin')) {
    await preloader.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => undefined)
  }
  await Promise.race([
    page.evaluate(async () => {
      await document.fonts.ready
      const visibleImages = Array.from(document.images).filter(image => {
        const rect = image.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
      })
      await Promise.all(visibleImages.map(image => image.decode().catch(() => undefined)))
    }),
    page.waitForTimeout(6000),
  ])
  if (await preloader.count()) {
    await preloader.waitFor({ state: 'detached', timeout: 18_000 }).catch(() => undefined)
  }
  await page.waitForFunction(() => Array.from(document.images).every(image => {
    const rect = image.getBoundingClientRect()
    return rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= innerHeight || image.complete
  }), { timeout: 8_000 }).catch(() => undefined)
  await page.waitForTimeout(700)
}

test('capture paired route/viewport screenshots and browser diagnostics', async ({ browser }) => {
  const report: Record<string, unknown>[] = []

  for (const viewport of viewports) {
    const sessions = new Map<string, { context: import('@playwright/test').BrowserContext; page: import('@playwright/test').Page; events: BrowserEvents }>()
    for (const [site, baseURL] of [
      ['vite', 'http://127.0.0.1:5173'],
      ['next', 'http://127.0.0.1:3000'],
    ] as const) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      sessions.set(site, { context, page, events: watchPage(page) })
      void baseURL
    }

    for (const route of routes) {
      const pair: Record<string, unknown> = { route, viewport }
      const pngs: PNG[] = []

      for (const [site, baseURL] of [
        ['vite', 'http://127.0.0.1:5173'],
        ['next', 'http://127.0.0.1:3000'],
      ] as const) {
        const session = sessions.get(site)!
        const { page, events } = session
        Object.values(events).forEach(entries => { entries.length = 0 })
        const url = `${baseURL}${route}`
        await navigateAndSettle(page, url)

        // Hide only the Next development toolbar; it is framework chrome, not site UI.
        if (site === 'next') {
          await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
        }

        const metrics = await page.evaluate(() => {
          const box = (element: Element | null) => {
            if (!element) return null
            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            return {
              x: Math.round(rect.x), y: Math.round(rect.y),
              width: Math.round(rect.width), height: Math.round(rect.height),
              fontFamily: style.fontFamily, fontSize: style.fontSize,
              lineHeight: style.lineHeight, color: style.color,
              backgroundColor: style.backgroundColor,
            }
          }
          const heading = document.querySelector('h1')
          const header = document.querySelector('header')
          const main = document.querySelector('main')
          const footer = document.querySelector('footer')
          const canvas = document.querySelector('canvas')
          const webgl = canvas instanceof HTMLCanvasElement
            ? Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
            : null
          return {
            title: document.title,
            scrollY: Math.round(window.scrollY),
            document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
            heading: box(heading), header: box(header), main: box(main), footer: box(footer),
            hero: box(document.querySelector('.hero')),
            heroContent: box(document.querySelector('.hero-content')),
            heroContentHeight: document.querySelector('.hero-content')?.getBoundingClientRect().height ?? null,
            headerClass: header?.className ?? null,
            heroDebug: (() => {
              const hero = document.querySelector('.hero')
              const content = document.querySelector('.hero-content')
              const aside = document.querySelector('.hero-aside')
              const caption = document.querySelector('.hero-caption')
              const get = (element: Element | null) => {
                if (!element) return null
                const style = getComputedStyle(element)
                const rect = element.getBoundingClientRect()
                return {
                  x: Math.round(rect.x), y: Math.round(rect.y),
                  width: Math.round(rect.width), height: Math.round(rect.height),
                  display: style.display, position: style.position,
                  opacity: style.opacity, transform: style.transform,
                  alignItems: style.alignItems, padding: style.padding,
                  gap: style.gap, gridTemplateRows: style.gridTemplateRows,
                }
              }
              return {
                service: hero?.getAttribute('data-service'),
                scrollY: window.scrollY,
                heroContentVar: hero ? getComputedStyle(hero).getPropertyValue('--hero-content-h') : null,
                hero: get(hero), content: get(content), aside: get(aside), caption: get(caption),
                video: Array.from(document.querySelectorAll('.hero-video')).map(element => ({
                  className: element.className, complete: (element as HTMLVideoElement).readyState,
                  currentSrc: (element as HTMLVideoElement).currentSrc,
                })),
              }
            })(),
            images: Array.from(document.images).filter(image => image.getBoundingClientRect().width > 0).slice(0, 12).map(image => ({
              src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth,
              ...box(image),
            })),
            canvasCount: document.querySelectorAll('canvas').length,
            webgl,
            preloaderVisible: Boolean(document.querySelector('.bw-pl')),
            preloaderDebug: (() => {
              const loader = document.querySelector('.bw-pl')
              const style = loader ? getComputedStyle(loader) : null
              return {
                sessionSeen: sessionStorage.getItem('bw:intro-seen'),
                className: loader?.className ?? null,
                transform: style?.transform ?? null,
                opacity: style?.opacity ?? null,
                hasStage: Boolean(loader?.querySelector('[data-pl="stage"]')),
                wordmarkText: loader?.querySelector('.bw-pl__sr')?.textContent ?? null,
              }
            })(),
            socialDebug: (() => {
              const selectors = ['.bwsm-page', '.bwsm-roundnav', '.bwsm-roundnav button', '.bwsm-roundnav a', '.bwsm-case-card', '.bwsm-case-card strong', '.bwsm-hero-type', 'h1', '[data-social-emoji]']
              return Object.fromEntries(selectors.map(selector => {
                const element = document.querySelector(selector)
                if (!element) return [selector, null]
                const rect = element.getBoundingClientRect()
                const style = getComputedStyle(element)
                const parent = element.parentElement?.getBoundingClientRect()
                return [selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, display: style.display, opacity: style.opacity, transform: style.transform, font: style.font, letterSpacing: style.letterSpacing, wordSpacing: style.wordSpacing, background: style.backgroundColor, parent: parent && { x: parent.x, y: parent.y, width: parent.width, height: parent.height } }]
              }))
            })(),
            socialFonts: {
              clash: document.fonts.check('400 16px "Clash Grotesk"'),
              anton: document.fonts.check('400 16px Anton'),
              fontCount: document.fonts.size,
              faces: Array.from(document.fonts).filter(face => face.family.toLowerCase().includes('clash')).map(face => ({ family: face.family, weight: face.weight, status: face.status })),
            },
          }
        })

        const safeRoute = route === '/' ? 'home' : route.slice(1).replace(/[^a-zA-Z0-9_-]+/g, '_').replaceAll('/', '_')
        const name = `${site}-${safeRoute}-${viewport.width}x${viewport.height}`
        const screenshotPath = join(output, `${name}.png`)
        await page.screenshot({ path: screenshotPath, animations: 'disabled' })
        pngs.push(PNG.sync.read(readFileSync(screenshotPath)))
        pair[site] = { url, screenshotPath, metrics, events: structuredClone(events) }
      }

      const [vitePNG, nextPNG] = pngs
      const diff = new PNG({ width: viewport.width, height: viewport.height })
      const differentPixels = pixelmatch(vitePNG.data, nextPNG.data, diff.data, viewport.width, viewport.height, {
        threshold: 0.12,
        includeAA: false,
      })
      const diffPath = join(output, `diff-${route === '/' ? 'home' : route.slice(1).replace(/[^a-zA-Z0-9_-]+/g, '_').replaceAll('/', '_')}-${viewport.width}x${viewport.height}.png`)
      writeFileSync(diffPath, PNG.sync.write(diff))
      pair.pixelDifference = {
        differentPixels,
        totalPixels: viewport.width * viewport.height,
        ratio: Number((differentPixels / (viewport.width * viewport.height)).toFixed(4)),
        diffPath,
      }
      report.push(pair)
    }

    for (const session of sessions.values()) await session.context.close()
  }

  writeFileSync(join(output, 'route-comparison.json'), JSON.stringify(report, null, 2))
  console.log(`PAIR_REPORT=${join(output, 'route-comparison.json')}`)
})

test('check client navigation, history, hash, query, mobile menu, scroll, and photography canvas', async ({ browser }) => {
  const report: Record<string, unknown>[] = []
  for (const [site, baseURL] of [
    ['vite', 'http://127.0.0.1:5173'],
    ['next', 'http://127.0.0.1:3000'],
  ] as const) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const events = watchPage(page)
    await page.addInitScript(() => {
      const calls: string[] = []
      ;(window as Window & { __parityScrollCalls?: string[] }).__parityScrollCalls = calls
      const original = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (...args) {
        calls.push(`${location.pathname}${location.hash}:#${(this as HTMLElement).id}:${Math.round(performance.now())}`)
        return original.apply(this, args)
      }
    })
    await navigateAndSettle(page, `${baseURL}/`)

    await page.locator('nav[aria-label="Primary"] a[href="/about"]').click()
    await page.waitForURL('**/about')
    const aboutNavigation = page.url()
    await page.goBack()
    await page.waitForURL(url => url.pathname === '/')
    const backNavigation = page.url()
    await page.goForward()
    await page.waitForURL(url => url.pathname === '/about')
    const forwardNavigation = page.url()

    await navigateAndSettle(page, `${baseURL}/#photography`)
    const hash = await page.evaluate(() => {
      const target = document.getElementById('photography')
      return {
        hash: location.hash,
        targetExists: Boolean(target),
        scrollY: window.scrollY,
        targetTop: target ? Math.round(target.getBoundingClientRect().top) : null,
        scrollCalls: (window as Window & { __parityScrollCalls?: string[] }).__parityScrollCalls,
      }
    })

    await page.setViewportSize({ width: 375, height: 812 })
    await navigateAndSettle(page, `${baseURL}/about`)
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    const menuExists = await menuButton.count()
    if (menuExists) await menuButton.click()
    const mobileMenuAfterClick = await page.locator('nav[aria-label="Primary"]').isVisible().catch(() => false)

    await navigateAndSettle(page, `${baseURL}/blog?category=all`)
    const queryURL = page.url()
    await page.getByRole('button', { name: 'Strategy' }).click()
    await page.waitForURL(url => url.pathname === '/blog' && url.searchParams.get('category') === 'strategy')
    await expect(page.getByRole('button', { name: 'Strategy' })).toHaveAttribute('aria-pressed', 'true')
    const categoryNavigation = {
      url: page.url(),
      active: await page.getByRole('button', { name: 'Strategy' }).getAttribute('aria-pressed'),
    }
    await page.getByRole('button', { name: 'All' }).click()
    await page.waitForURL(url => url.pathname === '/blog' && !url.searchParams.has('category'))
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    await page.mouse.wheel(0, 650)
    await page.waitForTimeout(300)
    const scrollY = await page.evaluate(() => window.scrollY)

    await navigateAndSettle(page, `${baseURL}/services/photography`)
    const canvas = await page.evaluate(() => {
      const element = document.querySelector('canvas')
      return {
        count: document.querySelectorAll('canvas').length,
        width: element?.clientWidth ?? 0,
        height: element?.clientHeight ?? 0,
        webgl: element instanceof HTMLCanvasElement ? Boolean(element.getContext('webgl2') || element.getContext('webgl')) : null,
      }
    })
    report.push({ site, aboutNavigation, backNavigation, forwardNavigation, hash, menuExists, mobileMenuAfterClick, queryURL, categoryNavigation, scrollY, canvas, events })
    await context.close()
  }

  writeFileSync(join(output, 'interaction-report.json'), JSON.stringify(report, null, 2))
  console.log(`INTERACTION_REPORT=${join(output, 'interaction-report.json')}`)
})

test('Next editorial metadata is present on the initial response', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  const cases = [
    {
      path: '/blog/why-brand-photography-changes-perceived-value',
      title: 'Why Brand Photography Changes Perceived Value | BRANDWORKS',
      canonical: 'https://brandworks.me/blog/why-brand-photography-changes-perceived-value',
      schemaType: 'BlogPosting',
    },
    {
      path: '/news/inside-a-hospitality-shoot-across-three-properties',
      title: 'Inside a Hospitality Shoot Across Three Properties | BRANDWORKS',
      canonical: 'https://brandworks.me/news/inside-a-hospitality-shoot-across-three-properties',
      schemaType: 'NewsArticle',
    },
  ]

  for (const item of cases) {
    await page.goto(`http://127.0.0.1:3000${item.path}`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(item.title)
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', '')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', item.canonical)
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
    const graph = await page.locator('script[type="application/ld+json"]').evaluate((element) => JSON.parse(element.textContent ?? '{}'))
    expect(graph['@type']).toBe(item.schemaType)
  }

  for (const item of [
    { path: '/privacy-policy', title: 'Privacy policy | Brand Works', canonical: 'https://brandworks.me/privacy-policy' },
    { path: '/services/Concept-creation', title: 'Concept Creation | BrandWorks', canonical: 'https://brandworks.me/services/Concept-creation' },
  ]) {
    await page.goto(`http://127.0.0.1:3000${item.path}`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(item.title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', item.canonical)
  }

  await page.goto('http://127.0.0.1:3000/phase-six-missing-route', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveTitle('Page Not Found | BRANDWORKS')
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', 'noindex')

  expect(pageErrors).toEqual([])
  await context.close()
})
