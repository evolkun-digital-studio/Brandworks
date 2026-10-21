'use client'

import NextLink from 'next/link'
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { RouterBindingsProvider, routerHref, type RouterBindings, type RouterLinkProps, type RouterSearchSetter } from '../routing/context'

function NextRouteLink({ to, replace, state: _state, className: rawClassName, style: rawStyle, ...props }: RouterLinkProps) {
  const pathname = usePathname()
  const target = routerHref(to).split(/[?#]/, 1)[0] || '/'
  const active = pathname === target || pathname.startsWith(`${target}/`)
  const state = { isActive: active, isPending: false, isTransitioning: false }
  const className = typeof rawClassName === 'function' ? rawClassName(state) : rawClassName
  const style = typeof rawStyle === 'function' ? rawStyle(state) : rawStyle
  return <NextLink {...props} href={routerHref(to)} replace={replace} prefetch={false} className={className} style={style} />
}

function NextRouteNavLink({ to, end = false, className, ...props }: RouterLinkProps & { end?: boolean }) {
  const pathname = usePathname()
  const target = routerHref(to).split(/[?#]/, 1)[0] || '/'
  const active = end ? pathname === target : pathname === target || pathname.startsWith(`${target}/`)
  const navState = { isActive: active, isPending: false, isTransitioning: false }
  return (
    <NextRouteLink
      to={to}
      aria-current={active ? 'page' : undefined}
      className={typeof className === 'function' ? className(navState) : className}
      style={typeof props.style === 'function' ? props.style(navState) : props.style}
      {...props}
    />
  )
}

function EmptyOutlet() {
  return null
}

function useNextRouteParams() {
  return useNextParams() as Record<string, string | undefined>
}

function useNextRouterSearchParams() {
  const pathname = usePathname()
  const router = useRouter()
  const current = useNextSearchParams()
  const params = useMemo(() => new URLSearchParams(current.toString()), [current])
  const setParams = useCallback<RouterSearchSetter>((next, options = {}) => {
    const previous = new URLSearchParams(current.toString())
    const resolved = typeof next === 'function' ? next(previous) : next
    const query = resolved instanceof URLSearchParams ? resolved.toString() : new URLSearchParams(resolved).toString()
    const href = query ? `${pathname}?${query}` : pathname
    if (options.replace) router.replace(href, { scroll: false })
    else router.push(href, { scroll: false })
  }, [current, pathname, router])
  return [params, setParams] as const
}

function subscribeLocation(callback: () => void) {
  window.addEventListener('hashchange', callback)
  window.addEventListener('popstate', callback)
  return () => {
    window.removeEventListener('hashchange', callback)
    window.removeEventListener('popstate', callback)
  }
}
function getHash() { return window.location.hash }
function getSearch() { return window.location.search }

export default function NextNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const search = useSyncExternalStore(subscribeLocation, getSearch, () => '')
  const hash = useSyncExternalStore(subscribeLocation, getHash, () => '')
  const navigate = useCallback<RouterBindings['navigate']>((to, options = {}) => {
    if (typeof to === 'number') {
      if (to < 0) router.back()
      else if (to > 0) router.forward()
      return
    }
    const href = routerHref(to)
    if (options.state) {
      const destination = new URL(href, window.location.href)
      window.sessionStorage.setItem(`brandworks-router-state:${destination.pathname}${destination.search}`, JSON.stringify(options.state))
    }
    if (options.replace) router.replace(href)
    else router.push(href)
  }, [router])
  const [state, setState] = useState<unknown>(null)

  useEffect(() => {
    let nextState: unknown = null
    try {
      const serialized = window.sessionStorage.getItem(`brandworks-router-state:${pathname}${search ? `?${search}` : ''}`)
      nextState = serialized ? JSON.parse(serialized) as unknown : null
    } catch {
      nextState = null
    }
    setState(nextState)
  }, [pathname, search])
  const value = useMemo<RouterBindings>(() => ({
    Link: NextRouteLink,
    NavLink: NextRouteNavLink,
    Outlet: EmptyOutlet,
    pathname,
    search: search ? `?${search}` : '',
    hash,
    state,
    useParams: useNextRouteParams,
    navigate,
    useSearchParams: useNextRouterSearchParams,
    inRouterContext: true,
    nativeMetadata: true,
  }), [hash, navigate, pathname, search, state])
  return <RouterBindingsProvider value={value}>{children}</RouterBindingsProvider>
}
