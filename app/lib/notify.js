import { supabaseAdmin } from './db'

/**
 * Insert an admin notification. Non-throwing — never blocks the calling route.
 * type: 'new_subscription' | 'new_order' | 'wallet_request' | 'low_balance' | 'missed_delivery' | 'quality_report'
 */
export async function createAdminNotification({ type, title, body = '', link_tab = null }) {
  try {
    await supabaseAdmin.from('admin_notifications').insert({ type, title, body, link_tab })
  } catch {
    // non-blocking — ignore errors
  }
}
