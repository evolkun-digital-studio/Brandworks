/**
 * One-shot signals for the opening preloader's hand-over:
 *
 * - revealed  the preloader has started leaving — the hero copy can rise
 * - settled   the preloader is completely gone — heavy page work (the
 *             hero film, background prefetching, per-frame scroll loops)
 *             can start without competing with the intro for frames
 *
 * The gate is armed by the Preloader module itself as it loads — i.e.
 * before any component renders — so a component mounting in the same
 * commit already sees it pending. Anything rendered without the
 * Preloader (tests, other layouts) finds it idle and just proceeds. A
 * timeout settles it regardless, so nothing can be left waiting on a
 * loader that never finishes.
 */
type Listener = () => void

let state: 'idle' | 'pending' | 'revealed' | 'settled' = 'idle'
const revealListeners = new Set<Listener>()
const settleListeners = new Set<Listener>()
const FAILSAFE_MS = 12000

function flush(listeners: Set<Listener>) {
  listeners.forEach((listener) => listener())
  listeners.clear()
}

export function armIntro() {
  if (state !== 'idle') return
  state = 'pending'
  window.setTimeout(settleIntro, FAILSAFE_MS)
}

export function isIntroPending() {
  return state === 'pending'
}

/** True when nothing is (any longer) covering the page. */
export function isIntroSettled() {
  return state === 'idle' || state === 'settled'
}

/** The preloader has started leaving. */
export function finishIntro() {
  if (state !== 'pending') return
  state = 'revealed'
  flush(revealListeners)
}

/** The preloader is gone. Implies revealed. */
export function settleIntro() {
  if (state === 'settled') return
  finishIntro()
  state = 'settled'
  flush(settleListeners)
}

/** Calls `listener` once the intro starts handing over (immediately if it isn't pending). Returns an unsubscribe. */
export function onIntroDone(listener: Listener): () => void {
  if (state !== 'pending') {
    listener()
    return () => undefined
  }
  revealListeners.add(listener)
  return () => {
    revealListeners.delete(listener)
  }
}

/** Calls `listener` once the preloader is completely gone (immediately if nothing is covering the page). Returns an unsubscribe. */
export function onIntroSettled(listener: Listener): () => void {
  if (isIntroSettled()) {
    listener()
    return () => undefined
  }
  settleListeners.add(listener)
  return () => {
    settleListeners.delete(listener)
  }
}
