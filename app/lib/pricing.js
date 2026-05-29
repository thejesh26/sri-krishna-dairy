// ── Business constants ────────────────────────────────────────────────────────
export const BOTTLE_DEPOSIT_PER_UNIT = 200   // Rs. per bottle
export const MAX_PAUSE_DAYS_PER_MONTH = 5
export const LOW_BALANCE_DAYS_THRESHOLD = 7  // warn when balance < N × daily
export const REFERRAL_COMPLETION_DAYS = 30   // days referred user must subscribe
export const MIN_ADVANCE_HOURS = 12          // minimum hours before delivery start
export const MAX_ORDER_QUANTITY = 20

// ── Pricing calculations ──────────────────────────────────────────────────────

/**
 * Daily cost for a single subscription line.
 * Rounds to the nearest rupee (consistent with DB storage).
 */
export function calcDailyAmount(price, quantity, discountPercent = 0) {
  return Math.round(price * quantity * (1 - discountPercent / 100))
}

/**
 * Minimum wallet balance required to activate a subscription.
 * - daysToCheck: 30 for ongoing, actual days for fixed/oneday
 * - depositAmount: bottle deposit upfront (0 for direct mode)
 */
export function calcRequiredWallet(dailyAmount, daysToCheck, depositAmount = 0) {
  return dailyAmount * daysToCheck + depositAmount
}

/**
 * Bottle deposit for a subscription (0 for direct delivery mode).
 */
export function calcDeposit(deliveryMode, totalQuantity) {
  return deliveryMode === 'keep_bottle' ? BOTTLE_DEPOSIT_PER_UNIT * totalQuantity : 0
}

/**
 * Number of days between two YYYY-MM-DD date strings (end - start).
 */
export function daysBetween(startDate, endDate) {
  return Math.ceil(
    (new Date(endDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) /
    (1000 * 60 * 60 * 24)
  )
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Today's date in IST as a YYYY-MM-DD string.
 * Use this everywhere dates are compared to subscription/order dates.
 */
export function getISTDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/**
 * Tomorrow's date in IST as a YYYY-MM-DD string.
 */
export function getTomorrowISTDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
