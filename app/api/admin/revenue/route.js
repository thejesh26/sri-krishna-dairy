import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    // Use IST midnight as cutoff to avoid UTC offset dropping early-morning IST transactions
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30'
    const monthStartIST = new Date()
    monthStartIST.setDate(1)
    const monthStartStr = monthStartIST.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30'

    const [{ data: todayTx }, { data: monthTx }] = await Promise.all([
      supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'debit')
        .like('description', 'Daily subscription%')
        .gte('created_at', todayIST),
      supabaseAdmin
        .from('wallet_transactions')
        .select('amount')
        .eq('type', 'debit')
        .like('description', 'Daily subscription%')
        .gte('created_at', monthStartStr),
    ])

    const todaySubRevenue = (todayTx || []).reduce((s, t) => s + t.amount, 0)
    const monthSubRevenue = (monthTx || []).reduce((s, t) => s + t.amount, 0)

    return NextResponse.json({ todaySubRevenue, monthSubRevenue })
  } catch (err) {
    console.error('[admin/revenue] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
