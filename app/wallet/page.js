'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Button, Card, CardSection, EmptyState } from '../components/ui'

export default function Wallet() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [rechargeLoading, setRechargeLoading] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const { showSuccess, showError } = useToast()
  const [selectedAmount, setSelectedAmount] = useState(null)
  const [pluxeeQrUrl, setPluxeeQrUrl] = useState('')
  const [pluxeeAmount, setPluxeeAmount] = useState('')
  const [pluxeeTxnRef, setPluxeeTxnRef] = useState('')
  const [pluxeeLoading, setPluxeeLoading] = useState(false)

  useEffect(() => { getUser() }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)
    const { data: prof } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
    setProfile(prof)
    await Promise.all([
      loadWallet(user.id),
      fetch('/api/settings/public').then(r => r.json()).then(s => { if (s.pluxee_qr_url) setPluxeeQrUrl(s.pluxee_qr_url) }).catch(() => {}),
    ])
    setLoading(false)
  }

  const handlePluxeeSubmit = async () => {
    const amt = parseFloat(pluxeeAmount)
    if (!pluxeeTxnRef.trim()) { showError('Please enter the transaction reference from Pluxee app.'); return }
    if (isNaN(amt) || amt < 10) { showError('Amount must be at least ₹10.'); return }
    try {
      setPluxeeLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/wallet/pluxee-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ amount: amt, txn_ref: pluxeeTxnRef.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        showSuccess('Pluxee payment submitted! Admin will verify and credit your wallet shortly.')
        setPluxeeAmount('')
        setPluxeeTxnRef('')
      } else {
        showError(data.error || 'Failed to submit Pluxee payment.')
      }
    } catch {
      showError('Something went wrong. Please try again.')
    } finally {
      setPluxeeLoading(false)
    }
  }

  const loadWallet = async (userId) => {
    let { data: wallet } = await supabase
      .from('wallet').select('*').eq('user_id', userId).single()
    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallet').insert({ user_id: userId, balance: 0 }).select().single()
      wallet = newWallet
    }
    setWallet(wallet)
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
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session.user.id
      const { data: profile } = await supabase
        .from('profiles').select('full_name, phone').eq('id', userId).single()
      const rawPhone = profile?.phone || ''
      const digits = rawPhone.replace(/\D/g, '').slice(-10)
      const phone = digits.length === 10 ? '+91' + digits : ''
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const orderData = await orderRes.json()
      if (!orderData.orderId) {
        showError('Failed to create payment order')
        setRechargeLoading(false)
        return
      }
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Sri Krishnaa Dairy Farms',
        description: 'Wallet Recharge',
        image: '/Logo.jpg',
        order_id: orderData.orderId,
        prefill: { name: profile?.full_name || '', contact: phone },
        theme: { color: '#1a5c38' },
        handler: async function (response) {
          const verifyRes = await fetch('/api/wallet/recharge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId,
              amount,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            showSuccess('Wallet recharged successfully!')
            setTimeout(() => window.location.reload(), 1500)
          } else {
            showError('Payment verification failed!')
          }
        },
        modal: { ondismiss: () => setRechargeLoading(false) },
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
      <EmptyState loading />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <Header showBack backUrl="/dashboard" />

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Page Title */}
        <div className="mb-6">
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Prepaid Balance</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">My Wallet</h2>
          <p className="text-gray-400 text-sm mt-1">Manage your prepaid balance</p>
        </div>

        {/* Low Balance Warnings */}
        {wallet?.balance === 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 mb-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🚨</span>
            <div>
              <p className="text-red-700 font-bold text-sm">Wallet Empty — Deliveries Paused!</p>
              <p className="text-red-600 text-xs mt-1">Your wallet balance is ₹0. All subscription deliveries are on hold. Please add balance immediately to resume.</p>
              <Button
                variant="danger"
                size="sm"
                className="mt-2"
                onClick={() => document.getElementById('add-money')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Add Balance Now →
              </Button>
            </div>
          </div>
        )}
        {wallet?.balance > 0 && wallet?.balance < 300 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-orange-700 font-bold text-sm">Low Balance — Top Up Soon!</p>
              <p className="text-orange-600 text-xs mt-1">Your balance (₹{wallet.balance}) is below the minimum ₹300 required. Deliveries may be paused if not topped up.</p>
              <button
                onClick={() => document.getElementById('add-money')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-block mt-2 bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                Add Balance →
              </button>
            </div>
          </div>
        )}

        {/* Wallet Balance Card — custom gradient, kept as-is */}
        <div
          className="rounded-2xl p-8 mb-4 text-white relative overflow-hidden shadow-xl"
          style={{
            background: wallet?.balance === 0
              ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
              : wallet?.balance < 300
                ? 'linear-gradient(135deg, #78350f 0%, #b45309 100%)'
                : 'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)',
          }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #d4a017, transparent)' }} />
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, transparent, #d4a017, transparent)' }} />
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

        {/* Add Money */}
        <Card id="add-money" className="mb-6">
          <CardSection title="Add Money to Wallet">
            {/* Preset amounts */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[500, 1000, 2000].map(amount => (
                <Button
                  key={amount}
                  variant="secondary"
                  fullWidth
                  disabled={rechargeLoading}
                  onClick={() => handleRecharge(amount)}
                  className="py-3"
                >
                  Rs.{amount}
                </Button>
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
              <Button
                variant="primary"
                loading={rechargeLoading}
                disabled={!rechargeAmount}
                onClick={() => handleRecharge(parseFloat(rechargeAmount))}
                className="px-6"
              >
                Pay
              </Button>
            </div>
          </CardSection>
        </Card>

        {/* Pluxee (Sodexo) Payment */}
        {pluxeeQrUrl && (
          <Card id="pluxee-pay" className="mb-6">
            <CardSection title="Pay via Pluxee (Sodexo)">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <img src={pluxeeQrUrl} alt="Pluxee QR Code" className="w-36 h-36 rounded-xl border border-[#e8e0d0] object-contain bg-white p-1" />
                  <p className="text-[10px] text-gray-400 text-center">Scan with Pluxee / Sodexo app</p>
                </div>
                <div className="flex-1 flex flex-col gap-3 w-full">
                  <p className="text-xs text-gray-500">Scan the QR, pay the amount in your Pluxee app, then enter the transaction reference here for verification.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[200, 500, 1000].map(amt => (
                      <button key={amt}
                        onClick={() => setPluxeeAmount(String(amt))}
                        className={`py-2.5 rounded-xl text-sm font-semibold border transition ${pluxeeAmount === String(amt) ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'border-[#e8e0d0] text-[#1c1c1c] bg-[#fdfbf7] hover:border-[#1a5c38]'}`}>
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    placeholder="Or enter custom amount (₹)"
                    value={pluxeeAmount}
                    onChange={e => setPluxeeAmount(e.target.value)}
                    className="border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] w-full"
                  />
                  <input
                    type="text"
                    placeholder="Transaction reference (from Pluxee app)"
                    value={pluxeeTxnRef}
                    onChange={e => setPluxeeTxnRef(e.target.value)}
                    className="border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] w-full"
                  />
                  <Button
                    variant="primary"
                    loading={pluxeeLoading}
                    disabled={!pluxeeAmount || !pluxeeTxnRef.trim()}
                    onClick={handlePluxeeSubmit}
                    fullWidth
                  >
                    Submit for Verification
                  </Button>
                  <p className="text-[10px] text-gray-400">Admin will verify your Pluxee payment and credit your wallet within a few hours.</p>
                </div>
              </div>
            </CardSection>
          </Card>
        )}

        {/* Wallet Benefits */}
        <Card className="mb-6">
          <CardSection title="Wallet Benefits">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '⚡', title: 'Instant Deduction', desc: 'Auto-deducted daily' },
                { icon: '🎁', title: 'Bonus Credits',     desc: 'Rewards for loyalty' },
                { icon: '🔄', title: 'Easy Refund',       desc: 'Refundable anytime' },
                { icon: '📱', title: 'No Cash Needed',    desc: 'Hassle-free payments' },
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
          </CardSection>
        </Card>

        {/* Transaction History */}
        <Card padding="none">
          <CardSection title="Transaction History">
            {transactions.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No transactions yet"
                description="Add balance to get started"
                compact
              />
            ) : (
              <div className="-mx-5 sm:-mx-6 divide-y divide-[#f5f0e8]">
                {transactions.map((txn) => (
                  <div key={txn.id} className="px-5 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        txn.type === 'credit' ? 'bg-[#f0faf4]' : 'bg-red-50'
                      }`}>
                        {txn.type === 'credit'
                          ? '💰'
                          : <img src="/bottle.png" alt="Milk" className="w-6 h-6 object-contain" />}
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
                ))}
              </div>
            )}
          </CardSection>
        </Card>

      </div>
      <Footer variant="app" />
    </div>
  )
}
