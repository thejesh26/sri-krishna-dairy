import { sendEmail } from './email'

const WA_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
const ADMIN_PHONE = '919980166221'
const ADMIN_EMAIL = 'hello@srikrishnaadairy.in'

function formatPhone(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  const local = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits
  const last10 = local.slice(-10)
  if (last10.length !== 10) {
    console.warn('[WhatsApp] Invalid phone number:', phone)
    return null
  }
  return '91' + last10
}

// ── Core: free-form text (only works within 24h customer-initiated session) ───

async function sendWhatsAppMessage(phone, message) {
  try {
    const to = formatPhone(phone)
    if (!to) {
      console.warn('[WhatsApp] Invalid phone number:', phone)
      return false
    }
    console.log('[WhatsApp] Sending text to', to)
    const res = await fetch(WA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[WhatsApp] Send failed:', res.status, err)
      return false
    }
    return true
  } catch (err) {
    console.error('[WhatsApp] Exception:', err.message)
    return false
  }
}

async function sendWhatsAppToAdmin(message) {
  return sendWhatsAppMessage(ADMIN_PHONE, message)
}

// ── Core: approved template (works anytime, no session needed) ────────────────

async function sendTemplate(phone, templateName, parameters) {
  try {
    const to = formatPhone(phone)
    if (!to) {
      console.warn('[WhatsApp] Invalid phone number:', phone)
      return false
    }

    // Ensure all params are non-empty strings — null/undefined cause (#100) Invalid parameter
    const safeParams = parameters.map(p => (p == null || p === '' ? '-' : String(p)))

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [{ type: 'body', parameters: safeParams.map(text => ({ type: 'text', text })) }],
      },
    }
    console.log('[WhatsApp] Sending template', templateName, 'to', to, 'params:', safeParams)

    const res = await fetch(WA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[WhatsApp] Template send failed:', res.status, err, '| template:', templateName, '| params:', safeParams)
      return false
    }
    return true
  } catch (err) {
    console.error('[WhatsApp] Template exception:', err.message)
    return false
  }
}

// ── Template helpers (named wrappers used by API routes) ─────────────────────
// Parameters must exactly match the approved template variable order.

async function sendOrderConfirmed(phone, name, product, date, slot, amount) {
  return sendTemplate(phone, 'order_confirmed', [name, product, date, slot, String(amount)])
}

async function sendSubscriptionActivated(phone, name, product, startDate, slot, dailyAmount) {
  return sendTemplate(phone, 'subscription_activated', [name, product, startDate, slot, String(dailyAmount)])
}

async function sendLowBalanceAlert(phone, name, balance) {
  const balanceStr = (balance != null && balance !== '' && !isNaN(balance))
    ? String(Number(balance))
    : '0'
  return sendTemplate(phone, 'low_balance_alert', [name, balanceStr])
}

async function sendDeliveryConfirmed(phone, name, date, product) {
  return sendTemplate(phone, 'delivery_confirmed', [name, date, product])
}

async function sendSubscriptionExpiry(phone, name, endDate, product) {
  return sendTemplate(phone, 'subscription_expiry', [name, endDate, product])
}

async function sendDeliveryStopped(phone, name, balance) {
  return sendTemplate(phone, 'delivery_stopped', [name, String(balance)])
}

async function sendAdminAlert(message) {
  return sendWhatsAppToAdmin(message)
}

