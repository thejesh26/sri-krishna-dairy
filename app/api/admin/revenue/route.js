import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data } = await supabaseAdmin
    .from('wallet_transactions')
    .select('amount')
    .eq('type', 'debit')
    .like('description', 'Daily subscription%')
    .gte('created_at', monthStart)

  const total = (data || []).reduce((sum, t) => sum + (t.amount || 0), 0)
  return NextResponse.json({ monthlySubscriptionRevenue: total })
}
