import { Resend } from 'resend'

const FROM = 'Sri Krishnaa Dairy <orders@srikrishnaadairy.in>'
const REPLY_TO = 'hello@srikrishnaadairy.in'
const UNSUBSCRIBE_EMAIL = 'mailto:hello@srikrishnaadairy.in?subject=unsubscribe'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// ── Shared send wrapper — applies common headers to every email ───────────────
function sendEmail({ to, subject, html, text }) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
    reply_to: REPLY_TO,
    headers: {
      'List-Unsubscribe': `<${UNSUBSCRIBE_EMAIL}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
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
                <a href="tel:9980166221" style="color:#9ca3af;text-decoration:none;">9980166221</a>
                &nbsp;&bull;&nbsp;
                <a href="https://srikrishnaadairy.in" style="color:#d4a017;text-decoration:none;">srikrishnaadairy.in</a>
              </p>
              <p style="margin:0 0 4px;color:#4b5563;font-size:11px;">FSSAI Lic. No: 21225008004544 &nbsp;&bull;&nbsp; &copy; 2025 Sri Krishnaa Dairy Farms</p>
              <p style="margin:0;font-size:10px;color:#374151;">
                You received this email because you have an account with Sri Krishnaa Dairy.
                To stop receiving these emails, reply with &quot;unsubscribe&quot; to
                <a href="mailto:hello@srikrishnaadairy.in" style="color:#6b7280;">hello@srikrishnaadairy.in</a>
              </p>
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

// ── Plain text footer (shared) ────────────────────────────────────────────────
const TEXT_FOOTER = `
--
Sri Krishnaa Dairy Farms
Kattigenahalli, Bangalore, Karnataka
Phone: 9980166221
Website: https://srikrishnaadairy.in
FSSAI Lic. No: 21225008004544

You received this email because you have an account with Sri Krishnaa Dairy.
To unsubscribe, email hello@srikrishnaadairy.in with subject "unsubscribe".`

// ── 1. Order Placed ───────────────────────────────────────────────────────────
export async function sendOrderConfirmationEmail({ to, name, product, quantity, deliveryDate, deliverySlot, totalAmount }) {
  const slotLabel = deliverySlot === 'morning' ? 'Morning (5AM - 8AM)' : 'Evening (5PM - 7PM)'
  const slotEmoji = deliverySlot === 'morning' ? '🌅' : '🌆'
  const formattedDate = new Date(deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const html = wrapLayout('Order Confirmed - Sri Krishnaa Dairy', `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Order Confirmed</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">Your order is placed! 🥛</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, thank you for your order. Here are the details:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Product', `${product} x ${quantity}`)}
      ${row('Delivery Date', formattedDate)}
      ${row('Delivery Slot', `${slotEmoji} ${slotLabel}`)}
      ${row('Payment', 'Cash on Delivery')}
      ${row('Total Amount', `Rs.${totalAmount}`, true)}
    </table>

    <div style="background:#fdf6e3;border:1px solid #f0dfa0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:bold;">Payment Reminder</p>
      <p style="margin:6px 0 0;font-size:13px;color:#92400e;">Please keep <strong>Rs.${totalAmount} cash</strong> ready for the delivery person.</p>
    </div>

    <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1a5c38;font-weight:bold;">Raw Milk Advisory</p>
      <p style="margin:6px 0 0;font-size:13px;color:#1a5c38;">Our milk is farm-fresh and not pasteurized. Please boil before consumption.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">View Dashboard</a>
    </div>`)

  const text = `Hi ${name},

Your order has been placed successfully.

ORDER DETAILS
-------------
Product:       ${product} x ${quantity}
Delivery Date: ${formattedDate}
Delivery Slot: ${slotLabel}
Payment:       Cash on Delivery
Total Amount:  Rs.${totalAmount}

Please keep Rs.${totalAmount} cash ready for the delivery person.

Raw Milk Advisory: Our milk is farm-fresh and not pasteurized. Please boil before consumption.

View your dashboard: https://srikrishnaadairy.in/dashboard
${TEXT_FOOTER}`

  return sendEmail({
    to,
    subject: 'Your Sri Krishnaa Dairy order is confirmed',
    html,
    text,
  })
}

// ── 2. Subscription Activated ─────────────────────────────────────────────────
export async function sendSubscriptionConfirmationEmail({ to, name, product, quantity, startDate, deliverySlot, dailyAmount }) {
  const slotLabel = deliverySlot === 'morning' ? 'Morning (5AM - 8AM)' : 'Evening (5PM - 7PM)'
  const slotEmoji = deliverySlot === 'morning' ? '🌅' : '🌆'
  const formattedStart = new Date(startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const html = wrapLayout('Daily Milk Delivery Started - Sri Krishnaa Dairy', `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Subscription Active</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">Welcome to daily fresh milk! 🥛</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your subscription is now active. Fresh milk will be delivered to your doorstep every day.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Product', `${product} x ${quantity} per day`)}
      ${row('Starts From', formattedStart)}
      ${row('Delivery Slot', `${slotEmoji} ${slotLabel}`)}
      ${row('Daily Charge', `Rs.${dailyAmount}`, true)}
    </table>

    <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1a5c38;font-weight:bold;">Wallet Deductions</p>
      <p style="margin:6px 0 0;font-size:13px;color:#1a5c38;">Rs.${dailyAmount} will be deducted from your wallet each day. Please ensure your wallet balance stays above Rs.300 to avoid interruption.</p>
    </div>

    <div style="background:#fdf6e3;border:1px solid #f0dfa0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:bold;">Raw Milk Advisory</p>
      <p style="margin:6px 0 0;font-size:13px;color:#92400e;">Our milk is farm-fresh and not pasteurized. Please boil before consumption.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">View Dashboard</a>
    </div>`)

  const text = `Hi ${name},

Your daily milk delivery subscription is now active.

SUBSCRIPTION DETAILS
--------------------
Product:       ${product} x ${quantity} per day
Starts From:   ${formattedStart}
Delivery Slot: ${slotLabel}
Daily Charge:  Rs.${dailyAmount}

Rs.${dailyAmount} will be deducted from your wallet each day. Please keep your wallet balance above Rs.300 to avoid interruption.

Raw Milk Advisory: Our milk is farm-fresh and not pasteurized. Please boil before consumption.

View your dashboard: https://srikrishnaadairy.in/dashboard
${TEXT_FOOTER}`

  return sendEmail({
    to,
    subject: 'Your daily milk delivery has started - Sri Krishnaa Dairy',
    html,
    text,
  })
}

// ── 3. Payment Received (subscription) ───────────────────────────────────────
export async function sendPaymentReceivedEmail({ to, name, amountPaid, paymentId }) {
  const html = wrapLayout('Payment Received - Sri Krishnaa Dairy', `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Payment Received</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">We received your payment 🥛</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your payment has been verified. Your subscription will be activated shortly.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Amount', `Rs.${amountPaid}`, true)}
      ${row('Reference ID', `<span style="font-family:monospace;font-size:12px;">${paymentId}</span>`)}
      ${row('Status', '<span style="color:#1a5c38;font-weight:bold;">Verified</span>')}
    </table>

    <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1a5c38;">You will receive a separate email once your subscription is fully activated. If you have any questions, reply to this email or contact us with your Reference ID.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">View Dashboard</a>
    </div>`)

  const text = `Hi ${name},

We have received and verified your payment.

PAYMENT DETAILS
---------------
Amount:       Rs.${amountPaid}
Reference ID: ${paymentId}
Status:       Verified

Your subscription will be activated shortly. You will receive a separate confirmation email once it is active. If you have any questions, reply to this email or contact us with your Reference ID.

View your dashboard: https://srikrishnaadairy.in/dashboard
${TEXT_FOOTER}`

  return sendEmail({
    to,
    subject: 'Payment received - Sri Krishnaa Dairy',
    html,
    text,
  })
}

// ── 4. Wallet Recharged ───────────────────────────────────────────────────────
export async function sendWalletRechargeEmail({ to, name, amountAdded, newBalance, paymentId }) {
  const html = wrapLayout('Wallet Balance Updated - Sri Krishnaa Dairy', `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Wallet Updated</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">Wallet balance added 🥛</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your Sri Krishnaa Dairy wallet has been topped up successfully.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Amount Added', `Rs.${amountAdded}`, true)}
      ${row('New Balance', `Rs.${newBalance}`, true)}
      ${row('Reference ID', `<span style="font-family:monospace;font-size:12px;">${paymentId}</span>`)}
      ${row('Status', '<span style="color:#1a5c38;font-weight:bold;">Credited</span>')}
    </table>

    <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1a5c38;font-weight:bold;">Your daily deliveries will continue without interruption.</p>
      <p style="margin:6px 0 0;font-size:13px;color:#1a5c38;">Daily charges are automatically deducted from your wallet each morning.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/wallet" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">View Wallet</a>
    </div>`)

  const text = `Hi ${name},

Your Sri Krishnaa Dairy wallet has been topped up.

WALLET UPDATE
-------------
Amount Added:  Rs.${amountAdded}
New Balance:   Rs.${newBalance}
Reference ID:  ${paymentId}
Status:        Credited

Your daily deliveries will continue without interruption. Daily charges are automatically deducted each morning.

View your wallet: https://srikrishnaadairy.in/wallet
${TEXT_FOOTER}`

  return sendEmail({
    to,
    subject: 'Wallet balance updated - Sri Krishnaa Dairy',
    html,
    text,
  })
}

// ── 5. Subscription Paused ───────────────────────────────────────────────────
export async function sendSubscriptionPausedEmail({ to, name, pauseDate }) {
  const formattedDate = new Date(pauseDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const html = wrapLayout('Delivery Paused - Sri Krishnaa Dairy', `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Delivery Paused</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">Your delivery is paused 🍼</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your delivery has been paused for the date below. All other days remain active.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Paused Date', formattedDate)}
      ${row('All Other Days', '<span style="color:#1a5c38;font-weight:bold;">Active</span>')}
    </table>

    <div style="background:#fdf6e3;border:1px solid #f0dfa0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">You can resume this date anytime from your dashboard, or contact us if you need help.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/pause" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">Manage Subscription</a>
    </div>`)

  const text = `Hi ${name},

Your milk delivery has been paused for ${formattedDate}. All other days remain active.

You can resume this date anytime from your dashboard at https://srikrishnaadairy.in/pause

Need help? Contact us at hello@srikrishnaadairy.in or call 9980166221.
${TEXT_FOOTER}`

  return sendEmail({
    to,
    subject: 'Delivery paused - Sri Krishnaa Dairy',
    html,
    text,
  })
}

// ── 6. Subscription Cancelled ─────────────────────────────────────────────────
export async function sendSubscriptionCancelledEmail({ to, name, product, quantity }) {
  const html = wrapLayout('Subscription Cancelled - Sri Krishnaa Dairy', `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Subscription Cancelled</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a5c38;">Your subscription has been cancelled</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your subscription has been cancelled. We are sorry to see you go!</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Product', `${product} x ${quantity}`)}
      ${row('Status', '<span style="color:#991b1b;">Cancelled</span>')}
    </table>

    <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1a5c38;font-weight:bold;">Bottle deposit refund</p>
      <p style="margin:6px 0 0;font-size:13px;color:#1a5c38;">Please return your bottles in good condition to receive your full deposit refund. Contact us to arrange the collection.</p>
    </div>

    <div style="background:#fdf6e3;border:1px solid #f0dfa0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">You can start a new subscription anytime from your dashboard. We would love to have you back!</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/subscribe" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">Subscribe Again</a>
    </div>`)

  const text = `Hi ${name},

Your subscription (${product} x ${quantity}) has been cancelled.

Please return your bottles in good condition to receive your full deposit refund. Contact us to arrange bottle collection.

You can start a new subscription anytime at https://srikrishnaadairy.in/subscribe

Questions? Email hello@srikrishnaadairy.in or call 9980166221.
${TEXT_FOOTER}`

  return sendEmail({
    to,
    subject: 'Subscription cancelled - Sri Krishnaa Dairy',
    html,
    text,
  })
}

// ── 7. Low Wallet Balance ─────────────────────────────────────────────────────
export async function sendLowBalanceEmail({ to, name, balance }) {
  const html = wrapLayout('Wallet Balance Needs Attention - Sri Krishnaa Dairy', `
    <p style="margin:0 0 6px;font-size:13px;color:#d4a017;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Wallet Balance</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#b45309;">Your wallet balance is low</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Hi <strong>${name}</strong>, your wallet balance has fallen below Rs.300. Please add funds to keep your milk delivery running.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin-bottom:24px;">
      ${row('Current Balance', `Rs.${balance}`)}
      ${row('Recommended Minimum', 'Rs.300')}
    </table>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#991b1b;font-weight:bold;">Delivery may be affected</p>
      <p style="margin:6px 0 0;font-size:13px;color:#991b1b;">If your wallet balance drops below the daily charge amount, your milk delivery will be paused until you add funds.</p>
    </div>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/wallet" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">Add Funds to Wallet</a>
    </div>`)

  const text = `Hi ${name},

Your Sri Krishnaa Dairy wallet balance has fallen below Rs.300.

WALLET STATUS
-------------
Current Balance:       Rs.${balance}
Recommended Minimum:   Rs.300

If your balance drops below the daily charge amount, your milk delivery will be paused until you add funds.

Add funds to your wallet: https://srikrishnaadairy.in/wallet
${TEXT_FOOTER}`

  return sendEmail({
    to,
    subject: 'Your Sri Krishnaa Dairy wallet needs attention',
    html,
    text,
  })
}

// ── 8. Cron Failure Alert (admin-only) ───────────────────────────────────────
export async function sendCronFailureAlert({ date, failed, skipped, deducted }) {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'hello@srikrishnaadairy.in'

  const rows = failed.map(f => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;font-size:12px;">${f.subscriptionId}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;font-size:12px;">${f.product || ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;font-size:12px;color:#b91c1c;">Rs.${f.balance}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;font-size:12px;">Rs.${f.required}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;font-size:12px;color:#92400e;">${f.reason}</td>
    </tr>`).join('')

  const html = wrapLayout('Cron Alert: Subscription Deductions', `
    <p style="margin:0 0 6px;font-size:13px;color:#b91c1c;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Daily Cron Report — ${date}</p>
    <h2 style="margin:0 0 16px;font-size:22px;color:#1c1c1c;">⚠️ ${failed.length} Deduction${failed.length !== 1 ? 's' : ''} Failed</h2>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#fdf6e3;border:1px solid #f0dfa0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#1c1c1c;">✅ Deducted</td><td style="padding:8px 12px;font-size:14px;font-weight:bold;color:#1a5c38;">${deducted}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1c1c1c;">⏭ Skipped</td><td style="padding:8px 12px;font-size:14px;font-weight:bold;color:#92400e;">${skipped}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1c1c1c;">❌ Failed</td><td style="padding:8px 12px;font-size:14px;font-weight:bold;color:#b91c1c;">${failed.length}</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f5f0e8;">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Sub ID</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Product</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Balance</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Required</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Reason</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:20px;text-align:center;">
      <a href="https://srikrishnaadairy.in/admin" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">Open Admin Panel</a>
    </div>`)

  const text = `CRON ALERT — ${date}
${failed.length} deduction(s) failed.
Deducted: ${deducted} | Skipped: ${skipped} | Failed: ${failed.length}

Failed subscriptions:
${failed.map(f => `- Sub ${f.subscriptionId}: ${f.reason} (balance Rs.${f.balance}, need Rs.${f.required})`).join('\n')}

Open admin panel: https://srikrishnaadairy.in/admin`

  return sendEmail({
    to: adminEmail,
    subject: `[Action Required] ${failed.length} subscription deduction(s) failed — ${date}`,
    html,
    text,
  })
}

