import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '../../../lib/supabase-server'

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

// In-memory rate limiter (per serverless instance — use Redis/Upstash for multi-instance production)
const rateLimitMap = new Map() // key: IP, value: { count, resetAt }

function checkRateLimit(ip, maxAttempts = 5, windowMs = 60_000) {
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
    // Rate limit by IP — 5 attempts per 60 seconds
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const limit = checkRateLimit(ip, 5, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfter) },
        }
      )
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

    // Use the service-role client — never exposed to the browser
    const adminClient = createServerClient()

    // Step 1: Look up user profile by phone
    const { data: profile, error: profileError } = await adminClient
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
    const { data: adminUser, error: adminError } = await adminClient.auth.admin.getUserById(profile.id)

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
