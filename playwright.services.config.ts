import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/parity',
  testMatch: 'services-page.spec.ts',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    actionTimeout: 10_000,
  },
})
