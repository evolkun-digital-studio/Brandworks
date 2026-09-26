import { useEffect, useRef, useState } from 'react'

const ABOUT_TEXT =
  "BRANDWORKS is a creative and digital studio working across brand, media and growth. We bring strategy, production, design, reputation and digital execution into one working system. Some engagements start with a film. Some with a founder. Some with a website, search problem or campaign. The work depends on what needs to be solved.";

const ABOUT_WORDS = ABOUT_TEXT.split(" ");

const COLOR_FROM: [number, number, number] = [163, 163, 163];
const COLOR_TO: [number, number, number] = [23, 23, 23];

function mixColor(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const [r1, g1, b1] = COLOR_FROM;
  const [r2, g2, b2] = COLOR_TO;

  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);

  return `rgb(${r}, ${g}, ${b})`;
}

function About() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setProgress(1);
      return;
    }

    let ticking = false;

    const updateProgress = () => {
      ticking = false;

      const el = headingRef.current;
      if (!el) return;

      const { top } = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const start = viewportHeight * 0.88;
      const end = viewportHeight * 0.28;
      const next = (start - top) / (start - end);

      setProgress(Math.min(1, Math.max(0, next)));
    };

    const onScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(updateProgress);
    };

    updateProgress();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const total = ABOUT_WORDS.length;
  const band = 2.5;

  return (
    <section className="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-[clamp(36px,6vw,80px)] bg-white px-[clamp(16px,4vw,32px)] py-[clamp(56px,8vw,112px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:px-[clamp(40px,4vw,64px)] 2xl:px-16 min-[1800px]:max-w-[1720px]">
      {/* TEXT */}
      <div className="flex w-full flex-col items-start text-left lg:max-w-[650px] xl:max-w-[700px]">
        <span className="site-kicker text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500 sm:text-[11px]">
          Studio
        </span>

        <h3
          ref={headingRef}
          className="mt-4 w-full max-w-[680px] text-[clamp(20px,5.8vw,28px)]   leading-[1.38] tracking-[-0.025em] sm:mt-5 sm:max-w-[720px] sm:text-[clamp(22px,3.3vw,27px)] sm:leading-[1.36] md:max-w-[760px] md:text-[clamp(24px,2.8vw,28px)] md:leading-[1.34] lg:max-w-[620px] lg:text-[clamp(25px,2vw,28px)] lg:leading-[1.32] xl:max-w-[680px] 2xl:max-w-[720px] 2xl:text-[29px]"
        >
          {ABOUT_WORDS.map((word, index) => {
            const wordStart = index / total;
            const wordEnd = (index + band) / total;
            const wordProgress = (progress - wordStart) / (wordEnd - wordStart);

            return (
              <span
                key={`${word}-${index}`}
                className="transition-colors duration-150 ease-out"
                style={{ color: mixColor(wordProgress) }}
              >
                {word}{" "}
              </span>
            );
          })}
        </h3>

        <a
          href="#"
          className="group mt-7 inline-flex items-center gap-2 border-b border-neutral-900 pb-1 text-neutral-900 transition-all duration-300 ease-out active:opacity-60 sm:mt-8 sm:min-h-[44px] sm:min-w-[154px] sm:justify-center sm:rounded-[3px] sm:border sm:bg-neutral-900 sm:px-5 sm:pb-0 sm:text-white sm:hover:bg-white sm:hover:text-neutral-900 lg:mt-9"
        >
          <span className="site-ui whitespace-nowrap text-[12px] font-medium sm:text-[13px]">
            More about BRANDWORKS
          </span>

          <span className="text-[14px] transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </a>
      </div>

      <div className="relative h-[365px] w-[572px] max-w-full overflow-hidden rounded-[8px] bg-neutral-100">
        <video
          src="https://res.cloudinary.com/dpjdnoqii/video/upload/v1790402778/gemini_generated_video_b01ac751_umpdsx.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 block h-full w-full object-cover object-center opacity-100"
        />

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={1.5}
          aria-hidden="true"
          className="absolute bottom-3 left-3 h-5 w-5 sm:bottom-4 sm:left-4 sm:h-[22px] sm:w-[22px] lg:bottom-5 lg:left-5 lg:h-6 lg:w-6"
        >
          <rect x="2" y="2" width="8" height="8" />
          <rect x="14" y="2" width="8" height="8" />
          <rect x="2" y="14" width="8" height="8" />
          <rect x="14" y="14" width="8" height="8" />
        </svg>
      </div>
    </section>
  );
}

export default About;