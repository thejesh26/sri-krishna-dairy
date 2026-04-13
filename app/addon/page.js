'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'

export default function AddonOrder() {
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [products, setProducts] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [deliverySlot, setDeliverySlot] = useState('morning')
  const [addonType, setAddonType] = useState('onetime') // 'onetime' | 'weekend' | 'range'
  const [selectedDate, setSelectedDate] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [weekendCount, setWeekendCount] = useState(2)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    getData()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tStr = tomorrow.toISOString().split('T')[0]
    setSelectedDate(tStr)
    setRangeStart(tStr)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)
    setRangeEnd(endDate.toISOString().split('T')[0])
  }, [])

  const getData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user)

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*, products(*)')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!sub) { router.push('/subscribe'); return }
    setSubscription(sub)
    setDeliverySlot(sub.delivery_slot || 'morning')

    const { data: prods } = await supabase.from('products').select('*').eq('is_available', true)
    setProducts(prods || [])
    setSelectedProduct(prods?.[0] || null)

    const { data: wallet } = await supabase.from('wallet').select('balance').eq('user_id', session.user.id).maybeSingle()
    setWalletBalance(wallet?.balance || 0)

    setLoading(false)
  }

  // Compute selected dates based on addon type
  const getSelectedDates = () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    if (addonType === 'onetime') {
      return selectedDate > today ? [selectedDate] : []
    }
    if (addonType === 'range') {
      if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return []
      const dates = []
      const cur = new Date(rangeStart)
      const end = new Date(rangeEnd)
      while (cur <= end && dates.length < 30) {
        const d = cur.toISOString().split('T')[0]
        if (d > today) dates.push(d)
        cur.setDate(cur.getDate() + 1)
      }
      return dates
    }
    if (addonType === 'weekend') {
      const dates = []
      const cur = new Date()
      cur.setDate(cur.getDate() + 1)
      while (dates.length < weekendCount * 2) {
        const day = cur.getDay()
        if (day === 0 || day === 6) {
          dates.push(cur.toISOString().split('T')[0])
        }
        cur.setDate(cur.getDate() + 1)
        if (dates.length >= 14) break
      }
      return dates
    }
    return []
  }

  const dates = getSelectedDates()
  const pricePerDay = selectedProduct ? Math.round(selectedProduct.price * quantity) : 0
  const totalAmount = pricePerDay * dates.length

  const handleSubmit = async () => {
    if (!dates.length) { showError('No valid dates selected.'); return }
    if (totalAmount > walletBalance) { showError('Insufficient wallet balance.'); return }
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/addon-orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        quantity,
        dates,
        delivery_slot: deliverySlot,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Could not place order.')
    } else {
      showSuccess(`${dates.length} extra order(s) placed! ₹${totalAmount} deducted from wallet.`)
      setConfirmOpen(false)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <div className="text-[#1a5c38] text-lg">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/dashboard" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh • Pure • Natural</p>
          </div>
        </a>
        <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          ← Dashboard
        </a>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-2">Add-on Order</p>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c] mb-1 text-center">Order Extra Milk 🥛</h2>
        <p className="text-center text-gray-400 text-sm mb-6">Subscribers only • Wallet payment only</p>

        {/* Current Subscription */}
        <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-1">Your Active Subscription</p>
          <p className="font-semibold text-[#1c1c1c]">{subscription?.products?.size} × {subscription?.quantity}/day</p>
          <p className="text-xs text-gray-500">{subscription?.delivery_slot === 'morning' ? '🌅 Morning (7AM-9AM)' : '🌆 Evening (5PM-7PM)'}</p>
        </div>

        {/* Wallet Balance */}
        <div className={`rounded-xl p-4 mb-5 flex items-center justify-between ${walletBalance < 200 ? 'bg-red-50 border border-red-200' : 'bg-[#fdf6e3] border border-[#f0dfa0]'}`}>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-0.5">Wallet Balance</p>
            <p className={`text-xl font-bold ${walletBalance < 200 ? 'text-red-600' : 'text-[#d4a017]'}`}>₹{walletBalance}</p>
          </div>
          {walletBalance < 200 && (
            <a href="/wallet" className="text-xs bg-[#1a5c38] text-white font-bold px-3 py-2 rounded-lg hover:bg-[#14472c] transition">Top Up</a>
          )}
        </div>

        <div className="flex flex-col gap-5">

          {/* Product Selection */}
          <div className="bg-white rounded-xl border border-[#e8e0d0] p-5 shadow-sm">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">Select Product</p>
            <div className="flex flex-col gap-2">
              {products.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full border-2 rounded-xl p-3 text-left transition ${selectedProduct?.id === p.id ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0]'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-[#1c1c1c] text-sm">{p.name} - {p.size}</p>
                      <p className="text-xs text-gray-400 mt-0.5">₹{p.price}/bottle</p>
                    </div>
                    {selectedProduct?.id === p.id && <span className="text-[#1a5c38] font-bold text-lg">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-xl border border-[#e8e0d0] p-5 shadow-sm">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">Quantity</p>
            <div className="flex items-center border border-[#e8e0d0] rounded-lg overflow-hidden">
              <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-5 py-3 text-[#1a5c38] font-bold text-lg hover:bg-[#f0faf4] transition">−</button>
              <span className="flex-1 text-center font-bold text-[#1c1c1c]">{quantity}</span>
              <button type="button" onClick={() => setQuantity(q => Math.min(20, q + 1))}
                className="px-5 py-3 text-[#1a5c38] font-bold text-lg hover:bg-[#f0faf4] transition">+</button>
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="bg-white rounded-xl border border-[#e8e0d0] p-5 shadow-sm">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">Delivery Slot</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'morning', label: '🌅 Morning', desc: '7AM – 9AM' },
                { value: 'evening', label: '🌆 Evening', desc: '5PM – 7PM' },
              ].map(s => (
                <button key={s.value} type="button"
                  onClick={() => setDeliverySlot(s.value)}
                  className={`border-2 rounded-xl p-3 text-left transition ${deliverySlot === s.value ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0]'}`}>
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Order Type */}
          <div className="bg-white rounded-xl border border-[#e8e0d0] p-5 shadow-sm">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">Order Type</p>
            <div className="flex gap-2 mb-4">
              {[
                { value: 'onetime', label: 'One Time' },
                { value: 'weekend', label: 'Weekends' },
                { value: 'range', label: 'Date Range' },
              ].map(t => (
                <button key={t.value} type="button"
                  onClick={() => setAddonType(t.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${addonType === t.value ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'border-[#e8e0d0] text-gray-600 hover:bg-[#f0faf4]'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {addonType === 'onetime' && (
              <input type="date" value={selectedDate}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
            )}

            {addonType === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">From</label>
                  <input type="date" value={rangeStart}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    onChange={e => setRangeStart(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To</label>
                  <input type="date" value={rangeEnd}
                    min={rangeStart}
                    onChange={e => setRangeEnd(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
                </div>
              </div>
            )}

            {addonType === 'weekend' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Number of weekends</label>
                <select value={weekendCount} onChange={e => setWeekendCount(Number(e.target.value))}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]">
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} weekend{n > 1 ? 's' : ''} ({n * 2} days)</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Order Summary */}
          {dates.length > 0 && selectedProduct && (
            <div className="bg-[#0d3320] rounded-xl p-5 text-white">
              <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">Order Summary</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-200">Dates selected</span>
                <span className="font-semibold">{dates.length} day{dates.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-200">Price per day</span>
                <span className="font-semibold">₹{pricePerDay}</span>
              </div>
              <div className="border-t border-white border-opacity-20 my-3"></div>
              <div className="flex justify-between">
                <span className="text-green-200 font-semibold">Total</span>
                <span className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#d4a017]">₹{totalAmount}</span>
              </div>
              {totalAmount > walletBalance && (
                <p className="text-red-300 text-xs mt-2">⚠ Insufficient balance — need ₹{totalAmount - walletBalance} more</p>
              )}
            </div>
          )}

          {/* Dates Preview */}
          {dates.length > 0 && (
            <div className="bg-white rounded-xl border border-[#e8e0d0] p-5 shadow-sm">
              <p className="text-sm font-bold text-[#1c1c1c] mb-3">Delivery Dates ({dates.length})</p>
              <div className="flex flex-wrap gap-2">
                {dates.slice(0, 8).map(d => (
                  <span key={d} className="bg-[#f0faf4] text-[#1a5c38] text-xs font-medium px-3 py-1.5 rounded-full border border-[#c8e6d4]">
                    {new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                ))}
                {dates.length > 8 && <span className="text-xs text-gray-400 py-1.5">+{dates.length - 8} more</span>}
              </div>
            </div>
          )}

          <button
            disabled={!dates.length || !selectedProduct || totalAmount > walletBalance || totalAmount === 0}
            onClick={() => setConfirmOpen(true)}
            className="w-full text-white font-bold py-4 rounded-xl text-base hover:opacity-90 transition disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            Place Add-on Order · ₹{totalAmount}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-[#1c1c1c] mb-4">Confirm Add-on Order</h3>
            <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Product</span>
                <span className="font-semibold">{selectedProduct?.size} × {quantity}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Days</span>
                <span className="font-semibold">{dates.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-[#1a5c38] text-base">₹{totalAmount}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">₹{totalAmount} will be deducted from your wallet balance of ₹{walletBalance}.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
                Back
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                {submitting ? 'Placing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
