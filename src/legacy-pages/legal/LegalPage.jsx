import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation } from '../../routing';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MotionConfig, motion } from 'motion/react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { LEGAL_PAGES, legalConfig } from './legal.config';
import { useNativeMetadata } from '../../routing/context';
import { childrenToText, extractSections, fillTemplate, findTodos, formatDate, slugify } from './template';
import { useConsent } from './consent/ConsentProvider';

const EASE = [0.22, 1, 0.36, 1];
const HEADER_OFFSET = 112; // px; matches scroll-mt-28 on headings. Adjust to your fixed navbar height.

/*
 * Typography follows the homepage (src/Home.css, src/components/Faq/FAQs.css):
 * Google Sans Flex at weight 400 with tight tracking for headings, Open Sans
 * for reading copy, #111 ink with a 0.64 muted tint, soft #f5f5f5 cards with
 * a #e5e5e5 hairline, and the lime accent used only as a marker, never text.
 */
const heading = 'font-[family-name:var(--section-title-font)] font-normal text-(--ink)';
const muted = 'text-(--ink-muted)';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)';
const link = `underline decoration-black/30 decoration-1 underline-offset-4 transition-colors hover:decoration-(--ink) ${focusRing}`;

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.lenis?.scrollTo) {
    window.lenis.scrollTo(target, { offset: -HEADER_OFFSET, immediate: reduceMotion });
  } else {
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
  target.focus({ preventScroll: true });
  window.history.replaceState(window.history.state, '', `#${id}`);
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join('|');

  useEffect(() => {
    const headings = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!headings.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [key]);

  return active;
}


function SectionList({ sections, active, onNavigate }) {
  return (
    <ol className="grid gap-0.5 text-[15px] leading-snug">
      {sections.map((section) => {
        const isActive = section.id === active;
        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={isActive ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.();
                scrollToSection(section.id);
              }}
              className={`relative flex gap-3 rounded-lg py-1.5 pl-4 pr-2 transition-colors ${focusRing} ${
                isActive ? 'bg-[#f5f5f5] text-(--ink)' : `${muted} hover:text-(--ink)`
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute left-1.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-bw-lime transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <span>{section.title}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function useMarkdownComponents() {
  const { openPreferences } = useConsent();

  return useMemo(() => {

    return {
      h2: ({ children }) => {
        const id = slugify(childrenToText(children));
        return (
          <h2
            id={id}
            tabIndex={-1}
            className={`${heading} mt-16 mb-5 scroll-mt-28 border-t border-[#e5e5e5] pt-8 text-[clamp(26px,2.6vw,36px)] leading-[1.1] tracking-[-0.015em] text-balance outline-none first:mt-0 first:border-t-0 first:pt-0 md:mt-20`}
          >
            {children}
          </h2>
        );
      },
      h3: ({ children }) => (
        <h3 className={`${heading} mt-10 mb-4 text-[20px] leading-snug tracking-[-0.01em]`}>{children}</h3>
      ),
      p: ({ children }) => <p className="mb-5 text-pretty">{children}</p>,
      ul: ({ children }) => (
        <ul className="mb-7 grid gap-2.5 pl-0 [&>li]:relative [&>li]:pl-6 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.72em] [&>li]:before:size-1.5 [&>li]:before:rounded-full [&>li]:before:bg-(--ink) [&>li]:before:content-['']">
          {children}
        </ul>
      ),
      ol: ({ children }) => <ol className="mb-7 grid list-decimal gap-2.5 pl-5">{children}</ol>,
      li: ({ children }) => <li className="text-pretty">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-(--ink)">{children}</strong>,
      code: ({ children }) => (
        <code className="whitespace-nowrap rounded bg-[#f5f5f5] px-1.5 py-0.5 font-mono text-[0.85em] text-(--ink)">
          {children}
        </code>
      ),
      a: ({ href = '', children }) => {
        if (href === '#cookie-settings') {
          return (
            <button type="button" onClick={openPreferences} className={`${link} text-(--ink)`}>
              {children}
            </button>
          );
        }
        if (href.startsWith('/')) {
          return (
            <Link to={href} className={`${link} text-(--ink)`}>
              {children}
            </Link>
          );
        }
        if (href.startsWith('#')) {
          return (
            <a
              href={href}
              className={`${link} text-(--ink)`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(href.slice(1));
              }}
            >
              {children}
            </a>
          );
        }
        return (
          <a href={href} className={`${link} break-words text-(--ink)`}>
            {children}
          </a>
        );
      },
      table: ({ children }) => (
        // Scrolls sideways on small screens; tabIndex lets keyboard users scroll it too.
        <div
          className={`mb-8 mt-2 overflow-x-auto rounded-xl border border-[#e5e5e5] ${focusRing}`}
          tabIndex={0}
          role="region"
          aria-label="Table"
        >
          <table className="w-full min-w-[36rem] border-collapse text-[15px] leading-normal">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-[#f5f5f5]">{children}</thead>,
      th: ({ children }) => (
        <th className="border-b border-[#e5e5e5] px-4 py-3 text-left align-bottom text-[13px] font-semibold uppercase tracking-[0.06em] text-(--ink)">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border-b border-[#e5e5e5] px-4 py-3.5 align-top [tr:last-child_&]:border-b-0">{children}</td>
      ),
    };
  }, [openPreferences]);
}

/**
 * Shared layout for the legal pages.
 * `source` is the raw markdown from ./content, filled with values from legal.config.js.
 */
export default function LegalPage({
  title,
  description,
  path,
  source,
  lastUpdated,
  contactHeading,
  contactEmail,
  summary = [],
  laws = [],
}) {
  const nativeMetadata = useNativeMetadata();
  const { hash } = useLocation();
  // The consent config includes tracking IDs set in the CMS, so the cookie policy lists them.
  const { config } = useConsent();
  const markdown = useMemo(() => fillTemplate(source, config), [source, config]);
  const sections = useMemo(() => extractSections(markdown), [markdown]);
  const active = useActiveSection(sections.map((s) => s.id));
  const components = useMarkdownComponents();
  const [menuOpen, setMenuOpen] = useState(false);
  const todos = process.env.NODE_ENV === 'development' ? findTodos(legalConfig) : [];
  const { brandName } = legalConfig.company;
  const readingMinutes = Math.max(1, Math.round(markdown.split(/\s+/).length / 230));

  // Jump to a section when the page is opened with a #hash.
  useEffect(() => {
    if (!hash) return undefined;
    const timer = window.setTimeout(() => scrollToSection(decodeURIComponent(hash.slice(1))), 100);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <MotionConfig reducedMotion="user">
      {/* React 19 moves these into <head>. */}
      {!nativeMetadata && (
        <>
          <title>{`${title} | ${brandName}`}</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={`${legalConfig.siteUrl}${path}`} />
        </>
      )}

      <main className="legal-page font-secondary overflow-x-clip bg-white text-(--ink-muted) [--font-primary:var(--section-title-font)]">
        <div className="mx-auto w-full max-w-(--page-max-width) px-(--page-gutter)">
          {/* ---------------------------------------------------------- header */}
          <header className="pb-12 pt-32 md:pb-16 md:pt-44">
            <nav aria-label="Legal pages" className="mb-10 md:mb-14">
              <ul className="inline-flex max-w-full gap-0.5 rounded-full border border-[#e5e5e5] bg-[#f5f5f5] p-1">
                {LEGAL_PAGES.map((page) => (
                  <li key={page.path}>
                    <NavLink
                      to={page.path}
                      end
                      className={({ isActive }) =>
                        `inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-[13px] transition-colors sm:px-4 sm:text-[14px] ${focusRing} ${
                          isActive
                            ? 'bg-white text-(--ink) shadow-[0_1px_2px_rgba(23,23,23,0.08)]'
                            : `${muted} hover:text-(--ink)`
                        }`
                      }
                    >
                      {page.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <p className="mb-5 flex items-center gap-2.5 text-[13px] uppercase tracking-[0.14em] text-(--ink)">
              <span aria-hidden="true" className="size-2 rounded-full bg-bw-lime ring-1 ring-black/10" />
              Legal
            </p>

            {/* The mask reveals the title once on load. Bottom padding keeps descenders inside the mask. */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
                className={`${heading} pb-[0.12em] text-[clamp(44px,7vw,96px)] leading-[0.98] tracking-[-0.035em]`}
              >
                {title}
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
              className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
            >
              <p className="max-w-[46ch] text-[18px] leading-[1.6] text-pretty md:text-[20px]">{description}</p>
              <dl className="flex flex-wrap gap-x-8 gap-y-3 text-[14px]">
                <div>
                  <dt className={muted}>Last updated</dt>
                  <dd className="mt-1 text-(--ink)">
                    <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
                  </dd>
                </div>
                <div>
                  <dt className={muted}>Reading time</dt>
                  <dd className="mt-1 text-(--ink)">{readingMinutes} min</dd>
                </div>
              </dl>
            </motion.div>

            {laws.length > 0 && (
              <motion.ul
                aria-label="Laws this page follows"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="mt-8 flex flex-wrap gap-2"
              >
                {laws.map((law) => (
                  <li
                    key={law}
                    className="inline-flex h-8 items-center rounded-full border border-[#e5e5e5] px-3.5 text-[13px] text-(--ink)"
                  >
                    {law}
                  </li>
                ))}
              </motion.ul>
            )}
          </header>

          {/* ------------------------------------------------------ at a glance */}
          {summary.length > 0 && (
            <section aria-labelledby="legal-summary-heading" className="pb-16 md:pb-24">
              <h2
                id="legal-summary-heading"
                className={`${heading} mb-6 text-[clamp(22px,2vw,28px)] leading-tight tracking-[-0.015em]`}
              >
                At a glance
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
                {summary.map((item, index) => (
                  <motion.li
                    key={item.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10% 0px' }}
                    transition={{ delay: index * 0.06, duration: 0.6, ease: EASE }}
                    className="flex flex-col rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] p-5 md:p-6"
                  >
                    <span aria-hidden="true" className="size-2 rounded-full bg-bw-lime ring-1 ring-black/10" />
                    <h3 className={`${heading} mt-8 text-[20px] leading-tight tracking-[-0.015em] md:mt-14`}>
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.55]">{item.text}</p>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}

          {/* ------------------------------------------------------------- body */}
          <div className="border-t border-[#e5e5e5] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-28">
            <aside className="lg:pt-16">
              {/* Small screens: collapsible list */}
              <div className="mt-6 rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] lg:hidden">
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="legal-sections-mobile"
                  onClick={() => setMenuOpen((open) => !open)}
                  className={`flex w-full items-center justify-between px-5 py-4 text-[15px] text-(--ink) ${focusRing}`}
                >
                  <span>
                    On this page <span className={`ml-1 tabular-nums ${muted}`}>({sections.length})</span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-5 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
                    strokeWidth={1.75}
                  />
                </button>
                <div id="legal-sections-mobile" hidden={!menuOpen} className="px-2 pb-4">
                  {/* Collapse the list before scrolling, or the scroll target shifts. */}
                  <SectionList sections={sections} active={active} onNavigate={() => flushSync(() => setMenuOpen(false))} />
                </div>
              </div>

              {/* Large screens: sticky list */}
              <nav aria-label="On this page" className="sticky top-28 hidden max-h-[calc(100svh-8rem)] overflow-y-auto pb-8 lg:block">
                <p className="mb-4 pl-4 text-[13px] uppercase tracking-[0.14em] text-(--ink)">On this page</p>
                <SectionList sections={sections} active={active} />
              </nav>
            </aside>

            <article className="max-w-[70ch] pb-24 pt-12 text-[17px] leading-[1.75] md:text-[18px] lg:pt-16 [&>p:first-of-type]:text-[19px] [&>p:first-of-type]:leading-[1.6] [&>p:first-of-type]:text-(--ink) md:[&>p:first-of-type]:text-[21px]">
              {todos.length > 0 && (
                <div role="note" className="mb-12 rounded-xl border border-black/20 bg-[#FFF3B0] p-5 text-[15px] leading-relaxed text-(--ink)">
                  <p className="font-semibold">Fill these in src/legacy-pages/legal/legal.config.js before launch</p>
                  <p className="mt-1 opacity-70">This box only appears on the dev server.</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 font-mono text-[13px]">
                    {todos.map((todo) => (
                      <li key={todo}>{todo}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Markdown remarkPlugins={[remarkGfm]} components={components}>
                {markdown}
              </Markdown>
            </article>
          </div>

          {/* ---------------------------------------------------------- contact */}
          <section aria-labelledby="legal-contact-heading" className="pb-16 md:pb-24">
            <div className="grid gap-10 rounded-[20px] bg-[#111] p-7 text-white md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-12 lg:p-16">
              <div>
                <p className="mb-5 flex items-center gap-2.5 text-[13px] uppercase tracking-[0.14em] text-white/70">
                  <span aria-hidden="true" className="size-2 rounded-full bg-bw-lime" />
                  Contact
                </p>
                <h2
                  id="legal-contact-heading"
                  className="font-[family-name:var(--section-title-font)] text-[clamp(32px,4vw,56px)] font-normal leading-[1.02] tracking-[-0.025em] text-balance"
                >
                  {contactHeading}
                </h2>
                <p className="mt-4 max-w-[48ch] text-[16px] leading-[1.6] text-white/70 md:text-[17px]">
                  Write to us and someone from the studio will reply personally. No forms, no bots.
                </p>
              </div>
              <a
                href={`mailto:${contactEmail}`}
                className="group inline-flex h-14 max-w-full items-center gap-3 justify-self-start rounded-full bg-bw-lime pl-6 pr-2 text-[16px] font-medium text-black transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span className="truncate">{contactEmail}</span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-white transition-transform group-hover:rotate-45">
                  <ArrowUpRight aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
              </a>
            </div>
          </section>
        </div>
      </main>
    </MotionConfig>
  );
}
