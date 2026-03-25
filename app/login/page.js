'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [loginInput, setLoginInput] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const isPhone = (input) => /^[0-9]{10}$/.test(input)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    let emailToUse = loginInput

    // If phone number, find the associated email
    if (isPhone(loginInput)) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', loginInput)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        setMessage('No account found with this phone number.')
        setLoading(false)
        return
      }

      // Get email from auth.users using the profile id
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_email_by_id', { user_id: data.id })

      if (userError || !userData) {
        setMessage('Could not find account. Please try with email.')
        setLoading(false)
        return
      }

      emailToUse = userData
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    })

    if (error) {
      setMessage('Invalid credentials. Please check and try again.')
    } else {
      window.location.href = '/dashboard'
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
              <input
                type="password"
                placeholder="Your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
              />
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

      <div className="text-center py-4 text-xs text-gray-400 border-t border-[#e8e0d0]">
        2025 Sri Krishnaa Dairy Farms. All rights reserved.
      </div>

    </div>
  )
}