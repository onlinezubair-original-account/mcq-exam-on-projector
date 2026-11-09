import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // local machine: use installed Edge (no browser download); CI: bundled Chromium
    ...(process.env.CI ? {} : { channel: 'msedge' }),
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run serve:out',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});