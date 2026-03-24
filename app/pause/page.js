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
    const { error } = await supabase
      .from('subscriptions').update({ paused_dates: updatedPaused }).eq('id', selectedSub.id)
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
    const { error } = await supabase
      .from('subscriptions').update({ paused_dates: updatedPaused }).eq('id', selectedSub.id)
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
    const { error } = await supabase
      .from('subscriptions').update({ is_active: false }).eq('id', selectedSub.id)
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Subscription cancelled successfully!')
      setTimeout(() => { window.location.href = '/dashboard' }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/" className="flex items-center gap-3">
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
    </div>
  )
}