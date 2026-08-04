import { NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase-server'

// Public — used by the signup and profile forms to populate the apartment dropdown.
export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('apartments')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data || [])
}
