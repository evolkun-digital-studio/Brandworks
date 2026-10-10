'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './HomeIntroStatement.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const STATEMENT =
  'We connect business strategy, technology, design, and customer experience to create complete solutions.'

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

          const placeCaret = (char: HTMLElement, before = false) => {
            const host = statement.getBoundingClientRect()
            const rect = char.getBoundingClientRect()

            gsap.set(caret, {
              x: (before ? rect.left : rect.right) - host.left,
              y: rect.top - host.top + rect.height * 0.08,
              height: rect.height * 0.84,
            })
          }

          gsap.set(chars, { autoAlpha: 0 })
          placeCaret(firstChar, true)

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
              placeCaret(firstChar, true)
            })

          let cursor = 0.18

          chars.forEach((char) => {
            typing.to(
              char,
              {
                autoAlpha: 1,
                duration: 0.07,
                ease: 'power1.out',
              },
              cursor
            )
            typing.call(
              () => {
                activeChar = char
                placeCaret(char)
              },
              undefined,
              cursor
            )

            cursor += /[,.]/.test(char.textContent ?? '') ? 0.14 : 0.035
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
              cursor + 1.15
            )

          for (let index = chars.length - 1; index >= 0; index -= 1) {
            const char = chars[index]
            const previousChar = chars[index - 1]

            if (!char) continue

            typing.set(char, { autoAlpha: 0 }, '+=0.014')
            typing.call(
              () => {
                activeChar = previousChar

                if (previousChar) {
                  placeCaret(previousChar)
                } else {
                  placeCaret(firstChar, true)
                }
              },
              undefined,
              '<'
            )
          }

          typing.to(caret, { autoAlpha: 0, duration: 0.22 }, '+=0.45')
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
