import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { subscription } = await request.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('id', user.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    await supabaseAdmin.from('profiles').update({ push_subscription: null }).eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
