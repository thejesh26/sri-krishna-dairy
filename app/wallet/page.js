'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import Footer from '../components/Footer'

export default function Wallet() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [rechargeLoading, setRechargeLoading] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const { showSuccess, showError, showInfo } = useToast()
  const [customAmount, setCustomAmount] = useState('')
  const [selectedAmount, setSelectedAmount] = useState(null)

  useEffect(() => { getUser() }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)
    const { data: prof } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
    setProfile(prof)
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

  const handleRecharge = async (amount) => {
    try {
      setRechargeLoading(true)

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

      // Create Razorpay order
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })
      const orderData = await orderRes.json()

      if (!orderData.orderId) {
        showError('Failed to create payment order')
        setRechargeLoading(false)
        return
      }

      // Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Sri Krishnaa Dairy Farms',
        description: 'Wallet Recharge',
        image: '/Logo.jpg',
        order_id: orderData.orderId,
        prefill: {
          name: profile?.full_name || '',
          contact: phone,
        },
        theme: { color: '#1a5c38' },
        handler: async function (response) {
          const verifyRes = await fetch('/api/wallet/recharge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: userId,
              amount: amount
            })
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            showSuccess('Wallet recharged successfully!')
            setTimeout(() => {
              window.location.reload()
            }, 1500)
          } else {
            showError('Payment verification failed!')
          }
        },
        modal: {
          ondismiss: function () {
            setRechargeLoading(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (error) {
      console.error('Recharge error:', error)
      showError('Something went wrong!')
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
        <div id="add-money" className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm mb-6">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-4">
            Add Money to Wallet
          </h3>

          {/* Preset amounts */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[500, 1000, 2000].map(amount => (
              <button
                key={amount}
                onClick={() => handleRecharge(amount)}
                disabled={rechargeLoading}
                className="border-2 border-[#1a5c38] text-[#1a5c38] font-bold py-3 rounded-xl hover:bg-[#1a5c38] hover:text-white transition">
                Rs.{amount}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Enter custom amount"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              className="flex-1 border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
            />
            <button
              onClick={() => handleRecharge(parseFloat(rechargeAmount))}
              disabled={rechargeLoading || !rechargeAmount}
              className="text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
              style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {rechargeLoading ? 'Processing...' : 'Pay'}
            </button>
          </div>
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
                    {txn.type === 'credit' ? '💰' : <img src="/bottle.png" alt="Milk" className="w-6 h-6 object-contain" />}
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

      <Footer variant="app" />
    </div>
  )
}