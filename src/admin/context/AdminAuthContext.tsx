import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import type { AdminAccount } from '../api/types'

interface AdminAuthContextValue {
  admin: AdminAccount | null
  /** True only while the initial session check (GET /auth/me) is in flight. */
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Re-fetches the current admin, e.g. after a profile change. */
  refresh: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { admin: current } = await adminApi.fetchCurrentAdmin()
      setAdmin(current)
    } catch (error) {
      // A 401 here just means "not logged in" — not an error worth surfacing.
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error('Failed to load the current admin session:', error)
      }
      setAdmin(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    })()
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const { admin: loggedInAdmin } = await adminApi.login(username, password)
    setAdmin(loggedInAdmin)
  }, [])

  const logout = useCallback(async () => {
    try {
      await adminApi.logout()
    } finally {
      setAdmin(null)
    }
  }, [])

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, refresh }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return ctx
}
