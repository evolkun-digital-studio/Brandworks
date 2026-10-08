'use client'

import { createContext, useContext, type AnchorHTMLAttributes, type ComponentType, type CSSProperties, type ReactNode } from 'react'

export type RouterTo = string | { pathname?: string; search?: string; hash?: string }
export type RouterNavigateOptions = { replace?: boolean; state?: unknown }
export type RouterLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'style'> & {
  to: RouterTo
  replace?: boolean
  state?: unknown
  className?: string | ((state: { isActive: boolean; isPending: boolean; isTransitioning: boolean }) => string | undefined)
  style?: CSSProperties | ((state: { isActive: boolean; isPending: boolean; isTransitioning: boolean }) => CSSProperties | undefined)
}
export type RouterSearchSetter = (
  next: URLSearchParams | string | Record<string, string> | ((previous: URLSearchParams) => URLSearchParams),
  options?: RouterNavigateOptions & { preventScrollReset?: boolean },
) => void

export type RouterBindings = {
  Link: ComponentType<RouterLinkProps>
  NavLink: ComponentType<RouterLinkProps & { end?: boolean }>
  Outlet: ComponentType
  pathname: string
  search: string
  hash: string
  state: unknown
  useParams: () => Record<string, string | undefined>
  navigate: (to: RouterTo | number, options?: RouterNavigateOptions) => void
  useSearchParams: () => readonly [URLSearchParams, RouterSearchSetter]
  inRouterContext: boolean
  nativeMetadata: boolean
}

const RouterContext = createContext<RouterBindings | null>(null)

export function RouterBindingsProvider({ value, children }: { value: RouterBindings; children: ReactNode }) {
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouterBindings() {
  const value = useContext(RouterContext)
  if (!value) throw new Error('Router bindings are not available in this application tree.')
  return value
}

export function useNativeMetadata() {
  return useContext(RouterContext)?.nativeMetadata ?? false
}

export function routerHref(to: RouterTo) {
  if (typeof to === 'string') return to
  return `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}` || '/'
}
