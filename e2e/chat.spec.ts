import { test, expect, type Route } from '@playwright/test'

// ─── SSE helper ────────────────────────────────────────────────────────────────
/**
 * Fulfills a Playwright route with a complete SSE response.
 * All chunks are sent at once; the client's ReadableStream processes them in
 * order, so streaming behaviour is exercised even though there's no real delay.
 */
function fulfillSse(route: Route, chunks: string[]) {
  const events = chunks.map(c => `data: ${JSON.stringify({ t: c })}\n\n`).join('')
  route.fulfill({
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
    body: events + 'data: [DONE]\n\n',
  })
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────
test.beforeEach(async ({ page }) => {
  // Clear stored conversation so each test starts fresh
  await page.addInitScript(() => {
    localStorage.removeItem('chatMessages')
    localStorage.removeItem('lastActivityAt')
  })
})

// ─── Chat: Happy Path ───────────────────────────────────────────────────────────
test.describe('Chat — happy path', () => {
  test('user message appears and assistant reply streams in', async ({ page }) => {
    await page.route('**/api/chat', route =>
      fulfillSse(route, ['Hello! ', 'I can help with ', 'your properties.'])
    )

    await page.goto('/')

    const textarea = page.getByRole('textbox', { name: /message input/i })
    await textarea.fill('Show me my properties')
    await textarea.press('Enter')

    // User bubble
    await expect(page.getByText('Show me my properties')).toBeVisible()

    // Assembled assistant reply
    await expect(
      page.getByText('Hello! I can help with your properties.')
    ).toBeVisible()
  })

  test('empty-state prompt disappears after first send', async ({ page }) => {
    await page.route('**/api/chat', route => fulfillSse(route, ['Got it!']))

    await page.goto('/')

    // Empty state is shown before any message
    await expect(page.getByText('Ask me anything about your rental properties')).toBeVisible()

    await page.getByRole('textbox', { name: /message input/i }).fill('hello')
    await page.getByRole('textbox', { name: /message input/i }).press('Enter')

    await expect(page.getByText('Got it!')).toBeVisible()
    // Empty state gone
    await expect(page.getByText('Ask me anything about your rental properties')).not.toBeVisible()
  })

  test('markdown in assistant reply is rendered (bold, list)', async ({ page }) => {
    await page.route('**/api/chat', route =>
      fulfillSse(route, ['Here are your properties:\n\n- **Kent House** — $1,800/mo\n- **Portland** — $2,200/mo'])
    )

    await page.goto('/')

    await page.getByRole('textbox', { name: /message input/i }).fill('list')
    await page.getByRole('textbox', { name: /message input/i }).press('Enter')

    // react-markdown renders <strong> for **text**
    await expect(page.locator('strong').filter({ hasText: 'Kent House' })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: 'Portland' })).toBeVisible()
  })
})

// ─── Chat: Input Behaviour ─────────────────────────────────────────────────────
test.describe('Chat — input behaviour', () => {
  test('Enter sends; Shift+Enter inserts newline instead', async ({ page }) => {
    let requestFired = false
    await page.route('**/api/chat', route => {
      requestFired = true
      fulfillSse(route, ['sent!'])
    })

    await page.goto('/')

    const textarea = page.getByRole('textbox', { name: /message input/i })
    await textarea.fill('line 1')
    await textarea.press('Shift+Enter')
    await textarea.type('line 2')

    // Shift+Enter must NOT have sent a request
    expect(requestFired).toBe(false)
    const value = await textarea.inputValue()
    expect(value).toContain('\n')

    // Regular Enter sends
    await textarea.press('Enter')
    await expect(page.getByText('sent!')).toBeVisible()
  })

  test('send button click sends message', async ({ page }) => {
    await page.route('**/api/chat', route => fulfillSse(route, ['button works!']))

    await page.goto('/')

    const textarea = page.getByRole('textbox', { name: /message input/i })
    await textarea.fill('click test')
    await page.getByRole('button', { name: /send message/i }).click()

    await expect(page.getByText('button works!')).toBeVisible()
  })

  test('textarea is cleared after send', async ({ page }) => {
    await page.route('**/api/chat', route => fulfillSse(route, ['ok']))

    await page.goto('/')

    const textarea = page.getByRole('textbox', { name: /message input/i })
    await textarea.fill('my message')
    await textarea.press('Enter')

    await expect(page.getByText('ok')).toBeVisible()
    expect(await textarea.inputValue()).toBe('')
  })
})

