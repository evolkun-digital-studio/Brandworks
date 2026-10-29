import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useReducedMotion } from "motion/react";
import HeroMedia from "./HeroMedia";
import HeroCaption from "./HeroCaption";
import ServiceSwitcher from "./ServiceSwitcher";
import type { HeroServiceId } from "../../data/heroServices";
import {
  DEFAULT_HERO_SERVICE,
  HERO_SERVICE_ORDER,
} from "../../data/heroServices";
import "./Hero.css";
import { onIntroSettled } from "../../lib/introGate";
// Autoplay: a random different service every 4s. The timer holds while the
// pointer is over the visual or the tabs (or a touch was just made there),
// and picks up again 3s after the pointer leaves.
const SLIDE_MS = 4000;
const RESUME_MS = 3000;
// The parts of the hero that hold the timer while pointed at or used.
const HOLD_SELECTOR = "[data-hero-hold], .hero-switcher-wrap";

/** A random service other than the current one — and, when there are more
 *  than two, other than the one shown before it. */
function pickNext(current: HeroServiceId, previous: HeroServiceId | null): HeroServiceId {
  const pool = HERO_SERVICE_ORDER.filter(
    (id) => id !== current && (HERO_SERVICE_ORDER.length <= 2 || id !== previous),
  );
  return pool[Math.floor(Math.random() * pool.length)] ?? current;
}

type IdleWindow = Window & {
  requestIdleCallback?: (
    cb: () => void,
    options?: { timeout: number },
  ) => number;

  cancelIdleCallback?: (handle: number) => void;
};

/**

 * Full-viewport cinematic hero. The service capsules switch the

 * photography behind the copy in place; Photography (the default) shows

 * an interactive two-level editorial gallery, while the other services

 * show a single full-bleed frame or film.

 * The site Header floats over it from PublicLayout.

 */

function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const holdRef = useRef({ hover: false, until: 0 });

  const previousRef = useRef<HeroServiceId | null>(null);

  // Bumped on every selection so the autoplay timer restarts from zero.
  const [slideKey, setSlideKey] = useState(0);

  const reducedMotion = useReducedMotion() ?? false;

  const [activeId, setActiveId] = useState<HeroServiceId>(DEFAULT_HERO_SERVICE);

  const [mounted, setMounted] = useState<ReadonlySet<HeroServiceId>>(
    () => new Set([DEFAULT_HERO_SERVICE]),
  );

  const [inView, setInView] = useState(true);

  const warm = useCallback((id: HeroServiceId) => {
    setMounted((current) =>
      current.has(id) ? current : new Set(current).add(id),
    );
  }, []);

  const select = useCallback(
    (id: HeroServiceId) => {
      warm(id);

      setActiveId((current) => {
        if (current !== id) previousRef.current = current;

        return id;
      });

      setSlideKey((k) => k + 1);
    },

    [warm],
  ); // The opening preloader covers the hero at first. Until it is completely
  // gone the film stays unrequested and the background warm-up waits, so
  // neither competes with the intro for bandwidth, decoding or frames.
  // The poster is already in place underneath, so the reveal never shows
  // a blank hero.

  // Start identically during SSR and hydration. The preloader's gate is
  // module-global and can only be armed in the browser, so reading it in
  // the state initializer made the first HeroMedia tree disagree in Next.
  const [introSettled, setIntroSettled] = useState(false);

  useEffect(() => onIntroSettled(() => setIntroSettled(true)), []); // Once the page has finished loading and gone quiet, fetch the other
  // services' stills in the background (never the film — that waits for
  // a click). Skipped when the visitor has asked to save data.

  useEffect(() => {
    const win = window as IdleWindow;

    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;

    if (connection?.saveData) return;

    let idleHandle: number | undefined;

    let timer: number | undefined;

    const warmAll = () =>
      setMounted((current) => new Set([...current, ...HERO_SERVICE_ORDER]));

    const schedule = () => {
      if (win.requestIdleCallback)
        idleHandle = win.requestIdleCallback(warmAll, { timeout: 3000 });
      else timer = window.setTimeout(warmAll, 1500);
    };

    const stopWaiting = onIntroSettled(() => {
      if (document.readyState === "complete") schedule();
      else window.addEventListener("load", schedule, { once: true });
    });

    return () => {
      stopWaiting();

      window.removeEventListener("load", schedule);

      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle);

      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []); // The film only plays while the hero is actually on screen.

  useEffect(() => {
    const el = sectionRef.current;

    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []); // The Social Media showcase sits above the copy rather than behind it, so
  // it needs the copy's height. The tallest caption seen at the current width
  // is kept, so switching services never resizes the showcase mid-fade.

  useEffect(() => {
    const section = sectionRef.current;

    const content = contentRef.current;

    if (!section || !content || typeof ResizeObserver === "undefined") return;

    let width = 0;

    let viewportHeight = 0;

    let reserve = 0;

    const observer = new ResizeObserver(() => {
      const rect = content.getBoundingClientRect();

      const height = rect.height;

      if (rect.width !== width || window.innerHeight !== viewportHeight) {
        width = rect.width;

        viewportHeight = window.innerHeight;

        reserve = 0;
      }

      if (height <= reserve) return;

      reserve = height;

      section.style.setProperty("--hero-content-h", `${Math.ceil(reserve)}px`);
    });

    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  // Autoplay: show each service for 4s, then move on. Paused
  // time is simply not counted. Reduced motion never autoplays.
  const playing = !reducedMotion && introSettled && inView;

  useEffect(() => {
    if (!playing) return;

    let elapsed = 0;

    let last = performance.now();

    let frame = 0;

    const tick = (now: number) => {
      const hold = holdRef.current;

      if (!hold.hover && now >= hold.until && !document.hidden) elapsed += Math.min(now - last, 100);

      last = now;

      if (elapsed >= SLIDE_MS) {
        select(pickNext(activeId, previousRef.current));

        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [playing, activeId, slideKey, select]);

  const inHold = (target: EventTarget | null) =>
    target instanceof Element && target.closest(HOLD_SELECTOR) !== null;

  const holdHandlers = {
    onPointerOver: (event: PointerEvent<HTMLElement>) => {
      if (inHold(event.target)) holdRef.current.hover = true;
    },

    onPointerOut: (event: PointerEvent<HTMLElement>) => {
      const hold = holdRef.current;

      if (!hold.hover || inHold(event.relatedTarget)) return;

      hold.hover = false;

      hold.until = performance.now() + RESUME_MS;
    },

    // Taps, drags, sliders and clicks on the visual count as using it.
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (inHold(event.target) || (event.target instanceof Element && event.target.closest(".hero-media")))
        holdRef.current.until = performance.now() + RESUME_MS;
    },
  };

  return (
    <section
      ref={sectionRef}
      className="hero"
      data-service={activeId}
      aria-labelledby="hero-heading"
      {...holdHandlers}
    >
      <HeroMedia
        activeId={activeId}
        mounted={mounted}
        inView={inView && introSettled}
        reducedMotion={reducedMotion}
      />
      <div className="hero-overlay" aria-hidden="true" />
      <div ref={contentRef} className="hero-content">
        <div className="hero-aside">
          <HeroCaption activeId={activeId} reducedMotion={reducedMotion} />
          <ServiceSwitcher
            activeId={activeId}
            onSelect={select}
            onIntent={warm}
          />
        </div>
      </div>
    </section>
  );
}

export default Hero;
