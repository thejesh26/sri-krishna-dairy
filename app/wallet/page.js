'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Wallet() {
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => { getUser() }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
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

        {/* Wallet Balance Card */}
        <div className="rounded-2xl p-8 mb-6 text-white relative overflow-hidden shadow-xl"
          style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{background:'radial-gradient(circle, #d4a017, transparent)'}}></div>
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{background:'linear-gradient(90deg, transparent, #d4a017, transparent)'}}></div>
          <div className="relative z-10">
            <p className="text-green-300 text-xs font-medium uppercase tracking-widest mb-2">Available Balance</p>
            <p className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-white mb-1">
              Rs.{wallet?.balance || 0}
            </p>
            <p className="text-green-300 text-sm">Sri Krishnaa Dairy Wallet</p>
          </div>
        </div>

        {/* How to Add Balance */}
        <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-5 mb-6">
          <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-2">How to Add Balance?</p>
          <p className="text-sm text-gray-500 mb-3">
            To add balance to your wallet, please contact us on WhatsApp or call us. We'll add the balance manually after receiving payment.
          </p>
          <div className="flex gap-3">
            <a href="https://wa.me/918553666002?text=Hi, I want to add balance to my Sri Krishnaa Dairy wallet"
              target="_blank"
              className="flex items-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1da851] transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Us
            </a>
            <a href="tel:8553666002"
              className="flex items-center gap-2 bg-[#1a5c38] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#14472c] transition">
              📞 Call Us
            </a>
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
    </div>
  )
}