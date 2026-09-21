import brandVideo from './assets/Brand1.mp4'
import titleVideo from './assets/ForWebsite.mp4'
import LazyBackgroundVideo from './LazyBackgroundVideo'
import { trackEvent } from './analytics/analytics'
import { AnalyticsEvents } from './analytics/events'

function Hero() {
  return (
    <main className="flex flex-col items-center bg-white px-4 pt-10 pb-6 text-center sm:pt-14 sm:pb-8 lg:pt-20 lg:pb-10">
      <h1 className="sr-only">BRANDWORKS</h1>

      {/* Visible the instant the page paints — the only video loaded
         eagerly (Phase 11, Part 3). Smallest of the three files
         (~1.8MB) and decorative, so it's still not treated as LCP
         (no poster is set, which keeps it outside the LCP element
         candidates entirely — see the Phase 11 report). */}
      <div className="-mx-4 h-[420px] w-[calc(100%+2rem)] overflow-hidden rounded-[8px] bg-neutral-100">
        <LazyBackgroundVideo
          src={titleVideo}
          priority
          className="h-full w-full scale-100 object-cover invert brightness-70 contrast-125"
        />
      </div>

      <p className="site-copy mt-4 w-[620px] max-w-full text-center text-neutral-500 sm:mt-6">
        We help brands build a stronger presence through strategic brand
        identity, social media, content, marketing, development and SEO.
      </p>

      <a
        href="#"
        onClick={() => trackEvent({ name: AnalyticsEvents.contactCtaClick, params: { source: 'hero' } })}
        className="mt-5 flex h-[40px] min-w-[156px] items-center justify-center gap-[8px] rounded-[2px] border border-neutral-900 bg-neutral-900 p-[12px] opacity-100 transition-opacity hover:opacity-85 sm:mt-5"
      >
        <span className="site-ui flex items-center justify-center whitespace-nowrap text-white uppercase">
          Start a project
        </span>
      </a>

      {/* Straddles the fold on most viewports and is the largest
         video on the homepage after Brand2 (~12.9MB) — deferred until
         it's about to scroll into view rather than loaded eagerly
         (Phase 11, Part 3/4). */}
      <div className="mt-15 h-[806px] w-[1417px] max-w-[calc(100%-24px)] overflow-hidden rounded-[8px] bg-neutral-100 sm:mt-16">
        <LazyBackgroundVideo
          src={brandVideo}
          className="h-full w-full object-cover opacity-100"
        />
      </div>
    </main>
  )
}

export default Hero
