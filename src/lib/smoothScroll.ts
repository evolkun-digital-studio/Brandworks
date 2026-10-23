import type Lenis from 'lenis'

let activeLenis: Lenis | null = null

/** Set by SmoothScroll while Lenis is running; null under reduced motion or on /admin. */
export function setSmoothScroll(lenis: Lenis | null) {
  activeLenis = lenis
}

/** The running Lenis instance, so overlays can stop() and start() page scrolling. */
export function getSmoothScroll(): Lenis | null {
  return activeLenis
}
