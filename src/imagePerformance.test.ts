import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * This file reads source text directly via Node's `fs` (a `?raw` Vite
 * import was tried first, but the Tailwind Vite plugin intercepts
 * `.css` loads even with a `?raw` query and yields empty content — a
 * plugin-interaction quirk, not something worth working around). Since
 * that makes this a Node-context file, it's typechecked under
 * tsconfig.node.json (which has Node's types) rather than
 * tsconfig.app.json (browser-only types, like the rest of src/) — see
 * the `exclude` entry there and the `include` entry here.
 *
 * These attributes (Phase 10) are static, unconditional authoring
 * choices — every render of a given <img> always has the same
 * loading/decoding/fetchPriority values, there's no prop or state that
 * varies them (unlike BlogCard's `priority` prop, covered by a real
 * renderToStaticMarkup test in BlogCard.test.tsx). Rendering these
 * components for real would mean either mocking async data fetching
 * (BlogDetailPage fetches its post over the network in a useEffect)
 * or adding a Router/network-mocking dependency for no added
 * confidence over just asserting the authored source directly — so
 * these are deliberate, narrowly-scoped source-text regression guards
 * against silently reverting a specific attribute, not an attempt to
 * simulate full browser rendering.
 */

const srcDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)))

function read(relativePath: string): string {
  return readFileSync(path.join(srcDir, relativePath), 'utf8')
}

/** Extracts the first <img ...> or <img ...></img> block whose src prop matches `srcExprSubstring`. */
function findImgBlock(source: string, srcExprSubstring: string): string {
  const idx = source.indexOf(srcExprSubstring)
  if (idx === -1) {
    throw new Error(`Could not find an element with src containing "${srcExprSubstring}"`)
  }
  const start = source.lastIndexOf('<img', idx)
  const end = source.indexOf('/>', idx)
  if (start === -1 || end === -1) {
    throw new Error(`Could not locate the full <img> block around "${srcExprSubstring}"`)
  }
  return source.slice(start, end + 2)
}

describe('BlogDetailPage — article cover image (likely LCP candidate)', () => {
  const source = read('blog/pages/BlogDetailPage.tsx')
  const img = findImgBlock(source, 'src={post.coverImage}')

  it('is not lazy-loaded', () => {
    expect(img).not.toContain('loading="lazy"')
    expect(img).toContain('loading="eager"')
  })

  it('requests high fetch priority', () => {
    expect(img).toContain('fetchPriority="high"')
  })

  it('does not force async decoding on the likely-LCP image', () => {
    expect(img).not.toContain('decoding=')
  })

  it('reserves its box via an aspect-ratio class (CLS)', () => {
    expect(img).toContain('aspect-[16/9]')
  })

  it('renders the CMS URL verbatim — no fabricated responsive/transformation src', () => {
    expect(img).toContain('src={post.coverImage}')
    expect(source).not.toMatch(/coverImage\}.*srcSet/s)
  })
})

