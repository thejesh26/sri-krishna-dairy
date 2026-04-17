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

async function notifySubscriptionExpiryReminder({ phone, name, product, endDate, daysLeft }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! ⏰ Your milk subscription ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!\n\n` +
    `Product: ${product}\n` +
    `End date: ${endDate}\n\n` +
    `Renew now to keep enjoying fresh milk every day:\n` +
    `srikrishnaadairy.in/subscribe\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyReferralCompleted({ phone, name, points }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! 🎉 Congratulations!\n\n` +
    `Your referral bonus of ${points} loyalty points has been credited!\n\n` +
    `Your friend has been subscribing for 30 consecutive days.\n` +
    `Keep referring to earn more rewards!\n\n` +
    `View your rewards: srikrishnaadairy.in/dashboard\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyDepositRefund({ phone, name, refundAmount, goodBottles }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! 💰 Your deposit refund is processed!\n\n` +
    `Bottles returned: ${goodBottles} in good condition\n` +
    `Refund amount: Rs.${refundAmount}\n` +
    `Credited to: Your wallet balance\n\n` +
    `The refund is now available in your wallet.\n` +
    `srikrishnaadairy.in/wallet\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyCodUpsell({ phone, name }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! 🥛 Loved our fresh milk?\n\n` +
    `Subscribe now for daily delivery and save!\n` +
    `✅ Farm fresh every day\n` +
    `✅ Automatic daily delivery\n` +
    `✅ Easy wallet-based payment\n\n` +
    `Subscribe here: srikrishnaadairy.in/subscribe\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyOrderCancelled({ phone, name, deliveryDate, refundAmount }) {
  const dateLabel = new Date(deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  await sendWhatsAppMessage(phone,
    `Hi ${name}! Your order for ${dateLabel} has been cancelled.\n\n` +
    (refundAmount > 0 ? `Refund: Rs.${refundAmount} credited to your wallet.\n\n` : `COD order — no charge was applied.\n\n`) +
    `Place a new order: srikrishnaadairy.in/order\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyUndelivered({ phone, name }) {
  await sendWhatsAppMessage(phone,
    `Hi ${name}! ℹ️ We couldn't confirm your milk delivery today.\n\n` +
    `You have NOT been charged.\n\n` +
    `If you did receive your milk, please contact us:\n` +
    `📞 9980166221\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyAddonOrderConfirmed({ phone, name, dates, product, quantity, totalAmount }) {
  const dateList = dates.slice(0, 3).map(d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })).join(', ')
  const extra = dates.length > 3 ? ` (+${dates.length - 3} more)` : ''
  await sendWhatsAppMessage(phone,
    `Hi ${name}! 🥛 Extra milk order confirmed!\n\n` +
    `Product: ${product} x ${quantity}\n` +
    `Date(s): ${dateList}${extra}\n` +
    `Amount: Rs.${totalAmount} deducted from wallet\n\n` +
    `- Sri Krishnaa Dairy Team`
  )
}

async function notifyPointsExpiring({ phone, name, points, expiryDate }) {
  const dateLabel = new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  await sendWhatsAppMessage(phone,
    `Hi ${name}! ⏰ Your ${points} loyalty points expire on ${dateLabel}!\n\n` +
    `100 points = 1 free 1L milk delivery.\n` +
    `Redeem before they expire!\n\n` +
    `srikrishnaadairy.in/dashboard\n` +
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
  notifySubscriptionExpiryReminder,
  notifyReferralCompleted,
  notifyDepositRefund,
  notifyCodUpsell,
  notifyOrderCancelled,
  notifyUndelivered,
  notifyAddonOrderConfirmed,
  notifyPointsExpiring,
}
