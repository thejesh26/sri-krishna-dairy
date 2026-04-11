const WA_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
const ADMIN_PHONE = '919980166221'

/**
 * Format a raw Indian phone number to WhatsApp-ready format.
 * Strips spaces/dashes, strips a leading 0 or +91, then prepends 91.
 */
function formatPhone(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/[\s\-+]/g, '')
  // Already has country code
  if (digits.startsWith('91') && digits.length === 12) return digits
  // Strip leading 0
  const local = digits.startsWith('0') ? digits.slice(1) : digits
  if (local.length !== 10) return null
  return '91' + local
}

/**
 * Core send function. Returns true on success, false on failure.
 * Never throws — callers should not need try/catch.
 */
async function sendWhatsAppMessage(phone, message) {
  try {
    const to = formatPhone(phone)
    if (!to) {
      console.warn('[WhatsApp] Invalid phone number:', phone)
      return false
    }

    const res = await fetch(WA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
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

/**
 * Send a WhatsApp message to the admin number.
 */
async function sendWhatsAppToAdmin(message) {
  return sendWhatsAppMessage(ADMIN_PHONE, message)
}

// ── Notification helpers ──────────────────────────────────────────────────────

async function notifyOrderPlaced({ phone, name, size, quantity, deliveryDate, slot, amount }) {
  const slotLabel = slot === 'morning' ? '7AM – 9AM' : 'Evening (5PM – 7PM)'
  const dateLabel = new Date(deliveryDate).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  await sendWhatsAppMessage(phone,
    `Hi ${name}! 🥛 Your milk order has been confirmed!\n\n` +
    `Product: ${size} x ${quantity}\n` +
    `Delivery: ${dateLabel}\n` +
    `Slot: ${slotLabel}\n` +
    `Amount: Rs.${amount}\n\n` +
    `Thank you for choosing Sri Krishnaa Dairy! 🙏\n` +
    `srikrishnaadairy.in`
  )
  await sendWhatsAppToAdmin(
    `New order from ${name} - ${size} x ${quantity} for ${deliveryDate}`
  )
}

async function notifySubscriptionActivated({ phone, name, size, quantity, startDate, slot, dailyAmount }) {
  const slotLabel = slot === 'morning' ? '7AM – 9AM' : 'Evening (5PM – 7PM)'
  const dateLabel = new Date(startDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  await sendWhatsAppMessage(phone,
    `Hi ${name}! 🥛 Your daily milk subscription is active!\n\n` +
    `Product: ${size} x ${quantity} per day\n` +
    `Starts: ${dateLabel}\n` +
    `Slot: ${slotLabel}\n` +
    `Daily amount: Rs.${dailyAmount}\n\n` +
    `Fresh milk delivered daily to your doorstep! 🏠\n` +
    `srikrishnaadairy.in`
  )
  await sendWhatsAppToAdmin(
    `New subscription from ${name} - ${size} x ${quantity}/day`
  )
}

async function notifyOrderDelivered({ phone, name }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! ✅ Your milk has been delivered!\n\n` +
    `Enjoy your fresh milk! 🥛\n` +
    `Have a great day! ☀️\n\n` +
    `- Sri Krishnaa Dairy Team\n` +
    `srikrishnaadairy.in`
  )
}

async function notifyLowBalance({ phone, name, balance }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! ⚠️ Your wallet balance is low!\n\n` +
    `Current balance: Rs.${balance}\n` +
    `Minimum required: Rs.300\n\n` +
    `Please recharge to continue daily delivery.\n` +
    `Recharge here: srikrishnaadairy.in/wallet\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifySubscriptionStopped({ phone, name, balance }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! 🛑 Your milk delivery has been paused.\n\n` +
    `Reason: Insufficient wallet balance\n` +
    `Current balance: Rs.${balance}\n\n` +
    `Please recharge your wallet to resume delivery:\n` +
    `srikrishnaadairy.in/wallet\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

export {
  sendWhatsAppMessage,
  sendWhatsAppToAdmin,
  notifyOrderPlaced,
  notifySubscriptionActivated,
  notifyOrderDelivered,
  notifyLowBalance,
  notifySubscriptionStopped,
}
