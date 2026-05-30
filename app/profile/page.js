'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import Footer from '../components/Footer'
import { TabBar, EmptyState, StatusBadge } from '../components/ui'

function ProfileInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    full_name: '', phone: '', area: '',
    apartment_name: '', flat_number: '', landmark: '', pincode: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showSuccess, showError } = useToast()

  // Tabs — pre-select from ?tab= URL param
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab')
      if (['profile', 'orders', 'transactions'].includes(t)) return t
    }
    return 'profile'
  })

  // History — lazy loaded on first tab switch
  const [orders, setOrders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [transactionsLoaded, setTransactionsLoaded] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  const serviceAreas = [
    'Kattigenahalli', 'Hunasamaranahalli', 'Chidananda Reddy Layout',
    'Niranthara Layout', 'Muneshwar Nagar', 'Sathanur', 'Venkatala',
    'Bagalur Cross', 'Palahalli', 'Kogilu', 'Srinivasapura',
  ]

  useEffect(() => {
    getUser().then(() => {
      // Fire lazy loads if the page opened directly on orders/transactions tab
      const t = searchParams?.get('tab')
      if (t === 'orders' || t === 'transactions') handleTabChange(t)
    })
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user)

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()

    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        area: profile.area || '',
        apartment_name: profile.apartment_name || '',
        flat_number: profile.flat_number || '',
        landmark: profile.landmark || '',
        pincode: profile.pincode || '',
      })
    }
    setLoading(false)
  }

  const handleTabChange = async (id) => {
    setActiveTab(id)

    // Lazy fetch — only on first open
    if (id === 'orders' && !ordersLoaded) {
      setOrdersLoading(true)
      const { data } = await supabase
        .from('orders')
        .select('id, delivery_date, delivery_slot, status, total_price, quantity, products(size)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setOrders(data || [])
      setOrdersLoaded(true)
      setOrdersLoading(false)
    }

    if (id === 'transactions' && !transactionsLoaded) {
      setTransactionsLoading(true)
      const { data } = await supabase
        .from('wallet_transactions')
        .select('id, description, amount, type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setTransactions(data || [])
      setTransactionsLoaded(true)
      setTransactionsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone') {
      setForm({ ...form, phone: value.replace(/\D/g, '').slice(0, 10) })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.phone && form.phone.replace(/\D/g, '').length !== 10) {
      showError('Phone number must be exactly 10 digits.')
      return
    }
    setSaving(true)
    const fullAddress = `${form.apartment_name}, ${form.flat_number}, ${form.area}${form.pincode ? ' - ' + form.pincode : ''}, Bangalore`
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone,
        area: form.area,
        apartment_name: form.apartment_name,
        flat_number: form.flat_number,
        landmark: form.landmark,
        pincode: form.pincode,
        address: fullAddress,
      })
      .eq('id', user.id)

    if (error) showError(error.message)
    else showSuccess('Profile updated successfully!')
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <EmptyState loading />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium tracking-wide">FARM FRESH - PURE - NATURAL</p>
          </div>
        </a>
        <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Dashboard
        </a>
      </header>

      <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">

        {/* Page header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#1a5c38] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg">
            {form.full_name?.[0] || '?'}
          </div>
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c]">
            {form.full_name || 'My Account'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
        </div>

        {/* Tabs */}
        <TabBar
          tabs={[
            { id: 'profile',      label: 'Profile',      icon: '👤' },
            { id: 'orders',       label: 'My Orders',    icon: '📦' },
            { id: 'transactions', label: 'Transactions', icon: '💰' },
          ]}
          active={activeTab}
          onChange={handleTabChange}
          variant="pills"
          className="mb-6"
        />

        {/* ── Profile Tab ────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e0d0] p-6">
            <form onSubmit={handleSave} className="flex flex-col gap-4">

              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Full Name</label>
                  <input name="full_name" value={form.full_name} onChange={handleChange} required
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} required
                    maxLength={10} inputMode="numeric" pattern="[0-9]{10}"
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                </div>
              </div>

              {/* Email (read only) */}
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Email Address</label>
                <input value={user?.email} disabled
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              {/* Delivery Address */}
              <div className="border-t border-[#e8e0d0] pt-4 mt-2">
                <p className="text-xs font-semibold text-[#d4a017] uppercase tracking-widest mb-4">Delivery Address</p>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Area</label>
                  <select name="area" value={form.area} onChange={handleChange} required
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                    <option value="">-- Select your area --</option>
                    {serviceAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                    <option value="Other">Other (Near Kattigenahalli)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Building / House Name</label>
                    <input name="apartment_name" value={form.apartment_name} onChange={handleChange} required
                      autoComplete="address-line1"
                      className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Flat / Door Number</label>
                    <input name="flat_number" value={form.flat_number} onChange={handleChange} required
                      autoComplete="address-line2"
                      className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Landmark (Optional)</label>
                    <input name="landmark" value={form.landmark} onChange={handleChange}
                      placeholder="Eg: Near main gate"
                      autoComplete="off"
                      className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Pincode</label>
                    <input name="pincode" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="560064"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="text-white py-3 rounded-lg font-bold hover:opacity-90 transition mt-2 shadow disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1a5c38, #2d7a50)' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#e8e0d0] text-center">
              <a href="/forgot-password" className="text-[#d4a017] font-semibold text-sm hover:underline">
                Change Password
              </a>
            </div>
          </div>
        )}

        {/* ── My Orders Tab ──────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e0d0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f5f0e8]">
              <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">My Orders</h3>
              <p className="text-xs text-gray-400 mt-0.5">{orders.length} total orders</p>
            </div>

            {ordersLoading ? (
              <EmptyState loading />
            ) : orders.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No orders yet"
                description="Place your first order to see it here."
                action={{ label: 'Order Now', href: '/order' }}
              />
            ) : (
              <div className="divide-y divide-[#f5f0e8]">
                {orders.map(order => (
                  <div key={order.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 p-1.5">
                      <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1c1c1c] text-sm">
                        {order.products?.size} × {order.quantity}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.delivery_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={order.status} size="sm" />
                      <p className="font-bold text-[#1a5c38] text-sm">₹{order.total_price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Transactions Tab ───────────────────────────────── */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e0d0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f5f0e8] flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">Transactions</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 50 transactions</p>
              </div>
              <a href="/wallet" className="text-xs text-[#1a5c38] font-semibold border border-[#c8e6d4] bg-[#f0faf4] px-3 py-1.5 rounded-full hover:bg-[#d4eddf] transition">
                View Wallet →
              </a>
            </div>

            {transactionsLoading ? (
              <EmptyState loading />
            ) : transactions.length === 0 ? (
              <EmptyState
                icon="💳"
                title="No transactions yet"
                description="Your wallet history will appear here."
                action={{ label: 'Add Balance', href: '/wallet' }}
              />
            ) : (
              <div className="divide-y divide-[#f5f0e8]">
                {transactions.map(txn => (
                  <div key={txn.id} className="px-6 py-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
                      txn.type === 'credit' ? 'bg-[#f0faf4]' : 'bg-red-50'
                    }`}>
                      {txn.type === 'credit' ? '💰' : '🥛'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1c1c1c] truncate">{txn.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <p className={`font-bold text-sm flex-shrink-0 ${
                      txn.type === 'credit' ? 'text-[#1a5c38]' : 'text-red-500'
                    }`}>
                      {txn.type === 'credit' ? '+' : '−'}₹{txn.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <Footer variant="app" />
    </div>
  )
}

export default function Profile() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center"><p className="text-[#1a5c38] font-semibold">Loading...</p></div>}>
      <ProfileInner />
    </Suspense>
  )
}
