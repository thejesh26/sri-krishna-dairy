import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { notifyOrderDelivered, notifyCodUpsell, notifyLowBalance } from '../../../lib/whatsapp'
import { sendLowBalanceEmail } from '../../../lib/email'

/**
 * POST /api/delivery/confirm
 * Body: { order_id?, subscription_id?, delivery_date, type: 'order' | 'subscription' }
 * Caller must be is_delivery or is_admin.
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await supabase
      .from('profiles').select('is_admin, is_delivery, full_name').eq('id', user.id).single()
    if (!callerProfile?.is_admin && !callerProfile?.is_delivery) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { type, order_id, subscription_id, delivery_date } = await request.json()
    const deliveredAt = new Date().toISOString()
    const deliveredBy = callerProfile.full_name || user.id

    if (type === 'order' && order_id) {
      const { data: orderRow, error } = await supabase
        .from('orders')
        .update({ status: 'delivered', delivered_at: deliveredAt, delivered_by: deliveredBy })
        .eq('id', order_id)
        .select('user_id, payment_method')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // WhatsApp delivery notification + COD upsell (non-blocking)
      try {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', orderRow.user_id)
          .single()
        if (customerProfile?.phone) {
          await notifyOrderDelivered({
            phone: customerProfile.phone,
            name: customerProfile.full_name || 'Customer',
          })
          // COD post-delivery upsell — send 5 minutes after delivery confirmation
          if (orderRow.payment_method === 'COD') {
            await notifyCodUpsell({
              phone: customerProfile.phone,
              name: customerProfile.full_name || 'Customer',
            })
          }
        }
      } catch {
        // WhatsApp failure must not block delivery confirmation
      }

      return NextResponse.json({ success: true })
    }

    if (type === 'subscription' && subscription_id && delivery_date) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id, products(*), quantity, discount_percent, pending_delivery')
        .eq('id', subscription_id)
        .single()

      if (!sub) return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })

      // Record delivery log
      await supabase.from('subscription_deliveries').upsert({
        subscription_id,
        user_id: sub.user_id,
        delivery_date,
        delivered_at: deliveredAt,
        delivered_by: deliveredBy,
      }, { onConflict: 'subscription_id,delivery_date' }).select()

      // ── Deduct wallet on delivery confirmation ──────────────────────────────
      const dailyAmount = Math.round(
        sub.products.price * sub.quantity * (1 - (sub.discount_percent || 0) / 100)
      )
      const description = `Daily subscription ${subscription_id} [${delivery_date}]`

      // Idempotency: skip if already deducted (e.g. confirm called twice)
      const { data: existing } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('description', description)
        .limit(1)

      if (!existing?.length) {
        const { data: wallet } = await supabase
          .from('wallet')
          .select('id, balance')
          .eq('user_id', sub.user_id)
          .maybeSingle()

        const balance = wallet?.balance || 0

        if (wallet && balance >= dailyAmount) {
          const newBalance = balance - dailyAmount
          await supabase.from('wallet').update({ balance: newBalance }).eq('user_id', sub.user_id)
          await supabase.from('wallet_transactions').insert({
            user_id: sub.user_id,
            amount: dailyAmount,
            type: 'debit',
            description,
          })

          // Award loyalty points
          const pointsEarned = Math.floor(dailyAmount / 100)
          if (pointsEarned > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('loyalty_points, streak_count, last_delivery_date, badges, loyalty_points_expiry')
              .eq('id', sub.user_id)
              .single()
            if (profileData) {
              const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)
              const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
              const isConsecutive = profileData.last_delivery_date === yesterdayStr || profileData.last_delivery_date === today
              const newStreak = isConsecutive ? (profileData.streak_count || 0) + 1 : 1
              const newPoints = (profileData.loyalty_points || 0) + pointsEarned
              const currentBadges = profileData.badges || []
              const newBadges = [...currentBadges]
              if (newStreak >= 7 && !newBadges.includes('fresh_start')) newBadges.push('fresh_start')
              if (newStreak >= 30 && !newBadges.includes('milk_lover')) newBadges.push('milk_lover')
              if (newStreak >= 90 && !newBadges.includes('health_champion')) newBadges.push('health_champion')
              if (newStreak >= 365 && !newBadges.includes('dairy_legend')) newBadges.push('dairy_legend')
              // Set 6-month expiry if not already set
              let expiryDate = profileData.loyalty_points_expiry
              if (!expiryDate) {
                const exp = new Date()
                exp.setMonth(exp.getMonth() + 6)
                expiryDate = exp.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
              }
              await supabase.from('profiles').update({
                loyalty_points: newPoints,
                streak_count: newStreak,
                last_delivery_date: today,
                badges: newBadges,
                loyalty_points_expiry: expiryDate,
              }).eq('id', sub.user_id)
            }
          }

          // Low balance alert if dropped below Rs.300
          if (newBalance < 300) {
            try {
              const { data: userProfile } = await supabase
                .from('profiles').select('full_name, phone, email').eq('id', sub.user_id).single()
              const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
              const email = authUser?.user?.email || userProfile?.email
              const name = userProfile?.full_name || email
              if (email) await sendLowBalanceEmail({ to: email, name, balance: newBalance })
              if (userProfile?.phone) await notifyLowBalance({ phone: userProfile.phone, name, balance: newBalance })
            } catch { /* non-blocking */ }
          }
        } else if (wallet && balance < dailyAmount) {
          // Insufficient balance — deactivate subscription
          await supabase.from('subscriptions').update({ is_active: false, pending_delivery: false }).eq('id', subscription_id)
        }
      }

      // Clear pending_delivery flag
      await supabase.from('subscriptions').update({ pending_delivery: false }).eq('id', subscription_id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
