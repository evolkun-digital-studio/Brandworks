'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link, useNavigate } from '../routing'
import { trackEvent } from '../analytics/analytics'
import { AnalyticsEvents } from '../analytics/events'
import {
  STEPS,
  branchOf,
  buildPath,
  summarize,
  validateStep,
  type Answer,
  type Answers,
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
import { BigInput, ContactFields, EASE, Helper, KEYS, LongAnswer, OptionTiles, focusRing } from './fields'
import {
  BackButton,
  ErrorText,
  PillButton,
  ProgressBar,
  TextField,
  formBody,
  formDisplayHeading,
  formEyebrow,
  formFooterPlain,
  formFooterCompact,
  formFootnote,
  formHint,
  formPage,
  formSection,
  formSectionFit,
  formSmallButton,
  formStepHeading,
  formStepHeadingCompact,
  formTextLink,
} from '../components/ContactForm/ContactForm'
import { SECTION_LABELS } from './flow'

const DRAFT_KEY = 'bw-project-planner:v1'
const EMAIL = 'hello@brandworks.me'
const INTRO = 'intro'

// A small, one-shot burst of sparkles and confetti for the greeting pop-up.
const CONFETTI = [
  { x: -110, y: -18, rotate: -40, color: '#D4AF37', shape: 'spark' },
  { x: -78, y: -40, rotate: 120, color: '#E8B4B8', shape: 'bit' },
  { x: -44, y: -54, rotate: -80, color: '#A3B18A', shape: 'bit' },
  { x: -14, y: -62, rotate: 30, color: '#D4AF37', shape: 'spark' },
  { x: 18, y: -60, rotate: 160, color: '#B8C4E0', shape: 'bit' },
  { x: 50, y: -50, rotate: -120, color: '#E8B4B8', shape: 'bit' },
  { x: 82, y: -36, rotate: 60, color: '#D4AF37', shape: 'spark' },
  { x: 112, y: -14, rotate: -150, color: '#A3B18A', shape: 'bit' },
  { x: -132, y: 8, rotate: 90, color: '#B8C4E0', shape: 'bit' },
  { x: -96, y: -66, rotate: -20, color: '#D4AF37', shape: 'spark' },
  { x: -30, y: -84, rotate: 140, color: '#E8B4B8', shape: 'bit' },
  { x: 34, y: -82, rotate: -60, color: '#A3B18A', shape: 'bit' },
  { x: 96, y: -68, rotate: 20, color: '#D4AF37', shape: 'spark' },
  { x: 134, y: 6, rotate: -100, color: '#E8B4B8', shape: 'bit' },
] as const
const DONE = 'done'
const URL_STEPS = new Set(['currentUrl', 'redesignUrl'])
const SCAN_DONE_WAIT_MS = 60_000
const SCAN_FLOW_WAIT_MS = 5 * 60_000
const REACT_FIRST_TOKEN_MS = 3_000
const MAX_REACTIONS = 6

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
    /* storage unavailable */
  }
}

const str = (v: Answer | undefined) => (typeof v === 'string' ? v : '')
const list = (v: Answer | undefined) => (Array.isArray(v) ? v : [])
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''

const INTERLUDE_MS = 2500
type Interlude = { target: string; title?: string; message: string; pick?: string }

// Where focus lands when a step opens: its field, else its chosen or first option, else its heading.
const FOCUS_TARGETS = ['input[type="radio"]:checked', 'input:not([type="radio"]), textarea, input[type="radio"]', '[role="radio"][aria-checked="true"]', '[role="radio"], [role="checkbox"]', '[data-step-heading]']

function TextButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center text-[15px] font-normal text-neutral-500 hover:text-black ${focusRing} ${className}`}>
      {children}
    </button>
  )
}

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

function AnswersDrawer({ open, onClose, answers, upTo, onEdit, scan }: { open: boolean; onClose: () => void; answers: Answers; upTo: string; onEdit: (id: string) => void; scan: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open, onClose)
  if (!open) return null
  const path = buildPath(answers)
  const limit = upTo === DONE ? path.length : Math.max(0, path.indexOf(upTo))
  const visible = new Set(path.slice(0, limit))
  const rows = summarize(answers).filter((r) => visible.has(r.id))
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="q-answers-title"
        data-lenis-prevent
        className="absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <h2 id="q-answers-title" className="text-[17px] font-normal text-black">Your answers</h2>
          <TextButton onClick={onClose}>Close</TextButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          {scan && <div className="mb-5">{scan}</div>}
          {rows.length === 0 ? (
            <p className="text-[14px] font-normal text-neutral-500">Your answers will show here as you go.</p>
          ) : (
            <ol className="list-none divide-y divide-neutral-100 p-0">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[12px] font-normal text-neutral-400">{row.question}</span>
                    <span className="mt-0.5 block text-[14px] font-normal text-black">{row.answer}</span>
                  </div>
                  {upTo !== DONE && (
                    <TextButton onClick={() => onEdit(row.id)} className="shrink-0 text-[13px] font-normal text-black underline">
                      Edit
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

function LeaveConfirm({ open, onStay, onLeave }: { open: boolean; onStay: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open, onStay)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="q-leave-title"
        aria-describedby="q-leave-body"
        className="w-full max-w-[420px] bg-white p-8 shadow-xl"
      >
        <h3 id="q-leave-title" className={`m-0 ${formStepHeadingCompact}`}>Leave the planner?</h3>
        <p id="q-leave-body" className={`mt-4 ${formBody}`}>Your answers won’t be saved.</p>
        <div className={formFooterCompact}>
          <BackButton onClick={onStay}>Stay</BackButton>
          <PillButton onClick={onLeave}>Leave</PillButton>
        </div>
      </div>
    </div>
  )
}

export default function QuestionnairePage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
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
  const honeypotRef = useRef<HTMLInputElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [swapHint, setSwapHint] = useState(false)
  const [interlude, setInterlude] = useState<Interlude | null>(null)
  const interludeTimer = useRef<number | undefined>(undefined)
  const swapTimer = useRef<number | undefined>(undefined)

  const path = useMemo(() => buildPath(answers), [answers])
  const step: Step | undefined = STEPS[stepId]
  const index = path.indexOf(stepId)

  useEffect(() => { setDraft(readDraft()) }, [])
  useEffect(() => {
    if (stepId === INTRO || stepId === DONE || stepId === 'redesignExit') return
    writeDraft({ answers, stepId })
  }, [answers, stepId])
  useEffect(() => () => window.clearTimeout(swapTimer.current), [])

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [reduce])

  // After a step change, wait for the new step to mount (the old one animates
  // out first), then move focus into it.
  const focusPending = useRef(false)
  useEffect(() => {
    if (!focusPending.current) return
    let frame = 0
    let tries = 0
    const tick = () => {
      const root = document.querySelector<HTMLElement>(`[data-step="${stepId}"]`)
      if (root) {
        focusPending.current = false
        for (const selector of FOCUS_TARGETS) {
          const target = root.querySelector<HTMLElement>(selector)
          if (target) { target.focus({ preventScroll: true }); return }
        }
        return
      }
      if (++tries < 120) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [stepId])

  const cancelReaction = useCallback(() => {
    reactionRef.current?.controller.abort()
    reactionRef.current = null
    setReaction(null)
  }, [])

  const go = useCallback((target: string) => {
    window.clearTimeout(swapTimer.current)
    setSwapHint(false)
    if (reactionRef.current && reactionRef.current.forStep !== target) cancelReaction()
    setError(null)
    focusPending.current = true
    setStepId(target)
    scrollTop()
  }, [scrollTop, cancelReaction])

  const startReaction = useCallback((from: string, forStep: string, current: Answers) => {
    const target = STEPS[forStep]
    if (!STEPS[from]?.aiReact || !target || reactionsUsed.current >= MAX_REACTIONS) return
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

    // Dedicated welcome greeting pop-up when brand name is entered
    if (here.id === 'brandName') {
      const name = str(current.brandName).trim()
      if (name) {
        setInterlude({ 
          target, 
          title: 'WELCOME TO BRANDWORKS',
          message: `Nice to meet you, ${name}. Let’s build something extraordinary together.` 
        })
        window.clearTimeout(interludeTimer.current)
        interludeTimer.current = window.setTimeout(() => { setInterlude(null); go(target) }, INTERLUDE_MS)
        return
      }
    }

    // Proud, encouraging pop-up greeting after selecting work type
    if (here.id === 'workType' && here.kind === 'single') {
      const value = str(current.workType)
      const option = here.options.find((o) => o.value === value)
      if (option) {
        const personalizedCheer = cheerFor(option.value) || `Designing high-impact digital solutions for ${option.label}.`
        setInterlude({
          target,
          pick: option.label,
          message: personalizedCheer
        })
        window.clearTimeout(interludeTimer.current)
        interludeTimer.current = window.setTimeout(() => { setInterlude(null); go(target) }, INTERLUDE_MS)
        return
      }
    }

    go(target)
  }, [answers, stepId, go, submit, startScan, startReaction])

  const finishInterlude = useCallback(() => {
    if (!interlude) return
    window.clearTimeout(interludeTimer.current)
    setInterlude(null)
    go(interlude.target)
  }, [interlude, go])

  const back = useCallback(() => {
    if (stepId === DONE) return
    const i = path.indexOf(stepId)
    go(i <= 0 ? INTRO : path[i - 1])
  }, [path, stepId, go])

  // Exit: straight home when nothing is filled in, otherwise confirm first.
  // Leaving discards the saved draft, so the confirm's "won't be saved" holds.
  const leave = () => { writeDraft(null); navigate('/') }
  const requestExit = () => {
    if (Object.keys(answers).length === 0) leave()
    else setConfirmOpen(true)
  }

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
          setSwapHint(true)
          window.clearTimeout(swapTimer.current)
          swapTimer.current = window.setTimeout(() => setSwapHint(false), 2200)
          return
        }
      }
    }
    setAnswer(step.id, updated)
  }

  const greetKey = ['greet', answers.brandName, answers.workType, answers.workTypeOther, answers.operation, answers.websiteType].join('|')
  const uspKey = ['usp', answers.brandName, answers.usp].join('|')
  const recKey = ['rec', answers.brandName, answers.workType, answers.workTypeOther, answers.operation].join('|')

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
        setAiText((t) => ({ ...t, [key]: { text: task === 'greet' ? 'Thanks, that’s the basics covered.' : 'Thanks, noted.', streaming: false, ai: false } }))
      })
    return () => controller.abort()
  }, [stepId, greetKey, uspKey])

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
  }, [wantsRecommendation, recKey])

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
  }, [suggestKey])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    void getAiStatus().then((s) => { if (s && !s.aiProvider) setAiOff(true) })
  }, [])

  const scanId = str(answers.siteScanId)
  const scanFinished = scanView !== null
  const onDoneScreen = stepId === DONE

  useEffect(() => {
    doneAtRef.current = onDoneScreen ? Date.now() : null
    if (!onDoneScreen || !scanId || scanFinished) return
    const timer = window.setTimeout(() => setScanTimedOut(true), SCAN_DONE_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [onDoneScreen, scanId, scanFinished])

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
  }, [scanId, scanFinished, onDoneScreen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (interlude) {
        if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') { event.preventDefault(); finishInterlude() }
        return
      }
      if (drawerOpen || confirmOpen) return
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); requestExit(); return }
      if (event.defaultPrevented || event.altKey || (event.metaKey && event.key !== 'Enter')) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const typing = (tag === 'INPUT' && (target as HTMLInputElement).type !== 'radio') || tag === 'TEXTAREA' || target?.isContentEditable
      if (event.key === 'Enter') {
        if (stepId === INTRO || stepId === DONE || !step || step.kind === 'exit') return
        if (tag === 'TEXTAREA' && !(event.metaKey || event.ctrlKey)) return
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

  const stepAnimation = {
    initial: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 },
    transition: { duration: reduce ? 0 : 0.18, ease: EASE },
  }

  const name = firstName(str(answers.contactName))
  const completedSteps = stepId === INTRO ? 0 : stepId === DONE ? path.length : Math.max(0, index)
  const progressTotal = Math.max(1, path.filter((id) => STEPS[id]?.kind !== 'ai').length)
  const progressValue = stepId === INTRO ? 0 : stepId === DONE ? 100 : Math.min(100, Math.round((completedSteps / progressTotal) * 100))
  const stepNumber = Math.min(completedSteps + 1, progressTotal)
  const progressText = stepId === INTRO ? 'Ready' : stepId === DONE ? 'Complete' : `${stepNumber} of ${progressTotal}`

  // The intro panel sits beside the start screen and the first question only;
  // every later step is a single centred column.
  const split = stepId === INTRO || stepId === path[0]
  const Heading = split ? 'h2' : 'h1'
  // Option steps are sized to fit one laptop screen: less top padding and
  // tighter spacing.
  const fit = Boolean(step && (step.kind === 'single' || step.kind === 'multi'))

  const mailtoFallback = () => {
    const body = summarize(answers).map((r) => `${r.question}\n${r.answer}`).join('\n\n')
    return `mailto:${EMAIL}?subject=${encodeURIComponent(`Website project — ${str(answers.brandName) || 'new enquiry'}`)}&body=${encodeURIComponent(body)}`
  }

  const hintLine = (s: Step): string | null => {
    if (s.kind === 'multi') return swapHint ? 'Unselect one to swap' : s.max ? null : 'You can choose more than one.'
    // if ((s.kind === 'text' || s.kind === 'longtext') && s.optional) return 'Optional, skip it if you like'
    return null
  }

  // A question with one field gets a real <label> as its heading; a group of
  // options or fields is a fieldset whose legend holds the heading.
  const question = (s: Step, body: ReactNode, inputId?: string) => {
    const hint = hintLine(s)
    const title = <Heading data-step-heading tabIndex={-1} className={`m-0 outline-none ${fit ? formStepHeadingCompact : formStepHeading}`}>{inputId ? <label htmlFor={inputId}>{s.title}</label> : s.title}</Heading>
    const rest = (
      <>
        {hint && <p className={`m-0 mt-3 ${formHint}`} aria-live={s.kind === 'multi' ? 'polite' : undefined}>{hint}</p>}
        {s.helper && <Helper>{s.helper}</Helper>}
        <div className={fit ? 'mt-6' : 'mt-8'}>{body}</div>
        <ErrorText>{error}</ErrorText>
      </>
    )
    if (inputId) return <div>{title}{rest}</div>
    return (
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="m-0 p-0">{title}</legend>
        {rest}
      </fieldset>
    )
  }

  const renderStep = (s: Step) => {
    switch (s.kind) {
      case 'text':
        return question(s, (
          <BigInput
            id={`q-${s.id}`}
            value={str(answers[s.id])}
            onChange={(v) => setAnswer(s.id, v)}
            placeholder={s.placeholder}
            type={s.inputType === 'url' ? 'url' : 'text'}
            inputMode={s.inputType === 'url' ? 'url' : 'text'}
            autoComplete={s.inputType === 'url' ? 'url' : s.id === 'brandName' ? 'organization' : 'off'}
            maxLength={s.maxLength}
            invalid={Boolean(error)}
          />
        ), `q-${s.id}`)
      case 'longtext':
        return question(s, (
          <>
            <LongAnswer
              id={`q-${s.id}`}
              value={str(answers[s.id])}
              onChange={(v) => setAnswer(s.id, v)}
              placeholder={s.placeholder}
              maxLength={s.maxLength}
              voice={s.voice}
              invalid={Boolean(error)}
            />
            {s.aiSuggest && (suggestions[suggestKey]?.length ?? 0) > 0 && (
              <div className="mt-7">
                <span className={`mb-4 block ${formEyebrow}`}>Ideas for {workTypeLabel || 'your business'}</span>
                <div className="flex flex-wrap gap-2.5">
                  {suggestions[suggestKey].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => {
                        const current = str(answers[s.id]).trimEnd()
                        const joined = current ? `${current}${/[.!?,;:]$/.test(current) ? ' ' : '. '}${idea}` : idea
                        setAnswer(s.id, s.maxLength ? joined.slice(0, s.maxLength) : joined)
                      }}
                      className={`${formSmallButton} h-auto min-h-9 py-1.5 text-left`}
                    >
                      + {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ), `q-${s.id}`)
      case 'single': {
        const value = str(answers[s.id])
        return question(s, (
          <>
            <OptionTiles name={`q-${s.id}`} options={s.options} selected={value ? [value] : []} onToggle={pickSingle} label={s.title} />
            {s.otherValue && value === s.otherValue && (
              <div>
                <TextField label="Tell us briefly" name={`${s.id}Other`} id={`q-${s.id}Other`} value={str(answers[`${s.id}Other`])} onChange={(v) => setAnswer(`${s.id}Other`, v)} placeholder="Tell us briefly" maxLength={200} />
              </div>
            )}
            {s.assistValue && value === s.assistValue && (
              <div className="mt-7">
                <AiMessage
                  label={recommendation?.key === recKey && !recommendation.ai ? 'A common starting point' : 'BrandWorks suggests'}
                  text={recommendation?.key === recKey && recommendation.suggestion ? `${s.options.find((o) => o.value === recommendation.suggestion)?.label}. ${recommendation.message}` : null}
                  streaming={recommendation?.key === recKey ? recommendation.streaming : true}
                />
                {recommendation?.key === recKey && !recommendation.streaming && recommendation.suggestion && (
                  <div className="mt-6 flex flex-wrap items-center gap-6">
                    <PillButton onClick={() => { const u = { ...answers, [`${s.id}Suggested`]: recommendation.suggestion }; setAnswers(u); next(u) }}>
                      Sounds right
                    </PillButton>
                    <button type="button" onClick={() => { const u = { ...answers }; delete u[`${s.id}Suggested`]; setAnswers(u); next(u) }} className={formTextLink}>
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
        return question(s, <OptionTiles name={`q-${s.id}`} options={s.options} selected={list(answers[s.id])} onToggle={toggleMulti} multi label={s.title} />)
      case 'ai':
        return (
          <>
            <Heading data-step-heading tabIndex={-1} className="sr-only">{s.title}</Heading>
            <AiMessage text={aiText[uspKey]?.text || null} streaming={aiText[uspKey]?.streaming ?? true} large />
          </>
        )
      case 'exit':
        return (
          <div>
            <Heading data-step-heading tabIndex={-1} className="section-heading outline-none">Thanks for sharing.</Heading>
            <p className={`mt-6 max-w-[46ch] ${formBody}`}>{s.body}</p>
            <div className={formFooterPlain}>
              <BackButton onClick={back}>Change my answer</BackButton>
              <PillButton onClick={() => navigate('/services')}>Explore our services</PillButton>
            </div>
          </div>
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
            <p className={`mt-6 ${formFootnote}`}>
              We only use these details to reply about your project. Your answers are summarized with AI to help our team prepare.
            </p>
          </>
        ))
    }
  }

  const showFooter = step && step.kind !== 'exit'
  const nextLabel = !step ? 'Next'
    : step.kind === 'ai' ? step.cta
    : step.kind === 'contact' ? (status === 'sending' ? 'Sending…' : 'Send my plan')
    : (step.kind === 'longtext' || step.kind === 'text') && step.optional && !str(answers[step.id]).trim() ? 'Skip'
    : 'Next'
  const showReaction = Boolean(step && reaction?.forStep === stepId && reaction.text && step.kind !== 'ai'
    && !(step.kind === 'longtext' && step.aiIntro)
    && !(step.kind === 'single' && step.assistValue && answers[step.id] === step.assistValue))

  const stage = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={stepId} data-step={stepId} initial={stepAnimation.initial} animate={stepAnimation.animate} exit={stepAnimation.exit} transition={stepAnimation.transition}>

        {stepId === INTRO && (
          <div>
            <h2 data-step-heading tabIndex={-1} className={`m-0 max-w-[16ch] outline-none ${formStepHeading}`}>
              Let’s make the first conversation count.
            </h2>
            <p className={`mt-6 max-w-[46ch] ${formBody}`}>
              Tell us a little about what you’re building. It takes a few minutes, saves as you go, and gives our team the context to come prepared.
            </p>
            <div className={formFooterPlain}>
              {draft ? (
                <>
                  <BackButton onClick={() => start(false)}>Start over</BackButton>
                  <PillButton onClick={() => start(true)}>Continue draft</PillButton>
                </>
              ) : (
                <>
                  <span />
                  <PillButton onClick={() => start(false)}>Let’s get started</PillButton>
                </>
              )}
            </div>
          </div>
        )}

        {stepId === DONE && (
          <div role="status">
            <h1 data-step-heading tabIndex={-1} className="section-heading outline-none">
              Thanks{name ? `, ${name}` : ''}.
            </h1>
            <p className={`mt-6 max-w-[46ch] ${formBody}`}>
              Your plan is with us. Someone from BrandWorks will reply to {str(answers.contactEmail) || 'your email'}, usually within one working day.
            </p>
            {brief && (
              <div className="mt-10 border-t border-black/15 pt-7">
                <AiMessage label={briefAi ? 'Here’s what we heard' : 'What happens next'} text={brief.summary} />
                {brief.focus.length > 0 && (
                  <div className="mt-7">
                    <span className={`mb-4 block ${formEyebrow}`}>Where we’d start</span>
                    <ul className="m-0 list-none border-t border-black/15 p-0 text-[14px]">
                      {brief.focus.map((f) => (
                        <li key={f} className="border-b border-black/10 py-3">{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {scanTarget && scanId && (
              <div className="mt-10">
                <SiteScanCard
                  scan={scanView ?? { status: 'running', domain: scanTarget.domain, teaser: null, teaserAi: false, highlights: [], disclaimer: SCAN_DISCLAIMER }}
                  timedOut={scanTimedOut}
                />
              </div>
            )}
            <div className={formFooterPlain}>
              <Link to="/work" className={formTextLink}>See our work</Link>
              <PillButton onClick={() => {
                setAnswers({}); setBrief(null); setScanTarget(null); setScanChecks({}); setScanView(null); setScanTimedOut(false)
                scanUrlRef.current = null; reactionsUsed.current = 0; go(INTRO)
              }}>
                Plan another project
              </PillButton>
            </div>
          </div>
        )}

        {step && (
          <div>
            {step.kind === 'longtext' && step.aiIntro === 'greet' && (
              <AiMessage text={aiText[greetKey]?.text || null} streaming={aiText[greetKey]?.streaming ?? true} className="mb-8" />
            )}
            {showReaction && reaction && <AiMessage text={reaction.text} streaming={reaction.streaming} className={fit ? 'mb-5' : 'mb-8'} />}
            {renderStep(step)}
          </div>
        )}

      </motion.div>
    </AnimatePresence>
  )

  const footer = showFooter && step && (
    <div className={fit ? formFooterCompact : formFooterPlain}>
      <BackButton onClick={back} hidden={index <= 0} />
      <PillButton onClick={() => { if (status !== 'sending' && !interlude) next() }} busy={status === 'sending'} labelKey={`${stepId}-${nextLabel}`}>
        {nextLabel}
      </PillButton>
    </div>
  )

  const sendError = status === 'error' && (
    <p role="alert" className="mt-6 text-[14px] leading-[1.6]">
      Try again, or <a href={mailtoFallback()} className="underline underline-offset-4">send your answers by email instead</a>.
    </p>
  )

  return (
    <main className={`relative ${formPage}`}>
      {aiOff && (
        <div role="status" className="fixed inset-x-0 top-3 z-40 mx-auto flex w-[calc(100%-32px)] max-w-[520px] items-center justify-between gap-4 rounded-xl bg-black px-4 py-3 text-[13px] text-white shadow-lg">
          <span><span className="mr-2 font-normal text-[#CCFF00]">Dev</span>AI is off. Showing neutral copy.</span>
          <button type="button" onClick={() => setAiOff(false)} className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-[12px] hover:border-white">Dismiss</button>
        </div>
      )}

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Leave this empty<input ref={honeypotRef} type="text" name="website_url" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {/* Sits on the same line as the site logo (Header.tsx), which only shows from tablet width. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 mt-[18px] flex h-[64px] items-center justify-between px-[var(--hero-gutter)] lg:mt-[20px]">
        <Link to="/" className={`pointer-events-auto inline-flex items-center sm:hidden ${focusRing}`} aria-label="BrandWorks home">
          <span className="text-[15px] font-medium tracking-[-0.04em] text-black">BRANDWORKS<span className="text-[#9dc000]">.</span></span>
        </Link>
        <span className="hidden sm:block" aria-hidden="true" />
        <button
          type="button"
          onClick={requestExit}
          aria-label="Exit planner"
          title="Exit planner"
          className="group pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full border border-[#E5E5E5] bg-transparent text-[#111] outline-none transition-[background-color,border-color,scale] duration-150 hover:border-[#111] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111] active:scale-[0.96]"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
            {/* The arrow nudges out of the door on hover. */}
            <g className="transition-transform duration-150 ease-out group-hover:translate-x-[2px] motion-reduce:transition-none">
              <path d="M9 12h12" />
              <path d="M18 9l3 3-3 3" />
            </g>
          </svg>
        </button>
      </div>

      <section className={fit ? formSectionFit : formSection}>
        {/* One persistent live region, so every step change is announced. */}
        <p className="sr-only" role="status" aria-live="polite">
          {stepId === INTRO ? '' : stepId === DONE ? 'Plan sent' : `Step ${stepNumber} of ${progressTotal}${step && step.kind !== 'ai' ? `: ${step.title}` : ''}`}
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {split ? (
            <motion.div
              key="split"
              className="grid grid-cols-1 gap-14 md:min-h-[520px] md:grid-cols-12 md:gap-0"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            >
              {/* Left: the intro panel, with progress pinned to its foot */}
              <aside className="flex flex-col justify-between gap-10 md:col-span-5 md:pr-12 xl:pr-20">
                <div>
                  <span className={`mb-6 block ${formEyebrow}`}>Project planner</span>
                  <h1 className={`m-0 max-w-[12ch] ${formDisplayHeading}`}>A clear brief makes better work.</h1>
                  <p className={`mt-8 max-w-[38ch] ${formBody}`}>
                    Share what matters. We’ll use it to shape a focused first conversation.
                  </p>
                </div>
                <div className="max-w-[420px]">
                  <div className="mb-3 flex items-baseline justify-between text-[12px]">
                    <span className="text-black">Your progress</span>
                    <span className="tabular-nums text-black/55">{progressText}</span>
                  </div>
                  <ProgressBar value={progressValue / 100} />
                </div>
              </aside>

              {/* Right: the question */}
              <div className="min-w-0 md:col-span-7 md:border-l md:border-black/15 md:pl-12 xl:pl-20">
                {stage}
                {footer}
                {sendError}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="single"
              className="mx-auto w-full min-w-0 max-w-[760px]"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
            >
              {stepId !== DONE && (
                <div className={fit ? 'mb-7' : 'mb-10'}>
                  <ProgressBar value={progressValue / 100} />
                  <div className="mt-3 flex items-baseline justify-between gap-4 text-[12px]">
                    <span className="text-black">{step ? SECTION_LABELS[step.section] : ''}</span>
                    <span className="tabular-nums text-black/55">Step {stepNumber} of {progressTotal}</span>
                  </div>
                </div>
              )}
              {stage}
              {footer}
              {sendError}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Styled Greeting Interlude Modal - Strictly NO BOLD fonts */}
      <AnimatePresence>
        {interlude && (
          <motion.div
            key="interlude"
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-6 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={finishInterlude}
          >
            <motion.div
              role="status"
              aria-live="polite"
              className="relative w-full max-w-[480px] rounded-[28px] bg-[#FAF8F3] px-8 py-12 text-center shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5 sm:px-12"
              initial={reduce ? false : { opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {!reduce && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
                  {CONFETTI.map((c, i) => (
                    <motion.span
                      key={i}
                      className="absolute"
                      style={{ color: c.color }}
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
                      animate={{ opacity: [0, 1, 0], x: c.x, y: c.y, scale: 1, rotate: c.rotate }}
                      transition={{ duration: 1.4, delay: 0.15 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {c.shape === 'spark' ? (
                        <svg viewBox="0 0 10 10" className="size-3" fill="currentColor"><path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" /></svg>
                      ) : (
                        <span className="block h-2 w-[3px] rounded-full bg-current" />
                      )}
                    </motion.span>
                  ))}
                </div>
              )}

              {(interlude.pick || interlude.title) && (
                <div className="mb-6 flex items-center justify-center gap-3">
                  <span className="h-px w-8 bg-neutral-200" />
                  <span className="text-[11px] font-normal tracking-[0.25em] text-neutral-500 uppercase">
                    {interlude.pick || interlude.title}
                  </span>
                  <span className="h-px w-8 bg-neutral-200" />
                </div>
              )}

              <motion.p
                className="mx-auto max-w-[360px] text-[24px] font-normal leading-[1.35] tracking-tight text-neutral-900"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                {interlude.message}
              </motion.p>

              <div className="mx-auto mt-10 h-px w-24 overflow-hidden bg-neutral-100">
                <motion.div
                  className="h-full bg-neutral-900"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: INTERLUDE_MS / 1000, ease: 'linear' }}
                />
              </div>

              <span className="mt-4 block text-[11px] font-normal tracking-wide text-neutral-400">Tap anywhere to continue</span>
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
      
      <LeaveConfirm open={confirmOpen} onStay={() => setConfirmOpen(false)} onLeave={leave} />
    </main>
  )
}
