'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', password: '',
    area: '', building_name: '', flat_number: '', landmark: ''
  })
  const [loading, setLoading] = useState(false)
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

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

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      phone: form.phone,
      address: fullAddress,
      apartment_name: form.building_name,
      flat_number: form.flat_number,
      area: form.area,
      landmark: form.landmark,
    })

    if (profileError) {
      setMessage('Error: ' + profileError.message)
    } else {
      setMessage('Account created successfully! Redirecting to login...')
      setTimeout(() => { window.location.href = '/login' }, 2000)
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
                <input name="password" type="password" placeholder="Min. 6 characters" required
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                  onChange={handleChange} />
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

      <div className="text-center py-4 text-xs text-gray-400 border-t border-[#e8e0d0]">
        2025 Sri Krishnaa Dairy Farms. All rights reserved.
      </div>

    </div>
  )
}