// ─── Chat: Conversation History ────────────────────────────────────────────────
test.describe('Chat — conversation history', () => {
  test('full history is sent on every request', async ({ page }) => {
    let callCount = 0
    let lastBodyMessages: unknown[] = []

    await page.route('**/api/chat', async (route, request) => {
      callCount++
      const body = JSON.parse(request.postData() ?? '{}') as { messages: unknown[] }
      lastBodyMessages = body.messages
      fulfillSse(route, [`Reply ${callCount}`])
    })

    await page.goto('/')

    const textarea = page.getByRole('textbox', { name: /message input/i })

    // First message
    await textarea.fill('First message')
    await textarea.press('Enter')
    await expect(page.getByText('Reply 1')).toBeVisible()
    expect(callCount).toBe(1)
    expect(lastBodyMessages).toHaveLength(1) // just the user turn

    // Second message — history should include first exchange
    await textarea.fill('Second message')
    await textarea.press('Enter')
    await expect(page.getByText('Reply 2')).toBeVisible()
    expect(callCount).toBe(2)
    // 2 user turns + 1 assistant turn from first exchange
    expect(lastBodyMessages.length).toBeGreaterThanOrEqual(3)
  })
})

// ─── Chat: Error Handling ──────────────────────────────────────────────────────
test.describe('Chat — error handling', () => {
  test('500 response shows error banner with Retry button', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )

    await page.goto('/')

    await page.getByRole('textbox', { name: /message input/i }).fill('test')
    await page.getByRole('textbox', { name: /message input/i }).press('Enter')

    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('Retry button re-sends the last message', async ({ page }) => {
    let callCount = 0
    await page.route('**/api/chat', route => {
      callCount++
      if (callCount === 1) {
        route.fulfill({ status: 500, body: 'error' })
      } else {
        fulfillSse(route, ['Retry worked!'])
      }
    })

    await page.goto('/')

    await page.getByRole('textbox', { name: /message input/i }).fill('test')
    await page.getByRole('textbox', { name: /message input/i }).press('Enter')

    // Wait for error
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()

    // Click retry
    await page.getByRole('button', { name: /retry/i }).click()

    await expect(page.getByText('Retry worked!')).toBeVisible()
    expect(callCount).toBe(2)
  })
})

// ─── Mobile Layout ─────────────────────────────────────────────────────────────
test.describe('Mobile layout', () => {
  test('send button meets 40×40 minimum touch target', async ({ page }) => {
    await page.goto('/')

    const sendBtn = page.getByRole('button', { name: /send message/i })
    const box = await sendBtn.boundingBox()

    expect(box).not.toBeNull()
    // WCAG 2.5.5 recommends 44px; our button is 40px w-10 h-10 — acceptable minimum
    expect(box!.width).toBeGreaterThanOrEqual(40)
    expect(box!.height).toBeGreaterThanOrEqual(40)
  })

  test('app fills the full viewport height', async ({ page }) => {
    await page.goto('/')

    const viewport = page.viewportSize()
    const root = page.locator('#root > div')
    const box = await root.boundingBox()

    expect(box).not.toBeNull()
    expect(viewport).not.toBeNull()
    // Should fill ≥95 % of viewport height
    expect(box!.height).toBeGreaterThanOrEqual(viewport!.height * 0.95)
  })

  test('chat thread is scrollable and does not overflow horizontally', async ({ page }) => {
    await page.route('**/api/chat', route =>
      fulfillSse(route, ['This is a very long assistant reply that might cause horizontal overflow on narrow mobile screens if text wrapping is not working correctly.'])
    )

    await page.goto('/')

    await page.getByRole('textbox', { name: /message input/i }).fill('hi')
    await page.getByRole('textbox', { name: /message input/i }).press('Enter')

    await expect(page.getByText('This is a very long assistant reply')).toBeVisible()

    // No horizontal scrollbar (scrollWidth === clientWidth on the thread)
    const hasHorizontalOverflow = await page.evaluate(() => {
      const thread = document.querySelector('.overflow-y-auto')
      if (!thread) return false
      return thread.scrollWidth > thread.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('header text is readable at mobile font size', async ({ page }) => {
    await page.goto('/')

    const h1 = page.getByRole('heading', { level: 1, name: /property manager/i }).or(
      page.locator('header').getByText('Property Manager')
    )

    // Ensure text is visible (implicitly checks font isn't invisible)
    await expect(h1).toBeVisible()

    const fontSize = await h1.evaluate(el =>
      parseFloat(getComputedStyle(el).fontSize)
    )
    // Should be at least 13px (Tailwind text-sm = 14px)
    expect(fontSize).toBeGreaterThanOrEqual(13)
  })
})