describe('Services.tsx — near-fold homepage images', () => {
  const source = read('components/Service/Services.tsx')
  const start = source.indexOf('<Image')
  const img = source.slice(start, source.indexOf('/>', start) + 2)

  // The ring moved to next/image: `fill` + `sizes` reserves the box
  // and lets Next pick a responsive candidate. Every card currently
  // lazy-loads (the earlier "front card eager" split was dropped).
  it('renders each card through next/image with fill and responsive sizes (no layout shift)', () => {
    expect(source).toMatch(/^import Image from ['"]next\/image['"]/m)
    expect(img).toContain('src={service.image}')
    expect(img).toContain('fill')
    expect(img).toMatch(/sizes="[^"]+"/)
  })

  it('lazy-loads the cards', () => {
    expect(img).toContain('loading="lazy"')
  })

  it('does not force async decoding on a plausible LCP image', () => {
    expect(img).not.toContain('decoding=')
  })
})

describe.each([
  ['components/PhotographyWall/PhotographyWall.tsx', 'src={project.image}'],
  // Industries.tsx used to be listed here. Its still-image case study
  // is now a film, so the same "below the fold, must not load eagerly"
  // guarantee is asserted in videoPerformance.test.ts instead.
])('%s — below-the-fold homepage images', (file, srcExpr) => {
  const img = findImgBlock(read(file), srcExpr)

  it('is lazy-loaded', () => {
    expect(img).toContain(file.includes('PhotographyWall') ? "loading={priority ? 'eager' : 'lazy'}" : 'loading="lazy"')
  })

  it('decodes asynchronously', () => {
    expect(img).toContain('decoding="async"')
  })
})

describe('AdminRoutes — route-level code splitting (Phase 10, Part 13)', () => {
  const appSource = read('App.tsx')

  it('is imported lazily from App.tsx, not statically', () => {
    expect(appSource).toMatch(/const AdminRoutes = lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/admin\/AdminRoutes['"]\)/)
    expect(appSource).not.toMatch(/^import AdminRoutes from/m)
  })

  it('the lazy admin route is wrapped in Suspense', () => {
    expect(appSource).toMatch(/<Suspense[^>]*>[\s\S]*<AdminRoutes/)
  })

  // "AdminRoutes module still resolves to a valid component" is
  // covered separately in src/admin/AdminRoutes.test.ts — a real
  // dynamic import, which needs the JSX-aware app tsconfig this
  // Node-context file (reading source text via `fs`) intentionally
  // doesn't use. See that file's own comment.

  // /blog and /blog/:slug now render the shared editorial pages.
  it('public routes (/, /blog, /blog/:slug) are still statically imported — unaffected by the admin split', () => {
    expect(appSource).toMatch(/^import \{ Home \} from/m)
    expect(appSource).toMatch(/^import \{\s*EditorialArticlePage,\s*EditorialIndexPage,?\s*\} from ["']\.\/editorial\/EditorialPages["']/m)
    expect(appSource).not.toMatch(/lazy\(\s*\(\)\s*=>\s*import\(["']\.\/editorial/)
  })
})

// Under Next the document <head> is app/layout.tsx; index.html is only
// the legacy Vite shell, so the font guards follow the real entry point.
describe('app/layout.tsx — font loading (Phase 10, Part 11)', () => {
  const layout = read('../app/layout.tsx')
  const css = read('index.css')
  const fontLinkHref = layout.match(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/)?.[1] ?? ''

  it('loads Google Fonts via a non-render-blocking <link>, not a CSS @import', () => {
    expect(layout).toMatch(/<link\s+rel="stylesheet"\s+href="https:\/\/fonts\.googleapis\.com/)
    expect(css).not.toMatch(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com/)
  })

  it('preconnects to both Google Fonts hosts', () => {
    expect(layout).toContain('rel="preconnect" href="https://fonts.googleapis.com"')
    expect(layout).toContain('rel="preconnect" href="https://fonts.gstatic.com"')
  })

  it('keeps font-display: swap for the Google-hosted families', () => {
    expect(fontLinkHref).toContain('display=swap')
  })

  it('does not request unused font families (Instrument Sans, Poppins were fetched but never used)', () => {
    expect(fontLinkHref).not.toContain('Instrument+Sans')
    expect(fontLinkHref).not.toContain('Poppins')
  })

  it('still requests every display face the hero mock sites and logo tiles reference', () => {
    for (const family of ['Pacifico', 'Bungee', 'Abril+Fatface', 'Righteous', 'Figtree', 'Fraunces']) {
      expect(fontLinkHref).toContain(`family=${family}`)
    }
  })

  it('every self-hosted @font-face keeps font-display: swap', () => {
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? []
    expect(faces.length).toBeGreaterThan(0)
    for (const face of faces) expect(face).toContain('font-display: swap')
  })
})
