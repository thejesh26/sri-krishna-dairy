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

            {/* Explore */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Explore</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="/#how-it-works" className="hover:text-[#d4a017] transition">How It Works</a></li>
                <li><a href="/#why-us" className="hover:text-[#d4a017] transition">Why Choose Us</a></li>
                <li><a href="/#faq" className="hover:text-[#d4a017] transition">FAQ</a></li>
                <li><a href="/#products" className="hover:text-[#d4a017] transition">Our Products</a></li>
                <li><a href="/#contact" className="hover:text-[#d4a017] transition">Contact Us</a></li>
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