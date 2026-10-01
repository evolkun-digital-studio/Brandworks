import { mediaUrl } from '../../media'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Icon } from "@iconify/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

gsap.registerPlugin(ScrollTrigger);

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type Film = {
  id: string;
  title: string;
  // category: string;
  client: string;
  year: string;
  description: string;
  videoUrl: string;
  poster: string;
  // deliverables: string[];
};

/* -------------------------------------------------------------------------- */
/*                                FILM PROJECTS                               */
/* -------------------------------------------------------------------------- */

/**
 * Replace videoUrl / poster values with your actual BrandWorks work.
 *
 * Keep 10 items.
 * The scroll showcase is designed around this amount.
 */

const FILMS: Film[] = [
  {
    id: "brand-film",
    title: "Brand Film",
    // category: "Commercial / Brand",
    client: "BrandWorks",
    year: "2026",
    description:
      "A focused brand film built around controlled composition, movement and a clear visual narrative.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1485846234645-a62644f84728.jpg"),
    // deliverables: ["Brand Film", "Campaign Cutdowns", "Sound Design"],
  },
  {
    id: "product-film",
    title: "Product Story",
    // category: "Product / Commercial",
    client: "BrandWorks",
    year: "2026",
    description:
      "Precise lighting, material detail and intentional camera movement designed to make the product feel considered.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1492724441997-5dc865305da7.jpg"),
    // deliverables: ["Hero Film", "Product Details", "Social Cuts"],
  },
  {
    id: "fashion-film",
    title: "Fashion Film",
    // category: "Fashion / Editorial",
    client: "BrandWorks",
    year: "2026",
    description:
      "Editorial cinematography shaped by rhythm, gesture and movement rather than unnecessary visual effects.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1509631179647-0177331693ae.jpg"),
    // deliverables: ["Campaign Film", "Vertical Edit", "Photography"],
  },
  {
    id: "architecture-film",
    title: "Architecture",
    // category: "Architecture / Space",
    client: "BrandWorks",
    year: "2026",
    description:
      "Measured camera movement and natural perspective used to communicate scale, material and atmosphere.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1487958449943-2429e8be8625.jpg"),
    // deliverables: ["Property Film", "Drone", "Social Edit"],
  },
  {
    id: "hospitality-film",
    title: "Hospitality",
    // category: "Hospitality / Lifestyle",
    client: "BrandWorks",
    year: "2026",
    description:
      "A warmer visual language combining spaces, details and human moments into one continuous experience.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1566073771259-6a8506099945.jpg"),
    // deliverables: ["Experience Film", "Short Cuts", "Ambient Audio"],
  },
  {
    id: "automotive-film",
    title: "Automotive",
    // category: "Automotive / Motion",
    client: "BrandWorks",
    year: "2026",
    description:
      "Tracking shots, controlled speed and deliberate framing designed around performance and physical movement.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1503736334956-4c8f8e92946d.jpg"),
    // deliverables: ["Commercial", "Tracking Shots", "Cutdowns"],
  },
  {
    id: "founder-story",
    title: "Founder Story",
    // category: "Portrait / Documentary",
    client: "BrandWorks",
    year: "2026",
    description:
      "A quieter documentary approach built around personality, environment and believable human detail.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1516035069371-29a1b244cc32.jpg"),
    // deliverables: ["Interview Film", "Portraits", "Social Stories"],
  },
  {
    id: "live-event",
    title: "Live Event",
    // category: "Event / Experience",
    client: "BrandWorks",
    year: "2026",
    description:
      "Fast-moving coverage structured into a film with rhythm, scale and a clear sense of place.",
    videoUrl: mediaUrl("footer-showreel-1080.mp4"),
    poster:
      mediaUrl("photo-1492684223066-81342ee5ff30.jpg"),
    // deliverables: ["Event Film", "Highlights", "Vertical Reels"],
  },
  {
    id: "social-campaign",
    title: "Social Campaign",
    // category: "Digital / Campaign",
    client: "BrandWorks",
    year: "2026",
    description:
      "Short-form motion built for digital platforms without compromising framing, pace or production quality.",
    videoUrl: mediaUrl("CENTRAL CEE - BOOGA (MUSIC VIDEO).mp4"),
    poster:
      mediaUrl("photo-1536240478700-b869070f9279.jpg"),
    // deliverables: ["Campaign Film", "9:16 Edits", "Motion Assets"],
  },
  {
    id: "studio-reel",
    title: "Studio Reel",
    // category: "Selected / 2026",
    client: "BrandWorks",
    year: "2026",
    description:
      "A selection of film, commercial, editorial and motion work created across the studio.",
    videoUrl: mediaUrl("Central Cee - Obsessed With You (Official Video).mp4"),
    poster:
      mediaUrl("photo-1492619375914-88005aa9e8fb.jpg"),
    // deliverables: ["Showreel", "Direction", "Production"],
  },
];