export async function sendSubscriptionExpiryReminderEmail({ to, name, product, endDate, daysLeft }) {
  const html = wrapLayout('Your Subscription is Ending Soon', `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1c1c1c;">Hi ${name || 'there'} 👋</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#4a4a4a;">Your Sri Krishnaa Dairy subscription is ending in <strong style="color:#b91c1c;">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>

    <table style="width:100%;border-collapse:collapse;background:#fdf6e3;border:1px solid #f0dfa0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#92400e;">📦 Product</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:bold;color:#1c1c1c;">${product}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#92400e;border-top:1px solid #f0dfa0;">📅 End Date</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:bold;color:#1c1c1c;border-top:1px solid #f0dfa0;">${endDate}</td>
      </tr>
    </table>

    <p style="margin:0 0 20px;font-size:14px;color:#4a4a4a;">To keep receiving fresh milk without interruption, renew your subscription from your dashboard before it ends.</p>

    <div style="text-align:center;">
      <a href="https://srikrishnaadairy.in/subscribe" style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#2d7a50);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:8px;">Renew Subscription</a>
    </div>`)

  const text = `Hi ${name || 'there'},\n\nYour Sri Krishnaa Dairy subscription ends in ${daysLeft} day(s) on ${endDate}.\n\nRenew here: https://srikrishnaadairy.in/subscribe`

  return sendEmail({
    to,
    subject: `Your subscription ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — Sri Krishnaa Dairy`,
    html,
    text,
  })
}
