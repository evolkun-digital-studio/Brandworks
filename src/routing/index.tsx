'use client'

import { useEffect, useMemo } from 'react'
import { useRouterBindings, type RouterLinkProps, type RouterTo } from './context'

export function Link(props: RouterLinkProps) {
  const { Link: LinkComponent } = useRouterBindings()
  return <LinkComponent {...props} />
}

export function NavLink(props: RouterLinkProps & { end?: boolean }) {
  const { NavLink: NavLinkComponent } = useRouterBindings()
  return <NavLinkComponent {...props} />
}

export function Outlet() {
  const { Outlet: OutletComponent } = useRouterBindings()
  return <OutletComponent />
}

export function useLocation() {
  const { pathname, search, hash, state } = useRouterBindings()
  return useMemo(() => ({ pathname, search, hash, state, key: pathname }), [hash, pathname, search, state])
}

export function useNavigate() {
  return useRouterBindings().navigate
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useRouterBindings().useParams() as T
}

export function useSearchParams() {
  return useRouterBindings().useSearchParams()
}

export function Navigate({ to, replace = false, state }: { to: RouterTo; replace?: boolean; state?: unknown }) {
  const navigate = useNavigate()
  useEffect(() => navigate(to, { replace, state }), [navigate, replace, state, to])
  return null
}

export function useInRouterContext() {
  return useRouterBindings().inRouterContext
}
