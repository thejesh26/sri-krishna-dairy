import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { name, size, price, is_available } = await request.json()
    if (!name || !size || price === undefined) {
      return NextResponse.json({ error: 'name, size, and price are required.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({ name, size, price: parseFloat(price), is_available: is_available ?? true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, product: data })
  } catch (err) {
    console.error('[admin/products POST] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { product_id, name, size, price, is_available } = await request.json()
    if (!product_id) return NextResponse.json({ error: 'product_id is required.' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('products')
      .update({ name, size, price: parseFloat(price), is_available })
      .eq('id', product_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/products PATCH] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
