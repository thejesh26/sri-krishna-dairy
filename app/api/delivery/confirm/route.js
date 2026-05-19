import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { sendDeliveryConfirmed, notifyCodUpsell, sendLowBalanceAlert, sendWhatsAppMessage, sendWhatsAppToAdmin, notifySubscriptionStopped, notifyAdmin } from '../../../lib/whatsapp'
import { sendLowBalanceEmail, sendOrderConfirmationEmail, sendEmail } from '../../../lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST /api/delivery/confirm
 * Body: { order_id?, subscription_id?, delivery_date, type: 'order' | 'subscription' }
 * Caller must be is_delivery or is_admin.
 */
export async function POST(request) {
  console.log('[DeliveryConfirm] Route called')
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

    const { type, order_id, subscription_id, delivery_date, bottle_returned, not_delivered, photo_url, addon_id } = await request.json()
    const deliveredAt = new Date().toISOString()
    const deliveredBy = user.id

    if (type === 'order' && order_id) {
      console.log('[DeliveryConfirm] Confirming delivery for order:', order_id)
      const { data: orderRow, error } = await supabase
        .from('orders')
        .update({ status: 'delivered', delivered_at: deliveredAt, delivered_by: deliveredBy })
        .eq('id', order_id)
        .select('user_id, payment_method, quantity, product_id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Fetch product separately — update().select() doesn't support FK joins in PostgREST
      const { data: productData } = await supabase
        .from('products').select('size').eq('id', orderRow.product_id).maybeSingle()
      const productLabel = productData?.size
        ? `${productData.size} x${orderRow.quantity || 1}`
        : 'Milk'
      const dateLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

      // Customer notifications + COD upsell (non-blocking)
      try {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', orderRow.user_id)
          .single()
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(orderRow.user_id)
        const customerEmail = authUser?.user?.email
        const customerName = customerProfile?.full_name || 'Customer'

        console.log('[DeliveryConfirm] Customer phone:', customerProfile?.phone, '| email:', customerEmail)

        if (customerProfile?.phone) {
          console.log('[DeliveryConfirm] Sending WhatsApp delivery confirmation to:', customerProfile.phone)
          const waResult = await sendDeliveryConfirmed(customerProfile.phone, customerName, dateLabel, productLabel)
          console.log('[DeliveryConfirm] WA delivery result:', waResult)
          if (orderRow.payment_method === 'COD') {
            await notifyCodUpsell({ phone: customerProfile.phone, name: customerName })
          }
        }

        if (customerEmail) {
          await sendEmail({
            to: customerEmail,
            subject: `✅ Your milk was delivered – Sri Krishnaa Dairy`,
            html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
  <h2 style="color:#1a5c38;margin-bottom:8px;">✅ Delivery Confirmed!</h2>
  <p style="color:#555;font-size:14px;">Hi ${customerName},</p>
  <p style="color:#555;font-size:14px;margin-bottom:16px;">Your <strong>${productLabel}</strong> was successfully delivered on <strong>${dateLabel}</strong>.</p>
  <p style="color:#555;font-size:13px;">Questions? Call or WhatsApp <strong>9980166221</strong></p>
  <p style="color:#999;font-size:12px;margin-top:16px;">– Sri Krishnaa Dairy Team</p>
</div>`,
            text: `Hi ${customerName},\n\nYour ${productLabel} was delivered on ${dateLabel}.\n\nQuestions? Call 9980166221\n\n– Sri Krishnaa Dairy Team`,
          })
        }
      } catch (notifyErr) {
        console.error('[DeliveryConfirm] Notification failed:', notifyErr?.message)
      }

      // Schedule review request (non-blocking)
      try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        await supabaseAdmin.from('review_requests').upsert({
          user_id: orderRow.user_id,
          delivery_date: today,
          send_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          sent: false,
        }, { onConflict: 'user_id,delivery_date', ignoreDuplicates: true })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true })
    }

    if (type === 'subscription' && subscription_id && delivery_date) {
      console.log('[Delivery] Confirming subscription delivery:', subscription_id, 'date:', delivery_date)
      // ── Not-delivered path: clear pending without charging ───────────────────
      if (not_delivered) {
        await supabaseAdmin.from('subscriptions').update({ pending_delivery: false }).eq('id', subscription_id)
        try {
          const { data: sub } = await supabaseAdmin.from('subscriptions').select('user_id').eq('id', subscription_id).single()
          const { data: profile } = sub?.user_id
            ? await supabaseAdmin.from('profiles').select('full_name, apartment_name, flat_number, area').eq('id', sub.user_id).single()
            : { data: null }
          await sendWhatsAppToAdmin(
            `❌ Not Delivered [${delivery_date}]\nCustomer: ${profile?.full_name || sub?.user_id}\n` +
            `Address: ${profile?.apartment_name}, Flat ${profile?.flat_number}, ${profile?.area}\n` +
            `Reported by: ${deliveredBy}`
          )
        } catch { /* non-blocking */ }
        return NextResponse.json({ success: true, not_delivered: true })
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id, products(*), quantity, discount_percent, pending_delivery')
        .eq('id', subscription_id)
        .single()

      if (!sub) return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
      if (!sub.products) return NextResponse.json({ error: 'Subscription product not found.' }, { status: 404 })

      // Record delivery log
      const { error: upsertError } = await supabaseAdmin.from('subscription_deliveries').upsert({
        subscription_id,
        user_id: sub.user_id,
        delivery_date,
        delivered_at: deliveredAt,
        delivered_by: deliveredBy,
        not_delivered: false,
        bottle_returned: bottle_returned !== false,
        ...(photo_url ? { photo_url } : {}),
      }, { onConflict: 'subscription_id,delivery_date' })

      if (upsertError) {
        console.error('[DeliveryConfirm] upsert failed:', upsertError.message, upsertError.code)
      } else {
        console.log('[DeliveryConfirm] upsert SUCCESS sub:', subscription_id, 'date:', delivery_date)
      }

      // ── Send delivery WhatsApp confirmation — always, regardless of wallet state ─
      try {
        const { data: deliveryProfile } = await supabase
          .from('profiles').select('full_name, phone').eq('id', sub.user_id).single()
        const deliveryName = deliveryProfile?.full_name || 'Customer'
        const dateLabel = new Date(delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const productLabel = sub.products?.size || 'Milk'
        console.log('[Delivery] Sending WhatsApp to:', deliveryProfile?.phone, 'name:', deliveryName)
        if (deliveryProfile?.phone) {
          const waResult = await sendDeliveryConfirmed(deliveryProfile.phone, deliveryName, dateLabel, productLabel)
          console.log('[Delivery] WhatsApp result:', waResult)
        }
      } catch (waErr) {
        console.error('[Delivery] WhatsApp send failed:', waErr?.message)
      }

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
          await supabaseAdmin.from('wallet').update({ balance: newBalance }).eq('user_id', sub.user_id)
          await supabaseAdmin.from('wallet_transactions').insert({
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
              await supabaseAdmin.from('profiles').update({
                loyalty_points: newPoints,
                streak_count: newStreak,
                last_delivery_date: today,
                badges: newBadges,
                loyalty_points_expiry: expiryDate,
              }).eq('id', sub.user_id)
            }
          }

          // Send delivery confirmation email
          try {
            const { data: deliveryAuthUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
            const deliveryEmail = deliveryAuthUser?.user?.email
            if (deliveryEmail) {
              const { data: deliveryProfile } = await supabase
                .from('profiles').select('full_name').eq('id', sub.user_id).single()
              const deliveryName = deliveryProfile?.full_name || 'Customer'
              const dateLabel = new Date(delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              const productLabel = sub.products?.size || 'Milk'
              await sendOrderConfirmationEmail({
                to: deliveryEmail,
                name: deliveryName,
                product: productLabel,
                quantity: sub.quantity || 1,
                deliveryDate: dateLabel,
                deliverySlot: sub.products?.delivery_slot || delivery_date,
                totalAmount: dailyAmount,
              })
            }
          } catch (notifyErr) {
            console.error('[Delivery] Email notification failed:', notifyErr?.message)
          }

          const lowBalanceThreshold = dailyAmount * 7
          if (newBalance < lowBalanceThreshold) {
            try {
              const { data: userProfile } = await supabase
                .from('profiles').select('full_name, phone, email').eq('id', sub.user_id).single()
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
              const email = authUser?.user?.email || userProfile?.email
              const name = userProfile?.full_name || email
              if (email) await sendLowBalanceEmail({ to: email, name, balance: newBalance })
              if (userProfile?.phone) await sendLowBalanceAlert(userProfile.phone, name, newBalance)
            } catch { /* non-blocking */ }
          }
        } else if (wallet && balance < dailyAmount) {
          // Insufficient balance — deactivate subscription
          await supabaseAdmin.from('subscriptions').update({ is_active: false, pending_delivery: false }).eq('id', subscription_id)
          // Record in failed_deductions so admin dashboard count is accurate
          await supabaseAdmin.from('failed_deductions').insert({
            user_id: sub.user_id,
            subscription_id,
            amount: dailyAmount,
            reason: 'Insufficient balance — deactivated on delivery confirm',
          }).catch(() => {})
          await supabaseAdmin.from('wallet_transactions').insert({
            user_id: sub.user_id,
            amount: 0,
            type: 'debit',
            description: `Subscription stopped - insufficient balance [${delivery_date}]. Required: ₹${dailyAmount}, Available: ₹${balance}`,
          })
          // Notify customer their delivery has been stopped
          try {
            const { data: stoppedProfile } = await supabase
              .from('profiles').select('full_name, phone').eq('id', sub.user_id).single()
            if (stoppedProfile?.phone) {
              await notifySubscriptionStopped({ phone: stoppedProfile.phone, name: stoppedProfile.full_name || 'Customer', balance })
            }
          } catch { /* non-blocking */ }
        }
      }

      // Clear pending_delivery flag
      await supabaseAdmin.from('subscriptions').update({ pending_delivery: false }).eq('id', subscription_id)

      // ── Bottle return tracking ──────────────────────────────────────────────
      if (bottle_returned === false) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone, apartment_name, flat_number, area, unreturned_bottles')
            .eq('id', sub.user_id).single()
          const newCount = (profileData?.unreturned_bottles || 0) + 1
          await supabaseAdmin.from('profiles').update({ unreturned_bottles: newCount }).eq('id', sub.user_id)

          // Admin alert — WhatsApp + email
          const bottleName = profileData?.full_name || sub.user_id
          const bottleAddr = `${profileData?.apartment_name}, Flat ${profileData?.flat_number}, ${profileData?.area}`
          await notifyAdmin(
            `Bottle Not Returned – ${bottleName}`,
            `⚠️ Bottle NOT returned by ${bottleName}\nAddress: ${bottleAddr}\nDate: ${delivery_date}\nTotal unreturned: ${newCount}`,
          )

          // Auto-pause subscription when 3+ bottles unreturned
          if (newCount >= 3) {
            await supabaseAdmin.from('subscriptions').update({ is_active: false }).eq('id', subscription_id)
            if (profileData?.phone) {
              await sendWhatsAppMessage(
                profileData.phone,
                `Your Sri Krishnaa Dairy delivery has been paused as we have not received ${newCount} bottles back. Please return the bottles to resume delivery. Contact us: 9980166221`
              )
            }
            await notifyAdmin(
              `Subscription Auto-Paused – ${bottleName}`,
              `🚨 Subscription #${subscription_id} AUTO-PAUSED — ${bottleName} has ${newCount} unreturned bottles`,
            )
          }
        } catch { /* non-blocking */ }
      }

      // Schedule review request (non-blocking)
      try {
        await supabaseAdmin.from('review_requests').upsert({
          user_id: sub.user_id,
          delivery_date,
          send_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          sent: false,
        }, { onConflict: 'user_id,delivery_date', ignoreDuplicates: true })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true })
    }

    if (type === 'addon' && addon_id) {
      const { data: addonOrder } = await supabase
        .from('addon_orders')
        .update({ status: 'delivered', delivered_at: deliveredAt, delivered_by: deliveredBy })
        .eq('id', addon_id)
        .select('user_id, total_price, product_id, quantity, delivery_date')
        .single()

      if (!addonOrder) return NextResponse.json({ error: 'Addon order not found' }, { status: 404 })

      const { data: wallet } = await supabase
        .from('wallet').select('id, balance').eq('user_id', addonOrder.user_id).maybeSingle()

      const balance = wallet?.balance || 0
      const amount = addonOrder.total_price || 0

      if (wallet && balance >= amount) {
        await supabaseAdmin.from('wallet').update({ balance: balance - amount }).eq('user_id', addonOrder.user_id)
        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: addonOrder.user_id,
          amount,
          type: 'debit',
          description: `Add-on delivery [${addonOrder.delivery_date}]`,
        })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
