'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Browser dictation for the free-text questions ("Voice or text — free
 * form"). Uses the Web Speech API where it exists (Chrome, Edge, Safari);
 * elsewhere `supported` is false and the mic button simply isn't shown.
 * Audio never touches BrandWorks servers — only the transcript is typed in.
 */
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recRef = useRef<Recognition | null>(null)
  const onFinalRef = useRef(onFinal)
  useEffect(() => { onFinalRef.current = onFinal })

  useEffect(() => { setSupported(Boolean(getCtor())) }, [])
  useEffect(() => () => recRef.current?.stop(), [])

  const stop = useCallback(() => { recRef.current?.stop() }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    setError('')
    const rec = new Ctor()
    rec.lang = navigator.language || 'en-IN'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event) => {
      let pending = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) onFinalRef.current(result[0].transcript.trim())
        else pending += result[0].transcript
      }
      setInterim(pending)
    }
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setError('Microphone access was blocked. You can type instead.')
      else if (event.error !== 'aborted' && event.error !== 'no-speech') setError('Couldn’t hear that. Try again, or type instead.')
    }
    rec.onend = () => { setListening(false); setInterim('') }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [])

  return { supported, listening, interim, error, start, stop }
}
