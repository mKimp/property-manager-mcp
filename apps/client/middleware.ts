import { next } from '@vercel/edge'

/**
 * Vercel Edge Middleware — HTTP Basic Auth
 *
 * Runs on every request before Vercel serves any file.
 * Credentials are stored in Vercel env vars:
 *   BASIC_AUTH_USER     (e.g. "admin")
 *   BASIC_AUTH_PASSWORD (e.g. a strong random string)
 *
 * The browser shows its native username/password dialog.
 * Once entered correctly, the browser remembers it for the session.
 */
export default function middleware(request: Request) {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASSWORD

  // If credentials aren't configured, allow through (local dev fallback)
  if (!user || !pass) return next()

  const authorization = request.headers.get('authorization')

  if (authorization?.startsWith('Basic ')) {
    const encoded = authorization.slice(6)
    const decoded = atob(encoded)
    const colonIdx = decoded.indexOf(':')
    const providedUser = decoded.slice(0, colonIdx)
    const providedPass = decoded.slice(colonIdx + 1)

    if (providedUser === user && providedPass === pass) {
      return next() // ✅ correct credentials — serve the page
    }
  }

  // Missing or wrong credentials — trigger the browser login dialog
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Property Manager", charset="UTF-8"',
    },
  })
}

export const config = {
  matcher: '/(.*)', // protect every path
}
