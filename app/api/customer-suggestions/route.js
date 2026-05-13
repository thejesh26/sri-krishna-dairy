import { NextResponse } from 'next/server'
import { createServerClient } from '../../lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { message, type } = await request.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message required.' }, { status: 400 })
    await supabaseAdmin.from('customer_suggestions').insert({
      user_id: user.id,
      message: message.trim(),
      type: type || 'suggestion',
      status: 'open',
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
