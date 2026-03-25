'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    full_name: '', phone: '', area: '',
    apartment_name: '', flat_number: '', landmark: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const serviceAreas = [
    'Kattigenahalli', 'Hunasamaranahalli', 'Chidananda Reddy Layout',
    'Niranthara Layout', 'Muneshwar Nagar', 'Sathanur', 'Venkatala',
    'Bagalur Cross', 'Palahalli', 'Kogilu', 'Srinivasapura',
  ]

  useEffect(() => { getUser() }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        area: profile.area || '',
        apartment_name: profile.apartment_name || '',
        flat_number: profile.flat_number || '',
        landmark: profile.landmark || '',
      })
    }
    setLoading(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const fullAddress = form.apartment_name + ', ' + form.flat_number + ', ' + form.area + ', Bangalore'

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone,
        area: form.area,
        apartment_name: form.apartment_name,
        flat_number: form.flat_number,
        landmark: form.landmark,
        address: fullAddress,
      })
      .eq('id', user.id)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <p className="text-[#1a5c38] font-semibold">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/dashboard" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium tracking-wide">FARM FRESH - PURE - NATURAL</p>
          </div>
        </a>
        <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Back to Dashboard
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg border border-[#e8e0d0] p-8 w-full max-w-xl">

          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-[#1a5c38] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">
              {form.full_name?.[0] || '?'}
            </div>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">
              My Profile
            </h2>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm mb-5 text-center font-medium ${
              message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4">

            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Full Name</label>
                <input name="full_name" value={form.full_name}
                  onChange={handleChange} required
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Phone Number</label>
                <input name="phone" value={form.phone}
                  onChange={handleChange} required maxLength={10}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
              </div>
            </div>

            {/* Email (read only) */}
            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Email Address</label>
              <input value={user?.email} disabled
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            {/* Delivery Address */}
            <div className="border-t border-[#e8e0d0] pt-4 mt-2">
              <p className="text-xs font-semibold text-[#d4a017] uppercase tracking-widest mb-4">Delivery Address</p>

              <div className="mb-4">
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Area</label>
                <select name="area" value={form.area} onChange={handleChange} required
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
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
                  <input name="apartment_name" value={form.apartment_name}
                    onChange={handleChange} required
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Flat / Door Number</label>
                  <input name="flat_number" value={form.flat_number}
                    onChange={handleChange} required
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Landmark (Optional)</label>
                <input name="landmark" value={form.landmark}
                  placeholder="Eg: Near main gate, opposite park"
                  onChange={handleChange}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="text-white py-3 rounded-lg font-bold hover:opacity-90 transition mt-2 shadow"
              style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

          </form>

          {/* Change Password Link */}
          <div className="mt-6 pt-6 border-t border-[#e8e0d0] text-center">
            <a href="/forgot-password" className="text-[#d4a017] font-semibold text-sm hover:underline">
              Change Password
            </a>
          </div>

        </div>
      </div>

      <div className="text-center py-4 text-xs text-gray-400 border-t border-[#e8e0d0]">
        2025 Sri Krishnaa Dairy Farms. All rights reserved.
      </div>

    </div>
  )
}