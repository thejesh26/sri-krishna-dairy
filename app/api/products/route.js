import { NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, size, price, description, is_available')
    .eq('is_available', true)
    .order('price')

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data || [])
}
