'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link } from '../routing'
import { trackEvent } from '../analytics/analytics'
import { AnalyticsEvents } from '../analytics/events'
import {
  STEPS,
  branchOf,
  buildPath,
  estimatedLength,
  summarize,
  validateStep,
  type Answer,
  type Answers,
  type SectionKey,
  type Step,
} from './flow'
import {
  SCAN_DISCLAIMER,
  displayDomain,
  getAiStatus,
  startSiteScan,
  streamAssist,
  submitQuestionnaire,
  watchSiteScan,
  type Brief,
  type SiteScanView,
} from './api'
import AiMessage from './AiMessage'
import { cheerFor } from './cheers'
import { SiteScanCard, SiteScanChecklist, type ScanChecks } from './SiteScanCard'
import { BigInput, ContactFields, EASE, Helper, KEYS, LongAnswer, OptionRows, VisualCards, focusRing } from './fields'

const DRAFT_KEY = 'bw-project-planner:v1'
const EMAIL = 'hello@brandworks.me'
const INTRO = 'intro'
const DONE = 'done'
/** Steps whose answer starts the background website quick-look. */
const URL_STEPS = new Set(['currentUrl', 'redesignUrl'])
/** How long the thank-you screen waits for a scan before saying the report comes later. */
const SCAN_DONE_WAIT_MS = 60_000
/** Polling fallback stops after this while the visitor is still answering. */
const SCAN_FLOW_WAIT_MS = 5 * 60_000
/** A reaction that hasn't produced a token by then is dropped quietly. */
const REACT_FIRST_TOKEN_MS = 3_000
/** Reactions per session (the server also enforces QUESTIONNAIRE_REACT_LIMIT per IP). */
const MAX_REACTIONS = 6

/** A streamed AI message: the text so far, whether more is coming, and whether it came from the model. */
type Live = { text: string; streaming: boolean; ai: boolean }
type Reaction = { from: string; forStep: string; text: string; streaming: boolean }

type Draft = { answers: Answers; stepId: string }

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    if (!draft?.answers || typeof draft.stepId !== 'string' || !STEPS[draft.stepId]) return null
    return draft
  } catch {
    return null
  }
}

function writeDraft(draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    else window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable (private mode, blocked) — the draft is a convenience only */
  }
}

const str = (v: Answer | undefined) => (typeof v === 'string' ? v : '')
const list = (v: Answer | undefined) => (Array.isArray(v) ? v : [])
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

/** How long the greeting pop-up stays before the next question. */
const INTERLUDE_MS = 2300
/** Choice questions that move straight on without the greeting pop-up. */
const NO_GREETING = new Set(['operation', 'projectStage', 'websiteType', 'redesignType'])
type Interlude = { target: string; message?: string; pick?: string }
/** Opening words for the greeting pop-up; picked per answer so it varies. */
const GREETING_WORDS = ['Great choice', 'Lovely', 'Nice one', 'Wonderful', 'Brilliant'] as const

/** A quiet, emoji-free sparkle animation for the selection greeting. */
const SPARKLES = [
  { top: '13%', left: '18%', size: 18, delay: 0, color: 'var(--color-bw-lime)' },
  { top: '26%', left: '50%', size: 34, delay: 0.16, color: '#111' },
  { top: '16%', left: '79%', size: 13, delay: 0.32, color: 'var(--color-bw-lime)' },
  { top: '54%', left: '30%', size: 12, delay: 0.24, color: '#111' },
  { top: '63%', left: '68%', size: 22, delay: 0.08, color: 'var(--color-bw-lime)' },
  { top: '78%', left: '43%', size: 11, delay: 0.4, color: '#111' },
] as const

