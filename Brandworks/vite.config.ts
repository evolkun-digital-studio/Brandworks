// Imported from 'vitest/config' rather than plain 'vite' so the
// `test` key below type-checks — it re-exports vite's own
// defineConfig, merged with vitest's config types, nothing else changes.
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.NEXT_PUBLIC_MEDIA_BASE_URL': JSON.stringify(env.VITE_MEDIA_BASE_URL || ''),
      'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
      'process.env.NEXT_PUBLIC_APP_RUNTIME': JSON.stringify('vite'),
      'process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID': JSON.stringify(env.VITE_GA_MEASUREMENT_ID || ''),
      'process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID': JSON.stringify(env.VITE_CLARITY_PROJECT_ID || ''),
      'process.env.NEXT_PUBLIC_GTM_CONTAINER_ID': JSON.stringify(env.VITE_GTM_CONTAINER_ID || ''),
      'process.env.NEXT_PUBLIC_META_PIXEL_ID': JSON.stringify(env.VITE_META_PIXEL_ID || ''),
      'process.env.NEXT_PUBLIC_GSC_VERIFICATION': JSON.stringify(env.VITE_GSC_VERIFICATION || ''),
      'process.env.NEXT_PUBLIC_EVOLKUN_URL': JSON.stringify(env.VITE_EVOLKUN_URL || ''),
    },
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
  }
})
