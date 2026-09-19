// Imported from 'vitest/config' rather than plain 'vite' so the
// `test` key below type-checks — it re-exports vite's own
// defineConfig, merged with vitest's config types, nothing else changes.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // vitest's own default `exclude` doesn't know about backend/ (a
    // separate Node project with its own package.json/vitest run) —
    // without this, `npx vitest run` from the repo root also sweeps
    // up and re-runs backend/src/**/*.test.ts as if they were
    // frontend tests (surfaced in Phase 9, once the backend gained
    // its first test files). Backend tests belong to `cd backend &&
    // npm test` only.
    exclude: ['**/node_modules/**', '**/dist/**', 'backend/**'],
    // Declares the React "act environment" once for every test file
    // (Phase 13) rather than each act()-based test working around the
    // "not configured to support act(...)" warning individually.
    setupFiles: ['src/test/setup.ts'],
  },
})
