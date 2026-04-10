import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  // Auth
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, phone, area, apartment_name, flat_number, landmark, is_admin')
    .eq('id', user.id)
    .single()

  const orderId = params.orderId

  // Fetch order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*, products(name, price, unit)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Ownership check (admin can view any)
  if (!profile?.is_admin && order.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch customer profile if admin viewing
  let customerProfile = profile
  if (profile?.is_admin && order.user_id !== user.id) {
    const { data: cp } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, area, apartment_name, flat_number')
      .eq('id', order.user_id)
      .single()
    if (cp) customerProfile = cp
  }

  const invoiceNumber = `INV-${new Date(order.created_at).getFullYear()}-${String(orderId).slice(-6).toUpperCase()}`
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const deliveryDate = new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const unitPrice = order.products?.price || 0
  const qty = order.quantity || 1
  const subtotal = unitPrice * qty
  const bottleDeposit = order.bottle_deposit || 0
  const discount = order.discount_amount || 0
  const total = order.total_amount || (subtotal + bottleDeposit - discount)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1c1c1c; background: #fff; }
  .page { max-width: 680px; margin: 0 auto; padding: 40px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #1a5c38; padding-bottom: 20px; }
  .brand h1 { font-size: 22px; color: #1a5c38; font-weight: 800; }
  .brand p { font-size: 12px; color: #666; margin-top: 2px; }
  .invoice-meta { text-align: right; }
  .invoice-meta .inv-num { font-size: 18px; font-weight: 700; color: #1a5c38; }
  .invoice-meta p { font-size: 12px; color: #666; margin-top: 4px; }
  .badge { display: inline-block; background: #f0faf4; border: 1px solid #c8e6d4; color: #1a5c38; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-top: 6px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
  .party p { font-size: 14px; font-weight: 600; color: #1c1c1c; }
  .party .sub { font-size: 12px; color: #666; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #1a5c38; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody td { padding: 12px; border-bottom: 1px solid #f0ebe0; font-size: 13px; }
  tbody tr:last-child td { border-bottom: none; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.total { border-top: 2px solid #1a5c38; font-weight: 700; font-size: 15px; color: #1a5c38; padding-top: 10px; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .status-paid { background: #f0faf4; color: #1a5c38; border: 1px solid #c8e6d4; }
  .status-pending { background: #fdf6e3; color: #92400e; border: 1px solid #f0dfa0; }
  .footer { margin-top: 40px; border-top: 1px solid #e8e0d0; padding-top: 16px; font-size: 11px; color: #888; text-align: center; }
  .footer strong { color: #1a5c38; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <h1>Sri Krishnaa Dairy Farms</h1>
      <p>Kattigenahalli, Bangalore – 562157</p>
      <p>Phone: +91 99801 66221</p>
      <p>Email: srikrishnaadairyfarms@gmail.com</p>
    </div>
    <div class="invoice-meta">
      <div class="inv-num">${invoiceNumber}</div>
      <p>Date: ${invoiceDate}</p>
      <span class="badge">${order.status === 'delivered' ? '✓ Delivered' : order.status === 'pending' ? 'Pending' : order.status}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Bill To</h3>
      <p>${customerProfile?.full_name || 'Customer'}</p>
      <p class="sub">${customerProfile?.phone ? '+91 ' + customerProfile.phone : ''}</p>
      <p class="sub">${[customerProfile?.flat_number, customerProfile?.apartment_name, customerProfile?.area].filter(Boolean).join(', ')}</p>
    </div>
    <div class="party">
      <h3>Delivery Info</h3>
      <p>${deliveryDate}</p>
      <p class="sub">Slot: ${order.delivery_slot === 'morning' ? 'Morning (7AM–9AM)' : 'Evening'}</p>
      <p class="sub">Mode: ${order.delivery_mode === 'keep_bottle' ? 'Keep Bottle' : 'Return Bottle'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Unit Price</th>
        <th>Qty</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${order.products?.name || 'Milk'}</td>
        <td>₹${unitPrice}/${order.products?.unit || 'L'}</td>
        <td>${qty}</td>
        <td style="text-align:right">₹${subtotal}</td>
      </tr>
      ${bottleDeposit > 0 ? `<tr><td>Bottle Deposit (refundable)</td><td>–</td><td>–</td><td style="text-align:right">₹${bottleDeposit}</td></tr>` : ''}
      ${discount > 0 ? `<tr><td>Discount</td><td>–</td><td>–</td><td style="text-align:right; color:#1a5c38">-₹${discount}</td></tr>` : ''}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>₹${subtotal}</span></div>
    ${bottleDeposit > 0 ? `<div class="row"><span>Bottle Deposit</span><span>₹${bottleDeposit}</span></div>` : ''}
    ${discount > 0 ? `<div class="row"><span>Discount</span><span style="color:#1a5c38">-₹${discount}</span></div>` : ''}
    <div class="row total"><span>Total</span><span>₹${total}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for choosing <strong>Sri Krishnaa Dairy Farms</strong>!</p>
    <p style="margin-top:6px">FSSAI License No. 11224999000437 &nbsp;|&nbsp; This is a computer-generated invoice and does not require a signature.</p>
    <p style="margin-top:4px">For queries: srikrishnaadairyfarms@gmail.com | +91 99801 66221</p>
  </div>
</div>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${invoiceNumber}.html"`,
    },
  })
}
