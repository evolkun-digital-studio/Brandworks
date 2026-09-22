import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FadeUp } from "./FadeUp";
import { matches } from "./lib/scrollMotion";

import photo1 from "./Photo/Photo1.jpg";
import photo2 from "./Photo/Photo2.jpg";
import photo3 from "./Photo/Photo3.jpg";

type Category = {
  image: string;
  label: string;
  alt?: string;
};

const categories: Category[] = [
  {
    image: photo1,
    label: "Brand Strategy",
  },
  {
    image: photo2,
    label: "Content & Creative",
  },
  {
    image: photo3,
    label: "Social Media & Marketing",
  },
  {
    image:
      "https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2011_56_00%20AM.png",
    label: "PR & Founder Reputation",
    alt: "Editorial founder portrait representing PR and founder reputation management",
  },
  {
    image:
      "https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2012_05_00%20PM.png",
    label: "Videography",
    alt: "Professional filmmaker operating a cinema camera",
  },
  {
    image:
      "https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2012_08_33%20PM.png",
    label: "Performance & SEO Marketing",
    alt: "Marketing strategist reviewing SEO and performance analytics",
  },
];

const CARD_COUNT = categories.length;

const STEP = 360 / CARD_COUNT;

/*
 * IMPORTANT:
 *
 * This is intentionally smaller than your old 1.15.
 * A smaller radius pulls the cards much closer together.
 */
const RADIUS_FACTOR = 1.02;

/*
 * Keep more of the cylinder visible.
 */
const VISIBLE_ANGLE = 92;
const FADE_ANGLE = 78;

/*
 * Very slow automatic drift.
 */

const AUTO_SPEED = 12;

const HOVER_SPEED_SCALE = 0.18;
const SPEED_EASE = 4.5;

const DEG_PER_PX = 0.14;

const MAX_MOMENTUM = 90;
const FRICTION = 4.1;
const SNAP_RATE = 7;

const DRAG_THRESHOLD = 6;

const MOBILE_QUERY = "(max-width: 700px)";

function normalizeAngle(angle: number) {
  return (((angle % 360) + 540) % 360) - 180;
}

type CardVisual = {
  transform: string;
  opacity: number;
  visible: boolean;
  titleOpacity: number;
  zIndex: number;
};

function placeCard(angle: number, radius: number): CardVisual {
  const normalized = normalizeAngle(angle);
  const absoluteAngle = Math.abs(normalized);

  const visible = absoluteAngle <= VISIBLE_ANGLE;

  const radians = normalized * (Math.PI / 180);

  const x = radius * Math.sin(radians);

  const z = -radius * (1 - Math.cos(radians));

  /*
   * Softer cylinder rotation.
   * Prevents side cards looking too angled.
   */
  const rotation = normalized * 0.62;

  const depth = Math.min(absoluteAngle / VISIBLE_ANGLE, 1);

  /*
   * Side cards become slightly smaller.
   * This is the key part that prevents visual overlap.
   */
  const scale = 1 - depth * 0.12;

  const edgeFade =
    absoluteAngle <= FADE_ANGLE
      ? 1
      : Math.max(
          0,
          1 - (absoluteAngle - FADE_ANGLE) / (VISIBLE_ANGLE - FADE_ANGLE),
        );

  const opacity = (1 - depth * 0.24) * edgeFade;

  const titleOpacity = Math.max(0, 1 - absoluteAngle / 42);

  const zIndex = Math.round(100 - absoluteAngle);

  return {
    transform: `
      translate3d(
        calc(-50% + ${x.toFixed(2)}px),
        -50%,
        ${z.toFixed(2)}px
      )
      rotateY(${rotation.toFixed(2)}deg)
      scale(${scale.toFixed(3)})
    `,
    opacity,
    visible,
    titleOpacity,
    zIndex,
  };
}

function useMobile() {
  const [mobile, setMobile] = useState(() => matches(MOBILE_QUERY));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mql = window.matchMedia(MOBILE_QUERY);

    const onChange = () => {
      setMobile(mql.matches);
    };

    mql.addEventListener("change", onChange);

    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return mobile;
}

type Engine = {
  stageRef: React.RefObject<HTMLDivElement | null>;

  setCardRef: (index: number) => (el: HTMLLIElement | null) => void;

  goTo: (index: number) => void;

  step: (direction: 1 | -1) => void;

  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;

  consumedDrag: () => boolean;
};

