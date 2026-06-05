import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const monthStartIST = new Date()
  monthStartIST.setDate(1)
  const monthStartStr = monthStartIST.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  const { data: todayTx } = await supabaseAdmin
    .from('wallet_transactions')
    .select('amount')
    .eq('type', 'debit')
    .like('description', 'Daily subscription%')
    .gte('created_at', todayIST)

  const { data: monthTx } = await supabaseAdmin
    .from('wallet_transactions')
    .select('amount')
    .eq('type', 'debit')
    .like('description', 'Daily subscription%')
    .gte('created_at', monthStartStr)

  const todaySubRevenue = (todayTx || []).reduce((s, t) => s + t.amount, 0)
  const monthSubRevenue = (monthTx || []).reduce((s, t) => s + t.amount, 0)

  return NextResponse.json({ todaySubRevenue, monthSubRevenue })
}
