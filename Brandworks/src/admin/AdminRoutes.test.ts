import { describe, expect, it } from 'vitest'

/**
 * A real dynamic import — not source-text inspection — so this lives
 * under the ordinary app tsconfig (JSX-aware), unlike
 * src/imagePerformance.test.ts's source-text checks. Guards against
 * the Phase 10 `lazy(() => import('./admin/AdminRoutes'))` split in
 * App.tsx silently breaking (wrong path, missing default export).
 */
describe('AdminRoutes', () => {
  it('resolves to a valid React component (default export)', async () => {
    const mod = await import('./AdminRoutes')
    expect(typeof mod.default).toBe('function')
  })
})
