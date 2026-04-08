import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * SECURITY: Admin-triggered daily deductions.
 *
 * Closes VULN-03: runDailyDeductions() in admin/page.js duplicated the entire
 * cron-job logic in the browser, running wallet.update() calls directly via the
 * anon Supabase client. This meant:
 *  - Any authenticated user could trigger wallet mutations from the browser console
 *  - The business logic was fully visible in the JS bundle
 *
 * This route:
 *  1. Verifies the caller is an admin (JWT + DB check)
 *  2. Delegates to the existing cron-job logic via the CRON_SECRET
 *     so there is exactly ONE place where deduction logic lives
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Verify JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.slice(7)
    )
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Re-verify admin from DB — never trust client-side flags
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
