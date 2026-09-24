import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

const IMAGE =
  "https://ik.imagekit.io/rxoyjxx4c/cinematic-cover.webp";

export default function HumanLedBrandIntelligence() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const firstLineRef = useRef<HTMLSpanElement>(null);
  const secondLineRef = useRef<HTMLSpanElement>(null);
  const bottomTitleRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  const reduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const ctx = gsap.context(() => {
        if (reduceMotion) {
          gsap.set(
            [
              metaRef.current,
              firstLineRef.current,
              secondLineRef.current,
              bottomTitleRef.current,
              bodyRef.current,
            ],
            { autoAlpha: 1, yPercent: 0, y: 0 },
          );

          gsap.set(frameRef.current, { width: "100%" });
          gsap.set(imageRef.current, { scale: 1 });

          return;
        }

        gsap.set(metaRef.current, { autoAlpha: 0, y: 14 });
        gsap.set(firstLineRef.current, { yPercent: 110, autoAlpha: 0 });
        gsap.set(secondLineRef.current, { yPercent: 110, autoAlpha: 0 });
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
            .to(
              secondLineRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.75, ease: "power3.out" },
              0.16,
            );

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
            .to(
              secondLineRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" },
              0.15,
            );

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
            .to(
              secondLineRef.current,
              { yPercent: 0, autoAlpha: 1, duration: 0.85, ease: "power3.out" },
              0.16,
            );

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
        >

        </div>

       <div className="relative z-10 flex w-full justify-center px-4 py-8 min-[390px]:px-5 min-[390px]:py-9 sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-10 lg:py-14 xl:px-12 xl:py-16 2xl:px-16 2xl:py-20">
  <h2
    id="brand-intelligence-title"
    style={{ fontFamily: '"Open Sans", sans-serif' }}
    className="mx-auto w-full max-w-[1200px] text-center font-semibold text-[20px] leading-[1.08] tracking-[-0.03em] min-[390px]:text-[28px] sm:max-w-[760px] sm:text-[clamp(2rem,5.2vw,2.6rem)] sm:leading-[1.05] md:max-w-[900px] md:text-[clamp(2.4rem,4.6vw,3.2rem)] lg:max-w-[1050px] lg:text-[clamp(2.8rem,4vw,3.8rem)] xl:max-w-[1180px] xl:text-[clamp(3.1rem,3.6vw,4.4rem)] 2xl:max-w-[1280px] 2xl:text-[clamp(3.4rem,3.4vw,4.8rem)]"
  >
    <span className="block overflow-hidden pb-[0.14em]">
      <span
        ref={firstLineRef}
        className="block font-normal will-change-transform"
      >
        Your brand isn&apos;t competing for attention.
      </span>
    </span>

    <span className="block overflow-hidden pb-[0.14em] min-[390px]:pb-[0.20em]">
      <span
        ref={secondLineRef}
        className="block font-normal will-change-transform"
      >
        It&apos;s competing for understanding.
      </span>
    </span>
  </h2>
</div>

        <div className="relative w-full">
          <div
            ref={frameRef}
            className="ml-auto h-[48svh] min-h-[320px] max-h-[520px] overflow-hidden rounded-[4px] sm:h-[54svh] sm:min-h-[400px] sm:max-h-[620px] md:h-[58svh] md:min-h-[460px] md:max-h-[680px] lg:h-[clamp(500px,62svh,720px)] xl:h-[clamp(540px,64svh,760px)] 2xl:h-[clamp(580px,66svh,800px)]"
          >
            <img
              ref={imageRef}
              src={IMAGE}
              alt="Architectural structure representing clarity, perception and brand presence"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center grayscale"
            />
          </div>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-[820px] flex-col items-center pb-14 text-center sm:mt-10 sm:pb-18 md:mt-12 md:pb-20 lg:mt-14 lg:pb-24 xl:pb-28">
          <div className="overflow-hidden pb-1">
            <p
              ref={bottomTitleRef}
              className="text-[clamp(1.2rem,5vw,1.2rem)] font-medium leading-[1.12] tracking-[-0.03em] sm:text-[clamp(1.4rem,3.5vw,1.75rem)] md:text-[30px] lg:text-[32px] xl:text-[34px]"
            >
              People rarely remember everything you said.
            </p>
          </div>

          <p
            ref={bodyRef}
            className="mt-3 max-w-[560px] px-2 font-normal text-[14px] leading-[1.55] tracking-[-0.015em] text-black/58 sm:mt-4 sm:px-0 sm:text-[15px] md:max-w-[600px] md:text-[16px] lg:max-w-[620px] lg:text-[17px] xl:text-[18px]"
          >
            They remember how clearly they understood you, how consistently you
            appeared, and what they began to associate with your name. We shape
            those signals across identity, imagery, communication, reputation
            and digital presence.
          </p>
        </div>
      </div>
    </section>
  );
}
