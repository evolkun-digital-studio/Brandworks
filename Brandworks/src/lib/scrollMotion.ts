// Small helpers shared by the scroll-driven 3D sections (Work.tsx,
// Results.tsx): easing math, keyframe sampling and cached style writes.

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smoothstep = (t: number) => t * t * (3 - 2 * t)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 0→1 as p goes from a to b, smoothstepped. */
export const phase = (p: number, a: number, b: number) => smoothstep(clamp01((p - a) / (b - a)))

/** Keyframe table indexed by distance (in items) from the centre, smoothstepped between steps. */
export function sample(table: readonly number[], d: number) {
  const i = Math.floor(d)
  if (i >= table.length - 1) return table[table.length - 1]
  return lerp(table[i], table[i + 1], smoothstep(d - i))
}

/** Style write that skips unchanged values. */
export function write(el: HTMLElement, cache: Record<string, string>, key: string, prop: string, value: string) {
  if (cache[key] === value) return
  cache[key] = value
  el.style.setProperty(prop, value)
}

export function matches(query: string) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}
