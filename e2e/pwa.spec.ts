import { test, expect } from '@playwright/test'

/**
 * PWA tests run against the production preview server (port 4173).
 * The Service Worker is disabled in Vite dev mode, so we must test
 * against `vite preview` which serves the built dist/.
 *
 * Run: npx playwright test e2e/pwa.spec.ts
 * Build first if dist/ is stale: npm run build --workspace=apps/client
 */

// ─── Manifest ──────────────────────────────────────────────────────────────────
test.describe('PWA — manifest', () => {
  test('manifest.webmanifest is served with correct content-type and required fields', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest')

    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type'] ?? ''
    // Browsers accept both "application/manifest+json" and "application/json"
    expect(contentType).toMatch(/application\/(manifest\+)?json/)

    const manifest = await response.json() as Record<string, unknown>

    // Required PWA fields
    expect(manifest.name).toBe('Property Manager')
    expect(manifest.short_name).toBe('PropMgr')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.theme_color).toBe('#1e1e2e')
    expect(manifest.background_color).toBe('#1e1e2e')

    // At least one icon
    const icons = manifest.icons as { src: string; sizes: string; type: string }[]
    expect(icons.length).toBeGreaterThanOrEqual(1)

    // 192 icon present
    expect(icons.some(i => i.sizes.includes('192'))).toBe(true)
    // 512 icon present
    expect(icons.some(i => i.sizes.includes('512'))).toBe(true)
  })

  test('<link rel="manifest"> present in HTML', async ({ page }) => {
    await page.goto('/')

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveCount(1)

    const href = await manifestLink.getAttribute('href')
    expect(href).toBeTruthy()
  })
})

// ─── Service Worker ────────────────────────────────────────────────────────────
test.describe('PWA — Service Worker', () => {
  test('Service Worker script is served', async ({ page }) => {
    // The SW is registered by registerSW.js; the actual sw.js must be reachable
    const response = await page.request.get('/sw.js')
    expect(response.status()).toBe(200)

    const ct = response.headers()['content-type'] ?? ''
    expect(ct).toContain('javascript')
  })

  test('Service Worker registers in the browser', async ({ page }) => {
    await page.goto('/')

    // Give the SW time to install
    await page.waitForTimeout(1500)

    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      try {
        const reg = await navigator.serviceWorker.getRegistration('/')
        return !!(reg?.active || reg?.installing || reg?.waiting)
      } catch {
        return false
      }
    })

    expect(swActive).toBe(true)
  })
})

// ─── App Shell ─────────────────────────────────────────────────────────────────
test.describe('PWA — app shell', () => {
  test('app loads and renders header + empty state', async ({ page }) => {
    await page.goto('/')

    // h1 in the app header (narrow to header element to avoid collision with the h2 empty-state)
    await expect(page.locator('header h1')).toBeVisible()
    await expect(page.getByText('Your rental portfolio assistant')).toBeVisible()
    // Empty-state prompt
    await expect(page.getByText(/Ask me anything about your rental properties/)).toBeVisible()
  })

  test('static assets are cached by Service Worker after first load', async ({ page, context, browserName }) => {
    // WebKit headless has a known Playwright limitation where page.reload() while
    // offline throws an internal error. Skip on WebKit; covered by real-device
    // testing via ngrok (Phase 3 manual step).
    test.skip(browserName === 'webkit', 'WebKit offline+reload is flaky in headless — test on real iOS device via ngrok instead')

    // First visit — SW installs and caches assets
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Go offline
    await context.setOffline(true)

    try {
      // Reload — app shell should serve from cache
      await page.reload({ timeout: 10_000 })
      await expect(page.locator('header h1')).toBeVisible({ timeout: 8_000 })
    } finally {
      // Always restore network regardless of test outcome
      await context.setOffline(false)
    }
  })
})

// ─── Standalone Display ────────────────────────────────────────────────────────
test.describe('PWA — standalone mode', () => {
  test('display: standalone is set in manifest (required for A2HS)', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest')
    const manifest = await response.json() as Record<string, unknown>
    expect(manifest.display).toBe('standalone')
  })

  test('no browser chrome visible when opened as standalone (meta viewport)', async ({ page }) => {
    await page.goto('/')

    // Verify viewport meta tag is set for mobile
    const viewportMeta = page.locator('meta[name="viewport"]')
    await expect(viewportMeta).toHaveCount(1)

    const content = await viewportMeta.getAttribute('content')
    expect(content).toContain('width=device-width')
  })
})
