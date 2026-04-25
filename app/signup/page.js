'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'

export default function SignUp() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', password: '',
    area: '', building_name: '', flat_number: '', landmark: '', referral_code: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  const serviceAreas = [
    'Kattigenahalli',
    'Hunasamaranahalli',
    'Chidananda Reddy Layout',
    'Niranthara Layout',
    'Muneshwar Nagar',
    'Sathanur',
    'Venkatala',
    'Bagalur Cross',
    'Palahalli',
    'Kogilu',
    'Srinivasapura',
  ]

  // Password strength checks — computed on every render, no extra state needed
  const pwdChecks = {
    length:  form.password.length >= 8,
    upper:   /[A-Z]/.test(form.password),
    lower:   /[a-z]/.test(form.password),
    number:  /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/;'`~]/.test(form.password),
  }
  const isPasswordStrong = Object.values(pwdChecks).every(Boolean)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validate phone number before hitting the API
    if (!/^[0-9]{10}$/.test(form.phone)) {
      setMessage('Phone number must be exactly 10 digits.')
      setLoading(false)
      return
    }

    // Enforce strong password policy
    if (!isPasswordStrong) {
      setMessage('Please make sure your password meets all the requirements shown below.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setMessage('Error: ' + error.message)
      setLoading(false)
      return
    }

    const fullAddress = form.building_name + ', ' + form.flat_number + ', ' + form.area + ', Bangalore'
    // Generate a unique referral code for this new user
    const newReferralCode = data.user.id.replace(/-/g, '').substring(0, 8).toUpperCase()

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      phone: form.phone,
      address: fullAddress,
      apartment_name: form.building_name,
      flat_number: form.flat_number,
      area: form.area,
      landmark: form.landmark,
      referral_code: newReferralCode,
    })

    if (profileError) {
      await supabase.auth.signOut()
      setMessage('Account setup failed. Please try signing up again. (' + profileError.message + ')')
    } else {
      // If referred by someone, record the referral
      if (form.referral_code.trim()) {
        const code = form.referral_code.trim().toUpperCase()
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', code)
          .maybeSingle()
        // Validate: referrer exists AND is not the same person signing up
        if (referrer && referrer.id !== data.user.id) {
          await supabase.from('referrals').insert({
            referrer_id: referrer.id,
            referred_id: data.user.id,
            status: 'pending',
          })
          // Points awarded after 30 days of active subscription — handled by cron
        }
      }
      setMessage('Account created successfully! Redirecting to login...')
      setTimeout(() => { router.push('/login') }, 2000)
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
        <a href="/login" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Login
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg border border-[#e8e0d0] p-8 w-full max-w-xl">

          <div className="text-center mb-8">
            <a href="/">
              <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-24 w-24 rounded-full mx-auto border-4 border-[#d4a017] object-cover shadow-lg hover:opacity-90 transition" />
            </a>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mt-4">Create Account</h2>
            <p className="text-sm text-gray-400 mt-1">Join Sri Krishnaa Dairy Farms</p>
          </div>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm mb-5 text-center ${
              message.startsWith('Account') ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSignUp} className="flex flex-col gap-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Full Name</label>
                <input name="full_name" placeholder="Your full name" required
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                  onChange={handleChange} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Phone Number</label>
                <input name="phone" placeholder="10 digit mobile" required maxLength={10}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                  onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Email Address</label>
                <input name="email" type="email" placeholder="your@email.com" required
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                  onChange={handleChange} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Password</label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" required
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] pr-12"
                    onChange={handleChange} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
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
                {/* Real-time password strength indicator */}
                {form.password.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {[
                      { key: 'length',  label: '8+ characters' },
                      { key: 'upper',   label: 'Uppercase letter' },
                      { key: 'lower',   label: 'Lowercase letter' },
                      { key: 'number',  label: 'Number' },
                      { key: 'special', label: 'Special character' },
                    ].map(({ key, label }) => (
                      <span key={key} className={`text-xs flex items-center gap-1 ${pwdChecks[key] ? 'text-[#1a5c38]' : 'text-gray-400'}`}>
                        {pwdChecks[key] ? '✓' : '○'} {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#e8e0d0] pt-4 mt-1">
              <p className="text-xs font-semibold text-[#d4a017] uppercase tracking-widest mb-3">Delivery Address</p>

              <div className="mb-4">
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Select Your Area</label>
                <select name="area" required onChange={handleChange}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] text-[#1c1c1c]">
                  <option value="">-- Select your area --</option>
                  {serviceAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                  <option value="Other">Other (Near Kattigenahalli)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Building / House Name</label>
                  <input name="building_name" placeholder="Eg: Green Valley Apts" required
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                    onChange={handleChange} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Flat / Door Number</label>
                  <input name="flat_number" placeholder="Eg: A-101" required
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                    onChange={handleChange} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Landmark (Optional)</label>
                <input name="landmark" placeholder="Eg: Near main gate, opposite park"
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                  onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Referral Code (Optional)</label>
              <input name="referral_code" placeholder="Enter referral code if you have one"
                value={form.referral_code}
                onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#d4a017] bg-[#fdfbf7]" />
              <p className="text-xs text-gray-400 mt-1">🎁 Both you and your friend earn 100 reward points after you subscribe for 30 days!</p>
            </div>

            <button type="submit" disabled={loading}
              className="text-white py-3 rounded-lg font-bold hover:opacity-90 transition mt-2 shadow"
              style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

          </form>

          <div className="flex items-center gap-3 my-5">
            <hr className="flex-1 border-[#e8e0d0]" />
            <span className="text-xs text-gray-400">OR</span>
            <hr className="flex-1 border-[#e8e0d0]" />
          </div>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="text-[#1a5c38] font-semibold hover:underline">Login</a>
          </p>

        </div>
      </div>

      <Footer variant="public" />

    </div>
  )
}