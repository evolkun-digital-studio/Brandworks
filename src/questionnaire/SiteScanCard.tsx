'use client'

import { motion, useReducedMotion } from 'motion/react'
import { SCAN_CHECKS, SCAN_DISCLAIMER, type ScanCheck, type ScanCheckState, type SiteScanView } from './api'
import AiMessage from './AiMessage'

const EASE = [0.22, 1, 0.36, 1] as const

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
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-bw-lime" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-3" fill="none"><path d="M5 12.5 10 17 19 7" stroke="#111" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    )
  }
  if (state) return <span className="grid size-5 shrink-0 place-items-center rounded-full border border-black/20 text-[11px] leading-none text-black/40" aria-hidden="true">–</span>
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#111]" aria-hidden="true">
      <span className={`size-2 rounded-full bg-bw-lime ${pending ? 'motion-safe:animate-pulse' : ''}`} />
    </span>
  )
}

/**
 * The live checklist while the site is analysed. Each line ticks off with its
 * real metric as the server reports it; a skipped or failed source says
 * "Not available" rather than disappearing or showing a guess.
 */
export function SiteScanChecklist({ domain, checks, failed, compact = false }: { domain: string; checks: ScanChecks; failed: boolean; compact?: boolean }) {
  const reduce = useReducedMotion()
  const finished = SCAN_CHECKS.every((c) => checks[c])
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={compact
        ? 'mb-8 rounded-2xl border border-black/10 px-4 py-3 lg:hidden'
        : 'mt-6 hidden max-w-[440px] rounded-2xl border border-black/10 px-4 py-4 lg:block'}
      role="status"
      aria-live="polite"
      aria-label={`Quick look at ${domain}`}
    >
      <span className={`block font-medium uppercase tracking-[0.14em] text-black/45 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {finished ? `Quick look at ${domain}` : `Taking a quick look at ${domain}…`}
      </span>
      <ul className={`m-0 list-none p-0 ${compact ? 'mt-2 flex flex-wrap gap-x-4 gap-y-1.5' : 'mt-3 space-y-2.5'}`}>
        {SCAN_CHECKS.map((check) => {
          const state = checks[check]
          const unavailable = (state && state.status !== 'ok') || (!state && failed)
          const metric = state?.status === 'ok' ? state.highlights.slice(0, compact ? 1 : 2).map((h) => `${h.label} ${h.value}${h.note ? ` (${h.note})` : ''}`).join(' · ') : ''
          return (
            <li key={check} className={`flex min-w-0 gap-2.5 ${compact ? 'items-center text-[12px]' : 'items-start text-[13px]'}`}>
              <Tick state={unavailable && !state ? { status: 'error', highlights: [] } : state} pending={!failed} />
              <span className="min-w-0 leading-[1.4]">
                <span className={state || unavailable ? 'text-black/80' : 'text-black/55'}>
                  {compact ? LABELS[check].short : LABELS[check].full}{!state && !unavailable ? '…' : ''}
                </span>
                {unavailable && <span className="ml-1.5 text-black/40">Not available</span>}
                {metric && <span className={`text-black/55 ${compact ? 'ml-1.5' : 'block'}`}>{metric}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {!compact && <p className="m-0 mt-3 text-[11px] leading-[1.5] text-black/40">{SCAN_DISCLAIMER}</p>}
    </motion.div>
  )
}

/** Thank-you screen card: the teaser, up to four real metrics and the disclaimer. */
export function SiteScanCard({ scan, timedOut }: { scan: SiteScanView; timedOut: boolean }) {
  const reduce = useReducedMotion()
  if (scan.status === 'failed') return null
  const done = scan.status === 'done'
  if (done && !scan.teaser && scan.highlights.length === 0) return null

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      aria-label={`Quick look at ${scan.domain}`}
      className="mt-6 rounded-2xl border border-black/15 p-5 sm:p-8"
    >
      <h3 className="m-0 font-(--font-primary) text-[clamp(22px,2.2vw,30px)] font-normal leading-[1.05] tracking-[-0.03em]">
        Quick look at {scan.domain}
      </h3>

      {!done && !timedOut && <AiMessage label="Analysing your site" text={null} className="mt-6" />}
      {!done && timedOut && (
        <p className="m-0 mt-4 max-w-[52ch] text-[15px] leading-[1.6] text-black/60">
          We’re still analysing your site. The full report will come with our reply.
        </p>
      )}

      {done && (
        <>
          {/* A data-only summary is labelled as such, not as a BrandWorks (AI) message. */}
          {scan.teaser && <AiMessage label={scan.teaserAi ? 'BrandWorks' : 'From the data'} text={scan.teaser} className="mt-6" />}
          {scan.highlights.length > 0 && (
            <ul className="m-0 mt-7 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-4">
              {scan.highlights.map((h) => (
                <li key={h.label} className="flex min-w-0 flex-col justify-between rounded-2xl border border-black/10 p-3.5 sm:p-4">
                  <span className="block text-[11px] leading-[1.35] text-black/50 sm:text-[12px]">{h.label}</span>
                  <span className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[22px] leading-none tracking-[-0.03em] tabular-nums sm:text-[24px]">{h.value}</span>
                    {h.note && <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-black/60">{h.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 mt-5 text-[12px] leading-[1.6] text-black/45">{scan.disclaimer || SCAN_DISCLAIMER}</p>
        </>
      )}
    </motion.section>
  )
}
