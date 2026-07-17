import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'

// Returns a safe subset of app_settings that customer-facing pages need.
// No auth required — only non-sensitive UI config is exposed here.
const PUBLIC_KEYS = ['pluxee_qr_url']

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS)

    const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]))
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({})
  }
}
