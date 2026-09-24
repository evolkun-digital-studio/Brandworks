import { useState } from 'react'
import './FAQs.css'

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
    <section className="faq-section" aria-labelledby="faq-heading">
      <header className="faq-header"> 

        <h2 id="faq-heading" className="faq-title">
          Questions, Answered
        </h2>

        <p className="faq-intro">
          Everything you need to know about working with BRANDWORKS
          <br className="hidden sm:block" />
          and how we bring ideas to life.
        </p>
      </header>

      <div className="faq-list">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index
          const answerId = `faq-answer-${index}`
          return (
            <div
              key={faq.question}
              className={`faq-item ${isOpen ? 'is-open' : ''}`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={answerId}
                className="faq-question-row"
              >
                <span className="faq-question">{faq.question}</span>
                <span aria-hidden="true" className="faq-icon">
                  <span className="faq-icon__line faq-icon__line--horizontal" />
                  <span className="faq-icon__line faq-icon__line--vertical" />
                </span>
              </button>

              <div
                id={answerId}
                className={`faq-answer ${isOpen ? 'is-open' : ''}`}
                aria-hidden={!isOpen}
              >
                <div className="faq-answer__inner">
                  <p className="faq-answer__text">{faq.answer}</p>
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
