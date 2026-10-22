'use client'

import { SCAN_CHECKS, SCAN_DISCLAIMER, type ScanCheck, type ScanCheckState, type SiteScanView } from './api'

const LABELS: Record<ScanCheck, { full: string; short: string }> = {
  onPage: { full: 'Reading your homepage', short: 'Homepage' },
  performance: { full: 'Checking speed on mobile', short: 'Mobile speed' },
  authority: { full: 'Backlinks & authority', short: 'Authority' },
  traffic: { full: 'Search traffic estimate', short: 'Traffic' },
  analysis: { full: 'Writing insights', short: 'Insights' },
}

export type ScanChecks = Partial<Record<ScanCheck, ScanCheckState>>

function Tick({ state, pending }: { state?: ScanCheckState; pending: boolean }) {
  if (state?.status === 'ok') {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-(--q-accent)" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-3" fill="none"><path d="M5 12.5 10 17 19 7" stroke="#111" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    )
  }
  if (state) return <span className="grid size-5 shrink-0 place-items-center rounded-full border border-(--q-line) text-[11px] leading-none text-(--q-muted)" aria-hidden="true">–</span>
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-(--q-ink)" aria-hidden="true">
      <span className={`size-2 rounded-full bg-(--q-accent) ${pending ? 'motion-safe:animate-pulse' : ''}`} />
    </span>
  )
}

/**
 * The live checklist while the site is analysed, shown in the Answers drawer.
 * Each line ticks off with its real metric as the server reports it; a
 * skipped or failed source says "Not available" rather than a guess.
 */
export function SiteScanChecklist({ domain, checks, failed }: { domain: string; checks: ScanChecks; failed: boolean }) {
  const finished = SCAN_CHECKS.every((c) => checks[c])
  return (
    <div className="rounded-2xl border border-(--q-line) px-4 py-4" role="status" aria-label={`Quick look at ${domain}`}>
      <span className="block text-[14px] font-semibold">
        {finished ? `Quick look at ${domain}` : `Checking ${domain}…`}
      </span>
      <ul className="m-0 mt-3 list-none space-y-2.5 p-0">
        {SCAN_CHECKS.map((check) => {
          const state = checks[check]
          const unavailable = (state && state.status !== 'ok') || (!state && failed)
          const metric = state?.status === 'ok' ? state.highlights.slice(0, 2).map((h) => `${h.label} ${h.value}${h.note ? ` (${h.note})` : ''}`).join(' · ') : ''
          return (
            <li key={check} className="flex min-w-0 items-start gap-2.5 text-[13px]">
              <Tick state={unavailable && !state ? { status: 'error', highlights: [] } : state} pending={!failed} />
              <span className="min-w-0 leading-[1.4]">
                <span>{LABELS[check].full}{!state && !unavailable ? '…' : ''}</span>
                {unavailable && <span className="ml-1.5 text-(--q-muted)">Not available</span>}
                {metric && <span className="block text-(--q-muted)">{metric}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="m-0 mt-3 text-[11px] leading-[1.5] text-(--q-muted)">{SCAN_DISCLAIMER}</p>
    </div>
  )
}

/** Thank-you screen: the teaser line, up to four real metrics (2×2) and the disclaimer. */
export function SiteScanCard({ scan, timedOut }: { scan: SiteScanView; timedOut: boolean }) {
  if (scan.status === 'failed') return null
  const done = scan.status === 'done'
  if (done && !scan.teaser && scan.highlights.length === 0) return null

  return (
    <section aria-label={`Quick look at ${scan.domain}`} className="mt-6 border-t border-(--q-line) pt-5">
      <span className="block text-[15px] font-semibold">Quick look at {scan.domain}</span>
      {!done && (
        <p className="m-0 mt-2 text-[14px] leading-[1.55] text-(--q-muted)">
          {timedOut ? 'We’re still analysing your site. The full report will come with our reply.' : 'Analysing your site…'}
        </p>
      )}
      {done && (
        <>
          {/* Plain text, not a bubble: the summary above is this screen's one AI message. */}
          {scan.teaser && <p className="m-0 mt-2 text-[15px] leading-[1.55]">{scan.teaser}</p>}
          {scan.highlights.length > 0 && (
            <dl className="m-0 mt-4 grid grid-cols-2 gap-2">
              {scan.highlights.slice(0, 4).map((h) => (
                <div key={h.label} className="min-w-0 rounded-xl bg-(--q-tint) px-3 py-2.5">
                  <dt className="text-[12px] leading-[1.35] text-(--q-muted)">{h.label}</dt>
                  <dd className="m-0 mt-1 text-[17px] font-semibold tabular-nums">
                    {h.value}{h.note && <span className="ml-1.5 text-[12px] font-normal text-(--q-muted)">{h.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="m-0 mt-3 text-[12px] leading-[1.6] text-(--q-muted)">{scan.disclaimer || SCAN_DISCLAIMER}</p>
        </>
      )}
    </section>
  )
}
