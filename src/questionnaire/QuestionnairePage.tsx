'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link } from '../routing'
import { trackEvent } from '../analytics/analytics'
import { AnalyticsEvents } from '../analytics/events'
import {
  SECTION_LABELS,
  STEPS,
  branchOf,
  buildPath,
  estimatedLength,
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
import { SiteScanCard, SiteScanChecklist, type ScanChecks } from './SiteScanCard'
import { BigInput, ContactFields, EASE, Helper, KEYS, LongAnswer, OptionRows, VisualCards } from './fields'

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

function PrimaryButton({ children, onClick, disabled, type = 'button' }: { children: string; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex min-h-[58px] items-center gap-5 overflow-hidden rounded-full bg-[#111] pl-7 pr-2 text-white transition-opacity duration-300 disabled:opacity-50"
    >
      <span className="absolute inset-0 origin-bottom scale-y-0 bg-bw-lime transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-y-100 group-disabled:scale-y-0" aria-hidden="true" />
      <span className="relative text-[14px] font-medium tracking-[-0.01em] transition-colors duration-300 group-hover:text-black">{children}</span>
      <span className="relative grid size-11 place-items-center rounded-full bg-white text-black transition-transform duration-500 group-hover:rotate-45">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true"><path d="M6 18 18 6M9 6h9v9" stroke="currentColor" strokeWidth="1.8" /></svg>
      </span>
    </button>
  )
}

function ErrorLine({ children }: { children: string | null }) {
  return (
    <AnimatePresence>
      {children && (
        <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 text-[14px] text-[#c4302b]">
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

/** The live plan in the side column — the brief building up as they answer. */
function PlanSoFar({ answers, upTo }: { answers: Answers; upTo: string }) {
  const path = buildPath(answers)
  const limit = upTo === DONE ? path.length : Math.max(0, path.indexOf(upTo))
  const visible = new Set(path.slice(0, limit))
  const rows = summarize(answers).filter((r) => visible.has(r.id))
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [rows.length])
  return (
    <div className="mt-12 hidden max-w-[440px] border-t border-black/15 lg:block">
      <span className="block py-4 text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">Your plan so far</span>
      {rows.length === 0 ? (
        <p className="m-0 text-[14px] leading-[1.6] text-black/40">Your answers will build up here as you go.</p>
      ) : (
        <ol ref={listRef} className="m-0 max-h-[46vh] list-none overflow-y-auto p-0 pr-2" data-lenis-prevent>
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <motion.li
                key={row.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="border-b border-black/10 py-3"
              >
                <span className="block text-[12px] leading-[1.4] text-black/45">{row.question}</span>
                <span className="mt-1 line-clamp-2 block text-[14px] leading-[1.45] tracking-[-0.01em]">{row.answer}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function QuestionnairePage() {
  const reduce = useReducedMotion()
  const [answers, setAnswers] = useState<Answers>({})
  const [stepId, setStepId] = useState<string>(INTRO)
  const [direction, setDirection] = useState(1)
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
  const honeypotRef = useRef<HTMLInputElement>(null)
  const advanceTimer = useRef<number | undefined>(undefined)

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
  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  /* ---- navigation --------------------------------------------------------- */
  const scrollTop = useCallback(() => {
    const el = topRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [reduce])

  /** Stops a reaction that is still streaming and takes it off screen. */
  const cancelReaction = useCallback(() => {
    reactionRef.current?.controller.abort()
    reactionRef.current = null
    setReaction(null)
  }, [])

  const go = useCallback((target: string, dir: number) => {
    window.clearTimeout(advanceTimer.current)
    // A reaction belongs to the question it was started for; moving anywhere else cancels it.
    if (reactionRef.current && reactionRef.current.forStep !== target) cancelReaction()
    setError(null)
    setDirection(dir)
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
      go(DONE, 1)
      return
    }
    if (result.stepId && result.stepId !== 'contact' && STEPS[result.stepId]) {
      setStatus('idle')
      go(result.stepId, -1)
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
    go(target, 1)
  }, [answers, stepId, go, submit, startScan, startReaction])

  const back = useCallback(() => {
    if (stepId === DONE) return
    const i = path.indexOf(stepId)
    go(i <= 0 ? INTRO : path[i - 1], -1)
  }, [path, stepId, go])

  const start = (resume: boolean) => {
    if (resume && draft) {
      setAnswers(draft.answers)
      go(draft.stepId, 1)
    } else {
      setAnswers({})
      writeDraft(null)
      go('brandName', 1)
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
    window.clearTimeout(advanceTimer.current)
    const waits = (step.otherValue && value === step.otherValue) || (step.assistValue && value === step.assistValue)
    if (!waits) advanceTimer.current = window.setTimeout(() => next(updated), reduce ? 60 : 340)
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
        else { setError(`Pick up to ${step.max}. Unselect one to swap it.`); return }
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
      if (event.defaultPrevented || event.altKey || (event.metaKey && event.key !== 'Enter')) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (event.key === 'Enter') {
        if (stepId === INTRO || stepId === DONE || !step || step.kind === 'exit') return
        if (tag === 'TEXTAREA' && !(event.metaKey || event.ctrlKey)) return
        if (tag === 'BUTTON') return
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
  const slide = {
    enter: (dir: number) => ({ opacity: 0, y: reduce ? 0 : dir * 36, filter: reduce ? 'none' : 'blur(6px)' }),
    center: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: (dir: number) => ({ opacity: 0, y: reduce ? 0 : dir * -36, filter: reduce ? 'none' : 'blur(6px)' }),
  }

  const progress = stepId === INTRO ? 0 : stepId === DONE ? 1 : Math.min(1, questionNumber / Math.max(total, 1))
  const name = firstName(str(answers.contactName))

  const mailtoFallback = () => {
    const body = summarize(answers).map((r) => `${r.question}\n${r.answer}`).join('\n\n')
    return `mailto:${EMAIL}?subject=${encodeURIComponent(`Website project — ${str(answers.brandName) || 'new enquiry'}`)}&body=${encodeURIComponent(body)}`
  }

  const renderStep = (s: Step) => {
    const title = (
      <h2 id="q-title" className="m-0 max-w-[22ch] font-(--font-primary) text-[clamp(30px,3.6vw,54px)] font-normal leading-[1.02] tracking-[-0.035em]">
        {s.title}
      </h2>
    )
    switch (s.kind) {
      case 'text':
        return (
          <>
            {title}
            {s.helper && <Helper>{s.helper}</Helper>}
            <div className="mt-10">
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
            </div>
          </>
        )
      case 'longtext':
        return (
          <>
            {s.aiIntro === 'greet' && <AiMessage text={aiText[greetKey]?.text || null} streaming={aiText[greetKey]?.streaming ?? true} className="mb-10" />}
            {title}
            {s.helper && <Helper>{s.helper}</Helper>}
            <div className="mt-8">
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
            </div>
            {s.aiSuggest && (suggestions[suggestKey]?.length ?? 0) > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mt-5">
                <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Ideas for {workTypeLabel || 'your business'}</span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {suggestions[suggestKey].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => {
                        const current = str(answers[s.id]).trimEnd()
                        const joined = current ? `${current}${/[.!?,;:]$/.test(current) ? ' ' : '. '}${idea}` : idea
                        setAnswer(s.id, s.maxLength ? joined.slice(0, s.maxLength) : joined)
                      }}
                      className="rounded-full border border-black/15 px-3.5 py-2 text-[13px] leading-none text-black/75 transition-colors hover:border-black hover:text-black"
                    >
                      + {idea}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )
      case 'single': {
        const value = str(answers[s.id])
        return (
          <>
            {title}
            {s.helper && <Helper>{s.helper}</Helper>}
            <div className="mt-9">
              {s.layout === 'visual'
                ? <VisualCards options={s.options} selected={value ? [value] : []} onToggle={pickSingle} label={s.title} />
                : <OptionRows options={s.options} selected={value ? [value] : []} onToggle={pickSingle} label={s.title} />}
            </div>
            {s.otherValue && value === s.otherValue && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                <BigInput id={`q-${s.id}Other`} label="Describe it briefly" value={str(answers[`${s.id}Other`])} onChange={(v) => setAnswer(`${s.id}Other`, v)} placeholder="Describe it briefly" maxLength={200} autoFocus />
              </motion.div>
            )}
            {s.assistValue && value === s.assistValue && (
              <div className="mt-10 rounded-2xl border border-black/15 p-5 sm:p-6">
                {/* Only a model answer is "BrandWorks suggests"; the written fallback is labelled as what it is. */}
                <AiMessage
                  label={recommendation?.key === recKey && !recommendation.ai ? 'A common starting point' : 'BrandWorks suggests'}
                  text={recommendation?.key === recKey && recommendation.suggestion ? `${s.options.find((o) => o.value === recommendation.suggestion)?.label}. ${recommendation.message}` : null}
                  streaming={recommendation?.key === recKey ? recommendation.streaming : true}
                />
                {recommendation?.key === recKey && !recommendation.streaming && recommendation.suggestion && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-5 flex flex-wrap gap-2.5 pl-11">
                    <button type="button" onClick={() => { const u = { ...answers, [`${s.id}Suggested`]: recommendation.suggestion }; setAnswers(u); next(u) }} className="h-10 rounded-full bg-[#111] px-5 text-[13px] text-white transition-colors hover:bg-black/80">
                      Sounds right
                    </button>
                    <button type="button" onClick={() => { const u = { ...answers }; delete u[`${s.id}Suggested`]; setAnswers(u); next(u) }} className="h-10 rounded-full border border-black/20 px-5 text-[13px] transition-colors hover:border-black">
                      Keep it open, decide together
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </>
        )
      }
      case 'multi': {
        const values = list(answers[s.id])
        return (
          <>
            {title}
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {s.helper && <p className="m-0 text-[15px] text-black/55 sm:text-[16px]">{s.helper}</p>}
              {s.max && <span className="text-[13px] tabular-nums text-black/40">{values.length} of {s.max} picked</span>}
            </div>
            <div className="mt-9">
              <OptionRows options={s.options} selected={values} onToggle={toggleMulti} multi max={s.max} label={s.title} />
            </div>
          </>
        )
      }
      case 'ai':
        return (
          <>
            <AiMessage text={aiText[uspKey]?.text || null} streaming={aiText[uspKey]?.streaming ?? true} />
            <div className="mt-12 pl-11">
              <PrimaryButton onClick={() => next()} disabled={!aiText[uspKey] || aiText[uspKey].streaming}>{s.cta}</PrimaryButton>
            </div>
          </>
        )
      case 'exit':
        return (
          <div className="rounded-3xl bg-[#fbe3df] p-7 sm:p-10">
            <h2 className="m-0 font-(--font-primary) text-[clamp(34px,4vw,60px)] font-normal leading-[1] tracking-[-0.04em]">{s.heading}</h2>
            <p className="mt-6 max-w-[50ch] text-[16px] leading-[1.65] text-black/70 sm:text-[17px]">{s.body}</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button type="button" onClick={back} className="h-12 rounded-full bg-[#111] px-6 text-[14px] text-white transition-colors hover:bg-black/80">
                Change my answer
              </button>
              <Link to="/services" className="h-12 rounded-full border border-black/25 px-6 text-[14px] leading-[48px] transition-colors hover:border-black">
                Explore our other services
              </Link>
            </div>
          </div>
        )
      case 'contact':
        return (
          <>
            {title}
            {s.helper && <Helper>{s.helper}</Helper>}
            <div className="mt-4">
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
            </div>
            <p className="mt-6 text-[12px] leading-[1.6] text-black/45">
              We only use these details to reply about your project. Your answers are summarised with AI to help our team prepare.
            </p>
          </>
        )
    }
  }

  const showFooter = step && step.kind !== 'ai' && step.kind !== 'exit'
  const autoAdvances = step?.kind === 'single' && !(step.otherValue && answers[step.id] === step.otherValue) && !(step.assistValue && answers[step.id] === step.assistValue)

  return (
    <main className="min-h-screen overflow-x-clip bg-white text-[#111] antialiased">
      {aiOff && (
        <div role="status" className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-32px)] max-w-[520px] items-center justify-between gap-4 rounded-2xl bg-[#111] px-4 py-3 text-[13px] text-white shadow-lg">
          <span><span className="mr-2 font-medium text-bw-lime">Dev</span>AI is off. Showing neutral copy.</span>
          <button type="button" onClick={() => setAiOff(false)} className="shrink-0 rounded-full border border-white/25 px-3 py-1 text-[12px] hover:border-white">Dismiss</button>
        </div>
      )}
      <section className="mx-auto w-full max-w-[1720px] px-5 pb-24 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pt-40 xl:px-16">
        <div className={`grid grid-cols-1 lg:grid-cols-12 lg:gap-0 ${stepId === INTRO || stepId === DONE ? 'gap-12' : 'gap-8'}`}>
          {/* ---------------------------------------------------------------- */}
          {/* Aside: heading, progress, the plan building up                    */}
          {/* ---------------------------------------------------------------- */}
          <aside className="lg:col-span-4 lg:pr-10 xl:pr-16">
            <div className="lg:sticky lg:top-32">
              <span className={`${stepId === INTRO || stepId === DONE ? 'inline-flex' : 'hidden lg:inline-flex'} mb-5 items-center gap-2 rounded-full border border-black/15 py-1.5 pl-2 pr-3.5 text-[12px] text-black/60`}>
                <span className="grid size-4 place-items-center rounded-full bg-[#111]"><span className="size-1.5 rounded-full bg-bw-lime" /></span>
                Website project planner
              </span>
              <h1 className={`m-0 max-w-[11ch] font-(--font-primary) font-normal leading-[0.92] tracking-[-0.045em] ${stepId === INTRO || stepId === DONE ? 'text-[clamp(40px,4.6vw,80px)]' : 'text-[28px] sm:text-[40px] lg:text-[clamp(40px,4.6vw,80px)]'}`}>
                Let’s plan your website.
              </h1>

              {stepId !== INTRO && stepId !== DONE && (
                <div className="mt-9 max-w-[440px]">
                  <div className="flex items-baseline justify-between gap-4 text-[12px]">
                    <span className="text-black/60">{step ? SECTION_LABELS[step.section] : ''}</span>
                    {step && step.kind !== 'exit' && <span className="tabular-nums text-black/40">{questionNumber} / {total}</span>}
                  </div>
                  <div className="mt-3 h-[2px] w-full overflow-hidden bg-black/10" role="progressbar" aria-label="Questionnaire progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                    <motion.div className="h-full origin-left bg-black" initial={false} animate={{ scaleX: progress }} transition={{ duration: 0.6, ease: EASE }} />
                  </div>
                </div>
              )}

              {scanTarget && stepId !== INTRO && stepId !== DONE && (
                <SiteScanChecklist domain={scanTarget.domain} checks={scanChecks} failed={scanView?.status === 'failed'} />
              )}

              <PlanSoFar answers={answers} upTo={stepId} />
            </div>
          </aside>

          {/* ---------------------------------------------------------------- */}
          {/* Main: one question at a time                                     */}
          {/* ---------------------------------------------------------------- */}
          <div ref={topRef} className="min-w-0 scroll-mt-28 lg:col-span-8 lg:border-l lg:border-black/15 lg:pl-12 xl:pl-20">
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Leave this empty<input ref={honeypotRef} type="text" name="website_url" tabIndex={-1} autoComplete="off" /></label>
            </div>

            <div className="relative min-h-[540px]">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={stepId}
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.34, ease: EASE }}
                  role={step && step.kind !== 'ai' && step.kind !== 'exit' ? 'group' : undefined}
                  aria-labelledby={step && step.kind !== 'ai' && step.kind !== 'exit' ? 'q-title' : undefined}
                >
                  {stepId === INTRO && (
                    <div className="max-w-[720px]">
                      <AiMessage text="Hi — I’m here to help you shape your website project. I’ll ask a few quick questions about your business and what you need, then put together a short plan our team picks up from." />
                      <ul className="m-0 mt-12 grid list-none grid-cols-1 gap-0 border-t border-black/15 p-0 sm:grid-cols-3">
                        {[
                          ['About 3 minutes', 'Most answers are one tap.'],
                          ['Shaped by your answers', 'New site, redesign or new features — you only see what applies.'],
                          ['Type or talk', 'Explain your idea in your own words.'],
                        ].map(([t, d]) => (
                          <li key={t} className="border-b border-black/15 py-5 sm:border-b-0 sm:pr-6">
                            <span className="block text-[15px] font-medium tracking-[-0.01em]">{t}</span>
                            <span className="mt-1 block text-[13px] leading-[1.5] text-black/50">{d}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-12 flex flex-wrap items-center gap-6">
                        {draft ? (
                          <>
                            <PrimaryButton onClick={() => start(true)}>Continue where you left off</PrimaryButton>
                            <button type="button" onClick={() => start(false)} className="border-b border-black/30 pb-1 text-[13px] text-black/60 transition-colors hover:border-black hover:text-black">
                              Start over
                            </button>
                          </>
                        ) : (
                          <PrimaryButton onClick={() => start(false)}>Start planning</PrimaryButton>
                        )}
                      </div>
                    </div>
                  )}

                  {stepId === DONE && (
                    <div className="max-w-[760px]" role="status">
                      <motion.div
                        className="mb-10 grid size-16 place-items-center rounded-full bg-bw-lime"
                        initial={reduce ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                      >
                        <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
                          <motion.path d="M5 12.5 10 17 19 7" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 0.4 }} />
                        </svg>
                      </motion.div>
                      <h2 className="m-0 font-(--font-primary) text-[clamp(36px,4.4vw,68px)] font-normal leading-[0.98] tracking-[-0.04em]">
                        Thanks{name ? `, ${name}` : ''}. Your plan is with us.
                      </h2>
                      {brief && (
                        <div className="mt-10 rounded-3xl border border-black/15 p-6 sm:p-8">
                          {/* Neutral copy when the summary couldn't be written by the model. */}
                          <AiMessage label={briefAi ? 'Here’s what we heard' : 'What happens next'} text={brief.summary} />
                          {brief.focus.length > 0 && (
                            <div className="mt-8 border-t border-black/10 pt-6 sm:pl-11">
                              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Where we’d start</span>
                              <ul className="m-0 mt-3 list-none p-0">
                                {brief.focus.map((f) => (
                                  <li key={f} className="flex gap-3 py-1.5 text-[15px] leading-[1.5]">
                                    <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-black" />
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
                      <p className="mt-8 max-w-[52ch] text-[16px] leading-[1.65] text-black/60">
                        Someone from BrandWorks will read your answers and reply to {str(answers.contactEmail) || 'your email'}, usually within one working day.
                      </p>
                      <div className="mt-10 flex flex-wrap items-center gap-6">
                        <Link to="/work" className="h-12 rounded-full bg-[#111] px-6 text-[14px] leading-[48px] text-white transition-colors hover:bg-black/80">See our work</Link>
                        <button type="button" onClick={() => {
                          setAnswers({}); setBrief(null); setScanTarget(null); setScanChecks({}); setScanView(null); setScanTimedOut(false)
                          scanUrlRef.current = null; reactionsUsed.current = 0; go(INTRO, -1)
                        }} className="border-b border-black/30 pb-1 text-[13px] text-black/60 hover:border-black hover:text-black">
                          Plan another project
                        </button>
                      </div>
                    </div>
                  )}

                  {step && (
                    <div className="max-w-[860px]">
                      {/* Mobile: the live website check, compact, on the questions after the URL step. */}
                      {scanTarget && step.kind !== 'exit' && path.some((id) => URL_STEPS.has(id)) && path.indexOf(stepId) > path.findIndex((id) => URL_STEPS.has(id)) && (
                        <SiteScanChecklist domain={scanTarget.domain} checks={scanChecks} failed={scanView?.status === 'failed'} compact />
                      )}
                      {reaction?.forStep === stepId && reaction.text && (
                        <AiMessage text={reaction.text} streaming={reaction.streaming} compact className="mb-8" />
                      )}
                      {renderStep(step)}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {showFooter && step && (
              <div className="max-w-[860px]">
                <ErrorLine>{error}</ErrorLine>
                {status === 'error' && (
                  <p className="mt-2 text-[14px] leading-[1.6]">
                    Try again, or{' '}
                    <a href={mailtoFallback()} className="underline underline-offset-4">send your answers by email instead</a>
                    {' '}(we’ve filled it in for you).
                  </p>
                )}
                <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/15 pt-8">
                  <button type="button" onClick={back} className="text-[13px] text-black/55 transition-colors hover:text-black">← Back</button>
                  <div className="flex items-center gap-5">
                    <span className="hidden text-[12px] text-black/35 md:inline">
                      {step.kind === 'longtext' ? 'Ctrl + Enter ↵' : step.kind === 'single' || step.kind === 'multi' ? `Press ${KEYS[0]}–${KEYS[step.options.length - 1]} or Enter ↵` : 'Press Enter ↵'}
                    </span>
                    {!(autoAdvances && !answers[step.id]) && (
                      <PrimaryButton onClick={() => next()} disabled={status === 'sending'}>
                        {status === 'sending' ? 'Writing your plan…' : step.kind === 'contact' ? 'Send my plan' : step.kind === 'longtext' && step.optional && !str(answers[step.id]).trim() ? 'Skip for now' : 'Continue'}
                      </PrimaryButton>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