function useReel(enabled: boolean, animate: boolean): Engine {
  const stageRef = useRef<HTMLDivElement>(null);

  const cardsRef = useRef<(HTMLLIElement | null)[]>([]);

  const phase = useRef(0);

  const momentum = useRef(0);

  const target = useRef<number | null>(null);

  const speedScale = useRef(1);

  const radius = useRef(0);

  const dragging = useRef(false);

  const dragMoved = useRef(0);

  const lastX = useRef(0);

  const lastMoveAt = useRef(0);

  const velocity = useRef(0);

  const hovering = useRef(false);

  const endDrag = useRef<(() => void) | null>(null);

  const layout = useCallback(() => {
    const cards = cardsRef.current;

    for (let i = 0; i < cards.length; i += 1) {
      const el = cards[i];

      if (!el) continue;

      const visual = placeCard(i * STEP + phase.current, radius.current);

      if (!visual.visible) {
        el.style.visibility = "hidden";

        el.style.pointerEvents = "none";

        continue;
      }

      el.style.visibility = "visible";

      el.style.pointerEvents = "auto";

      el.style.transform = visual.transform;

      el.style.opacity = String(visual.opacity);

      el.style.zIndex = String(visual.zIndex);

      const overlay = el.querySelector<HTMLElement>("[data-card-overlay]");

      if (overlay) {
        overlay.style.opacity = String(visual.titleOpacity);
      }
    }
  }, []);

  const measure = useCallback(() => {
    const card = cardsRef.current.find(Boolean);

    const width = card?.offsetWidth ?? 0;

    radius.current = width * RADIUS_FACTOR;

    layout();
  }, [layout]);

  const goTo = useCallback((index: number) => {
    const delta = normalizeAngle(-index * STEP - phase.current);

    target.current = phase.current + delta;

    momentum.current = 0;
  }, []);

  const step = useCallback((direction: 1 | -1) => {
    const from = target.current ?? phase.current;

    target.current = from - direction * STEP;

    momentum.current = 0;
  }, []);

  /*
   * Measure ring on mount / resize.
   */
  useEffect(() => {
    if (!enabled) return;

    measure();

    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [enabled, measure]);

  /*
   * Animation loop
   */
  useEffect(() => {
    if (!enabled) return;

    const stage = stageRef.current;

    if (!stage) return;

    let frame = 0;
    let last = 0;
    let onScreen = true;

    let lastPhase = Number.NaN;

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              onScreen = entry.isIntersecting;

              if (!onScreen) {
                last = 0;
              }
            },
            {
              rootMargin: "120px",
            },
          );

    observer?.observe(stage);

    const onEnter = () => {
      hovering.current = true;
    };

    const onLeave = () => {
      hovering.current = false;
    };

    const onVisibility = () => {
      last = 0;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      if (document.hidden || !onScreen) {
        last = 0;
        return;
      }

      if (!last) {
        last = now;
        layout();
        return;
      }

      const dt = Math.min((now - last) / 1000, 0.05);

      last = now;

      /*
       * Snap to selected card.
       */
      if (target.current !== null) {
        const diff = target.current - phase.current;

        if (Math.abs(diff) < 0.04) {
          phase.current = target.current;

          target.current = null;
        } else {
          phase.current += diff * (1 - Math.exp(-SNAP_RATE * dt));
        }
      } else if (!dragging.current) {
        /*
         * Momentum
         */
        if (Math.abs(momentum.current) > 0.3) {
          phase.current += momentum.current * dt;

          momentum.current *= Math.exp(-FRICTION * dt);
        } else {
          momentum.current = 0;

          /*
           * Automatic drift
           */
          if (animate) {
            const wanted = hovering.current ? HOVER_SPEED_SCALE : 1;

            speedScale.current +=
              (wanted - speedScale.current) * Math.min(1, dt * SPEED_EASE);

            phase.current -= AUTO_SPEED * speedScale.current * dt;
          }
        }
      }

      /*
       * Keep values small.
       */
      if (phase.current > 360 || phase.current < -360) {
        const wrapped = phase.current % 360;

        if (target.current !== null) {
          target.current += wrapped - phase.current;
        }

        phase.current = wrapped;
      }

      if (phase.current === lastPhase) {
        return;
      }

      lastPhase = phase.current;

      layout();
    };

    stage.addEventListener("pointerenter", onEnter);

    stage.addEventListener("pointerleave", onLeave);

    document.addEventListener("visibilitychange", onVisibility);

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);

      observer?.disconnect();

      stage.removeEventListener("pointerenter", onEnter);

      stage.removeEventListener("pointerleave", onLeave);

      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, animate, layout]);

  /*
   * Drag interaction
   */
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) {
        return;
      }

      const stage = event.currentTarget;

      stage.setPointerCapture(event.pointerId);

      stage.dataset.dragging = "true";

      dragging.current = true;

      dragMoved.current = 0;

      lastX.current = event.clientX;

      lastMoveAt.current = performance.now();

      velocity.current = 0;

      target.current = null;

      momentum.current = 0;

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) {
          return;
        }

        const now = performance.now();

        const dx = moveEvent.clientX - lastX.current;

        const dt = Math.max((now - lastMoveAt.current) / 1000, 0.001);

        lastX.current = moveEvent.clientX;

        lastMoveAt.current = now;

        dragMoved.current += Math.abs(dx);

        const degrees = dx * DEG_PER_PX;

        phase.current += degrees;

        velocity.current = degrees / dt;

        layout();
      };

      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== event.pointerId) {
          return;
        }

        dragging.current = false;

        stage.dataset.dragging = "false";

        momentum.current = Math.max(
          -MAX_MOMENTUM,
          Math.min(MAX_MOMENTUM, velocity.current),
        );

        if (performance.now() - lastMoveAt.current > 120) {
          momentum.current = 0;
        }

        speedScale.current = 0;

        if (stage.hasPointerCapture(upEvent.pointerId)) {
          stage.releasePointerCapture(upEvent.pointerId);
        }

        detach();
      };

      const detach = () => {
        endDrag.current = null;

        stage.removeEventListener("pointermove", onMove);

        stage.removeEventListener("pointerup", onUp);

        stage.removeEventListener("pointercancel", onUp);
      };

      endDrag.current = detach;

      stage.addEventListener("pointermove", onMove);

      stage.addEventListener("pointerup", onUp);

      stage.addEventListener("pointercancel", onUp);
    },
    [enabled, layout],
  );

  useEffect(
    () => () => {
      endDrag.current?.();
    },
    [],
  );

  const consumedDrag = useCallback(
    () => dragMoved.current > DRAG_THRESHOLD,
    [],
  );

  const setCardRef = useCallback(
    (index: number) => (el: HTMLLIElement | null) => {
      cardsRef.current[index] = el;
    },
    [],
  );

  return {
    stageRef,
    setCardRef,
    goTo,
    step,
    onPointerDown,
    consumedDrag,
  };
}

