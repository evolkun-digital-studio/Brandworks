import { useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { graphicsMotionMedia } from '../../data/graphicsMotionMedia'

gsap.registerPlugin(ScrollTrigger)

/**
 * GRAPHICS / MOTION / DIGITAL CRAFT SECTION
 *
 * New concept: "FROM FRAME TO SYSTEM"
 *
 * The user experiences one creative idea transforming:
 * Static Graphic → Deconstructed Elements → Motion Video →
 * Motion Workspace → Digital Output → Creative System → Final Statement
 *
 * Visual continuity connects each stage.
 * Asymmetric editorial layout throughout.
 * One master GSAP timeline with ScrollTrigger.
 */

function GraphicsMotionExperience() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const frame1Ref = useRef<HTMLDivElement>(null)
  const frame2Ref = useRef<HTMLDivElement>(null)
  const motionRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLDivElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!sectionRef.current || !canvasRef.current) return

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          pin: true,
          pinSpacing: true,
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      }) as any

      // ===== OPENING: Title enters and holds
      tl.fromTo(
        titleRef.current,
        { autoAlpha: 0, yPercent: 20, scale: 0.95 },
        { autoAlpha: 1, yPercent: 0, scale: 1, duration: 1.8, ease: 'power2.out' },
        0
      )

      // ===== STAGE 1: Static Graphic appears with asymmetric positioning
      tl.fromTo(
        frame1Ref.current,
        { autoAlpha: 0, scale: 0.92, xPercent: 8 },
        { autoAlpha: 1, scale: 1, xPercent: 0, duration: 2, ease: 'power3.inOut', force3D: true },
        0.6
      )

      // ===== STAGE 2: Title fades, frame1 begins to scale down, frame2 enters
      tl.to(
        titleRef.current,
        { autoAlpha: 0, yPercent: -15, scale: 0.92, duration: 1.2, ease: 'power2.inOut' },
        2.2
      )

      // Frame 1 shrinks and moves
      tl.to(
        frame1Ref.current,
        { scale: 0.7, xPercent: -15, yPercent: 8, autoAlpha: 0.6, duration: 2, ease: 'power2.inOut', force3D: true },
        2.2,
        '<0.3'
      )

      // Frame 2 enters (deconstructed elements)
      tl.fromTo(
        frame2Ref.current,
        { autoAlpha: 0, scale: 0.88, yPercent: 12 },
        { autoAlpha: 1, scale: 1, yPercent: 0, duration: 2, ease: 'power3.inOut', force3D: true },
        2.8
      )

      // ===== STAGE 3: Motion enters, previous elements move to edges
      tl.to(
        frame2Ref.current,
        { scale: 0.55, xPercent: 18, yPercent: -10, autoAlpha: 0.4, duration: 2, ease: 'power2.inOut', force3D: true },
        4.8
      )

      tl.to(
        frame1Ref.current,
        { scale: 0.48, xPercent: -20, yPercent: 12, autoAlpha: 0.25, duration: 2, ease: 'power2.inOut', force3D: true },
        4.8,
        '<0'
      )

      tl.fromTo(
        motionRef.current,
        { autoAlpha: 0, scale: 0.9, yPercent: 15 },
        { autoAlpha: 1, scale: 1, yPercent: 0, duration: 2.2, ease: 'power3.inOut', force3D: true },
        5.2
      )

      // ===== STAGE 4: Motion workspace (technical annotations appear)
      tl.fromTo(
        workspaceRef.current,
        { autoAlpha: 0, yPercent: 20 },
        { autoAlpha: 1, yPercent: 0, duration: 1.4, ease: 'power2.out' },
        6.8
      )

      // ===== STAGE 5: Code/Digital appears, motion moves to side
      tl.to(
        motionRef.current,
        { scale: 0.65, xPercent: -12, yPercent: 8, autoAlpha: 0.5, duration: 2, ease: 'power2.inOut', force3D: true },
        8.2
      )

      tl.to(
        workspaceRef.current,
        { autoAlpha: 0, yPercent: -10, duration: 1, ease: 'power2.in' },
        8.2,
        '<0'
      )

      tl.fromTo(
        codeRef.current,
        { autoAlpha: 0, scale: 0.88, xPercent: 20 },
        { autoAlpha: 1, scale: 1, xPercent: 0, duration: 1.8, ease: 'power3.inOut', force3D: true },
        8.8
      )

      // ===== STAGE 6: Creative System assembles everything
      tl.to(
        [frame1Ref.current, frame2Ref.current, motionRef.current],
        { scale: 0.42, xPercent: -8, yPercent: 10, autoAlpha: 0.3, duration: 2, ease: 'power2.inOut', force3D: true },
        10.4
      )

      tl.to(
        codeRef.current,
        { scale: 0.52, xPercent: 14, yPercent: -8, autoAlpha: 0.35, duration: 2, ease: 'power2.inOut', force3D: true },
        10.4,
        '<0'
      )

      tl.fromTo(
        systemRef.current,
        { autoAlpha: 0, scale: 0.92, yPercent: 12 },
        { autoAlpha: 1, scale: 1, yPercent: 0, duration: 2, ease: 'power3.inOut', force3D: true },
        11
      )

      // ===== STAGE 7: Final Statement, system fades to background
      tl.to(
        systemRef.current,
        { scale: 0.8, autoAlpha: 0.25, duration: 1.5, ease: 'power2.inOut', force3D: true },
        13.2
      )

      tl.fromTo(
        finalRef.current,
        { autoAlpha: 0, scale: 0.95, yPercent: 15 },
        { autoAlpha: 1, scale: 1, yPercent: 0, duration: 1.8, ease: 'power3.inOut' },
        13.5
      )

      return () => {
        if (tl.scrollTrigger) {
          tl.scrollTrigger.kill()
        }
        tl.kill()
      }
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-white"
      aria-label="Graphics, motion, and digital craft section"
    >
      <div
        ref={canvasRef}
        className="relative h-screen w-full overflow-hidden bg-white"
      >
        {/* ===== OPENING: Title and Label */}
        <div
          ref={titleRef}
          className="pointer-events-none absolute inset-0 z-[70] flex flex-col items-center justify-center opacity-0"
        >
          <div className="max-w-[1200px] px-6 text-center">
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Graphics / Motion / Digital
            </p>
            <h2
              className="text-[clamp(56px,9vw,110px)] font-bold leading-[0.86] tracking-[-0.055em] text-[#111]"
              style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
            >
              From Frame<br />to System.
            </h2>
            <p className="mt-6 text-[14px] leading-[1.6] text-neutral-600 max-w-[520px] mx-auto">
              One idea. Designed, animated and built across every screen.
            </p>
          </div>
        </div>

        {/* ===== STAGE 1: Static Graphic Design */}
        <div
          ref={frame1Ref}
          className="absolute top-[50%] left-[8%] translate-y-[-50%] w-[50vw] max-w-[700px] h-auto opacity-0 will-change-transform"
          style={{ perspective: '1200px', backfaceVisibility: 'hidden' }}
        >
          <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-neutral-100 shadow-lg">
            <img
              src={graphicsMotionMedia.staticGraphic.url}
              alt={graphicsMotionMedia.staticGraphic.alt}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            Static Design
          </p>
        </div>

        {/* ===== STAGE 2: Deconstructed Elements */}
        <div
          ref={frame2Ref}
          className="absolute top-[40%] right-[10%] translate-y-[-50%] w-[55vw] max-w-[750px] opacity-0 will-change-transform"
          style={{ perspective: '1200px', backfaceVisibility: 'hidden' }}
        >
          <div className="grid gap-4 grid-cols-[1.4fr_1fr]">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100 shadow-md">
              <img
                src={graphicsMotionMedia.graphicElements.detail}
                alt="Graphic detail"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100 shadow-md">
              <img
                src={graphicsMotionMedia.graphicElements.texture}
                alt="Texture element"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            Deconstructed
          </p>
        </div>

        {/* ===== STAGE 3: Motion / Video */}
        <div
          ref={motionRef}
          className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[60vw] max-w-[850px] opacity-0 will-change-transform"
          style={{ perspective: '1200px', backfaceVisibility: 'hidden' }}
        >
          <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-black shadow-lg">
            <video
              src={graphicsMotionMedia.motionVideo.url}
              poster={graphicsMotionMedia.motionVideo.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            Motion Design
          </p>
        </div>

        {/* ===== STAGE 4: Motion Workspace (Annotations) */}
        <div
          ref={workspaceRef}
          className="absolute bottom-[15%] left-[12%] opacity-0 pointer-events-none"
        >
          <div className="space-y-2 text-[10px] font-mono text-neutral-500">
            <div className="flex gap-4">
              <span>00:00:01:12</span>
              <span>FRAME 036</span>
            </div>
            <div className="text-[9px] tracking-[0.1em] uppercase">
              MOTION STUDY
            </div>
          </div>
        </div>

        {/* ===== STAGE 5: Code / Digital Output */}
        <div
          ref={codeRef}
          className="absolute top-[45%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[65vw] max-w-[900px] opacity-0 will-change-transform"
          style={{ perspective: '1200px', backfaceVisibility: 'hidden' }}
        >
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Visual Output */}
            <div>
              <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-neutral-100 shadow-lg mb-3">
                <img
                  src={graphicsMotionMedia.digitalOutput.visual}
                  alt="Digital output"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Visual Output
              </p>
            </div>

            {/* Code Snippet */}
            <div>
              <div className="relative bg-neutral-900 rounded-lg p-4 shadow-lg mb-3 overflow-hidden max-h-[240px]">
                <pre className="text-[9px] font-mono text-neutral-300 leading-[1.6] whitespace-pre-wrap break-words">
                  {graphicsMotionMedia.digitalOutput.code}
                </pre>
              </div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Technical
              </p>
            </div>
          </div>
        </div>

        {/* ===== STAGE 6: Creative System (All Elements Combined) */}
        <div
          ref={systemRef}
          className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[70vw] max-w-[1000px] opacity-0 will-change-transform"
          style={{ perspective: '1200px', backfaceVisibility: 'hidden' }}
        >
          <div className="relative w-full bg-neutral-50 rounded-lg overflow-hidden shadow-xl"
            style={{ aspectRatio: '16/10' }}
          >
            {/* Dominant piece - top left, largest */}
            <div className="absolute top-0 left-0 w-[55%] h-[65%] overflow-hidden">
              <img
                src={graphicsMotionMedia.creativeSystem.dominant}
                alt="Dominant creative work"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Supporting 1 - top right */}
            <div className="absolute top-0 right-0 w-[45%] h-[65%] overflow-hidden border-l border-neutral-200">
              <img
                src={graphicsMotionMedia.creativeSystem.supporting1}
                alt="Supporting work 1"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Supporting 2 - bottom left */}
            <div className="absolute bottom-0 left-0 w-[35%] h-[35%] overflow-hidden border-t border-neutral-200">
              <img
                src={graphicsMotionMedia.creativeSystem.supporting2}
                alt="Supporting work 2"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Detail - bottom right */}
            <div className="absolute bottom-0 right-0 w-[65%] h-[35%] overflow-hidden border-t border-neutral-200 flex items-center justify-center bg-neutral-900 p-4">
              <img
                src={graphicsMotionMedia.creativeSystem.detail}
                alt="Detail"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Typography overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-8">
                <p className="text-[clamp(40px,6vw,72px)] font-bold leading-[0.9] tracking-[-0.055em] text-white drop-shadow-xl"
                  style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
                >
                  Integrated<br />System
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== STAGE 7: Final Statement */}
        <div
          ref={finalRef}
          className="pointer-events-none absolute inset-0 z-[75] flex flex-col items-center justify-center opacity-0"
        >
          <div className="max-w-[1100px] px-6 text-center">
            <h2
              className="text-[clamp(64px,10vw,130px)] font-bold leading-[0.86] tracking-[-0.055em] text-[#111]"
              style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
            >
              Design.<br />Motion.<br />Code.
            </h2>
            <p className="mt-8 text-[18px] leading-[1.7] text-neutral-600 font-light">
              One creative system.
            </p>
            <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.16em] text-neutral-400">
              Everything interconnected
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GraphicsMotionExperience
