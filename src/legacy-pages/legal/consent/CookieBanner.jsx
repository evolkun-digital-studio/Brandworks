import { useEffect, useId, useRef, useState } from 'react';
import { Link, useInRouterContext } from '../../../routing';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { X } from 'lucide-react';
import { getSmoothScroll } from '../../../lib/smoothScroll';
import { useConsent } from './ConsentProvider';

const EASE = [0.22, 1, 0.36, 1];

// Every choice gets the same size and the same visibility: Reject is never
// hidden or greyed out. Only Accept / Save carries the brand green.
const button =
  'inline-flex h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[14px] font-medium leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const outlineButton = `${button} border-white/45 bg-transparent text-white hover:border-white hover:bg-white hover:text-black`;
const primaryButton = `${button} border-[#CCFF00] bg-[#CCFF00] text-black hover:border-white hover:bg-white`;
const textLink =
  'underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function PolicyLink({ children }) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <Link to="/cookie-policy" className={textLink}>
      {children}
    </Link>
  ) : (
    <a href="/cookie-policy" className={textLink}>
      {children}
    </a>
  );
}

export default function CookieBanner() {
  const { bannerOpen, preferencesOpen, acceptAll, rejectAll, openSettings } = useConsent();
  const textId = useId();
  const bannerRef = useRef(null);

  // Move keyboard and screen-reader focus to the banner when it appears, so
  // it's reachable without tabbing through the whole page. Escape does
  // nothing here: closing the banner is never taken as a choice.
  useEffect(() => {
    if (bannerOpen) bannerRef.current?.focus({ preventScroll: true });
  }, [bannerOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {bannerOpen && !preferencesOpen && (
          // Phones: a full-width bar along the bottom edge. md+: a compact
          // card bottom-left. It sits below the header layer (z 1000), so the
          // open mobile menu covers it and the hamburger is never blocked.
          <motion.section
            key="cookie-banner"
            ref={bannerRef}
            role="dialog"
            aria-label="Cookie consent"
            aria-describedby={textId}
            tabIndex={-1}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="font-secondary fixed inset-x-0 bottom-0 z-[990] rounded-t-2xl border-t border-white/15 bg-[#0b0b0b] px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.25)] outline-none md:inset-x-auto md:bottom-6 md:left-6 md:w-[420px] md:max-w-[calc(100vw-48px)] md:rounded-2xl md:border md:p-5"
          >
            <p id={textId} className="text-[14px] leading-relaxed text-white/80">
              We use cookies to improve your experience and understand how our site is used. You can accept all, reject
              non-essential cookies, or choose your preferences. <PolicyLink>Cookie policy</PolicyLink>
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={rejectAll} className={outlineButton}>
                Reject all
              </button>
              <button type="button" onClick={openSettings} className={outlineButton}>
                Customize
              </button>
              <button type="button" onClick={acceptAll} className={primaryButton}>
                Accept all
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>{preferencesOpen && <PreferencesDialog key="cookie-preferences" />}</AnimatePresence>
    </MotionConfig>
  );
}

function Switch({ checked, onChange, labelledBy, describedBy, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-55 ${
        checked ? 'border-[#CCFF00] bg-[#CCFF00]' : 'border-white/30 bg-white/10'
      }`}
    >
      <span
        aria-hidden="true"
        className={`ml-[3px] block size-5 rounded-full transition-transform duration-200 ${
          checked ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
        }`}
      />
    </button>
  );
}

function CategoryRow({ id, title, description, tools, control }) {
  return (
    <li className="flex items-start justify-between gap-6 py-5">
      <div>
        <h3 id={`${id}-title`} className="text-base font-semibold text-white">
          {title}
        </h3>
        <p id={`${id}-description`} className="mt-1 text-[14px] leading-relaxed text-white/65">
          {description}
          {tools === undefined ? '' : tools ? ` Uses ${tools}.` : ' None of these tools are active on the site right now.'}
        </p>
      </div>
      {control}
    </li>
  );
}

function PreferencesDialog() {
  const { choice, vendors, save, acceptAll, rejectAll, closePreferences } = useConsent();
  // Pre-filled with the current choice when reopened from "Cookie settings".
  const [draft, setDraft] = useState({
    analytics: Boolean(choice?.analytics),
    marketing: Boolean(choice?.marketing),
  });
  const panelRef = useRef(null);
  const headingRef = useRef(null);
  const id = useId();

  const toolsFor = (category) =>
    vendors
      .filter((v) => v.category === category)
      .map((v) => v.label)
      .join(', ');

  // Focus the dialog, lock page scroll (Lenis too), and hand focus back when it closes.
  useEffect(() => {
    const returnTo = document.activeElement;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const lenis = getSmoothScroll();
    html.style.overflow = 'hidden';
    lenis?.stop();
    headingRef.current?.focus();
    return () => {
      html.style.overflow = previousOverflow;
      lenis?.start();
      if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event) => {
    // Escape closes without saving anything.
    if (event.key === 'Escape') {
      event.stopPropagation();
      closePreferences();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll('button:not([disabled]), a[href]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePreferences();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        data-lenis-prevent
        onKeyDown={onKeyDown}
        initial={{ y: 32 }}
        animate={{ y: 0 }}
        exit={{ y: 32 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="font-secondary max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-white/15 bg-[#0b0b0b] p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-white md:max-w-lg md:rounded-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <h2 id={`${id}-heading`} ref={headingRef} tabIndex={-1} className="font-primary text-2xl leading-tight outline-none md:text-3xl">
            Cookie preferences
          </h2>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Close cookie preferences"
            className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-white/70">
          Choose which cookies we can use. You can change this at any time from Cookie settings at the bottom of every
          page. <PolicyLink>Cookie policy</PolicyLink>
        </p>

        <ul className="mt-5 divide-y divide-white/15 border-y border-white/15">
          <CategoryRow
            id={`${id}-necessary`}
            title="Necessary"
            description="Keeps the site secure and working, and remembers your cookie choice. Always on."
            control={<Switch checked disabled labelledBy={`${id}-necessary-title`} describedBy={`${id}-necessary-description`} />}
          />
          <CategoryRow
            id={`${id}-analytics`}
            title="Analytics"
            description="Shows us which pages people visit and how they found us, so we can improve the site."
            tools={toolsFor('analytics')}
            control={
              <Switch
                checked={draft.analytics}
                onChange={(analytics) => setDraft((d) => ({ ...d, analytics }))}
                labelledBy={`${id}-analytics-title`}
                describedBy={`${id}-analytics-description`}
              />
            }
          />
          <CategoryRow
            id={`${id}-marketing`}
            title="Marketing"
            description="Measures our ads and lets us show them to people who have visited this site."
            tools={toolsFor('marketing')}
            control={
              <Switch
                checked={draft.marketing}
                onChange={(marketing) => setDraft((d) => ({ ...d, marketing }))}
                labelledBy={`${id}-marketing-title`}
                describedBy={`${id}-marketing-description`}
              />
            }
          />
        </ul>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => save(draft)} className={primaryButton}>
            Save preferences
          </button>
          <button type="button" onClick={acceptAll} className={outlineButton}>
            Accept all
          </button>
          <button type="button" onClick={rejectAll} className={outlineButton}>
            Reject all
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
