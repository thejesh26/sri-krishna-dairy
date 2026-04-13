'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'

export default function DeliveryDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    out: 0,
    delivered: 0
  })
  const [historyOrders, setHistoryOrders] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [walletSearch, setWalletSearch] = useState('')
  const [walletCustomer, setWalletCustomer] = useState(null)
  const [walletAction, setWalletAction] = useState('add')
  const [walletAmount, setWalletAmount] = useState('')
  const [walletNote, setWalletNote] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)
  const { showSuccess, showError, showInfo } = useToast()
  const [deliveringId, setDeliveringId] = useState(null)
  const [deliveredSubs, setDeliveredSubs] = useState(new Set())
  const [deliverySort, setDeliverySort] = useState('area')
  const [addonOrders, setAddonOrders] = useState([])
  const [deliveredAddons, setDeliveredAddons] = useState(new Set())

  useEffect(() => { checkDelivery() }, [])

  const checkDelivery = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (!profile?.is_delivery && !profile?.is_admin) {
      router.push('/')
      return
    }

    setProfile(profile)
    await loadDeliveries(user.id, profile)
    setLoading(false)
  }

  const loadDeliveries = async (userId, profile) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    // Load today's orders assigned to this agent
    let ordersQuery = supabase
      .from('orders')
      .select('*, products(*), profiles(*)')
      .eq('delivery_date', today)
      .order('delivery_slot', { ascending: true })

    // If not admin, only show assigned orders
    if (!profile?.is_admin) {
      ordersQuery = ordersQuery.eq('assigned_to', userId)
    }

    const { data: allOrders } = await ordersQuery
    setOrders(allOrders || [])

    // Load today's subscriptions assigned to this agent (only started on/before today)
    let subsQuery = supabase
      .from('subscriptions')
      .select('*, products(*), profiles(*)')
      .eq('is_active', true)
      .lte('start_date', today)
      .order('delivery_slot', { ascending: true })

    if (!profile?.is_admin) {
      subsQuery = subsQuery.eq('assigned_to', userId)
    }

    const { data: allSubs } = await subsQuery
    setSubscriptions(allSubs || [])

    // Load today's add-on orders
    const { data: allAddons } = await supabase
      .from('addon_orders')
      .select('*, products(*), profiles!addon_orders_user_id_fkey(*)')
      .eq('delivery_date', today)
      .eq('status', 'pending')
    setAddonOrders(allAddons || [])

    // Calculate stats
    const allDeliveries = [...(allOrders || [])]
    setStats({
      total: allDeliveries.length,
      pending: allDeliveries.filter(o => o.status === 'pending').length,
      out: allDeliveries.filter(o => o.status === 'out_for_delivery').length,
      delivered: allDeliveries.filter(o => o.status === 'delivered').length,
    })
  }

  const updateStatus = async (orderId, status) => {
    // SECURITY: VULN-04 — delivery agents must only update orders assigned to them.
    // Without the assigned_to filter a delivery agent could mark any order as
    // "delivered" (including orders belonging to other agents) from the console.
    const ownershipFilter = profile?.is_admin
      ? supabase.from('orders').update({ status }).eq('id', orderId)
      : supabase.from('orders').update({ status }).eq('id', orderId).eq('assigned_to', user.id)

    const { error } = await ownershipFilter

    if (!error) {
      if (status === 'delivered') {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/delivery/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ type: 'order', order_id: orderId }),
        })
      }
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
      // Update stats
      const updated = orders.map(o => o.id === orderId ? { ...o, status } : o)
      setStats({
        total: updated.length,
        pending: updated.filter(o => o.status === 'pending').length,
        out: updated.filter(o => o.status === 'out_for_delivery').length,
        delivered: updated.filter(o => o.status === 'delivered').length,
      })
    }
  }

  const loadHistory = async () => {
    if (historyLoaded) return
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    let q = supabase
      .from('orders')
      .select('*, products(*), profiles(*)')
      .eq('status', 'delivered')
      .lt('delivery_date', today)
      .order('delivery_date', { ascending: false })
      .limit(100)
    if (!profile?.is_admin) q = q.eq('assigned_to', user.id)
    const { data } = await q
    setHistoryOrders(data || [])
    setHistoryLoaded(true)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'history') loadHistory()
  }

  const searchWalletCustomer = async () => {
    if (!walletSearch.trim()) return
    setWalletCustomer(null)
    // Search by phone or name
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, apartment_name, flat_number')
      .or(`phone.ilike.%${walletSearch.trim()}%,full_name.ilike.%${walletSearch.trim()}%`)
      .limit(5)

    if (!profiles || profiles.length === 0) {
      showInfo('No customer found.')
      return
    }

    // Get wallet for first match
    const profile = profiles[0]
    const { data: wallet } = await supabase
      .from('wallet').select('balance').eq('user_id', profile.id).maybeSingle()
    setWalletCustomer({ ...profile, balance: wallet?.balance || 0 })
  }

  const handleWalletUpdate = async () => {
    if (!walletCustomer) return
    const amt = parseFloat(walletAmount)
    if (!walletAmount || isNaN(amt) || amt < 0) {
      showError('Enter a valid amount.')
      return
    }
    setWalletLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/wallet-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        target_user_id: walletCustomer.id,
        action: walletAction,
        amount: amt,
        note: walletNote || undefined,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Could not update wallet.')
    } else {
      showSuccess(`Done! New balance: Rs.${result.new_balance}`)
      setWalletCustomer({ ...walletCustomer, balance: result.new_balance })
      setWalletAmount('')
      setWalletNote('')
    }
    setWalletLoading(false)
  }

  const handleMarkSubDelivered = async (subId, bottleReturned = true, notDelivered = false) => {
    setDeliveringId(subId)
    const { data: { session } } = await supabase.auth.getSession()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    await fetch('/api/delivery/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        type: 'subscription',
        subscription_id: subId,
        delivery_date: today,
        bottle_returned: bottleReturned,
        not_delivered: notDelivered,
      }),
    })
    setDeliveredSubs(prev => new Set([...prev, subId]))
    setDeliveringId(null)
  }

  const handleMarkOrderDelivered = async (orderId) => {
    setDeliveringId(orderId)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/delivery/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ type: 'order', order_id: orderId }),
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'delivered' } : o))
    setDeliveringId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <div className="text-center">
        <img src="/Logo.jpg" alt="Sri Krishnaa Dairy"
          className="h-20 w-20 rounded-full mx-auto border-4 border-[#d4a017] object-cover shadow-lg mb-4" />
        <p className="text-[#1a5c38] font-semibold">Loading deliveries...</p>
      </div>
    </div>
  )

  const filteredOrders = (activeTab === 'pending'
    ? orders.filter(o => o.status === 'pending')
    : activeTab === 'out'
    ? orders.filter(o => o.status === 'out_for_delivery')
    : activeTab === 'delivered'
    ? orders.filter(o => o.status === 'delivered')
    : orders
  ).slice().sort((a, b) => {
    const pa = a.profiles, pb = b.profiles
    if (deliverySort === 'area') return (pa?.area || '').localeCompare(pb?.area || '')
    if (deliverySort === 'building') return (pa?.apartment_name || '').localeCompare(pb?.apartment_name || '')
    return (pa?.full_name || '').localeCompare(pb?.full_name || '')
  })

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 rounded-full object-cover border-2 border-[#d4a017]" />
          <div>
            <h1 className="text-sm font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Delivery Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] text-xs font-semibold px-3 py-1 rounded-full">
            🚴 {profile?.full_name?.split(' ')[0]}
          </span>
          <button onClick={handleLogout}
            className="border border-red-200 text-red-400 font-medium px-3 py-1.5 rounded text-xs hover:bg-red-50 transition">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Date & Summary */}
        <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden shadow-lg"
          style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
            style={{background:'radial-gradient(circle, #d4a017, transparent)'}}></div>
          <div className="relative z-10">
            <p className="text-green-300 text-xs font-medium uppercase tracking-widest mb-1">Today's Deliveries</p>
            <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white mb-4">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total', value: stats.total, color: 'text-white' },
                { label: 'Pending', value: stats.pending, color: 'text-yellow-300' },
                { label: 'Out', value: stats.out, color: 'text-blue-300' },
                { label: 'Done', value: stats.delivered, color: 'text-[#d4a017]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`font-[family-name:var(--font-playfair)] text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-green-300 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription Deliveries */}
        {subscriptions.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden mb-5 shadow-sm">
            <div className="px-5 py-4 border-b border-[#f5f0e8] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">
                  Subscription Deliveries
                </h3>
                <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-bold px-3 py-1 rounded-full border border-[#f0dfa0]">
                  {subscriptions.length} customers
                </span>
              </div>
              <select value={deliverySort} onChange={e => setDeliverySort(e.target.value)}
                className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-1.5 text-[#1c1c1c] bg-[#fdfbf7] focus:outline-none focus:border-[#1a5c38]">
                <option value="area">Sort by Area</option>
                <option value="building">Sort by Building</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
            {[...subscriptions].sort((a, b) => {
              const pa = a.profiles, pb = b.profiles
              if (deliverySort === 'area') return (pa?.area || '').localeCompare(pb?.area || '')
              if (deliverySort === 'building') return (pa?.apartment_name || '').localeCompare(pb?.apartment_name || '')
              return (pa?.full_name || '').localeCompare(pb?.full_name || '')
            }).map((sub, index) => (
              <div key={sub.id}
                className={`px-5 py-4 ${index !== subscriptions.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {sub.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1c1c1c] text-sm">{sub.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{sub.profiles?.apartment_name}, Flat {sub.profiles?.flat_number}</p>
                    <p className="text-xs text-gray-400">{sub.profiles?.area}</p>
                    {sub.profiles?.landmark && (
                      <p className="text-xs text-[#d4a017]">📍 Near: {sub.profiles?.landmark}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs px-2 py-0.5 rounded-full">
                        {sub.products?.size} x {sub.quantity}
                      </span>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full">
                        {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <a href={`tel:${sub.profiles?.phone}`}
                      className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                      📞 Call
                    </a>
                    <a href={`https://wa.me/91${sub.profiles?.phone}`} target="_blank"
                      className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 inline" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WA
                    </a>
                    {deliveredSubs.has(sub.id) ? (
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] text-center">✅ Done</span>
                    ) : deliveringId === sub.id ? (
                      <span className="text-xs text-gray-400 px-3 py-1.5">...</span>
                    ) : (
                      <>
                        <button onClick={() => handleMarkSubDelivered(sub.id, true, false)}
                          className="bg-[#1a5c38] text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-[#14472c] transition w-full">
                          ✅ Returned
                        </button>
                        <button onClick={() => handleMarkSubDelivered(sub.id, false, false)}
                          className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-orange-600 transition w-full">
                          ⚠️ Not Returned
                        </button>
                        <button onClick={() => handleMarkSubDelivered(sub.id, false, true)}
                          className="bg-red-500 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-red-600 transition w-full">
                          ❌ Not Delivered
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add-on Orders */}
        {addonOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0dfa0] overflow-hidden mb-5 shadow-sm">
            <div className="px-5 py-4 border-b border-[#f5f0e8] flex items-center gap-2">
              <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">Extra Orders (Add-ons)</h3>
              <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-bold px-3 py-1 rounded-full border border-[#f0dfa0]">
                EXTRA
              </span>
            </div>
            {addonOrders.map((addon, index) => (
              <div key={addon.id}
                className={`px-5 py-4 ${index !== addonOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#d4a017] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {addon.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#1c1c1c] text-sm">{addon.profiles?.full_name}</p>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#f0dfa0]">EXTRA</span>
                    </div>
                    <p className="text-xs text-gray-400">{addon.profiles?.apartment_name}, Flat {addon.profiles?.flat_number}</p>
                    <p className="text-xs text-gray-400">{addon.profiles?.area}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                        {addon.products?.size} × {addon.quantity}
                      </span>
                      <span className="text-xs text-gray-400">{addon.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <a href={`tel:${addon.profiles?.phone}`}
                      className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                      📞 Call
                    </a>
                    {deliveredAddons.has(addon.id) ? (
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] text-center">✅ Done</span>
                    ) : (
                      <button onClick={async () => {
                        await supabase.from('addon_orders').update({ status: 'delivered' }).eq('id', addon.id)
                        setDeliveredAddons(prev => new Set([...prev, addon.id]))
                      }}
                        className="bg-[#d4a017] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#b8860b] transition">
                        ✓ Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Tabs */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <select value={deliverySort} onChange={e => setDeliverySort(e.target.value)}
            className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 text-[#1c1c1c] bg-white focus:outline-none focus:border-[#1a5c38] shadow-sm">
            <option value="area">Sort by Area</option>
            <option value="building">Sort by Building</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
        <div className="flex gap-1 mb-4 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'all',       label: 'All',       count: stats.total     },
            { id: 'pending',   label: 'Pending',   count: stats.pending   },
            { id: 'out',       label: 'Out',        count: stats.out      },
            { id: 'delivered', label: 'Done',       count: stats.delivered },
            { id: 'history',   label: '📋 History', count: null            },
            ...(profile?.is_admin ? [{ id: 'wallet', label: '💳 Wallet', count: null }] : []),
          ].map(({ id, label, count }) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[#1a5c38] text-white shadow'
                  : 'text-gray-500 hover:text-[#1a5c38]'
              }`}>
              {label}
              {count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === id ? 'bg-white text-[#1a5c38]' : 'bg-gray-100'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            {/* Daily Summary */}
            {historyOrders.length > 0 && (() => {
              const byDate = historyOrders.reduce((acc, o) => {
                const d = o.delivery_date
                if (!acc[d]) acc[d] = []
                acc[d].push(o)
                return acc
              }, {})
              return Object.entries(byDate).slice(0, 14).map(([date, dayOrders]) => (
                <div key={date} className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#f5f0e8] flex items-center justify-between bg-[#fdfbf7]">
                    <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-sm">
                      {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-2.5 py-1 rounded-full border border-[#c8e6d4]">
                        ✅ {dayOrders.length} delivered
                      </span>
                    </div>
                  </div>
                  {dayOrders.map((order, idx) => (
                    <div key={order.id}
                      className={`px-5 py-3 flex items-center gap-3 ${idx !== dayOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {order.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#1c1c1c] text-sm">{order.profiles?.full_name}</p>
                        <p className="text-xs text-gray-400">{order.profiles?.apartment_name}, {order.profiles?.area}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-[#1a5c38]">{order.products?.size} x{order.quantity}</p>
                        <p className="text-xs text-gray-400">{order.delivery_slot === 'morning' ? '🌅' : '🌆'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            })()}
            {historyOrders.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#e8e0d0] px-5 py-12 text-center shadow-sm">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-gray-400 text-sm">No delivery history yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Wallet Management Tab */}
        {activeTab === 'wallet' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-[#e8e0d0] p-5 shadow-sm">
              <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-4">Customer Wallet Management</p>

              {/* Search */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={walletSearch}
                  onChange={e => setWalletSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchWalletCustomer()}
                  className="flex-1 border border-[#e8e0d0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]"
                />
                <button onClick={searchWalletCustomer}
                  className="bg-[#1a5c38] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition">
                  Search
                </button>
              </div>

              {/* Customer found */}
              {walletCustomer && (
                <div>
                  <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-4">
                    <p className="font-bold text-[#1a5c38] text-sm">{walletCustomer.full_name}</p>
                    <p className="text-xs text-gray-500">{walletCustomer.apartment_name}, Flat {walletCustomer.flat_number} · {walletCustomer.phone}</p>
                    <p className="text-lg font-bold text-[#1a5c38] mt-2">Balance: Rs.{walletCustomer.balance}</p>
                  </div>

                  {/* Action selector */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[['add', '+ Add'], ['deduct', '- Deduct'], ['set', '= Set to']].map(([val, label]) => (
                      <button key={val} onClick={() => setWalletAction(val)}
                        className={`py-2 rounded-lg text-sm font-bold border-2 transition ${
                          walletAction === val
                            ? val === 'deduct' ? 'border-red-400 bg-red-50 text-red-600' : 'border-[#1a5c38] bg-[#f0faf4] text-[#1a5c38]'
                            : 'border-[#e8e0d0] text-gray-500'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <input type="number" placeholder="Amount (Rs.)" value={walletAmount}
                    onChange={e => setWalletAmount(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] mb-2" />
                  <input type="text" placeholder="Note (optional)" value={walletNote}
                    onChange={e => setWalletNote(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] mb-3" />

                  <button onClick={handleWalletUpdate} disabled={walletLoading}
                    className={`w-full text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50 ${
                      walletAction === 'deduct' ? 'bg-red-500 hover:bg-red-600' : 'hover:opacity-90'
                    }`}
                    style={walletAction !== 'deduct' ? {background:'linear-gradient(135deg,#1a5c38,#2d7a50)'} : {}}>
                    {walletLoading ? 'Updating...' : walletAction === 'add' ? 'Add Balance' : walletAction === 'deduct' ? 'Deduct Balance' : 'Set Balance'}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Today's Orders List */}
        {activeTab !== 'history' && activeTab !== 'wallet' && (
        <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
          {filteredOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-5xl mb-3">
                {activeTab === 'delivered' ? '🎉' : '📭'}
              </div>
              <p className="text-gray-400 text-sm">
                {activeTab === 'delivered' ? 'No deliveries completed yet' :
                 activeTab === 'pending' ? 'No pending deliveries!' :
                 activeTab === 'out' ? 'No deliveries out yet' :
                 'No orders for today'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order, index) => (
              <div key={order.id}
                className={`px-5 py-4 ${index !== filteredOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {order.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1c1c1c] text-sm">{order.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{order.profiles?.apartment_name}, Flat {order.profiles?.flat_number}</p>
                    <p className="text-xs text-gray-400">{order.profiles?.area}</p>
                    {order.profiles?.landmark && (
                      <p className="text-xs text-[#d4a017]">📍 Near: {order.profiles?.landmark}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs px-2 py-0.5 rounded-full">
                        {order.products?.size} x {order.quantity}
                      </span>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full">
                        {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </span>
                      <span className="bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                        COD ₹{order.total_price}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <a href={`tel:${order.profiles?.phone}`}
                      className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                      📞 Call
                    </a>
                    <a href={`https://wa.me/91${order.profiles?.phone}`} target="_blank"
                      className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 inline" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WA
                    </a>
                  </div>
                </div>

                {/* Status Buttons */}
                <div className="flex gap-2 mt-3 ml-13">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(order.id, 'out_for_delivery')}
                      className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded-lg hover:bg-blue-100 transition">
                      🚴 Out for Delivery
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'out_for_delivery') && (
                    <button
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="flex-1 text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition"
                      style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                      ✅ Mark Delivered
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <span className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded-lg text-center">
                      🚴 Out for Delivery
                    </span>
                  )}
                  {order.status === 'delivered' && (
                    <span className="flex-1 bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] text-xs font-bold py-2 rounded-lg text-center">
                      ✅ Delivered
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        )}

      </div>
    </div>
  )
}