// Sends WA to admin phone + email to admin inbox — use for all 6 business-critical events
async function notifyAdmin(subject, text) {
  await sendWhatsAppToAdmin(text)
  try {
    const clean = text.replace(/\*/g, '').replace(/_/g, '')
    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;">
  <h2 style="color:#1a5c38;margin-bottom:16px;">${subject}</h2>
  <pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;line-height:1.6;color:#1c1c1c;background:#f5f5f5;padding:16px;border-radius:8px;">${clean}</pre>
  <p style="font-size:12px;color:#999;margin-top:16px;">Sri Krishnaa Dairy — Admin Notification</p>
</div>`,
      text,
    })
  } catch (err) {
    console.error('[AdminNotify] Email failed:', err?.message)
  }
}

// ── Notification helpers — all use approved templates ─────────────────────────
// These are the high-level functions called by API routes.

async function notifyOrderPlaced({ phone, name, size, quantity, deliveryDate, slot, amount }) {
  const product = `${size || 'Milk'} x ${quantity || 1}`
  const date = deliveryDate
    ? new Date(deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'
  const slotLabel = slot === 'morning' ? 'Morning 7-9AM' : 'Evening 5-7PM'
  await sendTemplate(phone, 'order_confirmed', [name, product, date, slotLabel, String(amount || 0)])
  await notifyAdmin(
    `New Order – ${name}`,
    `🛒 New Order Placed!\nCustomer: ${name}\nProduct: ${product}\nDate: ${date}\nSlot: ${slotLabel}\nAmount: Rs.${amount || 0}`,
  )
}

async function notifySubscriptionActivated({ phone, name, size, quantity, startDate, slot, dailyAmount }) {
  const product = `${size || 'Milk'} x ${quantity || 1}`
  const date = startDate
    ? new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'
  const slotLabel = slot === 'morning' ? 'Morning 7-9AM' : 'Evening 5-7PM'
  await sendTemplate(phone, 'subscription_activated', [name, product, date, slotLabel, String(dailyAmount || 0)])
  await notifyAdmin(
    `New Subscription – ${name}`,
    `📅 New Subscription Activated!\nCustomer: ${name}\nProduct: ${product}\nStart Date: ${date}\nSlot: ${slotLabel}\nDaily: Rs.${dailyAmount || 0}/day`,
  )
}

async function notifyOrderDelivered({ phone, name, date, product }) {
  const dateLabel = date
    ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  await sendTemplate(phone, 'delivery_confirmed', [name, dateLabel, product || 'Milk'])
}

async function notifyLowBalance({ phone, name, balance }) {
  const balanceStr = (balance != null && balance !== '' && !isNaN(balance))
    ? String(Number(balance))
    : '0'
  await sendTemplate(phone, 'low_balance_alert', [name, balanceStr])
}

async function notifySubscriptionStopped({ phone, name, balance }) {
  await sendTemplate(phone, 'delivery_stopped', [name, String(balance ?? 0)])
}

async function notifySubscriptionExpiryReminder({ phone, name, product, endDate, daysLeft }) {
  const dateLabel = endDate
    ? new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'
  // daysLeft is not a template variable — endDate and product are
  await sendTemplate(phone, 'subscription_expiry', [name, dateLabel, product || 'Milk'])
}

// ── Remaining helpers (no approved template — free-form, 24h session required) ─

async function notifyReferralCompleted({ phone, name, points }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! Congratulations!\n\n` +
    `Your referral bonus of ${points} loyalty points has been credited!\n\n` +
    `Your friend has been subscribing for 30 consecutive days.\n` +
    `Keep referring to earn more rewards!\n\n` +
    `View your rewards: srikrishnaadairy.in/dashboard\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyDepositRefund({ phone, name, refundAmount, goodBottles }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! Your deposit refund is processed!\n\n` +
    `Bottles returned: ${goodBottles} in good condition\n` +
    `Refund amount: Rs.${refundAmount}\n` +
    `Credited to: Your wallet balance\n\n` +
    `srikrishnaadairy.in/wallet\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyCodUpsell({ phone, name }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! Loved our fresh milk?\n\n` +
    `Subscribe now for daily delivery and save!\n` +
    `Farm fresh every day, automatic delivery, easy wallet-based payment.\n\n` +
    `Subscribe here: srikrishnaadairy.in/subscribe\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyOrderCancelled({ phone, name, deliveryDate, refundAmount }) {
  const dateLabel = new Date(deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  await sendWhatsAppMessage(phone,
    `Hi ${name}! Your order for ${dateLabel} has been cancelled.\n\n` +
    (refundAmount > 0 ? `Refund: Rs.${refundAmount} credited to your wallet.\n\n` : `COD order - no charge was applied.\n\n`) +
    `Place a new order: srikrishnaadairy.in/order\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyUndelivered({ phone, name }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! We couldn't confirm your milk delivery today.\n\n` +
    `You have NOT been charged.\n\n` +
    `If you did receive your milk, please contact us:\n` +
    `9980166221\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyAddonOrderConfirmed({ phone, name, dates, product, quantity, totalAmount }) {
  const dateList = dates.slice(0, 3).map(d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })).join(', ')
  const extra = dates.length > 3 ? ` (+${dates.length - 3} more)` : ''
  await sendWhatsAppMessage(phone,
    `Hi ${name}! Extra milk order confirmed!\n\n` +
    `Product: ${product} x ${quantity}\n` +
    `Date(s): ${dateList}${extra}\n` +
    `Amount: Rs.${totalAmount} deducted from wallet\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyPointsExpiring({ phone, name, points, expiryDate }) {
  const dateLabel = new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  await sendWhatsAppMessage(phone,
    `Hi ${name}! Your ${points} loyalty points expire on ${dateLabel}!\n\n` +
    `100 points = 1 free 1L milk delivery.\n` +
    `Redeem before they expire!\n\n` +
    `srikrishnaadairy.in/dashboard\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

// NOTE: Requires 'welcome_customer' template approved in Meta WhatsApp Business Manager
// Template body example: "Welcome to Sri Krishnaa Dairy! 🥛\n\nHi {{1}}, your account is ready.\nTo receive delivery updates, save our number and send 'Hi' on WhatsApp: +91 9980166221.\n\nFarm Fresh · Pure · Natural"
async function notifyWelcome(phone, name) {
  return sendTemplate(phone, 'welcome_customer', [name || 'there'])
}

export {
  sendWhatsAppMessage,
  sendWhatsAppToAdmin,
  sendTemplate,
  sendOrderConfirmed,
  sendSubscriptionActivated,
  sendLowBalanceAlert,
  sendDeliveryConfirmed,
  sendSubscriptionExpiry,
  sendDeliveryStopped,
  sendAdminAlert,
  notifyAdmin,
  notifyOrderPlaced,
  notifySubscriptionActivated,
  notifyOrderDelivered,
  notifyLowBalance,
  notifySubscriptionStopped,
  notifySubscriptionExpiryReminder,
  notifyReferralCompleted,
  notifyDepositRefund,
  notifyCodUpsell,
  notifyOrderCancelled,
  notifyUndelivered,
  notifyAddonOrderConfirmed,
  notifyPointsExpiring,
  notifyWelcome,
}
