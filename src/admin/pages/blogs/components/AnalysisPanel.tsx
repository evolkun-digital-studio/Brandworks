import { AlertTriangle, Check, Info, ListChecks, X } from 'lucide-react'
import CollapsibleSection from './CollapsibleSection'
import type { AnalysisResult, CheckStatus } from '../lib/blogAnalyzer'

const STATUS_TONE: Record<CheckStatus, string> = {
  pass: 'text-a-success',
  warning: 'text-a-warning',
  fail: 'text-a-danger',
  info: 'text-a-ink-3',
}

const STATUS_ICON: Record<CheckStatus, typeof Check> = {
  pass: Check,
  warning: AlertTriangle,
  fail: X,
  info: Info,
}

function scoreColor(score: number) {
  if (score >= 70) return 'var(--a-success)'
  if (score >= 40) return 'var(--a-warning)'
  return 'var(--a-danger)'
}

/** A single circular gauge. The arc draws from the top, clockwise. */
function Ring({ label, score }: { label: string; score: number }) {
  const radius = 21
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div className="relative size-[58px]" role="img" aria-label={`${label} score ${score} out of 100`}>
        <svg viewBox="0 0 50 50" className="size-full -rotate-90">
          <circle cx="25" cy="25" r={radius} fill="none" stroke="var(--a-fill-2)" strokeWidth="4" />
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            style={{ transition: 'stroke-dashoffset 700ms var(--ease-a-spring), stroke 300ms' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold tabular-nums">{score}</span>
      </div>
      <span className="text-xs font-medium text-a-ink-2">{label}</span>
    </div>
  )
}

/** SEO, answer-engine and generative-engine scores at a glance. */
export function ScoreRings({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div>
      <div className="flex gap-2">
        <Ring label="SEO" score={analysis.seo.score} />
        <Ring label="AEO" score={analysis.aeo.score} />
        <Ring label="GEO" score={analysis.geo.score} />
      </div>
      <p className="mt-3 text-center text-xs text-a-ink-3">Live editorial guidance — not a Google score.</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-a-ink-2">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function MetricsList({ analysis }: { analysis: AnalysisResult }) {
  const { metrics } = analysis
  return (
    <div className="divide-y divide-a-line">
      <Metric label="Words" value={metrics.wordCount.toLocaleString()} />
      <Metric label="Reading time" value={`${metrics.readingTimeMinutes} min`} />
      <Metric label="Headings" value={metrics.headingCount} />
      <Metric label="Images" value={metrics.imageCount} />
      <Metric label="Links" value={`${metrics.linkCount} (${metrics.internalLinkCount} internal)`} />
      <Metric label="Readability" value={analysis.readability.label} />
    </div>
  )
}

function CheckRow({ status, label, message }: { status: CheckStatus; label: string; message: string }) {
  const Icon = STATUS_ICON[status]
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} strokeWidth={2.2} className={`mt-0.5 flex-none ${STATUS_TONE[status]}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[13px] leading-snug font-medium">{label}</p>
        <p className="text-xs leading-snug text-a-ink-2">{message}</p>
      </div>
    </li>
  )
}

/** The full checklist, schema readiness and heading warnings, one tap deeper. */
export function AnalysisDetails({ analysis }: { analysis: AnalysisResult }) {
  return (
    <CollapsibleSection title="Content analysis" icon={ListChecks} meta="Checklist">
      {analysis.checklist.map((section) => (
        <div key={section.section}>
          <h4 className="mb-1 text-xs font-semibold text-a-ink-2">{section.section}</h4>
          <ul className="m-0 list-none p-0">
            {section.items.map((item) => <CheckRow key={item.id} status={item.status} label={item.label} message={item.message} />)}
          </ul>
        </div>
      ))}

      {analysis.headingWarnings.length > 0 && (
        <div className="rounded-a bg-a-warning-soft p-3">
          <h4 className="text-xs font-semibold text-a-warning">Heading structure</h4>
          <ul className="mt-1 list-disc pl-4 text-xs text-a-warning">
            {analysis.headingWarnings.map((warning, index) => <li key={index}>{warning}</li>)}
          </ul>
        </div>
      )}

      <div>
        <h4 className="mb-1 text-xs font-semibold text-a-ink-2">Structured data readiness</h4>
        <ul className="m-0 list-none p-0">
          {analysis.schemaReadiness.map((item) => (
            <CheckRow
              key={item.type}
              status={item.status === 'ready' ? 'pass' : item.status === 'not_configured' ? 'info' : 'warning'}
              label={item.type}
              message={item.message}
            />
          ))}
        </ul>
      </div>
    </CollapsibleSection>
  )
}
