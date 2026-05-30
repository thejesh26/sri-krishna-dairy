import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../../../lib/db'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Secure phone-based login endpoint.
 *
 * Why this exists:
 * The old flow called supabase.auth.getUser() client-side via an RPC function,
 * which exposed the user's email to anyone who could call the RPC with a phone number
 * (email enumeration attack). This route keeps the email server-side at all times.
 *
 * Flow:
 *   1. Client POSTs { phone, password }
 *   2. Server (using service role) looks up the email for that phone number
 *   3. Server signs in with email + password using the anon client
 *   4. Server returns the session tokens — email is never sent to the client
 *   5. Client calls supabase.auth.setSession() to persist the session locally
 */

// Use Upstash Redis if configured (recommended for production multi-instance deployments).
// Falls back to an in-process map when env vars are absent (e.g. local dev).
// To activate: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars.
let ratelimit = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'rl:phone-login',
  })
}

// In-memory fallback — resets on cold start, but acceptable for dev/low-traffic
const rateLimitMap = new Map()
function checkInMemoryRateLimit(ip, maxAttempts = 5, windowMs = 600_000) {
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

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (ratelimit) {
      // Upstash sliding window — consistent across all serverless instances
      const { success, reset } = await ratelimit.limit(ip)
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000)
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
    } else {
      // In-memory fallback: 5 attempts per 10 minutes
      const limit = checkInMemoryRateLimit(ip, 5, 600_000)
      if (!limit.allowed) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
        )
      }
    }

    const body = await request.json()
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required.' },
        { status: 400 }
      )
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 10 digits.' },
        { status: 400 }
      )
    }

    // Step 1: Look up user profile by phone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (profileError || !profile) {
      // Return the same message as a wrong password to prevent enumeration
      return NextResponse.json(
        { error: 'Invalid credentials. Please check and try again.' },
        { status: 401 }
      )
    }

    // Step 2: Use admin API to retrieve the email (stays server-side)
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(profile.id)

    if (adminError || !adminUser?.user?.email) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check and try again.' },
        { status: 401 }
      )
    }

    // Step 3: Sign in using the anon client (returns a proper session)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: authData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: adminUser.user.email,
      password,
    })

    if (signInError || !authData?.session) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check and try again.' },
        { status: 401 }
      )
    }

    // Return session tokens — email is NOT included in the response
    return NextResponse.json({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 }
    )
  }
}
