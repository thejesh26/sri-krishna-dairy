'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
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

    let emailToUse = loginInput

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

      {/* Footer */}
      <footer className="bg-[#0d1f13] text-white px-6 pt-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 pb-12 border-b border-gray-800">

            {/* Brand */}
            <div className="sm:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/Logo.jpg" alt="Logo" className="h-14 w-14 rounded-full object-cover border-2 border-[#d4a017]" />
                <div>
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-lg leading-tight">Sri Krishnaa<br />Dairy Farms</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Pure, fresh cow milk delivered straight from our farm to your doorstep every morning.
              </p>
              <div className="flex gap-3">
                <a href="https://wa.me/918553666002" target="_blank"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-semibold px-4 py-2 rounded transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
                <a href="tel:8553666002"
                  className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded transition">
                  📞 Call Us
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Quick Links</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="/dashboard" className="hover:text-[#d4a017] transition">Dashboard</a></li>
                <li><a href="/subscribe" className="hover:text-[#d4a017] transition">Subscribe</a></li>
                <li><a href="/order" className="hover:text-[#d4a017] transition">Order Now</a></li>
                <li><a href="/wallet" className="hover:text-[#d4a017] transition">Wallet</a></li>
                <li><a href="/profile" className="hover:text-[#d4a017] transition">My Profile</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Legal</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="/privacy-policy" className="hover:text-[#d4a017] transition">Privacy Policy</a></li>
                <li><a href="/terms-of-service" className="hover:text-[#d4a017] transition">Terms of Service</a></li>
                <li><a href="/refund-policy" className="hover:text-[#d4a017] transition">Refund Policy</a></li>
                <li><a href="/health-disclaimer" className="hover:text-[#d4a017] transition">Health Disclaimer</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Contact Us</p>
              <ul className="flex flex-col gap-4 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📞</span>
                  <a href="tel:8553666002" className="hover:text-white transition">8553666002</a>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <a href="https://wa.me/918553666002" target="_blank" className="hover:text-white transition">WhatsApp Us</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📍</span>
                  <span>Kattigenahalli,<br />Bangalore, Karnataka</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">🕐</span>
                  <span>Morning: 5AM – 8AM<br />Evening: 5PM – 7PM</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Middle Footer */}
          <div className="py-8 border-b border-gray-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { icon: '🌿', text: 'No Preservatives' },
                { icon: '🐄', text: 'Farm Direct' },
                { icon: '✅', text: 'Quality Tested' },
                { icon: '💚', text: 'Ethically Farmed' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center justify-center gap-2">
                  <span>{icon}</span>
                  <span className="text-gray-400 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
            <div className="text-center sm:text-left">
              <p>© 2025 Sri Krishnaa Dairy Farms. All rights reserved.</p>
              <p className="text-gray-600 mt-0.5">FSSAI Lic. No: <span className="text-gray-400">21225008004544</span></p>
            </div>
            <p className="text-gray-600">Made with ❤️ in Bangalore</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/privacy-policy" className="hover:text-gray-300 transition">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-gray-300 transition">Terms of Service</a>
              <a href="/refund-policy" className="hover:text-gray-300 transition">Refund Policy</a>
              <a href="/health-disclaimer" className="hover:text-gray-300 transition">Health Disclaimer</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}