function SparkleEffect({ reduce, cover = false }: { reduce: boolean; cover?: boolean }) {
  return (
    <div aria-hidden="true" className={cover ? 'pointer-events-none absolute inset-0 opacity-50' : 'relative mx-auto h-36 w-56'}>
      {/* Behind text, only a few faint ones so they don't compete with the words. */}
      {(cover ? SPARKLES.filter((_, i) => i % 2 === 0) : SPARKLES).map((sparkle) => (
        <motion.svg
          key={`${sparkle.left}-${sparkle.top}`}
          viewBox="0 0 32 32"
          className="absolute"
          style={{ top: sparkle.top, left: sparkle.left, width: cover ? sparkle.size * 0.7 : sparkle.size, height: cover ? sparkle.size * 0.7 : sparkle.size, color: sparkle.color }}
          initial={reduce ? false : { opacity: 0, scale: 0.35, rotate: -35 }}
          animate={reduce ? { opacity: 0.9, scale: 1, rotate: 0 } : {
            opacity: [0.25, 1, 0.25],
            scale: [0.7, 1.15, 0.7],
            rotate: [-20, 20, -20],
          }}
          transition={{ duration: reduce ? 0 : 1.25, delay: reduce ? 0 : sparkle.delay, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
        >
          <path d="M16 0c2.7 9.3 6.7 13.3 16 16-9.3 2.7-13.3 6.7-16 16C13.3 22.7 9.3 18.7 0 16 9.3 13.3 13.3 9.3 16 0Z" fill="currentColor" />
        </motion.svg>
      ))}
    </div>
  )
}

/** Phone-only intro chips. */
const INTRO_CHIPS = ['About 3 minutes', 'Tap to answer', 'Type or talk'] as const

const SECTION_ORDER: SectionKey[] = ['basics', 'project', 'style', 'details', 'contact']

function PrimaryButton({ children, onClick, busy, type = 'button', className = '' }: { children: string; onClick?: () => void; busy?: boolean; type?: 'button' | 'submit'; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-busy={busy || undefined}
      className={`inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-(--q-accent-border) bg-(--q-accent) px-7 text-[16px] font-medium text-(--q-ink) transition-[filter] duration-150 hover:brightness-95 max-sm:h-14 max-sm:text-[17px] max-sm:shadow-[0_8px_20px_rgba(160,200,0,0.35)] ${focusRing} ${className}`}
    >
      {children}
    </button>
  )
}

function TextButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center rounded-lg px-2 text-[16px] text-(--q-ink) underline-offset-4 hover:underline ${focusRing} ${className}`}>
      {children}
    </button>
  )
}

/** Keeps Tab inside `ref` while open, closes on Escape and gives focus back to the opener. */
function useFocusTrap(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const onClose = () => closeRef.current()
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const root = ref.current
    const focusables = () => Array.from(root?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])') ?? [])
    focusables()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      opener?.focus?.()
    }
  }, [ref, open])
}

/** One dash per section; the current one fills by how far through that section they are. */
function SectionDashes({ fills, label }: { fills: number[]; label: string }) {
  return (
    <div role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((fills.reduce((a, b) => a + b, 0) / fills.length) * 100)} aria-valuetext={label} className="flex items-center gap-2">
      {fills.map((fill, i) => (
        <span key={SECTION_ORDER[i]} className="relative h-1 w-7 overflow-hidden rounded-full bg-black/12">
          <span className="absolute inset-y-0 left-0 rounded-full bg-(--q-ink) transition-[width] duration-200" style={{ width: `${Math.round(fill * 100)}%` }} />
        </span>
      ))}
    </div>
  )
}

/** "Your answers" — bottom sheet on mobile, right drawer on desktop. */
function AnswersDrawer({
  open,
  onClose,
  answers,
  upTo,
  onEdit,
  scan,
}: {
  open: boolean
  onClose: () => void
  answers: Answers
  upTo: string
  onEdit: (id: string) => void
  scan: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open, onClose)
  if (!open) return null
  const path = buildPath(answers)
  const limit = upTo === DONE ? path.length : Math.max(0, path.indexOf(upTo))
  const visible = new Set(path.slice(0, limit))
  const rows = summarize(answers).filter((r) => visible.has(r.id))
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="q-answers-title"
        data-lenis-prevent
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[24px] bg-(--q-card) pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-full lg:max-w-[380px] lg:rounded-none lg:rounded-l-[24px]"
      >
        <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-5">
          <h2 id="q-answers-title" className="m-0 text-[17px] font-semibold text-(--q-ink)">Your answers</h2>
          <TextButton onClick={onClose}>Close</TextButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {scan && <div className="mb-5">{scan}</div>}
          {rows.length === 0 ? (
            <p className="m-0 text-[15px] text-(--q-muted)">Your answers will show here as you go.</p>
          ) : (
            <ol className="m-0 list-none p-0">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start gap-3 border-b border-(--q-line) py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-[1.4] text-(--q-muted)">{row.question}</span>
                    <span className="mt-0.5 block text-[15px] leading-[1.45]">{row.answer}</span>
                  </div>
                  {upTo !== DONE && (
                    <TextButton onClick={() => onEdit(row.id)} className="-mr-2 shrink-0 text-[14px] underline">
                      Edit<span className="sr-only">: {row.question}</span>
                    </TextButton>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

/** "Leave the planner?" — a tiny confirm inside the card. */
function LeaveConfirm({ open, onStay }: { open: boolean; onStay: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open, onStay)
  if (!open) return null
  return (
    <div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="q-leave-title"
      aria-describedby="q-leave-body"
      className="absolute right-4 top-16 z-20 w-[min(300px,calc(100%-32px))] rounded-2xl border border-(--q-line) bg-(--q-card) p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)] lg:right-8"
    >
      <p id="q-leave-title" className="m-0 text-[16px] font-semibold">Leave the planner?</p>
      <p id="q-leave-body" className="m-0 mt-1 text-[14px] leading-[1.5] text-(--q-muted)">Your answers are saved on this device.</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <TextButton onClick={onStay}>Stay</TextButton>
        <Link to="/" className={`inline-flex h-11 items-center rounded-full border border-(--q-accent-border) bg-(--q-accent) px-5 text-[15px] font-medium text-(--q-ink) ${focusRing}`}>Leave</Link>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function QuestionnairePage() {
  const reduce = useReducedMotion()
  // Phones get only the full-screen question card: the background film isn't rendered (or downloaded) there.
  const [film, setFilm] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)')
    const sync = () => setFilm(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  const [answers, setAnswers] = useState<Answers>({})
  const [stepId, setStepId] = useState<string>(INTRO)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [aiText, setAiText] = useState<Record<string, Live>>({})
  const [recommendation, setRecommendation] = useState<{ key: string; suggestion: string | null; message: string; streaming: boolean; ai: boolean } | null>(null)
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [brief, setBrief] = useState<Brief | null>(null)
  const [briefAi, setBriefAi] = useState(false)
  const [scanTarget, setScanTarget] = useState<{ id: string; domain: string } | null>(null)
  const [scanChecks, setScanChecks] = useState<ScanChecks>({})
  const [scanView, setScanView] = useState<SiteScanView | null>(null)
  const [scanTimedOut, setScanTimedOut] = useState(false)
  const [aiOff, setAiOff] = useState(false)
  const scanUrlRef = useRef<string | null>(null)
  const doneAtRef = useRef<number | null>(null)
  const reactionRef = useRef<{ forStep: string; controller: AbortController } | null>(null)
  const reactionsUsed = useRef(0)
  const topRef = useRef<HTMLDivElement>(null)
  // The card body is the only scroller; the page itself never scrolls.
  const bodyRef = useRef<HTMLDivElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [swapHint, setSwapHint] = useState(false)
  /** The greeting pop-up shown between pressing Next and the next question. */
  const [interlude, setInterlude] = useState<Interlude | null>(null)
  const interludeTimer = useRef<number | undefined>(undefined)
  const swapTimer = useRef<number | undefined>(undefined)

  const path = useMemo(() => buildPath(answers), [answers])
  const step: Step | undefined = STEPS[stepId]
  const index = path.indexOf(stepId)
  const total = estimatedLength(answers)
  const questionNumber = path.slice(0, index + 1).filter((id) => STEPS[id]?.kind !== 'ai' && STEPS[id]?.kind !== 'exit').length

  /* ---- draft --------------------------------------------------------------- */
  useEffect(() => { setDraft(readDraft()) }, [])
  useEffect(() => {
    if (stepId === INTRO || stepId === DONE || stepId === 'redesignExit') return
    writeDraft({ answers, stepId })
  }, [answers, stepId])
  useEffect(() => () => window.clearTimeout(swapTimer.current), [])

  // Mobile: when the keyboard opens, bring the focused field into view.
  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const el = event.target as HTMLElement | null
      if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName) || !window.matchMedia('(max-width: 640px)').matches) return
      window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }), 300)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [reduce])

  /* ---- navigation --------------------------------------------------------- */
  const scrollTop = useCallback(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    const el = topRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [reduce])

  /** Stops a reaction that is still streaming and takes it off screen. */
  const cancelReaction = useCallback(() => {
    reactionRef.current?.controller.abort()
    reactionRef.current = null
    setReaction(null)
  }, [])

  const go = useCallback((target: string) => {
    window.clearTimeout(swapTimer.current)
    setSwapHint(false)
    // A reaction belongs to the question it was started for; moving anywhere else cancels it.
    if (reactionRef.current && reactionRef.current.forStep !== target) cancelReaction()
    setError(null)
    setStepId(target)
    scrollTop()
  }, [scrollTop, cancelReaction])

  /**
   * Streams a one-line reaction to the answer just given, shown at the top of
   * the next question. Never blocks: if nothing arrives within 3 s it is
   * dropped quietly, and moving on again cancels it.
   */
  const startReaction = useCallback((from: string, forStep: string, current: Answers) => {
    const target = STEPS[forStep]
    if (!STEPS[from]?.aiReact || !target || reactionsUsed.current >= MAX_REACTIONS) return
    // Not on the AI interstitial, the contact step or the exit; nor above the greeting, which already reacts.
    if (target.kind === 'ai' || target.kind === 'contact' || target.kind === 'exit' || (target.kind === 'longtext' && target.aiIntro)) return
    reactionRef.current?.controller.abort()
    const controller = new AbortController()
    reactionRef.current = { forStep, controller }
    reactionsUsed.current += 1
    setReaction({ from, forStep, text: '', streaming: true })
    let gotToken = false
    const timer = window.setTimeout(() => { if (!gotToken) { controller.abort(); setReaction((r) => (r?.forStep === forStep ? null : r)) } }, REACT_FIRST_TOKEN_MS)
    streamAssist('react', current, {
      stepId: from,
      signal: controller.signal,
      onToken: (text) => {
        gotToken = true
        setReaction((r) => (r?.forStep === forStep ? { ...r, text } : r))
      },
    })
      .then((r) => {
        window.clearTimeout(timer)
        if (controller.signal.aborted) return
        if (!r.ai || !r.message) { setReaction((x) => (x?.forStep === forStep ? null : x)); return }
        setReaction((x) => (x?.forStep === forStep ? { ...x, text: r.message, streaming: false } : x))
        // Kept with the answers so the team sees exactly what the visitor was told.
        setAnswers((a) => ({ ...a, aiNotes: [...(Array.isArray(a.aiNotes) ? a.aiNotes : []), r.message].slice(-MAX_REACTIONS) }))
      })
      .catch(() => {
        window.clearTimeout(timer)
        setReaction((x) => (x?.forStep === forStep ? null : x))
      })
  }, [])

  const submit = useCallback(async (final: Answers) => {
    setStatus('sending')
    const result = await submitQuestionnaire(final, honeypotRef.current?.value ?? '')
    if (result.ok) {
      setBrief(result.brief ?? null)
      setBriefAi(result.briefAi === true)
      setStatus('idle')
      writeDraft(null)
      trackEvent({ name: AnalyticsEvents.questionnaireSubmit, params: { branch: branchOf(final) ?? 'unknown' } })
      go(DONE)
      return
    }
    if (result.stepId && result.stepId !== 'contact' && STEPS[result.stepId]) {
      setStatus('idle')
      go(result.stepId)
      setError(result.error ?? null)
      return
    }
    setStatus('error')
    setError(result.error ?? 'That didn’t go through.')
  }, [go])

  /** Kicks off (or drops) the website quick-look without holding up the flow. */
  const startScan = useCallback((stepKey: string, current: Answers) => {
    const raw = str(current[stepKey]).trim()
    if (!raw) {
      scanUrlRef.current = null
      setScanTarget(null)
      setAnswers((a) => { if (!a.siteScanId) return a; const copy = { ...a }; delete copy.siteScanId; return copy })
      return
    }
    if (raw === scanUrlRef.current && current.siteScanId) return
    scanUrlRef.current = raw
    setScanTimedOut(false)
    setScanChecks({})
    setScanView(null)
    setScanTarget({ id: '', domain: displayDomain(raw) })
    void startSiteScan(raw, current).then((started) => {
      if (scanUrlRef.current !== raw) return
      if (!started) {
        setScanTarget(null)
        setAnswers((a) => { const copy = { ...a }; delete copy.siteScanId; return copy })
        return
      }
      setScanTarget({ id: started.scanId, domain: displayDomain(raw) })
      setAnswers((a) => ({ ...a, siteScanId: started.scanId }))
    })
  }, [])

  const next = useCallback((current: Answers = answers) => {
    const here = STEPS[stepId]
    if (!here) return
    const problem = validateStep(here, current)
    if (problem) { setError(problem); return }
    if (URL_STEPS.has(here.id)) startScan(here.id, current)
    if (here.kind === 'contact') { void submit(current); return }
    const route = buildPath(current)
    const target = route[route.indexOf(stepId) + 1]
    if (!target) return
    if (here.aiReact) startReaction(here.id, target, current)
    const greet = (message?: string, pick?: string) => {
      setInterlude({ target, message, pick })
      window.clearTimeout(interludeTimer.current)
      interludeTimer.current = window.setTimeout(() => { setInterlude(null); go(target) }, INTERLUDE_MS)
    }
    // Briefly acknowledge the brand name before continuing.
    if (here.id === 'brandName' && !NO_GREETING.has(here.id)) {
      const name = str(current.brandName).trim()
      if (name) { greet(); return }
    }
    // A choice question greets the pick in a short pop-up, then moves on.
    if ((here.kind === 'single' || here.kind === 'multi') && !NO_GREETING.has(here.id)) {
      const value = here.kind === 'single' ? str(current[here.id]) : list(current[here.id]).at(-1) ?? ''
      const option = here.options.find((o) => o.value === value)
      if (option) {
        // The business-type pick gets a line written for that answer.
        greet(here.id === 'workType' ? cheerFor(option.value) : undefined, here.id === 'workType' ? GREETING_WORDS[option.value.length % GREETING_WORDS.length] : undefined)
        return
      }
    }
    go(target)
  }, [answers, stepId, go, submit, startScan, startReaction])

  /** Tap, Enter or Esc skips the rest of the greeting. */
  const finishInterlude = useCallback(() => {
    if (!interlude) return
    window.clearTimeout(interludeTimer.current)
    setInterlude(null)
    go(interlude.target)
  }, [interlude, go])
  useEffect(() => () => window.clearTimeout(interludeTimer.current), [])

  const back = useCallback(() => {
    if (stepId === DONE) return
    const i = path.indexOf(stepId)
    go(i <= 0 ? INTRO : path[i - 1])
  }, [path, stepId, go])

  const start = (resume: boolean) => {
    if (resume && draft) {
      setAnswers(draft.answers)
      go(draft.stepId)
    } else {
      setAnswers({})
      writeDraft(null)
      go('brandName')
    }
    setDraft(null)
    trackEvent({ name: AnalyticsEvents.questionnaireStart, params: { resumed: Boolean(resume && draft) } })
  }

  /* ---- answering ---------------------------------------------------------- */
  const setAnswer = (key: string, value: Answer | undefined) => {
    setError(null)
    setAnswers((a) => {
      const copy = { ...a }
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) delete copy[key]
      else copy[key] = value
      return copy
    })
  }

  const pickSingle = (value: string) => {
    if (!step || step.kind !== 'single') return
    const updated: Answers = { ...answers, [step.id]: value }
    if (step.assistValue && value !== step.assistValue) delete updated[`${step.id}Suggested`]
    setAnswers(updated)
    setError(null)
  }

  const toggleMulti = (value: string) => {
    if (!step || step.kind !== 'multi') return
    const current = list(answers[step.id])
    let updated: string[]
    if (current.includes(value)) updated = current.filter((v) => v !== value)
    else if (step.exclusive?.includes(value)) updated = [value]
    else {
      updated = [...current.filter((v) => !step.exclusive?.includes(v)), value]
      if (step.max && updated.length > step.max) {
        if (step.max === 1) updated = [value]
        else {
          // At the max: the hint line briefly says how to swap instead of an error.
          setSwapHint(true)
          window.clearTimeout(swapTimer.current)
          swapTimer.current = window.setTimeout(() => setSwapHint(false), 2200)
          return
        }
      }
    }
    setAnswer(step.id, updated)
  }

  /* ---- AI moments --------------------------------------------------------- */
  const greetKey = ['greet', answers.brandName, answers.workType, answers.workTypeOther, answers.operation, answers.websiteType].join('|')
  const uspKey = ['usp', answers.brandName, answers.usp].join('|')
  const recKey = ['rec', answers.brandName, answers.workType, answers.workTypeOther, answers.operation].join('|')

  // The greeting above the USP question and the reply after it, streamed token by token.
  useEffect(() => {
    const task = stepId === 'usp' ? 'greet' : stepId === 'uspReply' ? 'usp-reply' : null
    if (!task) return
    const key = task === 'greet' ? greetKey : uspKey
    if (aiText[key] && !aiText[key].streaming) return
    const controller = new AbortController()
    setAiText((t) => ({ ...t, [key]: { text: '', streaming: true, ai: true } }))
    streamAssist(task, answers, {
      signal: controller.signal,
      onToken: (text) => setAiText((t) => ({ ...t, [key]: { text, streaming: true, ai: true } })),
    })
      .then((r) => setAiText((t) => ({ ...t, [key]: { text: r.message, streaming: false, ai: r.ai } })))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        // Neither stream nor fallback reached the server: plain, non-personal copy.
        setAiText((t) => ({ ...t, [key]: { text: task === 'greet' ? 'Thanks, that’s the basics covered.' : 'Thanks, noted.', streaming: false, ai: false } }))
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by greetKey/uspKey, not every answer
  }, [stepId, greetKey, uspKey])

  // "Not sure yet — help me choose": the type arrives first (meta), then the reason streams.
  const wantsRecommendation = stepId === 'websiteType' && answers.websiteType === 'not-sure'
  useEffect(() => {
    if (!wantsRecommendation || (recommendation?.key === recKey && !recommendation.streaming)) return
    const controller = new AbortController()
    setRecommendation({ key: recKey, suggestion: null, message: '', streaming: true, ai: true })
    streamAssist('recommend-type', answers, {
      signal: controller.signal,
      onMeta: (meta) => { if (meta.suggestion) setRecommendation((r) => (r?.key === recKey ? { ...r, suggestion: meta.suggestion! } : r)) },
      onToken: (text) => setRecommendation((r) => (r?.key === recKey ? { ...r, message: text } : r)),
    })
      .then((r) => setRecommendation({ key: recKey, suggestion: r.suggestion ?? 'business', message: r.message, streaming: false, ai: r.ai }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setRecommendation({ key: recKey, suggestion: 'business', message: 'A business website is the usual starting point when people need to understand what you offer, trust you, and get in touch.', streaming: false, ai: false })
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by recKey
  }, [wantsRecommendation, recKey])

  // Idea chips for free-text questions, fetched when the step opens. No AI, no chips.
  const workTypeStep = STEPS.workType
  const workTypeLabel = answers.workType === 'other'
    ? str(answers.workTypeOther).trim()
    : workTypeStep.kind === 'single' ? workTypeStep.options.find((o) => o.value === answers.workType)?.label ?? '' : ''
  const suggestKey = step?.aiSuggest ? [step.id, answers.workType, answers.workTypeOther, answers.websiteType, answers.projectStage].join('|') : ''
  useEffect(() => {
    if (!suggestKey || suggestions[suggestKey]) return
    const controller = new AbortController()
    streamAssist('suggest', answers, { stepId, signal: controller.signal })
      .then((r) => setSuggestions((s) => ({ ...s, [suggestKey]: r.ai ? r.items ?? [] : [] })))
      .catch(() => undefined)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by suggestKey
  }, [suggestKey])

  // Development only: say plainly when no AI provider is configured.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    void getAiStatus().then((s) => { if (s && !s.aiProvider) setAiOff(true) })
  }, [])

  /* ---- website quick-look -------------------------------------------------- */
  const scanId = str(answers.siteScanId)
  const scanFinished = scanView !== null
  const onDoneScreen = stepId === DONE

  useEffect(() => {
    doneAtRef.current = onDoneScreen ? Date.now() : null
    if (!onDoneScreen || !scanId || scanFinished) return
    // The thank-you screen waits up to a minute, then says the report comes with the reply.
    const timer = window.setTimeout(() => setScanTimedOut(true), SCAN_DONE_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [onDoneScreen, scanId, scanFinished])

  // Follow the scan live (SSE); the watcher reconnects once, then falls back to polling.
  useEffect(() => {
    if (!scanId || scanFinished) return
    const controller = new AbortController()
    const startedAt = Date.now()
    setScanTarget((t) => (t && t.id === scanId ? t : { id: scanId, domain: t?.domain || displayDomain(str(answers.currentUrl) || str(answers.redesignUrl)) }))
    void watchSiteScan(scanId, {
      signal: controller.signal,
      onStep: (check, state) => setScanChecks((c) => ({ ...c, [check]: state })),
      onDone: (view) => setScanView(view),
      onFailed: () => setScanView({ status: 'failed', domain: '', teaser: null, teaserAi: false, highlights: [], disclaimer: '' }),
      keepPolling: () => {
        const doneAt = doneAtRef.current
        return Date.now() < (doneAt !== null ? doneAt + SCAN_DONE_WAIT_MS : startedAt + SCAN_FLOW_WAIT_MS)
      },
    })
    return () => controller.abort()
    // Restarts on the thank-you screen so a scan still running there gets its final minute of updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one watcher per scan id (and screen)
  }, [scanId, scanFinished, onDoneScreen])

  /* ---- keyboard ----------------------------------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (interlude) {
        if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') { event.preventDefault(); finishInterlude() }
        return
      }
      if (drawerOpen || confirmOpen) return
      if (event.defaultPrevented || event.altKey || (event.metaKey && event.key !== 'Enter')) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (event.key === 'Enter') {
        if (stepId === INTRO || stepId === DONE || !step || step.kind === 'exit') return
        if (tag === 'TEXTAREA' && !(event.metaKey || event.ctrlKey)) return
        // Enter on a radio/checkbox row moves on, like Enter in a native form.
        const role = target?.getAttribute('role')
        if (tag === 'BUTTON' && role !== 'radio' && role !== 'checkbox') return
        event.preventDefault()
        next()
        return
      }
      if (typing || event.ctrlKey || event.metaKey || !step) return
      if (step.kind !== 'single' && step.kind !== 'multi') return
      const i = KEYS.indexOf(event.key.toUpperCase())
      if (event.key.length !== 1 || i < 0 || i >= step.options.length) return
      event.preventDefault()
      const value = step.options[i].value
      if (step.kind === 'single') pickSingle(value)
      else toggleMulti(value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---- render ------------------------------------------------------------- */
  const card = {
    initial: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 1 } : { opacity: 0 },
    transition: { duration: reduce ? 0 : 0.2, ease: EASE },
  }

  const name = firstName(str(answers.contactName))

  const mailtoFallback = () => {
    const body = summarize(answers).map((r) => `${r.question}\n${r.answer}`).join('\n\n')
    return `mailto:${EMAIL}?subject=${encodeURIComponent(`Website project — ${str(answers.brandName) || 'new enquiry'}`)}&body=${encodeURIComponent(body)}`
  }

  // Section dashes: earlier sections full, the current one by how far through it they are.
  const sectionFills = (() => {
    if (stepId === DONE) return SECTION_ORDER.map(() => 1)
    if (!step) return SECTION_ORDER.map(() => 0)
    const current = SECTION_ORDER.indexOf(step.section)
    const counted = (id: string) => STEPS[id]?.section === step.section && STEPS[id]?.kind !== 'ai' && STEPS[id]?.kind !== 'exit'
    const inSection = path.filter(counted)
    const reached = path.slice(0, index + 1).filter(counted).length
    const fill = inSection.length ? Math.max(reached, 1) / inSection.length : 1
    return SECTION_ORDER.map((_, i) => (i < current ? 1 : i === current ? Math.min(1, fill) : 0))
  })()

  const answeredCount = (() => {
    const limit = stepId === DONE ? path.length : Math.max(0, index)
    const visible = new Set(path.slice(0, limit))
    return summarize(answers).filter((r) => visible.has(r.id)).length
  })()
  const scanRunning = Boolean(scanTarget) && !scanView

  // Short, human hints — only where they add something the helper doesn't already say.
  const hintLine = (s: Step): string | null => {
    if (s.kind === 'multi') return swapHint ? 'Unselect one to swap' : s.max ? null : 'Pick as many as you like'
    if ((s.kind === 'text' || s.kind === 'longtext') && s.optional) return 'Optional, skip it if you like'
    return null
  }

  /** A fieldset whose legend is the title, then the hint, the helper and the answer. */
  const question = (s: Step, body: ReactNode) => {
    const hint = hintLine(s)
    return (
      <>
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="m-0 block w-full p-0 font-(family-name:--font-secondary) text-[24px] font-semibold leading-[1.2] text-(--q-ink) lg:text-[30px]">
            {s.title}
          </legend>
          {hint && <span className="mt-2 flex items-center gap-1.5 text-[14px] italic text-(--q-muted)" aria-live={s.kind === 'multi' ? 'polite' : undefined}>{hint}</span>}
          {s.helper && <Helper>{s.helper}</Helper>}
          <div className="mt-6">{body}</div>
        </fieldset>
      </>
    )
  }

  const renderStep = (s: Step) => {
    switch (s.kind) {
      case 'text':
        return question(s, (
          <BigInput
            id={`q-${s.id}`}
            label={s.title}
            value={str(answers[s.id])}
            onChange={(v) => setAnswer(s.id, v)}
            placeholder={s.placeholder}
            type={s.inputType === 'url' ? 'url' : 'text'}
            inputMode={s.inputType === 'url' ? 'url' : 'text'}
            autoComplete={s.inputType === 'url' ? 'url' : s.id === 'brandName' ? 'organization' : 'off'}
            maxLength={s.maxLength}
            autoFocus
          />
        ))
      case 'longtext':
        return question(s, (
          <>
            <LongAnswer
              id={`q-${s.id}`}
              label={s.title}
              value={str(answers[s.id])}
              onChange={(v) => setAnswer(s.id, v)}
              placeholder={s.placeholder}
              maxLength={s.maxLength}
              voice={s.voice}
              autoFocus={!s.aiIntro}
            />
            {s.aiSuggest && (suggestions[suggestKey]?.length ?? 0) > 0 && (
              <div className="mt-4">
                <span className="block text-[14px] font-medium text-(--q-ink)">Ideas for {workTypeLabel || 'your business'}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions[suggestKey].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => {
                        const current = str(answers[s.id]).trimEnd()
                        const joined = current ? `${current}${/[.!?,;:]$/.test(current) ? ' ' : '. '}${idea}` : idea
                        setAnswer(s.id, s.maxLength ? joined.slice(0, s.maxLength) : joined)
                      }}
                      className={`relative min-h-9 rounded-full border border-(--q-line) px-3.5 py-1.5 text-left text-[13px] leading-[1.3] transition-colors before:absolute before:-inset-1 before:content-[''] hover:border-(--q-ink) ${focusRing}`}
                    >
                      + {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ))
      case 'single': {
        const value = str(answers[s.id])
        return question(s, (
          <>
            {s.layout === 'visual'
              ? <VisualCards options={s.options} selected={value ? [value] : []} onToggle={pickSingle} label={s.title} />
              : <OptionRows options={s.options} selected={value ? [value] : []} onToggle={pickSingle} label={s.title} />}
            {s.otherValue && value === s.otherValue && (
              <div className="mt-5">
                <BigInput id={`q-${s.id}Other`} label="Describe it briefly" value={str(answers[`${s.id}Other`])} onChange={(v) => setAnswer(`${s.id}Other`, v)} placeholder="Describe it briefly" maxLength={200} autoFocus />
              </div>
            )}
            {s.assistValue && value === s.assistValue && (
              <div className="mt-5">
                {/* Only a model answer is "BrandWorks suggests"; the written fallback is labelled as what it is. */}
                <AiMessage
                  label={recommendation?.key === recKey && !recommendation.ai ? 'A common starting point' : 'BrandWorks suggests'}
                  text={recommendation?.key === recKey && recommendation.suggestion ? `${s.options.find((o) => o.value === recommendation.suggestion)?.label}. ${recommendation.message}` : null}
                  streaming={recommendation?.key === recKey ? recommendation.streaming : true}
                />
                {recommendation?.key === recKey && !recommendation.streaming && recommendation.suggestion && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { const u = { ...answers, [`${s.id}Suggested`]: recommendation.suggestion }; setAnswers(u); next(u) }} className={`min-h-11 rounded-full bg-(--q-ink) px-5 text-[14px] text-white ${focusRing}`}>
                      Sounds right
                    </button>
                    <button type="button" onClick={() => { const u = { ...answers }; delete u[`${s.id}Suggested`]; setAnswers(u); next(u) }} className={`min-h-11 rounded-full border border-(--q-line) px-5 text-[14px] hover:border-(--q-ink) ${focusRing}`}>
                      Keep it open, decide together
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ))
      }
      case 'multi':
        return question(s, <OptionRows options={s.options} selected={list(answers[s.id])} onToggle={toggleMulti} multi max={s.max} label={s.title} />)
      case 'ai':
        return <AiMessage text={aiText[uspKey]?.text || null} streaming={aiText[uspKey]?.streaming ?? true} large />
      case 'exit':
        return (
          <>
            <h2 className="m-0 text-[24px] font-semibold leading-[1.2] lg:text-[30px]">Thanks for sharing.</h2>
            <p className="m-0 mt-3 text-[16px] leading-[1.6] text-(--q-muted)">{s.body}</p>
            <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
              <TextButton onClick={back}>Change my answer</TextButton>
              <Link to="/services" className={`inline-flex h-12 items-center rounded-full border border-(--q-accent-border) bg-(--q-accent) px-7 text-[16px] font-medium text-(--q-ink) ${focusRing}`}>
                Explore our services
              </Link>
            </div>
          </>
        )
      case 'contact':
        return question(s, (
          <>
            <ContactFields
              values={{
                contactName: str(answers.contactName),
                contactEmail: str(answers.contactEmail),
                contactPhone: str(answers.contactPhone),
                contactWebsite: str(answers.contactWebsite),
              }}
              onChange={(k, v) => setAnswer(k, v)}
              askWebsite={branchOf(answers) === 'redesign' && !str(answers.redesignUrl).trim()}
            />
            <p className="m-0 mt-5 text-[12px] leading-[1.6] text-(--q-muted)">
              We only use these details to reply about your project. Your answers are summarised with AI to help our team prepare.
            </p>
          </>
        ))
    }
  }

  const showFooter = step && step.kind !== 'exit'
  const choiceMissing = (step?.kind === 'single' && !str(answers[step.id])) || (step?.kind === 'multi' && list(answers[step.id]).length === 0)
  const nextLabel = !step ? 'Next'
    : step.kind === 'ai' ? step.cta
    : step.kind === 'contact' ? (status === 'sending' ? 'Sending…' : 'Send my plan')
    : (step.kind === 'longtext' || step.kind === 'text') && step.optional && !str(answers[step.id]).trim() ? 'Skip'
    : 'Next'
  // A reaction shows only where it is the screen's one AI message.
  const showReaction = Boolean(step && reaction?.forStep === stepId && reaction.text && step.kind !== 'ai'
    && !(step.kind === 'longtext' && step.aiIntro)
    && !(step.kind === 'single' && step.assistValue && answers[step.id] === step.assistValue))
  const wide = step?.kind === 'single' && step.layout === 'visual'

  return (
    <main className="bw-q relative isolate h-dvh overflow-hidden bg-white bg-none antialiased sm:bg-black sm:px-8 sm:pb-10 sm:pt-20 lg:grid lg:place-items-center lg:pb-16 lg:pt-16">
      {/* Background film: decorative, muted, behind everything. With reduced motion it stays on its first frame. */}
      {film && <video
        key={reduce ? 'still' : 'loop'}
        src="/video/ForWebsite.mp4"
        autoPlay={!reduce}
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full scale-105 object-cover blur-[6px]"
      />}
      {aiOff && (
        <div role="status" className="fixed inset-x-0 top-3 z-40 mx-auto flex w-[calc(100%-32px)] max-w-[520px] items-center justify-between gap-4 rounded-2xl bg-(--q-ink) px-4 py-3 text-[13px] text-white shadow-lg">
          <span><span className="mr-2 font-medium text-(--q-accent)">Dev</span>AI is off. Showing neutral copy.</span>
          <button type="button" onClick={() => setAiOff(false)} className="shrink-0 rounded-full border border-white/25 px-3 py-1 text-[12px] hover:border-white">Dismiss</button>
        </div>
      )}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Leave this empty<input ref={honeypotRef} type="text" name="website_url" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div ref={topRef} className={`relative mx-auto flex w-full flex-col max-sm:h-dvh sm:max-h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-8rem)] sm:max-w-[560px] sm:scroll-mt-20 ${wide ? 'lg:max-w-[760px]' : 'lg:max-w-[600px]'}`}>
        <div aria-hidden="true" className="bw-q-back max-sm:hidden" />
        <div className="bw-q-card relative flex min-h-0 flex-1 flex-col px-6 pt-[max(24px,env(safe-area-inset-top))] sm:pt-6 lg:px-10 lg:pt-8">
          {/* Header row: section dashes | Answers + close */}
          <div className="flex min-h-11 items-center justify-between gap-3">
            {stepId !== INTRO ? (
              <SectionDashes fills={sectionFills} label={stepId === DONE ? 'All questions answered' : `Question ${questionNumber} of ${total}`} />
            ) : <span />}
            <div className="flex items-center gap-1">
              {stepId !== INTRO && stepId !== DONE && (answeredCount > 0 || scanRunning) && (
                <button type="button" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog" aria-label={scanRunning ? 'Your answers (website check running)' : 'Your answers'} title="Your answers" className={`relative grid size-11 place-items-center rounded-full text-(--q-ink) hover:bg-(--q-tint) ${focusRing}`}>
                  {/* Icon only: a small list. The dot shows while the website check runs. */}
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                    <path d="M9 7h10M9 12h10M9 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="5" cy="7" r="1.2" fill="currentColor" />
                    <circle cx="5" cy="12" r="1.2" fill="currentColor" />
                    <circle cx="5" cy="17" r="1.2" fill="currentColor" />
                  </svg>
                  {scanRunning && <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-(--q-accent) ring-2 ring-white motion-safe:animate-pulse" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label="Close the planner"
                aria-haspopup="dialog"
                className={`grid size-11 place-items-center rounded-full ${focusRing}`}
              >
                <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-black/35 text-white">
                  <svg viewBox="0 0 12 12" className="size-2.5"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </span>
              </button>
            </div>
          </div>
          <LeaveConfirm open={confirmOpen} onStay={() => setConfirmOpen(false)} />

          <div ref={bodyRef} data-lenis-prevent className="-mx-6 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 pb-2 pt-5 lg:-mx-10 lg:px-10 lg:pt-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={stepId} initial={card.initial} animate={card.animate} exit={card.exit} transition={card.transition}>
                {stepId === INTRO && (
                  <div className="pb-6 max-sm:flex max-sm:min-h-[calc(100dvh-110px)] max-sm:flex-col lg:pb-5">
                    {/* {eyebrow('Website project planner')} */}
                    <h1 className="m-0 mt-2 font-(family-name:--font-primary) sm:mt-[-40px] text-[32px] font-normal leading-[1.05] tracking-[-0.02em] lg:text-[40px]">Let’s plan your website.</h1>
                    <p className="m-0 mt-11 text-[16px] leading-[1.6] text-(--q-muted)">
                      A few quick questions about your business and what you need, then we put together a short plan our team picks up from.
                    </p>
                    {/* <ul className="bw-q-mono m-0 mt-5 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[11px] text-(--q-muted)">
                      <li>~3 minutes</li><li aria-hidden="true">·</li><li>Tap to answer</li><li aria-hidden="true">·</li><li>Type or talk</li>
                    </ul> */}
                    <ul className="m-0 mt-6 flex list-none flex-wrap gap-2 p-0 sm:hidden">
                      {INTRO_CHIPS.map((text) => (
                        <li key={text} className="inline-flex items-center rounded-full border border-(--q-line) bg-white px-3 py-1.5 text-[13px]">
                          {text}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 flex flex-wrap items-center justify-end gap-3 max-sm:mt-auto max-sm:flex-col-reverse max-sm:items-stretch max-sm:pt-8">
                      {draft ? (
                        <>
                          <TextButton onClick={() => start(false)} className="max-sm:justify-center">Start over</TextButton>
                          <PrimaryButton onClick={() => start(true)} className="max-sm:w-full">Continue</PrimaryButton>
                        </>
                      ) : (
                        <PrimaryButton onClick={() => start(false)} className="max-sm:w-full">Start</PrimaryButton>
                      )}
                    </div>
                  </div>
                )}

                {stepId === DONE && (
                  <div className="pb-6 lg:pb-10" role="status">
                    <h1 className="m-0 font-(family-name:--font-primary) text-[32px] font-normal leading-[1.05] tracking-[-0.02em] lg:text-[40px]">
                      Thanks{name ? `, ${name}` : ''}.
                    </h1>
                    <p className="m-0 mt-3 text-[16px] leading-[1.6] text-(--q-muted)">
                      Your plan is with us. Someone from BrandWorks will reply to {str(answers.contactEmail) || 'your email'}, usually within one working day.
                    </p>
                    {brief && (
                      <div className="mt-6">
                        {/* Neutral copy when the summary couldn't be written by the model. */}
                        <AiMessage label={briefAi ? 'Here’s what we heard' : 'What happens next'} text={brief.summary} />
                        {brief.focus.length > 0 && (
                          <div className="mt-5">
                            <span className="block text-[15px] font-semibold">Where we’d start</span>
                            <ul className="m-0 mt-2 list-none p-0">
                              {brief.focus.map((f) => (
                                <li key={f} className="flex gap-3 py-1 text-[15px] leading-[1.5]">
                                  <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-(--q-ink)" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {scanTarget && scanId && (
                      <SiteScanCard
                        scan={scanView ?? { status: 'running', domain: scanTarget.domain, teaser: null, teaserAi: false, highlights: [], disclaimer: SCAN_DISCLAIMER }}
                        timedOut={scanTimedOut}
                      />
                    )}
                    <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                      <TextButton onClick={() => {
                        setAnswers({}); setBrief(null); setScanTarget(null); setScanChecks({}); setScanView(null); setScanTimedOut(false)
                        scanUrlRef.current = null; reactionsUsed.current = 0; go(INTRO)
                      }}>
                        Plan another project
                      </TextButton>
                      <Link to="/work" className={`inline-flex h-12 items-center rounded-full border border-(--q-accent-border) bg-(--q-accent) px-7 text-[16px] font-medium text-(--q-ink) ${focusRing}`}>See our work</Link>
                    </div>
                  </div>
                )}

                {step && (
                  <div className={step.kind === 'exit' ? 'pb-6 lg:pb-10' : ''}>
                    {step.kind === 'longtext' && step.aiIntro === 'greet' && (
                      <AiMessage text={aiText[greetKey]?.text || null} streaming={aiText[greetKey]?.streaming ?? true} className="mb-5" />
                    )}
                    {showReaction && reaction && <AiMessage text={reaction.text} streaming={reaction.streaming} className="mb-5" />}
                    {renderStep(step)}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {showFooter && step && (
            <div className="bw-q-footer -mx-6 px-6 pt-3 lg:-mx-10 lg:px-10 lg:pb-8 lg:pt-4">
              {/* Phones: "nothing picked yet" isn't shown (still announced to screen readers); other errors always show. */}
              {error && (
                <p role="alert" className={`m-0 mb-2 text-right text-[14px] text-(--q-error) ${choiceMissing ? 'max-sm:sr-only' : ''}`}>{error}</p>
              )}
              {status === 'error' && (
                <p className="m-0 mb-2 text-right text-[14px] leading-[1.6]">
                  Try again, or{' '}
                  <a href={mailtoFallback()} className="underline underline-offset-4">send your answers by email instead</a>
                  {' '}(we’ve filled it in for you).
                </p>
              )}
              <div className="flex items-center justify-end gap-2 max-sm:gap-3">
                {/* Phones: a round back arrow and a full-width Next. */}
                <TextButton onClick={back} className={`max-sm:size-14 max-sm:shrink-0 max-sm:justify-center max-sm:rounded-full max-sm:border max-sm:border-(--q-line) max-sm:bg-white max-sm:px-0 max-sm:no-underline ${index <= 0 ? 'invisible' : ''}`}>
                  <svg viewBox="0 0 24 24" className="size-5 sm:hidden" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="max-sm:sr-only">Back</span>
                </TextButton>
                <PrimaryButton onClick={() => { if (status !== 'sending' && !interlude) next() }} busy={status === 'sending'} className="max-sm:flex-1">{nextLabel}</PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {interlude && (
          <motion.div
            key="interlude"
            className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-8 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            onClick={finishInterlude}
          >
            {/* A small celebration: the pick pops in with confetti, a big headline, then the greeting. */}
            <motion.div
              role="status"
              aria-live="polite"
              className={`relative isolate w-full overflow-hidden rounded-[28px] border border-black/[0.06] bg-white text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${interlude.message ? 'max-w-[420px] px-8 pb-10 pt-10 sm:px-10' : 'max-w-[360px] px-8 pb-9 pt-9'}`}
              initial={reduce ? false : { opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
            >
              {interlude.message ? (
                <>
                  {/* Background: two slow lime glows and the sparkles, all behind the words. */}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                    <motion.span
                      className="absolute -left-16 -top-20 size-64 rounded-full bg-[radial-gradient(circle,rgba(206,253,16,0.55),transparent_68%)] blur-2xl"
                      animate={reduce ? undefined : { x: [0, 24, 0], y: [0, 16, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.span
                      className="absolute -bottom-24 -right-16 size-72 rounded-full bg-[radial-gradient(circle,rgba(206,253,16,0.35),transparent_68%)] blur-2xl"
                      animate={reduce ? undefined : { x: [0, -20, 0], y: [0, -14, 0] }}
                      transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <SparkleEffect reduce={reduce} cover />
                    <span className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(255,255,255,0.85),transparent)]" />
                  </div>

                  {interlude.pick && (
                    <motion.span
                      className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-3.5 py-1.5 text-[13px] font-normal leading-[1.3] tracking-[0.02em] text-(--q-ink) backdrop-blur-sm"
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.1, ease: EASE }}
                    >
                      {interlude.pick}
                    </motion.span>
                  )}
                  <motion.p
                    className="m-0 mt-5 text-[18px] font-normal leading-[1.45] text-(--q-ink) sm:text-[20px]"
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.2, ease: EASE }}
                  >
                    {interlude.message}
                  </motion.p>
                  {/* Time until the next question. */}
                  <span aria-hidden="true" className="mx-auto mt-8 block h-[3px] w-24 overflow-hidden rounded-full bg-black/10">
                    <motion.span
                      className="block h-full origin-left rounded-full bg-(--q-ink)"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: INTERLUDE_MS / 1000, ease: 'linear' }}
                    />
                  </span>
                </>
              ) : (
                <SparkleEffect reduce={reduce} />
              )}
              <span className="sr-only">Your selection is noted. Tap or press Enter to continue.</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnswersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        answers={answers}
        upTo={stepId}
        onEdit={(id) => { setDrawerOpen(false); go(id) }}
        scan={scanTarget ? <SiteScanChecklist domain={scanTarget.domain} checks={scanChecks} failed={scanView?.status === 'failed'} /> : null}
      />
    </main>
  )
}
