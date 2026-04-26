'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonProductCard } from '../components/Skeleton'
import Footer from '../components/Footer'

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
    return { primary: "Today's ordering closed.", secondary: "Next available: Day after tomorrow" }
  }
  return { primary: "Order before 6PM today for tomorrow's delivery", secondary: null }
}

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
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [depositBalance, setDepositBalance] = useState(0)
  const [subscriberLimitReached, setSubscriberLimitReached] = useState(false)
  const { showSuccess, showError, showInfo } = useToast()

  const BOTTLE_DEPOSIT = 200

  useEffect(() => {
    getUser()
    getProducts()
    setStartDate(getMinDate())
    checkSubscriberLimit()
  }, [])

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

  // ── Razorpay payment handler ─────────────────────────────────────────────
  const handlePayment = async () => {
    try {
      setPaymentLoading(true)

      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session.user.id

      // Get customer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', userId)
        .single()

      // Sanitize phone
      const rawPhone = profile?.phone || ''
      const digits = rawPhone.replace(/\D/g, '').slice(-10)
      const phone = digits.length === 10 ? '+91' + digits : ''

      // Calculate amounts
      const depositAmount = deliveryMode === 'keep_bottle' ? quantity * 200 : 0
      const subscriptionAmount = totalNeeded
      const totalAmount = subscriptionAmount

      // Check existing wallet balance
      const { data: wallet } = await supabase
        .from('wallet')
        .select('balance, deposit_balance')
        .eq('user_id', userId)
        .maybeSingle()

      const existingBalance = wallet?.balance || 0
      const existingDeposit = wallet?.deposit_balance || 0

      // Calculate additional deposit needed
      const additionalDeposit = Math.max(0, depositAmount - existingDeposit)

      // Calculate payment needed
      const paymentNeeded = Math.max(0, totalAmount - existingBalance - existingDeposit)

      // First create subscription in DB (inactive)
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          product_id: selectedProduct.id,
          quantity: quantity,
          is_active: false,
          start_date: startDate,
          end_date: endDate || null,
          delivery_slot: deliverySlot,
          subscription_type: subscriptionType,
          bottle_deposit: depositAmount,
          delivery_mode: deliveryMode,
          discount_percent: discount,
          paused_dates: [],
        })
        .select()
        .single()

      if (subError) {
        showError('Failed to create subscription')
        setPaymentLoading(false)
        return
      }

      // If existing wallet balance is enough
      if (existingBalance >= totalAmount) {
        // Deduct from wallet directly
        await supabase
          .from('wallet')
          .update({
            balance: existingBalance - subscriptionAmount,
            deposit_balance: existingDeposit + additionalDeposit
          })
          .eq('user_id', userId)

        // Activate subscription
        await supabase
          .from('subscriptions')
          .update({ is_active: true })
          .eq('id', subscription.id)

        // Add transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: userId,
            amount: totalAmount,
            type: 'debit',
            description: 'Subscription activated using wallet balance'
          })

        showSuccess('Subscription activated!')
        setTimeout(() => {
          window.location.href = '/confirmation?type=subscription'
        }, 1500)
        return
      }

      // Need Razorpay payment
      const amountToPay = paymentNeeded > 0 ? paymentNeeded : totalAmount

      // Create Razorpay order
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountToPay })
      })
      const orderData = await orderRes.json()

      if (!orderData.orderId) {
        showError('Failed to create payment order')
        setPaymentLoading(false)
        return
      }

      // Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Sri Krishnaa Dairy Farms',
        description: 'Milk Subscription',
        image: '/Logo.jpg',
        order_id: orderData.orderId,
        prefill: {
          name: profile?.full_name || '',
          contact: phone,
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
              type: 'subscription',
              subscriptionId: subscription.id,
              userId: userId,
              amount: amountToPay,
              deposit: additionalDeposit
            })
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            showSuccess('Subscription activated!')
            setTimeout(() => {
              window.location.href = '/confirmation?type=subscription'
            }, 1500)
          } else {
            showError('Payment verification failed!')
            setPaymentLoading(false)
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (error) {
      console.error('Payment error:', error)
      showError('Something went wrong!')
      setPaymentLoading(false)
    }
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

    // Activate using wallet balance
    if (walletCovers) {
      await activateWithWallet(session)
      return
    }

    // Not enough wallet balance — prompt to recharge
    showError(`Insufficient wallet balance. Please recharge your wallet with at least ₹${razorpayNeeded} and try again.`)
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
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Daily Milk</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">Subscribe Now</h2>
          <p className="text-gray-400 text-sm mt-1">Fresh milk delivered to your doorstep every day</p>
        </div>

        {/* Ordering window notice */}
        {(() => {
          const { primary, secondary } = getDateHelperText()
          return (
            <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-4 mb-4 flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="text-[#d4a017] text-sm font-semibold">{primary}</p>
                {secondary && <p className="text-yellow-600 text-xs mt-0.5">{secondary}</p>}
              </div>
            </div>
          )
        })()}

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

        {!subscriberLimitReached && <form onSubmit={handleSubscribe} className="flex flex-col gap-5">

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
                  <div className="flex justify-center mb-2"><img src="/bottle.png" alt="Milk" className="h-14 object-contain drop-shadow-md" /></div>
                  <p className="font-bold text-[#1c1c1c] text-sm">{product.size}</p>
                  <p className="text-[#1a5c38] font-extrabold">₹{product.price}/day</p>
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
            {(() => {
              const { primary, secondary } = getDateHelperText()
              return (
                <p className="text-xs text-gray-500 mt-2">
                  ⏰ {primary}{secondary && <><br /><span className="text-gray-400">{secondary}</span></>}
                </p>
              )
            })()}
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
                  ₹{walletBalance}
                </span>
              </div>

              {/* Deposit rows */}
              {deliveryMode === 'keep_bottle' && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                    <span className="text-sm text-gray-600">Bottle deposit required</span>
                    <span className="font-semibold text-sm text-[#1c1c1c]">₹{bottleDeposit}</span>
                  </div>
                  {depositBalance > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                      <span className="text-sm text-[#1a5c38]">✅ Deposit already paid</span>
                      <span className="font-semibold text-sm text-[#1a5c38]">− ₹{Math.min(depositBalance, bottleDeposit)}</span>
                    </div>
                  )}
                  {additionalDeposit > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                      <span className="text-sm text-orange-600 font-medium">Additional deposit needed</span>
                      <span className="font-bold text-sm text-orange-600">₹{additionalDeposit}</span>
                    </div>
                  )}
                </>
              )}

              {/* Total needed */}
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm text-gray-600">
                  Milk buffer ({totalDays === 1 ? '1 day' : totalDays === 30 ? '~1 month' : `${totalDays} days`})
                </span>
                <span className="font-semibold text-sm text-[#1c1c1c]">₹{dailyPrice * totalDays}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                <span className="text-sm font-semibold text-[#1c1c1c]">Total needed</span>
                <span className="font-bold text-sm text-[#1c1c1c]">₹{totalNeeded}</span>
              </div>

              {/* Payment breakdown */}
              {walletBalance > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-[#f5f0e8]">
                  <span className="text-sm text-[#1a5c38]">Covered by wallet</span>
                  <span className="font-semibold text-sm text-[#1a5c38]">− ₹{walletUsed}</span>
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
                    <span className="text-xl font-[family-name:var(--font-playfair)] font-bold text-orange-700">₹{razorpayNeeded}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-[#1c1c1c]">Pay via Razorpay</span>
                    <span className="text-xl font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">₹{totalNeeded}</span>
                  </>
                )}
              </div>

              {walletBalance > 0 && !walletCovers && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Your wallet covers ₹{walletUsed} · Pay ₹{razorpayNeeded} more to activate
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
              <span>₹{selectedProduct?.price * quantity}/day</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-2 text-[#d4a017]">
                <span>Discount ({discount}%)</span>
                <span>− ₹{Math.round(selectedProduct?.price * quantity * discount / 100)}/day</span>
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
            {subscriptionType === 'ongoing' && selectedProduct && (
              <div className="flex justify-between text-sm mb-2 text-green-300">
                <span>Est. monthly</span>
                <span>~₹{Math.round(dailyPrice * 30)}/mo</span>
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
                    <span>₹{walletUsed}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Pay via Razorpay</span>
                    <span>₹{razorpayNeeded}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg">
                  <span>Pay today</span>
                  <span>₹{totalNeeded}</span>
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

          <button
            type="button"
            onClick={handlePayment}
            disabled={paymentLoading || !selectedProduct || !agreedToTerms || totalNeeded === 0}
            className="w-full text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg disabled:opacity-50"
            style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {paymentLoading ? 'Processing...' : `Pay ₹${totalNeeded} & Subscribe`}
          </button>

        </form>}
      </div>

      <Footer variant="app" />

    </div>
  )
}
