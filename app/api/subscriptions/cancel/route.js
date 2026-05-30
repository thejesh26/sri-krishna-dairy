import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { sendSubscriptionCancelledEmail } from '../../../lib/email'
import { sendWhatsAppToAdmin } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { subscription_id, reason, details } = await request.json()
    if (!subscription_id) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    // Fetch subscription (ownership enforced)
    const { data: sub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, products(*)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    const cancellationReason = [reason, details].filter(Boolean).join(' — ') || 'No reason given'

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        is_active: false,
        cancelled_by: 'customer',
        cancellation_reason: cancellationReason,
      })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Notify admin + send customer email (non-blocking)
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', user.id).single()
      const name = profile?.full_name || user.email
      const product = `${sub.products?.size || 'Milk'} × ${sub.quantity}`

      await sendWhatsAppToAdmin(
        `❌ Subscription Cancelled\nCustomer: ${name}\nProduct: ${product}\nReason: ${cancellationReason}\nPhone: ${profile?.phone || 'N/A'}`
      )
      await sendSubscriptionCancelledEmail({
        to: user.email,
        name,
        product: sub.products?.size || 'Milk',
        quantity: sub.quantity,
      })
    } catch { /* notification failure must not block response */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
