import { useState } from 'react'
import photo16 from './Photo/Photo16.png'
import { trackEvent } from './analytics/analytics'
import { AnalyticsEvents } from './analytics/events'

function Contact() {
  const [agreed, setAgreed] = useState(false)

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-20 lg:flex-row lg:items-stretch">
      <img
        src={photo16}
        alt="Let's talk"
        loading="lazy"
        decoding="async"
        className="aspect-[4/5] w-full rounded-[16px] object-cover lg:w-1/2"
      />

      <div className="flex w-full flex-col lg:w-1/2">
        <h2 className="site-heading text-neutral-900">
          Let&apos;s Talk
        </h2>

        <p className="site-copy mt-4 max-w-[560px] text-neutral-600">
          Have a project in mind or looking to automate your workflow? Tell
          us what you need and our team will get back to you shortly.
        </p>

        <form
          className="mt-8 flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            // Only the fact that a submission was attempted — never
            // any field value (Phase 12, Part 12).
            trackEvent({ name: AnalyticsEvents.contactCtaClick, params: { source: 'contact_form' } })
          }}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="fullName"
              className="text-[14px] font-medium text-neutral-900"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Enter you Name"
              className="w-full rounded-[10px] border border-neutral-300 px-4 py-3 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-[14px] font-medium text-neutral-900"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter you Email"
              className="w-full rounded-[10px] border border-neutral-300 px-4 py-3 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="socialUrl"
              className="text-[14px] font-medium text-neutral-900"
            >
              Social Media Url
            </label>
            <input
              id="socialUrl"
              type="text"
              placeholder="Enter you social media url"
              className="w-full rounded-[10px] border border-neutral-300 px-4 py-3 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="queries"
              className="text-[14px] font-medium text-neutral-900"
            >
              Queries
            </label>
            <textarea
              id="queries"
              placeholder="Enter your Query"
              rows={5}
              className="w-full resize-none rounded-[10px] border border-neutral-300 px-4 py-3 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3 text-[14px] text-neutral-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-neutral-400"
            />
            I agree to be contacted by{' '}
            <span className="font-semibold text-neutral-900 underline underline-offset-2">
              BRANDWORKS
            </span>{' '}
            regarding my inquiry.
          </label>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-neutral-900 py-4 text-[14px] font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            Send Inquiry
          </button>
        </form>
      </div>
    </section>
  )
}

export default Contact
