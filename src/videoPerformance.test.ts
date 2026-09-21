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

describe('Hero.tsx — video sources and loading strategy', () => {
  const source = read('Hero.tsx')

  it('still imports the same two video assets, unchanged', () => {
    expect(source).toContain("from './assets/Brand1.mp4'")
    expect(source).toContain("from './assets/ForWebsite.mp4'")
  })

  it('uses LazyBackgroundVideo, not a raw <video> element, for both', () => {
    expect(source).toContain('LazyBackgroundVideo')
    expect(source).not.toMatch(/<video/)
  })

  it('marks only the first (ForWebsite) video as priority — Brand1 is deferred', () => {
    const titleBlock = source.slice(source.indexOf('titleVideo'), source.indexOf('brandVideo', source.indexOf('titleVideo') + 1))
    expect(titleBlock).toMatch(/src=\{titleVideo\}[\s\S]*priority/)

    const brandBlock = source.slice(source.indexOf('src={brandVideo}'))
    expect(brandBlock.slice(0, 200)).not.toContain('priority')
  })

  it('reserves layout space for both videos via a fixed-dimension container', () => {
    expect(source).toContain('h-[420px]')
    expect(source).toContain('h-[806px]')
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
