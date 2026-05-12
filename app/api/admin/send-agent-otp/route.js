import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'OTP not required. Agent uses email login.' }, { status: 200 })
}
