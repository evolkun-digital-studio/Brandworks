import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { mediaUrl } from "../lib/media";

interface Project {
  id: number;
  title: string;
  media: string;
  mediaType: "image" | "video";
  ratio: "landscape" | "portrait" | "square" | "cinematic";
  position?: string;
  discipline?: string;
  year?: string;
}

const projects: Project[] = [
  {
    id: 1,
    title: "Delhi-6",
    media: mediaUrl("campaign-still.webp"),
    mediaType: "image",
    ratio: "landscape",
  },
  {
    id: 2,
    title: "Workify Hub",
    media: mediaUrl("website .png"),
    mediaType: "image",
    ratio: "portrait",
    position: "top center",
  },
  {
    id: 3,
    title: "India WMS",
    discipline: "Identity · Content · Technology",
    year: "2026",
    media: mediaUrl("project 2.webp"),
    mediaType: "image",
    ratio: "square",
  },
  {
    id: 4,
    title: "Kinikh Infra",
    media: mediaUrl("3129595-hd_1920_1080_25fps.mp4"),
    mediaType: "video",
    ratio: "landscape",
  },
  {
    id: 5,
    title: "Riaaj Vintage",
    media: mediaUrl("photo-1483985988355-763728e1935b.jpg"),
    mediaType: "image",
    ratio: "portrait",
  },
  {
    id: 6,
    title: "BrandWorks",
    media: mediaUrl("business card mock up.png"),
    mediaType: "image",
    ratio: "square",
  },
  {
    id: 7,
    title: "Editorial Series",
    media: mediaUrl("photo-02.webp"),
    mediaType: "image",
    ratio: "landscape",
  },
  {
    id: 8,
    title: "Campaign Film",
    media: mediaUrl("brandworks_bw_transition_smooth_60fps.mp4"),
    mediaType: "video",
    ratio: "portrait",
  },
  {
    id: 9,
    title: "Founder Reputation",
    media: mediaUrl("PR.jpg"),
    mediaType: "image",
    ratio: "cinematic",
  },
  {
    id: 10,
    title: "Growth Campaign",
    media: mediaUrl("performance.jpg"),
    mediaType: "image",
    ratio: "square",
  },
];

const leftColumn = projects.filter((_, index) => index % 2 === 0);
const rightColumn = projects.filter((_, index) => index % 2 === 1);

const ratioClasses = {
  landscape: "aspect-[1.42/1]",
  portrait: "aspect-[0.79/1]",
  square: "aspect-square",
  cinematic: "aspect-[1.7/1]",
};

function VideoMedia({ project }: { project: Project }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;

    if (!container || !video) return;

    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      {
        rootMargin: "120px",
        threshold: 0.12,
      },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <video
        ref={videoRef}
        src={project.media}
        aria-label={`${project.title} project film`}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover transition-[filter] duration-500 group-hover:saturate-[1.05]"
      />
    </div>
  );
}

function ProjectMedia({ project }: { project: Project }) {
  if (project.mediaType === "video") {
    return <VideoMedia project={project} />;
  }

  return (
    <div className="h-full w-full">
      <img
        src={project.media}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ objectPosition: project.position }}
        className="h-full w-full object-cover transition-[filter] duration-500 group-hover:saturate-[1.05]"
      />
    </div>
  );
}

