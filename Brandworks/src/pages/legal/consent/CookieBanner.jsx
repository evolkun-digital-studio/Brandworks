import { useEffect, useId, useRef, useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useConsent } from './ConsentProvider';

const EASE = [0.22, 1, 0.36, 1];

const solidButton =
  'inline-flex h-11 items-center justify-center border border-black bg-black px-5 text-[15px] font-semibold text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';
const outlineButton =
  'inline-flex h-11 items-center justify-center border border-black bg-white px-5 text-[15px] font-semibold text-black transition-colors hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';
const textLink =
  'underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';

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

function bannerMessage({ analytics, marketing }) {
  if (analytics && marketing) {
    return 'We’d like to use analytics cookies to see how the site is used, and marketing cookies to measure our ads.';
  }
  if (analytics) return 'We’d like to use analytics cookies to see how the site is used.';
  return 'We’d like to use marketing cookies to measure our ads and show them to people who’ve visited this site.';
}

export default function CookieBanner() {
  const { bannerOpen, preferencesOpen, inUse, acceptAll, rejectAll, openPreferences } = useConsent();
  const titleId = useId();

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {bannerOpen && !preferencesOpen && (
          <motion.section
            key="cookie-banner"
            aria-labelledby={titleId}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="font-secondary fixed inset-x-3 bottom-3 z-[1000] border border-black bg-white p-5 text-black sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[24rem] sm:p-6"
          >
            <h2 id={titleId} className="font-primary text-2xl leading-none">
              Cookies on this site
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-black/70">
              {bannerMessage(inUse)} They stay off unless you allow them.{' '}
              <PolicyLink>Read our cookie policy</PolicyLink>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={rejectAll} className={solidButton}>
                Reject all
              </button>
              <button type="button" onClick={acceptAll} className={solidButton}>
                Accept all
              </button>
            </div>
            <button type="button" onClick={openPreferences} className={`mt-4 text-[15px] ${textLink}`}>
              Choose cookies
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>{preferencesOpen && <PreferencesDialog key="cookie-preferences" />}</AnimatePresence>
    </MotionConfig>
  );
}

function Switch({ checked, onChange, labelledBy, describedBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
        checked ? 'bg-black' : 'bg-white'
      }`}
    >
      <span
        aria-hidden="true"
        className={`ml-[3px] block size-5 rounded-full transition-transform duration-200 ${
          checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-black'
        }`}
      />
    </button>
  );
}

function CategoryRow({ id, title, description, tools, control }) {
  return (
    <li className="flex items-start justify-between gap-6 py-5">
      <div>
        <h3 id={`${id}-title`} className="text-base font-semibold">
          {title}
        </h3>
        <p id={`${id}-description`} className="mt-1 text-[14px] leading-relaxed text-black/65">
          {description}
          {tools ? ` Uses ${tools}.` : ''}
        </p>
      </div>
      {control}
    </li>
  );
}

function PreferencesDialog() {
  const { choice, inUse, vendors, save, acceptAll, rejectAll, closePreferences } = useConsent();
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

  // Focus the dialog, lock page scroll, and hand focus back when it closes.
  useEffect(() => {
    const returnTo = document.activeElement;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    window.lenis?.stop?.();
    headingRef.current?.focus();
    return () => {
      html.style.overflow = previousOverflow;
      window.lenis?.start?.();
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closePreferences();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])');
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
      className="fixed inset-0 z-[1001] flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
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
        className="font-secondary max-h-[90dvh] w-full overflow-y-auto overscroll-contain border border-black bg-white p-6 text-black sm:max-w-lg sm:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <h2 id={`${id}-heading`} ref={headingRef} tabIndex={-1} className="font-primary text-3xl leading-none outline-none">
            Cookie preferences
          </h2>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Close cookie preferences"
            className="-mr-2 -mt-2 inline-flex size-10 items-center justify-center hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-black"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-black/70">
          Choose which cookies we can use. You can change this at any time from Cookie settings at the bottom of every
          page.
        </p>

        <ul className="mt-6 divide-y divide-black/15 border-y border-black/15">
          <CategoryRow
            id={`${id}-necessary`}
            title="Necessary"
            description="Keeps the site working and remembers your cookie choice."
            control={<span className="shrink-0 pt-0.5 text-[14px] text-black/60">Always on</span>}
          />
          {inUse.analytics && (
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
          )}
          {inUse.marketing && (
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
          )}
        </ul>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={rejectAll} className={outlineButton}>
            Reject all
          </button>
          <button type="button" onClick={acceptAll} className={outlineButton}>
            Accept all
          </button>
          <button type="button" onClick={() => save(draft)} className={solidButton}>
            Save choices
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
