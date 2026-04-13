'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonProductCard } from '../components/Skeleton'

export default function Order() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliverySlot, setDeliverySlot] = useState('morning')
  const [deliveryMode, setDeliveryMode] = useState('keep_bottle')
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const { showSuccess, showError, showInfo } = useToast()

  const BOTTLE_DEPOSIT = 200

  useEffect(() => {
    getUser()
    getProducts()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDeliveryDate(tomorrow.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
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
    // Treat delivery date as 7AM IST (start of morning slot) to allow booking up to 7PM IST previous day
    const deliveryStart = new Date(deliveryDate + 'T07:00:00+05:30')
    return (deliveryStart - now) / (1000 * 60 * 60) >= 12
  }

  const is500mlTrial = selectedProduct?.size === '500ml'
  const bottleDeposit = !is500mlTrial && deliveryMode === 'keep_bottle' ? BOTTLE_DEPOSIT * quantity : 0
  const milkPrice = selectedProduct ? Math.round(selectedProduct.price * quantity * (1 - discount / 100)) : 0
  const totalPrice = milkPrice + bottleDeposit

  const handleOrder = async (e) => {
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

    // Check if order already exists for this date
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id')
  .eq('user_id', user.id)
  .eq('delivery_date', deliveryDate)
  .single()

if (existingOrder) {
  showInfo('You\'ve already placed an order for this date! You can place only one order per day. Please choose a different delivery date.')
  setLoading(false)
  return
}

    // SECURITY: Order is created server-side so price/deposit cannot be injected
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        quantity,
        delivery_date: deliveryDate,
        delivery_slot: deliverySlot,
        delivery_mode: deliveryMode,
        discount_code: discountCode || null,
      }),
    })
    const result = await res.json()

    if (!res.ok) {
      showError(result.error || 'Could not place order.')
    } else {
      router.push('/confirmation?type=order')
      setQuantity(1)
      setDiscount(0)
      setDiscountCode('')
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
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh • Pure • Natural</p>
          </div>
        </a>
        <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          ← Dashboard
        </a>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-2">One Time Order</p>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c] mb-2 text-center">Place Your Order 🥛</h2>
        <p className="text-center text-gray-400 text-sm mb-6">Fresh milk delivered to your doorstep</p>

        {/* COD Trial Used — show restriction */}
        {profile?.has_used_cod && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-6 text-center">
            <div className="text-5xl mb-3">🥛</div>
            <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] mb-2">You've already used your free trial!</h3>
            <p className="text-gray-600 text-sm mb-5">
              Cash on Delivery is available for one-time trial orders only.<br/>
              Please recharge your wallet to place more orders or subscribe for daily delivery.
            </p>
            <div className="flex flex-col gap-3">
              <a href="/wallet"
                className="block w-full text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                💰 Recharge Wallet
              </a>
              <a href="/subscribe"
                className="block w-full bg-[#fdf6e3] border-2 border-[#d4a017] text-[#d4a017] font-bold py-3 rounded-xl text-sm hover:bg-[#f0dfa0] transition">
                📅 Subscribe Now
              </a>
            </div>
          </div>
        )}

        {/* 12 hour notice */}
        {!profile?.has_used_cod && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-center">
          <p className="text-yellow-700 text-sm font-semibold">⏰ Book at least 12 hours in advance</p>
          <p className="text-yellow-600 text-xs mt-1">Orders placed after 8PM will be delivered day after tomorrow</p>
        </div>
        )}

        {/* Health disclaimer + order form — hidden if COD trial already used */}
        {!profile?.has_used_cod && <>

        {/* Health Disclaimer Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-orange-800 text-sm font-bold mb-1">⚠️ Raw Milk Health Advisory</p>
          <p className="text-orange-700 text-xs leading-relaxed">
            Our milk is farm-fresh and <strong>not pasteurized</strong>. <strong>Please boil before consumption</strong>, especially for children, elderly, and pregnant women. FSSAI Lic. No: 21225008004544.
          </p>
        </div>

        {/* Delivery Address */}
        {profile && (
          <div className="bg-white rounded-lg p-4 shadow-sm mb-6 border border-[#e8e0d0]">
            <p className="text-xs text-gray-400 mb-1">📍 Delivering to</p>
            <p className="font-semibold text-[#1a5c38]">{profile.apartment_name}, Flat {profile.flat_number}</p>
            <p className="text-sm text-gray-500">{profile.address}</p>
          </div>
        )}

        <form onSubmit={handleOrder} className="flex flex-col gap-5">

          {/* Product Selection */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3">Select Product</p>
            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 && [1,2].map(i => <SkeletonProductCard key={i} />)}
              {products.map((product) => (
                <button type="button" key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`border-2 rounded-lg p-4 text-center transition ${
                    selectedProduct?.id === product.id
                      ? 'border-[#1a5c38] bg-[#f0faf4]'
                      : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="text-3xl mb-1">🥛</div>
                  <p className="font-bold text-[#1c1c1c] text-sm">{product.size}</p>
                  <p className="text-[#1a5c38] font-extrabold">₹{product.price}</p>
                  {product.size === '500ml' && (
                    <span className="inline-block mt-1 text-[10px] bg-[#d4a017] text-white font-bold px-2 py-0.5 rounded-full">Trial · No Deposit</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3">Quantity (Bottles)</p>
            <div className="flex items-center justify-center gap-4">
              <button type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="bg-[#f0faf4] text-[#1a5c38] font-bold h-10 w-10 rounded-full text-xl hover:bg-[#d4eddf] transition">−</button>
              <span className="text-3xl font-bold text-[#1c1c1c]">{quantity}</span>
              <button type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="bg-[#f0faf4] text-[#1a5c38] font-bold h-10 w-10 rounded-full text-xl hover:bg-[#d4eddf] transition">+</button>
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3">Delivery Slot</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliverySlot('morning')}
                className={`border-2 rounded-lg p-4 text-center transition ${
                  deliverySlot === 'morning' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                }`}>
                <div className="text-3xl mb-1">🌅</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Morning</p>
                <p className="text-xs text-gray-400">7AM – 9AM</p>
              </button>
              <button type="button" onClick={() => setDeliverySlot('evening')}
                className={`border-2 rounded-lg p-4 text-center transition ${
                  deliverySlot === 'evening' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                }`}>
                <div className="text-3xl mb-1">🌆</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Evening</p>
                <p className="text-xs text-gray-400">5PM – 7PM</p>
              </button>
            </div>
          </div>

          {/* Bottle Delivery Mode */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-1">Bottle Delivery Mode 🍼</p>
            <p className="text-xs text-gray-400 mb-3">Choose how you want to receive your milk</p>
            {is500mlTrial ? (
              <div className="bg-[#fdf6e3] border border-[#d4a017] rounded-lg p-4 text-center">
                <p className="text-sm font-bold text-[#d4a017]">🎉 Trial Pack — No Bottle Deposit!</p>
                <p className="text-xs text-gray-500 mt-1">Our delivery person will collect the bottle after delivery. No deposit charged for the 500ml trial.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDeliveryMode('keep_bottle')}
                    className={`border-2 rounded-lg p-4 text-center transition ${
                      deliveryMode === 'keep_bottle' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                    }`}>
                    <div className="text-3xl mb-1">🏺</div>
                    <p className="font-bold text-[#1c1c1c] text-sm">Keep Bottle</p>
                    <p className="text-xs text-gray-400 mt-1">₹200 deposit/bottle</p>
                    <p className="text-xs text-[#1a5c38] font-semibold mt-1">Refundable</p>
                  </button>
                  <button type="button" onClick={() => setDeliveryMode('direct')}
                    className={`border-2 rounded-lg p-4 text-center transition ${
                      deliveryMode === 'direct' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                    }`}>
                    <div className="text-3xl mb-1">🔄</div>
                    <p className="font-bold text-[#1c1c1c] text-sm">Direct Delivery</p>
                    <p className="text-xs text-gray-400 mt-1">Bottle taken back</p>
                    <p className="text-xs text-[#d4a017] font-semibold mt-1">No deposit</p>
                  </button>
                </div>
                {deliveryMode === 'keep_bottle' && (
                  <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-lg p-3 mt-3">
                    <p className="text-xs text-[#1a5c38] font-semibold">
                      🍼 Bottle deposit: ₹{BOTTLE_DEPOSIT} × {quantity} bottle{quantity !== 1 ? 's' : ''} = ₹{bottleDeposit}
                    </p>
                    <p className="text-xs text-[#1a5c38] mt-1">₹200 per bottle. Fully refundable when bottles are returned.</p>
                  </div>
                )}
                {deliveryMode === 'direct' && (
                  <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-lg p-3 mt-3">
                    <p className="text-xs text-[#d4a017] font-semibold">
                      🔄 Our delivery person will collect the empty bottle immediately after delivery
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Delivery Date */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3">Delivery Date</p>
            <input type="date" value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
          </div>

          {/* Discount Code */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3">Discount Code</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter code" value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
              <button type="button" onClick={applyDiscount}
                className="bg-[#d4a017] text-white font-bold px-4 py-2 rounded-lg hover:bg-[#b8860b] transition text-sm">
                Apply
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg p-5 shadow-lg text-white"
            style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
            <p className="text-sm font-semibold text-green-200 mb-3">Order Summary</p>
            <div className="flex justify-between text-sm mb-1">
              <span>{selectedProduct?.size} x {quantity}</span>
              <span>₹{selectedProduct?.price * quantity}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-1 text-yellow-300">
                <span>Discount ({discount}%)</span>
                <span>− ₹{Math.round(selectedProduct?.price * quantity * discount / 100)}</span>
              </div>
            )}
            {bottleDeposit > 0 && (
              <div className="flex justify-between text-sm mb-1 text-yellow-200">
                <span>🍼 Bottle Deposit (refundable)</span>
                <span>₹{bottleDeposit}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-1">
              <span>Delivery Slot</span>
              <span>{deliverySlot === 'morning' ? '🌅 7AM–9AM' : '🌆 5PM–7PM'}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Payment</span>
              <span>Cash on Delivery</span>
            </div>
            <div className="border-t border-green-600 mt-3 pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{totalPrice}</span>
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
                I understand this milk is fresh and minimally processed, and I accept the bottle deposit and order cancellation terms.
              </span>
            </label>
          </div>

          <button type="submit" disabled={loading || !selectedProduct || !agreedToTerms}
            className="text-white py-4 rounded-lg font-bold text-lg transition shadow-lg disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {loading ? 'Placing Order...' : '🥛 Place Order (COD)'}
          </button>

        </form>
        </>}
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