import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function POST(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { reviewId, approved } = await request.json()
  if (!reviewId) return NextResponse.json({ error: 'reviewId required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('reviews')
    .update({ is_approved: approved })
    .eq('id', reviewId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
