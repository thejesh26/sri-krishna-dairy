'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function PauseSubscription() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [pauseDate, setPauseDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getUser()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setPauseDate(tomorrow.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)
    getSubscriptions(user.id)
  }

  const getSubscriptions = async (userId) => {
    const { data } = await supabase
      .from('subscriptions').select('*, products(*)')
      .eq('user_id', userId).eq('is_active', true)
    setSubscriptions(data || [])
    if (data && data.length > 0) setSelectedSub(data[0])
  }

  const isValidPauseDate = () => {
    const now = new Date()
    const selected = new Date(pauseDate)
    return (selected - now) / (1000 * 60 * 60) >= 12
  }

  const handlePause = async () => {
    if (!selectedSub) { setMessage('Please select a subscription!'); return }
    if (!isValidPauseDate()) {
      setMessage('Please pause at least 12 hours in advance!')
      return
    }
    const currentPaused = selectedSub.paused_dates || []
    if (currentPaused.includes(pauseDate)) {
      setMessage('This date is already paused!')
      return
    }
    setLoading(true)
    setMessage('')
    const updatedPaused = [...currentPaused, pauseDate].sort()
    // SECURITY: Both .eq('id') AND .eq('user_id') required — prevents IDOR where
    // an attacker supplies a different subscription UUID to modify another user's sub.
    const { error } = await supabase
      .from('subscriptions')
      .update({ paused_dates: updatedPaused })
      .eq('id', selectedSub.id)
      .eq('user_id', user.id)
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Delivery paused for ' + new Date(pauseDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))
      setSelectedSub({ ...selectedSub, paused_dates: updatedPaused })
      setSubscriptions(subscriptions.map(s => s.id === selectedSub.id ? { ...s, paused_dates: updatedPaused } : s))
    }
    setLoading(false)
  }

  const handleRemovePause = async (dateToRemove) => {
    setLoading(true)
    setMessage('')
    const updatedPaused = selectedSub.paused_dates.filter(d => d !== dateToRemove)
    // SECURITY: ownership filter applied here too
    const { error } = await supabase
      .from('subscriptions')
      .update({ paused_dates: updatedPaused })
      .eq('id', selectedSub.id)
      .eq('user_id', user.id)
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Delivery resumed for ' + new Date(dateToRemove).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))
      setSelectedSub({ ...selectedSub, paused_dates: updatedPaused })
      setSubscriptions(subscriptions.map(s => s.id === selectedSub.id ? { ...s, paused_dates: updatedPaused } : s))
    }
    setLoading(false)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return
    setLoading(true)
    // SECURITY: ownership filter prevents cancelling another user's subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('id', selectedSub.id)
      .eq('user_id', user.id)
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Subscription cancelled successfully!')
      setTimeout(() => { router.push('/dashboard') }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/dashboard" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh - Pure - Natural</p>
          </div>
        </a>
        <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Back to Dashboard
        </a>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Page Title */}
        <div className="mb-6">
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Subscription</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">Manage Plan</h2>
          <p className="text-gray-400 text-sm mt-1">Pause, resume or cancel your delivery</p>
        </div>

        {/* 12 hour notice */}
        <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="text-[#d4a017] text-sm font-semibold">Pause at least 12 hours in advance</p>
            <p className="text-yellow-600 text-xs mt-0.5">Changes made after 8PM apply from day after tomorrow</p>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-[#e8e0d0] shadow-sm">
            <div className="text-6xl mb-4">📭</div>
            <p className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">No Active Subscriptions</p>
            <p className="text-gray-400 text-sm mb-6">Subscribe to manage your deliveries</p>
            <a href="/subscribe"
              className="inline-block text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow"
              style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              Subscribe Now
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* Subscription Selector */}
            {subscriptions.length > 1 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">Select Subscription</p>
                {subscriptions.map((sub) => (
                  <button type="button" key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className={`w-full border-2 rounded-xl p-3 text-left mb-2 transition ${
                      selectedSub?.id === sub.id ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0]'
                    }`}>
                    <p className="font-semibold text-[#1c1c1c] text-sm">{sub.products?.size} x {sub.quantity}/day</p>
                    <p className="text-xs text-gray-400">{sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'} • Started {new Date(sub.start_date).toLocaleDateString('en-IN')}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Active Subscription Info */}
            {selectedSub && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Active Subscription</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-3xl flex-shrink-0">🥛</div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1c1c1c]">{selectedSub.products?.name} - {selectedSub.products?.size}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{selectedSub.quantity} bottle(s)/day</p>
                    <div className="flex gap-2 mt-2">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-medium px-2 py-0.5 rounded-full border border-[#c8e6d4]">Active</span>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                        {selectedSub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </span>
                      <span className="bg-[#f5f0e8] text-[#1c1c1c] text-xs font-medium px-2 py-0.5 rounded-full">
                        {selectedSub.delivery_mode === 'keep_bottle' ? '🏺 Keep Bottle' : '🔄 Direct'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38]">
                      Rs.{selectedSub.products?.price * selectedSub.quantity}
                    </p>
                    <p className="text-xs text-gray-400">/day</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pause a Date */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
              <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Pause a Delivery Date</p>
              <div className="flex gap-2">
                <input type="date" value={pauseDate}
                  onChange={(e) => setPauseDate(e.target.value)}
                  min={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="flex-1 border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                <button type="button" onClick={handlePause} disabled={loading}
                  className="bg-[#d4a017] text-white font-bold px-5 py-2 rounded-lg hover:bg-[#b8860b] transition text-sm">
                  Pause
                </button>
              </div>
            </div>

            {/* Paused Dates List */}
            {selectedSub?.paused_dates?.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">
                  Paused Dates ({selectedSub.paused_dates.length})
                </p>
                <div className="flex flex-col gap-2">
                  {selectedSub.paused_dates.map((date) => (
                    <div key={date} className="flex items-center justify-between bg-[#fdf6e3] border border-[#f0dfa0] rounded-lg px-4 py-3">
                      <div>
                        <p className="font-semibold text-[#1c1c1c] text-sm">
                          {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-[#d4a017]">Delivery paused</p>
                      </div>
                      <button type="button"
                        onClick={() => handleRemovePause(date)}
                        disabled={loading}
                        className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-2 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition">
                        Resume
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No paused dates */}
            {(!selectedSub?.paused_dates || selectedSub?.paused_dates?.length === 0) && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0] text-center">
                <p className="text-gray-400 text-sm">No paused dates — delivery is active every day!</p>
              </div>
            )}

            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm text-center font-medium ${
                message.includes('Error') || message.includes('Please') || message.includes('already')
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]'
              }`}>
                {message}
              </div>
            )}

            {/* Cancel Subscription */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100">
              <p className="font-[family-name:var(--font-playfair)] font-bold text-red-500 mb-2">Cancel Subscription</p>
              <p className="text-xs text-gray-400 mb-4">This will stop all future deliveries. Bottle deposit will be refunded when bottles are returned.</p>
              <button type="button" onClick={handleCancelSubscription} disabled={loading}
                className="w-full border-2 border-red-300 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition text-sm">
                Cancel Subscription
              </button>
            </div>

          </div>
        )}
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