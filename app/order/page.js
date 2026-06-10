'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonProductCard } from '../components/Skeleton'
import Footer from '../components/Footer'

// Trial pricing — server-side caps mirror these in orders/create/route.js
const TRIAL_PRICES = { '1L': 60, '500ml': 35 }
function getTrialUnitPrice(product) {
  return TRIAL_PRICES[product.size] ?? Math.round(product.price * 0.92)
}

function addDaysIST(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00+05:30')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function getMinDate() {
  const now = new Date()
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const hours = istTime.getHours()
  const minDate = new Date(istTime)
  if (hours >= 18) {
    minDate.setDate(minDate.getDate() + 2)
  } else {
    minDate.setDate(minDate.getDate() + 1)
  }
  return minDate.toISOString().split('T')[0]
}

function getDateHelperText() {
  const now = new Date()
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  if (istTime.getHours() >= 18) {
    return { primary: "Today's ordering closed.", secondary: "Trial starts day after tomorrow" }
  }
  return { primary: "Order before 6PM today — trial starts tomorrow", secondary: null }
}

export default function Order() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliverySlot, setDeliverySlot] = useState('morning')
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [walletBalance, setWalletBalance] = useState(0)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [morningEnabled, setMorningEnabled] = useState(true)
  const [eveningEnabled, setEveningEnabled] = useState(true)
  const [trialEnabled, setTrialEnabled] = useState(true)
  const { showSuccess, showError, showInfo } = useToast()

  useEffect(() => {
    getUser()
    getProducts()
    setDeliveryDate(getMinDate())
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['morning_slot_enabled', 'evening_slot_enabled', 'trial_order_enabled'])
    if (data) {
      const map = {}
      data.forEach(r => { map[r.key] = r.value })
      setMorningEnabled(map['morning_slot_enabled'] !== 'false')
      setEveningEnabled(map['evening_slot_enabled'] !== 'false')
      setTrialEnabled(map['trial_order_enabled'] !== 'false')
      if (map['morning_slot_enabled'] === 'false' && map['evening_slot_enabled'] !== 'false') setDeliverySlot('evening')
      if (map['morning_slot_enabled'] !== 'false' && map['evening_slot_enabled'] === 'false') setDeliverySlot('morning')
    }
  }

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const u = session.user
    setUser(u)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(prof)
    const { data: walletData } = await supabase.from('wallet').select('balance').eq('user_id', u.id).maybeSingle()
    setWalletBalance(walletData?.balance || 0)
    if (prof?.has_used_cod) {
      showInfo("You've already used your free trial! Please subscribe for daily delivery or recharge your wallet.")
      router.push('/dashboard')
    }
  }

  const getProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data || [])
    } catch {
      setProducts([])
    }
  }

  const selectedItems = products.filter(p => (quantities[p.id] || 0) > 0)
  const hasItems = selectedItems.length > 0
  const totalPerDay = selectedItems.reduce((sum, p) => sum + getTrialUnitPrice(p) * (quantities[p.id] || 0), 0)
  const totalPrice = totalPerDay * 3

  const trialDates = deliveryDate
    ? [0, 1, 2].map(i => ({
        date: addDaysIST(deliveryDate, i),
        label: new Date(addDaysIST(deliveryDate, i) + 'T00:00:00+05:30')
          .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      }))
    : []

  const canPayWallet = walletBalance >= totalPrice && totalPrice > 0

  const buildItemsPayload = () =>
    selectedItems.map(p => ({
      product_id: p.id,
      quantity: quantities[p.id],
      trial_unit_price: getTrialUnitPrice(p),
    }))

  const handleCODOrWallet = async (method) => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        items: buildItemsPayload(),
        delivery_date: deliveryDate,
        delivery_slot: deliverySlot,
        delivery_mode: 'direct',
        payment_method: method === 'wallet' ? 'wallet' : 'COD',
      }),
    })
    const result = await res.json()
    setLoading(false)
    if (!res.ok) { showError(result.error || 'Could not place order.'); return }
    router.push('/confirmation?type=order')
  }

  const handleRazorpay = async () => {
    setPaymentLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalPrice }),
      })
      const orderData = await orderRes.json()
      if (!orderData.orderId) { showError('Failed to create payment order'); setPaymentLoading(false); return }

      const { data: userProfile } = await supabase
        .from('profiles').select('full_name, phone').eq('id', session.user.id).single()
      const digits = (userProfile?.phone || '').replace(/\D/g, '').slice(-10)
      const phone = digits.length === 10 ? '+91' + digits : ''

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Sri Krishnaa Dairy Farms',
        description: '3-Day Trial',
        image: '/Logo.jpg',
        order_id: orderData.orderId,
        prefill: { name: userProfile?.full_name || '', contact: phone },
        theme: { color: '#1a5c38' },
        handler: async function (response) {
          const createRes = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              items: buildItemsPayload(),
              delivery_date: deliveryDate,
              delivery_slot: deliverySlot,
              delivery_mode: 'direct',
              payment_method: 'razorpay',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const result = await createRes.json()
          if (!createRes.ok) { showError(result.error || 'Order creation failed'); setPaymentLoading(false); return }
          window.location.href = '/confirmation?type=order'
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Razorpay error:', err)
      showError('Something went wrong!')
      setPaymentLoading(false)
    }
  }

  const handleOrder = async (e) => {
    e.preventDefault()
    if (!agreedToTerms) { showError('Please accept the terms and conditions to proceed.'); return }
    if (!hasItems) { showError('Please select at least one product.'); return }
    if (paymentMethod === 'razorpay') { await handleRazorpay(); return }
    await handleCODOrWallet(paymentMethod)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

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
          ← Dashboard
        </a>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-2">3-Day Free Trial</p>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c] mb-2 text-center">Try Before You Subscribe 🥛</h2>
        <p className="text-center text-gray-400 text-sm mb-4">Fresh milk delivered for 3 days — no subscription, no deposit</p>

        {/* Raw milk safety disclaimer */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-6">
          <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
          <p className="text-amber-800 text-sm leading-relaxed">
            <span className="font-semibold">Raw Milk Advisory:</span> Our milk is farm-fresh and unprocessed.{' '}
            <span className="font-semibold">Please boil before consumption</span>, especially for children, elderly, pregnant women, and immunocompromised individuals.
          </p>
        </div>

        {/* COD Trial Used */}
        {profile?.has_used_cod && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-6 text-center">
            <div className="flex justify-center mb-3"><img src="/bottle.png" alt="Milk" className="h-16 object-contain drop-shadow-md" /></div>
            <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] mb-2">You've already used your free trial!</h3>
            <p className="text-gray-600 text-sm mb-5">Please recharge your wallet to place more orders or subscribe for daily delivery.</p>
            <div className="flex flex-col gap-3">
              <a href="/wallet" className="block w-full text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition" style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                💰 Recharge Wallet
              </a>
              <a href="/subscribe" className="block w-full bg-[#fdf6e3] border-2 border-[#d4a017] text-[#d4a017] font-bold py-3 rounded-xl text-sm hover:bg-[#f0dfa0] transition">
                📅 Subscribe Now
              </a>
            </div>
          </div>
        )}

        {/* Ordering window notice */}
        {!profile?.has_used_cod && (() => {
          const now = new Date()
          const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
          const isLate = ist.getHours() >= 18
          if (isLate) {
            const d = new Date(ist)
            d.setDate(d.getDate() + 2)
            const label = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
            return (
              <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-4 flex items-start gap-3">
                <span className="text-2xl mt-0.5">🌙</span>
                <div>
                  <p className="text-[#1a5c38] text-sm font-bold">You can still order tonight!</p>
                  <p className="text-[#1a5c38] text-xs mt-0.5">Today's 6PM window has passed — your trial will start on <strong>{label}</strong>.</p>
                </div>
              </div>
            )
          }
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-center">
              <p className="text-yellow-700 text-sm font-semibold">⏰ Order before 6PM today — trial starts tomorrow</p>
            </div>
          )
        })()}

        {!profile?.has_used_cod && <>

        {/* Delivery Address */}
        {profile && (
          <div className="bg-white rounded-lg p-4 shadow-sm mb-6 border border-[#e8e0d0]">
            <p className="text-xs text-gray-400 mb-1">📍 Delivering to</p>
            <p className="font-semibold text-[#1a5c38]">{profile.apartment_name}, Flat {profile.flat_number}</p>
            <p className="text-sm text-gray-500">{profile.address}</p>
          </div>
        )}

        {!trialEnabled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
            <p className="font-bold text-red-700">Trial orders are currently unavailable.</p>
            <p className="text-sm text-red-500 mt-1">Please check back later or contact us at 9980166221.</p>
          </div>
        )}

        {trialEnabled && <form onSubmit={handleOrder} className="flex flex-col gap-5">

          {/* Product Selection */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-1">Select Products & Quantities</p>
            <p className="text-xs text-gray-400 mb-4">Trial price applies — 3 days of delivery per product</p>
            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 && [1,2].map(i => <SkeletonProductCard key={i} />)}
              {products.map(product => {
                const qty = quantities[product.id] || 0
                const unitPrice = getTrialUnitPrice(product)
                return (
                  <div key={product.id} className={`border-2 rounded-lg p-4 text-center transition ${qty > 0 ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0]'}`}>
                    <div className="flex justify-center mb-1"><img src="/bottle.png" alt="Milk" className="h-14 object-contain drop-shadow-md" /></div>
                    <p className="font-bold text-[#1c1c1c] text-sm">{product.size}</p>
                    <p className="text-[#1a5c38] font-extrabold">₹{unitPrice}<span className="text-xs font-normal text-gray-400">/day</span></p>
                    <p className="text-xs text-[#d4a017] font-semibold">₹{unitPrice * 3} for 3 days</p>
                    <span className="inline-block mt-1 mb-3 text-[10px] bg-[#d4a017] text-white font-bold px-2 py-0.5 rounded-full">3-Day Trial · No Deposit</span>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button"
                        onClick={() => setQuantities(prev => ({ ...prev, [product.id]: Math.max(0, (prev[product.id] || 0) - 1) }))}
                        className="bg-white border border-[#e8e0d0] text-[#1a5c38] font-bold h-7 w-7 rounded-full text-base hover:bg-[#f0faf4] transition shadow-sm">−</button>
                      <span className="text-lg font-bold text-[#1c1c1c] w-5 text-center">{qty}</span>
                      <button type="button"
                        onClick={() => setQuantities(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))}
                        className="bg-[#1a5c38] text-white font-bold h-7 w-7 rounded-full text-base hover:bg-[#14472c] transition shadow-sm">+</button>
                    </div>
                    {qty > 0 && <p className="text-xs text-[#1a5c38] font-semibold mt-2">₹{unitPrice * qty * 3} total</p>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3">Delivery Slot</p>
            <div className="grid grid-cols-2 gap-3">
              {morningEnabled && (
                <button type="button" onClick={() => setDeliverySlot('morning')}
                  className={`border-2 rounded-lg p-4 text-center transition ${deliverySlot === 'morning' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'}`}>
                  <div className="text-3xl mb-1">🌅</div>
                  <p className="font-bold text-[#1c1c1c] text-sm">Morning</p>
                  <p className="text-xs text-gray-400">7AM – 9AM</p>
                </button>
              )}
              {eveningEnabled && (
                <button type="button" onClick={() => setDeliverySlot('evening')}
                  className={`border-2 rounded-lg p-4 text-center transition ${deliverySlot === 'evening' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'}`}>
                  <div className="text-3xl mb-1">🌆</div>
                  <p className="font-bold text-[#1c1c1c] text-sm">Evening</p>
                  <p className="text-xs text-gray-400">5PM – 7PM</p>
                </button>
              )}
              {!morningEnabled && !eveningEnabled && (
                <div className="col-span-2 text-center py-4 text-gray-400 text-sm">No delivery slots available at the moment.</div>
              )}
            </div>
          </div>

          {/* No Bottle Deposit */}
          <div className="bg-[#fdf6e3] border border-[#d4a017] rounded-lg p-4 flex items-start gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="text-sm font-bold text-[#d4a017]">Trial Order — No Bottle Deposit!</p>
              <p className="text-xs text-gray-500 mt-0.5">Our delivery person collects the bottle after each delivery. No deposit charged.</p>
            </div>
          </div>

          {/* Trial Start Date */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-1">Trial Start Date</p>
            <p className="text-xs text-gray-400 mb-3">Milk will be delivered on 3 consecutive days</p>
            <input type="date" value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={getMinDate()}
              className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] mb-3" />
            {(() => {
              const { primary, secondary } = getDateHelperText()
              return (
                <p className="text-xs text-gray-500 mb-3">⏰ {primary}{secondary && <><br /><span className="text-gray-400">{secondary}</span></>}</p>
              )
            })()}
            {trialDates.length > 0 && (
              <div className="bg-[#f0faf4] rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-[#1a5c38] mb-2">Your 3 delivery days:</p>
                {trialDates.map((td, i) => (
                  <div key={td.date} className="flex items-center gap-2">
                    <span className="w-14 text-[10px] font-bold text-white bg-[#1a5c38] px-1.5 py-0.5 rounded text-center">Day {i + 1}</span>
                    <span className="text-xs text-[#1c1c1c] font-medium">{td.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="rounded-lg p-5 shadow-lg text-white" style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
            <p className="text-sm font-semibold text-green-200 mb-3">Order Summary — 3-Day Trial</p>
            {selectedItems.length === 0 ? (
              <p className="text-green-300 text-sm text-center py-2">Select at least one product above</p>
            ) : (
              selectedItems.map(p => (
                <div key={p.id} className="flex justify-between text-sm mb-1">
                  <span>{p.size} × {quantities[p.id]} × 3 days</span>
                  <span>₹{getTrialUnitPrice(p) * (quantities[p.id] || 0) * 3}</span>
                </div>
              ))
            )}
            {trialDates.length > 0 && (
              <div className="mt-2 mb-1 text-xs text-green-300 space-y-0.5">
                {trialDates.map((td, i) => (
                  <p key={td.date}>Day {i + 1}: {td.label}</p>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm mb-1 mt-2">
              <span>Slot</span>
              <span>{deliverySlot === 'morning' ? '🌅 7AM–9AM' : '🌆 5PM–7PM'}</span>
            </div>
            <div className="border-t border-green-600 mt-3 pt-3 flex justify-between font-bold text-lg">
              <span>Total (3 days)</span>
              <span>₹{totalPrice}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3">Payment Method</p>
            <div className="flex flex-col gap-2">
              {/* COD */}
              <button type="button" onClick={() => setPaymentMethod('cod')}
                className={`flex items-center gap-3 border-2 rounded-lg p-4 transition text-left ${paymentMethod === 'cod' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'}`}>
                <span className="text-2xl">💵</span>
                <div>
                  <p className="font-semibold text-[#1c1c1c] text-sm">Cash on Delivery</p>
                  <p className="text-xs text-gray-400">Pay ₹{totalPerDay}/day on each delivery</p>
                </div>
                {paymentMethod === 'cod' && <span className="ml-auto text-[#1a5c38] font-bold text-sm">✓</span>}
              </button>

              {/* Wallet */}
              <button type="button" onClick={() => canPayWallet && setPaymentMethod('wallet')}
                className={`flex items-center gap-3 border-2 rounded-lg p-4 transition text-left ${!canPayWallet ? 'opacity-50 cursor-not-allowed border-[#e8e0d0]' : paymentMethod === 'wallet' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'}`}>
                <span className="text-2xl">👛</span>
                <div className="flex-1">
                  <p className="font-semibold text-[#1c1c1c] text-sm">Wallet Balance</p>
                  <p className="text-xs text-gray-400">
                    Available: ₹{walletBalance}
                    {!canPayWallet && totalPrice > 0 && <span className="text-red-400 ml-1">· Need ₹{totalPrice - walletBalance} more</span>}
                  </p>
                </div>
                {paymentMethod === 'wallet' && <span className="ml-auto text-[#1a5c38] font-bold text-sm">✓</span>}
              </button>

              {/* Razorpay */}
              <button type="button" onClick={() => setPaymentMethod('razorpay')}
                className={`flex items-center gap-3 border-2 rounded-lg p-4 transition text-left ${paymentMethod === 'razorpay' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'}`}>
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-semibold text-[#1c1c1c] text-sm">Pay Online</p>
                  <p className="text-xs text-gray-400">UPI / Card / Net Banking via Razorpay — ₹{totalPrice} upfront</p>
                </div>
                {paymentMethod === 'razorpay' && <span className="ml-auto text-[#1a5c38] font-bold text-sm">✓</span>}
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#fdfbf7] border border-[#e8e0d0] rounded-lg p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#1a5c38] cursor-pointer"
              />
              <span className="text-xs text-[#4a4a4a] leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/terms-of-service" target="_blank" className="text-[#1a5c38] font-semibold underline">Terms of Service</Link>,{' '}
                <Link href="/privacy-policy" target="_blank" className="text-[#1a5c38] font-semibold underline">Privacy Policy</Link>,{' '}
                <Link href="/refund-policy" target="_blank" className="text-[#1a5c38] font-semibold underline">Refund Policy</Link>, and{' '}
                <Link href="/health-disclaimer" target="_blank" className="text-[#1a5c38] font-semibold underline">Health Disclaimer</Link>.
                I understand this milk is fresh and minimally processed, and I accept the trial order terms.
              </span>
            </label>
          </div>

          <p className="text-xs text-center text-gray-400">📱 Order confirmation will be sent to your WhatsApp number</p>

          <button type="submit"
            disabled={loading || paymentLoading || !hasItems || !agreedToTerms}
            className="text-white py-4 rounded-lg font-bold text-lg transition shadow-lg disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {loading || paymentLoading
              ? 'Processing...'
              : paymentMethod === 'razorpay'
                ? `💳 Pay ₹${totalPrice} & Start Trial`
                : paymentMethod === 'wallet'
                  ? `👛 Pay ₹${totalPrice} from Wallet`
                  : `🥛 Start 3-Day Trial (₹${totalPerDay}/day COD)`}
          </button>

        </form>}
        </>}

      </div>

      <Footer variant="app" />

    </div>
  )
}
