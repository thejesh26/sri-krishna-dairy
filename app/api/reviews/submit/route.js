import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rating, review } = await request.json()
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }

  // Check if already reviewed
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('has_reviewed')
    .eq('id', user.id)
    .single()

  if (existing?.has_reviewed) {
    return NextResponse.json({ error: 'You have already submitted a review.' }, { status: 400 })
  }

  const { error: insertError } = await supabaseAdmin
    .from('reviews')
    .insert({ user_id: user.id, rating, review: review?.trim() || null })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Mark profile as reviewed
  await supabaseAdmin.from('profiles').update({ has_reviewed: true }).eq('id', user.id)

  return NextResponse.json({ success: true })
}
