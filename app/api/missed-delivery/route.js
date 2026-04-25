import { NextResponse } from 'next/server'
import { createServerClient } from '../../lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminAlert } from '../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { order_id } = await request.json()
    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 })
    }

    // Verify order belongs to user and is delivered
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, delivery_date, delivery_slot, products(size)')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    // Check for duplicate report
    const { data: existing } = await supabaseAdmin
      .from('missed_delivery_reports')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already reported.' })
    }

    // Get customer profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, apartment_name, flat_number, area')
      .eq('id', user.id)
      .single()

    // Insert report
    await supabaseAdmin.from('missed_delivery_reports').insert({
      order_id: order.id,
      user_id: user.id,
      delivery_date: order.delivery_date,
      reported_at: new Date().toISOString(),
    })

    // Notify admin via WhatsApp
    const name = profile?.full_name || user.email
    const address = [profile?.flat_number, profile?.apartment_name, profile?.area].filter(Boolean).join(', ')
    const dateStr = new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const slot = order.delivery_slot === 'morning' ? 'Morning (7AM–9AM)' : 'Evening (5PM–7PM)'

    await sendAdminAlert(
      `⚠️ *Missed Delivery Report*\n👤 Customer: ${name}\n📞 Phone: ${profile?.phone || 'N/A'}\n📍 Address: ${address}\n📦 Order: ${order.products?.size || 'Milk'} on ${dateStr}\n⏰ Slot: ${slot}`
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
