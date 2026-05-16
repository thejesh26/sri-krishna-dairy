import { createServerClient } from '../../../lib/supabase-server'
import { sendWhatsAppMessage, notifyOrderPlaced, notifySubscriptionActivated, notifyLowBalance, sendLowBalanceAlert, sendSubscriptionExpiry } from '../../../lib/whatsapp'

const WA_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

function normalizePhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  const local = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits
  const last10 = local.slice(-10)
  if (last10.length !== 10) return null
  return '91' + last10
}

async function sendRawTemplate(body) {
  console.log('[ResendWA] Raw request body:\n', JSON.stringify(body, null, 2))
  const res = await fetch(WA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  console.log('[ResendWA] Meta response status:', res.status)
  console.log('[ResendWA] Meta response body:', text)
  return { ok: res.ok, status: res.status, body: text }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!adminProfile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, messageType, customMessage, targetId } = await request.json()

    const VALID_TYPES = ['test', 'custom', 'low_balance', 'order_confirmation', 'subscription_active', 'subscription_expiring', 'subscription_reactivate']

    if (!messageType) {
      return Response.json({ error: 'messageType required', accepted: VALID_TYPES }, { status: 400 })
    }

    // ── Hardcoded test: no userId needed, bypasses all dynamic logic ─────────
    if (messageType.trim() === 'test') {
      const result = await sendRawTemplate({
        messaging_product: 'whatsapp',
        to: '918553666002',
        type: 'template',
        template: {
          name: 'order_confirmed_',
          language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: 'Thejesh' },
              { type: 'text', text: '1000ml x 1' },
              { type: 'text', text: '25 Apr 2026' },
              { type: 'text', text: 'Morning 7-9AM' },
              { type: 'text', text: '65' },
            ],
          }],
        },
      })
      return Response.json({ success: result.ok, status: result.status, metaResponse: result.body })
    }

    if (!userId) {
      return Response.json({ error: 'userId required for this messageType', accepted: VALID_TYPES }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .single()

    if (!profile?.phone) {
      return Response.json({ error: 'Customer has no phone number' }, { status: 400 })
    }

    const phone = normalizePhone(profile.phone)
    if (!phone) {
      console.error('[ResendWA] Invalid phone after normalization:', profile.phone)
      return Response.json({ error: `Invalid phone number: "${profile.phone}" — update the customer profile first` }, { status: 400 })
    }
    console.log('[ResendWA] Normalized phone:', phone, '(raw:', profile.phone, ')')

    const name = profile.full_name || 'Customer'

    if (messageType === 'custom') {
      if (!customMessage?.trim()) {
        return Response.json({ error: 'customMessage required' }, { status: 400 })
      }
      const ok = await sendWhatsAppMessage(phone, customMessage.trim())
      return Response.json({ success: ok })
    }

    if (messageType === 'low_balance') {
      const { data: wallet } = await supabase
        .from('wallet')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle()
      await notifyLowBalance({ phone, name, balance: wallet?.balance ?? 0 })
      return Response.json({ success: true })
    }

    if (messageType === 'order_confirmation') {
      let order = null
      if (targetId) {
        const { data } = await supabase
          .from('orders')
          .select('*, products(size, price)')
          .eq('id', targetId)
          .single()
        order = data
      } else {
        const { data } = await supabase
          .from('orders')
          .select('*, products(size, price)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        order = data
      }
      if (!order) return Response.json({ error: 'No order found' }, { status: 404 })

      const params = [
        name,
        `${order.products?.size || 'Milk'} x ${order.quantity || 1}`,
        order.delivery_date
          ? new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '-',
        order.delivery_slot === 'morning' ? 'Morning 7-9AM' : 'Evening 5-7PM',
        String(order.total_price || 0),
      ]
      const result = await sendRawTemplate({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: 'order_confirmed_',
          language: { code: 'en' },
          components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text })) }],
        },
      })
      return Response.json({ success: result.ok, status: result.status, metaResponse: result.body })
    }

    if (messageType === 'subscription_active') {
      let sub = null
      if (targetId) {
        const { data } = await supabase
          .from('subscriptions')
          .select('*, products(size, price)')
          .eq('id', targetId)
          .single()
        sub = data
      } else {
        const { data } = await supabase
          .from('subscriptions')
          .select('*, products(size, price)')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        sub = data
      }
      if (!sub) return Response.json({ error: 'No active subscription found' }, { status: 404 })
      await notifySubscriptionActivated({
        phone,
        name,
        size: sub.products?.size || 'Milk',
        quantity: sub.quantity || 1,
        startDate: sub.start_date,
        slot: sub.delivery_slot,
        dailyAmount: Math.round((sub.products?.price || 0) * (sub.quantity || 1) * (1 - (sub.discount_percent || 0) / 100)),
      })
      return Response.json({ success: true })
    }

    if (messageType === 'subscription_expiring') {
      let sub = null
      if (targetId) {
        const { data } = await supabase
          .from('subscriptions')
          .select('end_date, products(size)')
          .eq('id', targetId)
          .single()
        sub = data
      } else {
        const { data } = await supabase
          .from('subscriptions')
          .select('end_date, products(size)')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        sub = data
      }
      if (!sub) return Response.json({ error: 'No subscription found' }, { status: 404 })
      await sendSubscriptionExpiry(phone, name, sub.end_date || '-', sub.products?.size || 'Milk')
      return Response.json({ success: true })
    }

    if (messageType === 'subscription_reactivate') {
      const ok = await sendWhatsAppMessage(
        phone,
        `Hi ${name}! Your Sri Krishnaa Dairy subscription has expired. Reactivate now at srikrishnaadairy.in/subscribe to continue receiving fresh milk daily. 🥛`
      )
      return Response.json({ success: ok })
    }

    return Response.json({ error: `Invalid messageType: "${messageType}"`, accepted: VALID_TYPES }, { status: 400 })
  } catch (error) {
    console.error('Resend WhatsApp error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
