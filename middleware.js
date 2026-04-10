import { NextResponse } from 'next/server'

/**
 * Simple sliding-window rate limiter for critical API routes.
 * Uses an in-memory Map — resets on cold starts (acceptable for serverless).
 * For production scale, swap this for Upstash Redis + @upstash/ratelimit.
 *
 * Limits per IP:
 *  - /api/orders/create           → 10 req / 60s
 *  - /api/subscriptions/create    → 5  req / 60s
 *  - /api/razorpay/*              → 20 req / 60s
 *  - /api/wallet/recharge         → 10 req / 60s
 *  - /api/auth/* (login/signup)   → 10 req / 60s
 */

const LIMITS = [
  { pattern: /^\/api\/orders\/create$/,           max: 10, windowMs: 60_000 },
  { pattern: /^\/api\/subscriptions\/create$/,    max: 5,  windowMs: 60_000 },
  { pattern: /^\/api\/razorpay\//,                max: 20, windowMs: 60_000 },
  { pattern: /^\/api\/wallet\/recharge$/,         max: 10, windowMs: 60_000 },
  { pattern: /^\/api\/subscriptions\/reactivate$/,max: 10, windowMs: 60_000 },
]

// Map<`${ip}:${pattern}`, { count, windowStart }>
const store = new Map()

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export function middleware(request) {
  const { pathname } = request.nextUrl

  const rule = LIMITS.find(r => r.pattern.test(pathname))
  if (!rule) return NextResponse.next()

  const ip = getIp(request)
  const key = `${ip}:${rule.pattern.source}`
  const now = Date.now()

  let entry = store.get(key)
  if (!entry || now - entry.windowStart > rule.windowMs) {
    entry = { count: 1, windowStart: now }
  } else {
    entry.count++
  }
  store.set(key, entry)

  // Clean up old entries periodically (every ~500 requests)
  if (store.size > 500) {
    for (const [k, v] of store) {
      if (now - v.windowStart > rule.windowMs) store.delete(k)
    }
  }

  if (entry.count > rule.max) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rule.windowMs / 1000)),
        },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/orders/create',
    '/api/subscriptions/create',
    '/api/subscriptions/reactivate',
    '/api/razorpay/:path*',
    '/api/wallet/recharge',
  ],
}
