'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'

export default function Login() {
  const router = useRouter()
  const [loginInput, setLoginInput] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const isPhone = (input) => /^[0-9]{10}$/.test(input)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isPhone(loginInput)) {
        // Secure phone login: email lookup stays server-side, preventing enumeration
        const res = await fetch('/api/auth/phone-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: loginInput, password }),
        })
        const result = await res.json()

        if (!res.ok || !result.session) {
          setMessage(result.error || 'Invalid credentials. Please check and try again.')
          setLoading(false)
          return
        }

        // Set the session returned from server into the local Supabase client
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })
      } else {
        // Email login: standard Supabase client-side flow
        const { error } = await supabase.auth.signInWithPassword({
          email: loginInput,
          password,
        })
        if (error) {
          setMessage('Invalid credentials. Please check and try again.')
          setLoading(false)
          return
        }
      }

      // Check if this user needs to update their password
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.user_metadata?.requires_password_update) {
        router.push('/reset-password?reason=weak_password')
        return
      }

      router.push('/dashboard')
    } catch {
      setMessage('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0]">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium tracking-wide">FARM FRESH - PURE - NATURAL</p>
          </div>
        </a>
        <a href="/signup" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Sign Up
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg border border-[#e8e0d0] p-8 w-full max-w-md">

          <div className="text-center mb-8">
            <a href="/">
              <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-24 w-24 rounded-full mx-auto border-4 border-[#d4a017] object-cover shadow-lg hover:opacity-90 transition" />
            </a>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mt-4">Welcome Back!</h2>
            <p className="text-sm text-gray-400 mt-1">Login to Sri Krishnaa Dairy Farms</p>
          </div>

          {message && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5 text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">
                Email or Phone Number
              </label>
              <input
                type="text"
                placeholder="Email address or 10-digit phone"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
              />
              <p className="text-xs text-gray-400 mt-1">
                {isPhone(loginInput) ? '📱 Logging in with phone number' : '📧 Logging in with email'}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1a5c38] transition">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="text-white py-3 rounded-lg font-bold hover:opacity-90 transition mt-2 shadow"
              style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {loading ? 'Logging in...' : 'Login'}
            </button>

          </form>

          <div className="flex items-center gap-3 my-5">
            <hr className="flex-1 border-[#e8e0d0]" />
            <span className="text-xs text-gray-400">OR</span>
            <hr className="flex-1 border-[#e8e0d0]" />
          </div>

          <p className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <a href="/signup" className="text-[#1a5c38] font-semibold hover:underline">Sign Up Free</a>
          </p>
          <p className="text-center text-sm text-gray-400 mt-2">
            <a href="/forgot-password" className="text-[#d4a017] font-semibold hover:underline">Forgot Password?</a>
          </p>

        </div>
      </div>

      <Footer variant="app" />

    </div>
  )
}