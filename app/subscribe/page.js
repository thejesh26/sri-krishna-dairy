'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonProductCard } from '../components/Skeleton'

export default function Subscribe() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [deliverySlot, setDeliverySlot] = useState('morning')
  const [subscriptionType, setSubscriptionType] = useState('ongoing')
  const [deliveryMode, setDeliveryMode] = useState('keep_bottle')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fixedPreset, setFixedPreset] = useState(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [depositBalance, setDepositBalance] = useState(0)
  const { showSuccess, showError, showInfo } = useToast()

  const BOTTLE_DEPOSIT = 200

  useEffect(() => {
    getUser()
    getProducts()
    const minDate = new Date()
    minDate.setHours(minDate.getHours() + 12)
    setStartDate(minDate.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const u = session.user
    setUser(u)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(prof)
    // Fetch wallet balance and existing deposit balance
    const { data: wallet } = await supabase.from('wallet').select('balance, deposit_balance').eq('user_id', u.id).maybeSingle()
    setWalletBalance(wallet?.balance || 0)
    setDepositBalance(wallet?.deposit_balance || 0)
  }

  const getProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_available', true)
    setProducts(data || [])
    if (data && data.length > 0) setSelectedProduct(data[0])
  }

  const applyDiscount = async () => {
    if (!discountCode.trim()) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ code: discountCode }),
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
  const dailyPrice = selectedProduct
    ? Math.round(selectedProduct.price * quantity * (1 - discount / 100))
    : 0

  const bottleDeposit = deliveryMode === 'keep_bottle' ? BOTTLE_DEPOSIT * quantity : 0

  const totalDays = subscriptionType === 'fixed' && endDate
    ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1)
    : 30

  // Additional deposit = only what's needed on top of existing deposit_balance
  const additionalDeposit = Math.max(0, bottleDeposit - depositBalance)
  // Total the customer needs to have covered (milk buffer + any extra deposit)
  const totalNeeded = dailyPrice * totalDays + additionalDeposit
  // How much wallet can cover
  const walletUsed = Math.min(walletBalance, totalNeeded)
  // How much still needs to go through Razorpay
  const razorpayNeeded = Math.max(0, totalNeeded - walletBalance)
  // True when wallet covers everything — no Razorpay
  const walletCovers = walletBalance >= totalNeeded && totalNeeded > 0

  // ── Subscription activation payload (shared between both paths) ──────────
  const subscriptionPayload = () => ({
    product_id: selectedProduct.id,
    quantity,
    start_date: startDate,
    end_date: endDate || null,
    delivery_slot: deliverySlot,
    subscription_type: subscriptionType,
    delivery_mode: deliveryMode,
    discount_code: discountCode || null,
    additional_deposit: additionalDeposit,
  })

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
      router.push('/confirmation?type=subscription')
    }
  }

  // ── Path B: Razorpay payment → verify → activate ────────────────────────
  const openRazorpay = async (amountRupees, subscriptionId, session) => {
    // 1. Create Razorpay order
    const orderRes = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ amount_rupees: amountRupees }),
    })
    const orderData = await orderRes.json()
    if (!orderRes.ok) {
      showError('Could not initiate payment: ' + (orderData.error || 'Try again.'))
      setLoading(false)
      return
    }

    // 2. Fetch customer profile for prefill
    const profileRes = await fetch('/api/profile/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const customerProfile = profileRes.ok ? await profileRes.json() : null
    const rawPhone = (customerProfile?.phone || '').replace(/\D/g, '')
    const sanitizedPhone = rawPhone.startsWith('91') && rawPhone.length === 12
      ? rawPhone.slice(2) : rawPhone
    const contact = sanitizedPhone.length === 10 ? `+91${sanitizedPhone}` : ''

    // 3. Open Razorpay checkout
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Sri Krishnaa Dairy Farms',
      description: 'Subscription Activation',
      image: '/Logo.jpg',
      order_id: orderData.orderId,
      prefill: {
        name: customerProfile?.full_name || '',
        email: session.user.email || '',
        contact,
      },
      theme: { color: '#1a5c38' },
      handler: async function (response) {
        const verifyRes = await fetch('/api/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            subscription_id: subscriptionId,
          }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok || !verifyData.success) {
          showError('Payment verification failed. Please contact support with your payment ID: ' + response.razorpay_payment_id)
          setLoading(false)
          return
        }
        router.push('/confirmation?type=subscription')
      },
      modal: {
        ondismiss: function () {
          showInfo('Payment cancelled.')
          setLoading(false)
        },
      },
    }
    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  // ── Main submit handler ──────────────────────────────────────────────────
  const handleSubscribe = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!agreedToTerms) {
      showError('Please accept the terms and conditions to proceed.')
      setLoading(false)
      return
    }
    if (!isValidBooking()) {
      showError('Please book at least 12 hours in advance!')
      setLoading(false)
      return
    }
    if (subscriptionType === 'fixed' && !endDate) {
      showError('Please select a duration (1 Week, 2 Weeks, 1 Month, or 3 Months)!')
      setLoading(false)
      return
    }
    if (subscriptionType === 'fixed' && new Date(endDate) <= new Date(startDate)) {
      showError('End date must be after start date!')
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()

    // Check no existing active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    if (existingSub) {
      showInfo('You already have an active subscription! Please manage your existing plan first.')
      setLoading(false)
      return
    }

    // ── Path A: wallet covers full cost — no Razorpay ──────────────────────
    if (walletCovers) {
      await activateWithWallet(session)
      return
    }

    // ── Path B: Razorpay for remaining amount ──────────────────────────────
    // Step 1: Create pending subscription (is_active = false)
    const pendingRes = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...subscriptionPayload(), wallet_only: false }),
    })
    const pendingData = await pendingRes.json()
    if (!pendingRes.ok) {
      showError(pendingData.error || 'Could not create subscription. Please try again.')
      setLoading(false)
      return
    }

    // Step 2: Open Razorpay for the remaining amount
    // verify-payment will activate the subscription after successful payment
    await openRazorpay(razorpayNeeded, pendingData.subscription_id, session)
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
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Daily Milk</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">Subscribe Now</h2>
          <p className="text-gray-400 text-sm mt-1">Fresh milk delivered to your doorstep every day</p>
        </div>

        {/* 12 hour notice */}
        <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="text-[#d4a017] text-sm font-semibold">Book at least 12 hours in advance</p>
            <p className="text-yellow-600 text-xs mt-0.5">Orders placed after 8PM will be delivered day after tomorrow</p>
          </div>
        </div>

        {/* Health Disclaimer Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <p className="text-orange-800 text-sm font-bold mb-1">⚠️ Raw Milk Health Advisory</p>
          <p className="text-orange-700 text-xs leading-relaxed">
            Our milk is farm-fresh and <strong>not pasteurized</strong>. <strong>Please boil before consumption</strong>, especially for children, elderly, and pregnant women. FSSAI Lic. No: 21225008004544.
          </p>
        </div>

        {/* Delivery Address */}
        {profile && (
          <div className="bg-white rounded-xl p-4 mb-6 border border-[#e8e0d0] shadow-sm flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Delivering to</p>
              <p className="font-semibold text-[#1a5c38]">{profile.apartment_name}, Flat {profile.flat_number}</p>
              <p className="text-sm text-gray-500">{profile.area}, Bangalore</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubscribe} className="flex flex-col gap-5">

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
                  onClick={() => setSelectedProduct(product)}
                  className={`border-2 rounded-xl p-4 text-center transition ${
                    selectedProduct?.id === product.id ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="text-3xl mb-2">🥛</div>
                  <p className="font-bold text-[#1c1c1c] text-sm">{product.size}</p>
                  <p className="text-[#1a5c38] font-extrabold">Rs.{product.price}/day</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Quantity (Bottles per day)</p>
            <div className="flex items-center justify-center gap-6">
              <button type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border-2 border-[#e8e0d0] text-[#1a5c38] font-bold text-xl hover:border-[#1a5c38] hover:bg-[#f0faf4] transition">
                -
              </button>
              <span className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#1c1c1c]">{quantity}</span>
              <button type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-full border-2 border-[#e8e0d0] text-[#1a5c38] font-bold text-xl hover:border-[#1a5c38] hover:bg-[#f0faf4] transition">
                +
              </button>
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Delivery Slot</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliverySlot('morning')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliverySlot === 'morning' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                }`}>
                <div className="text-3xl mb-1">🌅</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Morning</p>
                <p className="text-xs text-gray-400">7AM - 9AM</p>
              </button>
              <button type="button" onClick={() => setDeliverySlot('evening')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliverySlot === 'evening' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                }`}>
                <div className="text-3xl mb-1">🌆</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Evening</p>
                <p className="text-xs text-gray-400">5PM - 7PM</p>
              </button>
            </div>
          </div>

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
                    <p className="text-xs text-gray-400 mt-1">Rs.200/bottle deposit</p>
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
                  <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-lg p-3 mt-3">
                    <p className="text-xs text-[#1a5c38] font-semibold">
                      Bottle deposit: Rs.{BOTTLE_DEPOSIT} × {quantity} bottle{quantity !== 1 ? 's' : ''} = Rs.{bottleDeposit}
                    </p>
                    <p className="text-xs text-[#1a5c38] mt-1">Rs.200 per bottle. Fully refundable when bottles are returned.</p>
                  </div>
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
              min={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
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
                      const d = new Date(startDate)
                      d.setDate(d.getDate() + days - 1)
                      return d.toISOString().split('T')[0]
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
                    📅 Ends on {new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
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
          {selectedProduct && (
            <div className="bg-white rounded-xl border border-[#e8e0d0] p-5 shadow-sm">
              <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">💰 Wallet & Deposit</p>

              {/* Wallet balance row */}
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm text-gray-600">Your wallet balance</span>
                <span className={`font-bold text-sm ${walletBalance > 0 ? 'text-[#1a5c38]' : 'text-gray-400'}`}>
                  Rs.{walletBalance}
                </span>
              </div>

              {/* Deposit rows */}
              {deliveryMode === 'keep_bottle' && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                    <span className="text-sm text-gray-600">Bottle deposit required</span>
                    <span className="font-semibold text-sm text-[#1c1c1c]">Rs.{bottleDeposit}</span>
                  </div>
                  {depositBalance > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                      <span className="text-sm text-[#1a5c38]">✅ Deposit already paid</span>
                      <span className="font-semibold text-sm text-[#1a5c38]">− Rs.{Math.min(depositBalance, bottleDeposit)}</span>
                    </div>
                  )}
                  {additionalDeposit > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                      <span className="text-sm text-orange-600 font-medium">Additional deposit needed</span>
                      <span className="font-bold text-sm text-orange-600">Rs.{additionalDeposit}</span>
                    </div>
                  )}
                </>
              )}

              {/* Total needed */}
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm text-gray-600">
                  Milk buffer ({totalDays === 1 ? '1 day' : totalDays === 30 ? '~1 month' : `${totalDays} days`})
                </span>
                <span className="font-semibold text-sm text-[#1c1c1c]">Rs.{dailyPrice * totalDays}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm font-semibold text-[#1c1c1c]">Total needed</span>
                <span className="font-bold text-sm text-[#1c1c1c]">Rs.{totalNeeded}</span>
              </div>

              {/* Payment breakdown */}
              {walletBalance > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                  <span className="text-sm text-[#1a5c38]">Covered by wallet</span>
                  <span className="font-semibold text-sm text-[#1a5c38]">− Rs.{walletUsed}</span>
                </div>
              )}

              {/* Result */}
              <div className={`flex justify-between items-center pt-3 mt-1 rounded-lg px-3 py-2 ${
                walletCovers ? 'bg-[#f0faf4]' : razorpayNeeded > 0 ? 'bg-orange-50' : 'bg-[#f5f0e8]'
              }`}>
                {walletCovers ? (
                  <>
                    <span className="text-sm font-bold text-[#1a5c38]">✅ No payment needed!</span>
                    <span className="text-sm font-bold text-[#1a5c38]">Activate with wallet</span>
                  </>
                ) : razorpayNeeded > 0 && walletBalance > 0 ? (
                  <>
                    <span className="text-sm font-bold text-orange-700">Pay via Razorpay</span>
                    <span className="text-xl font-[family-name:var(--font-playfair)] font-bold text-orange-700">Rs.{razorpayNeeded}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-[#1c1c1c]">Pay via Razorpay</span>
                    <span className="text-xl font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">Rs.{totalNeeded}</span>
                  </>
                )}
              </div>

              {walletBalance > 0 && !walletCovers && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Your wallet covers Rs.{walletUsed} · Pay Rs.{razorpayNeeded} more to activate
                </p>
              )}
            </div>
          )}

          {/* Payment Summary (dark card) */}
          <div className="rounded-xl p-6 text-white shadow-lg"
            style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
            <p className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-4">Subscription Summary</p>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-green-200">{selectedProduct?.size} × {quantity}/day</span>
              <span>Rs.{selectedProduct?.price * quantity}/day</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-2 text-[#d4a017]">
                <span>Discount ({discount}%)</span>
                <span>− Rs.{Math.round(selectedProduct?.price * quantity * discount / 100)}/day</span>
              </div>
            )}
            {additionalDeposit > 0 && (
              <div className="flex justify-between text-sm mb-2 text-yellow-200">
                <span>Additional deposit (refundable)</span>
                <span>Rs.{additionalDeposit}</span>
              </div>
            )}
            {depositBalance > 0 && bottleDeposit > 0 && (
              <div className="flex justify-between text-sm mb-2 text-green-300">
                <span>✅ Existing deposit covered</span>
                <span>Rs.{Math.min(depositBalance, bottleDeposit)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-2 text-green-200">
              <span>Delivery</span>
              <span>{deliverySlot === 'morning' ? '🌅 7-9AM' : '🌆 5-7PM'} · {subscriptionType === 'fixed' ? 'Fixed' : 'Ongoing'}</span>
            </div>
            {subscriptionType === 'ongoing' && selectedProduct && (
              <div className="flex justify-between text-sm mb-2 text-green-300">
                <span>Est. monthly</span>
                <span>~Rs.{Math.round(dailyPrice * 30)}/mo</span>
              </div>
            )}
            <div className="border-t border-green-700 mt-4 pt-4">
              {walletCovers ? (
                <div className="flex justify-between font-bold text-lg">
                  <span>Pay today</span>
                  <span className="text-[#d4a017]">Rs.0 (wallet)</span>
                </div>
              ) : walletBalance > 0 ? (
                <>
                  <div className="flex justify-between text-sm text-green-300 mb-1">
                    <span>Wallet covers</span>
                    <span>Rs.{walletUsed}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Pay via Razorpay</span>
                    <span>Rs.{razorpayNeeded}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg">
                  <span>Pay today</span>
                  <span>Rs.{totalNeeded}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-[#d4a017] mt-1">
                <span>Daily from then</span>
                <span>Rs.{dailyPrice}/day (auto-deducted)</span>
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

          <button type="submit" disabled={loading || !selectedProduct || !agreedToTerms || totalNeeded === 0}
            className="text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {loading ? 'Processing...' :
              walletCovers ? '✅ Activate with Wallet Balance' :
              walletBalance > 0 ? `Pay Rs.${razorpayNeeded} & Subscribe` :
              `Pay Rs.${totalNeeded} & Subscribe`}
          </button>

        </form>
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
              <p className="text-gray-400 text-sm leading-relaxed">
                Pure, fresh cow milk delivered straight from our farm to your doorstep every morning.
              </p>
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
                  <span className="text-[#d4a017] mt-0.5">✉️</span>
                  <a href="mailto:hello@srikrishnaadairy.in" className="hover:text-white transition">hello@srikrishnaadairy.in</a>
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
