import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/db'
import { requireAuth } from '../../lib/auth'
import { sendWhatsAppToAdmin } from '../../lib/whatsapp'
import { createAdminNotification } from '../../lib/notify'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { order_id, issue } = await request.json()
    if (!order_id || !issue?.trim()) {
      return NextResponse.json({ error: 'order_id and issue description are required.' }, { status: 400 })
    }

    // Verify the order belongs to this user
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, delivery_date, delivery_slot, products(size)')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    // Insert feedback
    await supabaseAdmin.from('quality_feedback').insert({
      order_id,
      user_id: user.id,
      issue: issue.trim(),
      reported_at: new Date().toISOString(),
    })

    // Get customer profile for admin alert
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    const name = profile?.full_name || user.email
    const dateStr = new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

    await sendWhatsAppToAdmin(
      `⚠️ *Quality Issue Reported*\n👤 ${name}${profile?.phone ? ` (${profile.phone})` : ''}\n🥛 ${order.products?.size || 'Milk'} · ${dateStr}\n💬 "${issue.trim()}"`
    )

    createAdminNotification({
      type: 'quality_report',
      title: `Quality issue from ${name}`,
      body: issue.trim(),
      link_tab: 'reports',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
