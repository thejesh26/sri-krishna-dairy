'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function HomeHeader() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, is_delivery')
          .eq('id', session.user.id)
          .single()

        if (profile?.is_admin) {
          router.push('/admin')
          return
        } else if (profile?.is_delivery) {
          router.push('/delivery')
          return
        }
      }
    }
    checkUser()
  }, [])

  return (
    <header className="bg-[#fdfbf7] px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-[#e8e0d0]">
      <a href="/" onClick={(e) => { if (window.location.pathname === '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) } }} className="flex items-center gap-2">
        <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-cover shadow border-2 border-[#d4a017]" />
        <div>
          <h1 className="text-sm sm:text-lg font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)] leading-tight">Sri Krishnaa Dairy</h1>
          <p className="text-xs text-[#d4a017] font-medium tracking-wide hidden sm:block">FARM FRESH • PURE • NATURAL</p>
        </div>
      </a>
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#1c1c1c]">
        <a href="#about" className="hover:text-[#1a5c38] transition">About</a>
        <a href="#how-it-works" className="hover:text-[#1a5c38] transition">How It Works</a>
        <a href="#products" className="hover:text-[#1a5c38] transition">Products</a>
        <a href="#contact" className="hover:text-[#1a5c38] transition">Contact</a>
      </nav>
      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <Link href="/dashboard" className="bg-[#1a5c38] text-white font-semibold px-3 py-1.5 rounded text-xs sm:text-sm sm:px-4 sm:py-2 hover:bg-[#14472c] transition whitespace-nowrap">Dashboard</Link>
        ) : (
          <>
            <Link href="/login" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-3 py-1.5 rounded text-xs sm:text-sm sm:px-4 sm:py-2 hover:bg-[#1a5c38] hover:text-white transition whitespace-nowrap">Login</Link>
            <Link href="/signup" className="hidden sm:inline-block bg-[#1a5c38] text-white font-semibold px-3 py-1.5 rounded text-xs sm:text-sm sm:px-4 sm:py-2 hover:bg-[#14472c] transition whitespace-nowrap">Sign Up</Link>
          </>
        )}
        <button type="button" onClick={() => setMobileMenu(o => !o)} aria-label="Toggle menu" aria-expanded={mobileMenu}
          className="md:hidden p-2 text-[#1a5c38]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>
      {mobileMenu && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-[#fdfbf7] border-b border-[#e8e0d0] shadow-md flex flex-col px-4 py-2 text-sm font-medium text-[#1c1c1c]">
          {[['#about','About'],['#how-it-works','How It Works'],['#products','Products'],['#faq','FAQ'],['#contact','Contact']].map(([href,label]) => (
            <a key={href} href={href} onClick={() => setMobileMenu(false)} className="py-2.5 border-b border-[#e8e0d0] last:border-0 hover:text-[#1a5c38]">{label}</a>
          ))}
          {!isLoggedIn && <Link href="/signup" onClick={() => setMobileMenu(false)} className="mt-2 mb-1 bg-[#1a5c38] text-white text-center font-semibold py-2.5 rounded">Sign Up</Link>}
        </nav>
      )}
    </header>
  )
}
