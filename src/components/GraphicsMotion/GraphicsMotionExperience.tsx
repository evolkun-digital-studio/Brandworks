import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import { creativeProductionMedia } from "../../data/creativeProductionMedia";

import PeopleScene from "./scenes/PeopleScene";
import ScreenTransition from "./scenes/ScreenTransition";
import GraphicScene from "./scenes/GraphicScene";
import MotionScene from "./scenes/MotionScene";
import CodeScene from "./scenes/CodeScene";
import CreativeWall from "./scenes/CreativeWall";
import EndingScene from "./scenes/EndingScene";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type SceneMap = {
  intro: HTMLElement | null;
  people: HTMLElement | null;
  monitor: HTMLElement | null;
  graphic: HTMLElement | null;
  motion: HTMLElement | null;
  code: HTMLElement | null;
  wall: HTMLElement | null;
  ending: HTMLElement | null;
};

const STAGE =
  "mx-auto h-full w-full max-w-[1760px] px-[clamp(20px,4vw,80px)] py-[clamp(24px,5vh,72px)]";

/**
 * --------------------------------------------------------
 * DEPTH SYSTEM
 * --------------------------------------------------------
 *
 * active = current foreground slide
 * back   = previous slide
 * deep   = 2+ layers behind
 */

const DEPTH = {
  active: {
    filter: "blur(0px) brightness(1)",
    boxShadow: "0 32px 90px rgba(0,0,0,0.16)",
  },

  back: {
    filter: "blur(8px) brightness(0.68)",
    boxShadow: "0 42px 120px rgba(0,0,0,0.34)",
  },

  deep: {
    filter: "blur(12px) brightness(0.52)",
    boxShadow: "0 55px 150px rgba(0,0,0,0.40)",
  },
} as const;

