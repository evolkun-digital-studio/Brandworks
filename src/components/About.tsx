import { mediaUrl } from "../lib/media";
import { useEffect, useRef, useState } from "react";

const ABOUT_TEXT =
  "Brandworks is a concept-first creative and digital growth company, transforming bold ideas into compelling brand experiences and measurable impact.";

function formatTime(seconds: number) {
  const s = Number.isFinite(seconds) ? seconds : 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type AboutProps = {
  ctaHref?: string;
};

function About({ ctaHref = "#" }: AboutProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState("00:00");

  // Autoplay unless the visitor prefers reduced motion.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reduce) video.play().catch(() => {});
  }, []);

  // Drive the progress line and timecode without re-rendering every frame.
  useEffect(() => {
    let raf = 0;

    const draw = () => {
      const video = videoRef.current;
      if (video && video.duration) {
        const p = video.currentTime / video.duration;
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
        if (timeRef.current)
          timeRef.current.textContent = formatTime(video.currentTime);
      }
      if (playing) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <section aria-labelledby="about-heading" className="bg-white text-neutral-950">
      <h2 id="about-heading" className="sr-only">
        About BRANDWORKS
      </h2>

      <div className="mx-auto w-full max-w-[1600px] px-[clamp(16px,4vw,64px)] py-[clamp(64px,9vw,128px)] min-[1800px]:max-w-[1720px]">
        <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-8">
          {/* Video column */}
          <figure className="lg:col-span-5">
            <div
              onClick={toggle}
              className="relative aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-[4px] bg-neutral-100 lg:aspect-[4/3]"
            >
              <video
                ref={videoRef}
                src={mediaUrl("brandworktransition.mp4")}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onLoadedMetadata={(e) =>
                  setDuration(formatTime(e.currentTarget.duration))
                }
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </div>
 
          </figure>

          {/* Copy column */}
          <div className="flex flex-col justify-end lg:col-span-7 lg:pb-[clamp(30px,2.5vw,40px)] lg:pl-[clamp(0px,3vw,48px)]">
            <p className="max-w-[38ch] text-balance font-primary font-light text-[clamp(24px,6.2vw,32px)] leading-[1.22] tracking-[-0.02em] text-neutral-950 sm:text-[clamp(28px,4.2vw,32px)] lg:text-[clamp(28px,2.3vw,32px)] lg:leading-[1.16]">
              {ABOUT_TEXT}
            </p>

            <a
              href={ctaHref}
              className="group mt-8 inline-flex min-h-[44px] items-center gap-3 self-start text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 lg:mt-10"
            >
              <span className="site-ui relative text-[13px] font-medium">
                More about BRANDWORKS
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full origin-left bg-neutral-950 transition-transform duration-300 ease-out group-hover:origin-right group-hover:scale-x-0"
                />
              </span>
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
              >
                <path
                  d="M1 8h13M9 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
