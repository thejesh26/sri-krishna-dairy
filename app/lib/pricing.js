// ── Business constants ────────────────────────────────────────────────────────
export const BOTTLE_DEPOSIT_PER_UNIT = 200   // Rs. per bottle
export const MAX_PAUSE_DAYS_PER_MONTH = 5
export const LOW_BALANCE_DAYS_THRESHOLD = 7  // warn when balance < N × daily
export const REFERRAL_COMPLETION_DAYS = 30   // days referred user must subscribe
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

// ── Weekly schedule helpers ───────────────────────────────────────────────────

const WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Returns the effective delivery quantity for a subscription on a given date.
 * Falls back to sub.quantity when no weekly_schedule is set (backward compatible).
 * A schedule value of 0 means no delivery that day.
 */
export function getScheduledQuantity(sub, dateStr) {
  if (!sub.weekly_schedule) return sub.quantity || 1
  const dayKey = WEEK_KEYS[new Date(dateStr + 'T00:00:00').getDay()]
  const qty = sub.weekly_schedule[dayKey]
  return (qty !== undefined && qty !== null) ? qty : (sub.quantity || 1)
}

/**
 * Average daily quantity across the weekly schedule (used for balance estimates).
 */
export function avgScheduledQuantity(sub) {
  if (!sub.weekly_schedule) return sub.quantity || 1
  const vals = Object.values(sub.weekly_schedule)
  if (!vals.length) return sub.quantity || 1
  return vals.reduce((a, b) => a + b, 0) / 7
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

// Deliveries are dispatched at ~5AM; pause requests after cutoff are too late for tomorrow's delivery.
export const PAUSE_CUTOFF_HOUR_IST = 20

// Deterministic IST hour via arithmetic — avoids Intl locale parsing quirks (some runtimes return
// "24" instead of "0" at midnight with hour:'numeric' + hour12:false).
function getISTHour() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  return new Date(Date.now() + IST_OFFSET_MS).getUTCHours()
}

export function isPastPauseCutoff() {
  return getISTHour() >= PAUSE_CUTOFF_HOUR_IST
}

/** Converts PAUSE_CUTOFF_HOUR_IST to a display string, e.g. "8PM". All user-facing cutoff strings should call this so a single constant change propagates everywhere. */
export function formatPauseCutoffTime() {
  const h = PAUSE_CUTOFF_HOUR_IST
  if (h === 0) return '12AM'
  if (h === 12) return '12PM'
  return h > 12 ? `${h - 12}PM` : `${h}AM`
}

/**
 * Earliest date that can still be paused, in IST (YYYY-MM-DD).
 * Before cutoff → tomorrow; at/after cutoff → day after tomorrow.
 * Uses pure ms arithmetic to avoid local-timezone drift from Date.setDate().
 */
export function getEarliestPauseDate() {
  const daysToAdd = isPastPauseCutoff() ? 2 : 1
  const ms = Date.now() + daysToAdd * 24 * 60 * 60 * 1000
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
