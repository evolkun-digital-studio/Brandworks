import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation } from '../../routing';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MotionConfig, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { LEGAL_PAGES, legalConfig } from './legal.config';
import { useNativeMetadata } from '../../routing/context';
import { childrenToText, extractSections, fillTemplate, findTodos, formatDate, slugify } from './template';
import { useConsent } from './consent/ConsentProvider';

const EASE = [0.22, 1, 0.36, 1];
const HEADER_OFFSET = 112; // px; matches scroll-mt-28 on headings. Adjust to your fixed navbar height.

const link =
  'underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';

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
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

function SectionList({ sections, active, onNavigate }) {
  return (
    <ol className="space-y-2.5 text-[15px] leading-snug">
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
              className={`flex gap-3 py-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                isActive ? 'font-semibold text-black' : 'text-black/55 hover:text-black'
              }`}
            >
              <span className="w-5 shrink-0 tabular-nums">{section.number}</span>
              <span>{section.title}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function useMarkdownComponents(sections) {
  const { openPreferences } = useConsent();

  return useMemo(() => {
    const numbers = Object.fromEntries(sections.map((s) => [s.id, s.number]));

    return {
      h2: ({ children }) => {
        const id = slugify(childrenToText(children));
        return (
          <h2
            id={id}
            tabIndex={-1}
            className="font-primary mt-20 mb-6 flex scroll-mt-28 gap-4 text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.05] outline-none first:mt-0"
          >
            <span className="tabular-nums text-black/35">{numbers[id]}</span>
            <span>{children}</span>
          </h2>
        );
      },
      h3: ({ children }) => <h3 className="mt-10 mb-3 text-lg font-semibold">{children}</h3>,
      p: ({ children }) => <p className="mb-5">{children}</p>,
      ul: ({ children }) => <ul className="mb-6 list-disc space-y-2 pl-5 marker:text-black">{children}</ul>,
      ol: ({ children }) => <ol className="mb-6 list-decimal space-y-2 pl-5">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      code: ({ children }) => (
        <code className="whitespace-nowrap bg-black/[0.05] px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
      ),
      a: ({ href = '', children }) => {
        if (href === '#cookie-settings') {
          return (
            <button type="button" onClick={openPreferences} className={link}>
              {children}
            </button>
          );
        }
        if (href.startsWith('/')) {
          return (
            <Link to={href} className={link}>
              {children}
            </Link>
          );
        }
        if (href.startsWith('#')) {
          return (
            <a
              href={href}
              className={link}
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
          <a href={href} className={`${link} break-words`}>
            {children}
          </a>
        );
      },
      table: ({ children }) => (
        // Scrolls sideways on small screens; tabIndex lets keyboard users scroll it too.
        <div className="-mx-4 mb-8 mt-2 overflow-x-auto px-4" tabIndex={0} role="region" aria-label="Table">
          <table className="w-full min-w-[34rem] border-collapse text-[15px] leading-normal">{children}</table>
        </div>
      ),
      th: ({ children }) => (
        <th className="border-b border-black py-3 pr-6 text-left align-bottom font-semibold last:pr-0">{children}</th>
      ),
      td: ({ children }) => <td className="border-b border-black/15 py-3 pr-6 align-top last:pr-0">{children}</td>,
    };
  }, [sections, openPreferences]);
}

/**
 * Shared layout for the legal pages.
 * `source` is the raw markdown from ./content, filled with values from legal.config.js.
 */
export default function LegalPage({ title, description, path, source, lastUpdated, contactHeading, contactEmail }) {
  const nativeMetadata = useNativeMetadata();
  const { hash } = useLocation();
  const markdown = useMemo(() => fillTemplate(source), [source]);
  const sections = useMemo(() => extractSections(markdown), [markdown]);
  const active = useActiveSection(sections.map((s) => s.id));
  const components = useMarkdownComponents(sections);
  const [menuOpen, setMenuOpen] = useState(false);
  const todos = import.meta.env.DEV ? findTodos(legalConfig) : [];
  const { brandName } = legalConfig.company;

  // Jump to a section when the page is opened with a #hash.
  useEffect(() => {
    if (!hash) return undefined;
    const timer = window.setTimeout(() => scrollToSection(decodeURIComponent(hash.slice(1))), 100);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <MotionConfig reducedMotion="user">
      {/* React 19 moves these into <head>. */}
      {!nativeMetadata && <>
        <title>{`${title} | ${brandName}`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${legalConfig.siteUrl}${path}`} />
      </>}

      <main className="font-secondary bg-white text-black">
        <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-8 lg:px-12">
          <header className="pb-12 pt-32 md:pb-16 md:pt-44">
            <nav aria-label="Legal pages" className="mb-10 md:mb-14">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
                {LEGAL_PAGES.map((page) => (
                  <li key={page.path}>
                    <NavLink
                      to={page.path}
                      end
                      className={({ isActive }) =>
                        `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                          isActive
                            ? 'underline decoration-2 underline-offset-[6px]'
                            : 'text-black/55 transition-colors hover:text-black'
                        }`
                      }
                    >
                      {page.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* The mask reveals the title once on load. Bottom padding keeps descenders (y, p) inside the mask. */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
                className="font-primary pb-[0.16em] text-[clamp(3.25rem,10vw,9.5rem)] leading-[0.92] tracking-[-0.02em]"
              >
                {title}
              </motion.h1>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-5 text-[15px] text-black/60"
            >
              Last updated <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
            </motion.p>
          </header>

          <div className="border-t border-black lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-24">
            <aside className="lg:pt-14">
              {/* Small screens: collapsible list */}
              <div className="border-b border-black/15 lg:hidden">
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="legal-sections-mobile"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex w-full items-center justify-between py-5 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-black"
                >
                  On this page
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-5 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
                    strokeWidth={1.75}
                  />
                </button>
                <div id="legal-sections-mobile" hidden={!menuOpen} className="pb-6">
                  {/* Collapse the list before scrolling, or the scroll target shifts. */}
                  <SectionList sections={sections} active={active} onNavigate={() => flushSync(() => setMenuOpen(false))} />
                </div>
              </div>

              {/* Large screens: sticky list */}
              <nav aria-label="On this page" className="sticky top-28 hidden lg:block">
                <p className="mb-5 text-[15px] font-semibold">On this page</p>
                <SectionList sections={sections} active={active} />
              </nav>
            </aside>

            <article className="max-w-[68ch] pb-24 pt-10 text-[17px] leading-[1.75] lg:pt-14 [&>p:first-of-type]:text-[1.25rem] [&>p:first-of-type]:leading-[1.6]">
              {todos.length > 0 && (
                <div role="note" className="mb-12 border border-black bg-[#FFF3B0] p-5 text-[15px] leading-relaxed">
                  <p className="font-semibold">Fill these in src/pages/legal/legal.config.js before launch</p>
                  <p className="mt-1 text-black/70">This box only appears on the dev server.</p>
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

          <section className="border-t border-black py-16 md:py-24">
            <h2 className="font-primary text-[clamp(2rem,5vw,3.75rem)] leading-none">{contactHeading}</h2>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-8 inline-block break-all text-xl underline decoration-1 underline-offset-[6px] hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black md:text-3xl"
            >
              {contactEmail}
            </a>
          </section>
        </div>
      </main>
    </MotionConfig>
  );
}
