import { useCallback, useEffect, useState } from 'react'

export type AdminTheme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'brandworks.admin.theme.v3'

export const ADMIN_THEMES: Array<{ id: AdminTheme; label: string }> = [
  { id: 'system', label: 'Automatic' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

function isAdminTheme(value: string | null): value is AdminTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

/**
 * The theme starts as "system" on the server and on first paint, then adopts
 * the saved preference, so server and client markup always match.
 */
export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>('system')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (isAdminTheme(saved)) setThemeState(saved)
    } catch {
      // Storage can be unavailable (private browsing); the default still works.
    }
  }, [])

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore storage restrictions.
    }
  }, [])

  return [theme, setTheme] as const
}
