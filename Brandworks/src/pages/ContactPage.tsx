import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const services = [
  'Videography',
  'Photography',
  'Social Media & Content',
  'PR & Founder Reputation',
  'Performance & SEO',
  'Graphics & Animation',
]

const budgets = [
  'Under ₹50K',
  '₹50K – ₹1L',
  '₹1L – ₹2.5L',
  '₹2.5L – ₹5L',
  '₹5L+',
  'Not decided yet',
]

const timelines = [
  'Immediately',
  'Within 1 month',
  '1–3 months',
  '3–6 months',
  'Flexible',
]

export default function ContactPage() {
  const reduceMotion = useReducedMotion()

  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    formData.set('services', selectedServices.join(', '))

    try {
      setStatus('sending')

      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error()

      form.reset()
      setSelectedServices([])
      setFileName('')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111] antialiased">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[1720px] px-5 pb-20 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pb-28 lg:pt-40 xl:px-16"
      >
        <div className=" ">
          <div className="flex min-h-[62px] items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-black/45">Contact</span>

            <div className="flex items-center gap-3"> 
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">New projects</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 border-t border-black/15 lg:grid-cols-12">
          <div className="flex flex-col justify-between border-black/15 pb-14 pt-12 lg:col-span-5 lg:min-h-[760px] lg:border-r lg:pb-10 lg:pr-12 lg:pt-14 xl:pr-16">
            <h1 className="max-w-[580px] text-[44px] font-normal leading-[0.96] tracking-[-0.045em] sm:text-[50px] lg:text-[56px] xl:text-[62px]">
              Tell us what needs to be understood.
            </h1>

            <div className="mt-20 hidden lg:block">
              <div className="max-w-[390px] border-t border-black/15">
                <a href="mailto:hello@brandworks.me" className="group flex items-center justify-between border-b border-black/15 py-5">
                  <div>
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.15em] text-black/35">New business</span>
                    <span className="text-[14px] font-medium tracking-[-0.01em]">hello@brandworks.me</span>
                  </div>

                  <span className="text-[17px] transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">↗</span>
                </a>

                <div className="flex items-center justify-between border-b border-black/15 py-5">
                  <div>
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.15em] text-black/35">Availability</span>
                    <span className="text-[14px] font-medium tracking-[-0.01em]">India · Worldwide</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 lg:pl-12 xl:pl-16">
            <form onSubmit={handleSubmit} className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <Field label="Name" name="name" placeholder="Your name" autoComplete="name" required />

                <Field label="Work email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />

                <Field label="Phone" name="phone" type="tel" placeholder="+91 / +971" autoComplete="tel" />

                <Field label="Company" name="company" placeholder="Company or brand" autoComplete="organization" />

                <Field label="Website" name="website" type="url" placeholder="yourcompany.com" autoComplete="url" />

                <SelectField label="Budget" name="budget" placeholder="Select range" options={budgets} />
              </div>

              <div className="border-b border-black/15 py-9">
                <div className="mb-7 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-black/40">Inquiry for</span>
                  <span className="text-[11px] text-black/30">Choose one or more</span>
                </div>

                <div className="grid grid-cols-1 border-t border-black/10 sm:grid-cols-2">
                  {services.map((service, index) => {
                    const active = selectedServices.includes(service)

                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`group flex min-h-[62px] items-center justify-between border-b border-black/10 px-0 text-left transition-all duration-300 sm:px-4 ${index % 2 === 0 ? 'sm:border-r' : ''} ${active ? 'bg-[#ccff00] px-4 sm:px-4' : 'hover:bg-black/[0.025]'}`}
                      >
                        <span className="pr-5 text-[14px] font-medium tracking-[-0.01em]">{service}</span>

                        <span className={`relative h-5 w-5 shrink-0 rounded-full border transition-all duration-300 ${active ? 'border-black bg-black' : 'border-black/25 group-hover:border-black/60'}`}>
                          <span className={`absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <SelectField label="Timeline" name="timeline" placeholder="Select timeline" options={timelines} />

                <Field label="Location" name="location" placeholder="City / Country" />
              </div>

              <div className="group border-b border-black/15 py-9 transition-colors duration-300 focus-within:border-black">
                <div className="mb-6 flex items-center justify-between">
                  <label htmlFor="message" className="text-[10px] font-medium uppercase tracking-[0.15em] text-black/40">Project</label>
                  <span className="text-[11px] text-black/30">A few lines is enough</span>
                </div>

                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  maxLength={2500}
                  required
                  placeholder="What are you working on?"
                  className="w-full resize-none bg-transparent text-[20px] font-normal leading-[1.5] tracking-[-0.025em] text-black outline-none placeholder:text-black/18"
                />
              </div>

              <div className="border-b border-black/15 py-7">
                <input
                  id="brief"
                  name="brief"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}
                />

                <label htmlFor="brief" className="group flex cursor-pointer items-center justify-between">
                  <div>
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.15em] text-black/40">Project brief</span>

                    <span className={`block text-[14px] font-medium tracking-[-0.01em] ${fileName ? 'text-black' : 'text-black/35'}`}>
                      {fileName || 'Attach a file — optional'}
                    </span>
                  </div>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 text-[18px] font-light transition-all duration-300 group-hover:border-black group-hover:bg-black group-hover:text-white">+</span>
                </label>
              </div>

              <div className="py-9">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="group relative flex min-h-[68px] w-full items-center justify-between overflow-hidden bg-[#111] px-6 text-white transition-colors duration-300 hover:bg-[#ccff00] hover:text-black disabled:pointer-events-none disabled:opacity-40"
                >
                  <span className="relative z-10 text-[14px] font-medium tracking-[-0.01em]">
                    {status === 'sending' ? 'Sending inquiry' : 'Send inquiry'}
                  </span>

                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-[17px] transition-all duration-300 group-hover:translate-x-1 group-hover:border-black/30">
                    ↗
                  </span>
                </button>

                {status === 'success' && (
                  <div className="mt-5 flex items-center gap-3 text-[13px] font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#ccff00]" />
                    Your inquiry has been received.
                  </div>
                )}

                {status === 'error' && (
                  <p className="mt-5 text-[13px] font-medium">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="border-t border-black/15">
          <a href="mailto:hello@brandworks.me" className="group grid min-h-[150px] grid-cols-[1fr_auto] items-end gap-10 py-7 sm:min-h-[175px] sm:py-9 lg:min-h-[200px]">
            <span className="max-w-[1100px] text-[32px] font-normal leading-none tracking-[-0.04em] sm:text-[42px] lg:text-[52px]">
              Prefer email?
            </span>

            <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full border border-black/20 text-[20px] transition-all duration-300 group-hover:rotate-45 group-hover:bg-[#ccff00] sm:h-14 sm:w-14">
              ↗
            </span>
          </a>
        </div>
      </motion.section>
    </main>
  )
}

type FieldProps = {
  label: string
  name: string
  type?: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  autoComplete,
  required,
}: FieldProps) {
  return (
    <div className="group border-b border-black/15 py-7 transition-colors duration-300 focus-within:border-black">
      <label htmlFor={name} className="mb-4 block text-[10px] font-medium uppercase tracking-[0.15em] text-black/40 transition-colors duration-300 group-focus-within:text-black">
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full bg-transparent text-[16px] font-normal tracking-[-0.015em] text-black outline-none placeholder:text-black/20"
      />
    </div>
  )
}

type SelectFieldProps = {
  label: string
  name: string
  placeholder: string
  options: string[]
}

function SelectField({
  label,
  name,
  placeholder,
  options,
}: SelectFieldProps) {
  return (
    <div className="group border-b border-black/15 py-7 transition-colors duration-300 focus-within:border-black">
      <label htmlFor={name} className="mb-4 block text-[10px] font-medium uppercase tracking-[0.15em] text-black/40">
        {label}
      </label>

      <div className="relative">
        <select
          id={name}
          name={name}
          defaultValue=""
          className="w-full cursor-pointer appearance-none bg-transparent pr-10 text-[16px] font-normal tracking-[-0.015em] text-black outline-none"
        >
          <option value="" disabled>
            {placeholder}
          </option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[14px] text-black/35">↓</span>
      </div>
    </div>
  )
}
