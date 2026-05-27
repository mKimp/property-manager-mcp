import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E + PWA test configuration.
 *
 * Projects:
 *  - chat-*   → Vite dev server (port 5173), API mocked via route interception
 *  - pwa-*    → Vite preview server (port 4173), serves production dist/
 *
 * Run all:  npx playwright test
 * Run chat: npx playwright test e2e/chat.spec.ts
 * Run pwa:  npx playwright test e2e/pwa.spec.ts
 * View report: npx playwright show-report
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  projects: [
    // ── Chat E2E + mobile layout ──────────────────────────────────────────
    {
      name: 'chat-desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
      testMatch: '**/chat.spec.ts',
    },
    {
      name: 'chat-iphone-13',
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://localhost:5173',
      },
      testMatch: '**/chat.spec.ts',
    },
    {
      name: 'chat-pixel-5',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:5173',
      },
      testMatch: '**/chat.spec.ts',
    },

    // ── PWA manifest + Service Worker ────────────────────────────────────
    {
      name: 'pwa-desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4173',
      },
      testMatch: '**/pwa.spec.ts',
    },
    {
      name: 'pwa-iphone-13',
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://localhost:4173',
      },
      testMatch: '**/pwa.spec.ts',
    },
  ],

  webServer: [
    // Dev server for chat tests (API mocked — backend not required)
    {
      command: 'npm run dev --workspace=apps/client',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    // Preview server for PWA tests (serves production dist/)
    {
      command: 'npm run preview --workspace=apps/client',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
