import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    // Delegate to the cron endpoint — single source of deduction truth
    // VERCEL_URL is auto-set by Vercel; NEXT_PUBLIC_SITE_URL overrides for custom domains
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const cronRes = await fetch(`${baseUrl}/api/cron/deduct-subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    const result = await cronRes.json()
    return NextResponse.json(result, { status: cronRes.status })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
