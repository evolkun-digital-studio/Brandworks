import { useRef, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

const IMAGE = "https://ik.imagekit.io/rxoyjxx4c/cinematic-cover.webp";

export default function HumanLedBrandIntelligence() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const firstLineRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const bottomTitleRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  const reduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const ctx = gsap.context(() => {
        const caption = () => {
          const root = captionRef.current;
          const q = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, root);
          return {
            root,
            lead: q("[data-cap-lead]"),
            words: q("[data-cap-word]"),
            sweep: q("[data-cap-sweep]"),
          };
        };

        /**
         * The line on the photograph, as one cinematic type sequence:
         *
         *   1  the text area opens horizontally from its centre
         *   2  the two lead lines are drawn in from opposite sides through
         *      the opening
         *   3  SEE. HEAR. UNDERSTAND. cut up out of their masks, word by word
         *   4  a hairline splices across the words, the type firming as it
         *      passes
         *   5  the tracking and a hair of scale settle the composition
         *
         * Every stage overlaps the next. It runs in real time rather than on
         * the scrub, fired from the same scroll range as the frame's own
         * timeline once the frame has mostly opened, so none of the existing
         * tweens are retimed.
         */
        const revealCaption = (range: { start: string; end: string }, at: number, tracking: boolean) => {
          const { root, lead, words, sweep } = caption();
          const tl = gsap
            .timeline({ paused: true })
            .to(shadeRef.current, { autoAlpha: 1, duration: 0.9, ease: "power2.out" }, 0)
            // 1 - the frame opens.
            .fromTo(
              root,
              { clipPath: "inset(0% 50% 0% 50%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power4.inOut" },
              0,
            )
            // 5 (begins here) - tracking closes up across the whole sequence.
            .fromTo(
              root,
              { "--cap-track": tracking ? "0.04em" : "0em" },
              { "--cap-track": "0em", duration: 1.9, ease: "power2.out" },
              0,
            )
            // 2 - the lead lines are pulled together into composition.
            .fromTo(
              lead[0],
              { x: -45, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 1, ease: "expo.out" },
              0.2,
            )
            .fromTo(
              lead[1],
              { x: 45, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 1, ease: "expo.out" },
              0.2,
            )
            // 3 - three quick cuts.
            .fromTo(
              words,
              // y is pinned too: a rebuilt timeline can otherwise inherit the
              // offset as pixels and leave the words below their masks.
              { y: 0, yPercent: 110, scale: 1.08 },
              { y: 0, yPercent: 0, scale: 1, duration: 0.75, stagger: 0.07, ease: "power4.out" },
              0.75,
            )
            // 4 - the splice: the type dips a touch as the line enters and
            // firms back up behind it; the line is gone once across.
            .to(root, { opacity: 0.75, duration: 0.18, ease: "power1.out" }, 1.25)
            .fromTo(
              sweep,
              { left: "-10%", autoAlpha: 1 },
              { left: "110%", duration: 0.7, ease: "power2.inOut" },
              1.25,
            )
            .to(root, { opacity: 1, duration: 0.55, ease: "power1.inOut" }, 1.4)
            .set(sweep, { autoAlpha: 0 }, 1.95)
            // 5 - the composition settles.
            .fromTo(root, { scale: 1.015 }, { scale: 1, duration: 0.8, ease: "power2.out" }, 1.3);

          ScrollTrigger.create({
            trigger: frameRef.current,
            start: range.start,
            end: range.end,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (self.progress >= at) tl.play();
              else if (self.progress < at - 0.12) tl.reverse();
            },
            onLeaveBack: () => tl.reverse(),
          });
        };

        if (reduceMotion) {
          gsap.set(
            [
              metaRef.current,
              firstLineRef.current,
              bottomTitleRef.current,
              bodyRef.current,
            ],
            { autoAlpha: 1, yPercent: 0, y: 0 },
          );

          gsap.set(frameRef.current, { width: "100%" });
          gsap.set(imageRef.current, { scale: 1 });
          const still = caption();
          gsap.set(still.root, { clipPath: "none", opacity: 1, scale: 1, "--cap-track": "0em" });
          gsap.set(still.lead, { autoAlpha: 1, x: 0 });
          gsap.set(still.words, { y: 0, yPercent: 0, scale: 1 });
          gsap.set(still.sweep, { autoAlpha: 0 });
          gsap.set(shadeRef.current, { autoAlpha: 1 });

          return;
        }

        gsap.set(metaRef.current, { autoAlpha: 0, y: 14 });
        gsap.set(firstLineRef.current, { yPercent: 110, autoAlpha: 0 });
        {
          const hidden = caption();
          gsap.set(hidden.root, {
            clipPath: "inset(0% 50% 0% 50%)",
            scale: 1.015,
            transformOrigin: "50% 50%",
          });
          gsap.set(hidden.lead, { autoAlpha: 0 });
          gsap.set(hidden.words, { y: 0, yPercent: 110, scale: 1.08 });
          gsap.set(hidden.sweep, { autoAlpha: 0 });
        }
        gsap.set(shadeRef.current, { autoAlpha: 0 });
        gsap.set(bottomTitleRef.current, { yPercent: 70, autoAlpha: 0 });
        gsap.set(bodyRef.current, { y: 20, autoAlpha: 0 });

        const mm = gsap.matchMedia();

        mm.add("(max-width: 639px)", () => {
          gsap.set(frameRef.current, { width: "82%" });
          gsap.set(imageRef.current, { scale: 1.05 });

          const introTl = gsap.timeline({
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 75%",
              end: "top 24%",
              scrub: 0.55,
              invalidateOnRefresh: true,
            },
          });

          introTl
            .to(
              metaRef.current,
              { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out" },
              0,
            )
            .to(
              firstLineRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.75, ease: "power3.out" },
              0.05,
            )
            // The subtitle now reveals on the photograph; this keeps the
            // heading's scrub the same length it always was.
            .to({}, { duration: 0.75 }, 0.16);

          const mediaTl = gsap.timeline({
            scrollTrigger: {
              trigger: frameRef.current,
              start: "top 78%",
              end: "center 48%",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          });

          mediaTl
            .to(
              frameRef.current,
              { width: "100%", duration: 1, ease: "power3.out" },
              0,
            )
            .to(
              imageRef.current,
              { scale: 1, duration: 1, ease: "power2.out" },
              0,
            )
            .to(
              bottomTitleRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: "power3.out" },
              0.52,
            )
            .to(
              bodyRef.current,
              { y: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out" },
              0.66,
            );

          revealCaption({ start: "top 78%", end: "center 48%" }, 0.45, false);
        });

        mm.add("(min-width: 640px) and (max-width: 1023px)", () => {
          gsap.set(frameRef.current, { width: "58%" });
          gsap.set(imageRef.current, { scale: 1.06 });

          const introTl = gsap.timeline({
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
              end: "top 20%",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });

          introTl
            .to(
              metaRef.current,
              { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out" },
              0,
            )
            .to(
              firstLineRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" },
              0.05,
            )
            // The subtitle now reveals on the photograph; this keeps the
            // heading's scrub the same length it always was.
            .to({}, { duration: 0.8 }, 0.15);

          const mediaTl = gsap.timeline({
            scrollTrigger: {
              trigger: frameRef.current,
              start: "top 68%",
              end: "center center",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          });

          mediaTl
            .to(
              frameRef.current,
              { width: "100%", duration: 1, ease: "power3.out" },
              0,
            )
            .to(
              imageRef.current,
              { scale: 1, duration: 1, ease: "power2.out" },
              0,
            )
            .to(
              bottomTitleRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" },
              0.5,
            )
            .to(
              bodyRef.current,
              { y: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out" },
              0.66,
            );

          revealCaption({ start: "top 68%", end: "center center" }, 0.42, true);
        });

        mm.add("(min-width: 1024px)", () => {
          gsap.set(frameRef.current, { width: "32%" });
          gsap.set(imageRef.current, { scale: 1.08 });

          const introTl = gsap.timeline({
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 62%",
              end: "top 16%",
              scrub: 0.65,
              invalidateOnRefresh: true,
            },
          });

          introTl
            .to(
              metaRef.current,
              { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out" },
              0,
            )
            .to(
              firstLineRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.85, ease: "power3.out" },
              0.05,
            )
            // The subtitle now reveals on the photograph; this keeps the
            // heading's scrub the same length it always was.
            .to({}, { duration: 0.85 }, 0.16);

          const mediaTl = gsap.timeline({
            scrollTrigger: {
              trigger: frameRef.current,
              start: "top 58%",
              end: "center center",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          });

          mediaTl
            .to(
              frameRef.current,
              { width: "100%", duration: 1, ease: "power3.out" },
              0,
            )
            .to(
              imageRef.current,
              { scale: 1, duration: 1, ease: "power2.out" },
              0,
            )
            .to(
              bottomTitleRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" },
              0.5,
            )
            .to(
              bodyRef.current,
              { y: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out" },
              0.68,
            );

          revealCaption({ start: "top 58%", end: "center center" }, 0.42, true);
        });

        return () => mm.revert();
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
      className="relative w-full overflow-hidden bg-white text-[#111]"
    >
      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div
          ref={metaRef}
          className="flex items-start justify-between pb-4 pt-14 sm:pb-5 sm:pt-16 md:pt-20 lg:pt-24 xl:pt-28"
        ></div>

        <div className="relative z-10 flex w-full justify-center px-4 py-8 min-[390px]:px-5 min-[390px]:py-9 sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-10 lg:py-10 xl:px-12 xl:py-12 2xl:px-15 2xl:py-15">
          <h2
            id="brand-intelligence-title"
            style={{ fontFamily: '"Open Sans", sans-serif' }}
            className="mx-auto w-full max-w-[1200px] text-center text-[20px] leading-[1.12] tracking-[-0.03em] min-[390px]:text-[24px] sm:max-w-[760px] sm:text-[28px] sm:leading-[1.1] md:max-w-[900px] md:text-[32px] lg:max-w-[1050px] lg:text-[36px] xl:max-w-[1180px] xl:text-[40px] 2xl:max-w-[1280px] 2xl:text-[48px]"
          >
            <span className="block overflow-hidden pb-[0.14em]">
              <span
                ref={firstLineRef}
                className="block font-primary will-change-transform "
              >
                Photography. Film. Search. Media. Design. Content.
              </span>
            </span>
          </h2>
        </div>

        <div className="relative w-full">
          <div
            ref={frameRef}
            className="relative ml-auto h-[45svh] min-h-[320px] max-h-[520px] overflow-hidden rounded-[4px] sm:h-[54svh] sm:min-h-[400px] sm:max-h-[620px] md:h-[58svh] md:min-h-[460px] md:max-h-[680px] lg:h-[clamp(500px,62svh,720px)] xl:h-[clamp(540px,64svh,760px)] 2xl:h-[clamp(580px,66svh,800px)]"
          >
            <img
              ref={imageRef}
              src={IMAGE}
              alt="Architectural structure representing clarity, perception and brand presence"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center grayscale"
            />

            {/* A soft darkening held to the middle of the frame keeps the
                caption legible where the photograph turns light. */}
            <div
              ref={shadeRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(0,0,0,0.5),rgba(0,0,0,0.16)_70%,rgba(0,0,0,0.06))]"
            />

            {/* One sentence, set as an editorial composition: two quiet lead
                lines, then the three verbs. Screen readers get the sentence
                as written. */}
            <p
              ref={captionRef}
              style={{ "--cap-track": "0em" } as CSSProperties}
              className="absolute inset-0 m-auto h-max w-max max-w-[calc(100%-2.5rem)] text-center font-primary text-white will-change-transform"
            >
              <span className="sr-only">
                A brand is built through what people repeatedly see, hear and understand.
              </span>

              <span aria-hidden="true" className="block">
                {["A brand is built through", "what people repeatedly"].map((line) => (
                  <span
                    key={line}
                    data-cap-lead
                    className="block whitespace-nowrap text-[20px] leading-[1.45] tracking-[var(--cap-track)] text-white will-change-transform min-[390px]:text-[16px] sm:text-[17px] lg:text-[28px] xl:text-[32px]"
                  >
                    {line}
                  </span>
                ))}

                <span className="relative mt-2 flex justify-center gap-x-[0.32em] whitespace-nowrap text-[19px] font-medium leading-[1.15] tracking-[calc(var(--cap-track)-0.01em)] sm:mt-2.5 sm:text-[22px] lg:mt-3 lg:text-[30px] xl:text-[38px]">
                  {["SEE.", "HEAR.", "UNDERSTAND."].map((word) => (
                    <span key={word} className="inline-block overflow-hidden pb-[0.08em] pt-[0.04em]">
                      <span data-cap-word className="inline-block origin-bottom font-primary will-change-transform">
                        {word}
                      </span>
                    </span>
                  ))}

                  {/* The splice: a hairline that crosses the words once. */}
                  <span
                    data-cap-sweep
                    className="pointer-events-none absolute top-[55%] h-px w-[60px] bg-[#ccff00]/80"
                  />
                </span>
              </span>
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-[820px] flex-col items-center pb-14 text-center sm:mt-10 sm:pb-18 md:mt-12 md:pb-20 lg:mt-14 lg:pb-24 xl:pb-28">
  <div className="overflow-hidden pb-1">
    <p
      ref={bottomTitleRef}
      className="text-[clamp(1.2rem,5vw,1.2rem)] font-medium leading-[1.12] tracking-[-0.03em] sm:text-[clamp(1.4rem,3.5vw,1.75rem)] md:text-[30px] lg:text-[32px] xl:text-[34px]"
    >
      The format changes. The standard doesn't.
    </p>
  </div>

  <p
    ref={bodyRef}
    className="mt-3 max-w-[560px] px-2 font-normal text-[14px] leading-[1.55] tracking-[-0.015em] text-black/58 sm:mt-4 sm:px-0 sm:text-[15px] md:max-w-[600px] md:text-[16px] lg:max-w-[620px] lg:text-[17px] xl:text-[18px]"
  >
    A photograph, a film, a website, an interview or a social post may live in
    different places. They should still feel like they came from the same brand.
  </p>
</div>
      </div>
    </section>
  );
}
