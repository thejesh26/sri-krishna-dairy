/**
 * Server-side push notification sender.
 * Uses the Web Push protocol with VAPID authentication.
 *
 * Required env vars (generate at https://vapidkeys.com or via web-push CLI):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:hello@srikrishnaadairy.in
 *
 * Install web-push: npm install web-push
 *
 * To generate keys:
 *   npx web-push generate-vapid-keys
 */

let webpush = null

function getWebPush() {
  if (!webpush) {
    try {
      webpush = require('web-push')
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:hello@srikrishnaadairy.in',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      )
    } catch {
      return null
    }
  }
  return webpush
}

/**
 * Send a push notification to a single subscription.
 * @param {object} pushSubscription - The PushSubscription JSON from the browser
 * @param {{ title: string, body: string, url?: string }} payload
 */
export async function sendPushNotification(pushSubscription, payload) {
  const wp = getWebPush()
  if (!wp || !pushSubscription?.endpoint) return

  try {
    await wp.sendNotification(pushSubscription, JSON.stringify(payload))
  } catch (err) {
    // 410 Gone = subscription expired/revoked — caller should clear it
    if (err.statusCode === 410) throw new Error('SUBSCRIPTION_EXPIRED')
    // Other errors are non-fatal — log and continue
    console.error('[push] send failed:', err.message)
  }
}

/**
 * Send a push notification to a user by fetching their stored subscription from Supabase.
 * @param {object} supabase - server supabase client
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string }} payload
 */
export async function sendPushToUser(supabase, userId, payload) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('push_subscription')
    .eq('id', userId)
    .single()

  if (!profile?.push_subscription) return

  try {
    await sendPushNotification(profile.push_subscription, payload)
  } catch (err) {
    if (err.message === 'SUBSCRIPTION_EXPIRED') {
      // Clear stale subscription
      await supabase.from('profiles').update({ push_subscription: null }).eq('id', userId)
    }
  }
}
