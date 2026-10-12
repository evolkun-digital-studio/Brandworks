import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Site-wide inertial smooth scrolling for the public pages (mounted in
 * PublicLayout, so /admin/* keeps plain native scrolling). Lenis drives
 * the real window scroll position, so everything that reads
 * window.scrollY — Header's hide/show, About's word reveal, Motion's
 * useScroll in Capabilities — keeps working unchanged.
 *
 * Lenis is stepped from GSAP's ticker and pushes every scroll to
 * ScrollTrigger, so scrubbed animations update on the same frame as the
 * scroll itself (no 1-frame lag / jitter between the two loops).
 *
 * Skipped entirely for `prefers-reduced-motion: reduce`, and torn down
 * if that setting is switched on while the page is open. Renders nothing.
 */
function SmoothScroll() {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | null = null

    const raf = (time: number) => {
      lenis?.raf(time * 1000)
    }

    const sync = () => {
      if (reduced.matches) {
        lenis?.destroy()
        lenis = null
      } else if (!lenis) {
        lenis = new Lenis({ autoRaf: false, lerp: 0.1, anchors: true })
        lenis.on('scroll', ScrollTrigger.update)
      }
    }

    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    sync()
    reduced.addEventListener('change', sync)
    return () => {
      reduced.removeEventListener('change', sync)
      gsap.ticker.remove(raf)
      lenis?.destroy()
      lenis = null
    }
  }, [])

  return null
}

export default SmoothScroll
