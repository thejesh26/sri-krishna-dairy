import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireCron } from '../../../lib/auth'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

// Runs at 10:00 UTC daily (3:30 PM IST) — catches morning deliveries that are 24h+ old
export async function GET(request) {
  const { error: cronError } = requireCron(request)
  if (cronError) return cronError
  const now = new Date().toISOString()

  const { data: pending, error } = await supabaseAdmin
    .from('review_requests')
    .select('id, user_id, delivery_date')
    .eq('sent', false)
    .lte('send_after', now)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0

  for (const row of pending || []) {
    try {
      // Skip if customer already has a review (approved or pending)
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('user_id', row.user_id)
        .maybeSingle()

      if (existing) {
        await supabaseAdmin.from('review_requests').update({ sent: true, sent_at: now }).eq('id', row.id)
        continue
      }

      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('full_name, phone')
        .eq('id', row.user_id)
        .single()

      if (prof?.phone) {
        const name = prof.full_name || 'there'
        await sendWhatsAppMessage(
          prof.phone,
          `Hi ${name}! 🥛 How was your Sri Krishnaa Dairy milk today? We'd love to hear from you!\n\nLeave a quick review here: srikrishnaadairy.in/reviews\n\nYour feedback helps us serve you better! ⭐`
        )
        console.log(`[ReviewRequest] Sent to ${name}`)
        sent++
      }

      await supabaseAdmin
        .from('review_requests')
        .update({ sent: true, sent_at: now })
        .eq('id', row.id)
    } catch (err) {
      console.error('[ReviewRequest] Failed for user', row.user_id, err?.message)
    }
  }

  return NextResponse.json({ sent })
}
