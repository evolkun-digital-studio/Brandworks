import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/parity',
  fullyParallel: false,
  workers: 1,
  timeout: 240_000,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    actionTimeout: 15_000,
  },
  webServer: [
    {
      command: 'npm.cmd run dev:vite -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      quiet: true,
    },
    {
      command: 'npm.cmd run dev -- --hostname 127.0.0.1 --port 3000',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      quiet: true,
    },
  ],
})
