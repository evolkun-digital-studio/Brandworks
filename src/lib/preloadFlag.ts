/**
 * Shared names for the opening preloader's first-paint handoff.
 *
 * The decision "does this page load get the preloader?" is made by
 * PRELOAD_SCRIPT, inlined at the top of <head> in app/layout.tsx, so it
 * runs before the first paint. It puts PRELOAD_CLASS on <html>, which
 * (Preloader.css) shows the server-rendered black overlay with the dim
 * logo and hides the navbar's logo and links. No flash of the page, no
 * flash of the navbar, and no layout shift: the navbar is always in the
 * DOM, only transparent.
 *
 * The Preloader component takes over that same overlay once hydrated and
 * removes the class when it hands over. If the app's JS never runs, the
 * script's own failsafe removes the class so the page can't stay covered.
 */
export const PRELOAD_CLASS = 'bw-preload'
/** Set on <html> by the Preloader while it runs; the failsafe looks for it. */
export const LOADER_ATTR = 'data-bw-loader'
/** Once per browser session. */
export const SEEN_KEY = 'bw:intro-seen'

/** Navbar elements the loader hands over to. */
export const NAV_LOGO_ATTR = 'data-nav-logo'
export const NAV_REVEAL_ATTR = 'data-nav-reveal'

/** Paths that never get the preloader (no navbar to fly to, or a page that opens on its own). */
const SKIP_PATTERN = '^/(admin|api|start-project|services/?$)'
const FAILSAFE_MS = 6000

export const PRELOAD_SCRIPT = `(function(){try{
var d=document.documentElement,p=location.pathname;
if(new RegExp(${JSON.stringify(SKIP_PATTERN)}).test(p))return;
if(sessionStorage.getItem(${JSON.stringify(SEEN_KEY)})==='1')return;
d.classList.add(${JSON.stringify(PRELOAD_CLASS)});
setTimeout(function(){if(!d.hasAttribute(${JSON.stringify(LOADER_ATTR)}))d.classList.remove(${JSON.stringify(PRELOAD_CLASS)})},${FAILSAFE_MS});
}catch(e){}})();`

export function preloadRequested(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains(PRELOAD_CLASS)
}

export function markPreloaderSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage blocked: the head script can't read it either, so it never shows.
  }
}
