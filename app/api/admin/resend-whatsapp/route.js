import { createServerClient } from '../../../lib/supabase-server'
import { sendWhatsAppMessage, notifyOrderPlaced, notifySubscriptionActivated, notifyLowBalance } from '../../../lib/whatsapp'

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

    const name = profile.full_name || 'Customer'
    const phone = profile.phone

    if (messageType === 'custom') {
      if (!customMessage?.trim()) {
        return Response.json({ error: 'customMessage required' }, { status: 400 })
      }
      const ok = await sendWhatsAppMessage(phone, customMessage.trim())
      return Response.json({ success: ok })
    }

    if (messageType === 'low_balance') {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single()
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
          .single()
        order = data
      }
      if (!order) return Response.json({ error: 'No order found' }, { status: 404 })
      await notifyOrderPlaced({
        phone,
        name,
        size: order.products?.size,
        quantity: order.quantity,
        deliveryDate: order.delivery_date,
        slot: order.delivery_slot,
        amount: order.total_price,
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
          .single()
        sub = data
      }
      if (!sub) return Response.json({ error: 'No active subscription found' }, { status: 404 })
      await notifySubscriptionActivated({
        phone,
        name,
        size: sub.products?.size,
        quantity: sub.quantity,
        startDate: sub.start_date,
        slot: sub.delivery_slot,
        dailyAmount: (sub.products?.price || 0) * sub.quantity,
      })
      return Response.json({ success: true })
    }

    return Response.json({ error: 'Invalid messageType' }, { status: 400 })
  } catch (error) {
    console.error('Resend WhatsApp error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
