'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Order() {
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
  const [message, setMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const BOTTLE_DEPOSIT = 100

  useEffect(() => {
    getUser()
    getProducts()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDeliveryDate(tomorrow.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
  }

  const getProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_available', true)
    setProducts(data || [])
    if (data && data.length > 0) setSelectedProduct(data[0])
  }

  const applyDiscount = () => {
    if (discountCode === 'NEWMILK10') {
      setDiscount(10); setMessage('✅ Discount applied! 10% off')
    } else if (discountCode === 'KRISHNA20') {
      setDiscount(20); setMessage('✅ Discount applied! 20% off')
    } else {
      setDiscount(0); setMessage('❌ Invalid discount code')
    }
  }

  const isValidBooking = () => {
    const now = new Date()
    const selected = new Date(deliveryDate)
    return (selected - now) / (1000 * 60 * 60) >= 12
  }

  const bottleDeposit = deliveryMode === 'keep_bottle' ? BOTTLE_DEPOSIT * Math.max(2, quantity) : 0
  const milkPrice = selectedProduct ? Math.round(selectedProduct.price * quantity * (1 - discount / 100)) : 0
  const totalPrice = milkPrice + bottleDeposit

  const handleOrder = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!agreedToTerms) {
      setMessage('❌ Please accept the terms and conditions to proceed.')
      setLoading(false)
      return
    }

    if (!isValidBooking()) {
      setMessage('❌ Please book at least 12 hours in advance!')
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
  setMessage('You already have an order for this date! Please choose a different date.')
  setLoading(false)
  return
}

const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      product_id: selectedProduct.id,
      quantity,
      total_price: totalPrice,
      delivery_date: deliveryDate,
      delivery_slot: deliverySlot,
      delivery_mode: deliveryMode,
      bottle_deposit: bottleDeposit,
      status: 'pending',
      payment_method: 'COD'
    })

    if (error) {
      setMessage('❌ ' + error.message)
    } else {
      window.location.href = '/confirmation?type=order'
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

        {/* 12 hour notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-yellow-700 text-sm font-semibold">⏰ Book at least 12 hours in advance</p>
          <p className="text-yellow-600 text-xs mt-1">Orders placed after 8PM will be delivered day after tomorrow</p>
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
                <p className="text-xs text-gray-400">5AM – 8AM</p>
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
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliveryMode('keep_bottle')}
                className={`border-2 rounded-lg p-4 text-center transition ${
                  deliveryMode === 'keep_bottle' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                }`}>
                <div className="text-3xl mb-1">🏺</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Keep Bottle</p>
                <p className="text-xs text-gray-400 mt-1">₹100 deposit/bottle</p>
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
                  🍼 Bottle deposit: ₹{BOTTLE_DEPOSIT} × {Math.max(2, quantity)} bottles = ₹{bottleDeposit}
                </p>
                <p className="text-xs text-[#1a5c38] mt-1">Minimum deposit is for 2 bottles (₹200). Fully refundable.</p>
              </div>
            )}
            {deliveryMode === 'direct' && (
              <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-lg p-3 mt-3">
                <p className="text-xs text-[#d4a017] font-semibold">
                  🔄 Our delivery person will collect the empty bottle immediately after delivery
                </p>
              </div>
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

          {/* Our Milk Journey */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-1">🐄 From Farm to Your Door</p>
            <p className="text-xs text-gray-400 mb-4">How your milk travels before reaching you</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              {[
                { icon: '🐄', title: 'Milking', desc: 'Cows milked hygienically at 4–6 AM' },
                { icon: '🧪', title: 'Quality Check', desc: 'Tested for freshness, purity & fat content' },
                { icon: '🫧', title: 'Bottle Cleaning', desc: 'Returned bottles washed, sanitized & sterilized' },
                { icon: '🥛', title: 'Filling & Sealing', desc: 'Measured & hygienically sealed in bottles' },
                { icon: '📦', title: 'Packing', desc: 'Labelled & packed in insulated delivery bags' },
                { icon: '🛵', title: 'Route Dispatch', desc: 'Delivery agents dispatched by 5 AM' },
                { icon: '🏠', title: 'Door Delivery', desc: 'Fresh at your doorstep by your chosen slot' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#f0faf4] border-2 border-[#c8e6d4] flex items-center justify-center text-sm flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1c1c] text-xs">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
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
              <span>{deliverySlot === 'morning' ? '🌅 5-8AM' : '🌆 5-7PM'}</span>
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

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm text-center font-medium ${
              message.startsWith('✅') ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message}
            </div>
          )}

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
      </div>
    </div>
  )
}