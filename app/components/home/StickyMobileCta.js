'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function StickyMobileCta() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setShow(!session))
  }, [])

  if (!show) return null

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e8e0d0] px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <Link href="/signup" className="block w-full bg-[#1a5c38] text-white text-center font-bold py-3 rounded-lg">
        Start Your 3-Day Free Trial →
      </Link>
    </div>
  )
}
