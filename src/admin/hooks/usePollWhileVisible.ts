import { useEffect, useRef } from 'react'

/** Calls `poll` on an interval while `active` and the tab is visible, catching up as soon as it's visible again. */
export function usePollWhileVisible(active: boolean, poll: () => void, intervalMs = 5000) {
  const latest = useRef(poll)
  useEffect(() => { latest.current = poll })

  useEffect(() => {
    if (!active) return
    let timer: number | undefined
    const stop = () => {
      window.clearInterval(timer)
      timer = undefined
    }
    const start = () => {
      if (timer === undefined && !document.hidden) timer = window.setInterval(() => latest.current(), intervalMs)
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else {
        latest.current()
        start()
      }
    }
    start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active, intervalMs])
}
