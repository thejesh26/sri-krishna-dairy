import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { data: wallets, error } = await supabaseAdmin.from('wallet').select('user_id, balance, deposit_balance')
    if (error) {
      console.error('[AdminWallets] Fetch error:', error.message, '| SERVICE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[AdminWallets] Fetched', wallets?.length || 0, 'wallets | SERVICE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ wallets: wallets || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
