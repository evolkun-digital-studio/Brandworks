import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/**
 * Site-wide inertial smooth scrolling for the public pages (mounted in
 * PublicLayout, so /admin/* keeps plain native scrolling). Lenis drives
 * the real window scroll position, so everything that reads
 * window.scrollY — Header's hide/show, About's word reveal, Motion's
 * useScroll in Capabilities — keeps working unchanged.
 *
 * Skipped entirely for `prefers-reduced-motion: reduce`, and torn down
 * if that setting is switched on while the page is open. Renders nothing.
 */
function SmoothScroll() {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | null = null

    const sync = () => {
      if (reduced.matches) {
        lenis?.destroy()
        lenis = null
      } else if (!lenis) {
        lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: true })
      }
    }

    sync()
    reduced.addEventListener('change', sync)
    return () => {
      reduced.removeEventListener('change', sync)
      lenis?.destroy()
    }
  }, [])

  return null
}

export default SmoothScroll
