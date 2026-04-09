import { Resend } from 'resend'

const FROM = 'Sri Krishnaa Dairy <orders@srikrishnaadairy.in>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// ── Shared HTML layout ────────────────────────────────────────────────────────
function wrapLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d3320 0%,#1a5c38 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">Sri Krishnaa Dairy</p>
              <p style="margin:6px 0 0;font-size:13px;color:#d4a017;letter-spacing:2px;text-transform:uppercase;">Farm Fresh &bull; Pure &bull; Natural</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d1f13;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 4px;color:#d4a017;font-size:13px;font-weight:bold;">Sri Krishnaa Dairy Farms</p>
              <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">Kattigenahalli, Bangalore, Karnataka</p>
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">
                📞 <a href="tel:8553666002" style="color:#9ca3af;text-decoration:none;">8553666002</a>
                &nbsp;&bull;&nbsp;
                🌐 <a href="https://srikrishnaadairy.in" style="color:#d4a017;text-decoration:none;">srikrishnaadairy.in</a>
              </p>
              <p style="margin:0;color:#4b5563;font-size:11px;">FSSAI Lic. No: 21225008004544 &nbsp;&bull;&nbsp; © 2025 Sri Krishnaa Dairy Farms</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Row helper for summary tables ─────────────────────────────────────────────
function row(label, value, accent = false) {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;color:#6b7280;font-size:14px;width:50%;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f0ebe0;font-size:14px;font-weight:600;color:${accent ? '#1a5c38' : '#1c1c1c'};text-align:right;">${value}</td>
  </tr>`
}

// ── 1. Order Placed ───────────────────────────────────────────────────────────
export async function sendOrderConfirmationEmail({ to, name, product, quantity, deliveryDate, deliverySlot, totalAmount }) {
  const slotLabel = deliverySlot === 'morning' ? '🌅 Morning (5AM – 8AM)' : '🌆 Evening (5PM – 7PM)'
  const formattedDate = new Date(deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const body = `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Order Confirmed</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">Your order is placed! 🥛</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, thank you for your order. Here are the details:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Product', `${product} × ${quantity}`)}
      ${row('Delivery Date', formattedDate)}
      ${row('Delivery Slot', slotLabel)}
      ${row('Payment', 'Cash on Delivery')}
      ${row('Total Amount', `₹${totalAmount}`, true)}
    </table>

    <div style="background:#fdf6e3;border:1px solid #f0dfa0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:bold;">💰 Payment Reminder</p>
      <p style="margin:6px 0 0;font-size:13px;color:#92400e;">Please keep <strong>₹${totalAmount} cash</strong> ready for the delivery person.</p>
    </div>

    <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1a5c38;font-weight:bold;">⚠️ Raw Milk Advisory</p>
      <p style="margin:6px 0 0;font-size:13px;color:#1a5c38;">Our milk is farm-fresh and not pasteurized. Please boil before consumption.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">View Dashboard</a>
    </div>`

  return getResend().emails.send({
    from: FROM,
    to,
    subject: 'Order Confirmed - Sri Krishnaa Dairy 🥛',
    html: wrapLayout('Order Confirmed - Sri Krishnaa Dairy', body),
  })
}

// ── 2. Subscription Activated ─────────────────────────────────────────────────
export async function sendSubscriptionConfirmationEmail({ to, name, product, quantity, startDate, deliverySlot, dailyAmount }) {
  const slotLabel = deliverySlot === 'morning' ? '🌅 Morning (5AM – 8AM)' : '🌆 Evening (5PM – 7PM)'
  const formattedStart = new Date(startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const body = `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Subscription Activated</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">Welcome to daily fresh milk! 🥛</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your subscription is now active. Fresh milk will be delivered to your doorstep every day.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Product', `${product} × ${quantity} per day`)}
      ${row('Starts From', formattedStart)}
      ${row('Delivery Slot', slotLabel)}
      ${row('Daily Charge', `₹${dailyAmount}`, true)}
    </table>

    <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1a5c38;font-weight:bold;">💳 Wallet Deductions</p>
      <p style="margin:6px 0 0;font-size:13px;color:#1a5c38;">₹${dailyAmount} will be deducted from your wallet each day. Please ensure your wallet balance stays above ₹300 to avoid interruption.</p>
    </div>

    <div style="background:#fdf6e3;border:1px solid #f0dfa0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:bold;">⚠️ Raw Milk Advisory</p>
      <p style="margin:6px 0 0;font-size:13px;color:#92400e;">Our milk is farm-fresh and not pasteurized. Please boil before consumption.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">View Dashboard</a>
    </div>`

  return getResend().emails.send({
    from: FROM,
    to,
    subject: 'Subscription Activated - Sri Krishnaa Dairy 🥛',
    html: wrapLayout('Subscription Activated - Sri Krishnaa Dairy', body),
  })
}

// ── 3. Low Wallet Balance ─────────────────────────────────────────────────────
export async function sendLowBalanceEmail({ to, name, balance }) {
  const body = `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Wallet Alert</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#b45309;">Low Wallet Balance ⚠️</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your wallet balance is running low. Please recharge to continue receiving fresh milk.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Current Balance', `₹${balance}`)}
      ${row('Minimum Required', '₹300')}
    </table>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#991b1b;font-weight:bold;">🚫 Delivery at Risk</p>
      <p style="margin:6px 0 0;font-size:13px;color:#991b1b;">Your daily milk delivery will be paused if your wallet balance drops below the daily charge amount. Recharge now to avoid missing your delivery.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/wallet" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">Recharge Wallet Now</a>
    </div>`

  return getResend().emails.send({
    from: FROM,
    to,
    subject: 'Low Wallet Balance - Sri Krishnaa Dairy ⚠️',
    html: wrapLayout('Low Wallet Balance - Sri Krishnaa Dairy', body),
  })
}
