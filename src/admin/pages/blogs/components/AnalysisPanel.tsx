import CollapsibleSection from './CollapsibleSection'
import type { AnalysisResult, CheckStatus } from '../lib/blogAnalyzer'

const STATUS_STYLES: Record<CheckStatus, string> = {
  pass: 'text-emerald-700',
  warning: 'text-amber-700',
  fail: 'text-red-600',
  info: 'text-neutral-400',
}

const STATUS_ICON: Record<CheckStatus, string> = {
  pass: '✓',
  warning: '⚠',
  fail: '✕',
  info: 'ℹ',
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const tone = score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-red-600'
  return (
    <div className="flex flex-col items-center gap-1 rounded-[8px] border border-neutral-200 px-4 py-3">
      <span className={`text-[24px] font-semibold ${tone}`}>{score}</span>
      <span className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">{label}</span>
    </div>
  )
}

function MetricStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[15px] font-medium text-neutral-900">{value}</span>
      <span className="text-[11px] text-neutral-500">{label}</span>
    </div>
  )
}

function CheckRow({ status, label, message }: { status: CheckStatus; label: string; message: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className={`mt-[1px] w-4 shrink-0 text-center text-[13px] font-semibold ${STATUS_STYLES[status]}`} aria-hidden="true">
        {STATUS_ICON[status]}
      </span>
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-neutral-900">{label}</span>
        <span className="text-[12px] text-neutral-500">{message}</span>
      </div>
    </div>
  )
}

/**
 * Compact, always-visible score + metrics summary — meant to sit near
 * the top of the editor so it updates live as the admin types (see
 * BlogEditor.tsx's debounced analysis calculation). Never blocks
 * saving/publishing; see the disclaimer text below.
 */
export function ContentHealthSummary({ analysis }: { analysis: AnalysisResult }) {
  const { metrics } = analysis
  return (
    <div className="rounded-[12px] border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-neutral-900">Content Health</h2>
        <span className="text-[11px] text-neutral-400">Internal editorial guidance — not a Google score</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <ScoreBadge label="SEO" score={analysis.seo.score} />
        <ScoreBadge label="AEO" score={analysis.aeo.score} />
        <ScoreBadge label="GEO" score={analysis.geo.score} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-4">
        <MetricStat label="Words" value={metrics.wordCount.toLocaleString()} />
        <MetricStat label="Reading time" value={`${metrics.readingTimeMinutes} min`} />
        <MetricStat label="Headings" value={metrics.headingCount} />
        <MetricStat label="Links" value={metrics.linkCount} />
        <MetricStat label="Images" value={metrics.imageCount} />
        <MetricStat label="Paragraphs" value={metrics.paragraphCount} />
        <MetricStat label="Readability" value={analysis.readability.label} />
        <MetricStat label="TOC entries" value={analysis.toc.length} />
      </div>
    </div>
  )
}

/**
 * The detailed breakdown — checklist, TOC preview, and schema
 * readiness — kept inside a collapsed-by-default section so it
 * doesn't dominate the editor (see the always-visible summary above
 * for the at-a-glance view).
 */
export function AnalysisDetails({ analysis }: { analysis: AnalysisResult }) {
  return (
    <CollapsibleSection
      title="Content Analysis"
      description="Detailed SEO / AEO / GEO checklist, table of contents, and schema readiness."
    >
      <div>
        <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">
          Publish checklist
        </h3>
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {analysis.checklist.map((section) => (
            <div key={section.section} className="mb-4">
              <h4 className="mb-1 text-[12px] font-semibold text-neutral-700">{section.section}</h4>
              <div className="divide-y divide-neutral-50">
                {section.items.map((item) => (
                  <CheckRow key={item.id} status={item.status} label={item.label} message={item.message} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {analysis.headingWarnings.length > 0 && (
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-[12px] font-semibold text-amber-800">Heading structure warnings</h3>
          <ul className="mt-1 list-disc pl-4 text-[12px] text-amber-800">
            {analysis.headingWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">
          Table of contents (H2-H4)
        </h3>
        {analysis.toc.length === 0 ? (
          <p className="text-[13px] text-neutral-500">Not enough headings yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {analysis.toc.map((entry) => (
              <li
                key={entry.id}
                style={{ paddingLeft: `${(entry.level - 2) * 16}px` }}
                className="text-[13px] text-neutral-700"
              >
                <span className="text-neutral-400">#{entry.id}</span> {entry.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">
          Schema readiness
        </h3>
        <p className="mb-2 text-[12px] text-neutral-500">
          Readiness only — no structured data is generated in this phase.
        </p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
          {analysis.schemaReadiness.map((item) => (
            <div key={item.type} className="flex items-start gap-2 py-1">
              <span
                className={`mt-[1px] w-4 shrink-0 text-center text-[13px] font-semibold ${
                  item.status === 'ready'
                    ? STATUS_STYLES.pass
                    : item.status === 'not_configured'
                      ? STATUS_STYLES.info
                      : STATUS_STYLES.warning
                }`}
                aria-hidden="true"
              >
                {item.status === 'ready' ? STATUS_ICON.pass : item.status === 'not_configured' ? STATUS_ICON.info : STATUS_ICON.warning}
              </span>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-neutral-900">{item.type}</span>
                <span className="text-[12px] text-neutral-500">{item.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  )
}
