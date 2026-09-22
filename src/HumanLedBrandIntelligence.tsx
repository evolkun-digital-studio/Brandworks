import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

const IMAGE =
  "https://res.cloudinary.com/dmzo1kt0d/image/upload/v1789995717/hero-architecture-DRSGJqBP.jpg";

export default function HumanLedBrandIntelligence() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const firstLineRef = useRef<HTMLSpanElement>(null);
  const secondLineRef = useRef<HTMLSpanElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  const reduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!sectionRef.current || reduceMotion) return;

      const ctx = gsap.context(() => {
        gsap.set(frameRef.current, {
          width: "32%",
        });

        gsap.set(imageRef.current, {
          scale: 1.08,
        });

        gsap.set(firstLineRef.current, {
          xPercent: 0,
        });

        gsap.set(secondLineRef.current, {
          xPercent: 3,
        });

        gsap.set(metaRef.current, {
          autoAlpha: 0,
          y: 18,
        });

        gsap.set(bodyRef.current, {
          autoAlpha: 0,
          y: 24,
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            end: "bottom 30%",
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });

        tl.to(
          metaRef.current,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.25,
          },
          0,
        );

        tl.to(
          firstLineRef.current,
          {
            xPercent: -1.5,
            duration: 1,
            ease: "none",
          },
          0,
        );

        tl.to(
          secondLineRef.current,
          {
            xPercent: 0,
            duration: 1,
            ease: "none",
          },
          0,
        );

        tl.to(
          frameRef.current,
          {
            width: "100%",
            duration: 0.9,
            ease: "power2.inOut",
          },
          0.08,
        );

        tl.to(
          imageRef.current,
          {
            scale: 1,
            duration: 1,
            ease: "power2.out",
          },
          0.08,
        );

        tl.to(
          bodyRef.current,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
          },
          0.58,
        );
      }, sectionRef);

      return () => ctx.revert();
    },
    {
      scope: sectionRef,
      dependencies: [reduceMotion],
    },
  );

  return (
    <section
      ref={sectionRef}
      id="brand-intelligence"
      aria-labelledby="brand-intelligence-title"
      className="relative overflow-hidden text-[#111]"
    >
      <div className="mx-auto max-w-[1800px] px-5 sm:px-7 md:px-10 lg:px-12">
        {/* TOP INTRO */}
        <div
          ref={metaRef}
          className="
            flex
            items-start
            justify-between
            gap-10
            border-b
            border-black/10
            pb-5
            pt-20

            md:pt-28
            lg:pt-32
          "
        >
          <p
            className="
              font-primary
              text-[10px]
              font-medium
              uppercase
              tracking-[0.22em]
              text-black/50
            "
          >
            Brand intelligence
          </p>
        </div>

        {/* EDITORIAL HEADLINE */}
        <div className="relative z-10 flex justify-center py-12 md:py-16 lg:py-20">
          <h2
            id="brand-intelligence-title"
            className="
      max-w-[1100px]
      text-center
      font-primary
      text-[clamp(2.6rem,5vw,3.2rem)]
      font-medium
      leading-[0.9]
      tracking-[-0.055em]
    "
          >
            <span className="block overflow-visible">
              <span ref={firstLineRef} className="block">
                Your brand isn't competing for attention.
              </span>
            </span>

            <span className="mt-[0.16em] block overflow-visible">
              <span
                ref={secondLineRef}
                className="
          block
          font-display
          font-normal
          text-black/48
        "
              >
                It's competing for understanding.
              </span>
            </span>
          </h2>
        </div>

        {/* MEDIA EXPANSION */}
        <div className="relative">
          <div
            ref={frameRef}
            className="
              ml-auto
              h-[52vh]
              min-h-[420px]
              overflow-hidden
              bg-[#D8D7D2]

              md:h-[65vh]
              lg:h-[72vh]
            "
          >
            <img
              ref={imageRef}
              src={IMAGE}
              alt="Architectural structure representing clarity, perception and brand presence"
              loading="lazy"
              decoding="async"
              className="
                h-full
                w-full
                object-cover
                grayscale
              "
            />
          </div>

          {/* OVERLAY INDEX */}
          <div
            aria-hidden="true"
            className="
              absolute
              bottom-4
              left-4
              font-primary
              text-[10px]
              uppercase
              tracking-[0.2em]
              text-white/70

              md:bottom-6
              md:left-6
            "
          >
            01 / Perception
          </div>
        </div>

        {/* BOTTOM CONTENT */}
        <div className="md:col-span-5 mt-5">
          <p className="mx-auto text-center font-primary text-[clamp(1.4rem,2vw,2rem)] font-medium leading-[1] tracking-[-0.04em]">
            People rarely remember everything you said.
          </p>
          <div className="md:col-span-6 mt-3">
            <p
              ref={bodyRef}
              className="mx-auto max-w-[620px] text-center font-primary text-[clamp(1rem,1.35vw,1.3rem)] leading-[1.45] tracking-[-0.02em] text-black/58"
            >
              They remember how clearly they understood you, how consistently
              you appeared, and what they began to associate with your name. We
              shape those signals across identity, imagery, communication,
              reputation and digital presence.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
