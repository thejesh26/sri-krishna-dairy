import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendUndeliveredAlertEmail } from '../../../lib/email'
import { notifyUndelivered, sendWhatsAppToAdmin } from '../../../lib/whatsapp'

// Called daily at 10AM IST (04:30 UTC) by Vercel Cron
// Checks subscriptions still marked pending_delivery and clears them without charging
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // Find all subscriptions still in pending_delivery state (not yet confirmed by 10AM)
  const { data: undelivered } = await supabase
    .from('subscriptions')
    .select('id, user_id, products(size), quantity')
    .eq('is_active', true)
    .eq('pending_delivery', true)

  if (!undelivered?.length) {
    return NextResponse.json({ date: today, undelivered: 0 })
  }

  const notified = []

  for (const sub of undelivered) {
    // Clear the pending flag — do NOT deduct, do NOT deactivate
    await supabase
      .from('subscriptions')
      .update({ pending_delivery: false })
      .eq('id', sub.id)

    // Notify customer (non-blocking)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', sub.user_id)
        .single()
      const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
      const email = authUser?.user?.email || profile?.email
      const name = profile?.full_name || email || 'Customer'

      if (email) await sendUndeliveredAlertEmail({ to: email, name })
      if (profile?.phone) await notifyUndelivered({ phone: profile.phone, name })

      notified.push({ subscriptionId: sub.id, userId: sub.user_id })
    } catch { /* non-blocking */ }
  }

  // Alert admin with count
  try {
    await sendWhatsAppToAdmin(
      `⚠️ Undelivered check [${today}]: ${undelivered.length} subscription(s) were not confirmed by 10AM IST.\n` +
      `Customers have NOT been charged. Please review deliveries.`
    )
  } catch { /* non-blocking */ }

  return NextResponse.json({
    date: today,
    undelivered: undelivered.length,
    notified: notified.length,
  })
}