const CAPABILITIES = [
  {
    number: "01",
    title: "Direction",
    description:
      "Creative direction, treatments, shot planning and visual development before the camera starts moving.",
  },
  {
    number: "02",
    title: "Production",
    description:
      "Commercial, editorial and brand productions shaped around the idea rather than unnecessary scale.",
  },
  {
    number: "03",
    title: "Cinematography",
    description:
      "Camera movement, lighting and composition designed to create a consistent visual language.",
  },
  {
    number: "04",
    title: "Post-production",
    description:
      "Editing, colour, sound and motion finishing treated as part of the same visual system.",
  },
];

const premiumEase = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------------------- */
/*                              VIDEOGRAPHY PAGE                              */
/* -------------------------------------------------------------------------- */

export default function VideographyPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  const showcaseRef = useRef<HTMLElement | null>(null);
  const showcaseStageRef = useRef<HTMLDivElement | null>(null);

  const reduceMotion = useReducedMotion();

  const [heroPlaying, setHeroPlaying] = useState(true);
  const [heroMuted, setHeroMuted] = useState(true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeProject, setActiveProject] = useState<Film | null>(null);

  const activeFilm = FILMS[activeIndex];

  /* ------------------------------------------------------------------------ */
  /*                              LENIS SMOOTH SCROLL                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (reduceMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.92,
      touchMultiplier: 1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, [reduceMotion]);

  /* ------------------------------------------------------------------------ */
  /*                                  MODAL                                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!activeProject) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveProject(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeProject]);

  /* ------------------------------------------------------------------------ */
  /*                                   GSAP                                   */
  /* ------------------------------------------------------------------------ */

  useGSAP(
    () => {
      /* ------------------------------- HERO -------------------------------- */

      if (!reduceMotion) {
        gsap.fromTo(
          ".hero-reveal",
          {
            yPercent: 105,
          },
          {
            yPercent: 0,
            duration: 1.15,
            stagger: 0.07,
            ease: "power4.out",
            delay: 0.08,
          }
        );

        gsap.fromTo(
          ".hero-meta",
          {
            opacity: 0,
            y: 18,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            delay: 0.45,
            ease: "power3.out",
          }
        );

        gsap.fromTo(
          ".hero-media-shell",
          {
            clipPath: "inset(8% 8% 8% 8%)",
          },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.45,
            delay: 0.22,
            ease: "power4.inOut",
          }
        );

        gsap.to(".hero-media-inner", {
          scale: 1.07,
          yPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        gsap.to(".hero-copy", {
          yPercent: -9,
          opacity: 0.42,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero-section",
            start: "35% top",
            end: "bottom top",
            scrub: 1,
          },
        });
      }

      /* -------------------------- GENERAL REVEALS --------------------------- */

      const revealItems =
        gsap.utils.toArray<HTMLElement>(".section-reveal");

      revealItems.forEach((element) => {
        if (reduceMotion) {
          gsap.set(element, {
            opacity: 1,
            y: 0,
          });

          return;
        }

        gsap.fromTo(
          element,
          {
            opacity: 0,
            y: 36,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 88%",
              once: true,
            },
          }
        );
      });

      /* ----------------------- SCROLL FILM SHOWCASE ------------------------- */

      const showcaseSteps =
        gsap.utils.toArray<HTMLElement>(".showcase-step");

      showcaseSteps.forEach((step, index) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 56%",
          end: "bottom 44%",
          onEnter: () => setActiveIndex(index),
          onEnterBack: () => setActiveIndex(index),
        });

        if (!reduceMotion) {
          const content = step.querySelector(".showcase-step-content");

          if (content) {
            gsap.fromTo(
              content,
              {
                opacity: 0.2,
                y: 28,
              },
              {
                opacity: 1,
                y: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: step,
                  start: "top 82%",
                  end: "top 50%",
                  scrub: true,
                },
              }
            );
          }
        }
      });

      if (showcaseRef.current) {
        gsap.fromTo(
          ".showcase-progress-bar",
          {
            scaleY: 0,
          },
          {
            scaleY: 1,
            transformOrigin: "top center",
            ease: "none",
            scrollTrigger: {
              trigger: showcaseRef.current,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          }
        );
      }

      if (!reduceMotion && showcaseStageRef.current) {
        gsap.fromTo(
          showcaseStageRef.current,
          {
            scale: 0.96,
          },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: showcaseRef.current,
              start: "top 85%",
              end: "top 15%",
              scrub: 1,
            },
          }
        );
      }

      /* ---------------------------- CAPABILITIES ---------------------------- */

      gsap.utils
        .toArray<HTMLElement>(".capability-row")
        .forEach((row) => {
          if (reduceMotion) return;

          gsap.fromTo(
            row,
            {
              opacity: 0.35,
            },
            {
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: row,
                start: "top 82%",
                end: "top 55%",
                scrub: true,
              },
            }
          );

          const line = row.querySelector(".capability-line");

          if (line) {
            gsap.fromTo(
              line,
              {
                scaleX: 0,
              },
              {
                scaleX: 1,
                transformOrigin: "left center",
                ease: "power3.out",
                duration: 1,
                scrollTrigger: {
                  trigger: row,
                  start: "top 85%",
                  once: true,
                },
              }
            );
          }
        });

      const refreshTimer = window.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);

      return () => {
        window.clearTimeout(refreshTimer);
      };
    },
    {
      scope: containerRef,
      dependencies: [reduceMotion],
      revertOnUpdate: true,
    }
  );

  /* ------------------------------------------------------------------------ */
  /*                              HERO CONTROLS                               */
  /* ------------------------------------------------------------------------ */

  const toggleHeroPlayback = useCallback(() => {
    const video = heroVideoRef.current;

    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => setHeroPlaying(true))
        .catch(() => setHeroPlaying(false));
    } else {
      video.pause();
      setHeroPlaying(false);
    }
  }, []);

  const toggleHeroMute = useCallback(() => {
    const video = heroVideoRef.current;

    if (!video) return;

    const nextMuted = !video.muted;

    video.muted = nextMuted;
    setHeroMuted(nextMuted);
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen overflow-x-clip bg-white text-[#111] antialiased selection:bg-[#ccff00] selection:text-[#111]"
    >
      <style>{`
        html {
          background: #ffffff;
        }

        body {
          background: #ffffff;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #ffffff;
        }

        ::-webkit-scrollbar-thumb {
          background: #ccff00;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: #ccff00 #ffffff;
        }

        .bw-display {
          text-wrap: balance;
        }

        .bw-copy {
          text-wrap: pretty;
        }

        .hero-media-inner {
          will-change: transform;
        }

        .showcase-stage {
          will-change: transform;
        }

        .showcase-progress-bar {
          will-change: transform;
        }

        video::-webkit-media-controls {
          display: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* ==================================================================== */}
      {/* HERO                                                                 */}
      {/* ==================================================================== */}

      <section className="hero-section relative min-h-[100svh] overflow-hidden bg-white px-5 pb-8 pt-28 sm:px-8 md:px-12 lg:px-14 lg:pb-12 lg:pt-20">
        <div className="mx-auto flex min-h-[calc(100svh-9rem)] w-full max-w-[1600px] flex-col">
          {/* Top Meta */} 
  {/* 
            <div className="hero-copy relative z-10 mt-10 md:mt-14">
              <div className="overflow-hidden pb-[0.06em]">
                <h1 className="hero-reveal bw-display text-[clamp(3.5rem,5vw,10rem)] font-medium leading-[0.82] tracking-[-0.07em] text-[#111] pb-5">
                  Cinematography
                </h1>
              </div>
            </div>  */}

          {/* Hero Film */}

          <div className="hero-media-shell relative mt-12 min-h-[360px] flex-1 overflow-hidden bg-[#111] md:mt-14 md:min-h-[480px]">
            <video
              ref={heroVideoRef}
              src={mediaUrl("CENTRAL CEE - BOOGA (MUSIC VIDEO).mp4")}
              autoPlay={!reduceMotion}
              loop
              playsInline
              muted={heroMuted}
              preload="metadata"
              onPlay={() => setHeroPlaying(true)}
              onPause={() => setHeroPlaying(false)}
              className="hero-media-inner absolute inset-0 h-full w-full scale-[1.02] object-cover"
            />

            <div className="pointer-events-none absolute inset-0 bg-black/[0.08]" />

            {/* Film label */}
 

            {/* Controls */}

            <div className="absolute bottom-4 right-4 z-10 flex items-center   bg-black/25 backdrop-blur-md sm:bottom-5 sm:right-5">
              <button
                type="button"
                onClick={toggleHeroPlayback}
                aria-label={heroPlaying ? "Pause showreel" : "Play showreel"}
                className="flex h-11 w-11 items-center justify-center text-white transition-colors duration-300 hover:bg-white hover:text-black"
              >
                <Icon
                  icon={heroPlaying ? "lucide:pause" : "lucide:play"}
                  width="16"
                />
              </button>

              <div className="h-5 w-px bg-white/25" />

              <button
                type="button"
                onClick={toggleHeroMute}
                aria-label={heroMuted ? "Unmute showreel" : "Mute showreel"}
                className="flex h-11 w-11 items-center justify-center text-white transition-colors duration-300 hover:bg-white hover:text-black"
              >
                <Icon
                  icon={
                    heroMuted
                      ? "lucide:volume-x"
                      : "lucide:volume-2"
                  }
                  width="16"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SMALL STUDIO STATEMENT                                               */}
      {/* ==================================================================== */}

      <section className="  bg-white px-5 py-24 sm:px-8 md:px-12 lg:px-14 lg:py-32">
        <div className="mx-auto grid w-full max-w-[1600px] gap-12 md:grid-cols-12">
          <div className="section-reveal md:col-span-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
              The approach
            </span>
          </div>

          <div className="section-reveal md:col-span-8 md:col-start-5">
            <h2 className="bw-display max-w-[1000px] text-[clamp(2rem,4.6vw,4.8rem)] font-normal leading-[1.02] tracking-[-0.055em]">
              Good cinematography does not need to announce itself.
              <span className="text-black/30">
                {" "}
                It gives the idea the right pace, perspective and atmosphere.
              </span>
            </h2>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SELECTED FILMS — 10 PROJECT SCROLL                                   */}
      {/* ==================================================================== */}

      <section
        id="selected-films"
        ref={showcaseRef}
        className="relative border-b border-black/10 bg-white"
      >
        {/* Intro */}

        <div className="px-5 pb-10 pt-28 sm:px-8 md:px-12 lg:px-14 lg:pb-16 lg:pt-40">
          <div className="mx-auto grid w-full max-w-[1600px] gap-8 md:grid-cols-12 md:items-end">
            <div className="section-reveal md:col-span-7">
              

              <h2 className="bw-display text-[clamp(3rem,6.5vw,4rem)] font-normal leading-[0.88] ">
                Selected films.
              </h2>
            </div>
 
          </div>
        </div>

        {/* Scrollytelling */}

        <div className="relative mx-auto w-full max-w-[1800px] lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(330px,0.62fr)]">
          {/* -------------------------------------------------------------- */}
          {/* STICKY VISUAL                                                   */}
          {/* -------------------------------------------------------------- */}

          <div className="relative z-20 h-[54svh] lg:h-auto">
            <div
              ref={showcaseStageRef}
              className="showcase-stage sticky top-0 flex h-[54svh] items-center bg-white px-5 py-5 sm:px-8 md:px-12 lg:h-[100svh] lg:px-14 lg:py-14"
            >
              <div className="relative h-full w-full overflow-hidden bg-[#111]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={activeFilm.id}
                    initial={
                      reduceMotion
                        ? { opacity: 1 }
                        : {
                            opacity: 0,
                            scale: 1.025,
                            clipPath: "inset(3% 0% 3% 0%)",
                          }
                    }
                    animate={{
                      opacity: 1,
                      scale: 1,
                      clipPath: "inset(0% 0% 0% 0%)",
                    }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            scale: 0.99,
                          }
                    }
                    transition={{
                      duration: reduceMotion ? 0.1 : 0.7,
                      ease: premiumEase,
                    }}
                    className="absolute inset-0"
                  >
                    <video
                      key={activeFilm.videoUrl}
                      src={activeFilm.videoUrl}
                      poster={activeFilm.poster}
                      autoPlay={!reduceMotion}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-black/[0.08]" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/55 to-transparent" />
                  </motion.div>
                </AnimatePresence>

                {/* Top */}

                <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 text-white sm:p-6">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em]">
                    BrandWorks / Film
                  </span>

                  <span className="text-[10px] font-medium uppercase tracking-[0.14em]">
                    {String(activeIndex + 1).padStart(2, "0")} /{" "}
                    {String(FILMS.length).padStart(2, "0")}
                  </span>
                </div>

                {/* Bottom */}

                <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-5 p-4 text-white sm:p-6 md:p-8">
                  <motion.div
                    key={`meta-${activeFilm.id}`}
                    initial={
                      reduceMotion
                        ? false
                        : {
                            opacity: 0,
                            y: 14,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.55,
                      ease: premiumEase,
                    }}
                  >
                    {/* <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-white/65">
                      {activeFilm.category}
                    </p> */}

                    <h3 className="text-[clamp(1.6rem,3.5vw,3.6rem)] font-normal leading-none tracking-[-0.045em]">
                      {activeFilm.title}
                    </h3>
                  </motion.div>

                  <button
                    type="button"
                    onClick={() => setActiveProject(activeFilm)}
                    aria-label={`Open ${activeFilm.title}`}
                    className="group flex h-12 w-12 flex-none items-center justify-center bg-[#ccff00] text-black transition-transform duration-300 hover:scale-[1.06] sm:h-14 sm:w-14"
                  >
                    <Icon
                      icon="lucide:play"
                      width="18"
                      className="ml-[2px]"
                    />
                  </button>
                </div>

                {/* Frame details */}

                <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[calc(100%-24px)] w-[calc(100%-24px)] -translate-x-1/2 -translate-y-1/2 border border-white/12" />
              </div>

              {/* Progress */}

              <div className="absolute right-2 top-1/2 hidden h-[35vh] w-px -translate-y-1/2 bg-black/10 lg:block">
                <div className="showcase-progress-bar h-full w-full origin-top bg-[#111]" />
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* PROJECT STEPS                                                   */}
          {/* -------------------------------------------------------------- */}

          <div className="relative z-10 px-5 sm:px-8 md:px-12 lg:border-l lg:border-black/10 lg:px-10 xl:px-14">
            {FILMS.map((film, index) => {
              const isActive = activeIndex === index;

              return (
                <article
                  key={film.id}
                  className="showcase-step flex min-h-[58svh] items-end border-b border-black/10 pb-12 pt-20 lg:min-h-[100svh] lg:items-center lg:pb-16 lg:pt-16"
                >
                  <div className="showcase-step-content w-full">
                    <div className="mb-8 flex items-center justify-between gap-6 lg:mb-12">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-[0.15em] transition-colors duration-500 ${
                          isActive
                            ? "text-black"
                            : "text-black/35"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-black/35">
                        {film.year}
                      </span>
                    </div>

                    {/* <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
                      {film.category}
                    </p> */}

                    <h3
                      className={`bw-display text-[clamp(2.5rem,4.6vw,5.2rem)] font-normal leading-[0.92] tracking-[-0.055em] transition-colors duration-500 ${
                        isActive
                          ? "text-[#111]"
                          : "text-black/27"
                      }`}
                    >
                      {film.title}
                    </h3>

                    <p className="bw-copy mt-7 max-w-[430px] text-[14px] leading-[1.65] text-black/52">
                      {film.description}
                    </p>

                    {/* <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
                      {film.deliverables.map((item) => (
                        <span
                          key={item}
                          className="text-[9px] font-medium uppercase tracking-[0.13em] text-black/38"
                        >
                          {item}
                        </span>
                      ))}
                    </div> */}

                    <button
                      type="button"
                      onClick={() => setActiveProject(film)}
                      className="group mt-10 inline-flex items-center gap-3 border-b border-black pb-2 text-[10px] font-medium uppercase tracking-[0.14em]"
                    >
                      Watch film

                      <Icon
                        icon="lucide:arrow-up-right"
                        width="14"
                        className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* BLACK STUDIO STRIP                                                   */}
      {/* ==================================================================== */}

      <section className="bg-[#111] px-5 py-20 text-white sm:px-8 md:px-12 lg:px-14 lg:py-24">
        <div className="mx-auto grid w-full max-w-[1600px] gap-12 md:grid-cols-12 md:items-end">
          <div className="section-reveal md:col-span-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
              Moving image
            </span>
          </div>

          <div className="section-reveal md:col-span-7 md:col-start-5">
            <h2 className="bw-display text-[clamp(2.4rem,4.7vw,5rem)] font-normal leading-[1] tracking-[-0.055em]">
              From the first frame
              <span className="text-white/28"> to the final cut.</span>
            </h2>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* CAPABILITIES                                                         */}
      {/* ==================================================================== */}

      <section className="bg-white px-5 py-28 sm:px-8 md:px-12 lg:px-14 lg:py-40">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="section-reveal mb-20 grid gap-8 md:grid-cols-12 lg:mb-28">
            <div className="md:col-span-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
                Film capabilities
              </p>
            </div>

            <div className="md:col-span-7 md:col-start-5">
              <h2 className="bw-display text-[clamp(2.8rem,5.4vw,5.8rem)] font-normal leading-[0.95] tracking-[-0.06em]">
                One visual system,
                <span className="text-black/28"> across the entire film.</span>
              </h2>
            </div>
          </div>

          <div className="border-t border-black/15">
            {CAPABILITIES.map((capability) => (
              <div
                key={capability.number}
                className="capability-row relative grid gap-6 py-8 md:grid-cols-12 md:items-start md:py-10 lg:py-12"
              >
                <div className="capability-line absolute inset-x-0 bottom-0 h-px bg-black/15" />

                <div className="md:col-span-2">
                  <span className="text-[10px] font-medium tracking-[0.12em] text-black/38">
                    {capability.number}
                  </span>
                </div>

                <div className="md:col-span-4">
                  <h3 className="text-[clamp(1.7rem,2.8vw,3rem)] font-normal tracking-[-0.045em]">
                    {capability.title}
                  </h3>
                </div>

                <div className="md:col-span-4 md:col-start-9">
                  <p className="bw-copy max-w-[440px] text-[14px] leading-[1.65] text-black/52">
                    {capability.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* FINAL CTA                                                            */}
      {/* ==================================================================== */}

      <section
        id="contact"
        className="bg-[#ccff00] px-5 py-24 text-[#111] sm:px-8 md:px-12 lg:px-14 lg:py-32"
      >
        <div className="mx-auto grid w-full max-w-[1600px] gap-12 md:grid-cols-12">
          <div className="section-reveal md:col-span-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/55">
              Start a project
            </span>
          </div>

          <div className="section-reveal md:col-span-8 md:col-start-5">
            <h2 className="bw-display max-w-[1050px] text-[clamp(3rem,7vw,7.8rem)] font-normal leading-[0.88] tracking-[-0.065em]">
              Have something worth filming?
            </h2>

            <div className="mt-10 flex flex-col gap-8 border-t border-black/25 pt-7 sm:flex-row sm:items-end sm:justify-between">
              <p className="bw-copy max-w-[480px] text-[14px] leading-[1.6] text-black/62 sm:text-[15px]">
                Tell us what you are building, launching or trying to
                communicate. We will shape the right visual approach around
                it.
              </p>

              <motion.a
                href="mailto:hello@brandworks.com"
                whileHover={
                  reduceMotion
                    ? undefined
                    : {
                        x: 4,
                      }
                }
                transition={{
                  duration: 0.25,
                  ease: premiumEase,
                }}
                className="group inline-flex w-fit items-center gap-3 text-[11px] font-medium uppercase tracking-[0.13em]"
              >
                Start a conversation

                <span className="flex h-11 w-11 items-center justify-center bg-[#111] text-[#ccff00]">
                  <Icon
                    icon="lucide:arrow-up-right"
                    width="16"
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </motion.a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* FILM LIGHTBOX                                                        */}
      {/* ==================================================================== */}

      <AnimatePresence>
        {activeProject && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.35,
              ease: premiumEase,
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setActiveProject(null);
              }
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm sm:p-6 md:p-10"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${activeProject.title} film`}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 24,
                      scale: 0.985,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 12,
                scale: 0.99,
              }}
              transition={{
                duration: 0.5,
                ease: premiumEase,
              }}
              className="relative w-full max-w-[1450px] overflow-hidden bg-white"
            >
              {/* Close */}

              <button
                type="button"
                onClick={() => setActiveProject(null)}
                aria-label="Close film"
                className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center bg-white text-black transition-colors duration-300 hover:bg-[#ccff00] sm:right-5 sm:top-5"
              >
                <Icon icon="lucide:x" width="19" />
              </button>

              {/* Film */}

              <div className="relative aspect-video bg-black">
                <video
                  src={activeProject.videoUrl}
                  poster={activeProject.poster}
                  controls
                  autoPlay={!reduceMotion}
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>

              {/* Meta */}

              <div className="grid gap-9 px-5 py-7 sm:px-8 sm:py-9 md:grid-cols-12 md:px-10">
                <div className="md:col-span-6">
                  {/* <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-black/42">
                    {activeProject.category}
                  </span> */}

                  <h3 className="mt-3 text-[clamp(2rem,4vw,4rem)] font-normal leading-[0.95] tracking-[-0.055em]">
                    {activeProject.title}
                  </h3>
                </div>

                <div className="md:col-span-5 md:col-start-8">
                  <p className="max-w-[520px] text-[13px] leading-[1.65] text-black/55 sm:text-[14px]">
                    {activeProject.description}
                  </p>

                  {/* <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/10 pt-5">
                    {activeProject.deliverables.map((item) => (
                      <span
                        key={item}
                        className="text-[9px] font-medium uppercase tracking-[0.13em] text-black/38"
                      >
                        {item}
                      </span>
                    ))}
                  </div> */}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
