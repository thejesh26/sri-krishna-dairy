import { NextResponse } from 'next/server'
import { createServerClient } from '../../lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminAlert } from '../../lib/whatsapp'
import { sendEmail } from '../../lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  console.log('[MissedDelivery] Route called')
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

    const { order_id, description } = await request.json()
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
    const phone = profile?.phone || 'N/A'
    const address = [profile?.flat_number, profile?.apartment_name, profile?.area].filter(Boolean).join(', ')
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    const issueText = description?.trim() || 'Missed delivery reported'

    console.log(`[MissedDelivery] Customer: ${name}, Phone: ${phone}, Order: ${order_id}, Issue: ${issueText}`)

    await sendAdminAlert(
      `⚠️ Customer Issue Report!\nCustomer: ${name}\nPhone: ${phone}\nIssue: ${issueText}\nDate: ${today}`
    )

    // Email admin
    try {
      await sendEmail({
        to: 'hello@srikrishnaadairy.in',
        subject: `⚠️ Customer Issue Report – ${name}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
  <h2 style="color:#b91c1c;margin-bottom:16px;">⚠️ Customer Issue Report</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;color:#666;width:100px;">Customer</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Phone</td><td style="padding:6px 0;font-weight:600;">${phone}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Address</td><td style="padding:6px 0;">${address || 'N/A'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Issue</td><td style="padding:6px 0;">${issueText}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Date</td><td style="padding:6px 0;">${today}</td></tr>
  </table>
  <p style="margin-top:20px;color:#666;font-size:13px;">Please check and resolve this issue promptly.</p>
</div>`,
        text: `Customer Issue Report\n\nCustomer: ${name}\nPhone: ${phone}\nAddress: ${address || 'N/A'}\nIssue: ${issueText}\nDate: ${today}\n\nPlease check and resolve this issue promptly.`,
      })
    } catch (emailErr) {
      console.error('[MissedDelivery] Email failed:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
