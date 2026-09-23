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
  const hero = read('Hero.tsx')
  const media = read('components/Hero/HeroMedia.tsx')
  const data = read('data/heroServices.ts')

  it('starts with only the default (Photography) layer mounted', () => {
    expect(hero).toContain('new Set([DEFAULT_HERO_SERVICE])')
    expect(data).toContain("DEFAULT_HERO_SERVICE: HeroServiceId = 'photography'")
  })

  it('warms the other services only after load, when the page is idle', () => {
    expect(hero).toContain("addEventListener('load'")
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
  const source = read('About.tsx')

  it('still imports the same video asset, unchanged', () => {
    expect(source).toContain("from './assets/Brand2.mp4'")
  })

  it('uses LazyBackgroundVideo, not a raw <video> element', () => {
    expect(source).toContain('LazyBackgroundVideo')
    expect(source).not.toMatch(/<video/)
  })

  it('does not mark the About video as priority (well below the fold)', () => {
    const block = source.slice(source.indexOf('LazyBackgroundVideo'), source.indexOf('LazyBackgroundVideo') + 300)
    expect(block).not.toContain('priority')
  })

  it('reserves layout space via a fixed-dimension container', () => {
    expect(source).toContain('h-[365px]')
    expect(source).toContain('w-[572px]')
  })
})

describe('Industries.tsx — Real Estate case study film', () => {
  const source = read('Industries.tsx')

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

describe('Videography.tsx — YouTube-driven pinned section', () => {
  const source = read('Videography.tsx')

  it('uses no <img> as storytelling media', () => {
    expect(source).not.toMatch(/<img/)
  })

  it('wires the four films by clean video ID, never share (?si=) links', () => {
    for (const id of ['PJWHAiDARMQ', '5EpyN_6dqyk', 'weeI1G46q0o', '_r-nPqWGG6c']) {
      expect(source).toContain(`videoId: '${id}'`)
    }
    expect(source).not.toMatch(/[?&]si=[A-Za-z0-9_-]/)
  })

  it('builds one embed URL: autoplay, muted, looping via playlist, no controls or related videos', () => {
    expect(source.match(/<iframe/g)).toHaveLength(1)
    for (const param of ['autoplay=1', 'mute=1', 'loop=1', '&playlist=${videoId}', 'controls=0', 'rel=0', 'playsinline=1']) {
      expect(source).toContain(param)
    }
  })

  it('keeps the embeds non-interactive', () => {
    const iframe = source.slice(source.indexOf('<iframe'), source.indexOf('/>', source.indexOf('<iframe')))
    expect(iframe).toContain("pointerEvents: 'none'")
    expect(iframe).toContain('tabIndex={-1}')
  })

  it('the direct-video fallback is muted, looping, inline and has no native controls', () => {
    const video = source.slice(source.indexOf('<video'), source.indexOf('/>', source.indexOf('<video')))
    for (const attr of ['autoPlay', 'muted', 'loop', 'playsInline']) expect(video).toContain(attr)
    expect(video).not.toContain('controls')
  })

  it('mounts reel players only while their card is in view', () => {
    expect(source).toContain('new IntersectionObserver')
  })
})

describe('production video assets are untouched', () => {
  it('all three source files still exist at their original paths and sizes are unchanged from the Phase 10 audit', () => {
    const assetsDir = path.join(srcDir, 'assets')
    const sizes = {
      'ForWebsite.mp4': statSync(path.join(assetsDir, 'ForWebsite.mp4')).size,
      'Brand1.mp4': statSync(path.join(assetsDir, 'Brand1.mp4')).size,
      'Brand2.mp4': statSync(path.join(assetsDir, 'Brand2.mp4')).size,
    }
    // Exact byte sizes recorded during the Phase 10/11 audit — any
    // change here means a source video was modified, which Phase 11
    // explicitly must not do (Part 11/20).
    expect(sizes['ForWebsite.mp4']).toBe(1821344)
    expect(sizes['Brand1.mp4']).toBe(12924373)
    expect(sizes['Brand2.mp4']).toBe(28123477)
  })
})
