import { useState } from 'react'

const faqs = [
  {
    question: 'What services does BRANDWORKS offer?',
    answer:
      'We offer brand strategy, content and creative production, and social media and marketing services designed to help brands grow and stand out.',
  },
  {
    question: 'Who do you work with?',
    answer:
      'We work with startups, growing businesses, and established brands across a range of industries who want to build a stronger identity and reach.',
  },
  {
    question: 'Can you work with an existing brand?',
    answer:
      'Yes, we can refresh, evolve, or fully rebuild an existing brand identity while keeping what already works for your audience.',
  },
  {
    question: 'Do you offer customised solutions?',
    answer:
      'Every project is tailored to your goals, audience, and budget, we do not believe in one size fits all packages.',
  },
  {
    question: 'Do you provide ongoing support?',
    answer:
      'Yes, we offer ongoing support and optimisation after launch to make sure your brand keeps performing and growing.',
  },
]

function FAQs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 py-20 text-center">
      <span className="site-kicker text-neutral-500">FAQs</span>

      <h2 className="site-display mt-4 w-full max-w-[760px] text-neutral-900 uppercase">
        Questions, Answered
      </h2>

      <p className="site-copy mt-5 w-full max-w-[700px] text-center text-neutral-600">
        Everything you need to know about working with BRANDWORKS
        <br className="hidden sm:block" />
        and how we bring ideas to life.
      </p>

      <div
        className="mt-14 flex w-full max-w-[797px] flex-col"
        style={{ gap: '24px' }}
      >
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index
          return (
            <div
              key={faq.question}
              style={{
                width: '100%',
                maxWidth: '797px',
                minHeight: '56px',
                transform: 'rotate(0deg)',
                opacity: 1,
                borderRadius: '8px',
                borderWidth: '1.5px',
                paddingTop: '10px',
                paddingRight: '16px',
                paddingBottom: '10px',
                paddingLeft: '16px',
              }}
              className="border border-neutral-200 bg-neutral-100 text-left"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="text-[16px] leading-[1.4] font-medium text-neutral-900">
                  {faq.question}
                </span>
                <span
                  aria-hidden="true"
                  className="relative h-5 w-5 shrink-0"
                >
                  <span
                    className={`absolute top-1/2 left-1/2 h-[2px] w-5 -translate-x-1/2 -translate-y-1/2 bg-neutral-900 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                  <span
                    className={`absolute top-1/2 left-1/2 h-[2px] w-5 -translate-x-1/2 -translate-y-1/2 bg-neutral-900 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 opacity-0' : 'rotate-90 opacity-100'
                    }`}
                  />
                </span>
              </button>

              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="text-[15px] leading-[1.55] font-normal text-neutral-600">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default FAQs
