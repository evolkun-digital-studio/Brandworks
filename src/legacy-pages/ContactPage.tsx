import FormConsent from './legal/FormConsent'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useNativeMetadata } from '../routing/context'
import { BackButton, Chip, EASE, ErrorText, Label, PillButton, ProgressBar, TextField, formFooter, formPage, formSection } from '../components/ContactForm/ContactForm'

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

const EMAIL = 'hello@brandworks.me'

const services = [
  'Videography',
  'Photography',
  'Social Media & Content',
  'PR & Founder Reputation',
  'Performance & SEO',
  'Graphics & Animation',
  'Website Development',
  'Advertising',
]

const budgets = ['Under ₹50K', '₹50K – ₹1L', '₹1L – ₹2.5L', '₹2.5L – ₹5L', '₹5L+', 'Not decided yet']
const timelines = ['Immediately', 'Within 1 month', '1–3 months', '3–6 months', 'Flexible']

const STEPS = ['What you need', 'The project', 'About you'] as const
const MAX_FILE_MB = 10

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function useDelhiTime() {
  const format = () =>
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date())
  const hour = () => Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()))
  // Keep the initial render identical on the server and client. The live
  // clock is browser-only and is populated after hydration.
  const [time, setTime] = useState('')
  const [h, setH] = useState(0)
  useEffect(() => {
    const update = () => { setTime(format()); setH(hour()) }
    update()
    const id = window.setInterval(update, 30_000)
    return () => window.clearInterval(id)
  }, [])
  const awake = h >= 9 && h < 20
  return { time, awake }
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

type Form = {
  services: string[]
  budget: string
  timeline: string
  message: string
  name: string
  email: string
  phone: string
  company: string
  website: string
  location: string
}

const EMPTY: Form = { services: [], budget: '', timeline: '', message: '', name: '', email: '', phone: '', company: '', website: '', location: '' }

