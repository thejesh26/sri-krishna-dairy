import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'
import { calcDailyAmount, getISTDate, getScheduledQuantity } from '../../../lib/pricing'
import { createAdminNotification } from '../../../lib/notify'
import { sendDeliveryConfirmed, notifyCodUpsell, sendLowBalanceAlert, sendWhatsAppMessage, sendWhatsAppToAdmin, notifySubscriptionStopped, notifyAdmin, notifyTrialEnded } from '../../../lib/whatsapp'
import { sendLowBalanceEmail, sendOrderConfirmationEmail, sendEmail } from '../../../lib/email'

const SUPABASE_STORAGE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null

function validatePhotoUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    if (!SUPABASE_STORAGE_HOST || !u.hostname.endsWith(SUPABASE_STORAGE_HOST)) return null
    return url
  } catch { return null }
}

function redactPhone(phone) {
  if (!phone) return '[no phone]'
  const s = String(phone)
  return s.length >= 4 ? `****${s.slice(-4)}` : '****'
}

/**
 * POST /api/delivery/confirm
 * Body: { order_id?, subscription_id?, delivery_date, type: 'order' | 'subscription' }
 * Caller must be is_delivery or is_admin.
 */
export async function POST(request) {
  try {
    const { user, error: authError, isAdmin } = await requireDelivery(request)
    if (authError) return authError

    const { type, order_id, subscription_id, delivery_date, bottle_returned, not_delivered, photo_url, addon_id } = await request.json()
    const deliveredAt = new Date().toISOString()
    const deliveredBy = user.id
    const safePhotoUrl = validatePhotoUrl(photo_url)

    if (type === 'order' && order_id) {
      // Ownership check: delivery agents may only confirm their assigned orders
      if (!isAdmin) {
        const { data: assignCheck } = await supabaseAdmin
          .from('orders').select('assigned_to').eq('id', order_id).maybeSingle()
        if (!assignCheck || (assignCheck.assigned_to !== null && assignCheck.assigned_to !== user.id)) {
          return NextResponse.json({ error: 'Not assigned to this order.' }, { status: 403 })
        }
      }

      const { data: orderRow, error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'delivered', delivered_at: deliveredAt, delivered_by: deliveredBy })
        .eq('id', order_id)
        .select('user_id, payment_method, quantity, product_id, total_price')
        .single()
      if (error) return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 })

      // Fetch product separately — update().select() doesn't support FK joins in PostgREST
      const { data: productData } = await supabaseAdmin
        .from('products').select('size').eq('id', orderRow.product_id).maybeSingle()
      const productLabel = productData?.size
        ? `${productData.size} x${orderRow.quantity || 1}`
        : 'Milk'
      const dateLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

      // Customer notifications + COD upsell (non-blocking)
      try {
        const { data: customerProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, phone')
          .eq('id', orderRow.user_id)
          .single()
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(orderRow.user_id)
        const customerEmail = authUser?.user?.email
        const customerName = customerProfile?.full_name || 'Customer'

        if (customerProfile?.phone) {
          const waResult = await sendDeliveryConfirmed(customerProfile.phone, customerName, dateLabel, productLabel)
          console.log('[DeliveryConfirm] WA delivery result:', waResult)
          if (orderRow.payment_method === 'COD') {
            await notifyCodUpsell({ phone: customerProfile.phone, name: customerName })
          }
          // Check if all 3 trial days are now delivered — send subscribe prompt
          const TRIAL_METHODS = ['COD', 'wallet', 'razorpay']
          if (TRIAL_METHODS.includes(orderRow.payment_method)) {
            try {
              const threeDaysAgo = new Date()
              threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
              const sinceStr = threeDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
              const { data: recentDelivered } = await supabaseAdmin
                .from('orders')
                .select('id')
                .eq('user_id', orderRow.user_id)
                .eq('status', 'delivered')
                .in('payment_method', TRIAL_METHODS)
                .gte('delivery_date', sinceStr)
              if (recentDelivered?.length === 3) {
                await notifyTrialEnded({ phone: customerProfile.phone, name: customerName })
              }
            } catch { /* non-blocking */ }
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
  <p style="color:#555;font-size:13px;">Questions? Call or WhatsApp <strong>8105054473</strong></p>
  <p style="color:#999;font-size:12px;margin-top:16px;">– Sri Krishnaa Dairy Team</p>
</div>`,
            text: `Hi ${customerName},\n\nYour ${productLabel} was delivered on ${dateLabel}.\n\nQuestions? Call 8105054473\n\n– Sri Krishnaa Dairy Team`,
          })
        }
      } catch (notifyErr) {
        console.error('[DeliveryConfirm] Notification failed:', notifyErr?.message)
      }

      // Wallet deduction for trial (COD) orders — deduct if customer has balance, skip otherwise.
      // Uses deduct_wallet for atomicity + idempotency; the RPC raises if insufficient balance
      // which we intentionally ignore (COD means cash was collected instead).
      try {
        const { data: orderWallet } = await supabaseAdmin
          .from('wallet').select('balance').eq('user_id', orderRow.user_id).maybeSingle()
        const orderPrice = orderRow.total_price ?? 0
        if (orderWallet && (orderWallet.balance || 0) >= orderPrice && orderPrice > 0) {
          await supabaseAdmin.rpc('deduct_wallet', {
            p_user_id: orderRow.user_id,
            p_amount: orderPrice,
            p_description: `Trial order delivery [${order_id}]`,
          })
        }
      } catch { /* non-blocking — insufficient balance is expected for cash COD orders */ }

      // Schedule review request (non-blocking)
      try {
        const today = getISTDate()
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
      // Ownership check: delivery agents may only confirm their assigned subscriptions
      if (!isAdmin) {
        const { data: assignCheck } = await supabaseAdmin
          .from('subscriptions').select('assigned_to').eq('id', subscription_id).maybeSingle()
        if (!assignCheck || (assignCheck.assigned_to !== null && assignCheck.assigned_to !== user.id)) {
          return NextResponse.json({ error: 'Not assigned to this subscription.' }, { status: 403 })
        }
      }

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

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, products(*), quantity, weekly_schedule, discount_percent, pending_delivery')
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
        ...(safePhotoUrl ? { photo_url: safePhotoUrl } : {}),
      }, { onConflict: 'subscription_id,delivery_date' })

      if (upsertError) {
        console.error('[DeliveryConfirm] upsert failed:', upsertError.message, upsertError.code)
      } else {
        console.log('[DeliveryConfirm] upsert SUCCESS sub:', subscription_id, 'date:', delivery_date)
      }

      // ── Send delivery WhatsApp confirmation — always, regardless of wallet state ─
      try {
        const { data: deliveryProfile } = await supabaseAdmin
          .from('profiles').select('full_name, phone').eq('id', sub.user_id).single()
        const deliveryName = deliveryProfile?.full_name || 'Customer'
        const dateLabel = new Date(delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const productLabel = sub.products?.size || 'Milk'
        if (deliveryProfile?.phone) {
          await sendDeliveryConfirmed(deliveryProfile.phone, deliveryName, dateLabel, productLabel)
        }
      } catch (waErr) {
        console.error('[Delivery] WhatsApp send failed:', waErr?.message)
      }

      // ── Deduct wallet on delivery confirmation (atomic via DB function) ───────
      const effectiveQty = getScheduledQuantity(sub, delivery_date)
      const dailyAmount = calcDailyAmount(sub.products.price, effectiveQty, sub.discount_percent || 0)
      const description = `Daily subscription ${subscription_id} [${delivery_date}]`

      // deduct_wallet is an atomic Postgres function: it locks the wallet row,
      // checks idempotency via description, deducts, and inserts the transaction
      // in a single transaction — preventing double-deduction race conditions.
      const { data: newBalanceResult, error: deductError } = await supabaseAdmin
        .rpc('deduct_wallet', {
          p_user_id: sub.user_id,
          p_amount: dailyAmount,
          p_description: description,
        })

      const deductedOk = !deductError
      const newBalance = newBalanceResult ?? 0

      if (deductedOk) {

          // Award loyalty points
          const pointsEarned = Math.floor(dailyAmount / 100)
          if (pointsEarned > 0) {
            const { data: profileData } = await supabaseAdmin
              .from('profiles')
              .select('loyalty_points, streak_count, last_delivery_date, badges, loyalty_points_expiry')
              .eq('id', sub.user_id)
              .single()
            if (profileData) {
              const today = getISTDate()
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)
              const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
              // Only yesterday counts as consecutive; same-day (2nd sub confirmed today) must not double-increment streak
              const isConsecutive = profileData.last_delivery_date === yesterdayStr
              const newStreak = profileData.last_delivery_date === today
                ? (profileData.streak_count || 0)   // already counted today
                : isConsecutive ? (profileData.streak_count || 0) + 1 : 1
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
              const { data: deliveryProfile } = await supabaseAdmin
                .from('profiles').select('full_name').eq('id', sub.user_id).single()
              const deliveryName = deliveryProfile?.full_name || 'Customer'
              const dateLabel = new Date(delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              const productLabel = sub.products?.size || 'Milk'
              await sendOrderConfirmationEmail({
                to: deliveryEmail,
                name: deliveryName,
                product: productLabel,
                quantity: effectiveQty,
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
              const { data: userProfile } = await supabaseAdmin
                .from('profiles').select('full_name, phone, email').eq('id', sub.user_id).single()
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
              const email = authUser?.user?.email || userProfile?.email
              const name = userProfile?.full_name || email
              if (email) await sendLowBalanceEmail({ to: email, name, balance: newBalance })
              if (userProfile?.phone) await sendLowBalanceAlert(userProfile.phone, name, newBalance)
            } catch { /* non-blocking */ }
          }
      } else if (deductError) {
        // Insufficient balance — deactivate subscription
        const { data: walletSnap } = await supabaseAdmin
          .from('wallet').select('balance').eq('user_id', sub.user_id).maybeSingle()
        const balance = walletSnap?.balance || 0

        await supabaseAdmin.from('subscriptions').update({ is_active: false, pending_delivery: false }).eq('id', subscription_id)
        const { data: stoppedProfileInfo } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', sub.user_id).maybeSingle()
        createAdminNotification({
          type: 'subscription_stopped',
          title: `Subscription stopped — ${stoppedProfileInfo?.full_name || 'Customer'}`,
          body: `Insufficient balance. Required: ₹${dailyAmount}, Available: ₹${balance} | Phone: ${stoppedProfileInfo?.phone || 'N/A'}`,
          link_tab: 'customers',
        })
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
        try {
          const { data: stoppedProfile } = await supabaseAdmin
            .from('profiles').select('full_name, phone').eq('id', sub.user_id).single()
          if (stoppedProfile?.phone) {
            await notifySubscriptionStopped({ phone: stoppedProfile.phone, name: stoppedProfile.full_name || 'Customer', balance })
          }
        } catch { /* non-blocking */ }
      }

      // Clear pending_delivery flag
      await supabaseAdmin.from('subscriptions').update({ pending_delivery: false }).eq('id', subscription_id)

      // ── Bottle return tracking ──────────────────────────────────────────────
      if (bottle_returned === false) {
        try {
          const { data: profileData } = await supabaseAdmin
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
                `Your Sri Krishnaa Dairy delivery has been paused as we have not received ${newCount} bottles back. Please return the bottles to resume delivery. Contact us: 8105054473`
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
      const { data: addonOrder, error: addonError } = await supabaseAdmin
        .from('addon_orders')
        .update({ status: 'delivered', delivered_at: deliveredAt, delivered_by: deliveredBy })
        .eq('id', addon_id)
        .select('user_id, total_price, product_id, quantity, delivery_date')
        .single()

      if (addonError) {
        console.error('[delivery/confirm] addon update error:', addonError)
        return NextResponse.json({ error: addonError.message || 'Failed to update addon order' }, { status: 500 })
      }
      if (!addonOrder) return NextResponse.json({ error: 'Addon order not found' }, { status: 404 })

      const amount = addonOrder.total_price || 0
      if (amount > 0) {
        // Atomic deduction via DB function — raises on insufficient balance which we ignore
        // (delivery still counts; admin can resolve payment separately)
        try {
          await supabaseAdmin.rpc('deduct_wallet', {
            p_user_id: addonOrder.user_id,
            p_amount: amount,
            p_description: `Add-on delivery [${addon_id}] [${addonOrder.delivery_date}]`,
          })
        } catch { /* non-blocking — low balance does not block delivery confirmation */ }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
