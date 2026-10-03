import { useState } from 'react'
import './FAQs.css'

const faqs = [
  {
    question: 'What can BRANDWORKS handle?',
    answer:
      'Film, photography, founder reputation, PR, social content, graphic and motion design, websites, SEO, AEO, GEO and performance marketing.',
  },
  {
    question: 'Do we need to use every service?',
    answer:
      'No. We build the scope around what the brand actually needs.',
  },
  {
    question: 'Can BRANDWORKS work with our existing team?',
    answer:
      'Yes. We can lead an engagement or work alongside internal marketing, communications, design and technology teams.',
  },
  {
    question: 'Do you work with founders directly?',
    answer:
      'Yes. We work with founders on positioning, media, reputation, content and their wider digital presence.',
  },
  {
    question: 'Do you handle ongoing work?',
    answer:
      'Yes. Some engagements are focused productions or builds; others continue across content, search, performance or reputation.',
  },
  {
    question: 'Where do you work?',
    answer:
      'We work across markets and can support teams internationally.',
  },
]

function FAQs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="faq-section" aria-labelledby="faq-heading">
      <header className="faq-header">
        <h2 id="faq-heading" className="faq-title">
          Questions, answered.
        </h2>

        <p className="faq-intro">
          Practical answers about how BRANDWORKS works,
          <br className="hidden sm:block" />
          what we handle and how engagements are structured.
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