function ProjectCard({ project, setActiveProject }: { project: Project; setActiveProject: Dispatch<SetStateAction<Project | null>> }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={() => setActiveProject(project)}
      onPointerLeave={() => setActiveProject(null)}
      onFocusCapture={() => setActiveProject(project)}
      onBlurCapture={() => setActiveProject(null)}
      className="group relative z-1 min-w-0"
    >
      <button
        type="button"
        aria-label={`View ${project.title} project`}
        onClick={() => setActiveProject(project)}
        className={`relative block w-full cursor-pointer overflow-hidden border-0 bg-[#f1f1ed] p-0 text-left text-[#111111] outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-4 ${ratioClasses[project.ratio]}`}
      >
        <motion.div
          whileHover={reduceMotion ? undefined : { scale: 1.018 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="h-full w-full origin-center"
        >
          <ProjectMedia project={project} />
        </motion.div>
      </button>

      <div className="mt-3 hidden grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-(--font-secondary) max-md:grid">
        <h2 className="m-0 font-(--font-primary) text-[22px] leading-[1.02] tracking-[-0.025em] text-[#111111]">
          {project.title}
        </h2>
        <span className="text-[10px] leading-[1.4] text-black/40">{project.year}</span>
        <p className="col-span-2 m-0 text-[10px] leading-[1.45] text-black/45">{project.discipline}</p>
      </div>
    </motion.article>
  );
}

export default function WorkPage() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Selected Work — BRANDWORKS";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="overflow-clip bg-white text-[#111111]">
      <section
        aria-labelledby="work-title"
        className="flex min-h-[72svh] flex-col justify-end px-[clamp(20px,2.4vw,48px)] pb-[clamp(34px,4vw,56px)] pt-[clamp(118px,12vh,150px)] max-md:min-h-[58svh] max-md:pt-26"
      >
        <motion.h1
          id="work-title"
          initial={reduceMotion ? false : { opacity: 0, y: 44 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="m-0 max-w-[950px] font-(--font-primary) text-[clamp(56px,7.2vw,112px)] leading-[0.9] tracking-[-0.045em] text-[#111111] max-md:text-[clamp(48px,14vw,72px)] max-md:leading-[0.92]"
        >
          Selected Projects<span className="text-[#CCFF00]">.</span>
        </motion.h1>

        <div className="mt-[clamp(22px,3vw,38px)] flex items-center justify-end font-(--font-secondary)">
          <a
            href="#project-index"
            aria-label="View projects"
            className="inline-flex items-center gap-3 border-b border-black/50 pb-1.5 text-[11px] leading-[1.35] tracking-[0.08em] text-[#111111] no-underline outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 max-md:hidden"
          >
            View projects
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-y-1">
              ↓
            </span>
          </a>
        </div>
      </section>

      <section
        id="project-index"
        aria-label="Selected project index"
        className="grid grid-cols-2 gap-x-[clamp(28px,5vw,80px)] bg-[#000000] px-[clamp(20px,2.4vw,48px)] pb-[clamp(72px,8vw,120px)] pt-[clamp(64px,7vw,100px)] max-md:flex max-md:flex-col max-md:gap-12 max-md:pb-18 max-md:pt-14"
      >
        <div className="flex min-w-0 flex-col gap-[clamp(72px,8vw,120px)] max-md:contents">
          {leftColumn.map((project) => (
            <ProjectCard key={project.id} project={project} setActiveProject={setActiveProject} />
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-[clamp(72px,8vw,120px)] pt-[clamp(52px,6vw,84px)] max-md:contents max-md:pt-0">
          {rightColumn.map((project) => (
            <ProjectCard key={project.id} project={project} setActiveProject={setActiveProject} />
          ))}
        </div>
      </section>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/2 z-50 w-max max-w-[92vw] -translate-x-1/2 -translate-y-1/2 text-center max-md:hidden"
      >
        <AnimatePresence mode="wait">
          {activeProject && (
            <motion.p
              key={activeProject.id}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="m-0 whitespace-nowrap font-primary text-[clamp(34px,5vw,132px)] leading-[0.95] tracking-[-0.04em] text-[#a3cc00]"
            >
              {activeProject.title}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <section
        aria-labelledby="work-contact-title"
        className="min-h-[48svh] bg-[#111111] px-[clamp(20px,2.4vw,48px)] py-[clamp(28px,3vw,44px)] text-white max-md:min-h-[42svh]"
      >
        <Link
          to="/contact"
          className="group flex min-h-[48svh] items-end justify-between gap-8 text-white no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-4 focus-visible:ring-offset-[#111111] max-md:min-h-[42svh]"
        >
          <span
            id="work-contact-title"
            className="font-(--font-primary) text-[clamp(52px,7vw,104px)] leading-[0.9] tracking-[-0.045em]"
          >
            Let’s work<span className="text-[#CCFF00]">.</span>
          </span>

          <span className="mb-1 flex h-[clamp(50px,5.2vw,76px)] w-[clamp(50px,5.2vw,76px)] shrink-0 items-center justify-center rounded-full bg-[#CCFF00] text-[#111111] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45 max-md:h-12 max-md:w-12">
            <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-[42%]">
              <path d="M12 52 52 12M23 12h29v29" stroke="currentColor" strokeWidth="3" />
            </svg>
          </span>
        </Link>
      </section>
    </main>
  );
}
