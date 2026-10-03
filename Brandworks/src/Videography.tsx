import { mediaUrl } from './media'
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

type VideoProject = {
  id: string;
  title: string;
  line: string;
  src: string;
};

const VIDEO_PROJECTS: VideoProject[] = [
  {
    id: "01",
    title: "Brand Film",
    line: "Ideas, given movement.",
    src: mediaUrl("CENTRAL CEE - BOOGA (MUSIC VIDEO).mp4"),
  },
  {
    id: "02",
    title: "Campaign Film",
    line: "Rhythm becomes direction.",
    src: mediaUrl("Central Cee - Obsessed With You (Official Video).mp4"),
  },
  {
    id: "03",
    title: "Visual Story",
    line: "Every frame carries intent.",
    src: mediaUrl("Idea - Cinematic Video _ Shot on Canon EOS250D.mp4"),
  },
  {
    id: "04",
    title: "Creative Film",
    line: "The story keeps moving.",
    src: mediaUrl("CENTRAL CEE - BOOGA (MUSIC VIDEO).mp4"),
  },
];

export default function Videography() {
  const sectionRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const reduceMotion = useReducedMotion();

  useGSAP(() => {
    if (reduceMotion) return;

    // Refresh ScrollTrigger after a small delay to ensure layout is ready
    const timeoutId = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    const rows = rowsRef.current.filter(Boolean) as HTMLElement[];

    rows.forEach((row, index) => {
      const sticky = row.querySelector(".project-sticky");
      const video = row.querySelector("video");

      if (!sticky || !video) return;

      // Subtle incoming offset (as requested)
      if (index > 0) {
        gsap.fromTo(
          sticky,
          { yPercent: 8 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: row,
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          }
        );
      }

      // Parallax video movement
      gsap.fromTo(
        video,
        {
          yPercent: -5,
          scale: 1.05,
        },
        {
          yPercent: 5,
          scale: 1.01,
          ease: "none",
          scrollTrigger: {
            trigger: row,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    return () => {
      clearTimeout(timeoutId);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { scope: sectionRef, dependencies: [reduceMotion] });

  // Manage video playback based on intersection observation
  // This replaces the complex activeIndex state and ensures videos
  // only play when they are visible.
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    videoRefs.current.forEach((video) => {
      if (!video) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.play().catch(() => { });
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(video);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="videography"
      aria-labelledby="videography-heading"
      className="relative bg-white text-[#111] overflow-visible"
    >
      <h2 id="videography-heading" className="sr-only">
        Cinematography
      </h2>

      <div className="flex flex-col relative w-full overflow-visible">
        {VIDEO_PROJECTS.map((project, index) => (
          <article
            key={project.id}
            ref={(el) => (rowsRef.current[index] = el)}
            // The overlap formula: Desktop uses 120vh & -20vh, Mobile uses 105vh & -5vh.
            // The last item uses 100vh so it doesn't leave a gap before the next section/footer.
            className={`relative w-full ${index === VIDEO_PROJECTS.length - 1
                ? "min-h-[100vh]"
                : "min-h-[105vh] md:min-h-[120vh]"
              } ${index > 0 ? "mt-[-5vh] md:mt-[-20vh]" : ""}`}
            style={{ zIndex: index + 1 }}
          >
            <div className="project-sticky sticky top-0 h-screen w-full overflow-hidden">
              <div className="project-media absolute inset-0 overflow-hidden bg-[#111]">
                <video
                  ref={(node) => (videoRefs.current[index] = node)}
                  src={project.src}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  className="absolute -top-[5%] left-0 h-[110%] w-full object-cover will-change-transform"
                />
              </div>
              <div className="absolute inset-0 bg-black/[0.08]" />

              {/* Optional Intro T on the first project */}
              {index === 0 && (
                <div className="pointer-events-none absolute inset-x-[4vw] top-1/2 -translate-y-1/2 md:inset-x-[5vw] z-10">
                  <div className="overflow-hidden">
                    <div className="font-primary text-[clamp(2.8rem,10.4vw,5.4rem)] font-medium uppercase leading-[0.8] tracking-[-0.065em] text-white">
                      cinematography
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute bottom-[clamp(96px,13vh,132px)] left-[4vw] right-[4vw] flex items-end justify-between gap-6 text-white md:left-[5vw] md:right-[5vw] z-10">
                <p className="max-w-[13ch] font-primary text-[clamp(1.35rem,2.1vw,2.5rem)] font-medium leading-[0.98] tracking-[-0.035em]">
                  {project.line}
                </p>
                <span className="shrink-0 font-primary text-[8px] uppercase tracking-[0.18em] text-white/60 md:text-[9px]">
                  {project.title}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
