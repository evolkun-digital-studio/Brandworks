import { describe, expect, it } from 'vitest'
import { frames } from './photographyArchive'
import { PHOTOGRAPHY_FRAME_SLOTS } from './photographyFrameSlots'
import { withManagedFrames } from '../components/SiteMedia/convert'
import type { PublicSiteImage } from '../config/siteMediaSections'

describe('Photography page slots', () => {
  it('offers exactly one Media Manager slot per archive frame', () => {
    expect(PHOTOGRAPHY_FRAME_SLOTS.map((slot) => slot.key).sort()).toEqual(Object.keys(frames).sort())
  })
})

describe('withManagedFrames', () => {
  const upload: PublicSiteImage = {
    id: 'a', alt: 'New cowboy photo', width: 1200, height: 1600, blurDataURL: '', dominantColor: null, focalX: 0.25, focalY: 0.75,
    variants: [{ width: 640, url: '/m-640.webp' }, { width: 1024, url: '/m-1024.webp' }, { width: 1200, url: '/m-1200.webp' }],
  }

  it('swaps in an upload by frame key and keeps every other frame', () => {
    const merged = withManagedFrames(frames, { cowboy: [upload] })
    expect(merged.cowboy).toMatchObject({
      label: frames.cowboy.label, alt: 'New cowboy photo', width: 1200, height: 1600,
      src: '/m-1200.webp', thumb: '/m-640.webp', focus: '25% 75%',
    })
    expect(merged.cowboy.srcSet).toBe('/m-640.webp 640w, /m-1024.webp 1024w, /m-1200.webp 1200w')
    expect(merged.motion).toBe(frames.motion)
  })

  it('returns the built-in archive when nothing was uploaded', () => {
    expect(withManagedFrames(frames, undefined)).toBe(frames)
    expect(withManagedFrames(frames, {})).toEqual(frames)
  })
})
