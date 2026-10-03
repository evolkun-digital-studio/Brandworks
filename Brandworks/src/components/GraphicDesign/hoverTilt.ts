import gsap from 'gsap'
import { matches } from '../../lib/scrollMotion'

/**
 * Pointer-responsive hover for every `[data-tilt]` frame under `root`:
 * the frame tilts and drifts a little towards the cursor, while its
 * `[data-tilt-inner]` image scales up and travels further, which gives
 * the parallax depth. All movement goes through gsap.quickTo, so there
 * are no React updates on pointermove. Mouse/trackpad only, and off for
 * reduced motion. Returns a cleanup.
 */
export function setupHoverTilt(root: HTMLElement): () => void {
  if (
    !matches('(hover: hover) and (pointer: fine)') ||
    matches('(prefers-reduced-motion: reduce)')
  ) {
    return () => {}
  }

  const cleanups = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]')).map(
    (frame) => {
      const inner = frame.querySelector<HTMLElement>('[data-tilt-inner]')
      const ease = { duration: 0.6, ease: 'power3.out' }

      gsap.set(frame, { transformPerspective: 900 })
      const rotateX = gsap.quickTo(frame, 'rotationX', ease)
      const rotateY = gsap.quickTo(frame, 'rotationY', ease)
      const frameX = gsap.quickTo(frame, 'x', ease)
      const frameY = gsap.quickTo(frame, 'y', ease)
      const imageX = inner && gsap.quickTo(inner, 'x', ease)
      const imageY = inner && gsap.quickTo(inner, 'y', ease)
      const imageScale = inner && gsap.quickTo(inner, 'scale', { duration: 0.8, ease: 'power3.out' })

      const move = (event: PointerEvent) => {
        const r = frame.getBoundingClientRect()
        if (!r.width || !r.height) return
        const nx = ((event.clientX - r.left) / r.width) * 2 - 1
        const ny = ((event.clientY - r.top) / r.height) * 2 - 1
        rotateY(nx * 1)
        rotateX(-ny * 1)
        frameX(nx * 3)
        frameY(ny * 3)
        imageX?.(nx * 6)
        imageY?.(ny * 6)
      }
      // 1.045 keeps a 6px move covered even on the shortest (≈300px) frames.
      const enter = () => imageScale?.(1.045)
      const leave = () => {
        rotateX(0)
        rotateY(0)
        frameX(0)
        frameY(0)
        imageX?.(0)
        imageY?.(0)
        imageScale?.(1)
      }

      frame.addEventListener('pointerenter', enter)
      frame.addEventListener('pointermove', move)
      frame.addEventListener('pointerleave', leave)

      return () => {
        frame.removeEventListener('pointerenter', enter)
        frame.removeEventListener('pointermove', move)
        frame.removeEventListener('pointerleave', leave)
        gsap.killTweensOf(inner ? [frame, inner] : frame)
        gsap.set(inner ? [frame, inner] : frame, { clearProps: 'transform' })
      }
    },
  )

  return () => cleanups.forEach((cleanup) => cleanup())
}
