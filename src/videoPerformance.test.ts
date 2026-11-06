import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * Source-text regression guards (Phase 11) — same rationale as
 * imagePerformance.test.ts: these are static, unconditional authoring
 * decisions (which video is `priority`, which asset each component
 * imports), not values that vary at runtime, so asserting the
 * authored source directly is a legitimate, non-brittle way to guard
 * against silently reverting them. Reads via Node `fs`, so this file
 * is typechecked under tsconfig.node.json rather than
 * tsconfig.app.json — see that file's own comment for why.
 */

const srcDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)))

function read(relativePath: string): string {
  return readFileSync(path.join(srcDir, relativePath), 'utf8')
}

describe('Hero — service media loading strategy', () => {
  const hero = read('components/Hero/Hero.tsx')
  const media = read('components/Hero/HeroMedia.tsx')
  const data = read('data/heroServices.ts')

  // The default service is a product decision (it moved from
  // Photography to Videography); the guard is that only that one layer
  // is mounted at first paint, whichever service it is.
  it('starts with only the default service layer mounted', () => {
    expect(hero).toContain('new Set([DEFAULT_HERO_SERVICE])')
    expect(data).toMatch(/export const DEFAULT_HERO_SERVICE: HeroServiceId = '[a-z-]+'/)
  })

  it('warms the other services only after load, when the page is idle', () => {
    expect(hero).toMatch(/addEventListener\((['"])load\1/)
    expect(hero).toContain('requestIdleCallback')
  })

  it('attaches the film only once Videography is actually selected, muted, looping, inline, without controls', () => {
    expect(media).toMatch(/\{requested && \(\s*<video/)
    const video = media.slice(media.indexOf('<video'), media.indexOf('/>', media.indexOf('<video')))
    for (const attr of ['muted', 'loop', 'playsInline']) expect(video).toContain(attr)
    expect(video).not.toContain('controls')
  })

  it('pauses the film whenever it is not the active, on-screen service', () => {
    expect(media).toContain('video.pause()')
    expect(media).toContain('playing={isActive && inView}')
  })

  it('serves the photography grid as small WebP files, not the multi-MB source PNGs', () => {
    expect(data).not.toMatch(/Photo\/Photo\d+\.(png|jpg)/)
    const heroDir = path.join(srcDir, 'assets/hero')
    for (const file of ['photo-01.webp', 'photo-02.webp', 'photo-03.webp', 'photo-04.webp']) {
      expect(statSync(path.join(heroDir, file)).size).toBeLessThan(200 * 1024)
    }
  })
})

describe('About.tsx — video source and loading strategy', () => {
  const source = read('components/About.tsx')
  const video = source.slice(source.indexOf('<video'), source.indexOf('/>', source.indexOf('<video')))

  // The Cloudinary film was replaced by an R2-hosted clip that the
  // visitor plays/pauses by clicking the frame, so it no longer autoplays.
  it('serves the film from the R2 media helper as a muted, looping, inline background clip without native controls', () => {
    expect(video).toMatch(/src=\{mediaUrl\(["'][^"']+\.mp4["']\)\}/)
    expect(source).not.toContain('res.cloudinary.com')
    for (const attr of ['muted', 'loop', 'playsInline', 'preload="metadata"']) {
      expect(video).toContain(attr)
    }
    expect(video).not.toContain('controls')
    expect(video).toContain('absolute inset-0 h-full w-full object-cover object-center')
  })

  it('reserves layout space via a fixed aspect-ratio container', () => {
    expect(source).toContain('aspect-[16/10]')
  })
})

describe('Industries.tsx — Real Estate case study film', () => {
  const source = read('components/Industries.tsx')

  it('uses LazyBackgroundVideo, not a raw <video> element', () => {
    expect(source).toContain('LazyBackgroundVideo')
    expect(source).not.toMatch(/<video/)
  })

  it('does not mark it priority — it sits well below the fold and the file is ~13MB', () => {
    const block = source.slice(source.indexOf('<LazyBackgroundVideo'), source.indexOf('<LazyBackgroundVideo') + 300)
    expect(block).not.toContain('priority')
  })

  it('reserves layout space via a fixed aspect ratio, so the film cannot shift the page', () => {
    expect(source).toContain('aspect-[16/10]')
  })

  it('names the film for assistive tech — this one is content, not decoration', () => {
    expect(source).toContain('ariaLabel=')
  })
})

describe('Videography.tsx — pinned film section', () => {
  const source = read('components/Videography.tsx')
  const videos = [...source.matchAll(/<video[\s\S]*?\/>/g)].map((m) => m[0])

  it('uses no <img> as storytelling media', () => {
    expect(source).not.toMatch(/<img/)
  })

  // The YouTube embeds were replaced by direct R2-hosted films.
  it('plays direct video files, with no YouTube iframes or share (?si=) links', () => {
    expect(source).not.toMatch(/<iframe/)
    expect(source).not.toMatch(/youtube(-nocookie)?\.com/)
    expect(source).not.toMatch(/[?&]si=[A-Za-z0-9_-]/)
    expect(videos.length).toBeGreaterThan(0)
  })

  it('every film is muted, inline, metadata-preloaded, hidden from assistive tech, with no native controls', () => {
    for (const video of videos) {
      expect(video).toMatch(/\bmuted\b/)
      expect(video).toContain('playsInline')
      expect(video).toContain('preload="metadata"')
      expect(video).toContain('aria-hidden="true"')
      expect(video).not.toMatch(/\bcontrols\b/)
    }
  })

  it('plays a film only while its scene is live, pausing it otherwise', () => {
    expect(source).toMatch(/if \(live( && !paused)?\) \{\s*video\.play\(\)/)
    expect(source).toContain('video.pause()')
  })
})

describe('production video assets are untouched', () => {
  // Brand2.mp4 was deliberately removed in commit 4735d76 when the
  // films moved to R2; the two that remain bundled are still guarded.
  it('the bundled source files still exist at their original paths and sizes are unchanged from the Phase 10 audit', () => {
    const assetsDir = path.join(srcDir, 'assets')
    const sizes = {
      'ForWebsite.mp4': statSync(path.join(assetsDir, 'ForWebsite.mp4')).size,
      'Brand1.mp4': statSync(path.join(assetsDir, 'Brand1.mp4')).size,
    }
    // Exact byte sizes recorded during the Phase 10/11 audit — any
    // change here means a source video was modified, which Phase 11
    // explicitly must not do (Part 11/20).
    expect(sizes['ForWebsite.mp4']).toBe(1821344)
    expect(sizes['Brand1.mp4']).toBe(12924373)
  })
})
