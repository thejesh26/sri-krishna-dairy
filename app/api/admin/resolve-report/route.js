import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

const ALLOWED_TABLES = ['customer_suggestions', 'delivery_issues']

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { table, id } = await request.json()
    if (!table || !id) return NextResponse.json({ error: 'table and id are required.' }, { status: 400 })
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Invalid table.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from(table).update({ status: 'resolved' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/resolve-report] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