export default function ContactPage() {
  const nativeMetadata = useNativeMetadata()
  const reduce = useReducedMotion()
  const { time, awake } = useDelhiTime()

  const [form, setForm] = useState<Form>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const [sentName, setSentName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (nativeMetadata) return
    const previous = document.title
    document.title = 'Contact — BRANDWORKS'
    return () => { document.title = previous }
  }, [nativeMetadata])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const toggleService = (s: string) =>
    set('services', form.services.includes(s) ? form.services.filter((x) => x !== s) : [...form.services, s])

  const validate = (index: number) => {
    const next: Partial<Record<keyof Form, string>> = {}
    if (index === 0 && form.services.length === 0) next.services = 'Pick at least one, even if you’re not sure yet.'
    if (index === 1 && form.message.trim().length < 10) next.message = 'A sentence or two about the project helps us reply properly.'
    if (index === 2) {
      if (!form.name.trim()) next.name = 'What should we call you?'
      if (!isEmail(form.email)) next.email = 'That email doesn’t look quite right.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goTo = (target: number) => {
    if (target > step && !validate(step)) return
    setDirection(target > step ? 1 : -1)
    setStep(target)
    topRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const pickFile = (f: File | undefined | null) => {
    setFileError('')
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`That file is over ${MAX_FILE_MB} MB. Send a link in your message instead.`)
      return
    }
    setFile(f)
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step < STEPS.length - 1) { goTo(step + 1); return }
    if (!validate(2)) return

    const data = new FormData()
    data.set('services', form.services.join(', '))
    ;(['budget', 'timeline', 'message', 'name', 'email', 'phone', 'company', 'website', 'location'] as const).forEach((k) => data.set(k, form[k]))
    if (file) data.set('brief', file)
    const honeypot = formRef.current?.querySelector<HTMLInputElement>('input[name="company_url"]')?.value
    if (honeypot) data.set('company_url', honeypot)

    try {
      setStatus('sending')
      const response = await fetch('/api/contact', { method: 'POST', body: data })
      if (!response.ok) throw new Error()
      setSentName(form.name.trim().split(' ')[0])
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const reset = () => {
    setForm(EMPTY)
    setFile(null)
    setStep(0)
    setStatus('idle')
    setErrors({})
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  const mailtoFallback = useMemo(() => {
    const body = [
      `Services: ${form.services.join(', ') || '-'}`,
      `Budget: ${form.budget || '-'}`,
      `Timeline: ${form.timeline || '-'}`,
      '',
      form.message,
      '',
      `${form.name}${form.company ? `, ${form.company}` : ''}`,
      form.phone,
    ].join('\n')
    return `mailto:${EMAIL}?subject=${encodeURIComponent('New project enquiry')}&body=${encodeURIComponent(body)}`
  }, [form])

  const slide = {
    enter: (dir: number) => ({ opacity: 0, x: reduce ? 0 : dir * 48, filter: reduce ? 'none' : 'blur(6px)' }),
    center: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: (dir: number) => ({ opacity: 0, x: reduce ? 0 : dir * -48, filter: reduce ? 'none' : 'blur(6px)' }),
  }

  const headline = 'Tell us what you’re building.'

  return (
    <main className={formPage}>
      <section className={formSection}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-0">
          {/* ------------------------------------------------------------ */}
          {/* Left: heading + direct contact                               */}
          {/* ------------------------------------------------------------ */}
          <aside className="lg:col-span-5 lg:pr-12 xl:pr-20">
            <div className="lg:sticky lg:top-32">
              <h1 className="max-w-[12ch] font-(--font-primary) text-[clamp(44px,5.6vw,92px)] font-normal leading-[0.92] tracking-[-0.045em]">
                <span className="sr-only">{headline}</span>
                <span aria-hidden="true">
                  {headline.split(' ').map((word, i) => (
                    <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-[0.06em] align-bottom">
                      <motion.span
                        className="inline-block"
                        initial={reduce ? false : { y: '105%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.07 }}
                      >
                        {word}
                      </motion.span>
                    </span>
                  ))}
                </span>
              </h1>

              <motion.p
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
                className="mt-8 max-w-[38ch] text-[16px] leading-[1.65] text-black/60"
              >
                Three short steps. Tell us what you need, a little about the project, and how to reach you. A real person reads every enquiry.
              </motion.p>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
                className="mt-12 max-w-[420px] border-t border-black/15"
              >
                <div className="flex items-center justify-between gap-4 border-b border-black/15 py-5">
                  <div className="min-w-0">
                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">New business</span>
                    <a href={`mailto:${EMAIL}`} className="text-[16px] tracking-[-0.01em] underline decoration-black/20 underline-offset-4 transition-colors hover:decoration-black">
                      {EMAIL}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="relative h-9 shrink-0 overflow-hidden rounded-full border border-black/15 px-4 text-[12px] transition-colors hover:border-black"
                    aria-live="polite"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={copied ? 'copied' : 'copy'}
                        className="block"
                        initial={{ y: 14, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -14, opacity: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
                <div className="border-b border-black/15 py-5">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">Where we are</span>
                  <span className="text-[16px] tracking-[-0.01em]">India, working with clients worldwide</span>
                </div>
                <div className="py-5">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">Our time</span>
                  <span className="text-[16px] tracking-[-0.01em]">
                    It’s {time} in India.{' '}
                    <span className="text-black/50">{awake ? 'We’re around.' : 'We’re probably offline, but we’ll see it in the morning.'}</span>
                  </span>
                </div>
              </motion.div>
            </div>
          </aside>

          {/* ------------------------------------------------------------ */}
          {/* Right: the form                                              */}
          {/* ------------------------------------------------------------ */}
          <div ref={topRef} className="scroll-mt-28 lg:col-span-7 lg:border-l lg:border-black/15 lg:pl-12 xl:pl-20">
            <AnimatePresence mode="wait" initial={false}>
              {status === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                  className="flex min-h-[560px] flex-col justify-between"
                  role="status"
                >
                  <div>
                    <motion.div
                      className="mb-10 grid size-16 place-items-center rounded-full bg-[#ccff00]"
                      initial={reduce ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
                    >
                      <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
                        <motion.path
                          d="M5 12.5 10 17 19 7"
                          stroke="#111"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={reduce ? false : { pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
                        />
                      </svg>
                    </motion.div>
                    <h2 className="section-heading">
                      Thanks{sentName ? `, ${sentName}` : ''}. We’ve got it.
                    </h2>
                    <p className="mt-6 max-w-[46ch] text-[16px] leading-[1.65] text-black/60">
                      We’ll read your note, look at your website if you shared one, and reply to {form.email || 'your email'}. If it’s urgent, email us directly and mention your enquiry.
                    </p>
                    <dl className="mt-10 max-w-[520px] border-t border-black/15 text-[14px]">
                      {[
                        ['Services', form.services.join(', ')],
                        ['Budget', form.budget],
                        ['Timeline', form.timeline],
                        ['Attachment', file?.name],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[120px_1fr] gap-4 border-b border-black/10 py-3">
                            <dt className="text-black/45">{k}</dt>
                            <dd className="m-0">{v}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                  <button type="button" onClick={reset} className="mt-12 self-start border-b border-black/40 pb-1 text-[13px] transition-colors hover:border-black">
                    Send another enquiry
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  ref={formRef}
                  onSubmit={handleSubmit}
                  noValidate
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="w-full"
                >
                  {/* progress */}
                  <nav aria-label="Enquiry steps" className="mb-10">
                    <ol className="m-0 grid list-none grid-cols-3 gap-3 p-0">
                      {STEPS.map((label, i) => (
                        <li key={label}>
                          <button
                            type="button"
                            onClick={() => (i < step ? goTo(i) : undefined)}
                            disabled={i > step}
                            aria-current={i === step ? 'step' : undefined}
                            className="group block w-full text-left disabled:cursor-default"
                          >
                            <ProgressBar value={i <= step ? 1 : 0} />
                            <span className={`mt-3 block text-[12px] transition-colors ${i === step ? 'text-black' : i < step ? 'text-black/55 group-hover:text-black' : 'text-black/30'}`}>
                              {label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </nav>

                  {/* honeypot (hidden from people, tempting for bots) */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label>
                      Leave this empty
                      <input type="text" name="company_url" tabIndex={-1} autoComplete="off" />
                    </label>
                  </div>

                  <div className="relative min-h-[520px]">
                    <AnimatePresence mode="wait" custom={direction} initial={false}>
                      <motion.div
                        key={step}
                        custom={direction}
                        variants={slide}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.45, ease: EASE }}
                      >
                        {step === 0 && (
                          <fieldset className="m-0 border-0 p-0">
                            <legend className="mb-3 font-(--font-primary) text-[clamp(28px,3vw,44px)] leading-[1] tracking-[-0.03em]">What can we help with?</legend>
                            <p className="mb-8 text-[14px] text-black/50">Choose one or more. You can change this later.</p>
                            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Services">
                              {services.map((s) => (
                                <Chip key={s} active={form.services.includes(s)} onClick={() => toggleService(s)}>{s}</Chip>
                              ))}
                            </div>
                            <ErrorText>{errors.services}</ErrorText>
                          </fieldset>
                        )}

                        {step === 1 && (
                          <div>
                            <h2 className="section-heading mb-8">Tell us about the project</h2>

                            <div className="border-b border-black/15 pb-7">
                              <Label htmlFor="message">What are you working on?</Label>
                              <textarea
                                id="message"
                                name="message"
                                rows={5}
                                maxLength={2500}
                                value={form.message}
                                aria-invalid={Boolean(errors.message)}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('message', e.target.value)}
                                placeholder="The goal, what exists already, and anything you’ve tried."
                                className="w-full resize-none bg-transparent text-[20px] leading-[1.5] tracking-[-0.02em] text-black outline-none placeholder:text-black/25"
                              />
                              <ErrorText>{errors.message}</ErrorText>
                            </div>

                            <div className="border-b border-black/15 py-7">
                              <Label hint="Optional">Budget</Label>
                              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Budget">
                                {budgets.map((b) => (
                                  <Chip key={b} role="radio" active={form.budget === b} onClick={() => set('budget', form.budget === b ? '' : b)}>{b}</Chip>
                                ))}
                              </div>
                            </div>

                            <div className="border-b border-black/15 py-7">
                              <Label hint="Optional">Timeline</Label>
                              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Timeline">
                                {timelines.map((t) => (
                                  <Chip key={t} role="radio" active={form.timeline === t} onClick={() => set('timeline', form.timeline === t ? '' : t)}>{t}</Chip>
                                ))}
                              </div>
                            </div>

                            <div className="py-7">
                              <Label hint={`Optional · up to ${MAX_FILE_MB} MB`}>Brief or reference</Label>
                              <input
                                ref={fileRef}
                                id="brief"
                                type="file"
                                className="sr-only"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                                onChange={(e) => pickFile(e.target.files?.[0])}
                              />
                              {file ? (
                                <div className="flex items-center justify-between gap-4 border border-black/15 px-5 py-4">
                                  <span className="min-w-0 truncate text-[14px]">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                                    className="shrink-0 text-[12px] text-black/50 underline underline-offset-4 hover:text-black"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <label
                                  htmlFor="brief"
                                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                                  onDragLeave={() => setDragging(false)}
                                  onDrop={onDrop}
                                  className={`flex cursor-pointer items-center justify-between gap-4 border border-dashed px-5 py-6 transition-colors duration-300 ${dragging ? 'border-black bg-[#ccff00]/40' : 'border-black/20 hover:border-black/60'}`}
                                >
                                  <span className="text-[14px] text-black/55">
                                    {dragging ? 'Drop it here' : 'Drag a file here, or click to choose one'}
                                  </span>
                                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-black/20 text-[18px] font-light">+</span>
                                </label>
                              )}
                              <ErrorText>{fileError}</ErrorText>
                            </div>
                          </div>
                        )}

                        {step === 2 && (
                          <div>
                            <h2 className="section-heading mb-2">How do we reach you?</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                              <TextField label="Name" name="name" placeholder="Your name" autoComplete="name" value={form.name} onChange={(v) => set('name', v)} error={errors.name} />
                              <TextField label="Work email" name="email" type="email" placeholder="you@company.com" autoComplete="email" value={form.email} onChange={(v) => set('email', v)} error={errors.email} />
                              <TextField label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" value={form.phone} onChange={(v) => set('phone', v)} optional />
                              <TextField label="Company" name="company" placeholder="Company or brand" autoComplete="organization" value={form.company} onChange={(v) => set('company', v)} optional />
                              <TextField label="Website" name="website" type="url" placeholder="yourcompany.com" autoComplete="url" value={form.website} onChange={(v) => set('website', v)} optional />
                              <TextField label="Location" name="location" placeholder="City, country" autoComplete="address-level2" value={form.location} onChange={(v) => set('location', v)} optional />
                            </div>
                            <p className="mt-6 text-[12px] leading-[1.6] text-black/45">
                              We only use these details to reply to your enquiry.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* footer actions */}
                  <div className={formFooter}>
                    <BackButton onClick={() => goTo(step - 1)} hidden={step === 0} />
                    <PillButton type="submit" disabled={status === 'sending'} labelKey={`${step}-${status}`}>
                      {status === 'sending' ? 'Sending…' : step < STEPS.length - 1 ? 'Continue' : 'Send enquiry'}
                    </PillButton>
                  </div>

                  <FormConsent className="mt-6" />

                  <AnimatePresence>
                    {status === 'error' && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-6 text-[14px] leading-[1.6]"
                      >
                        That didn’t go through, sorry. Try again, or{' '}
                        <a href={mailtoFallback} className="underline underline-offset-4">send it by email instead</a>
                        {' '}(we’ve filled it in for you).
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Prefer email? */}
      <section className="mx-auto w-full max-w-[1720px] px-5 sm:px-8 lg:px-12 xl:px-16">
        <a href={`mailto:${EMAIL}`} className="group grid min-h-[200px] grid-cols-[1fr_auto] items-end gap-10 border-t border-black/15 py-9 lg:min-h-[260px]">
          <span className="font-(--font-primary) text-[clamp(40px,6vw,104px)] font-normal leading-[0.9] tracking-[-0.045em]">
            <span className="grid overflow-hidden">
              <span className="col-start-1 row-start-1 block transition-transform duration-[650ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full">Prefer email?</span>
              <span className="col-start-1 row-start-1 block translate-y-full self-end text-[0.62em] transition-transform duration-[650ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0">{EMAIL}</span>
            </span>
          </span>
          <span className="mb-1 grid size-14 place-items-center rounded-full border border-black/20 transition-all duration-500 group-hover:rotate-45 group-hover:border-[#ccff00] group-hover:bg-[#ccff00] sm:size-16">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
              <path d="M6 18 18 6M9 6h9v9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
        </a>
      </section>
    </main>
  )
}
