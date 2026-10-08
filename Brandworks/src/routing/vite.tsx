'use client'

import {
  Link as ReactRouterLink,
  NavLink as ReactRouterNavLink,
  Outlet as ReactRouterOutlet,
  useLocation as useReactRouterLocation,
  useNavigate as useReactRouterNavigate,
  useParams as useReactRouterParams,
  useSearchParams as useReactRouterSearchParams,
} from 'react-router-dom'
import { useCallback, useMemo, type ReactNode } from 'react'
import { RouterBindingsProvider, routerHref, type RouterBindings, type RouterLinkProps, type RouterSearchSetter } from './context'

function ViteLink({ to, ...props }: RouterLinkProps) {
  return <ReactRouterLink to={to as never} {...props} />
}

function ViteNavLink({ to, ...props }: RouterLinkProps & { end?: boolean }) {
  return <ReactRouterNavLink to={to as never} {...props} />
}

function ViteOutlet() {
  return <ReactRouterOutlet />
}

function useViteRouteParams() {
  return useReactRouterParams() as Record<string, string | undefined>
}

function useViteRouterSearchParams() {
  const [params, setParams] = useReactRouterSearchParams()
  const set = useCallback<RouterSearchSetter>(
    (next, options) => setParams(next as never, options),
    [setParams],
  )
  return [params, set] as const
}

export function ViteNavigationProvider({ children }: { children: ReactNode }) {
  const location = useReactRouterLocation()
  const navigate = useReactRouterNavigate()
  const value = useMemo<RouterBindings>(() => ({
    Link: ViteLink,
    NavLink: ViteNavLink,
    Outlet: ViteOutlet,
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
    useParams: useViteRouteParams,
    navigate: (to, options) => navigate(typeof to === 'number' ? to : routerHref(to), options),
    useSearchParams: useViteRouterSearchParams,
    inRouterContext: true,
    nativeMetadata: false,
  }), [location, navigate])
  return <RouterBindingsProvider value={value}>{children}</RouterBindingsProvider>
}
