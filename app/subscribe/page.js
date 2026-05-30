'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonProductCard } from '../components/Skeleton'
import Footer from '../components/Footer'

function getDeliveryCount(startDate, endDate, frequency) {
  if (!startDate || !endDate) return 30
  const start = new Date(startDate)
  const end = new Date(endDate)
  const calendarDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  if (frequency === 'alternate') return Math.floor(calendarDays / 2) + (calendarDays % 2 === 1 ? 1 : 0)
  if (frequency === 'weekly') return Math.floor(calendarDays / 7) + 1
  return calendarDays
}

function getUpcomingDeliveryDates(startDate, frequency, count = 6) {
  if (!startDate) return []
  const dates = []
  const step = frequency === 'alternate' ? 2 : frequency === 'weekly' ? 7 : 1
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + i * step)
    dates.push(d)
  }
  return dates
}

function getMinDate() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}


export default function Subscribe() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProducts, setSelectedProducts] = useState({})
  // selectedProducts = { [product_id]: quantity }
  const [deliverySlot, setDeliverySlot] = useState('morning')
  const [deliveryFrequency, setDeliveryFrequency] = useState('daily')
  const [subscriptionType, setSubscriptionType] = useState('ongoing')
  const [deliveryMode, setDeliveryMode] = useState('keep_bottle')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fixedPreset, setFixedPreset] = useState(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [depositBalance, setDepositBalance] = useState(0)
  const [subscriberLimitReached, setSubscriberLimitReached] = useState(false)
  const [morningEnabled, setMorningEnabled] = useState(true)
  const [eveningEnabled, setEveningEnabled] = useState(true)
  const [trialEnabled, setTrialEnabled] = useState(true)
  const { showSuccess, showError } = useToast()

  const BOTTLE_DEPOSIT = 200

  useEffect(() => {
    getUser()
    getProducts()
    setStartDate(getMinDate())
    checkSubscriberLimit()
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

  const checkSubscriberLimit = async () => {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'max_subscribers')
      .maybeSingle()
    const maxSubs = parseInt(settings?.value || '0')
    if (maxSubs > 0) {
      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      if ((count || 0) >= maxSubs) setSubscriberLimitReached(true)
    }
  }

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const u = session.user
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(prof)
    // Fetch wallet balance and existing deposit balance
    const { data: wallet } = await supabase.from('wallet').select('balance, deposit_balance').eq('user_id', u.id).maybeSingle()
    setWalletBalance(wallet?.balance || 0)
    setDepositBalance(wallet?.deposit_balance || 0)
  }

  const getProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data || [])
    } catch {
      setProducts([])
    }
    // no default selection — user picks per product
  }

  const applyDiscount = async () => {
    if (!discountCode.trim()) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ code: discountCode, subscription_type: subscriptionType, duration_days: fixedPreset || null }),
      })
      const result = await res.json()
      setDiscount(result.valid ? result.percent : 0)
      result.valid ? showSuccess(result.message) : showError(result.message)
    } catch {
      showError('Could not validate discount code. Please try again.')
    }
  }

  const isValidBooking = () => {
    const now = new Date()
    const selected = new Date(startDate)
    return (selected - now) / (1000 * 60 * 60) >= 12
  }

  // ── Derived pricing values ───────────────────────────────────────────────
  const selectedProductList = products.filter(p => selectedProducts[p.id])

  const dailyPrice = selectedProductList.reduce((sum, p) =>
    sum + Math.round(p.price * selectedProducts[p.id] * (1 - discount / 100)), 0)

  const totalQuantity = Object.values(selectedProducts).reduce((s, q) => s + q, 0)
  const bottleDeposit = deliveryMode === 'keep_bottle' ? BOTTLE_DEPOSIT * totalQuantity : 0

  const deliveryCount = (() => {
    if (subscriptionType !== 'fixed' || !endDate) {
      if (deliveryFrequency === 'alternate') return 15
      if (deliveryFrequency === 'weekly') return 5
      return 30
    }
    const calendarDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1)
    if (deliveryFrequency === 'alternate') return Math.floor(calendarDays / 2) + (calendarDays % 2 === 1 ? 1 : 0)
    if (deliveryFrequency === 'weekly') return Math.floor(calendarDays / 7) + 1
    return calendarDays
  })()

  // Additional deposit = only what's needed on top of existing deposit_balance
  const additionalDeposit = Math.max(0, bottleDeposit - depositBalance)
  const depositAmount = deliveryMode === 'keep_bottle' ? BOTTLE_DEPOSIT * totalQuantity : 0
  const daysToCheck = subscriptionType === 'fixed'
    ? (startDate && endDate
      ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
      : 0)
    : 30
  const requiredWalletAmount = daysToCheck > 0
    ? (dailyPrice * daysToCheck) + depositAmount
    : depositAmount
  const shortfall = Math.max(0, requiredWalletAmount - walletBalance)
  const totalNeeded = requiredWalletAmount
  const walletUsed = Math.min(walletBalance, totalNeeded)
  const razorpayNeeded = shortfall
  const walletCovers = shortfall === 0 && totalNeeded > 0

  // ── Subscription activation payload (shared between both paths) ──────────
  const subscriptionPayload = () => ({
    items: selectedProductList.map(p => ({
      product_id: p.id,
      quantity: selectedProducts[p.id],
    })),
    start_date: startDate,
    end_date: endDate || null,
    delivery_slot: deliverySlot,
    subscription_type: subscriptionType,
    delivery_mode: deliveryMode,
    delivery_frequency: deliveryFrequency,
    discount_code: discountCode || null,
    additional_deposit: additionalDeposit,
  })

  // ── Shared form validation ────────────────────────────────────────────────
  const validateForm = () => {
    if (!agreedToTerms) { showError('Please accept the terms and conditions to proceed.'); return false }
    if (selectedProductList.length === 0) { showError('Please select at least one product.'); return false }
    if (subscriptionType === 'fixed' && !endDate) { showError('Please select a duration (1 Week, 2 Weeks, 1 Month, or 3 Months)!'); return false }
    if (subscriptionType === 'fixed' && new Date(endDate) <= new Date(startDate)) { showError('End date must be after start date!'); return false }
    return true
  }

  // ── Path A: Activate directly from wallet balance ────────────────────────
  const activateWithWallet = async (session) => {
    const res = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...subscriptionPayload(), wallet_only: true }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Activation failed. Please try again.')
      setLoading(false)
    } else {
      router.push(`/confirmation?type=subscription&startDate=${encodeURIComponent(startDate)}`)
    }
  }

  const handleWalletSubscribe = async () => {
    if (!validateForm()) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    await activateWithWallet(session)
  }

  // ── Path B: Razorpay for shortfall amount ────────────────────────────────
  const handleRazorpayPayment = async () => {
    if (!validateForm()) return
    try {
      setPaymentLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      // Step 1: Create inactive subscriptions via API
      const createRes = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(subscriptionPayload()),
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        showError(createData.error || 'Failed to prepare subscription')
        setPaymentLoading(false)
        return
      }
      const subscriptionIds = createData.subscription_ids

      // Step 2: Get profile for Razorpay prefill
      const { data: userProfile } = await supabase
        .from('profiles').select('full_name, phone').eq('id', session.user.id).single()
      const digits = (userProfile?.phone || '').replace(/\D/g, '').slice(-10)
      const phone = digits.length === 10 ? '+91' + digits : ''

      // Step 3: Create Razorpay order for shortfall only
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: shortfall }),
      })
      const orderData = await orderRes.json()
      if (!orderData.orderId) {
        showError('Failed to create payment order')
        setPaymentLoading(false)
        return
      }

      // Step 4: Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Sri Krishnaa Dairy Farms',
        description: 'Milk Subscription',
        image: '/Logo.jpg',
        order_id: orderData.orderId,
        prefill: { name: userProfile?.full_name || '', contact: phone },
        theme: { color: '#1a5c38' },
        handler: async function (response) {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              type: 'subscription',
              subscriptionIds,
              userId: session.user.id,
              amount: shortfall,
              deposit: depositAmount,
              discount_code: discountCode || null,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            showSuccess('Subscription activated!')
            setTimeout(() => {
              window.location.href = `/confirmation?type=subscription&startDate=${encodeURIComponent(startDate)}`
            }, 1500)
          } else {
            showError('Payment verification failed!')
            setPaymentLoading(false)
          }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Payment error:', err)
      showError('Something went wrong!')
      setPaymentLoading(false)
    }
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
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Daily Milk</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">Subscribe Now</h2>
          <p className="text-gray-400 text-sm mt-1">Fresh milk delivered to your doorstep every day</p>
        </div>

        {/* Trial banner — only if customer hasn't used COD yet */}
        {profile && profile.has_used_cod === false && (
          <div className="bg-[#fdf6e3] border-2 border-[#f0dfa0] rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-lg mb-1">🎁 Never tried our milk before?</p>
              <p className="text-sm text-[#8a6a00] leading-relaxed">Start with a FREE trial — no wallet needed, no deposit, delivered tomorrow.</p>
            </div>
            <a href="/order"
              className="inline-block bg-[#d4a017] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#b8860b] transition text-center whitespace-nowrap shadow">
              Try Free Trial →
            </a>
          </div>
        )}

        {/* Ordering window notice */}
        <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="text-[#d4a017] text-sm font-semibold">
              {startDate
                ? `First delivery: ${new Date(startDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Select a start date below'}
            </p>
          </div>
        </div>

        {/* Wallet transparency note */}
        {!subscriberLimitReached && (
          <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-2 flex items-start gap-3">
            <span className="text-xl mt-0.5">💳</span>
            <p className="text-[#1a5c38] text-sm leading-relaxed">
              <strong>How payment works:</strong> Subscription uses a simple prepaid wallet — top up once, we deduct daily as milk is delivered. No surprises, full control. Your first order can be COD.
            </p>
          </div>
        )}

        {/* Subscriber limit reached */}
        {subscriberLimitReached && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c] mb-3">
              Slots are currently full in your area!
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
              We're growing fast! Register on our priority list and we'll WhatsApp you the moment a slot opens near you.
            </p>
            <a href="/waitlist"
              className="inline-block text-white font-bold px-8 py-4 rounded-xl text-base hover:opacity-90 transition shadow-lg"
              style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              Join Priority List 🎉
            </a>
          </div>
        )}

        {/* Delivery Address + Form — hidden when subscriber limit is reached */}
        {!subscriberLimitReached && profile && (
          <div className="bg-white rounded-xl p-4 mb-6 border border-[#e8e0d0] shadow-sm flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Delivering to</p>
              <p className="font-semibold text-[#1a5c38]">{profile.apartment_name}, Flat {profile.flat_number}</p>
              <p className="text-sm text-gray-500">{profile.area}, Bangalore</p>
            </div>
          </div>
        )}

        {!subscriberLimitReached && <form onSubmit={e => e.preventDefault()} className="flex flex-col gap-5">

          {/* Subscription Type */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Subscription Type</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'fixed', icon: '📆', label: 'Fixed Period', sub: 'Set end date' },
                { type: 'ongoing', icon: '♾️', label: 'Ongoing', sub: 'Until cancelled' },
              ].map(({ type, icon, label, sub }) => (
                <button type="button" key={type}
                  onClick={() => setSubscriptionType(type)}
                  className={`border-2 rounded-xl p-3 text-center transition ${
                    subscriptionType === type ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="font-bold text-[#1c1c1c] text-xs">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Select Product</p>
            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 && [1,2].map(i => <SkeletonProductCard key={i} />)}
              {products.map((product) => (
                <button type="button" key={product.id}
                  onClick={() => {
                    setSelectedProducts(prev => {
                      if (prev[product.id]) {
                        const next = { ...prev }
                        delete next[product.id]
                        return next
                      }
                      return { ...prev, [product.id]: 1 }
                    })
                  }}
                  className={`border-2 rounded-xl p-4 text-center transition ${
                    selectedProducts[product.id] ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="flex justify-center mb-2"><img src="/bottle.png" alt="Milk" className="h-14 object-contain drop-shadow-md" /></div>
                  <p className="font-bold text-[#1c1c1c] text-sm">{product.size}</p>
                  <p className="text-[#1a5c38] font-extrabold">₹{product.price}/day</p>
                  {selectedProducts[product.id] && (
                    <div className="flex items-center justify-center gap-3 mt-2" onClick={e => e.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedProducts(prev => ({
                        ...prev, [product.id]: Math.max(1, (prev[product.id] || 1) - 1)
                      }))} className="w-7 h-7 rounded-full border border-[#1a5c38] text-[#1a5c38] font-bold text-sm">-</button>
                      <span className="font-bold text-[#1c1c1c]">{selectedProducts[product.id]}</span>
                      <button type="button" onClick={() => setSelectedProducts(prev => ({
                        ...prev, [product.id]: (prev[product.id] || 1) + 1
                      }))} className="w-7 h-7 rounded-full border border-[#1a5c38] text-[#1a5c38] font-bold text-sm">+</button>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Delivery Slot</p>
            <div className="grid grid-cols-2 gap-3">
              {morningEnabled && (
                <button type="button" onClick={() => setDeliverySlot('morning')}
                  className={`border-2 rounded-xl p-4 text-center transition ${
                    deliverySlot === 'morning' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                  }`}>
                  <div className="text-3xl mb-1">🌅</div>
                  <p className="font-bold text-[#1c1c1c] text-sm">Morning</p>
                  <p className="text-xs text-gray-400">7AM - 9AM</p>
                </button>
              )}
              {eveningEnabled && (
                <button type="button" onClick={() => setDeliverySlot('evening')}
                  className={`border-2 rounded-xl p-4 text-center transition ${
                    deliverySlot === 'evening' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="text-3xl mb-1">🌆</div>
                  <p className="font-bold text-[#1c1c1c] text-sm">Evening</p>
                  <p className="text-xs text-gray-400">5PM - 7PM</p>
                </button>
              )}
              {!morningEnabled && !eveningEnabled && (
                <div className="col-span-2 text-center py-4 text-gray-400 text-sm">
                  No delivery slots available at the moment. Please check back later.
                </div>
              )}
            </div>
          </div>

          {/* Delivery Frequency */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Delivery Frequency</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'daily',     icon: '📦', label: 'Daily',        sub: 'Fresh milk every day'           },
                { value: 'alternate', icon: '🔄', label: 'Every 2 Days', sub: 'Alternate days (~15/month)'     },
                { value: 'weekly',    icon: '📅', label: 'Weekly',       sub: 'Once a week (7 deliveries/mo)' },
              ].map(({ value, icon, label, sub }) => (
                <button type="button" key={value}
                  onClick={() => setDeliveryFrequency(value)}
                  className={`border-2 rounded-xl p-3 text-center transition ${
                    deliveryFrequency === value ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="font-bold text-[#1c1c1c] text-xs">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery dates preview — only for non-daily frequencies */}
          {deliveryFrequency !== 'daily' && startDate && (() => {
            const count = deliveryFrequency === 'weekly' ? 4 : 6
            const dates = getUpcomingDeliveryDates(startDate, deliveryFrequency, count)
            const label = deliveryFrequency === 'weekly' ? 'Your weekly delivery dates' : 'Your delivery dates (Every 2 Days)'
            const suffix = deliveryFrequency === 'weekly' ? 'every 7 days' : 'every 2 days'
            return (
              <div className="bg-white border-2 border-[#c8e6d4] rounded-xl p-4">
                <p className="text-xs font-bold text-[#1a5c38] mb-3">📅 {label}:</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {dates.map((d, i) => (
                    <span key={i} className="bg-[#f0faf4] border border-[#c8e6d4] text-[#1a5c38] text-xs font-semibold px-3 py-1.5 rounded-full">
                      {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">...and continuing {suffix}</p>
              </div>
            )
          })()}

          {/* Bottle Delivery Mode */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-1 font-[family-name:var(--font-playfair)]">Bottle Delivery Mode</p>
            <p className="text-xs text-gray-400 mb-4">Choose how you want to receive your milk</p>
            <>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDeliveryMode('keep_bottle')}
                    className={`border-2 rounded-xl p-4 text-center transition ${
                      deliveryMode === 'keep_bottle' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                    }`}>
                    <div className="text-3xl mb-1">🏺</div>
                    <p className="font-bold text-[#1c1c1c] text-sm">Keep Bottle</p>
                    <p className="text-xs text-gray-400 mt-1">₹200/bottle deposit</p>
                    <p className="text-xs text-[#1a5c38] font-semibold">Refundable</p>
                  </button>
                  <button type="button" onClick={() => setDeliveryMode('direct')}
                    className={`border-2 rounded-xl p-4 text-center transition ${
                      deliveryMode === 'direct' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                    }`}>
                    <div className="text-3xl mb-1">🔄</div>
                    <p className="font-bold text-[#1c1c1c] text-sm">Direct Delivery</p>
                    <p className="text-xs text-gray-400 mt-1">Bottle taken back</p>
                    <p className="text-xs text-[#d4a017] font-semibold">No deposit</p>
                  </button>
                </div>
                {deliveryMode === 'keep_bottle' && (
                  <p className="text-xs text-[#1a5c38] mt-3 px-1">
                    🔒 One-time refundable deposit — collected with your first payment, returned in full when you cancel.
                  </p>
                )}
            </>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">
              Start Date
            </p>
            <input type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setFixedPreset(null); setEndDate('') }}
              min={getMinDate()}
              className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            {startDate && (
              <p className="text-xs text-[#1a5c38] font-semibold mt-2">
                ⏰ First delivery: {new Date(startDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {subscriptionType === 'fixed' && (
              <>
                <p className="text-sm font-bold text-[#1c1c1c] mb-3 mt-4 font-[family-name:var(--font-playfair)]">Duration</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '1 Week', days: 7 },
                    { label: '2 Weeks', days: 14 },
                    { label: '1 Month', days: 30 },
                    { label: '3 Months', days: 90 },
                  ].map(({ label, days }) => {
                    const calcEnd = () => {
                      if (!startDate) return ''
                      const d = new Date(startDate + 'T00:00:00')
                      d.setDate(d.getDate() + days - 1)
                      const y = d.getFullYear()
                      const m = String(d.getMonth() + 1).padStart(2, '0')
                      const day = String(d.getDate()).padStart(2, '0')
                      return `${y}-${m}-${day}`
                    }
                    return (
                      <button type="button" key={days}
                        onClick={() => { setFixedPreset(days); setEndDate(calcEnd()) }}
                        className={`border-2 rounded-lg p-3 text-center transition ${
                          fixedPreset === days ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                        }`}>
                        <p className="font-bold text-[#1c1c1c] text-xs">{label}</p>
                        <p className="text-xs text-gray-400">{days}d</p>
                      </button>
                    )
                  })}
                </div>
                {fixedPreset && endDate && (
                  <p className="text-xs text-[#1a5c38] font-semibold mt-3 bg-[#f0faf4] rounded-lg p-2 text-center">
                    📅 Ends on {new Date(endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {!fixedPreset && (
                  <p className="text-xs text-gray-400 mt-2">Select a duration preset above</p>
                )}
              </>
            )}
          </div>

          {/* Discount Code */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">Discount Code</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter code" value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
              <button type="button" onClick={applyDiscount}
                className="bg-[#d4a017] text-white font-bold px-5 py-2 rounded-lg hover:bg-[#b8860b] transition text-sm">
                Apply
              </button>
            </div>
          </div>

          {/* ── Wallet Balance & Deposit Info ─────────────────────────────────── */}
          {selectedProductList.length > 0 && (
            <div className="bg-white rounded-xl border border-[#e8e0d0] p-5 shadow-sm">
              <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">💰 Wallet & Deposit</p>
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm text-gray-600">Bottle deposit (upfront)</span>
                <span className="font-semibold text-sm text-[#1c1c1c]">₹{depositAmount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm text-gray-600">Milk buffer ({daysToCheck > 0 ? `${daysToCheck} days` : '—'})</span>
                <span className="font-semibold text-sm text-[#1c1c1c]">{daysToCheck > 0 ? `₹${dailyPrice * daysToCheck}` : '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm font-semibold text-[#1c1c1c]">Total required</span>
                <span className="font-bold text-sm text-[#1c1c1c]">{isNaN(requiredWalletAmount) ? '—' : `₹${requiredWalletAmount}`}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm text-gray-600">Your wallet</span>
                <span className={`font-bold text-sm ${walletBalance > 0 ? 'text-[#1a5c38]' : 'text-gray-400'}`}>₹{walletBalance}</span>
              </div>
              {shortfall > 0 && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-semibold text-red-600">Amount to pay now</span>
                  <span className="font-bold text-sm text-red-600">₹{isNaN(shortfall) ? '—' : shortfall}</span>
                </div>
              )}
              {walletCovers && (
                <div className="mt-3 text-[#1a5c38] font-semibold text-sm text-center bg-[#f0faf4] rounded-lg p-2">
                  ✅ Wallet balance is sufficient — activate instantly
                </div>
              )}
            </div>
          )}

          {/* Delivery count info box */}
          {selectedProductList.length > 0 && (
            <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4">
              {(() => {
                const freqLabel = deliveryFrequency === 'alternate' ? 'Every 2 Days' : deliveryFrequency === 'weekly' ? 'Weekly' : 'Daily'
                const durationLabel = subscriptionType === 'ongoing' ? 'Ongoing'
                  : fixedPreset === 7 ? '1 Week' : fixedPreset === 14 ? '2 Weeks'
                  : fixedPreset === 30 ? '1 Month' : fixedPreset === 90 ? '3 Months'
                  : endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'
                return (
                  <>
                    <p className="text-xs font-bold text-[#1a5c38] mb-2">
                      📅 {freqLabel} · {durationLabel}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Deliveries</span>
                      <span className="font-bold text-[#1c1c1c]">{deliveryCount}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Total milk cost</span>
                      <span className="font-bold text-[#1c1c1c]">₹{dailyPrice} × {deliveryCount} = ₹{dailyPrice * deliveryCount}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 pt-1 border-t border-[#c8e6d4]">
                      <span className="font-semibold text-[#1a5c38]">Wallet required</span>
                      <span className="font-bold text-[#1a5c38]">₹{totalNeeded}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Payment Summary (dark card) */}
          <div className="rounded-xl p-6 text-white shadow-lg"
            style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
            <p className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-4">Subscription Summary</p>
            {selectedProductList.map(p => (
              <div key={p.id} className="flex justify-between text-sm mb-2">
                <span className="text-green-200">{p.size} × {selectedProducts[p.id]}/day</span>
                <span>₹{p.price * selectedProducts[p.id]}/day</span>
              </div>
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-2 text-[#d4a017]">
                <span>Discount ({discount}%)</span>
                <span>− ₹{(dailyPrice * discount / (100 - discount)).toFixed(1).replace(/\.0$/, '')}/day</span>
              </div>
            )}
            {additionalDeposit > 0 && (
              <div className="flex justify-between text-sm mb-2 text-yellow-200">
                <span>Additional deposit (refundable)</span>
                <span>₹{additionalDeposit}</span>
              </div>
            )}
            {depositBalance > 0 && bottleDeposit > 0 && (
              <div className="flex justify-between text-sm mb-2 text-green-300">
                <span>✅ Existing deposit covered</span>
                <span>₹{Math.min(depositBalance, bottleDeposit)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-2 text-green-200">
              <span>Delivery</span>
              <span>{deliverySlot === 'morning' ? '🌅 7-9AM' : '🌆 5-7PM'} · {subscriptionType === 'fixed' ? 'Fixed' : 'Ongoing'}</span>
            </div>
            {startDate && (
              <div className="mb-2">
                <p className="text-xs text-green-300 mb-1.5">🥛 First 3 deliveries</p>
                <div className="flex flex-wrap gap-1.5">
                  {getUpcomingDeliveryDates(startDate, deliveryFrequency, 3).map((date, i) => (
                    <span key={i} className="text-xs bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] px-3 py-1.5 rounded-full font-medium">
                      {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {subscriptionType === 'ongoing' && selectedProductList.length > 0 && (
              <div className="flex justify-between text-sm mb-2 text-green-300">
                <span>Est. monthly</span>
                <span>~₹{Math.round(dailyPrice * (deliveryFrequency === 'alternate' ? 15 : deliveryFrequency === 'weekly' ? 4 : 30))}/mo</span>
              </div>
            )}
            <div className="border-t border-green-700 mt-4 pt-4">
              {walletCovers ? (
                <div className="flex justify-between font-bold text-lg">
                  <span>Pay today</span>
                  <span className="text-[#d4a017]">₹0 (wallet)</span>
                </div>
              ) : walletBalance > 0 ? (
                <>
                  <div className="flex justify-between text-sm text-green-300 mb-1">
                    <span>Wallet covers</span>
                    <span>{isNaN(walletUsed) ? '—' : `₹${walletUsed}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Pay via Razorpay</span>
                    <span>{isNaN(razorpayNeeded) ? '—' : `₹${razorpayNeeded}`}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg">
                  <span>Pay today</span>
                  <span>{isNaN(totalNeeded) ? '—' : `₹${totalNeeded}`}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-[#d4a017] mt-1">
                <span>Daily from then</span>
                <span>₹{dailyPrice}/day (auto-deducted)</span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#fdfbf7] border border-[#e8e0d0] rounded-xl p-5">
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
                I understand this milk is fresh and minimally processed, and I accept the bottle deposit and subscription cancellation terms.
              </span>
            </label>
          </div>

          {shortfall > 0 ? (
            <button
              type="button"
              onClick={handleRazorpayPayment}
              disabled={!agreedToTerms || paymentLoading}
              className="w-full text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg disabled:opacity-50"
              style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {paymentLoading ? 'Processing...' : `Pay ₹${isNaN(shortfall) ? '—' : shortfall} & Subscribe`}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleWalletSubscribe}
              disabled={!agreedToTerms || loading || totalNeeded === 0}
              className="w-full text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg disabled:opacity-50"
              style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {loading ? 'Processing...' : 'Subscribe (from wallet)'}
            </button>
          )}

        </form>}
      </div>

      <Footer variant="app" />

    </div>
  )
}