export default function GraphicsMotionExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const media = creativeProductionMedia;

  useGSAP(
    () => {
      const section = sectionRef.current;
      const canvas = canvasRef.current;

      if (!section || !canvas) return;

      const getLayer = (name: string) =>
        canvas.querySelector(`[data-layer="${name}"]`) as HTMLElement | null;

      const scenes: SceneMap = {
        intro: getLayer("intro"),
        people: getLayer("people"),
        monitor: getLayer("monitor"),
        graphic: getLayer("graphic"),
        motion: getLayer("motion"),
        code: getLayer("code"),
        wall: getLayer("wall"),
        ending: getLayer("ending"),
      };

      const photos = Array.from(
        canvas.querySelectorAll<HTMLElement>("[data-photo]"),
      );

      const allLayers = Object.values(scenes).filter(Boolean) as HTMLElement[];

      const depthLayers = [
        scenes.monitor,
        scenes.graphic,
        scenes.motion,
        scenes.code,
        scenes.wall,
      ].filter(Boolean) as HTMLElement[];

      /**
       * REDUCED MOTION
       */

      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

      if (mediaQuery.matches) {
        gsap.set(allLayers, {
          clearProps: "all",
          autoAlpha: 0,
        });

        if (scenes.people) {
          gsap.set(scenes.people, {
            autoAlpha: 1,
          });
        }

        return;
      }

      /**
       * INITIAL STATE
       */

      gsap.set(allLayers, {
        autoAlpha: 0,
        force3D: true,
      });

      /**
       * All slides initially sharp.
       *
       * Important for reverse scrolling.
       */
      gsap.set(depthLayers, {
        ...DEPTH.active,
        force3D: true,
      });

      gsap.set(scenes.intro, {
        autoAlpha: 1,
      });

      gsap.set(scenes.people, {
        xPercent: -3,
        yPercent: 5,
        scale: 0.96,
        filter: "blur(0px) brightness(1)",
      });

      gsap.set(scenes.monitor, {
        xPercent: 8,
        yPercent: 4,
        scale: 0.86,
      });

      gsap.set(scenes.graphic, {
        xPercent: -7,
        yPercent: 4,
        scale: 0.88,
      });

      gsap.set(scenes.motion, {
        xPercent: 8,
        yPercent: -3,
        scale: 0.9,
      });

      gsap.set(scenes.code, {
        yPercent: 14,
        scale: 0.94,
      });

      gsap.set(scenes.wall, {
        yPercent: 5,
        scale: 0.95,
      });

      gsap.set(scenes.ending, {
        yPercent: 8,
      });

      if (photos.length) {
        gsap.set(photos, {
          autoAlpha: 0,
          yPercent: 5,
          scale: 0.97,
          force3D: true,
        });
      }

      /**
       * MASTER TIMELINE
       */

      const tl = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
          overwrite: "auto",
        },

        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.3,
          invalidateOnRefresh: true,
        },
      });

      /**
       * ======================================================
       * INTRO
       * ======================================================
       */

      tl.addLabel("intro", 0);

      tl.fromTo(
        "[data-intro-kicker]",
        {
          y: 18,
          autoAlpha: 0,
        },
        {
          y: 0,
          autoAlpha: 1,
          duration: 5,
          ease: "power3.out",
        },
        0,
      );

      tl.fromTo(
        "[data-intro-a]",
        {
          yPercent: 105,
        },
        {
          yPercent: 0,
          duration: 7,
          ease: "expo.out",
        },
        1,
      );

      tl.fromTo(
        "[data-intro-b]",
        {
          yPercent: 105,
        },
        {
          yPercent: 0,
          duration: 7,
          ease: "expo.out",
        },
        2.5,
      );

      tl.fromTo(
        "[data-intro-rule]",
        {
          scaleX: 0,
          transformOrigin: "left center",
        },
        {
          scaleX: 1,
          duration: 6,
        },
        4,
      );

      /**
       * ======================================================
       * PEOPLE
       * ======================================================
       */

      tl.addLabel("people", 13);

      if (scenes.people) {
        tl.to(
          scenes.people,
          {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            duration: 12,
            ease: "expo.inOut",
          },
          "people",
        );
      }

      if (photos[0]) {
        tl.to(
          photos[0],
          {
            autoAlpha: 1,
            yPercent: 0,
            scale: 1,
            duration: 8,
          },
          14,
        );
      }

      if (photos[1]) {
        tl.to(
          photos[1],
          {
            autoAlpha: 1,
            yPercent: 0,
            scale: 1,
            duration: 8,
          },
          19,
        );
      }

      if (photos[2]) {
        tl.to(
          photos[2],
          {
            autoAlpha: 1,
            yPercent: 0,
            scale: 1,
            duration: 8,
          },
          24,
        );
      }

      if (scenes.intro) {
        tl.to(
          scenes.intro,
          {
            xPercent: -4,
            yPercent: -3,
            scale: 0.93,
            autoAlpha: 0.12,
            duration: 15,
          },
          16,
        );
      }

      if (scenes.people) {
        tl.to(
          scenes.people,
          {
            scale: 1.008,
            yPercent: -0.4,
            duration: 10,
            ease: "sine.inOut",
          },
          29,
        );
      }

      /**
       * ======================================================
       * MONITOR ACTIVE
       * ======================================================
       */

      tl.addLabel("monitor", 39);

      if (scenes.monitor) {
        tl.to(
          scenes.monitor,
          {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 0.93,

            ...DEPTH.active,

            duration: 12,
            ease: "expo.inOut",
          },
          "monitor",
        );

        tl.to(
          scenes.monitor,
          {
            scale: 1,
            duration: 12,
            ease: "power3.inOut",
          },
          49,
        );
      }

      /**
       * PEOPLE moves backwards.
       */

      if (scenes.people) {
        tl.to(
          scenes.people,
          {
            xPercent: -8,
            yPercent: 4,
            scale: 0.82,
            autoAlpha: 0.36,

            filter: "blur(7px) brightness(0.72)",

            duration: 16,
          },
          42,
        );
      }

      if (scenes.monitor) {
        tl.to(
          scenes.monitor,
          {
            scale: 1.006,
            duration: 9,
            ease: "sine.inOut",
          },
          60,
        );
      }

      /**
       * ======================================================
       * GRAPHIC ACTIVE
       * ======================================================
       */

      tl.addLabel("graphic", 69);

      if (scenes.graphic) {
        tl.to(
          scenes.graphic,
          {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 1,

            ...DEPTH.active,

            duration: 13,
            ease: "expo.inOut",
          },
          "graphic",
        );

        tl.to(
          scenes.graphic,
          {
            scale: 1.006,
            duration: 10,
            ease: "sine.inOut",
          },
          81,
        );
      }

      /**
       * MONITOR goes backwards.
       *
       * Noticeable blur + strong depth shadow.
       */

      if (scenes.monitor) {
        tl.to(
          scenes.monitor,
          {
            xPercent: 13,
            yPercent: -6,
            scale: 0.76,
            autoAlpha: 0.58,

            ...DEPTH.back,

            duration: 16,
            ease: "power3.inOut",
          },
          71,
        );
      }

      if (scenes.people) {
        tl.to(
          scenes.people,
          {
            autoAlpha: 0,
            scale: 0.72,
            filter: "blur(10px) brightness(0.55)",
            duration: 10,
          },
          72,
        );
      }

      /**
       * ======================================================
       * MOTION ACTIVE
       * ======================================================
       */

      tl.addLabel("motion", 91);

      if (scenes.motion) {
        tl.to(
          scenes.motion,
          {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 1,

            ...DEPTH.active,

            duration: 14,
            ease: "expo.inOut",
          },
          "motion",
        );

        tl.to(
          scenes.motion,
          {
            scale: 1.01,
            duration: 10,
            ease: "sine.inOut",
          },
          104,
        );
      }

      /**
       * GRAPHIC goes backwards.
       */

      if (scenes.graphic) {
        tl.to(
          scenes.graphic,
          {
            xPercent: -12,
            yPercent: 6,
            scale: 0.76,
            autoAlpha: 0.55,

            ...DEPTH.back,

            duration: 16,
            ease: "power3.inOut",
          },
          93,
        );
      }

      /**
       * MONITOR goes DEEP behind Graphic.
       */

      if (scenes.monitor) {
        tl.to(
          scenes.monitor,
          {
            yPercent: -13,
            xPercent: 18,
            scale: 0.56,
            autoAlpha: 0.22,

            ...DEPTH.deep,

            duration: 15,
            ease: "power3.inOut",
          },
          95,
        );
      }

      /**
       * ======================================================
       * CODE ACTIVE
       * ======================================================
       */

      tl.addLabel("code", 115);

      if (scenes.code) {
        tl.to(
          scenes.code,
          {
            autoAlpha: 1,
            yPercent: 0,
            scale: 1,

            ...DEPTH.active,

            duration: 14,
            ease: "expo.inOut",
          },
          "code",
        );

        tl.to(
          scenes.code,
          {
            scale: 1.004,
            duration: 10,
            ease: "sine.inOut",
          },
          128,
        );
      }

      /**
       * MOTION moves backward.
       */

      if (scenes.motion) {
        tl.to(
          scenes.motion,
          {
            xPercent: 8,
            yPercent: -8,
            scale: 0.77,
            autoAlpha: 0.56,

            ...DEPTH.back,

            duration: 16,
            ease: "power3.inOut",
          },
          117,
        );
      }

      /**
       * GRAPHIC goes deeper.
       */

      if (scenes.graphic) {
        tl.to(
          scenes.graphic,
          {
            xPercent: -17,
            yPercent: -8,
            scale: 0.61,
            autoAlpha: 0.25,

            ...DEPTH.deep,

            duration: 15,
            ease: "power3.inOut",
          },
          119,
        );
      }

      /**
       * ======================================================
       * CREATIVE WALL ACTIVE
       * ======================================================
       */

      tl.addLabel("wall", 139);

      if (scenes.wall) {
        tl.to(
          scenes.wall,
          {
            autoAlpha: 1,
            yPercent: 0,
            scale: 1,

            ...DEPTH.active,

            duration: 15,
            ease: "expo.inOut",
          },
          "wall",
        );

        tl.to(
          scenes.wall,
          {
            scale: 1.006,
            yPercent: -0.4,
            duration: 12,
            ease: "sine.inOut",
          },
          153,
        );
      }

      /**
       * CODE moves backwards.
       */

      if (scenes.code) {
        tl.to(
          scenes.code,
          {
            yPercent: 8,
            scale: 0.75,
            autoAlpha: 0.5,

            ...DEPTH.back,

            duration: 16,
            ease: "power3.inOut",
          },
          142,
        );

        /**
         * Only disappear AFTER depth effect is clearly visible.
         */
        tl.to(
          scenes.code,
          {
            yPercent: 12,
            scale: 0.66,
            autoAlpha: 0,

            filter: "blur(12px) brightness(0.48)",

            duration: 10,
          },
          155,
        );
      }

      /**
       * MOTION becomes deep background.
       */

      if (scenes.motion) {
        tl.to(
          scenes.motion,
          {
            xPercent: 17,
            yPercent: -12,
            scale: 0.62,
            autoAlpha: 0.25,

            ...DEPTH.deep,

            duration: 16,
            ease: "power3.inOut",
          },
          142,
        );

        tl.to(
          scenes.motion,
          {
            autoAlpha: 0,
            duration: 8,
          },
          157,
        );
      }

      /**
       * GRAPHIC disappears furthest back.
       */

      if (scenes.graphic) {
        tl.to(
          scenes.graphic,
          {
            xPercent: -22,
            yPercent: -13,
            scale: 0.53,
            autoAlpha: 0,

            filter: "blur(14px) brightness(0.42)",
            boxShadow: "0 60px 170px rgba(0,0,0,0.42)",

            duration: 15,
          },
          142,
        );
      }

      if (scenes.monitor) {
        tl.to(
          scenes.monitor,
          {
            autoAlpha: 0,
            duration: 10,
          },
          143,
        );
      }

      /**
       * ======================================================
       * ENDING
       * ======================================================
       */

      tl.addLabel("ending", 166);

      if (scenes.ending) {
        tl.to(
          scenes.ending,
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: 13,
            ease: "expo.inOut",
          },
          "ending",
        );
      }

      /**
       * WALL now moves behind final copy.
       */

      if (scenes.wall) {
        tl.to(
          scenes.wall,
          {
            scale: 0.88,
            yPercent: -3,
            autoAlpha: 0.44,

            filter: "blur(8px) brightness(0.65)",
            boxShadow: "0 45px 130px rgba(0,0,0,0.34)",

            duration: 16,
            ease: "power3.inOut",
          },
          167,
        );
      }

      if (scenes.ending) {
        tl.to(
          scenes.ending,
          {
            scale: 1.004,
            duration: 10,
            ease: "sine.inOut",
          },
          179,
        );
      }

      if (scenes.ending) {
        tl.to(
          scenes.ending,
          {
            yPercent: -3,
            duration: 8,
            ease: "power2.in",
          },
          190,
        );
      }

      if (scenes.wall) {
        tl.to(
          scenes.wall,
          {
            yPercent: -7,
            scale: 0.82,
            autoAlpha: 0.08,

            filter: "blur(12px) brightness(0.52)",

            duration: 8,
          },
          190,
        );
      }
    },
    {
      scope: sectionRef,
    },
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Graphics, motion and digital craft"
      className=" relative h-[520vh] w-full md:h-[700vh] lg:h-[900vh]"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div
          ref={canvasRef}
          className=" relative mx-auto h-full w-full max-w-[1920px] overflow-hidden "
          style={{ isolation: "isolate" }}
        >
          {/* INTRO */}

          <div
            data-layer="intro"
            className=" absolute inset-0 z-10 flex items-center px-[clamp(24px,5vw,100px)]"
          >
            <div className="mx-auto w-full max-w-[1640px]">
              <div
                data-intro-kicker
                className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-[#777]"
              >
                Graphics / Motion / Digital Craft
              </div>

              <div className="overflow-hidden">
                <div
                  data-intro-a
                  className="
                    text-[clamp(60px,9.5vw,174px)]
                    font-semibold
                    leading-[0.83]
                    tracking-[-0.06em]
                    text-[#111]
                  "
                >
                  MADE BY
                </div>
              </div>

              <div className="overflow-hidden">
                <div
                  data-intro-b
                  className="
                    ml-[7vw]
                    text-[clamp(60px,9.5vw,174px)]
                    font-light
                    leading-[0.83]
                    tracking-[-0.06em]
                    text-[#111]
                  "
                >
                  PEOPLE.
                </div>
              </div>

              <div data-intro-rule className="mt-10 h-px w-full bg-black/15" />

              <p className="mt-5 max-w-[440px] text-sm leading-[1.6] text-[#666]">
                Design, motion and technology shaped by the people making it.
              </p>
            </div>
          </div>

          {/* PEOPLE */}

          <div
            data-layer="people"
            className="absolute inset-0 z-20 opacity-0"
            style={{
              /**
               * IMPORTANT:
               * Do NOT use contain: paint.
               * It can clip the visual depth effects.
               */
              contain: "layout",
            }}
          >
            <div className={STAGE}>
              <PeopleScene media={media.people} />
            </div>
          </div>

          {/* MONITOR */}

          <div
            data-layer="monitor"
            className="
              absolute
              left-1/2
              top-1/2
              z-30

              h-[70vh]
              w-[min(80vw,1380px)]

              -translate-x-1/2
              -translate-y-1/2

              opacity-0
            "
            style={{
              contain: "layout",
            }}
          >
            {/*
              Shadow belongs to OUTER wrapper.
              Clipping belongs to INNER wrapper.
            */}

            <div className="h-full w-full overflow-hidden">
              <ScreenTransition screenImage={media.screens[0]} />
            </div>
          </div>

          {/* GRAPHIC */}

          <div
            data-layer="graphic"
            className="
              absolute
              left-[6%]
              top-1/2
              z-40

              h-[min(70vh,740px)]
              w-[min(55vw,940px)]

              -translate-y-1/2
              opacity-0
            "
            style={{
              contain: "layout",
            }}
          >
            <div className="h-full w-full overflow-hidden">
              <GraphicScene graphic={media.graphics[0]} />
            </div>
          </div>

          {/* MOTION */}

          <div
            data-layer="motion"
            className="
              absolute
              right-[5%]
              top-[12%]
              z-50

              h-[min(62vh,660px)]
              w-[min(46vw,820px)]

              opacity-0
            "
            style={{
              contain: "layout",
            }}
          >
            <div className="h-full w-full overflow-hidden">
              <MotionScene motion={media.motion[0]} />
            </div>
          </div>

          {/* CODE */}

          <div
            data-layer="code"
            className="
              absolute
              bottom-[5vh]
              left-1/2
              z-60

              h-[min(47vh,500px)]
              w-[min(82vw,1440px)]

              -translate-x-1/2
              opacity-0
            "
            style={{
              contain: "layout",
            }}
          >
            <div className="h-full w-full overflow-hidden">
              <CodeScene code={media.code} output={media.output} />
            </div>
          </div>

          {/* CREATIVE WALL */}

          <div
            data-layer="wall"
            className="
              absolute
              inset-[clamp(18px,3vw,54px)]
              z-70
              opacity-0
            "
            style={{
              contain: "layout",
            }}
          >
            <div className="h-full w-full overflow-hidden">
              <div className="mx-auto h-full w-full max-w-[1760px]">
                <CreativeWall wall={media.creativeWall} />
              </div>
            </div>
          </div>

          {/* ENDING */}

          <div
            data-layer="ending"
            className="
              absolute
              inset-0
              z-80
              flex
              items-center
              justify-center
              px-[clamp(24px,6vw,110px)]
              opacity-0
            "
          >
            <div className="mx-auto w-full max-w-[1500px]">
              <EndingScene />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
