import { defineConfig } from 'vitest/config'

/**
 * Backend had no vitest/vite config of its own before now, which
 * meant `vitest` (run with cwd=backend/) climbed up and found the
 * *frontend's* vite.config.ts at the repo root — invisibly, since
 * nothing in either config referenced the other on purpose. That
 * config's own `test.exclude: ['backend/**']` (added in Phase 10) was
 * there specifically to stop the *frontend's* `vitest` run (from the
 * repo root) from sweeping up backend tests — it says nothing about
 * isolating the reverse direction. This file closes that gap
 * (surfaced in Phase 13 when the frontend config gained a
 * `setupFiles` entry that doesn't exist relative to backend/): an
 * empty-but-present config here is enough for vitest to treat
 * backend/ as its own project root and never look further up the
 * directory tree.
 */
export default defineConfig({
  test: {},
})
