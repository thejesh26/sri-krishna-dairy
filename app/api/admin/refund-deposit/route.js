import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    // Authenticate + verify admin
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { user_id, amount } = await request.json()
    if (!user_id || !amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'user_id and positive amount are required.' }, { status: 400 })
    }

    // Fetch current wallet state
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('id, deposit_balance')
      .eq('user_id', user_id)
      .maybeSingle()

    if (!wallet || (wallet.deposit_balance || 0) < amount) {
      return NextResponse.json({ error: 'Insufficient deposit balance.' }, { status: 400 })
    }

    const newDeposit = (wallet.deposit_balance || 0) - amount

    // Zero out (or reduce) deposit balance
    await supabaseAdmin
      .from('wallet')
      .update({ deposit_balance: newDeposit })
      .eq('user_id', user_id)

    // Record the refund as a transaction for audit trail
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id,
      amount,
      type: 'deposit_refund',
      description: `Bottle deposit refund by admin (Rs.${amount})`,
    })

    return NextResponse.json({ success: true, new_deposit_balance: newDeposit })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
