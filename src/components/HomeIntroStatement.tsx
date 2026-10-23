'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './HomeIntroStatement.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const STATEMENT =
  'Brandworks connects business strategy, technology, design, and customer experience to create complete solutions.'

const EMPHASIZED_WORDS = new Set(['strategy', 'technology', 'design'])

import BrandworksPhilosophy from './av'

export default function HomeIntroStatement() {
  const sectionRef = useRef<HTMLElement>(null)
  const statementRef = useRef<HTMLHeadingElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const statement = statementRef.current

      if (!statement) return

      const media = gsap.matchMedia()

      media.add('(prefers-reduced-motion: no-preference)', () => {
        const caret = caretRef.current
        const chars = gsap.utils.toArray<HTMLElement>(
          statement.querySelectorAll('[data-char]')
        )
        const firstChar = chars[0]
        let resizeObserver: ResizeObserver | undefined

        if (caret && firstChar) {
          let activeChar: HTMLElement | undefined = firstChar

          const moveCaretX = gsap.quickTo(caret, 'x', {
            duration: 0.08,
            ease: 'power2.out',
          })
          const moveCaretY = gsap.quickTo(caret, 'y', {
            duration: 0.14,
            ease: 'power2.out',
          })
          const resizeCaret = gsap.quickTo(caret, 'height', {
            duration: 0.14,
            ease: 'power2.out',
          })

          const placeCaret = (
            char: HTMLElement,
            before = false,
            immediate = false
          ) => {
            const host = statement.getBoundingClientRect()
            const rect = char.getBoundingClientRect()
            const x = (before ? rect.left : rect.right) - host.left
            const y = rect.top - host.top + rect.height * 0.08
            const height = rect.height * 0.84

            if (immediate) {
              gsap.set(caret, { x, y, height })
              return
            }

            moveCaretX(x)
            moveCaretY(y)
            resizeCaret(height)
          }

          gsap.set(chars, { autoAlpha: 0, y: '0.16em' })
          placeCaret(firstChar, true, true)

          resizeObserver = new ResizeObserver(() => {
            if (activeChar) placeCaret(activeChar)
          })
          resizeObserver.observe(statement)

          const typing = gsap.timeline({
            repeat: -1,
            repeatDelay: 0.35,
            scrollTrigger: {
              trigger: statement,
              start: 'top 78%',
              end: 'bottom 20%',
              toggleActions: 'play pause resume pause',
            },
          })

          typing
            .set(chars, { autoAlpha: 0 })
            .set(caret, { autoAlpha: 1, opacity: 1 })
            .call(() => {
              activeChar = undefined
              gsap.set(chars, { y: '0.16em' })
              placeCaret(firstChar, true, true)
            })

          let cursor = 0.16

          chars.forEach((char) => {
            typing.to(
              char,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.34,
                ease: 'power3.out',
              },
              cursor
            )
            typing.call(
              () => {
                activeChar = char
                placeCaret(char)
              },
              undefined,
              cursor + 0.06
            )

            const character = char.textContent ?? ''
            const isLastCharacterInWord =
              char === char.parentElement?.lastElementChild

            cursor += /[,.]/.test(character)
              ? 0.13
              : isLastCharacterInWord
                ? 0.055
                : 0.028
          })

          typing
            .to(
              caret,
              {
                opacity: 0,
                duration: 0.28,
                repeat: 3,
                yoyo: true,
                ease: 'power2.inOut',
              },
              cursor + 0.9
            )
            .to(
              chars,
              {
                autoAlpha: 0,
                y: '-0.1em',
                duration: 0.28,
                stagger: 0.004,
                ease: 'power2.in',
              },
              '+=0.38'
            )
            .to(caret, { autoAlpha: 0, duration: 0.18 }, '<0.08')
        }

        return () => resizeObserver?.disconnect()
      })

      return () => media.revert()
    },
    { scope: sectionRef }
  )

  return (
    <>
      <section
        ref={sectionRef}
        className={styles.section}
        aria-labelledby="brandworks-intro-statement"
      >
        <div className={styles.inner}>
          <div className={styles.statementBlock}>
            <h2
              ref={statementRef}
              id="brandworks-intro-statement"
              className={styles.statement}
              aria-label={STATEMENT}
            >
              <span className={styles.statementText} aria-hidden="true">
                {STATEMENT.split(' ').map((word, index, words) => (
                  <span
                    className={`${styles.wordClip} ${
                      EMPHASIZED_WORDS.has(word.replace(/[^a-z]/gi, ''))
                        ? styles.emphasisWord
                        : ''
                    }`}
                    key={`${word}-${index}`}
                  >
                    <span className={styles.word}>
                      {Array.from(word).map((char, charIndex) => (
                        <span key={charIndex} data-char>
                          {char}
                        </span>
                      ))}
                    </span>
                    {index < words.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </span>

              <span
                ref={caretRef}
                className={styles.caret}
                aria-hidden="true"
              />
            </h2>
          </div>
        </div>
      </section>

      <BrandworksPhilosophy />
    </>
  )
}
