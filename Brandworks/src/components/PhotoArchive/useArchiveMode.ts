import { useSyncExternalStore } from 'react'

export type ArchiveMode = 'desktop' | 'tablet' | 'off'

const SPATIAL = '(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
const DESKTOP = '(min-width: 1024px)'

let webgl: boolean | undefined
function supportsWebGL() {
  if (webgl === undefined) {
    try {
      const canvas = document.createElement('canvas')
      webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      webgl = false
    }
  }
  return webgl
}

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const queries = [window.matchMedia(SPATIAL), window.matchMedia(DESKTOP)]
  queries.forEach((query) => query.addEventListener('change', onChange))
  return () => queries.forEach((query) => query.removeEventListener('change', onChange))
}

function getSnapshot(): ArchiveMode {
  if (typeof window.matchMedia !== 'function' || !window.matchMedia(SPATIAL).matches || !supportsWebGL()) return 'off'
  return window.matchMedia(DESKTOP).matches ? 'desktop' : 'tablet'
}

/**
 * Which archive to render: the WebGL field on mouse-driven screens from
 * tablet width up, otherwise the plain DOM wall (phones, touch, reduced motion).
 */
export function useArchiveMode() {
  return useSyncExternalStore(subscribe, getSnapshot, (): ArchiveMode => 'off')
}
