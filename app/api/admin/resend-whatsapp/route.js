import { createServerClient } from '../../../lib/supabase-server'
import { sendWhatsAppMessage, notifyOrderPlaced, notifySubscriptionActivated, notifyLowBalance } from '../../../lib/whatsapp'

function normalizePhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  const local = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits
  const last10 = local.slice(-10)
  if (last10.length !== 10) return null
  return '91' + last10
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
    if (!userId || !messageType) {
      return Response.json({ error: 'userId and messageType required' }, { status: 400 })
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
    console.log('[ResendWA] Sending to normalized phone:', phone, '(raw:', profile.phone, ')')

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
      await notifyOrderPlaced({
        phone,
        name,
        size: order.products?.size || 'Milk',
        quantity: order.quantity || 1,
        deliveryDate: order.delivery_date,
        slot: order.delivery_slot,
        amount: order.total_price || 0,
      })
      return Response.json({ success: true })
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

    return Response.json({ error: 'Invalid messageType' }, { status: 400 })
  } catch (error) {
    console.error('Resend WhatsApp error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
