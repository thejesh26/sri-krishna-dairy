import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { message } = await request.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const { data: customers } = await supabaseAdmin
      .from('profiles')
      .select('phone, full_name')
      .eq('is_admin', false)
      .not('phone', 'is', null)

    let sent = 0
    for (const customer of customers || []) {
      if (customer.phone) {
        await sendWhatsAppMessage(customer.phone, message)
        sent++
      }
    }

    return NextResponse.json({ success: true, sent })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
