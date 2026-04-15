'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'

export default function Wallet() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [rechargeLoading, setRechargeLoading] = useState(false)
  const { showSuccess, showError, showInfo } = useToast()
  const [customAmount, setCustomAmount] = useState('')
  const [selectedAmount, setSelectedAmount] = useState(null)

  useEffect(() => { getUser() }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)
    await loadWallet(user.id)
    setLoading(false)
  }

  const loadWallet = async (userId) => {
    // Get or create wallet
    let { data: wallet } = await supabase
      .from('wallet').select('*').eq('user_id', userId).single()

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallet').insert({ user_id: userId, balance: 0 }).select().single()
      wallet = newWallet
    }
    setWallet(wallet)

    // Get transactions
    const { data: transactions } = await supabase
      .from('wallet_transactions').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setTransactions(transactions || [])
  }

  const handleRecharge = async () => {
    const amount = selectedAmount === 'custom' ? parseInt(customAmount, 10) : selectedAmount
    if (!amount || amount < 100 || amount > 50000) {
      showError('Please enter a valid amount (₹100 – ₹50,000).')
      return
    }
    setRechargeLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ amount_rupees: amount }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        showError('Could not initiate payment: ' + (orderData.error || 'Try again.'))
        setRechargeLoading(false)
        return
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: orderData.order_id,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Sri Krishnaa Dairy',
        description: 'Wallet Recharge',
        image: '/Logo.jpg',
        theme: { color: '#1a5c38' },
        prefill: {
          contact: '9980166221',
          email: 'orders@srikrishnaadairy.in',
        },
        config: {
          display: {
            blocks: {
              utib: {
                name: 'Pay via UPI',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.utib'],
            preferences: { show_default_blocks: true },
          },
        },
        method: {
          upi: { flow: 'collect' },
        },
        handler: async (response) => {
          const rechargeRes = await fetch('/api/wallet/recharge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount_rupees: amount,
            }),
          })
          const rechargeData = await rechargeRes.json()
          if (!rechargeRes.ok || !rechargeData.success) {
            showError('Payment done but wallet credit failed. Contact support with payment ID: ' + response.razorpay_payment_id)
            setRechargeLoading(false)
          } else {
            showSuccess('Wallet recharged successfully! Redirecting to dashboard...')
            setTimeout(() => router.push('/dashboard'), 1500)
          }
        },
        modal: {
          ondismiss: () => {
            showInfo('Payment cancelled.')
            setRechargeLoading(false)
          },
        },
      })
      rzp.open()
    } catch {
      showError('Something went wrong. Please try again.')
      setRechargeLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <p className="text-[#1a5c38] font-semibold">Loading wallet...</p>
    </div>
  )

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
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Prepaid Balance</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">My Wallet</h2>
          <p className="text-gray-400 text-sm mt-1">Manage your prepaid balance</p>
        </div>

        {/* Low Balance Warnings */}
        {wallet && wallet.balance === 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 mb-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🚨</span>
            <div>
              <p className="text-red-700 font-bold text-sm">Wallet Empty — Deliveries Paused!</p>
              <p className="text-red-600 text-xs mt-1">Your wallet balance is ₹0. All subscription deliveries are on hold. Please add balance immediately to resume.</p>
              <button onClick={() => document.getElementById('add-money')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-block mt-2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition">
                Add Balance Now →
              </button>
            </div>
          </div>
        )}
        {wallet && wallet.balance > 0 && wallet.balance < 300 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-orange-700 font-bold text-sm">Low Balance — Top Up Soon!</p>
              <p className="text-orange-600 text-xs mt-1">Your balance (₹{wallet.balance}) is below the minimum ₹300 required. Deliveries may be paused if not topped up.</p>
              <button onClick={() => document.getElementById('add-money')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-block mt-2 bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                Add Balance →
              </button>
            </div>
          </div>
        )}

        {/* Wallet Balance Card */}
        <div className="rounded-2xl p-8 mb-4 text-white relative overflow-hidden shadow-xl"
          style={{background: wallet?.balance === 0 ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' : wallet?.balance < 300 ? 'linear-gradient(135deg, #78350f 0%, #b45309 100%)' : 'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{background:'radial-gradient(circle, #d4a017, transparent)'}}></div>
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{background:'linear-gradient(90deg, transparent, #d4a017, transparent)'}}></div>
          <div className="relative z-10">
            <p className="text-green-300 text-xs font-medium uppercase tracking-widest mb-2">Available Balance</p>
            <p className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-white mb-1">
              Rs.{wallet?.balance || 0}
            </p>
            <p className="text-green-300 text-sm">Spendable · used for daily deliveries</p>
          </div>
        </div>

        {/* Refundable Deposit Card */}
        <div className="rounded-2xl p-5 mb-6 border-2 border-dashed border-[#d4a017] bg-[#fdf6e3] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#d4a017] bg-opacity-15 flex items-center justify-center text-xl flex-shrink-0">
              🍼
            </div>
            <div>
              <p className="text-xs font-semibold text-[#92400e] uppercase tracking-widest mb-0.5">Refundable Deposit</p>
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#78350f]">
                Rs.{wallet?.deposit_balance || 0}
              </p>
              <p className="text-xs text-[#92400e] mt-0.5">Returned when you give back your bottles</p>
            </div>
          </div>
          <div className="bg-[#d4a017] bg-opacity-10 border border-[#f0dfa0] rounded-xl px-3 py-2 text-center flex-shrink-0">
            <p className="text-[10px] font-bold text-[#92400e] uppercase tracking-wider">Not Spendable</p>
            <p className="text-[10px] text-[#b45309] mt-0.5">Held as security</p>
          </div>
        </div>

        {/* Add Money to Wallet */}
        <div id="add-money" className="bg-white border border-[#e8e0d0] rounded-xl p-5 mb-6 shadow-sm">
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-1">Add Money to Wallet</p>
          <p className="text-xs text-gray-400 mb-4">Instant credit via UPI, Card, or Net Banking</p>

          {/* Preset amounts */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[500, 1000, 2000].map((amt) => (
              <button key={amt}
                onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
                className={`border-2 rounded-lg py-3 text-sm font-bold transition ${
                  selectedAmount === amt
                    ? 'border-[#1a5c38] bg-[#f0faf4] text-[#1a5c38]'
                    : 'border-[#e8e0d0] text-[#1c1c1c] hover:border-[#1a5c38]'
                }`}>
                ₹{amt}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              placeholder="Enter custom amount"
              value={customAmount}
              min={100}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount('custom') }}
              onClick={() => setSelectedAmount('custom')}
              className={`flex-1 border-2 rounded-lg px-4 py-3 text-sm focus:outline-none transition ${
                selectedAmount === 'custom'
                  ? 'border-[#1a5c38]'
                  : 'border-[#e8e0d0] focus:border-[#1a5c38]'
              }`}
            />
          </div>

          <button
            onClick={handleRecharge}
            disabled={rechargeLoading || (!selectedAmount)}
            className="w-full text-white py-3 rounded-lg font-bold text-sm transition shadow-md disabled:opacity-50"
            style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {rechargeLoading
              ? 'Opening Payment...'
              : selectedAmount && selectedAmount !== 'custom'
                ? `Pay ₹${selectedAmount} via Razorpay`
                : customAmount
                  ? `Pay ₹${customAmount} via Razorpay`
                  : 'Select an amount'}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Secured by Razorpay · UPI · Cards · Net Banking</p>
        </div>

        {/* Wallet Benefits */}
        <div className="bg-white rounded-xl p-5 mb-6 border border-[#e8e0d0] shadow-sm">
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-4">Wallet Benefits</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '⚡', title: 'Instant Deduction', desc: 'Auto-deducted daily' },
              { icon: '🎁', title: 'Bonus Credits', desc: 'Rewards for loyalty' },
              { icon: '🔄', title: 'Easy Refund', desc: 'Refundable anytime' },
              { icon: '📱', title: 'No Cash Needed', desc: 'Hassle-free payments' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 bg-[#fdfbf7] rounded-lg border border-[#e8e0d0]">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="font-semibold text-[#1c1c1c] text-xs">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-[#e8e0d0] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#f5f0e8]">
            <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">Transaction History</p>
          </div>
          {transactions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400 text-sm">No transactions yet</p>
              <p className="text-gray-400 text-xs mt-1">Add balance to get started</p>
            </div>
          ) : (
            transactions.map((txn, index) => (
              <div key={txn.id}
                className={`px-5 py-4 flex items-center justify-between ${index !== transactions.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    txn.type === 'credit' ? 'bg-[#f0faf4]' : 'bg-red-50'
                  }`}>
                    {txn.type === 'credit' ? '💰' : '🥛'}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1c1c] text-sm">{txn.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <p className={`font-bold ${txn.type === 'credit' ? 'text-[#1a5c38]' : 'text-red-500'}`}>
                  {txn.type === 'credit' ? '+' : '-'}Rs.{txn.amount}
                </p>
              </div>
            ))
          )}
        </div>

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