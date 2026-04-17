'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'

export default function PauseSubscription() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [pauseDate, setPauseDate] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [pauseMode, setPauseMode] = useState('single') // 'single' | 'range'
  const [loading, setLoading] = useState(false)
  const [newQuantity, setNewQuantity] = useState('')
  const [qtyLoading, setQtyLoading] = useState(false)
  const [availableProducts, setAvailableProducts] = useState([])
  const [changePlanLoading, setChangePlanLoading] = useState(false)
  const { showSuccess, showError, showInfo } = useToast()

  useEffect(() => {
    getUser()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    setPauseDate(tomorrowStr)
    setRangeStart(tomorrowStr)
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    setRangeEnd(dayAfter.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)
    getSubscriptions(user.id)
    getProducts()
  }

  const getSubscriptions = async (userId) => {
    const { data } = await supabase
      .from('subscriptions').select('*, products(*), pause_days_used_this_month')
      .eq('user_id', userId).eq('is_active', true)
    setSubscriptions(data || [])
    if (data && data.length > 0) setSelectedSub(data[0])
  }

  const getProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, size, price')
      .eq('is_available', true)
      .order('price', { ascending: true })
    setAvailableProducts(data || [])
  }

  const isValidPauseDate = () => {
    const now = new Date()
    const selected = new Date(pauseDate)
    return (selected - now) / (1000 * 60 * 60) >= 12
  }

  const handlePause = async () => {
    if (!selectedSub) { showError('Please select a subscription!'); return }
    if (!isValidPauseDate()) {
      showError('Please pause at least 12 hours in advance!')
      return
    }
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ subscription_id: selectedSub.id, pause_date: pauseDate }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Could not pause delivery.')
    } else {
      const remaining = result.pause_days_remaining ?? null
      showSuccess(
        'Delivery paused for ' +
        new Date(pauseDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) +
        (remaining !== null ? ` · ${remaining} pause day${remaining !== 1 ? 's' : ''} remaining this month` : '')
      )
      const updated = { ...selectedSub, paused_dates: result.paused_dates, pause_days_used_this_month: result.pause_days_used_this_month ?? selectedSub.pause_days_used_this_month }
      setSelectedSub(updated)
      setSubscriptions(subscriptions.map(s => s.id === selectedSub.id ? updated : s))
    }
    setLoading(false)
  }

  const handleRangePause = async () => {
    if (!selectedSub) { showError('Please select a subscription!'); return }
    if (!rangeStart || !rangeEnd) { showError('Please select both start and end dates.'); return }
    if (rangeEnd < rangeStart) { showError('End date must be after start date.'); return }

    // Generate all dates in range
    const dates = []
    const current = new Date(rangeStart)
    const end = new Date(rangeEnd)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    if (dates.length > 30) { showError('Range cannot exceed 30 days.'); return }

    // Validate first date is 12h in advance
    if ((new Date(rangeStart) - new Date()) / (1000 * 60 * 60) < 12) {
      showError('Start date must be at least 12 hours from now!')
      return
    }

    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    // Pause each date sequentially using the existing API
    let updatedDates = selectedSub.paused_dates || []
    let errorOccurred = false
    for (const date of dates) {
      if (updatedDates.includes(date)) continue
      const res = await fetch('/api/subscriptions/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subscription_id: selectedSub.id, pause_date: date }),
      })
      const result = await res.json()
      if (res.ok) {
        updatedDates = result.paused_dates
      } else if (result.error !== 'This date is already paused.') {
        showError('Error on ' + date + ': ' + result.error)
        errorOccurred = true
        break
      }
    }

    if (!errorOccurred) {
      showSuccess(`Paused ${dates.length} day(s): ${rangeStart} to ${rangeEnd}`)
      const updated = { ...selectedSub, paused_dates: updatedDates }
      setSelectedSub(updated)
      setSubscriptions(subscriptions.map(s => s.id === selectedSub.id ? updated : s))
    }
    setLoading(false)
  }

  const handleRemovePause = async (dateToRemove) => {
    setLoading(true)
    const updatedPaused = selectedSub.paused_dates.filter(d => d !== dateToRemove)
    // SECURITY: ownership filter applied here too
    const { error } = await supabase
      .from('subscriptions')
      .update({ paused_dates: updatedPaused })
      .eq('id', selectedSub.id)
      .eq('user_id', user.id)
    if (error) {
      showError(error.message)
    } else {
      showSuccess('Delivery resumed for ' + new Date(dateToRemove).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))
      setSelectedSub({ ...selectedSub, paused_dates: updatedPaused })
      setSubscriptions(subscriptions.map(s => s.id === selectedSub.id ? { ...s, paused_dates: updatedPaused } : s))
    }
    setLoading(false)
  }

  const handleQuantityChange = async () => {
    const qty = Number(newQuantity)
    if (!qty || qty < 1 || qty > 20) { showError('Enter a quantity between 1 and 20.'); return }
    if (qty === selectedSub.quantity) { showInfo('Same quantity as current.'); return }
    setQtyLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/update-quantity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ subscription_id: selectedSub.id, quantity: qty }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Could not update quantity.')
    } else {
      showSuccess(`Updated to ${qty} bottle(s)/day — ₹${result.new_daily_cost}/day`)
      const updated = { ...selectedSub, quantity: qty }
      setSelectedSub(updated)
      setSubscriptions(subscriptions.map(s => s.id === selectedSub.id ? updated : s))
      setNewQuantity('')
    }
    setQtyLoading(false)
  }

  const handleChangePlan = async (newProductId) => {
    if (!selectedSub) return
    setChangePlanLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/change-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ subscription_id: selectedSub.id, new_product_id: newProductId }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Could not change plan.')
    } else {
      showSuccess(`Plan changed to ${result.new_product} — ₹${result.new_daily_cost}/day from next delivery`)
      const newProduct = availableProducts.find(p => p.id === newProductId)
      const updated = { ...selectedSub, product_id: newProductId, products: newProduct }
      setSelectedSub(updated)
      setSubscriptions(subscriptions.map(s => s.id === selectedSub.id ? updated : s))
    }
    setChangePlanLoading(false)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ subscription_id: selectedSub.id }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Could not cancel subscription.')
    } else {
      showSuccess('Subscription cancelled successfully!')
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
        <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="text-[#d4a017] text-sm font-semibold">Pause at least 12 hours in advance</p>
            <p className="text-yellow-600 text-xs mt-0.5">Changes made after 8PM apply from day after tomorrow</p>
          </div>
        </div>

        {/* Wallet not charged on paused days */}
        <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-[#1a5c38] text-sm font-semibold">Your wallet will not be charged on paused days</p>
            <p className="text-[#1a5c38] text-xs mt-0.5 opacity-80">Maximum 5 pause days per month</p>
          </div>
        </div>

        {/* Pause days used this month */}
        {selectedSub && (() => {
          const used = selectedSub.pause_days_used_this_month || 0
          const remaining = Math.max(0, 5 - used)
          return (
            <div className={`rounded-xl p-4 mb-4 ${remaining === 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-[#e8e0d0]'}`}>
              <div className="flex justify-between items-center mb-2">
                <p className={`text-sm font-semibold ${remaining === 0 ? 'text-red-700' : 'text-[#1c1c1c]'}`}>
                  Pause days this month
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${remaining === 0 ? 'bg-red-100 text-red-600' : 'bg-[#f0faf4] text-[#1a5c38]'}`}>
                  {remaining} remaining
                </span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`flex-1 h-2 rounded-full ${i <= used ? 'bg-[#d4a017]' : 'bg-gray-100'}`}></div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{used}/5 pause days used this month</p>
              {remaining === 0 && <p className="text-xs text-red-600 font-semibold mt-1">No pause days remaining. Resets on the 1st of next month.</p>}
            </div>
          )
        })()}

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

            {/* Change Quantity */}
            {selectedSub && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <p className="text-sm font-bold text-[#1c1c1c] mb-1 font-[family-name:var(--font-playfair)]">Change Quantity</p>
                <p className="text-xs text-gray-400 mb-4">Currently: {selectedSub.quantity} bottle(s)/day</p>
                <div className="flex gap-2">
                  <div className="flex items-center border border-[#e8e0d0] rounded-lg overflow-hidden flex-1">
                    <button onClick={() => setNewQuantity(q => String(Math.max(1, Number(q || selectedSub.quantity) - 1)))}
                      className="px-4 py-3 text-[#1a5c38] font-bold text-lg hover:bg-[#f0faf4] transition">−</button>
                    <input type="number" min="1" max="20"
                      value={newQuantity || selectedSub.quantity}
                      onChange={e => setNewQuantity(e.target.value)}
                      className="flex-1 text-center text-sm font-semibold border-0 focus:outline-none bg-transparent" />
                    <button onClick={() => setNewQuantity(q => String(Math.min(20, Number(q || selectedSub.quantity) + 1)))}
                      className="px-4 py-3 text-[#1a5c38] font-bold text-lg hover:bg-[#f0faf4] transition">+</button>
                  </div>
                  <button onClick={handleQuantityChange} disabled={qtyLoading}
                    className="bg-[#1a5c38] text-white font-bold px-5 py-2 rounded-lg hover:bg-[#14472c] transition text-sm disabled:opacity-50">
                    {qtyLoading ? '...' : 'Update'}
                  </button>
                </div>
              </div>
            )}

            {/* Change Plan */}
            {selectedSub && availableProducts.length > 1 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <p className="text-sm font-bold text-[#1c1c1c] mb-1 font-[family-name:var(--font-playfair)]">Change Plan</p>
                <p className="text-xs text-gray-400 mb-4">Switch your milk size — effective from next delivery</p>
                <div className="flex flex-col gap-3">
                  {availableProducts.map(product => {
                    const isCurrent = product.id === selectedSub.product_id
                    const currentPrice = selectedSub.products?.price || 0
                    const priceDiff = Math.round((product.price - currentPrice) * selectedSub.quantity)
                    return (
                      <div key={product.id}
                        className={`flex items-center justify-between border-2 rounded-xl p-4 transition ${
                          isCurrent ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                        }`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🥛</span>
                          <div>
                            <p className="font-semibold text-[#1c1c1c] text-sm">{product.name} — {product.size}</p>
                            <p className="text-xs text-gray-400">
                              ₹{Math.round(product.price * selectedSub.quantity)}/day
                              {!isCurrent && priceDiff !== 0 && (
                                <span className={`ml-1 font-semibold ${priceDiff > 0 ? 'text-red-500' : 'text-[#1a5c38]'}`}>
                                  ({priceDiff > 0 ? '+' : ''}₹{priceDiff}/day)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="text-xs font-bold text-[#1a5c38] bg-[#d4eddf] px-3 py-1 rounded-full">Current</span>
                        ) : (
                          <button
                            onClick={() => handleChangePlan(product.id)}
                            disabled={changePlanLoading}
                            className="bg-[#d4a017] text-white font-bold px-4 py-2 rounded-lg hover:bg-[#b8860b] transition text-xs disabled:opacity-50">
                            {changePlanLoading ? '...' : 'Switch'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">Changes apply from your next scheduled delivery.</p>
              </div>
            )}

            {/* Pause a Date */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-[#1c1c1c] font-[family-name:var(--font-playfair)]">Pause Delivery</p>
                <div className="flex rounded-lg overflow-hidden border border-[#e8e0d0] text-xs font-semibold">
                  <button onClick={() => setPauseMode('single')}
                    className={`px-4 py-1.5 transition ${pauseMode === 'single' ? 'bg-[#1a5c38] text-white' : 'bg-white text-gray-500 hover:bg-[#f5f0e8]'}`}>
                    Single Day
                  </button>
                  <button onClick={() => setPauseMode('range')}
                    className={`px-4 py-1.5 transition ${pauseMode === 'range' ? 'bg-[#1a5c38] text-white' : 'bg-white text-gray-500 hover:bg-[#f5f0e8]'}`}>
                    Date Range
                  </button>
                </div>
              </div>
              {pauseMode === 'single' ? (
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
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">From</label>
                      <input type="date" value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        min={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">To</label>
                      <input type="date" value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        min={rangeStart}
                        className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                  </div>
                  {rangeStart && rangeEnd && rangeEnd >= rangeStart && (
                    <p className="text-xs text-[#1a5c38] font-medium">
                      {Math.min(30, Math.round((new Date(rangeEnd) - new Date(rangeStart)) / 86400000) + 1)} day(s) will be paused
                    </p>
                  )}
                  <button type="button" onClick={handleRangePause} disabled={loading}
                    className="w-full bg-[#d4a017] text-white font-bold py-3 rounded-lg hover:bg-[#b8860b] transition text-sm">
                    {loading ? 'Pausing...' : 'Pause Date Range'}
                  </button>
                  <p className="text-xs text-gray-400">Maximum 30 days. Great for holidays or travel!</p>
                </div>
              )}
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
                <a href="https://wa.me/919980166221" target="_blank"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-semibold px-4 py-2 rounded transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
                <a href="tel:9980166221"
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
                  <a href="tel:9980166221" className="hover:text-white transition">9980166221</a>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <a href="https://wa.me/919980166221" target="_blank" className="hover:text-white transition">WhatsApp Us</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📍</span>
                  <span>Kattigenahalli,<br />Bangalore, Karnataka</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">🕐</span>
                  <span>Morning: 7AM – 9AM<br />Evening: 5PM – 7PM</span>
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
              <p>© 2026 Sri Krishnaa Dairy Farms. All rights reserved.</p>
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