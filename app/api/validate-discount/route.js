import { NextResponse } from 'next/server'
import { createServerClient } from '../../lib/supabase-server'

// In-memory rate limiter (per serverless instance — use Redis/Upstash for multi-instance production)
const rateLimitMap = new Map() // key: IP, value: { count, resetAt }

function checkRateLimit(ip, maxAttempts = 10, windowMs = 60_000) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}

/**
 * Discount codes stored ONLY on the server.
 * Move these to environment variables for production:
 *   DISCOUNT_CODE_NEWMILK=NEWMILK10:10
 *   DISCOUNT_CODE_KRISHNA=KRISHNA20:20
 */
const DISCOUNT_CODES = {
  ...(process.env.DISCOUNT_CODE_1 ? { [process.env.DISCOUNT_CODE_1]: { percent: 10, label: '10% off applied!' } } : {}),
  ...(process.env.DISCOUNT_CODE_2 ? { [process.env.DISCOUNT_CODE_2]: { percent: 20, label: '20% off applied!' } } : {}),
}

export async function POST(request) {
  try {
    // Rate limit by IP — 10 attempts per 60 seconds
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const limit = checkRateLimit(ip, 10, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { valid: false, message: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfter) },
        }
      )
    }

    // --- Authentication check ---
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const supabase = createServerClient()

    // Verify the JWT belongs to a real active session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { valid: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // --- Input validation ---
    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''

    if (!code) {
      return NextResponse.json(
        { valid: false, message: 'Please enter a discount code.' },
        { status: 400 }
      )
    }

    // --- Lookup ---
    const discount = DISCOUNT_CODES[code]

    if (discount) {
      return NextResponse.json({
        valid: true,
        percent: discount.percent,
        message: discount.label,
      })
    }

    return NextResponse.json({
      valid: false,
      percent: 0,
      message: 'Invalid discount code.',
    })
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Server error. Please try again.' },
      { status: 500 }
    )
  }
}
