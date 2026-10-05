import { mediaUrl } from "../lib/media";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

type Slide = {
  id: string;
  image: string;
  /** Timeline position where the previous text starts leaving and this
   *  slide's image starts crossfading in. The text exits below read the
   *  same value, so the two can't drift apart. */
  at: number;
};

// Placeholder photography — replace `image` with BrandWorks work.
// One full-banner backdrop per text step, in order.
const SLIDES: Slide[] = [
  {
    id: "intro",
    image: mediaUrl("brand.jpg"),
    at: 0,
  },
  {
    id: "see",
    image: mediaUrl("eye.png"),
    at: 1.55,
  },
  {
    id: "hear",
    image: mediaUrl("hear (2).jpg"),
    at: 3,
  },
  {
    id: "understand",
    image: mediaUrl("understand_2.jpg"),
    at: 4.55,
  },
];

const [, SEE_AT, HEAR_AT, UNDERSTAND_AT] = SLIDES.map((slide) => slide.at);

// The closing text step has no backdrop of its own; the last picture stays.
const FINAL_AT = 6.35;

// Crossfade length in timeline units, the same scale as the text tweens.
const BG_FADE = 1;

export default function BrandStatementPrecision() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const eyebrow = ".bw2-eyebrow";
        const introTop = ".bw2-intro-top";
        const introBottom = ".bw2-intro-bottom";

        const wordSee = ".bw2-see";
        const wordHear = ".bw2-hear";
        const wordUnderstand = ".bw2-understand";

        const wordSeeWrap = ".bw2-see-wrap";
        const wordHearWrap = ".bw2-hear-wrap";
        const wordUnderstandWrap = ".bw2-understand-wrap";

        const counter = ".bw2-counter";
        const finalStatement = ".bw2-final";
        const finalLine = ".bw2-final-line";

        gsap.set(eyebrow, {
          opacity: 0,
          y: 15,
        });

        gsap.set([introTop, introBottom], {
          yPercent: 110,
          opacity: 0,
        });

        gsap.set([wordSeeWrap, wordHearWrap, wordUnderstandWrap], {
          clipPath: "inset(0 0 100% 0)",
        });

        gsap.set([wordSee, wordHear, wordUnderstand], {
          yPercent: 110,
          scale: 1.12,
        });

        gsap.set([wordHearWrap, wordUnderstandWrap], {
          autoAlpha: 0,
        });

        gsap.set(counter, {
          opacity: 0,
        });

        gsap.set(finalStatement, {
          autoAlpha: 0,
        });

        gsap.set(finalLine, {
          yPercent: 110,
          opacity: 0,
        });

        const bgLayers = gsap.utils.toArray<HTMLElement>(
          ".bw2-bg-layer",
          sectionRef.current,
        );

        gsap.set(bgLayers.slice(1), {
          opacity: 0,
          scale: 1.04,
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=380%",
            pin: stageRef.current,
            scrub: 1.15,
            anticipatePin: 1,
          },
        });

        // -------------------------------------------------
        // 01 — INTRO
        // -------------------------------------------------

        tl.to(
          eyebrow,
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
          },
          0,
        );

        tl.to(
          introTop,
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: "power4.out",
          },
          0.15,
        );

        tl.to(
          introBottom,
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            ease: "power4.out",
          },
          0.28,
        );

        tl.to(
          counter,
          {
            opacity: 1,
            duration: 0.45,
          },
          0.5,
        );

        // intro leaves
        tl.to(
          [introTop, introBottom],
          {
            yPercent: -105,
            opacity: 0,
            duration: 0.8,
            ease: "power3.inOut",
          },
          SEE_AT,
        );

        // -------------------------------------------------
        // 02 — SEE
        // -------------------------------------------------

        tl.to(
          wordSeeWrap,
          {
            clipPath: "inset(0 0 0% 0)",
            duration: 0.75,
            ease: "power4.inOut",
          },
          1.8,
        );

        tl.to(
          wordSee,
          {
            yPercent: 0,
            scale: 1,
            duration: 0.95,
            ease: "expo.out",
          },
          1.8,
        );

        tl.to(
          ".bw2-counter-current",
          {
            textContent: "01",
            snap: { textContent: 1 },
            duration: 0.1,
          },
          1.8,
        );

        tl.to(
          wordSee,
          {
            letterSpacing: "-0.055em",
            duration: 0.8,
            ease: "power2.out",
          },
          2.1,
        );

        // SEE exits
        tl.to(
          wordSee,
          {
            yPercent: -112,
            scale: 0.94,
            duration: 0.75,
            ease: "power4.in",
          },
          HEAR_AT,
        );

        tl.to(
          wordSeeWrap,
          {
            clipPath: "inset(100% 0 0 0)",
            duration: 0.65,
            ease: "power4.inOut",
          },
          HEAR_AT,
        );

        // -------------------------------------------------
        // 03 — HEAR
        // -------------------------------------------------

        tl.set(
          wordHearWrap,
          {
            autoAlpha: 1,
            clipPath: "inset(100% 0 0 0)",
          },
          3.35,
        );

        tl.set(
          wordHear,
          {
            yPercent: -115,
            scale: 1.12,
          },
          3.35,
        );

        tl.to(
          wordHearWrap,
          {
            clipPath: "inset(0% 0 0 0)",
            duration: 0.8,
            ease: "power4.inOut",
          },
          3.35,
        );

        tl.to(
          wordHear,
          {
            yPercent: 0,
            scale: 1,
            duration: 0.95,
            ease: "expo.out",
          },
          3.35,
        );

        tl.to(
          ".bw2-counter-current",
          {
            textContent: "02",
            snap: { textContent: 1 },
            duration: 0.1,
          },
          3.35,
        );

        tl.to(
          wordHear,
          {
            yPercent: 112,
            scale: 0.94,
            duration: 0.75,
            ease: "power4.in",
          },
          UNDERSTAND_AT,
        );

        tl.to(
          wordHearWrap,
          {
            clipPath: "inset(0 0 100% 0)",
            duration: 0.7,
            ease: "power4.inOut",
          },
          UNDERSTAND_AT,
        );

        // -------------------------------------------------
        // 04 — UNDERSTAND
        // -------------------------------------------------

        tl.set(
          wordUnderstandWrap,
          {
            autoAlpha: 1,
            clipPath: "inset(0 50% 0 50%)",
          },
          4.9,
        );

        tl.set(
          wordUnderstand,
          {
            yPercent: 0,
            scale: 1.14,
            letterSpacing: "0.035em",
          },
          4.9,
        );

        tl.to(
          wordUnderstandWrap,
          {
            clipPath: "inset(0 0% 0 0%)",
            duration: 1,
            ease: "power4.inOut",
          },
          4.9,
        );

        tl.to(
          wordUnderstand,
          {
            scale: 1,
            letterSpacing: "-0.06em",
            duration: 1.3,
            ease: "expo.out",
          },
          5,
        );

        tl.to(
          ".bw2-counter-current",
          {
            textContent: "03",
            snap: { textContent: 1 },
            duration: 0.1,
          },
          4.9,
        );

        // -------------------------------------------------
        // 05 — RESET + FINAL SENTENCE
        // -------------------------------------------------

        tl.to(
          wordUnderstand,
          {
            scale: 1.06,
            opacity: 0,
            duration: 0.75,
            ease: "power3.inOut",
          },
          FINAL_AT,
        );

        tl.to(
          [eyebrow, counter],
          {
            opacity: 0,
            duration: 0.45,
          },
          6.4,
        );

        tl.set(
          finalStatement,
          {
            autoAlpha: 1,
          },
          6.7,
        );

        tl.to(
          finalLine,
          {
            yPercent: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 1,
            ease: "power4.out",
          },
          6.72,
        );

        tl.fromTo(
          ".bw2-final-rule",
          {
            scaleX: 0,
          },
          {
            scaleX: 1,
            duration: 0.9,
            transformOrigin: "center center",
            ease: "power4.inOut",
          },
          7.1,
        );

        tl.fromTo(
          ".bw2-final-meta",
          {
            opacity: 0,
            y: 10,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power3.out",
          },
          7.35,
        );

        // -------------------------------------------------
        // BACKDROPS — one per text step, on the same timeline
        // -------------------------------------------------

        // Added last so the text alone decides how long the timeline is.
        const total = tl.duration();

        bgLayers.forEach((layer, index) => {
          const start = SLIDES[index].at;
          const next = SLIDES[index + 1];
          const leaves = next ? next.at + BG_FADE : total;

          // slow push-in for as long as this picture is on screen
          tl.to(
            layer.querySelector("img"),
            {
              scale: 1.03,
              duration: leaves - start,
              ease: "none",
            },
            start,
          );

          if (index === 0) return;

          // Fades in over the previous picture, which stays opaque
          // underneath until this one covers it — no dip to the background.
          tl.to(
            layer,
            {
              opacity: 1,
              scale: 1,
              duration: BG_FADE,
              ease: "power3.inOut",
            },
            start,
          );

          tl.set(
            bgLayers[index - 1],
            {
              opacity: 0,
            },
            start + BG_FADE,
          );
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [
            ".bw2-eyebrow",
            ".bw2-intro-top",
            ".bw2-intro-bottom",
            ".bw2-final-line",
            ".bw2-final-meta",
          ],
          {
            opacity: 1,
            y: 0,
            yPercent: 0,
          },
        );
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <>
      <style>{`
        .bw2-section {
          position: relative;
          width: 100%;
          background: #111;
          color: #fff;
          font-family: var(--font-primary);
        }

        .bw2-stage {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100svh;
          overflow: hidden;
          background: #111;
        }

        /* ---------------------------------------
           BACKDROPS
        --------------------------------------- */

        .bw2-bg,
        .bw2-bg-layer,
        .bw2-bg-overlay {
          position: absolute;
          inset: 0;
        }

        .bw2-bg {
          overflow: hidden;
          pointer-events: none;
        }

        /* Without the timeline (reduced motion) only the first picture shows. */
        .bw2-bg-layer {
          opacity: 0;
          will-change: opacity, transform;
        }

        .bw2-bg-layer:first-child {
          opacity: 1;
        }

        .bw2-bg-layer img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          will-change: transform;
        }

        .bw2-bg-overlay {
          background: rgba(0, 0, 0, 0.25);
        }

        .bw2-shell {
          position: relative;
          z-index: 1;
          width: min(calc(100% - 56px), 1600px);
          height: 100%;
          margin: 0 auto;
        }

        /* ---------------------------------------
           TOP
        --------------------------------------- */

        .bw2-topbar {
          position: absolute;
          z-index: 10;
          top: 34px;
          left: 0;
          right: 0;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bw2-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;

          font-size: 10px;
          line-height: 1;
          font-weight: 500;

          letter-spacing: 0.14em;
          text-transform: uppercase;

          color: rgba(255, 255, 255, 0.8);
        }

        .bw2-eyebrow-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #fff;
        }

        .bw2-counter {
          display: flex;
          align-items: baseline;
          gap: 4px;

          font-size: 10px;
          line-height: 1;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.7);
        }

        .bw2-counter-current {
          color: #fff;
        }

        /* ---------------------------------------
           INTRO
        --------------------------------------- */

        .bw2-intro {
          position: absolute;
          inset: 0;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          pointer-events: none;
        }

        .bw2-intro-mask {
          position: relative;
          overflow: hidden;

          padding: 0.12em 0 0.18em;
        }

        /* One size shared by the intro lines and SEE / HEAR / UNDERSTAND,
           sized so UNDERSTAND still fits on one line. */
        .bw2-section {
          --bw2-type: clamp(3.5rem, 6vw, 6rem);
        }

        .bw2-intro-top,
        .bw2-intro-bottom {
          font-size: var(--bw2-type);
          line-height: 0.86;
          margin-bottom: 15px;
          font-weight: 400;
          will-change: transform, opacity;
        }

        .bw2-intro-bottom {
          color: #fff
        }
        /* ---------------------------------------
           MAIN WORDS
        --------------------------------------- */

        .bw2-word-stage {
          position: absolute;
          inset: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          pointer-events: none;
        }

        .bw2-word-wrap {
          position: absolute;

          width: 100%;

          overflow: hidden;
          padding: 0.16em 0 0.22em;
          text-align: center;

          will-change: clip-path;
        }

        .bw2-word {
          display: inline-block;

          font-size: var(--bw2-type);
          line-height: 0.72;

          font-weight: 500;
          letter-spacing: -0.04em;

          white-space: nowrap;

          will-change:
            transform,
            opacity,
            letter-spacing;
        }

        /* ---------------------------------------
           PROGRESS
        --------------------------------------- */

        .bw2-progress {
          position: absolute;

          left: 0;
          right: 0;
          bottom: 42px;

          display: flex;
          align-items: center;
          gap: 18px;
        }

        .bw2-progress-caption {
          flex: 0 0 auto;

          font-size: 9px;
          line-height: 1;

          letter-spacing: 0.13em;
          text-transform: uppercase;

          color: rgba(255, 255, 255, 0.7);
        }

        /* ---------------------------------------
           FINAL
        --------------------------------------- */

        .bw2-final {
          position: absolute;
          z-index: 5;
          inset: 0;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding: 70px 0;

          text-align: center;

          visibility: hidden;
        }

        .bw2-final-copy {
          width: min(100%, 1350px);
        }

        .bw2-final-mask {
          overflow: hidden;
          padding-bottom: 0.22em;
        }

        .bw2-final-line {
          font-size: clamp(3.4rem, 7.1vw, 8.8rem);
          line-height: 0.88;

          font-weight: 400;
          letter-spacing: 0.10em

          will-change: transform, opacity;
        }

        .bw2-final-line--strong {
          font-weight: 550;
        }

        .bw2-final-rule {
          width: min(150px, 30vw);
          height: 1px;

          margin: 48px auto 20px;

          background: rgba(255, 255, 255, 0.7);
        }

        .bw2-final-meta {
          font-size: 9px;
          line-height: 1.4;

          font-weight: 500;
          letter-spacing: 0.15em;

          text-transform: uppercase;

          color: rgba(255, 255, 255, 0.7);
        }

        /* ---------------------------------------
           MOBILE
        --------------------------------------- */

        @media (max-width: 900px) {
          .bw2-shell {
            width: calc(100% - 36px);
          }

          .bw2-section {
            --bw2-type: clamp(2.75rem, 8.5vw, 5rem);
          }

          .bw2-final-line {
            font-size: clamp(3rem, 9.5vw, 6rem);
          }
        }

        @media (max-width: 600px) {
          .bw2-shell {
            width: calc(100% - 28px);
          }

          .bw2-topbar {
            top: 24px;
          }

          .bw2-section {
            --bw2-type: clamp(2.2rem, 10.5vw, 3.75rem);
          }

          .bw2-intro-top,
          .bw2-intro-bottom {
            line-height: 0.92;
          }

          .bw2-final-line {
            font-size: clamp(2.6rem, 11vw, 4.3rem);
            line-height: 0.92;
          }

          .bw2-progress {
            bottom: 28px;
          }

          .bw2-progress-caption {
            font-size: 7px;
          }

          .bw2-final-rule {
            margin-top: 32px;
          }
        }
      `}</style>

      <section ref={sectionRef} className="bw2-section">
        <div ref={stageRef} className="bw2-stage">
          {/* Full-banner backdrops */}
          <div className="bw2-bg" aria-hidden="true">
            {SLIDES.map((slide) => (
              <div key={slide.id} className="bw2-bg-layer">
                <img
                  src={slide.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </div>
            ))}

            <div className="bw2-bg-overlay" />
          </div>

          <div className="bw2-shell">
           
            <div className="bw2-counter">
               
            </div>
            {/* Intro */}
            <div className="bw2-intro">
              <div className="bw2-intro-mask">
                <div className="bw2-intro-top">A brand is built through</div>
              </div>

              <div className="bw2-intro-mask">
                <div className="bw2-intro-bottom">what people repeatedly</div>
              </div>
            </div>
            {/* Main kinetic words */}
            <div className="bw2-word-stage">
              <div className="bw2-word-wrap bw2-see-wrap">
                <div className="bw2-word bw2-see">SEE</div>
              </div>

              <div className="bw2-word-wrap bw2-hear-wrap">
                <div className="bw2-word bw2-hear">HEAR</div>
              </div>

              <div className="bw2-word-wrap bw2-understand-wrap">
                <div className="bw2-word bw2-understand">UNDERSTAND</div>
              </div>
            </div>
            {/* Bottom progression */}
            <div className="bw2-progress">
              {/* <span className="bw2-progress-caption">Scroll to reveal</span> */}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
