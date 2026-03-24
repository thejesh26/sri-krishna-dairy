'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PauseSubscription() {
  const [user, setUser] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [pauseDate, setPauseDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getUser()
    // Set default pause date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setPauseDate(tomorrow.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    getSubscriptions(user.id)
  }

  const getSubscriptions = async (userId) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, products(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
    setSubscriptions(data || [])
    if (data && data.length > 0) setSelectedSub(data[0])
  }

  const isValidPauseDate = () => {
    const now = new Date()
    const selected = new Date(pauseDate)
    return (selected - now) / (1000 * 60 * 60) >= 12
  }

  const handlePause = async () => {
    if (!selectedSub) { setMessage('❌ Please select a subscription!'); return }
    if (!isValidPauseDate()) {
      setMessage('❌ Please pause at least 12 hours in advance!')
      return
    }

    const currentPaused = selectedSub.paused_dates || []

    if (currentPaused.includes(pauseDate)) {
      setMessage('❌ This date is already paused!')
      return
    }

    setLoading(true)
    setMessage('')

    const updatedPaused = [...currentPaused, pauseDate].sort()

    const { error } = await supabase
      .from('subscriptions')
      .update({ paused_dates: updatedPaused })
      .eq('id', selectedSub.id)

    if (error) {
      setMessage('❌ ' + error.message)
    } else {
      setMessage('✅ Delivery paused for ' + new Date(pauseDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))
      setSelectedSub({ ...selectedSub, paused_dates: updatedPaused })
      setSubscriptions(subscriptions.map(s =>
        s.id === selectedSub.id ? { ...s, paused_dates: updatedPaused } : s
      ))
    }
    setLoading(false)
  }

  const handleRemovePause = async (dateToRemove) => {
    setLoading(true)
    setMessage('')

    const updatedPaused = selectedSub.paused_dates.filter(d => d !== dateToRemove)

    const { error } = await supabase
      .from('subscriptions')
      .update({ paused_dates: updatedPaused })
      .eq('id', selectedSub.id)

    if (error) {
      setMessage('❌ ' + error.message)
    } else {
      setMessage('✅ Delivery resumed for ' + new Date(dateToRemove).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))
      setSelectedSub({ ...selectedSub, paused_dates: updatedPaused })
      setSubscriptions(subscriptions.map(s =>
        s.id === selectedSub.id ? { ...s, paused_dates: updatedPaused } : s
      ))
    }
    setLoading(false)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return
    setLoading(true)

    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('id', selectedSub.id)

    if (error) {
      setMessage('❌ ' + error.message)
    } else {
      setMessage('✅ Subscription cancelled successfully!')
      setTimeout(() => { window.location.href = '/dashboard' }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-green-50">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
  <a href="/" className="flex items-center gap-3">
    <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
    <div>
      <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
      <p className="text-xs text-[#d4a017] font-medium">Farm Fresh • Pure • Natural</p>
    </div>
  </a>
  <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
  Back to Dashboard
</a>
</header>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-2xl font-extrabold text-green-800 mb-2 text-center">Manage Subscription 📅</h2>
        <p className="text-center text-gray-400 text-sm mb-6">Pause, resume or cancel your delivery</p>

        {/* 12 hour notice */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-6 text-center">
          <p className="text-yellow-700 text-sm font-semibold">⏰ Pause at least 12 hours in advance</p>
          <p className="text-yellow-600 text-xs mt-1">Changes made after 8PM apply from day after tomorrow</p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 font-semibold mb-4">No active subscriptions found</p>
            <a href="/subscribe" className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition">
              Subscribe Now
            </a>
          </div>
        ) : (
          <>
            {/* Subscription Selector */}
            {subscriptions.length > 1 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 mb-5">
                <p className="text-sm font-bold text-green-800 mb-3">Select Subscription</p>
                {subscriptions.map((sub) => (
                  <button type="button" key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className={`w-full border-2 rounded-xl p-3 text-left mb-2 transition ${
                      selectedSub?.id === sub.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}>
                    <p className="font-semibold text-green-800 text-sm">{sub.products?.size} x {sub.quantity}/day</p>
                    <p className="text-xs text-gray-400">{sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'} • Started {new Date(sub.start_date).toLocaleDateString('en-IN')}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Active Subscription Info */}
            {selectedSub && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 mb-5">
                <p className="text-sm font-bold text-green-800 mb-3">Active Subscription</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-green-800">{selectedSub.products?.name} — {selectedSub.products?.size}</p>
                    <p className="text-sm text-gray-500">{selectedSub.quantity} bottle(s)/day</p>
                    <p className="text-sm text-gray-500">{selectedSub.delivery_slot === 'morning' ? '🌅 Morning 5-8AM' : '🌆 Evening 5-7PM'}</p>
                    <p className="text-sm text-gray-500">{selectedSub.delivery_mode === 'keep_bottle' ? '🏺 Keep Bottle' : '🔄 Direct Delivery'}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Active ✅</span>
                    <p className="text-green-700 font-extrabold mt-2">₹{selectedSub.products?.price * selectedSub.quantity}/day</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pause a Date */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 mb-5">
              <p className="text-sm font-bold text-green-800 mb-3">⏸️ Pause a Delivery Date</p>
              <div className="flex gap-2">
                <input type="date" value={pauseDate}
                  onChange={(e) => setPauseDate(e.target.value)}
                  min={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400" />
                <button type="button" onClick={handlePause} disabled={loading}
                  className="bg-yellow-400 text-green-900 font-bold px-4 py-2 rounded-xl hover:bg-yellow-300 transition text-sm">
                  Pause
                </button>
              </div>
            </div>

            {/* Paused Dates List */}
            {selectedSub?.paused_dates?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-yellow-100 mb-5">
                <p className="text-sm font-bold text-green-800 mb-3">📋 Paused Dates ({selectedSub.paused_dates.length})</p>
                <div className="flex flex-col gap-2">
                  {selectedSub.paused_dates.map((date) => (
                    <div key={date} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-semibold text-yellow-800 text-sm">
                          {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-yellow-600">Delivery paused ⏸️</p>
                      </div>
                      <button type="button"
                        onClick={() => handleRemovePause(date)}
                        disabled={loading}
                        className="bg-green-100 text-green-700 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-200 transition">
                        Resume ▶️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No paused dates */}
            {(!selectedSub?.paused_dates || selectedSub?.paused_dates?.length === 0) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 mb-5 text-center">
                <p className="text-gray-400 text-sm">No paused dates — delivery is active every day! ✅</p>
              </div>
            )}

            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm text-center font-medium mb-4 ${
                message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Cancel Subscription */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
              <p className="text-sm font-bold text-red-600 mb-2">⚠️ Cancel Subscription</p>
              <p className="text-xs text-gray-400 mb-3">This will stop all future deliveries. Bottle deposit will be refunded when bottles are returned.</p>
              <button type="button" onClick={handleCancelSubscription} disabled={loading}
                className="w-full border-2 border-red-400 text-red-500 py-3 rounded-full font-bold hover:bg-red-50 transition">
                Cancel Subscription
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}