function Services() {
  const mobile = useMobile();

  const reduce = useReducedMotion();

  const spatial = !mobile;

  const { stageRef, setCardRef, goTo, step, onPointerDown, consumedDrag } =
    useReel(spatial, !reduce);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!spatial) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <section
      id="services"
      className="
        relative
        w-full
        overflow-hidden
        bg-white
        text-[#111]
      "
    >
      {/* HEADER */}

      <div
        className="
          mx-auto
          max-w-[1800px]

          px-5
          pt-24

          sm:px-7

          md:px-10
          md:pt-32

          lg:px-12
          lg:pt-[150px]
        "
      >
        <FadeUp
          className="
            flex
            items-center
            gap-3

            font-primary

            text-[10px]
            font-medium
            uppercase

            tracking-[0.22em]

            text-black/45
          "
          duration={0.75}
          y={24}
        >
          <span
            className="
              h-px
              w-6
              bg-black/30
            "
          />
          Services
          <span
            className="
              ml-1
              text-black/25
            "
          >
            / 06
          </span>
        </FadeUp>

        <div
          className="
            mt-8

            grid
            items-end

            gap-10

            lg:grid-cols-12
            lg:gap-8
          "
        >
          <div
            className="
              lg:col-span-9
            "
          >
            <FadeUp
              as="h2"
              delay={0.08}
              duration={0.9}
              y={34}
              className="
                max-w-[12ch]

                font-primary

                text-[clamp(1.8rem,7vw,2.5rem)]

                font-medium

                leading-[0.86]

                tracking-[-0.06em]

                text-[#111]
              "
            >
              WHAT WE DO
            </FadeUp>
          </div>

          <FadeUp
            as="p"
            delay={0.17}
            duration={0.8}
            y={24}
            className="
              max-w-[360px]

              font-primary

              text-[15px]

              leading-[1.55]

              tracking-[-0.02em]

              text-black/50

              lg:col-span-3
              lg:pb-2
            "
          >
            We connect creative, reputation, content and growth into one
            coherent brand experience.
          </FadeUp>
        </div>
      </div>

      {/* CYLINDER */}

      <motion.div
        className="
          mt-12

          md:mt-14
          lg:mt-16
        "
        initial={
          reduce
            ? false
            : {
                opacity: 0,
                y: 55,
              }
        }
        whileInView={
          reduce
            ? undefined
            : {
                opacity: 1,
                y: 0,
              }
        }
        viewport={{
          once: true,
          amount: 0.12,
        }}
        transition={{
          duration: 1,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div
          ref={stageRef}
          className="
            relative

            h-[450px]
            w-full

            overflow-hidden

            cursor-grab
            select-none

            [perspective:1800px]

            md:h-[560px]

            lg:h-[620px]

            data-[dragging=true]:cursor-grabbing
          "
          onPointerDown={spatial ? onPointerDown : undefined}
          onKeyDown={onKeyDown}
          tabIndex={spatial ? 0 : -1}
          role="group"
          aria-roledescription="carousel"
          aria-label="BrandWorks services"
        >
          <ul
            className="
              relative

              m-0

              h-full
              w-full

              list-none
              p-0

              [transform-style:preserve-3d]
            "
          >
            {categories.map((category, index) => (
              <li
                key={category.label}
                ref={spatial ? setCardRef(index) : undefined}
                onClick={() => {
                  if (!spatial || consumedDrag()) {
                    return;
                  }

                  goTo(index);
                }}
                className=" group absolute  left-1/2 top-1/2 aspect-[4/5] w-[clamp(250px,24vw,380px)]  overflow-hidden bg-neutral-100 [backface-visibility:hidden] will-change-transform "
              >
                <img
                  src={category.image}
                  alt={category.alt ?? category.label}
                  loading={index === 0 ? "eager" : "lazy"}
                  draggable={false}
                  className="
                      h-full
                      w-full

                      object-cover

                      transition-transform

                      duration-700

                      ease-[cubic-bezier(0.16,1,0.3,1)]

                      group-hover:scale-[1.025]
                    "
                />

                {/* TONAL OVERLAY */}

                <div
                  aria-hidden="true"
                  className="
                      pointer-events-none

                      absolute
                      inset-0

                      bg-gradient-to-t

                      from-black/55
                      via-black/5
                      to-transparent
                    "
                />

                {/* INDEX */}

                <span
                  className="
                      absolute

                      left-5
                      top-5

                      font-primary

                      text-[10px]

                      font-medium

                      tracking-[0.18em]

                      text-white/60
                    "
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* TITLE */}

                <div
                  data-card-overlay
                  className="
                      absolute

                      inset-x-0
                      bottom-0

                      flex
                      items-end
                      justify-between

                      gap-4

                      p-5

                      transition-opacity

                      duration-300

                      md:p-6
                    "
                >
                  <h3
                    className="
                        max-w-[14ch]

                        font-primary

                        text-[clamp(1.25rem,1.7vw,1.8rem)]

                        font-medium

                        leading-[0.96]

                        tracking-[-0.045em]

                        text-white
                      "
                  >
                    {category.label}
                  </h3>

                  <span
                    aria-hidden="true"
                    className="
                        flex

                        h-8
                        w-8

                        shrink-0

                        items-center
                        justify-center

                        border
                        border-white/35

                        text-[14px]
                        text-white

                        transition-all

                        duration-500

                        ease-[cubic-bezier(0.16,1,0.3,1)]

                        group-hover:border-white
                        group-hover:bg-white
                        group-hover:text-black
                      "
                  >
                    ↗
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* CONTROLS */}

        {spatial && (
          <div
            className="
              mx-auto

              mt-6

              flex

              max-w-[1800px]

              items-center
              justify-between

              px-5

              sm:px-7
              md:px-10
              lg:px-12
            "
          >
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous service"
              className="
                group

                flex
                items-center

                gap-3

                font-primary

                text-[11px]

                uppercase

                tracking-[0.16em]

                text-black/45

                transition-colors

                hover:text-black
              "
            >
              <span
                aria-hidden="true"
                className="
                  h-px
                  w-7

                  bg-current

                  transition-all
                  duration-500

                  group-hover:w-10
                "
              />
              Previous
            </button>

            <span
              className="
                hidden

                font-primary

                text-[9px]

                uppercase

                tracking-[0.2em]

                text-black/25

                md:block
              "
            >
              Drag to explore
            </span>

            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next service"
              className="
                group

                flex
                items-center

                gap-3

                font-primary

                text-[11px]

                uppercase

                tracking-[0.16em]

                text-black/45

                transition-colors

                hover:text-black
              "
            >
              Next
              <span
                aria-hidden="true"
                className="
                  h-px
                  w-7

                  bg-current

                  transition-all
                  duration-500

                  group-hover:w-10
                "
              />
            </button>
          </div>
        )}
      </motion.div>

      {/* BOTTOM */}
    </section>
  );
}

export default Services;
