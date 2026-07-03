'use client'
import { useState, useEffect } from 'react'

function isDeliveryDay(sub, dateStr) {
  const freq = sub.delivery_frequency || 'daily'
  if (freq === 'daily') return true
  const start = new Date(sub.start_date + 'T00:00:00+05:30')
  const checkDate = dateStr
    ? new Date(dateStr + 'T00:00:00+05:30')
    : new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30')
  const daysDiff = Math.round((checkDate - start) / (1000 * 60 * 60 * 24))
  if (freq === 'alternate') return daysDiff % 2 === 0
  if (freq === 'weekly') return daysDiff % 7 === 0
  return true
}

function parseAddress(addressText) {
  if (!addressText) return { tower: null, flat: null }
  const text = addressText.toLowerCase()
  const towerMatch = text.match(/tower[\s-]*(\d+[a-z]?)|(?:^|\s)t(\d+)\b|block[\s-]*([a-z0-9]+)/i)
  const tower = towerMatch ? (towerMatch[1] || towerMatch[2] || towerMatch[3]) : null
  const numbers = text.match(/\d+/g) || []
  const flat = numbers.length > 0 ? numbers.reduce((a, b) => b.length >= a.length ? b : a) : null
  return { tower, flat: flat ? String(flat) : null }
}

function parseFilterQuery(query) {
  const match = query.trim().match(/^t?(\d+)\s+(\d+)$/i)
  if (match) return { tower: match[1], flatPrefix: match[2] }
  const towerOnly = query.trim().match(/^t?(\d+)$/i)
  if (towerOnly) return { tower: towerOnly[1], flatPrefix: null }
  return null
}

function matchesAddressFilter(item, query) {
  if (!query.trim()) return true
  const parsed = parseFilterQuery(query)
  if (!parsed) return false
  const addr = parseAddress((item.profiles?.apartment_name || '') + ' ' + (item.profiles?.flat_number || ''))
  if (addr.tower !== parsed.tower) return false
  if (parsed.flatPrefix && !addr.flat?.startsWith(parsed.flatPrefix)) return false
  return true
}

function AddressBadge({ profile }) {
  const combined = [profile?.apartment_name, profile?.flat_number].filter(Boolean).join(' ')
  const { tower, flat } = parseAddress(combined)
  if (!tower && !flat) return null
  const parts = []
  if (tower) parts.push(`T${tower.toUpperCase()}`)
  if (flat) parts.push(flat)
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
      🏢 {parts.join(' · ')}
    </span>
  )
}

function FreqBadge({ freq }) {
  if (!freq || freq === 'daily') return null
  return freq === 'alternate'
    ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">🔄 Every 2 Days</span>
    : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">📅 Weekly</span>
}
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonStatCard } from '../components/Skeleton'

export default function AdminDashboard() {
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [overviewSubTab, setOverviewSubTab] = useState('today')
  const [upcomingDeliveries, setUpcomingDeliveries] = useState({})
  const [upcomingLoaded, setUpcomingLoaded] = useState(false)
  const [ordersSubTab, setOrdersSubTab] = useState('pending')
  const [deliveredSubHistory, setDeliveredSubHistory] = useState([])
  const [deliveredSubHistoryLoaded, setDeliveredSubHistoryLoaded] = useState(false)
  const [orders, setOrders] = useState([])
  const [addonOrders, setAddonOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [customers, setCustomers] = useState([])
  const [todayOrders, setTodayOrders] = useState([])
  const [todayAddons, setTodayAddons] = useState([])
  const [todaySubscriptions, setTodaySubscriptions] = useState([])
  const [subDeliveryStatuses, setSubDeliveryStatuses] = useState({})
  const [subDeliveryCounts, setSubDeliveryCounts] = useState({})
  const [deliveryAgents, setDeliveryAgents] = useState([])
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [stopSubPopup, setStopSubPopup] = useState(null)
  const [stoppingSubId, setStoppingSubId] = useState(null)
  const [showCancelledSubs, setShowCancelledSubs] = useState(false)
  const [reactivatingSubId, setReactivatingSubId] = useState(null)
  const [wallets, setWallets] = useState([])
  const [walletsWithProfiles, setWalletsWithProfiles] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [walletAmount, setWalletAmount] = useState('')
  const [walletNote, setWalletNote] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletMessage, setWalletMessage] = useState('')
  const [deductionLoading, setDeductionLoading] = useState(false)
  const [deductionResult, setDeductionResult] = useState(null)
  const [products, setProducts] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [productSaving, setProductSaving] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [missedReports, setMissedReports] = useState([])
  const [bulkEnquiries, setBulkEnquiries] = useState([])
  const [qualityReports, setQualityReports] = useState([])
  const [refundingUserId, setRefundingUserId] = useState(null)
  const [refundModal, setRefundModal] = useState(null) // { customer, depositBalance }
  const [refundGoodBottles, setRefundGoodBottles] = useState('')
  const [refundDamagedBottles, setRefundDamagedBottles] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [refundProcessing, setRefundProcessing] = useState(false)
  const [failedDeductions, setFailedDeductions] = useState([])
  const [discountCodes, setDiscountCodes] = useState([])
  const [newCode, setNewCode] = useState({ code: '', percent: '', description: '', one_time_per_customer: true, applies_to: 'all' })
  const [discountSaving, setDiscountSaving] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSubscriptions: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  })
  // Settings tab state
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [appSettings, setAppSettings] = useState({
    max_subscribers: '',
    delivery_cutoff_time: '18:00',
    waitlist_enabled: 'true',
    maintenance_mode: 'false',
    min_wallet_balance: '300',
    pause_limit_per_month: '5',
    morning_slot_enabled: 'true',
    evening_slot_enabled: 'true',
    trial_order_enabled: 'true',
    bottle_deposit_amount: '200',
    holidays: '[]',
  })
  const [settingsSaving, setSettingsSaving] = useState({})
  const [editProducts, setEditProducts] = useState({})
  const [newProduct, setNewProduct] = useState({ name: '', size: '', price: '', is_available: true })
  const [productAddLoading, setProductAddLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [expandedCustomer, setExpandedCustomer] = useState(null)
  const [customerDetails, setCustomerDetails] = useState({})
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState({})
  const [settingsCustomers, setSettingsCustomers] = useState([])
  const [extendDaysMap, setExtendDaysMap] = useState({})
  const [pauseDateMap, setPauseDateMap] = useState({})
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastConfirm, setBroadcastConfirm] = useState(false)
  const [referralCheckLoading, setReferralCheckLoading] = useState(false)
  const [referralCheckResult, setReferralCheckResult] = useState(null)
  const [waitlistEntries, setWaitlistEntries] = useState([])
  const [newHoliday, setNewHoliday] = useState('')
  const [invitingId, setInvitingId] = useState(null)
  const [resendWaLoading, setResendWaLoading] = useState({})
  const [customWaModal, setCustomWaModal] = useState(null)
  const [customWaMessage, setCustomWaMessage] = useState('')
  const [customWaType, setCustomWaType] = useState('custom')
  const [customWaLoading, setCustomWaLoading] = useState(false)
  const [walletsLastUpdated, setWalletsLastUpdated] = useState(null)
  const [deliveryHistory, setDeliveryHistory] = useState([])
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  })
  const [historyEndDate, setHistoryEndDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  )
  const [historyAgentFilter, setHistoryAgentFilter] = useState('')
  const [reportsSubTab, setReportsSubTab] = useState('missed')
  const [suggestions, setSuggestions] = useState([])
  const [deliveryIssues, setDeliveryIssues] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [cancelledSubCounts, setCancelledSubCounts] = useState({})
  const [stopCancelledBy, setStopCancelledBy] = useState('admin')
  const [stopCancellationReason, setStopCancellationReason] = useState('')
  const [customersSubTab, setCustomersSubTab] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [customerListSearch, setCustomerListSearch] = useState('')
  const [todayAddressFilter, setTodayAddressFilter] = useState('')
  const [ordersAddressFilter, setOrdersAddressFilter] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [addCustomerForm, setAddCustomerForm] = useState({ full_name: '', phone: '', apartment_name: '', flat_number: '', area: '', landmark: '' })
  const [addCustomerLoading, setAddCustomerLoading] = useState(false)
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsFilter, setLeadsFilter] = useState('all')
  const [walletRequests, setWalletRequests] = useState([])
  const [inlineWallet, setInlineWallet] = useState({})
  const [agentsSubTab, setAgentsSubTab] = useState('list')
  const [deliveryAgentRecords, setDeliveryAgentRecords] = useState([])
  const [agentForm, setAgentForm] = useState({ full_name: '', phone: '', email: '', password: '', address: '', dl_number: '', bike_number: '' })
  const [agentPhoto, setAgentPhoto] = useState(null)
  const [agentDoc, setAgentDoc] = useState(null)
  const [agentSaving, setAgentSaving] = useState(false)
  const [convertDepositModal, setConvertDepositModal] = useState(null) // { customer, balance }
  const [convertDepositAmount, setConvertDepositAmount] = useState('')
  const [convertDepositNote, setConvertDepositNote] = useState('')
  const [convertDepositLoading, setConvertDepositLoading] = useState(false)
  const [notifBellOpen, setNotifBellOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifUnread, setNotifUnread] = useState(0)
  const [notifLoaded, setNotifLoaded] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignAreaFilter, setAssignAreaFilter] = useState('all')
  const [assignDateFilter, setAssignDateFilter] = useState('')
  const [assignSlotFilter, setAssignSlotFilter] = useState('all')
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsLoaded, setTransactionsLoaded] = useState(false)
  const [txStartDate, setTxStartDate] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  })
  const [txEndDate, setTxEndDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  )
  const [txTypeFilter, setTxTypeFilter] = useState('all')
  const [addOrderType, setAddOrderType] = useState('trial')
  const [addOrderCustomer, setAddOrderCustomer] = useState(null)
  const [addOrderSearch, setAddOrderSearch] = useState('')
  const [addOrderSearchResults, setAddOrderSearchResults] = useState([])
  const [addOrderProduct, setAddOrderProduct] = useState(null)
  const [addOrderQuantity, setAddOrderQuantity] = useState(1)
  const [addOrderSlot, setAddOrderSlot] = useState('morning')
  const [addOrderDate, setAddOrderDate] = useState('')
  const [addOrderFrequency, setAddOrderFrequency] = useState('daily')
  const [addOrderSubType, setAddOrderSubType] = useState('ongoing')
  const [addOrderEndDate, setAddOrderEndDate] = useState('')
  const [addOrderDiscount, setAddOrderDiscount] = useState(0)
  const [addOrderLoading, setAddOrderLoading] = useState(false)
  const [addOrderExtraDates, setAddOrderExtraDates] = useState([])
  const [addOrderExtraDateInput, setAddOrderExtraDateInput] = useState('')

  useEffect(() => { checkAdmin() }, [])
  useEffect(() => {
    if (!notifBellOpen) return
    const close = (e) => { if (!e.target.closest('[data-notif-bell]')) setNotifBellOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [notifBellOpen])

  useEffect(() => {
    if (activeTab !== 'customers') return
    const interval = setInterval(() => { loadWallets() }, 30000)
    return () => clearInterval(interval)
  }, [activeTab])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const user = session.user
    setUser(user)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      router.push('/')
      return
    }

    if (!profile.is_admin) {
      router.push('/')
      return
    }

    setProfile(profile)
    await loadAllData()
    setLoading(false)
  }

  const loadAllData = async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data: { session } } = await supabase.auth.getSession()
    const authHeader = { Authorization: `Bearer ${session?.access_token}` }

    try {
      // Round 1: all independent fetches in parallel
      const [
        { orders: allOrders = [] },
        { subscriptions: allSubs = [] },
        { addonOrders: allAddons = [] },
        { todaySubRevenue = 0, monthSubRevenue = 0 },
        { data: allProducts },
        { data: allReviews },
        { data: allReports },
        { data: enquiries },
        { data: custSuggestions },
        { data: agentIssues },
        { data: qFeedback },
        { data: codes },
        { data: failedDeds },
        { data: walletReqs },
        { data: allCustomers },
        { data: daRecords },
      ] = await Promise.all([
        fetch('/api/admin/orders', { headers: authHeader }).then(r => r.json()),
        fetch('/api/admin/subscriptions', { headers: authHeader }).then(r => r.json()),
        fetch('/api/admin/addon-orders', { headers: authHeader }).then(r => r.json()),
        fetch('/api/admin/revenue', { headers: authHeader }).then(r => r.json()),
        supabase.from('products').select('*').order('size'),
        supabase.from('reviews').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }),
        supabase.from('missed_delivery_reports').select('*, profiles(full_name, phone, apartment_name, flat_number, area), orders(delivery_date, delivery_slot, products(size))').order('reported_at', { ascending: false }),
        supabase.from('bulk_enquiries').select('*').order('created_at', { ascending: false }),
        supabase.from('customer_suggestions').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }),
        supabase.from('delivery_issues').select('*').order('created_at', { ascending: false }),
        supabase.from('quality_feedback').select('*, profiles(full_name, phone), orders(delivery_date, products(size))').order('reported_at', { ascending: false }),
        supabase.from('discount_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('failed_deductions').select('*').order('created_at', { ascending: false }),
        supabase.from('wallet_requests').select('*, requester:profiles!wallet_requests_requested_by_fkey(full_name, phone), target:profiles!wallet_requests_target_user_id_fkey(full_name, phone)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('delivery_agents').select('*'),
      ])

      // Set state for all round 1 results
      setOrders(allOrders)
      setAddonOrders(allAddons)
      setSubscriptions(allSubs)
      setProducts(allProducts || [])
      setReviews(allReviews || [])
      setMissedReports(allReports || [])
      setBulkEnquiries(enquiries || [])
      setSuggestions(custSuggestions || [])
      setDeliveryIssues(agentIssues || [])
      setQualityReports(qFeedback || [])
      setDiscountCodes(codes || [])
      setFailedDeductions(failedDeds || [])
      setWalletRequests(walletReqs || [])
      setCustomers((allCustomers || []).filter(c => !c.is_admin))
      setDeliveryAgents((allCustomers || []).filter(c => c.is_delivery))
      setDeliveryAgentRecords(daRecords || [])

      // Compute derived values
      const todayO = allOrders.filter(o => o.delivery_date === today)
      setTodayOrders(todayO)
      const todayA = allAddons.filter(a => a.delivery_date === today && a.status !== 'delivered' && a.status !== 'cancelled')
      setTodayAddons(todayA)

      const todaySubs = allSubs.filter(sub =>
        sub.is_active === true &&
        sub.start_date <= today &&
        (!sub.end_date || sub.end_date >= today) &&
        !(sub.paused_dates || []).includes(today) &&
        isDeliveryDay(sub)
      )
      setTodaySubscriptions(todaySubs)

      const allActiveSubs = allSubs.filter(s => s.is_active)
      const todayRevenue = todayO.reduce((sum, o) => sum + (o.total_price || 0), 0)
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const ordersMonthlyRevenue = allOrders
        .filter(o => new Date(o.created_at) >= monthStart)
        .reduce((sum, o) => sum + (o.total_price || 0), 0)

      // Round 2: dependent fetches + wallets in parallel
      const round2 = [loadWallets()]

      if (allActiveSubs.length > 0) {
        round2.push(
          fetch(`/api/admin/delivery-counts?ids=${allActiveSubs.map(s => s.id).join(',')}`, { headers: authHeader })
            .then(r => r.json())
            .then(({ counts }) => setSubDeliveryCounts(counts || {}))
        )
      }

      if (todaySubs.length > 0) {
        round2.push(
          fetch(`/api/admin/delivery-statuses?ids=${todaySubs.map(s => s.id).join(',')}&date=${today}`, { headers: authHeader })
            .then(r => r.json())
            .then(({ statuses }) => {
              // Merge DB statuses (delivered/missed) with localStorage (out_for_delivery + others)
              // DB always wins for terminal states; localStorage fills in non-terminal ephemeral state
              let merged = {}
              try {
                const storageKey = `sub_delivery_statuses_${today}`
                merged = JSON.parse(localStorage.getItem(storageKey) || '{}')
              } catch { /* ignore */ }
              // DB delivered/missed overrides localStorage
              Object.entries(statuses || {}).forEach(([id, status]) => { merged[id] = status })
              setSubDeliveryStatuses(merged)
            })
        )
      }

      await Promise.all(round2)

      setStats({
        totalOrders: allOrders.length,
        totalSubscriptions: allActiveSubs.length,
        totalCustomers: (allCustomers || []).filter(c => !c.is_admin).length,
        todayRevenue: todayRevenue + todaySubRevenue,
        monthlyRevenue: ordersMonthlyRevenue + monthSubRevenue,
      })
    } catch (err) {
      console.error('[loadAllData] error:', err)
      showError('Failed to load dashboard data. Please refresh.')
    }
  }

  const loadWallets = async () => {
    const { data: walletData, error: walletError } = await supabase.from('wallet').select('*')
    if (walletError) {
      console.error('[Admin] Wallets fetch error:', walletError.message)
      // Fall back to service-role API
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/wallets', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setWallets(json.wallets || [])
        setWalletsLastUpdated(new Date())
      }
      return
    }
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, phone, area')
      .eq('is_admin', false)
      .eq('is_delivery', false)
    const merged = (walletData || []).map(w => ({
      ...w,
      profile: profileData?.find(p => p.id === w.user_id) || null,
    }))
    setWallets(walletData || [])
    setWalletsWithProfiles(merged)
    setWalletsLastUpdated(new Date())
  }

  const handleAdminTabChange = async (id) => {
    setActiveTab(id)
    if (id === 'customers') { await loadWallets(); loadLeads() }
    if (id === 'delivery_history' && !historyLoaded) loadDeliveryHistory()
    if (id === 'financials' && !transactionsLoaded) loadTransactions(txStartDate, txEndDate)
    if (id === 'settings') loadAppSettings()
  }

  const loadDeliveryHistory = async (startDate, endDate) => {
    setHistoryLoading(true)
    const fromDate = startDate || historyStartDate
    const toDate = endDate || historyEndDate

    // Run both queries in parallel
    const [{ data: subDeliveries }, { data: deliveredOrders }] = await Promise.all([
      supabase
        .from('subscription_deliveries')
        .select('*')
        .gte('delivery_date', fromDate)
        .lte('delivery_date', toDate)
        .order('delivery_date', { ascending: false }),
      supabase
        .from('orders')
        .select('*, profiles(*), products(*)')
        .eq('status', 'delivered')
        .gte('delivery_date', fromDate)
        .lte('delivery_date', toDate)
        .order('delivery_date', { ascending: false }),
    ])

    // O(1) lookup maps
    const agentMap = {}
    deliveryAgents.forEach(a => { agentMap[a.id] = a.full_name })
    customers.forEach(c => { agentMap[c.id] = c.full_name })

    const subMap = {}
    subscriptions.forEach(s => { subMap[s.id] = s })

    const combined = [
      ...(subDeliveries || []).map(d => {
        const sub = subMap[d.subscription_id]
        const customerName = agentMap[d.user_id] || 'Unknown'
        return {
          id: 'sub-' + d.id,
          type: 'subscription',
          customerName,
          phone: customers.find(c => c.id === d.user_id)?.phone || '',
          product: sub?.products?.size || 'Milk',
          quantity: sub?.quantity || 1,
          deliveredBy: agentMap[d.delivered_by] || d.delivered_by || '-',
          deliveredAt: d.delivered_at,
          date: d.delivery_date,
          status: 'delivered',
          photo_url: d.photo_url || null,
        }
      }),
      ...(deliveredOrders || []).map(o => ({
        id: 'ord-' + o.id,
        type: 'order',
        customerName: o.profiles?.full_name || 'Unknown',
        phone: o.profiles?.phone || '',
        product: o.products?.size || 'Milk',
        quantity: o.quantity || 1,
        deliveredBy: agentMap[o.delivered_by] || o.delivered_by || '-',
        deliveredAt: o.delivered_at || o.updated_at,
        date: o.delivery_date,
        status: 'delivered',
        photo_url: null,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    setDeliveryHistory(combined)
    setHistoryLoaded(true)
    setHistoryLoading(false)
  }

 const loadUpcomingDeliveries = async () => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const in7Days = new Date()
  in7Days.setDate(in7Days.getDate() + 7)
  const endDate = in7Days.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const { data: { session } } = await supabase.auth.getSession()

  const [subsRes, ordersRes] = await Promise.all([
    fetch(`/api/admin/upcoming?type=subscriptions&end=${endDate}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    }),
    fetch(`/api/admin/upcoming?type=orders&start=${today}&end=${endDate}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    })
  ])

  const { subscriptions: activeSubs = [] } = await subsRes.json()
  const { orders: futureOrders = [] } = await ordersRes.json()
  console.log('[Upcoming] activeSubs:', activeSubs.length, 'futureOrders:', futureOrders.length)

  const schedule = {}
  for (let i = 1; i <= 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    schedule[dateStr] = { subscriptions: [], orders: [] }
  }

  for (const sub of activeSubs) {
    for (let i = 1; i <= 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (sub.start_date > dateStr) continue
      if (sub.end_date && sub.end_date < dateStr) continue
      if ((sub.paused_dates || []).includes(dateStr)) continue
      const start = new Date(sub.start_date + 'T00:00:00+05:30')
      const day = new Date(dateStr + 'T00:00:00+05:30')
      const diff = Math.round((day - start) / (1000 * 60 * 60 * 24))
      const freq = sub.delivery_frequency || 'daily'
      if (freq === 'alternate' && diff % 2 !== 0) continue
      if (freq === 'weekly' && diff % 7 !== 0) continue
      schedule[dateStr].subscriptions.push(sub)
    }
  }

  for (const order of futureOrders) {
    if (schedule[order.delivery_date]) {
      schedule[order.delivery_date].orders.push(order)
    }
  }

  setUpcomingDeliveries(schedule)
  setUpcomingLoaded(true)
}

  const loadDeliveredSubHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/delivered-subs', {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    })
    const { deliveries } = await res.json()
    setDeliveredSubHistory(deliveries || [])
    setDeliveredSubHistoryLoaded(true)
  }

  const loadCustomerDetails = async (userId) => {
    if (customerDetails[userId]) return
    setCustomerDetailsLoading(prev => ({ ...prev, [userId]: true }))
    const [
      { data: transactions },
      { data: deliveries },
      { data: orders },
      { data: wallet },
      { data: subscription },
    ] = await Promise.all([
      supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('subscription_deliveries').select('*, subscriptions(products(size))').eq('user_id', userId).order('delivery_date', { ascending: false }).limit(10),
      supabase.from('orders').select('*, products(size)').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('wallet').select('balance, deposit_balance').eq('user_id', userId).maybeSingle(),
supabase.from('subscriptions').select('*, products(size, price)').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),    ])
    setCustomerDetails(prev => ({ ...prev, [userId]: { transactions: transactions || [], deliveries: deliveries || [], orders: orders || [], wallet, subscription } }))
    setCustomerDetailsLoading(prev => ({ ...prev, [userId]: false }))
  }

  const loadTransactions = async (startDate, endDate) => {
    setTransactionsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/transactions?start=${startDate}&end=${endDate}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    })
    const result = await res.json()
    setTransactions(result.transactions || [])
    setTransactionsLoaded(true)
    setTransactionsLoading(false)
  }

  const loadLeads = async () => {
    setLeadsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/leads', {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    })
    const { leads: data } = await res.json()
    setLeads(data || [])
    setLeadsLoading(false)
  }

  const saveProductPrice = async (productId, newPrice, newAvailable) => {
    setProductSaving(true)
    const { error } = await supabase
      .from('products')
      .update({ price: parseFloat(newPrice), is_available: newAvailable })
      .eq('id', productId)
    if (!error) {
      setProducts(products.map(p => p.id === productId ? { ...p, price: parseFloat(newPrice), is_available: newAvailable } : p))
      setEditingProduct(null)
    }
    setProductSaving(false)
  }

  const runDailyDeductions = async () => {
    setDeductionLoading(true)
    setDeductionResult(null)

    // SECURITY: Deduction logic now runs server-side via an admin-verified endpoint.
    // Previously this entire loop ran in the browser using the anon key, allowing
    // any authenticated user to trigger wallet mutations from the console.
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/run-deductions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const result = await res.json()

    if (res.ok) {
      // Refresh wallet balances shown in the panel
      await loadWallets()
      setDeductionResult({
        date: result.date,
        total: result.summary?.eligible || 0,
        deducted: result.summary?.deducted || 0,
        skipped: result.summary?.skipped || 0,
        failed: result.summary?.failed || 0,
        failedUsers: result.failed || [],
      })
    } else {
      setDeductionResult({ error: result.error || 'Deduction failed.' })
    }
    setDeductionLoading(false)
  }

  const updateOrderStatus = async (orderId, status) => {
    // SECURITY: Status update goes through a server-side route that re-verifies
    // is_admin from the DB on every request — not relying on a cached UI flag.
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/update-order-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ order_id: orderId, status }),
    })
    if (res.ok) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
      setTodayOrders(todayOrders.map(o => o.id === orderId ? { ...o, status } : o))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/notifications', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    if (res.ok) {
      const { notifications: notifs, unread } = await res.json()
      setNotifications(notifs)
      setNotifUnread(unread)
      setNotifLoaded(true)
    }
  }

  const markAllNotificationsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({}),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setNotifUnread(0)
  }

  // ── Settings helpers ─────────────────────────────────────────────────────────

  const loadAppSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/settings', {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    })
    const result = await res.json()
    if (result.settings) {
      const map = {}
      result.settings.forEach(row => { map[row.key] = row.value })
      setAppSettings(prev => ({ ...prev, ...map }))
    }
    setSettingsLoaded(true)
  }

  const loadWaitlist = async () => {
    const { data } = await supabase.from('priority_waitlist').select('*').order('created_at', { ascending: false })
    setWaitlistEntries(data || [])
  }

  const saveSetting = async (key, value) => {
    setSettingsSaving(prev => ({ ...prev, [key]: true }))
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ key, value: String(value) })
    })
    if (res.ok) {
      setAppSettings(prev => ({ ...prev, [key]: String(value) }))
      showSuccess('Saved!')
    } else {
      showError('Failed to save setting.')
    }
    setSettingsSaving(prev => ({ ...prev, [key]: false }))
  }

  const addHoliday = async () => {
    if (!newHoliday) return
    const holidays = JSON.parse(appSettings.holidays || '[]')
    if (!holidays.includes(newHoliday)) holidays.push(newHoliday)
    holidays.sort()
    await saveSetting('holidays', JSON.stringify(holidays))
    setNewHoliday('')
  }

  const removeHoliday = async (date) => {
    const holidays = JSON.parse(appSettings.holidays || '[]').filter(d => d !== date)
    await saveSetting('holidays', JSON.stringify(holidays))
  }

  const addNewProduct = async () => {
    if (!newProduct.name || !newProduct.size || !newProduct.price) return
    setProductAddLoading(true)
    const { data, error } = await supabase.from('products').insert({
      name: newProduct.name,
      size: newProduct.size,
      price: parseFloat(newProduct.price),
      is_available: newProduct.is_available,
    }).select().single()
    if (data && !error) {
      setProducts(prev => [...prev, data])
      setNewProduct({ name: '', size: '', price: '', is_available: true })
      showSuccess('Product added!')
    }
    setProductAddLoading(false)
  }

  const saveProductEdit = async (productId) => {
    const edit = editProducts[productId]
    if (!edit) return
    const { error } = await supabase.from('products').update({
      name: edit.name,
      size: edit.size,
      price: parseFloat(edit.price),
      is_available: edit.is_available,
    }).eq('id', productId)
    if (!error) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...edit, price: parseFloat(edit.price) } : p))
      setEditProducts(prev => { const n = { ...prev }; delete n[productId]; return n })
      showSuccess('Product saved!')
    }
  }

  const handleCustomerSearch = (query) => {
    setCustomerSearch(query)
    if (!query.trim()) { setSettingsCustomers([]); return }
    const q = query.toLowerCase()
    setSettingsCustomers(customers.filter(c =>
      c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
    ).slice(0, 5))
  }

  const resetCod = async (userId, name) => {
    await supabase.from('profiles').update({ has_used_cod: false }).eq('id', userId)
    setCustomers(prev => prev.map(c => c.id === userId ? { ...c, has_used_cod: false } : c))
    setSettingsCustomers(prev => prev.map(c => c.id === userId ? { ...c, has_used_cod: false } : c))
    showSuccess(`COD reset for ${name}`)
  }

  const toggleBan = async (userId, isBanned, name) => {
    await supabase.from('profiles').update({ is_banned: !isBanned }).eq('id', userId)
    setCustomers(prev => prev.map(c => c.id === userId ? { ...c, is_banned: !isBanned } : c))
    setSettingsCustomers(prev => prev.map(c => c.id === userId ? { ...c, is_banned: !isBanned } : c))
    showSuccess(`${name} ${!isBanned ? 'banned' : 'unbanned'}`)
  }

  const extendSubscription = async (userId, name, days) => {
    if (!days || isNaN(parseInt(days))) return
    const { data: sub } = await supabase.from('subscriptions').select('id, end_date').eq('user_id', userId).eq('is_active', true).maybeSingle()
    if (!sub) { showError('No active subscription found'); return }
    const base = sub.end_date ? new Date(sub.end_date) : new Date()
    base.setDate(base.getDate() + parseInt(days))
    await supabase.from('subscriptions').update({ end_date: base.toISOString().split('T')[0] }).eq('id', sub.id)
    showSuccess(`${name}'s subscription extended by ${days} days`)
  }

 const handleSubStatusChange = async (subId, newStatus) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  setSubDeliveryStatuses(prev => ({ ...prev, [subId]: newStatus }))

  // Persist all statuses (including out_for_delivery) to localStorage, keyed by date
  try {
    const storageKey = `sub_delivery_statuses_${today}`
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
    if (newStatus === 'pending') {
      delete stored[subId]
    } else {
      stored[subId] = newStatus
    }
    localStorage.setItem(storageKey, JSON.stringify(stored))
  } catch { /* non-blocking */ }

  if (newStatus === 'delivered' || newStatus === 'missed') {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/delivery/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        type: 'subscription',
        subscription_id: subId,
        delivery_date: today,
        bottle_returned: newStatus === 'delivered',
        not_delivered: newStatus === 'missed',
      }),
    })
    const result = await res.json()
    console.log('[DeliveryConfirm] Status:', res.status, 'Response:', result)
    if (!res.ok) {
      showError('Failed to save delivery status: ' + (result.error || res.status))
    }
  }
}

  const getSubDayLabel = (sub) => {
    const count = subDeliveryCounts[sub.id] || 0
    const dayX = count + 1
    if (sub.subscription_type === 'ongoing' || !sub.end_date) return `Day ${dayX}`
    const calendarDays = Math.round(
      (new Date(sub.end_date) - new Date(sub.start_date)) / (1000 * 60 * 60 * 24)
    ) + 1
    const freq = sub.delivery_frequency || 'daily'
    const totalDeliveries = freq === 'alternate'
      ? Math.ceil(calendarDays / 2)
      : freq === 'weekly'
        ? Math.ceil(calendarDays / 7)
        : calendarDays
    return `Day ${dayX} of ${totalDeliveries}`
  }

  const getSubPlanLabel = (sub) => {
    if (sub.subscription_type === 'ongoing' || !sub.end_date) return 'Ongoing'
    const days = Math.round((new Date(sub.end_date) - new Date(sub.start_date)) / (1000 * 60 * 60 * 24)) + 1
    if (days <= 7) return '1 Week'
    if (days <= 14) return '2 Weeks'
    if (days <= 31) return '1 Month'
    if (days <= 92) return '3 Months'
    return `${days} Days`
  }

  const loadCancelledSubCounts = async () => {
    const inactIds = subscriptions.filter(s => !s.is_active).map(s => s.id)
    if (!inactIds.length) return
    const { data } = await supabase.from('subscription_deliveries').select('subscription_id').in('subscription_id', inactIds)
    const counts = {}
    ;(data || []).forEach(d => { counts[d.subscription_id] = (counts[d.subscription_id] || 0) + 1 })
    setCancelledSubCounts(counts)
  }

  const approveWalletRequest = async (reqId, approved) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/wallet-request-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ request_id: reqId, approved }),
    })
    if (res.ok) {
      setWalletRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: approved ? 'approved' : 'rejected' } : r))
      showSuccess(approved ? 'Request approved!' : 'Request rejected.')
      await loadWallets()
    } else {
      showError('Failed to process request.')
    }
  }

  const reactivateSub = async (subId) => {
    setReactivatingSubId(subId)
    const { error } = await supabase.from('subscriptions').update({ is_active: true }).eq('id', subId)
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, is_active: true } : s))
      showSuccess('Subscription reactivated!')
    } else {
      showError('Failed to reactivate subscription.')
    }
    setReactivatingSubId(null)
  }

  const pauseDelivery = async (userId, name, date) => {
    if (!date) return
    // Fetch ALL active subscriptions — maybeSingle() would silently skip customers with 2+ active subs (e.g. Julie, Amit Chaudhary)
    const { data: subs } = await supabase.from('subscriptions').select('id, paused_dates').eq('user_id', userId).eq('is_active', true)
    if (!subs || subs.length === 0) { showError('No active subscription found'); return }
    let pausedCount = 0
    for (const sub of subs) {
      const paused = sub.paused_dates || []
      if (!paused.includes(date)) {
        await supabase.from('subscriptions').update({ paused_dates: [...paused, date] }).eq('id', sub.id)
        pausedCount++
      }
    }
    if (pausedCount === 0) {
      showSuccess(`${name} already has ${date} paused on all subscriptions`)
    } else {
      showSuccess(`Delivery paused for ${name} on ${date}${subs.length > 1 ? ` (${pausedCount}/${subs.length} subscriptions updated)` : ''}`)
    }
  }

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) return
    setBroadcastLoading(true)
    setBroadcastConfirm(false)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ message: broadcastMessage }),
    })
    const data = await res.json()
    if (res.ok) {
      showSuccess(`Broadcast sent to ${data.sent} customers!`)
      setBroadcastMessage('')
    }
    setBroadcastLoading(false)
  }

  const inviteWaitlistEntry = async (entry) => {
    setInvitingId(entry.id)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/invite-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ entryId: entry.id, phone: entry.phone, name: entry.name }),
    })
    if (res.ok) {
      setWaitlistEntries(prev => prev.map(e => e.id === entry.id ? { ...e, invited: true } : e))
      showSuccess(`Invite sent to ${entry.name}!`)
    }
    setInvitingId(null)
  }

  const deleteWaitlistEntry = async (id) => {
    await supabase.from('priority_waitlist').delete().eq('id', id)
    setWaitlistEntries(prev => prev.filter(e => e.id !== id))
    showSuccess('Entry removed')
  }

  const exportWaitlistCSV = () => {
    const headers = ['Name', 'Phone', 'Area', 'Email', 'Date Joined', 'Invited']
    const rows = waitlistEntries.map(e => [
      e.name, e.phone, e.area, e.email || '',
      new Date(e.created_at).toLocaleDateString('en-IN'), e.invited ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'priority_waitlist.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] px-4 py-8 max-w-5xl mx-auto">
      <style>{`@keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }`}</style>
      <div style={{ height: 32, borderRadius: 8, width: '30%', marginBottom: 24, background: 'linear-gradient(90deg, #f5f0e8 25%, #e8e0d0 50%, #f5f0e8 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite linear' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f0e8]">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017]" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-red-500 font-semibold tracking-widest uppercase">Admin Panel</p>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <span className="bg-red-50 text-red-500 border border-red-200 text-xs font-semibold px-3 py-1 rounded-full">
            Admin
          </span>

          {/* Notification Bell */}
          <div className="relative" data-notif-bell>
            <button
              onClick={() => {
                setNotifBellOpen(o => !o)
                if (!notifLoaded) loadNotifications()
              }}
              className="relative w-9 h-9 rounded-full border border-[#e8e0d0] bg-white flex items-center justify-center hover:border-[#d4a017] transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#1c1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              {notifUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {notifUnread > 9 ? '9+' : notifUnread}
                </span>
              )}
            </button>

            {notifBellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#e8e0d0] rounded-2xl shadow-2xl z-50 overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 border-b border-[#f5f0e8] flex items-center justify-between">
                  <p className="font-semibold text-sm text-[#1c1c1c]">Notifications</p>
                  {notifUnread > 0 && (
                    <button onClick={markAllNotificationsRead}
                      className="text-xs text-[#1a5c38] font-semibold hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="text-3xl mb-2">🔔</div>
                      <p className="text-gray-400 text-sm">No notifications yet</p>
                    </div>
                  ) : notifications.map((n, idx) => {
                    const icons = { new_subscription: '📅', new_order: '🛒', wallet_request: '💳', low_balance: '⚠️', missed_delivery: '❌', quality_report: '⚠️' }
                    return (
                      <button key={n.id}
                        onClick={() => {
                          if (n.link_tab) { setActiveTab(n.link_tab); setNotifBellOpen(false) }
                          if (!n.is_read) {
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                            setNotifUnread(c => Math.max(0, c - 1))
                            supabase.auth.getSession().then(({ data: { session } }) => {
                              fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ ids: [n.id] }) })
                            })
                          }
                        }}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#fdfbf7] transition ${idx !== notifications.length - 1 ? 'border-b border-[#f5f0e8]' : ''} ${!n.is_read ? 'bg-[#f0faf4]' : ''}`}>
                        <span className="text-lg flex-shrink-0 mt-0.5">{icons[n.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? 'font-semibold text-[#1c1c1c]' : 'text-gray-600'}`}>{n.title}</p>
                          {n.body && <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>}
                          <p className="text-xs text-gray-300 mt-0.5">
                            {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#1a5c38] flex-shrink-0 mt-1.5" />}
                      </button>
                    )
                  })}
                </div>
                <div className="px-4 py-2 border-t border-[#f5f0e8]">
                  <button onClick={() => { loadNotifications(); setNotifLoaded(false) }}
                    className="text-xs text-gray-400 hover:text-[#1a5c38] transition">
                    ↻ Refresh
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleLogout}
            className="border border-red-200 text-red-400 font-medium px-4 py-2 rounded-full text-sm hover:bg-red-50 transition">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">Admin Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Today's Revenue", value: '₹' + stats.todayRevenue, icon: '💰', color: '#f0faf4', border: '#c8e6d4' },
            { label: 'Monthly Revenue', value: '₹' + stats.monthlyRevenue, icon: '📈', color: '#fdf6e3', border: '#f0dfa0' },
            { label: 'Active Subscriptions', value: stats.totalSubscriptions, icon: '📅', color: '#f0faf4', border: '#c8e6d4' },
            { label: 'Total Orders', value: stats.totalOrders, icon: '📦', color: '#fdf6e3', border: '#f0dfa0' },
            { label: 'Total Customers', value: stats.totalCustomers, icon: '👥', color: '#f0faf4', border: '#c8e6d4' },
          ].map(({ label, value, icon, color, border }) => (
            <div key={label} className="rounded-2xl p-5 border shadow-sm"
              style={{background: color, borderColor: border}}>
              <div className="text-2xl mb-2">{icon}</div>
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c]">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>


        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
    { id: 'overview', label: "Today's Deliveries", icon: '🚴' },
    { id: 'orders', label: 'All Orders', icon: '📦' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '📅' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'delivery_history', label: 'Delivery History', icon: '📋' },
    { id: 'delivery', label: 'Delivery Agents', icon: '🚴' },
    { id: 'reviews', label: 'Reviews', icon: '⭐' },
    { id: 'reports', label: 'Issue Reports', icon: '⚠️' },
    { id: 'add_order', label: 'Add Order', icon: '➕' },
    { id: 'financials', label: 'Financials', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ].map(({ id, label, icon }) => (
            <button key={id} onClick={() => handleAdminTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[#1a5c38] text-white shadow'
                  : 'text-gray-500 hover:text-[#1a5c38] hover:bg-[#f0faf4]'
              }`}>
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Failed Deductions Alert Banner */}
        {failedDeductions.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-red-700 text-sm">{failedDeductions.length} subscription deduction{failedDeductions.length > 1 ? 's' : ''} failed recently</p>
                <p className="text-xs text-red-500">Customers with insufficient balance — review in Issue Reports</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('reports')}
              className="text-xs bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition whitespace-nowrap">
              View Details
            </button>
          </div>
        )}

        {/* Today's Deliveries Tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5">

          {/* Sub-tabs */}
          <div className="flex gap-2 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm">
            {[
              { id: 'today', label: "Today's List", icon: '📋' },
              { id: 'upcoming', label: 'Upcoming (7 days)', icon: '📅' },
              { id: 'history', label: 'History (7 days)', icon: '📊' },
            ].map(({ id, label, icon }) => (
              <button key={id}
                onClick={() => {
                  setOverviewSubTab(id)
                  if (id === 'history' && !historyLoaded) loadDeliveryHistory()
                  if (id === 'upcoming' && !upcomingLoaded) loadUpcomingDeliveries()
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  overviewSubTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38]'
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Today sub-tab */}
          {overviewSubTab === 'today' && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">
                  Today's Deliveries
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{todayOrders.length + todaySubscriptions.length} deliveries today ({todaySubscriptions.length} subscriptions, {todayOrders.length} one-time)</p>
              </div>
              <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-bold px-3 py-1.5 rounded-full border border-[#f0dfa0]">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="px-6 py-3 border-b border-[#f5f0e8]">
              <input
                type="text"
                placeholder="Filter by Tower + Flat (e.g. T1 1, T2 4)..."
                value={todayAddressFilter}
                onChange={e => setTodayAddressFilter(e.target.value)}
                className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
              />
            </div>

            {todayOrders.length === 0 && todaySubscriptions.length === 0 && todayAddons.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-gray-400">No deliveries scheduled for today</p>
              </div>
            ) : (
              <div>
                {/* Subscription deliveries */}
                {todaySubscriptions.filter(s => matchesAddressFilter(s, todayAddressFilter)).map((sub) => {
                  const subStatus = subDeliveryStatuses[sub.id] || 'pending'
                  const statusCls = subStatus === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                    : subStatus === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : subStatus === 'missed' ? 'bg-orange-50 text-orange-500 border-orange-200'
                    : subStatus === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200'
                    : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                  return (
                  <div key={sub.id} className="px-6 py-5 flex items-center gap-4 border-b border-[#f5f0e8]">
                    <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center flex-shrink-0 p-1.5">
                      <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c]">{sub.profiles?.full_name}</p>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]">📅 Subscription</span>
                        <FreqBadge freq={sub.delivery_frequency} />
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]">{getSubDayLabel(sub)}</span>
                        <AddressBadge profile={sub.profiles} />
                      </div>
                      <p className="text-sm text-gray-400">{sub.profiles?.apartment_name}, Flat {sub.profiles?.flat_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub.profiles?.area} • 📞 {sub.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-1">
                        {sub.products?.size} x {sub.quantity} • {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col gap-1">
                      <p className="font-bold text-[#1a5c38] mb-0.5">₹{(sub.products?.price || 0) * sub.quantity}</p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border mb-1 inline-block ${statusCls}`}>
                        {subStatus === 'delivered' ? '✅ Delivered' : subStatus === 'out_for_delivery' ? '🚴 Out' : subStatus === 'missed' ? '⚠️ Missed' : subStatus === 'cancelled' ? '❌ Cancelled' : '🕐 Pending'}
                      </span>
                      <select
                        value={subStatus}
                        onChange={(e) => handleSubStatusChange(sub.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${statusCls}`}>
                        <option value="pending">Pending</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="missed">Missed</option>
                      </select>
                      {deliveryAgents.length > 0 && (
                        <select
                          value={sub.assigned_to || ''}
                          onChange={async (e) => {
                            const agentId = e.target.value
                            const { data: { session } } = await supabase.auth.getSession()
                            await fetch('/api/admin/assign-agent', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                              body: JSON.stringify({ type: 'subscription', id: sub.id, agent_id: agentId || null }),
                            })
                            setTodaySubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, assigned_to: agentId } : s))
                          }}
                          className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                          <option value="">Unassigned</option>
                          {deliveryAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  )
                })}
                {/* Extra (add-on) orders */}
                {todayAddons.filter(a => matchesAddressFilter(a, todayAddressFilter)).map((addon, index) => {
                  const addonCls = addon.status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                    : addon.status === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : addon.status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200'
                    : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                  return (
                    <div key={addon.id} className="px-6 py-5 flex items-center gap-4 border-b border-[#f5f0e8]">
                      <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center text-2xl flex-shrink-0">➕</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-semibold text-[#1c1c1c]">{addon.profiles?.full_name}</p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">➕ Extra</span>
                          <AddressBadge profile={addon.profiles} />
                        </div>
                        <p className="text-sm text-gray-400">{addon.profiles?.apartment_name}, Flat {addon.profiles?.flat_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{addon.profiles?.area} • 📞 {addon.profiles?.phone}</p>
                        <p className="text-xs text-[#1a5c38] font-medium mt-1">
                          {addon.products?.size} x {addon.quantity} • {addon.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col gap-1">
                        <p className="font-bold text-[#1a5c38] mb-0.5">₹{addon.total_price}</p>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border mb-1 inline-block ${addonCls}`}>
                          {addon.status === 'delivered' ? '✅ Delivered' : addon.status === 'out_for_delivery' ? '🚴 Out' : addon.status === 'cancelled' ? '❌ Cancelled' : '🕐 Pending'}
                        </span>
                        <select
                          value={addon.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            setTodayAddons(prev => prev.map(a => a.id === addon.id ? { ...a, status: newStatus } : a))
                            setAddonOrders(prev => prev.map(a => a.id === addon.id ? { ...a, status: newStatus } : a))
                            if (newStatus === 'delivered') {
                              const { data: { session } } = await supabase.auth.getSession()
                              const res = await fetch('/api/delivery/confirm', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                body: JSON.stringify({ type: 'addon', addon_id: addon.id }),
                              })
                              if (!res.ok) {
                                const result = await res.json()
                                showError('Failed to confirm delivery: ' + (result.error || res.status))
                                setTodayAddons(prev => prev.map(a => a.id === addon.id ? { ...a, status: addon.status } : a))
                                setAddonOrders(prev => prev.map(a => a.id === addon.id ? { ...a, status: addon.status } : a))
                              }
                            } else {
                              await supabase.from('addon_orders').update({ status: newStatus }).eq('id', addon.id)
                            }
                          }}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${addonCls}`}>
                          <option value="pending">Pending</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  )
                })}
                {/* One-time orders */}
                {todayOrders.filter(o => matchesAddressFilter(o, todayAddressFilter)).map((order, index) => {
                  const TRIAL_METHODS = ['COD', 'wallet', 'razorpay']
                  const isTrial = TRIAL_METHODS.includes(order.payment_method)
                  const trialDay = isTrial ? (() => {
                    const d0 = new Date(order.delivery_date + 'T00:00:00+05:30')
                    const start = new Date(d0); start.setDate(start.getDate() - 2)
                    const end = new Date(d0); end.setDate(end.getDate() + 2)
                    const startStr = start.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                    const endStr = end.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                    const siblings = orders
                      .filter(o => o.user_id === order.user_id && TRIAL_METHODS.includes(o.payment_method) && o.delivery_date >= startStr && o.delivery_date <= endStr)
                      .map(o => o.delivery_date).sort()
                    const idx = siblings.indexOf(order.delivery_date)
                    return idx >= 0 ? idx + 1 : 1
                  })() : null
                  const ordCls = order.status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                    : order.status === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : order.status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200'
                    : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                  return (
                  <div key={order.id}
                    className={`px-6 py-5 flex items-center gap-4 ${index !== todayOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-2xl flex-shrink-0">
                      {isTrial ? '🎁' : '🛒'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c]">{order.profiles?.full_name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${isTrial ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'}`}>
                          {isTrial ? `🎁 Trial Day ${trialDay}/3` : '🛒 Order'}
                        </span>
                        <AddressBadge profile={order.profiles} />
                      </div>
                      <p className="text-sm text-gray-400">{order.profiles?.apartment_name}, Flat {order.profiles?.flat_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.profiles?.area} • 📞 {order.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-1">
                        {order.products?.size} x {order.quantity} • {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col gap-1">
                      <p className="font-bold text-[#1a5c38] mb-0.5">₹{order.total_price}</p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border mb-1 inline-block ${ordCls}`}>
                        {order.status === 'delivered' ? '✅ Delivered' : order.status === 'out_for_delivery' ? '🚴 Out' : order.status === 'cancelled' ? '❌ Cancelled' : '🕐 Pending'}
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${ordCls}`}>
                        <option value="pending">Pending</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {deliveryAgents.length > 0 && (
                        <select
                          value={order.assigned_to || ''}
                          onChange={async (e) => {
                            const agentId = e.target.value
                            const { data: { session } } = await supabase.auth.getSession()
                            await fetch('/api/admin/assign-agent', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                              body: JSON.stringify({ type: 'order', id: order.id, agent_id: agentId || null }),
                            })
                            setTodayOrders(prev => prev.map(o => o.id === order.id ? { ...o, assigned_to: agentId } : o))
                          }}
                          className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                          <option value="">Unassigned</option>
                          {deliveryAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
          )}

          {/* Upcoming sub-tab */}
          {overviewSubTab === 'upcoming' && (
            <div className="flex flex-col gap-4">
              {!upcomingLoaded ? (
                <div className="text-center py-12 text-gray-400">Loading...</div>
              ) : Object.entries(upcomingDeliveries).map(([date, { subscriptions, orders }]) => {
                const total = subscriptions.length + orders.length
                if (total === 0) return null
                return (
                  <div key={date} className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-[#f5f0e8] border-b border-[#e8e0d0] flex items-center justify-between">
                      <p className="font-semibold text-[#1c1c1c]">
                        {new Date(date + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <span className="bg-[#1a5c38] text-white text-xs font-bold px-3 py-1 rounded-full">
                        {total} deliveries
                      </span>
                    </div>
                    <div>
                      {subscriptions.map(sub => (
                        <div key={sub.id} className="px-6 py-4 border-b border-[#f5f0e8] flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-[#1c1c1c] text-sm">{sub.profiles?.full_name}</p>
                              <span className="text-xs bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] px-2 py-0.5 rounded-full font-semibold">📅 Subscription</span>
                              {sub.start_date === date && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">🆕 First delivery</span>}
                            </div>
                            <p className="text-xs text-gray-400">{sub.profiles?.phone} · {sub.profiles?.area}</p>
                            <p className="text-xs text-[#1a5c38] font-medium mt-0.5">{sub.products?.size} × {sub.quantity} · {sub.delivery_slot === 'morning' ? '🌅 7–9AM' : '🌆 5–7PM'}</p>
                          </div>
                        </div>
                      ))}
                      {orders.map(order => (
                        <div key={order.id} className="px-6 py-4 border-b border-[#f5f0e8] flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-[#1c1c1c] text-sm">{order.profiles?.full_name}</p>
                              <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">🎁 {['COD', 'wallet', 'razorpay'].includes(order.payment_method) ? 'Trial' : 'Order'}</span>
                            </div>
                            <p className="text-xs text-gray-400">{order.profiles?.phone} · {order.profiles?.area}</p>
                            <p className="text-xs text-[#1a5c38] font-medium mt-0.5">{order.products?.size} × {order.quantity} · {order.delivery_slot === 'morning' ? '🌅 7–9AM' : '🌆 5–7PM'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {upcomingLoaded && Object.values(upcomingDeliveries).every(d => d.subscriptions.length + d.orders.length === 0) && (
                <div className="text-center py-12 text-gray-400">No upcoming deliveries in the next 7 days.</div>
              )}
            </div>
          )}

          {/* History sub-tab */}
          {overviewSubTab === 'history' && (
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">📋 Delivery History</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Past 7 days — subscriptions and one-time orders</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-400">From</label>
                    <input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)}
                      className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]" />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-400">To</label>
                    <input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)}
                      className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]" />
                  </div>
                  <input type="text" placeholder="Filter by agent..." value={historyAgentFilter}
                    onChange={e => setHistoryAgentFilter(e.target.value)}
                    className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] w-36" />
                  <button onClick={() => { setHistoryLoaded(false); loadDeliveryHistory(historyStartDate, historyEndDate) }}
                    className="text-xs border border-[#1a5c38] text-[#1a5c38] px-3 py-2 rounded-lg hover:bg-[#f0faf4] transition font-semibold">
                    ↻ Refresh
                  </button>
                  <button onClick={() => {
                    const filtered = deliveryHistory.filter(d => {
                      if (historyStartDate && d.date < historyStartDate) return false
                      if (historyEndDate && d.date > historyEndDate) return false
                      if (historyAgentFilter && !d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())) return false
                      return true
                    })
                    const headers = ['Date', 'Type', 'Customer', 'Phone', 'Product', 'Qty', 'Delivered By', 'Delivered At']
                    const rows = filtered.map(d => [
                      d.date, d.type === 'subscription' ? 'Subscription' : 'One-time',
                      d.customerName, d.phone, d.product, d.quantity, d.deliveredBy,
                      d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-',
                    ])
                    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `delivery_history_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                    setTimeout(() => URL.revokeObjectURL(url), 5000)
                  }} className="text-xs bg-[#1a5c38] text-white px-3 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold">
                    Export CSV
                  </button>
                </div>
              </div>
              {historyLoading ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading delivery history...</div>
              ) : (() => {
                const filtered = deliveryHistory.filter(d => {
                  if (historyStartDate && d.date < historyStartDate) return false
                  if (historyEndDate && d.date > historyEndDate) return false
                  if (historyAgentFilter && !d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())) return false
                  return true
                })
                if (filtered.length === 0) {
                  return (
                    <div className="px-6 py-12 text-center">
                      <div className="text-5xl mb-3">📋</div>
                      <p className="text-gray-400 text-sm">No delivery records found.</p>
                    </div>
                  )
                }
                const byDate = filtered.reduce((acc, d) => {
                  if (!acc[d.date]) acc[d.date] = []
                  acc[d.date].push(d)
                  return acc
                }, {})
                return (
                  <div>
                    {Object.entries(byDate).map(([date, items]) => (
                      <div key={date}>
                        <div className="px-6 py-3 bg-[#f5f0e8] flex items-center justify-between border-b border-[#e8e0d0]">
                          <p className="font-semibold text-[#1c1c1c] text-sm">
                            {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-2.5 py-1 rounded-full border border-[#c8e6d4]">
                            ✅ {items.length} delivered
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#fdfbf7] text-xs text-gray-400 uppercase tracking-widest">
                              <tr>
                                <th className="px-5 py-2 text-left">Customer</th>
                                <th className="px-5 py-2 text-left">Product</th>
                                <th className="px-5 py-2 text-left">Type</th>
                                <th className="px-5 py-2 text-left">Delivered By</th>
                                <th className="px-5 py-2 text-left">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((d, idx) => (
                                <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]'}>
                                  <td className="px-5 py-3">
                                    <p className="font-semibold text-[#1c1c1c]">{d.customerName}</p>
                                    <p className="text-xs text-gray-400">{d.phone}</p>
                                  </td>
                                  <td className="px-5 py-3 text-[#1c1c1c]">{d.product} <span className="text-gray-400 text-xs">x{d.quantity}</span></td>
                                  <td className="px-5 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.type === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]'}`}>
                                      {d.type === 'subscription' ? '📅 Sub' : '🛒 Order'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-gray-500 text-xs">{d.deliveredBy || '-'}</td>
                                  <td className="px-5 py-3 text-gray-400 text-xs">
                                    {d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          </div>
        )}

        {/* All Orders Tab */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-4">
          {(() => {
          const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
          // All active subscriptions — subscriptions are always 'pending' (ongoing commitments),
          // delivery history is tracked separately in the Delivered tab via deliveredSubHistory
          const combined = [
            ...orders.map(o => ({ ...o, _itemType: 'order', orderType: ['COD', 'wallet', 'razorpay'].includes(o.payment_method) ? 'trial' : 'order', _status: o.status })),
            ...addonOrders.map(a => ({ ...a, _itemType: 'addon', orderType: 'addon', _status: a.status })),
            ...subscriptions.filter(s => s.is_active).map(sub => {
              const dbStatus = subDeliveryStatuses[sub.id]
              const isPaused = (sub.paused_dates || []).includes(todayIST)
              const _status = isPaused ? 'paused'
                : dbStatus === 'delivered' ? 'delivered'
                : dbStatus === 'missed' ? 'missed'
                : dbStatus === 'out_for_delivery' ? 'out_for_delivery'
                : 'pending'
              return { ...sub, _itemType: 'subscription', orderType: 'subscription', _status }
            }),
          ]
          const deliveredRows = [
            ...orders
              .filter(o => o.status === 'delivered')
              .map(o => ({ ...o, _itemType: 'order', orderType: ['COD', 'wallet', 'razorpay'].includes(o.payment_method) ? 'trial' : 'order', _status: 'delivered', _sortDate: o.delivery_date || o.created_at })),
            ...addonOrders
              .filter(a => a.status === 'delivered')
              .map(a => ({ ...a, _itemType: 'addon', orderType: 'addon', _status: 'delivered', _sortDate: a.delivery_date || a.created_at })),
            ...deliveredSubHistory.map(d => ({
              ...(d.subscriptions || {}),
              id: 'subdelivery-' + d.id,
              _itemType: 'subscription',
              orderType: 'subscription',
              _status: 'delivered',
              delivery_date: d.delivery_date,
              profiles: d.subscriptions?.profiles || null,
              products: d.subscriptions?.products || null,
              _sortDate: d.delivery_date,
            }))
          ].sort((a, b) => (b._sortDate || '').localeCompare(a._sortDate || ''))
          const visibleRows = ordersSubTab === 'delivered'
            ? deliveredRows
            : combined.filter(item =>
                ordersSubTab === 'pending' ? item._status === 'pending'
                : ordersSubTab === 'out_for_delivery' ? item._status === 'out_for_delivery'
                : ordersSubTab === 'paused' ? item._status === 'paused'
                : item._status === 'cancelled' || item._status === 'missed'
              )
          const subTabCounts = {
            pending: combined.filter(i => i._status === 'pending').length,
            out_for_delivery: combined.filter(i => i._status === 'out_for_delivery').length,
            delivered: orders.filter(o => o.status === 'delivered').length + deliveredSubHistory.length + addonOrders.filter(a => a.status === 'delivered').length,
            paused: combined.filter(i => i._status === 'paused').length,
            cancelled: combined.filter(i => i._status === 'cancelled' || i._status === 'missed').length,
          }
          return (
          <div>
            {/* Sub-tab nav */}
            <div className="flex gap-2 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
              {[
                { id: 'pending', label: 'Pending' },
                { id: 'out_for_delivery', label: 'Out for Delivery' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'paused', label: 'Paused' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => {
                  setOrdersSubTab(id)
                  if (id === 'delivered') loadDeliveredSubHistory()
                }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    ordersSubTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38]'
                  }`}>
                  {label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${ordersSubTab === id ? 'bg-white text-[#1a5c38]' : 'bg-gray-100 text-gray-500'}`}>
                    {subTabCounts[id]}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  const headers = ['Type','Customer','Phone','Product','Qty','Date','Slot','Amount','Status']
                  const rows = visibleRows.map(item => [
                    item.orderType === 'trial' ? 'Trial' : item.orderType === 'subscription' ? 'Subscription' : item._itemType === 'addon' ? 'Extra Order' : 'Order',
                    item.profiles?.full_name || '',
                    item.profiles?.phone || '',
                    item.products?.size || '',
                    item.quantity || '',
                    item._itemType === 'order' ? (item.delivery_date || '') : todayIST,
                    item.delivery_slot || '',
                    item._itemType === 'order' ? (item.total_price || '') : (item.products?.price || 0) * (item.quantity || 1),
                    item._status,
                  ])
                  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `orders_${ordersSubTab}_${todayIST}.csv`; a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 5000)
                }}
                className="ml-auto text-xs bg-[#1a5c38] text-white px-3 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold whitespace-nowrap flex-shrink-0">
                Export CSV
              </button>
            </div>

            <input
              type="text"
              placeholder="Filter by Tower + Flat (e.g. T1 1, T2 4)..."
              value={ordersAddressFilter}
              onChange={e => setOrdersAddressFilter(e.target.value)}
              className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-white shadow-sm"
            />

            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#f5f0e8]">
                <p className="text-xs text-gray-400">{visibleRows.filter(i => matchesAddressFilter(i, ordersAddressFilter)).length} {ordersSubTab.replace('_', ' ')} · orders + all active subscriptions combined</p>
              </div>
              {visibleRows.filter(i => matchesAddressFilter(i, ordersAddressFilter)).length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-400 text-sm">No {ordersSubTab.replace('_', ' ')} items{ordersAddressFilter ? ' matching filter' : ''}</p>
                </div>
              ) : visibleRows.filter(i => matchesAddressFilter(i, ordersAddressFilter)).map((item, index) => {
                const isSub = item._itemType === 'subscription'
                const statusCls = item._status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                  : item._status === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : item._status === 'missed' ? 'bg-orange-50 text-orange-500 border-orange-200'
                  : item._status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200'
                  : item._status === 'paused' ? 'bg-purple-50 text-purple-600 border-purple-200'
                  : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                const statusLabel = item._status === 'delivered' ? '✅ Delivered'
                  : item._status === 'out_for_delivery' ? '🚴 Out'
                  : item._status === 'missed' ? '⚠️ Missed'
                  : item._status === 'cancelled' ? '❌ Cancelled'
                  : item._status === 'paused' ? '⏸ Paused'
                  : '🕐 Pending'
                return (
                  <div key={(isSub ? 'sub-' : item._itemType === 'addon' ? 'addon-' : 'ord-') + item.id}
                    className={`px-6 py-4 flex items-start gap-4 ${index !== visibleRows.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-[#f5f0e8]">
                      {item.orderType === 'subscription' ? '📅' : item.orderType === 'trial' ? '🎁' : item._itemType === 'addon' ? '➕' : '🛒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c] text-sm">{item.profiles?.full_name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          item.orderType === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                          : item.orderType === 'trial' ? 'bg-orange-50 text-orange-600 border-orange-200'
                          : item._itemType === 'addon' ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                        }`}>
                          {item.orderType === 'subscription' ? '📅 Subscription' : item.orderType === 'trial' ? '🎁 Trial' : item._itemType === 'addon' ? '➕ Extra Order' : '🛒 Order'}
                        </span>
                        {isSub && <FreqBadge freq={item.delivery_frequency} />}
                        {isSub && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]">
                            {getSubDayLabel(item)}
                          </span>
                        )}
                        <AddressBadge profile={item.profiles} />
                      </div>
                      <p className="text-xs text-gray-400">📞 {item.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-0.5">
                        {item.products?.size} × {item.quantity} · {item.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                        {item.delivery_date && (
                          <span className="text-gray-400 ml-1">
                            · {new Date(item.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <p className="font-bold text-[#1a5c38] text-sm">
                        ₹{isSub ? (item.products?.price || 0) * item.quantity : item.total_price}
                      </p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusCls}`}>{statusLabel}</span>
                      {isSub && item._status === 'paused' ? (
                        <button
                          onClick={async () => {
                            const { data: { session } } = await supabase.auth.getSession()
                            const res = await fetch('/api/admin/unpause', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                              body: JSON.stringify({ subscription_id: item.id, pause_date: todayIST }),
                            })
                            const data = await res.json()
                            if (res.ok) {
                              setSubscriptions(prev => prev.map(s => s.id === item.id ? { ...s, paused_dates: data.paused_dates } : s))
                              showSuccess('Pause removed — delivery will proceed today.')
                            } else {
                              showError(data.error || 'Failed to remove pause.')
                            }
                          }}
                          className="text-xs bg-purple-50 border border-purple-200 text-purple-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-100 transition">
                          ▶ Remove Pause
                        </button>
                      ) : (
                        <select
                          value={item._status === 'paused' ? 'pending' : item._status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            if (isSub) {
                              handleSubStatusChange(item.id, newStatus)
                            } else if (item._itemType === 'addon') {
                              const { data: { session } } = await supabase.auth.getSession()
                              if (newStatus === 'delivered') {
                                const res = await fetch('/api/delivery/confirm', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                  body: JSON.stringify({ type: 'addon', addon_id: item.id }),
                                })
                                if (res.ok) {
                                  setAddonOrders(prev => prev.map(a => a.id === item.id ? { ...a, status: 'delivered' } : a))
                                  setTodayAddons(prev => prev.filter(a => a.id !== item.id))
                                } else {
                                  showError('Failed to confirm addon delivery.')
                                }
                              } else {
                                const res = await fetch('/api/admin/update-addon-status', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                  body: JSON.stringify({ addon_id: item.id, status: newStatus }),
                                })
                                if (res.ok) {
                                  setAddonOrders(prev => prev.map(a => a.id === item.id ? { ...a, status: newStatus } : a))
                                  setTodayAddons(prev => prev.map(a => a.id === item.id ? { ...a, status: newStatus } : a))
                                } else {
                                  showError('Failed to update addon status.')
                                }
                              }
                            } else {
                              updateOrderStatus(item.id, newStatus)
                            }
                          }}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${statusCls}`}>
                          <option value="pending">Pending</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          {isSub ? <option value="missed">Missed</option> : <option value="cancelled">Cancelled</option>}
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )
        })()}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="flex flex-col gap-5">

            {/* Count summary */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] text-sm font-bold px-4 py-1.5 rounded-full">
                Active: {subscriptions.filter(s => s.is_active).length}
              </span>
              <span className="text-gray-300 font-bold text-lg">|</span>
              <span className="bg-gray-100 text-gray-500 border border-gray-200 text-sm font-bold px-4 py-1.5 rounded-full">
                Cancelled: {subscriptions.filter(s => !s.is_active).length}
              </span>
            </div>

            {/* Section 1: Active Subscriptions */}
            <div className="bg-white rounded-2xl border border-[#c8e6d4] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#e8f5ec] flex items-center gap-3"
                style={{background: 'linear-gradient(135deg, #f0faf4 0%, #e8f5ec 100%)'}}>
                <div className="w-2 h-6 rounded-full bg-[#1a5c38]" />
                <div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-base font-bold text-[#1a5c38]">Active Subscriptions</h3>
                  <p className="text-xs text-[#2d7a50]">{subscriptions.filter(s => s.is_active).length} running</p>
                </div>
              </div>
              {subscriptions.filter(s => s.is_active).length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-gray-400 text-sm">No active subscriptions</p>
                </div>
              ) : (
                <div>
                  {subscriptions.filter(s => s.is_active).map((sub, index, arr) => (
                    <div key={sub.id}
                      className={`px-6 py-5 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                      <div className="w-11 h-11 rounded-xl bg-[#f0faf4] border border-[#c8e6d4] flex items-center justify-center flex-shrink-0 p-1.5">
                        <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1c1c1c]">{sub.profiles?.full_name}</p>
                        <p className="text-sm text-gray-400">{sub.profiles?.area}, {sub.profiles?.apartment_name}</p>
                        <p className="text-xs text-gray-400">📞 {sub.profiles?.phone}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-medium px-2 py-0.5 rounded-full border border-[#c8e6d4]">
                            {sub.products?.size} × {sub.quantity}/day
                          </span>
                          <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                            {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                          </span>
                          <FreqBadge freq={sub.delivery_frequency} />
                          <span className="bg-[#f5f0e8] text-[#1c1c1c] text-xs font-medium px-2 py-0.5 rounded-full">
                            {getSubPlanLabel(sub)}
                          </span>
                          {(() => {
                            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                            const dayLabel = getSubDayLabel(sub)
                            const freq = sub.delivery_frequency || 'daily'
                            const daysLeft = sub.end_date
                              ? Math.max(0, Math.round((new Date(sub.end_date) - new Date(today)) / (1000 * 60 * 60 * 24)))
                              : null
                            const deliveryDaysLeft = daysLeft === null ? null
                              : freq === 'alternate' ? Math.ceil(daysLeft / 2)
                              : freq === 'weekly' ? Math.ceil(daysLeft / 7)
                              : daysLeft
                            return (
                              <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                                {dayLabel}{deliveryDaysLeft !== null ? ` · ${deliveryDaysLeft}d left` : ''}
                              </span>
                            )
                          })()}
                          {sub.start_date > new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && (
                            <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                              Starting {new Date(sub.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {sub.paused_dates?.length > 0 && (
                            <span className="bg-yellow-50 text-yellow-600 text-xs font-medium px-2 py-0.5 rounded-full border border-yellow-200">
                              {sub.paused_dates.length} paused
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                          Since {new Date(sub.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {sub.end_date ? ` · Ends ${new Date(sub.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        <p className="font-bold text-[#1a5c38]">₹{(sub.products?.price || 0) * sub.quantity}/day</p>
                        {sub.bottle_deposit > 0 && (
                          <p className="text-xs text-[#d4a017]">Deposit: ₹{sub.bottle_deposit}</p>
                        )}
                        {deliveryAgents.length > 0 && (
                          <select
                            value={sub.assigned_to || ''}
                            onChange={async (e) => {
                              const agentId = e.target.value
                              await supabase.from('subscriptions').update({ assigned_to: agentId || null }).eq('id', sub.id)
                              setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, assigned_to: agentId } : s))
                            }}
                            className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                            <option value="">Unassigned</option>
                            {deliveryAgents.map(agent => (
                              <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                            ))}
                          </select>
                        )}
                        <button
                          disabled={resendWaLoading[sub.id]}
                          onClick={async () => {
                            setResendWaLoading(prev => ({ ...prev, [sub.id]: true }))
                            const bal = wallets.find(w => w.user_id === sub.user_id)?.balance ?? 0
                            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                            const daysLeft = sub.end_date
                              ? Math.round((new Date(sub.end_date) - new Date(today)) / (1000 * 60 * 60 * 24))
                              : null
                            const messageType = bal < 300 ? 'low_balance'
                              : daysLeft !== null && daysLeft <= 3 ? 'subscription_expiring'
                              : 'subscription_active'
                            const { data: { session } } = await supabase.auth.getSession()
                            const res = await fetch('/api/admin/resend-whatsapp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                              body: JSON.stringify({ userId: sub.user_id, messageType, targetId: sub.id }),
                            })
                            setResendWaLoading(prev => ({ ...prev, [sub.id]: false }))
                            res.ok ? showSuccess(`WhatsApp sent (${messageType})!`) : showError('Failed to send WhatsApp')
                          }}
                          className="text-xs bg-[#25D366] text-white px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition font-semibold disabled:opacity-50">
                          {resendWaLoading[sub.id] ? '...' : '📲 Smart WA'}
                        </button>
                        <button
                          onClick={() => { setStopSubPopup(sub); setStopCancelledBy('admin'); setStopCancellationReason('') }}
                          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-semibold">
                          Stop
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Cancelled / Inactive Subscriptions */}
            {subscriptions.filter(s => !s.is_active).length > 0 && (
              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => {
                    const next = !showCancelledSubs
                    setShowCancelledSubs(next)
                    if (next && Object.keys(cancelledSubCounts).length === 0) loadCancelledSubCounts()
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 rounded-full bg-gray-400" />
                    <div className="text-left">
                      <h3 className="font-[family-name:var(--font-playfair)] text-base font-bold text-gray-500">Cancelled / Inactive</h3>
                      <p className="text-xs text-gray-400">{subscriptions.filter(s => !s.is_active).length} cancelled subscriptions</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                    showCancelledSubs ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                    {showCancelledSubs ? '▲ Hide' : `▼ Show Cancelled (${subscriptions.filter(s => !s.is_active).length})`}
                  </span>
                </button>
                {showCancelledSubs && (
                  <div className="bg-gray-50">
                    {subscriptions.filter(s => !s.is_active).map((sub, index, arr) => (
                      <div key={sub.id}
                        className={`px-6 py-5 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-gray-200' : ''}`}>
                        <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 p-1.5 opacity-50">
                          <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain grayscale" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-400 line-through">{sub.profiles?.full_name}</p>
                          <p className="text-sm text-gray-400">{sub.profiles?.area}, {sub.profiles?.apartment_name}</p>
                          <p className="text-xs text-gray-400">📞 {sub.profiles?.phone}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="bg-gray-100 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200 line-through">
                              {sub.products?.size} × {sub.quantity}/day
                            </span>
                            <span className="bg-gray-100 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                              {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                            </span>
                            <span className="bg-red-50 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">
                              Cancelled
                            </span>
                            {getSubPlanLabel(sub) !== 'Ongoing' && (
                              <span className="bg-gray-100 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                                {getSubPlanLabel(sub)}
                              </span>
                            )}
                            {cancelledSubCounts[sub.id] > 0 && (
                              <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                                {cancelledSubCounts[sub.id]} days delivered
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">
                            {new Date(sub.start_date).toLocaleDateString('en-IN')}
                            {sub.end_date ? ` → ${new Date(sub.end_date).toLocaleDateString('en-IN')}` : ''}
                          </p>
                          {sub.cancelled_by && (
                            <p className="text-xs text-gray-400 mt-1">
                              {sub.cancelled_by === 'admin' ? 'Cancelled by Admin'
                                : sub.cancelled_by === 'customer' ? 'Cancelled by Customer'
                                : 'Cancelled by Delivery Agent'}
                            </p>
                          )}
                          {sub.cancellation_reason && (
                            <p className="text-xs text-red-400 mt-0.5">Reason: {sub.cancellation_reason}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            disabled={reactivatingSubId === sub.id}
                            onClick={() => reactivateSub(sub.id)}
                            className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold disabled:opacity-50">
                            {reactivatingSubId === sub.id ? '...' : '↺ Reactivate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="flex flex-col gap-5">

          {/* Daily Auto-Deduction — all sub-tab only */}
          {customersSubTab === 'all' && (
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Daily Auto-Deduction</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Deduct today&apos;s subscription charges from customer wallets</p>
                </div>
                <button onClick={runDailyDeductions} disabled={deductionLoading}
                  className="text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow text-sm disabled:opacity-60"
                  style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                  {deductionLoading ? 'Running...' : "Run Today's Deductions"}
                </button>
              </div>
              {deductionResult && (
                <div className="px-6 pb-5 border-t border-[#f5f0e8] pt-4">
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div className="bg-[#f0faf4] rounded-xl p-3">
                      <p className="text-2xl font-bold text-[#1a5c38]">{deductionResult.deducted}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Deducted</p>
                    </div>
                    <div className="bg-[#fdfbf7] rounded-xl p-3">
                      <p className="text-2xl font-bold text-gray-400">{deductionResult.skipped}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Already done</p>
                    </div>
                    <div className={`rounded-xl p-3 ${deductionResult.failed > 0 ? 'bg-red-50' : 'bg-[#fdfbf7]'}`}>
                      <p className={`text-2xl font-bold ${deductionResult.failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>{deductionResult.failed}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Low balance</p>
                    </div>
                  </div>
                  {deductionResult.failed > 0 && (
                    <p className="text-xs text-red-500 text-center mb-1">
                      {deductionResult.failed} customer{deductionResult.failed > 1 ? 's' : ''} have insufficient wallet balance.
                    </p>
                  )}
                  <p className="text-xs text-gray-400 text-center">
                    {deductionResult.date} &middot; {deductionResult.total} active subscription{deductionResult.total !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Add Customer Modal */}
          {showAddCustomer && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowAddCustomer(false) }}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Add New Customer</h3>
                  <button onClick={() => setShowAddCustomer(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>
                <form onSubmit={async e => {
                  e.preventDefault()
                  setAddCustomerLoading(true)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const res = await fetch('/api/admin/create-customer', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                      body: JSON.stringify(addCustomerForm),
                    })
                    const data = await res.json()
                    if (!res.ok) {
                      showError(data.error || 'Failed to create customer.')
                    } else {
                      showSuccess(`Customer ${addCustomerForm.full_name} created successfully.`)
                      setShowAddCustomer(false)
                      setAddCustomerForm({ full_name: '', phone: '', apartment_name: '', flat_number: '', area: '', landmark: '' })
                      loadAllData()
                    }
                  } catch {
                    showError('Network error. Please try again.')
                  } finally {
                    setAddCustomerLoading(false)
                  }
                }} className="px-6 py-5 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name *</label>
                      <input required value={addCustomerForm.full_name} onChange={e => setAddCustomerForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone Number * (10 digits)</label>
                      <input required value={addCustomerForm.phone} onChange={e => setAddCustomerForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="9876543210" maxLength={10} inputMode="numeric"
                        className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Apartment / Building</label>
                      <input value={addCustomerForm.apartment_name} onChange={e => setAddCustomerForm(f => ({ ...f, apartment_name: e.target.value }))}
                        placeholder="Green Villa"
                        className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Flat / House No.</label>
                      <input value={addCustomerForm.flat_number} onChange={e => setAddCustomerForm(f => ({ ...f, flat_number: e.target.value }))}
                        placeholder="B-204"
                        className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Area</label>
                      <input value={addCustomerForm.area} onChange={e => setAddCustomerForm(f => ({ ...f, area: e.target.value }))}
                        placeholder="Koramangala"
                        className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Landmark (optional)</label>
                      <input value={addCustomerForm.landmark} onChange={e => setAddCustomerForm(f => ({ ...f, landmark: e.target.value }))}
                        placeholder="Near metro station"
                        className="w-full text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowAddCustomer(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[#e8e0d0] text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={addCustomerLoading}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition"
                      style={{ background: 'linear-gradient(135deg, #1a5c38, #2d7a50)' }}>
                      {addCustomerLoading ? 'Creating...' : 'Create Customer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Main customer list card */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">

            {/* Header */}
            <div className="px-6 py-5 border-b border-[#f5f0e8] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Customers</h3>
                <p className="text-xs text-gray-400 mt-0.5">{customers.length} registered customers</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={customerListSearch}
                  onChange={e => setCustomerListSearch(e.target.value)}
                  className="text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] w-52"
                />
                <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
                  className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                  <option value="all">All Areas</option>
                  {[...new Set(customers.map(c => c.area).filter(Boolean))].sort().map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                <button onClick={() => setShowAddCustomer(true)}
                  className="text-xs bg-[#1a5c38] text-white px-3 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold">
                  + Add Customer
                </button>
                <button onClick={() => {
                  const headers = ['Name','Phone','Email','Area','Building','Flat Number','Landmark','Joined Date']
                  const rows = customers.map(c => [
                    c.full_name || '', c.phone || '', c.email || '', c.area || '',
                    c.apartment_name || '', c.flat_number || '', c.landmark || '',
                    c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '',
                  ])
                  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 5000)
                }} className="text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition font-semibold">
                  Export CSV
                </button>
              </div>
            </div>
            {/* Sub-tabs */}
            <div className="flex gap-1 px-4 py-3 border-b border-[#f5f0e8] overflow-x-auto">
              {[
                { id: 'all', label: `All (${customers.length})` },
                { id: 'active_subs', label: `Active Subs (${subscriptions.filter(s => s.is_active).length})` },
                { id: 'inactive_subs', label: 'Inactive Subs' },
                { id: 'low_balance', label: `Low Balance (${wallets.filter(w => (w.balance ?? 0) < 300).length})` },
                { id: 'wallet_requests', label: `💳 Agent Requests (${walletRequests.filter(r => r.status === 'pending').length})` },
                { id: 'leads', label: `🎯 Leads (${leads.filter(l => !l.converted).length})` },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setCustomersSubTab(id)}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap transition ${
                    customersSubTab === id ? 'bg-[#1a5c38] text-white' : 'text-gray-500 hover:text-[#1a5c38] hover:bg-[#f0faf4]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Wallet Requests sub-tab */}
            {customersSubTab === 'wallet_requests' && (
              walletRequests.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">💳</div>
                  <p className="text-gray-400 text-sm">No wallet requests</p>
                </div>
              ) : (
                <div>
                  {walletRequests.map((req, index, arr) => (
                    <div key={req.id} className={`px-6 py-4 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-[#1c1c1c] text-sm">{req.requester?.full_name}</p>
                          <span className="text-xs text-gray-400">({req.requester?.phone})</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            req.status === 'approved' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                            : req.status === 'rejected' ? 'bg-red-50 text-red-500 border-red-200'
                            : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                          }`}>
                            {req.status === 'approved' ? '✅ Approved' : req.status === 'rejected' ? '❌ Rejected' : '🕐 Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {req.action === 'add' ? '➕ Add' : req.action === 'deduct' ? '➖ Deduct' : '⚙️ Set'}
                          {' '}₹{req.amount}{' → '}
                          <span className="font-medium">{req.target?.full_name || req.target_user_id}</span>
                        </p>
                        {req.note && <p className="text-xs text-gray-400 mt-0.5">Note: {req.note}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button onClick={() => approveWalletRequest(req.id, true)}
                            className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold">
                            Approve
                          </button>
                          <button onClick={() => approveWalletRequest(req.id, false)}
                            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-semibold">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Leads sub-tab */}
            {customersSubTab === 'leads' && (
              <div className="p-4 flex flex-col gap-4">
                <div className="flex gap-2">
                  {[{ id: 'all', label: 'All' }, { id: 'unconverted', label: 'Unconverted only' }].map(({ id, label }) => (
                    <button key={id} onClick={() => setLeadsFilter(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        leadsFilter === id ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'bg-white text-gray-600 border-[#e8e0d0]'
                      }`}>
                      {label}
                    </button>
                  ))}
                  <button onClick={loadLeads} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#e8e0d0] bg-white text-gray-600 hover:border-[#1a5c38] transition">
                    {leadsLoading ? 'Loading…' : '↻ Refresh'}
                  </button>
                </div>

                {leadsLoading ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Loading leads…</div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#e8e0d0] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#f5f0e8] bg-[#fdfbf7]">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Name</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Phone</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Email</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads
                          .filter(l => leadsFilter === 'all' || !l.converted)
                          .map((lead, idx, arr) => (
                            <tr key={lead.id} className={`${idx !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                              <td className="px-4 py-3 font-medium text-[#1c1c1c]">{lead.name || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{lead.phone || '—'}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">{lead.email}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {lead.converted
                                  ? <span className="text-xs bg-[#f0faf4] text-[#1a5c38] font-semibold px-2 py-1 rounded-full">✅ Converted</span>
                                  : <span className="text-xs bg-orange-50 text-orange-600 font-semibold px-2 py-1 rounded-full">⏳ Pending</span>}
                              </td>
                              <td className="px-4 py-3">
                                {!lead.converted && lead.phone && (
                                  <div className="flex gap-2">
                                    <a href={`tel:+91${lead.phone.replace(/\D/g, '').slice(-10)}`}
                                      className="text-xs bg-[#f0faf4] text-[#1a5c38] font-semibold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#1a5c38] hover:text-white transition">
                                      📞 Call
                                    </a>
                                    <a href={`https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}`} target="_blank"
                                      className="text-xs bg-[#25D366] text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition">
                                      💬 WhatsApp
                                    </a>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        {leads.filter(l => leadsFilter === 'all' || !l.converted).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No leads found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Customer list for other sub-tabs */}
            {customersSubTab !== 'wallet_requests' && customersSubTab !== 'leads' && (() => {
              const activeSubByUser = {}
              subscriptions.filter(s => s.is_active).forEach(s => { activeSubByUser[s.user_id] = s })
              const inactiveSubUserIds = new Set(subscriptions.filter(s => !s.is_active).map(s => s.user_id))
              const filteredCustomers = customers.filter(c => {
                if (areaFilter !== 'all' && c.area !== areaFilter) return false
                if (customersSubTab === 'active_subs') return !!activeSubByUser[c.id]
                if (customersSubTab === 'inactive_subs') return !activeSubByUser[c.id] && inactiveSubUserIds.has(c.id)
                if (customersSubTab === 'low_balance') return (wallets.find(w => w.user_id === c.id)?.balance ?? 1000) < 300
                if (customerListSearch.trim()) {
                  const q = customerListSearch.toLowerCase()
                  if (!c.full_name?.toLowerCase().includes(q) && !c.phone?.includes(q)) return false
                }
                return true
              })
              if (filteredCustomers.length === 0) return (
                <div className="px-6 py-12 text-center">
                  <div className="text-5xl mb-3">👥</div>
                  <p className="text-gray-400 text-sm">No customers match this filter</p>
                </div>
              )
              return (
                <div>
                  {filteredCustomers.map((customer, index, arr) => {
                    const w = wallets.find(wt => wt.user_id === customer.id)
                    const balance = w?.balance ?? null
                    const activeSub = activeSubByUser[customer.id]
                    const hasInactiveSub = !activeSub && inactiveSubUserIds.has(customer.id)
                    const iw = inlineWallet[customer.id] || { open: null, amount: '', note: '' }
                    return (
                      <div key={customer.id} className={`px-5 py-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {customer.full_name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="font-semibold text-[#1c1c1c]">{customer.full_name}</p>
                              {activeSub ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]">📅 Active Sub</span>
                              ) : hasInactiveSub ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">⏸ Inactive Sub</span>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-400 border border-red-200">❌ No Sub</span>
                              )}
                              {balance !== null && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  balance === 0 ? 'bg-red-100 text-red-700' : balance < 300 ? 'bg-orange-100 text-orange-700' : 'bg-[#f0faf4] text-[#1a5c38]'
                                }`}>
                                  💰 ₹{balance}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">📞 {customer.phone}</p>
                            <p className="text-xs text-gray-400">{customer.area} • {customer.apartment_name}{customer.flat_number ? `, Flat ${customer.flat_number}` : ''}</p>
                            {activeSub && (
                              <p className="text-xs text-[#1a5c38] font-medium mt-0.5">
                                {activeSub.products?.size} × {activeSub.quantity} · {getSubDayLabel(activeSub)}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(customer.loyalty_points || 0) > 0 && <span className="text-[10px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full">⭐ {customer.loyalty_points} pts</span>}
                              {(customer.streak_count || 0) > 1 && <span className="text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full">🔥 {customer.streak_count}d</span>}
                              {customer.referral_code && <span className="text-[10px] font-semibold bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] px-1.5 py-0.5 rounded-full font-mono">🔗 {customer.referral_code}</span>}
                            </div>
                            {iw.open && (
                              <div className="mt-2 flex flex-wrap gap-2 items-center">
                                <input type="number" placeholder="Amount" value={iw.amount}
                                  onChange={e => setInlineWallet(prev => ({ ...prev, [customer.id]: { ...iw, amount: e.target.value } }))}
                                  className="w-24 border border-[#e8e0d0] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1a5c38]" />
                                <input type="text" placeholder="Note (optional)" value={iw.note}
                                  onChange={e => setInlineWallet(prev => ({ ...prev, [customer.id]: { ...iw, note: e.target.value } }))}
                                  className="flex-1 min-w-0 border border-[#e8e0d0] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1a5c38]" />
                                <button onClick={async () => {
                                  const amt = parseFloat(iw.amount)
                                  if (!amt || amt <= 0) return
                                  const { data: { session } } = await supabase.auth.getSession()
                                  const res = await fetch('/api/admin/wallet-update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                    body: JSON.stringify({ target_user_id: customer.id, action: iw.open, amount: amt, note: iw.note || (iw.open === 'add' ? 'Added by admin' : 'Deducted by admin') }),
                                  })
                                  if (res.ok) {
                                    await loadWallets()
                                    setInlineWallet(prev => ({ ...prev, [customer.id]: { open: null, amount: '', note: '' } }))
                                    showSuccess('Wallet updated!')
                                  } else { showError('Wallet update failed.') }
                                }} className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold">
                                  Confirm
                                </button>
                                <button onClick={() => setInlineWallet(prev => ({ ...prev, [customer.id]: { open: null, amount: '', note: '' } }))}
                                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">✕</button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {w?.deposit_balance > 0 && (
                              <button onClick={() => { setRefundModal({ customer, depositBalance: w.deposit_balance }); setRefundGoodBottles(''); setRefundDamagedBottles(''); setRefundNotes('') }}
                                className="text-xs bg-[#d4a017] text-white px-2.5 py-1 rounded-lg hover:bg-[#b8860b] transition font-semibold">
                                🍼 ₹{w.deposit_balance}
                              </button>
                            )}
                            <div className="flex gap-1.5">
                              <button onClick={() => setInlineWallet(prev => ({ ...prev, [customer.id]: iw.open === 'add' ? { open: null, amount: '', note: '' } : { open: 'add', amount: '', note: '' } }))}
                                className="text-xs bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] px-2.5 py-1 rounded-lg font-semibold hover:bg-[#e0f5e8] transition">
                                + Add
                              </button>
                              <button onClick={() => setInlineWallet(prev => ({ ...prev, [customer.id]: iw.open === 'deduct' ? { open: null, amount: '', note: '' } : { open: 'deduct', amount: '', note: '' } }))}
                                className="text-xs bg-red-50 text-red-500 border border-red-200 px-2.5 py-1 rounded-lg font-semibold hover:bg-red-100 transition">
                                - Deduct
                              </button>
                            </div>
                            {balance > 0 && (
                              <button onClick={() => { setConvertDepositModal({ customer, balance }); setConvertDepositAmount(''); setConvertDepositNote('') }}
                                className="text-xs bg-amber-50 text-amber-700 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold hover:bg-amber-100 transition w-full text-center">
                                🍼 → Deposit
                              </button>
                            )}
                            <div className="flex gap-1.5">
                              <a href={'https://wa.me/91' + customer.phone} target="_blank"
                                className="text-xs bg-[#25D366] text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-[#1da851] transition">
                                WhatsApp
                              </a>
                              <button onClick={() => { setCustomWaModal(customer); setCustomWaType('custom'); setCustomWaMessage('') }}
                                className="text-xs border border-[#25D366] text-[#25D366] px-2.5 py-1 rounded-lg font-semibold hover:bg-[#f0fff4] transition">
                                Send WA
                              </button>
                            </div>
                            <button onClick={async () => {
                              const { data: { session } } = await supabase.auth.getSession()
                              const res = await fetch('/api/admin/generate-login-link', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                body: JSON.stringify({ user_id: customer.id }),
                              })
                              if (res.ok) {
                                showSuccess(`Login link sent to ${customer.full_name}'s WhatsApp!`)
                              } else {
                                const j = await res.json()
                                showError(j.error || 'Failed to send login link.')
                              }
                            }} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg font-semibold hover:bg-blue-100 transition w-full text-center">
                              🔗 Send Login Link
                            </button>
                          </div>
                        </div>
                      <button
                        onClick={() => {
                          if (expandedCustomer === customer.id) {
                            setExpandedCustomer(null)
                          } else {
                            setExpandedCustomer(customer.id)
                            loadCustomerDetails(customer.id)
                          }
                        }}
                        className="text-xs text-[#1a5c38] font-semibold underline underline-offset-2 mt-2">
                        {expandedCustomer === customer.id ? '▲ Hide Details' : '▼ View Details'}
                      </button>
                      {expandedCustomer === customer.id && (
                        <div className="mt-3 border-t border-[#e8e0d0] pt-3 space-y-4">
                          {customerDetailsLoading[customer.id] ? (
                            <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
                          ) : (() => {
                            const d = customerDetails[customer.id]
                            if (!d) return null
                            return (
                              <>
                                {/* Wallet Summary */}
                                <div>
                                  <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">💰 Wallet</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-[#f0faf4] rounded-xl p-3 text-center">
                                      <p className="text-xs text-gray-500">Balance</p>
                                      <p className="font-bold text-[#1a5c38] text-lg">₹{d.wallet?.balance ?? 0}</p>
                                    </div>
                                    <div className="bg-[#fdf6e3] rounded-xl p-3 text-center">
                                      <p className="text-xs text-gray-500">Deposit</p>
                                      <p className="font-bold text-[#92400e] text-lg">₹{d.wallet?.deposit_balance ?? 0}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Active Subscription */}
                                {d.subscription && (
                                  <div>
                                    <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">📅 Active Subscription</p>
                                    <div className="bg-white border border-[#e8e0d0] rounded-xl p-3 text-sm">
                                      <p><span className="text-gray-500">Product:</span> <span className="font-semibold">{d.subscription.products?.size} × {d.subscription.quantity}</span></p>
                                      <p><span className="text-gray-500">Slot:</span> <span className="font-semibold">{d.subscription.delivery_slot === 'morning' ? '7AM–9AM' : '5PM–7PM'}</span></p>
                                      <p><span className="text-gray-500">Start:</span> <span className="font-semibold">{d.subscription.start_date}</span></p>
                                      <p><span className="text-gray-500">Daily:</span> <span className="font-semibold">₹{Math.round((d.subscription.products?.price || 0) * d.subscription.quantity * (1 - (d.subscription.discount_percent || 0) / 100))}</span></p>
                                      <p><span className="text-gray-500">Paused days:</span> <span className="font-semibold">{d.subscription?.paused_dates?.length || 0}</span></p>
                                      {d.subscription?.paused_dates?.length > 0 && (
                                        <div className="mt-2">
                                          <p className="text-xs text-gray-500">Paused dates:</p>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {d.subscription.paused_dates.map(date => (
                                              <span key={date} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                                {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Recent Transactions */}
                                <div>
                                  <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">💳 Recent Transactions</p>
                                  {d.transactions.length === 0 ? (
                                    <p className="text-xs text-gray-400">No transactions yet</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {d.transactions.map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between bg-white border border-[#e8e0d0] rounded-lg px-3 py-2">
                                          <div>
                                            <p className="text-xs font-medium text-[#1c1c1c] truncate max-w-[180px]">{tx.description}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                          </div>
                                          <span className={`text-xs font-bold ${tx.type === 'credit' ? 'text-[#1a5c38]' : 'text-red-500'}`}>
                                            {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Recent Deliveries */}
                                <div>
                                  <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">🚚 Recent Deliveries</p>
                                  {d.deliveries.length === 0 ? (
                                    <p className="text-xs text-gray-400">No deliveries yet</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                      {d.deliveries.map(del => (
                                        <div key={del.id} className="flex items-center justify-between bg-white border border-[#e8e0d0] rounded-lg px-3 py-2">
                                          <div>
                                            <p className="text-xs font-medium text-[#1c1c1c]">{del.delivery_date}</p>
                                            <p className="text-[10px] text-gray-400">{del.subscriptions?.products?.size || 'Milk'}</p>
                                          </div>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${del.not_delivered ? 'bg-red-100 text-red-600' : 'bg-[#f0faf4] text-[#1a5c38]'}`}>
                                            {del.not_delivered ? 'Missed' : 'Delivered'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Recent Orders */}
                                <div>
                                  <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">📦 Recent Orders</p>
                                  {d.orders.length === 0 ? (
                                    <p className="text-xs text-gray-400">No orders yet</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                      {d.orders.map(order => (
                                        <div key={order.id} className="flex items-center justify-between bg-white border border-[#e8e0d0] rounded-lg px-3 py-2">
                                          <div>
                                            <p className="text-xs font-medium text-[#1c1c1c]">{order.products?.size} × {order.quantity}</p>
                                            <p className="text-[10px] text-gray-400">{order.delivery_date}</p>
                                          </div>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            order.status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38]' :
                                            order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                            'bg-[#fdf6e3] text-[#92400e]'
                                          }`}>{order.status}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              )
            })()}

          </div>
          </div>
        )}

        {/* ~~~ OLD_DEAD_CODE_START ~~~ */}
        {false && false && customers.map((customer, index) => (
                  <div key={customer.id}
                    className={`px-6 py-5 flex items-center gap-4 ${index !== customers.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {customer.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1c1c1c]">{customer.full_name}</p>
                        {(() => {
                          const w = wallets.find(w => w.user_id === customer.id)
                          if (!w || w.balance >= 300) return null
                          return (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${w.balance === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {w.balance === 0 ? '🚫 ₹0' : `⚠️ ₹${w.balance}`}
                            </span>
                          )
                        })()}
                      </div>
                      <p className="text-sm text-gray-400">📞 {customer.phone}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {customer.area} • {customer.apartment_name}, Flat {customer.flat_number}
                      </p>
                      {customer.landmark && (
                        <p className="text-xs text-gray-400">Near: {customer.landmark}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <p className="text-xs text-gray-400">Joined {new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {(() => {
                        const w = wallets.find(w => w.user_id === customer.id)
                        if (!w?.deposit_balance || w.deposit_balance <= 0) return null
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-[#d4a017] font-semibold">🍼 Deposit: ₹{w.deposit_balance}</span>
                            <button
                              onClick={() => {
                                setRefundModal({ customer, depositBalance: w.deposit_balance })
                                setRefundGoodBottles('')
                                setRefundDamagedBottles('')
                                setRefundNotes('')
                              }}
                              className="text-xs bg-[#d4a017] text-white px-3 py-1 rounded-lg hover:bg-[#b8860b] transition font-semibold">
                              Refund Deposit
                            </button>
                          </div>
                        )
                      })()}
                      <a href={'https://wa.me/91' + customer.phone} target="_blank"
                        className="flex items-center gap-1 text-xs text-[#25D366] font-semibold hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3 h-3" fill="#25D366">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                      <button
                        onClick={() => {
                          setCustomWaModal(customer)
                          setCustomWaType('custom')
                          setCustomWaMessage('')
                        }}
                        className="text-xs bg-[#25D366] text-white px-2.5 py-1 rounded-lg hover:bg-[#1da851] transition font-semibold">
                        Send WA
                      </button>
                    </div>
                  </div>
                ))}

{/* _wallet_tab_dead_code_ */}
{activeTab === 'wallet_DISABLED' && (
  <div className="flex flex-col gap-6">

  {/* Daily Auto-Deduction */}
  <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
    <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Daily Auto-Deduction</h3>
        <p className="text-xs text-gray-400 mt-0.5">Deduct today&apos;s subscription charges from customer wallets</p>
      </div>
      <button
        onClick={runDailyDeductions}
        disabled={deductionLoading}
        className="text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow text-sm disabled:opacity-60"
        style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
        {deductionLoading ? 'Running...' : 'Run Today\'s Deductions'}
      </button>
    </div>
    {deductionResult && (
      <div className="px-6 pb-5 border-t border-[#f5f0e8] pt-4">
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div className="bg-[#f0faf4] rounded-xl p-3">
            <p className="text-2xl font-bold text-[#1a5c38]">{deductionResult.deducted}</p>
            <p className="text-xs text-gray-500 mt-0.5">Deducted</p>
          </div>
          <div className="bg-[#fdfbf7] rounded-xl p-3">
            <p className="text-2xl font-bold text-gray-400">{deductionResult.skipped}</p>
            <p className="text-xs text-gray-500 mt-0.5">Already done</p>
          </div>
          <div className={`rounded-xl p-3 ${deductionResult.failed > 0 ? 'bg-red-50' : 'bg-[#fdfbf7]'}`}>
            <p className={`text-2xl font-bold ${deductionResult.failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>{deductionResult.failed}</p>
            <p className="text-xs text-gray-500 mt-0.5">Low balance</p>
          </div>
        </div>
        {deductionResult.failed > 0 && (
          <p className="text-xs text-red-500 text-center mb-1">
            {deductionResult.failed} customer{deductionResult.failed > 1 ? 's' : ''} have insufficient wallet balance — please top up their wallets.
          </p>
        )}
        <p className="text-xs text-gray-400 text-center">
          {deductionResult.date} &middot; {deductionResult.total} active subscription{deductionResult.total !== 1 ? 's' : ''}
        </p>
      </div>
    )}
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

    {/* Customer Wallet List */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Customer Wallets</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {walletsLastUpdated
              ? `Updated ${walletsLastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Click customer to add balance'}
          </p>
        </div>
        <button
          onClick={loadWallets}
          className="text-xs text-[#1a5c38] border border-[#1a5c38] px-3 py-1.5 rounded-lg hover:bg-[#f0faf4] transition font-semibold flex-shrink-0"
        >
          ↻ Refresh
        </button>
      </div>
      {walletsWithProfiles.filter(w => w.profile).length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-400">No wallet data yet</p>
        </div>
      ) : (
        walletsWithProfiles.filter(w => w.profile).map((w, index, arr) => {
          const customer = w.profile
          return (
            <div key={w.user_id}
              onClick={() => { setSelectedCustomer(customer); setWalletMessage('') }}
              className={`px-6 py-4 flex items-center justify-between cursor-pointer transition ${
                selectedCustomer?.id === customer.id
                  ? 'bg-[#f0faf4] border-l-4 border-[#1a5c38]'
                  : 'hover:bg-[#fdfbf7]'
              } ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {customer.full_name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-semibold text-[#1c1c1c] text-sm">{customer.full_name}</p>
                  <p className="text-xs text-gray-400">{customer.phone}</p>
                  <p className="text-xs text-gray-400">{customer.area}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1a5c38]">₹{w.balance ?? 0}</p>
                <p className="text-xs text-gray-400">available</p>
                {w.deposit_balance > 0 && (
                  <p className="text-xs text-[#d4a017] font-semibold">🍼 Deposit: ₹{w.deposit_balance}</p>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>

    {/* Add Balance Form */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Add / Deduct Balance</h3>
      </div>
      <div className="px-6 py-5">
        {!selectedCustomer ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👆</div>
            <p className="text-gray-400 text-sm">Select a customer from the left to manage their wallet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-[#f5f0e8] rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg">
                {selectedCustomer.full_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-[#1c1c1c]">{selectedCustomer.full_name}</p>
                <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
                <p className="text-sm font-bold text-[#1a5c38]">
                  Balance: ₹{wallets.find(w => w.user_id === selectedCustomer.id)?.balance ?? 0}
                </p>
                {wallets.find(w => w.user_id === selectedCustomer.id)?.deposit_balance > 0 && (
                  <p className="text-xs text-[#d4a017] font-semibold">
                    🍼 Deposit: ₹{wallets.find(w => w.user_id === selectedCustomer.id)?.deposit_balance}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Amount (₹)</label>
              <input type="number" placeholder="Enter amount"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Note</label>
              <input type="text" placeholder="Eg: Monthly recharge, Bonus credit"
                value={walletNote}
                onChange={(e) => setWalletNote(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>

            {walletMessage && (
              <div className={`rounded-lg px-4 py-3 text-sm text-center font-medium ${
                walletMessage.includes('Error') || walletMessage.includes('Insufficient') || walletMessage.includes('Please')
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]'
              }`}>
                {walletMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  if (!walletAmount || walletAmount <= 0) { setWalletMessage('Please enter a valid amount!'); return }
                  setWalletLoading(true)
                  setWalletMessage('')
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/wallet-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ target_user_id: selectedCustomer.id, action: 'add', amount: parseFloat(walletAmount), note: walletNote || 'Added by admin' }),
                  })
                  const result = await res.json()
                  if (!res.ok) {
                    setWalletMessage('Error: ' + (result.error || 'Could not update wallet'))
                  } else {
                    await loadWallets()
                    setWalletAmount('')
                    setWalletNote('')
                    setWalletMessage('₹' + walletAmount + ' added! New balance: ₹' + result.new_balance)
                  }
                  setWalletLoading(false)
                }}
                disabled={walletLoading}
                className="text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow text-sm"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                + Add Balance
              </button>
              <button
                onClick={async () => {
                  if (!walletAmount || walletAmount <= 0) { setWalletMessage('Please enter a valid amount!'); return }
                  const customerWallet = wallets.find(w => w.user_id === selectedCustomer.id)
                  if ((customerWallet?.balance || 0) < parseFloat(walletAmount)) {
                    setWalletMessage('Insufficient balance!')
                    return
                  }
                  setWalletLoading(true)
                  setWalletMessage('')
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/wallet-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ target_user_id: selectedCustomer.id, action: 'deduct', amount: parseFloat(walletAmount), note: walletNote || 'Deducted by admin' }),
                  })
                  const result = await res.json()
                  if (!res.ok) {
                    setWalletMessage('Error: ' + (result.error || 'Could not update wallet'))
                  } else {
                    await loadWallets()
                    setWalletAmount('')
                    setWalletNote('')
                    setWalletMessage('₹' + walletAmount + ' deducted! New balance: ₹' + result.new_balance)
                  }
                  setWalletLoading(false)
                }}
                disabled={walletLoading}
                className="border-2 border-red-300 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition text-sm">
                - Deduct
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  </div>
)}

{/* Delivery History Tab */}
{activeTab === 'delivery_history' && (
  <div className="flex flex-col gap-5">
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-3">📋 Delivery History</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <input type="date" value={historyStartDate}
              onChange={e => setHistoryStartDate(e.target.value)}
              className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End Date</label>
            <input type="date" value={historyEndDate}
              onChange={e => setHistoryEndDate(e.target.value)}
              className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Agent</label>
            <input type="text" placeholder="Filter by agent..."
              value={historyAgentFilter}
              onChange={e => setHistoryAgentFilter(e.target.value)}
              className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] w-36" />
          </div>
          <button
            onClick={() => { setHistoryLoaded(false); loadDeliveryHistory(historyStartDate, historyEndDate) }}
            className="text-xs bg-[#1a5c38] text-white px-4 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold">
            Load History
          </button>
          <button
            onClick={() => {
              const filtered = deliveryHistory.filter(d =>
                !historyAgentFilter || d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())
              )
              const headers = ['Date', 'Type', 'Customer', 'Phone', 'Product', 'Qty', 'Delivered By', 'Delivered At']
              const rows = filtered.map(d => [
                d.date, d.type === 'subscription' ? 'Subscription' : 'One-time',
                d.customerName, d.phone, d.product, d.quantity, d.deliveredBy,
                d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-',
              ])
              const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `delivery_history_${historyStartDate}_${historyEndDate}.csv`; a.click()
              setTimeout(() => URL.revokeObjectURL(url), 5000)
            }}
            className="text-xs border border-[#1a5c38] text-[#1a5c38] px-3 py-2 rounded-lg hover:bg-[#f0faf4] transition font-semibold">
            Export CSV
          </button>
        </div>
      </div>
      {historyLoading ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading delivery history...</div>
      ) : (() => {
        const filtered = deliveryHistory.filter(d =>
          !historyAgentFilter || d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())
        )
        if (filtered.length === 0) {
          return (
            <div className="px-6 py-12 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400 text-sm">No delivery records found. Click Load History to fetch data.</p>
            </div>
          )
        }
        const byDate = filtered.reduce((acc, d) => {
          if (!acc[d.date]) acc[d.date] = []
          acc[d.date].push(d)
          return acc
        }, {})
        return (
          <div>
            {Object.entries(byDate).map(([date, items]) => {
              const delivered = items.filter(i => i.status === 'delivered').length
              const missed = items.filter(i => i.status === 'missed').length
              const cancelled = items.filter(i => i.status === 'cancelled').length
              const failed = items.filter(i => i.status === 'failed').length
              return (
                <div key={date}>
                  <div className="px-6 py-3 bg-[#f5f0e8] flex items-center justify-between gap-3 border-b border-[#e8e0d0] flex-wrap">
                    <p className="font-semibold text-[#1c1c1c] text-sm">
                      {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-2.5 py-1 rounded-full border border-[#c8e6d4]">✅ {delivered} delivered</span>
                      {missed > 0 && <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">⚠️ {missed} missed</span>}
                      {cancelled > 0 && <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">❌ {cancelled} cancelled</span>}
                      {failed > 0 && <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">🚫 {failed} failed</span>}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#fdfbf7] text-xs text-gray-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-5 py-2 text-left">Customer</th>
                          <th className="px-5 py-2 text-left">Product</th>
                          <th className="px-5 py-2 text-left">Type</th>
                          <th className="px-5 py-2 text-left">Delivered By</th>
                          <th className="px-5 py-2 text-left">Time</th>
                          <th className="px-5 py-2 text-left">Photo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((d, idx) => (
                          <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]'}>
                            <td className="px-5 py-3">
                              <p className="font-semibold text-[#1c1c1c]">{d.customerName}</p>
                              <p className="text-xs text-gray-400">{d.phone}</p>
                            </td>
                            <td className="px-5 py-3 text-[#1c1c1c]">
                              {d.product} <span className="text-gray-400 text-xs">x{d.quantity}</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.type === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]'}`}>
                                {d.type === 'subscription' ? '📅 Sub' : '🛒 Order'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{d.deliveredBy || '-'}</td>
                            <td className="px-5 py-3 text-gray-400 text-xs">
                              {d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-'}
                            </td>
                            <td className="px-5 py-3">
                              {d.photo_url ? (
                                <a href={d.photo_url} target="_blank" rel="noreferrer">
                                  <img src={d.photo_url} alt="proof" className="w-10 h-10 rounded-lg object-cover border border-[#e8e0d0] hover:opacity-80 transition" />
                                </a>
                              ) : <span className="text-xs text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  </div>
)}

{/* Delivery Agents Tab */}
{activeTab === 'delivery' && (
  <div className="flex flex-col gap-5">

    {/* Sub-tabs */}
    <div className="flex gap-2 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm">
      {[
        { id: 'list', label: `Agents (${deliveryAgents.length})` },
        { id: 'add_new', label: '+ Add New Agent' },
        { id: 'assign', label: 'Assign Orders' },
      ].map(({ id, label }) => (
        <button key={id} onClick={() => setAgentsSubTab(id)}
          className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
            agentsSubTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38] hover:bg-[#f0faf4]'
          }`}>
          {label}
        </button>
      ))}
    </div>

    {/* List sub-tab */}
    {agentsSubTab === 'list' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Delivery Agents</h3>
          <p className="text-xs text-gray-400 mt-0.5">{deliveryAgents.length} agents</p>
        </div>
        {deliveryAgents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-3">🚴</div>
            <p className="text-gray-400 text-sm">No delivery agents yet</p>
          </div>
        ) : (
          <div>
            {deliveryAgents.map((agent, index, arr) => {
              const rec = deliveryAgentRecords.find(r => r.phone === agent.phone || r.user_id === agent.id)
              return (
                <div key={agent.id} className={`px-6 py-4 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                  <div className="w-11 h-11 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {agent.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-[#1c1c1c]">{agent.full_name}</p>
                      {rec ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rec.is_active !== false ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {rec.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">📞 {agent.phone}</p>
                    {agent.area && <p className="text-xs text-gray-400">{agent.area}</p>}
                    {rec?.dl_number && <p className="text-xs text-gray-400 mt-0.5">DL: {rec.dl_number}</p>}
                    {rec?.bike_number && <p className="text-xs text-gray-400">Bike: {rec.bike_number}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.from('profiles').update({ is_delivery: false }).eq('id', agent.id)
                      setDeliveryAgents(deliveryAgents.filter(a => a.id !== agent.id))
                    }}
                    className="text-xs border border-red-300 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition font-semibold flex-shrink-0">
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )}

    {/* Add New Agent sub-tab */}
    {agentsSubTab === 'add_new' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Add New Delivery Agent</h3>
          <p className="text-xs text-gray-400 mt-0.5">Creates a login account and sends WhatsApp welcome</p>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Full Name *</label>
              <input type="text" value={agentForm.full_name} onChange={e => setAgentForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Agent full name" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Phone Number *</label>
              <input type="text" value={agentForm.phone} onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit mobile" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Email ID *</label>
              <input type="email" value={agentForm.email} onChange={e => setAgentForm(f => ({ ...f, email: e.target.value }))}
                placeholder="agent@example.com" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Password *</label>
              <input type="password" value={agentForm.password} onChange={e => setAgentForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Set login password" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">DL / ID Number</label>
              <input type="text" value={agentForm.dl_number} onChange={e => setAgentForm(f => ({ ...f, dl_number: e.target.value }))}
                placeholder="Driving licence number" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Bike Number</label>
              <input type="text" value={agentForm.bike_number} onChange={e => setAgentForm(f => ({ ...f, bike_number: e.target.value }))}
                placeholder="Vehicle registration" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Address</label>
            <textarea value={agentForm.address} onChange={e => setAgentForm(f => ({ ...f, address: e.target.value }))}
              rows={2} placeholder="Agent&apos;s home address"
              className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Photo</label>
              <input type="file" accept="image/*" onChange={e => setAgentPhoto(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#f0faf4] file:text-[#1a5c38] hover:file:bg-[#e0f5e8]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">DL / ID Document</label>
              <input type="file" accept="image/*,application/pdf" onChange={e => setAgentDoc(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#f0faf4] file:text-[#1a5c38] hover:file:bg-[#e0f5e8]" />
            </div>
          </div>
          <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl px-4 py-3 text-xs text-[#a07830]">
            After saving, the agent will receive a WhatsApp message to login at <strong>srikrishnaadairy.in/delivery</strong>
          </div>
          <button
            disabled={agentSaving || !agentForm.full_name || !agentForm.phone || !agentForm.email || !agentForm.password}
            onClick={async () => {
              setAgentSaving(true)
              try {
                const ts = Date.now()
                let photo_url = null, document_url = null
                if (agentPhoto) {
                  const { data: pData } = await supabase.storage
                    .from('delivery-agent-docs')
                    .upload(`photos/${agentForm.phone}_${ts}`, agentPhoto, { upsert: true })
                  if (pData) {
                    const { data: { publicUrl } } = supabase.storage.from('delivery-agent-docs').getPublicUrl(pData.path)
                    photo_url = publicUrl
                  }
                }
                if (agentDoc) {
                  const { data: dData } = await supabase.storage
                    .from('delivery-agent-docs')
                    .upload(`docs/${agentForm.phone}_${ts}`, agentDoc, { upsert: true })
                  if (dData) {
                    const { data: { publicUrl } } = supabase.storage.from('delivery-agent-docs').getPublicUrl(dData.path)
                    document_url = publicUrl
                  }
                }
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/admin/create-delivery-agent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ ...agentForm, photo_url, document_url }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Failed to save agent')
                setDeliveryAgents(prev => [...prev, { id: json.user_id, full_name: agentForm.full_name, phone: agentForm.phone, is_delivery: true }])
                setDeliveryAgentRecords(prev => [...prev, { ...agentForm, photo_url, document_url, is_active: true, user_id: json.user_id }])
                setAgentForm({ full_name: '', phone: '', email: '', password: '', address: '', dl_number: '', bike_number: '' })
                setAgentPhoto(null)
                setAgentDoc(null)
                showSuccess(`Agent ${agentForm.full_name} added!`)
                setAgentsSubTab('list')
              } catch (err) {
                showError(err.message || 'Failed to save agent')
              }
              setAgentSaving(false)
            }}
            className="text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow text-sm disabled:opacity-50"
            style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {agentSaving ? 'Saving...' : 'Save Agent'}
          </button>
        </div>
      </div>
    )}

    {/* Assign Orders sub-tab */}
    {agentsSubTab === 'assign' && (() => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const combined = [
        ...orders.map(o => ({
          ...o,
          _type: ['COD', 'wallet', 'razorpay'].includes(o.payment_method) ? 'trial' : 'order',
          _date: o.delivery_date || '',
          _profile: o.profiles,
        })),
        ...todaySubscriptions.map(sub => ({
          ...sub,
          _type: 'subscription',
          _date: today,
          _profile: sub.profiles,
        })),
      ]
      const areas = [...new Set(combined.map(i => i._profile?.area).filter(Boolean))].sort()
      const filtered = combined.filter(item => {
        const p = item._profile
        if (assignSearch) {
          const q = assignSearch.toLowerCase()
          if (!p?.full_name?.toLowerCase().includes(q) && !p?.phone?.includes(q)) return false
        }
        if (assignAreaFilter !== 'all' && p?.area !== assignAreaFilter) return false
        if (assignDateFilter && item._date !== assignDateFilter) return false
        if (assignSlotFilter !== 'all' && item.delivery_slot !== assignSlotFilter) return false
        return true
      })
      return (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] p-4 shadow-sm flex flex-wrap gap-3">
            <input type="text" placeholder="Search customer or phone…" value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
              className="flex-1 min-w-0 border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38]" />
            <select value={assignAreaFilter} onChange={e => setAssignAreaFilter(e.target.value)}
              className="text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
              <option value="all">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="date" value={assignDateFilter} onChange={e => setAssignDateFilter(e.target.value)}
              className="text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]" />
            <select value={assignSlotFilter} onChange={e => setAssignSlotFilter(e.target.value)}
              className="text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
              <option value="all">All Slots</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </select>
          </div>
          {/* Order list */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#f5f0e8]">
              <p className="text-xs text-gray-400">{filtered.length} items · orders + subscriptions</p>
            </div>
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-400 text-sm">No orders match filters</p>
              </div>
            ) : (
              <div>
                {filtered.map((item, index, arr) => (
                  <div key={(item._type === 'subscription' ? 'sub-' : 'ord-') + item.id}
                    className={`px-6 py-4 flex items-start gap-3 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-9 h-9 rounded-xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 text-base">
                      {item._type === 'subscription' ? '📅' : item._type === 'trial' ? '🎁' : '🛒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c] text-sm">{item._profile?.full_name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          item._type === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                          : item._type === 'trial' ? 'bg-orange-50 text-orange-600 border-orange-200'
                          : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                        }`}>
                          {item._type === 'subscription' ? '📅 Sub' : item._type === 'trial' ? '🎁 Trial' : '🛒 Order'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">📞 {item._profile?.phone}</p>
                      <p className="text-xs text-gray-400">{item._profile?.area} · {item._profile?.apartment_name}{item._profile?.flat_number ? `, Flat ${item._profile.flat_number}` : ''}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-0.5">
                        {item.products?.size} × {item.quantity} · {item.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'} · {item._date}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {deliveryAgents.length === 0 ? (
                        <span className="text-xs text-gray-400 border border-[#e8e0d0] px-3 py-1.5 rounded-lg">No agents</span>
                      ) : (
                        <select
                          value={item.assigned_to || ''}
                          onChange={async (e) => {
                            const agentId = e.target.value
                            const table = item._type === 'subscription' ? 'subscriptions' : 'orders'
                            await supabase.from(table).update({ assigned_to: agentId || null }).eq('id', item.id)
                            if (item._type === 'subscription') {
                              setTodaySubscriptions(prev => prev.map(s => s.id === item.id ? { ...s, assigned_to: agentId } : s))
                            } else {
                              setOrders(prev => prev.map(o => o.id === item.id ? { ...o, assigned_to: agentId } : o))
                            }
                          }}
                          className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                          <option value="">Unassigned</option>
                          {deliveryAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    })()}

  </div>
)}

{activeTab === 'reviews' && (
  <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
    <div className="px-6 py-5 border-b border-[#f5f0e8]">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Customer Reviews</h3>
      <p className="text-xs text-gray-400 mt-0.5">{reviews.length} total · {reviews.filter(r => r.is_approved).length} approved</p>
    </div>
    {reviews.length === 0 ? (
      <div className="px-6 py-12 text-center text-gray-400 text-sm">No reviews yet.</div>
    ) : (
      <div className="divide-y divide-[#f5f0e8]">
        {reviews.map((r) => (
          <div key={r.id} className="px-6 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {r.profiles?.full_name?.[0] || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-[#1c1c1c]">{r.profiles?.full_name || 'Customer'}</span>
                <span className="text-[#d4a017] text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {r.review && <p className="text-sm text-gray-600">{r.review}</p>}
              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.is_approved ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-[#fdf6e3] text-[#92400e] border border-[#f0dfa0]'}`}>
                {r.is_approved ? 'Approved' : 'Pending'}
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!r.is_approved && (
                <button onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/reviews/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ reviewId: r.id, approved: true }),
                  })
                  if (res.ok) setReviews(reviews.map(x => x.id === r.id ? { ...x, is_approved: true } : x))
                }} className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold">
                  Approve
                </button>
              )}
              {r.is_approved && (
                <button onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/reviews/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ reviewId: r.id, approved: false }),
                  })
                  if (res.ok) setReviews(reviews.map(x => x.id === r.id ? { ...x, is_approved: false } : x))
                }} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-semibold">
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}


{/* Issue Reports Tab */}
{activeTab === 'reports' && (
  <div className="flex flex-col gap-5">
    {/* Sub-tabs */}
    <div className="flex gap-1 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
      {[
        { id: 'missed',           label: '⚠️ Missed',           count: missedReports.length     },
        { id: 'quality',          label: '👎 Quality',          count: qualityReports.length    },
        { id: 'suggestions',      label: '💬 Suggestions',      count: suggestions.length       },
        { id: 'delivery_issues',  label: '🚴 Agent Reports',    count: deliveryIssues.length    },
        { id: 'failed',           label: '❌ Failed Deductions', count: failedDeductions.length  },
      ].map(({ id, label, count }) => (
        <button key={id} onClick={() => setReportsSubTab(id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
            reportsSubTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38]'
          }`}>
          {label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${reportsSubTab === id ? 'bg-white text-[#1a5c38]' : 'bg-gray-100'}`}>{count}</span>
        </button>
      ))}
    </div>

    {/* missed */}
    {reportsSubTab === 'missed' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">⚠️ Missed Delivery Reports</h3>
          <p className="text-xs text-gray-400 mt-0.5">{missedReports.length} reports total</p>
        </div>
        {missedReports.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">No missed delivery reports. Great!</div>
        ) : (
          <div className="divide-y divide-[#f5f0e8]">
            {missedReports.map((r) => {
              const prof = r.profiles
              const order = r.orders
              const dateStr = order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
              const slot = order?.delivery_slot === 'morning' ? 'Morning (7AM–9AM)' : 'Evening (5PM–7PM)'
              const address = [prof?.flat_number, prof?.apartment_name, prof?.area].filter(Boolean).join(', ')
              return (
                <div key={r.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-[#1c1c1c]">{prof?.full_name || 'Customer'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">📞 {prof?.phone || 'N/A'} · 📍 {address || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">🥛 {order?.products?.size || 'Milk'} · 📅 {dateStr} · ⏰ {slot}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs bg-red-50 text-red-600 border border-red-200 font-semibold px-2 py-0.5 rounded-full">Reported</span>
                      <p className="text-xs text-gray-400 mt-1">{new Date(r.reported_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )}

    {/* quality */}
    {reportsSubTab === 'quality' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">👎 Quality Feedback</h3>
          <p className="text-xs text-gray-400 mt-0.5">{qualityReports.length} reports</p>
        </div>
        {qualityReports.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">No quality complaints. Excellent!</div>
        ) : (
          <div className="divide-y divide-[#f5f0e8]">
            {qualityReports.map((r) => {
              const dateStr = r.orders?.delivery_date
                ? new Date(r.orders.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              return (
                <div key={r.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-[#1c1c1c]">{r.profiles?.full_name || 'Customer'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">📞 {r.profiles?.phone || 'N/A'} · 🥛 {r.orders?.products?.size || 'Milk'} · {dateStr}</p>
                      <p className="text-sm text-orange-700 mt-1 italic">"{r.issue}"</p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">{new Date(r.reported_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )}

    {/* suggestions */}
    {reportsSubTab === 'suggestions' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">💬 Customer Suggestions</h3>
          <p className="text-xs text-gray-400 mt-0.5">{suggestions.length} total</p>
        </div>
        {suggestions.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">No customer suggestions yet.</div>
        ) : (
          <div className="divide-y divide-[#f5f0e8]">
            {suggestions.map((s) => (
              <div key={s.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-[#1c1c1c]">{s.profiles?.full_name || 'Customer'}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        s.type === 'complaint' ? 'bg-red-50 text-red-600 border border-red-200'
                        : s.type === 'compliment' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]'
                        : 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]'
                      }`}>
                        {s.type === 'complaint' ? '⚠️ Complaint' : s.type === 'compliment' ? '⭐ Compliment' : '💡 Suggestion'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">📞 {s.profiles?.phone || 'N/A'}</p>
                    <p className="text-sm text-[#1c1c1c]">{s.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'resolved' ? 'bg-[#f0faf4] text-[#1a5c38]' : 'bg-yellow-50 text-yellow-600'}`}>
                      {s.status === 'resolved' ? '✅ Resolved' : '⏳ Open'}
                    </span>
                    {s.status !== 'resolved' && (
                      <button onClick={async () => {
                        await supabase.from('customer_suggestions').update({ status: 'resolved' }).eq('id', s.id)
                        setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'resolved' } : x))
                        showSuccess('Marked as resolved')
                      }} className="text-xs bg-[#1a5c38] text-white font-bold px-3 py-1 rounded-lg hover:bg-[#14472c] transition">
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* delivery_issues */}
    {reportsSubTab === 'delivery_issues' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">🚴 Delivery Agent Reports</h3>
          <p className="text-xs text-gray-400 mt-0.5">{deliveryIssues.length} total</p>
        </div>
        {deliveryIssues.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">No agent reports yet.</div>
        ) : (
          <div className="divide-y divide-[#f5f0e8]">
            {deliveryIssues.map((issue) => {
              const agentName = deliveryAgents.find(a => a.id === issue.reported_by)?.full_name || 'Agent'
              const agentPhone = deliveryAgents.find(a => a.id === issue.reported_by)?.phone || ''
              return (
                <div key={issue.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-[#1c1c1c]">{agentName}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          issue.type === 'issue' ? 'bg-red-50 text-red-600 border border-red-200'
                          : issue.type === 'feedback' ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                        }`}>
                          {issue.type === 'issue' ? '⚠️ Issue' : issue.type === 'feedback' ? '💬 Feedback' : '💡 Suggestion'}
                        </span>
                      </div>
                      {agentPhone && <p className="text-xs text-gray-500 mb-1">📞 {agentPhone}</p>}
                      <p className="text-sm text-[#1c1c1c]">{issue.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-xs text-gray-400">{new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${issue.status === 'resolved' ? 'bg-[#f0faf4] text-[#1a5c38]' : 'bg-yellow-50 text-yellow-600'}`}>
                        {issue.status === 'resolved' ? '✅ Resolved' : '⏳ Open'}
                      </span>
                      {issue.status !== 'resolved' && (
                        <button onClick={async () => {
                          await supabase.from('delivery_issues').update({ status: 'resolved' }).eq('id', issue.id)
                          setDeliveryIssues(prev => prev.map(x => x.id === issue.id ? { ...x, status: 'resolved' } : x))
                          showSuccess('Marked as resolved')
                        }} className="text-xs bg-[#1a5c38] text-white font-bold px-3 py-1 rounded-lg hover:bg-[#14472c] transition">
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )}

    {/* failed */}
    {reportsSubTab === 'failed' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">❌ Failed Subscription Deductions</h3>
          <p className="text-xs text-gray-400 mt-0.5">{failedDeductions.length} total failures</p>
        </div>
        {failedDeductions.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">No failed deductions. All subscriptions are healthy!</div>
        ) : (
          <div className="divide-y divide-[#f5f0e8]">
            {failedDeductions.map((d) => (
              <div key={d.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-[#1c1c1c]">{customers.find(c => c.id === d.user_id)?.full_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">📞 {customers.find(c => c.id === d.user_id)?.phone || 'N/A'} · Sub #{d.subscription_id}</p>
                    <p className="text-xs text-red-500 mt-0.5 font-medium">{d.reason}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Amount due: ₹{d.amount}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}

    {/* ── Settings Tab ── */}
    {activeTab === 'settings' && (
      <div className="flex flex-col gap-6">
        {!settingsLoaded && (
          <div className="text-center py-12 text-gray-400 text-sm">Loading settings...</div>
        )}
        <div className={settingsLoaded ? 'flex flex-col gap-6' : 'hidden'}>

        {/* WhatsApp template cleanup warning */}
        {process.env.NEXT_PUBLIC_WHATSAPP_CLEANUP_DONE !== 'true' && (
          <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 shadow-sm">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-3">📱 WhatsApp Templates</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-amber-800 mb-1">⚠️ Action Required</p>
              <p className="text-sm text-amber-700">You have old Marketing category templates in Meta that should be deleted once you confirm the v2 Utility templates are working correctly.</p>
            </div>
            <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">Templates to delete from Meta Business Manager:</p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              {[
                ['order_confirmed', 'order_confirmed_'],
                ['subscription_activated', 'subscription_activated_v2'],
                ['delivery_confirmed', 'delivery_confirmed_v2'],
                ['delivery_stopped', 'delivery_stopped_v2'],
                ['low_balance_alert', 'low_balance_alert_v2'],
              ].map(([old, replacement]) => (
                <li key={old} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{old}</span> <span className="text-gray-400">→ replaced by</span> <span className="font-mono text-xs bg-[#f0faf4] text-[#1a5c38] px-1.5 py-0.5 rounded">{replacement}</span></span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400">Once deleted, set <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">NEXT_PUBLIC_WHATSAPP_CLEANUP_DONE=true</span> in your Vercel environment variables to dismiss this card.</p>
          </div>
        )}

        {/* A. Business Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">⚙️ Business Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            {[
              { key: 'max_subscribers', label: 'Max Subscribers', type: 'number', placeholder: '100' },
              { key: 'delivery_cutoff_time', label: 'Delivery Cutoff Time', type: 'time', placeholder: '18:00' },
              { key: 'min_wallet_balance', label: 'Min Wallet Balance (₹)', type: 'number', placeholder: '300' },
              { key: 'pause_limit_per_month', label: 'Pause Limit per Month', type: 'number', placeholder: '5' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">{label}</label>
                <div className="flex gap-2">
                  <input type={type} value={appSettings[key] || ''}
                    onChange={e => setAppSettings(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
                  <button onClick={() => saveSetting(key, appSettings[key])} disabled={settingsSaving[key]}
                    className="bg-[#1a5c38] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'waitlist_enabled', label: 'Waitlist Enabled', defaultOn: true },
              { key: 'maintenance_mode', label: 'Maintenance Mode', defaultOn: false },
            ].map(({ key, label, defaultOn }) => {
              const isOn = appSettings[key] !== undefined ? appSettings[key] === 'true' : defaultOn
              return (
                <div key={key} className="flex items-center justify-between bg-[#f5f0e8] rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-[#1c1c1c]">{label}</span>
                  <button onClick={() => saveSetting(key, isOn ? 'false' : 'true')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${isOn ? 'bg-[#1a5c38]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* B. Product Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">🥛 Product Controls</h3>
          <div className="flex flex-col gap-3 mb-6">
            {products.map(product => {
              const edit = editProducts[product.id] !== undefined ? editProducts[product.id] : product
              return (
                <div key={product.id} className="bg-[#f5f0e8] rounded-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { field: 'name', label: 'Name', type: 'text' },
                      { field: 'size', label: 'Size', type: 'text' },
                      { field: 'price', label: 'Price (₹)', type: 'number' },
                    ].map(({ field, label, type }) => (
                      <div key={field}>
                        <label className="block text-xs text-gray-400 mb-1">{label}</label>
                        <input type={type} value={edit[field] || ''}
                          onChange={e => setEditProducts(p => ({ ...p, [product.id]: { ...edit, [field]: e.target.value } }))}
                          className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38] bg-white" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Available</label>
                      <button
                        onClick={() => setEditProducts(p => ({ ...p, [product.id]: { ...edit, is_available: !edit.is_available } }))}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition ${edit.is_available ? 'bg-[#1a5c38] text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {edit.is_available ? '✅ Available' : '❌ Disabled'}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => saveProductEdit(product.id)}
                    className="bg-[#d4a017] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#b8860b] transition">
                    Save Changes
                  </button>
                </div>
              )
            })}
          </div>
          <div className="border-2 border-dashed border-[#e8e0d0] rounded-xl p-5">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4">+ Add New Product</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                { field: 'name', label: 'Name', placeholder: 'Fresh Cow Milk', type: 'text' },
                { field: 'size', label: 'Size', placeholder: '500ml', type: 'text' },
                { field: 'price', label: 'Price (₹)', placeholder: '50', type: 'number' },
              ].map(({ field, label, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input type={type} value={newProduct[field]}
                    onChange={e => setNewProduct(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38]" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Available</label>
                <button onClick={() => setNewProduct(p => ({ ...p, is_available: !p.is_available }))}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition ${newProduct.is_available ? 'bg-[#1a5c38] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {newProduct.is_available ? '✅ Available' : '❌ Disabled'}
                </button>
              </div>
            </div>
            <button onClick={addNewProduct} disabled={productAddLoading || !newProduct.name || !newProduct.size || !newProduct.price}
              className="bg-[#1a5c38] text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
              {productAddLoading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </div>

        {/* C. Delivery Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">🚴 Delivery Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { key: 'morning_slot_enabled', label: '🌅 Morning Slot' },
              { key: 'evening_slot_enabled', label: '🌆 Evening Slot' },
              { key: 'trial_order_enabled', label: '🎁 Trial Orders' },
            ].map(({ key, label }) => {
              const isOn = appSettings[key] !== 'false'
              return (
                <div key={key} className="flex items-center justify-between bg-[#f5f0e8] rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-[#1c1c1c]">{label}</span>
                  <button onClick={() => saveSetting(key, isOn ? 'false' : 'true')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${isOn ? 'bg-[#1a5c38]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">Bottle Deposit Amount (₹)</label>
            <div className="flex gap-2 max-w-xs">
              <input type="number" min="0" value={appSettings.bottle_deposit_amount || '200'}
                onChange={e => setAppSettings(p => ({ ...p, bottle_deposit_amount: e.target.value }))}
                className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
              <button onClick={() => saveSetting('bottle_deposit_amount', appSettings.bottle_deposit_amount)} disabled={settingsSaving.bottle_deposit_amount}
                className="bg-[#1a5c38] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
                Save
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-3">Holiday / No-Delivery Dates</p>
            <div className="flex gap-2 mb-4 max-w-sm">
              <input type="date" value={newHoliday}
                onChange={e => setNewHoliday(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
              <button onClick={addHoliday} disabled={!newHoliday}
                className="bg-[#d4a017] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#b8860b] transition disabled:opacity-50">
                Add
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {(() => {
                const today = new Date().toISOString().split('T')[0]
                const upcoming = JSON.parse(appSettings.holidays || '[]').filter(d => d >= today)
                return upcoming.length === 0
                  ? <p className="text-xs text-gray-400 italic">No upcoming holidays scheduled</p>
                  : upcoming.map(date => (
                    <div key={date} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <span className="text-sm font-semibold text-red-700">
                        🚫 {new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => removeHoliday(date)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold transition">Remove</button>
                    </div>
                  ))
              })()}
            </div>
          </div>
        </div>

        {/* D. Customer Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">👥 Customer Controls</h3>
          <input type="text" placeholder="Search by name or phone..."
            value={customerSearch}
            onChange={e => handleCustomerSearch(e.target.value)}
            className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] mb-4" />
          {settingsCustomers.map(customer => (
            <div key={customer.id} className="bg-[#f5f0e8] rounded-xl p-4 mb-3">
              <div className="mb-3">
                <p className="font-bold text-[#1c1c1c]">{customer.full_name}</p>
                <p className="text-xs text-gray-500">📞 {customer.phone} · {customer.area}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {customer.is_banned && <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">Banned</span>}
                  {customer.has_used_cod && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">Trial used</span>}
                  {(customer.loyalty_points || 0) > 0 && <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 font-semibold px-2 py-0.5 rounded-full">⭐ {customer.loyalty_points} pts</span>}
                  {(customer.streak_count || 0) > 0 && <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 font-semibold px-2 py-0.5 rounded-full">🔥 {customer.streak_count}d streak</span>}
                  {customer.referral_code && <span className="text-xs bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] font-semibold px-2 py-0.5 rounded-full font-mono">🔗 {customer.referral_code}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => resetCod(customer.id, customer.full_name)}
                  className="bg-[#fdf6e3] border border-[#f0dfa0] text-[#d4a017] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#f0dfa0] transition">
                  Reset COD
                </button>
                <button onClick={() => toggleBan(customer.id, customer.is_banned, customer.full_name)}
                  className={`font-bold px-3 py-1.5 rounded-lg text-xs transition ${customer.is_banned ? 'bg-[#f0faf4] border border-[#c8e6d4] text-[#1a5c38] hover:bg-[#d4eddf]' : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'}`}>
                  {customer.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <input type="number" min="1" placeholder="Days to extend"
                  value={extendDaysMap[customer.id] || ''}
                  onChange={e => setExtendDaysMap(p => ({ ...p, [customer.id]: e.target.value }))}
                  className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38] bg-white" />
                <button onClick={() => extendSubscription(customer.id, customer.full_name, extendDaysMap[customer.id])}
                  className="bg-[#1a5c38] text-white font-bold px-3 py-2 rounded-lg text-xs hover:bg-[#14472c] transition whitespace-nowrap">
                  Extend Sub
                </button>
              </div>
              <div className="flex gap-2">
                <input type="date"
                  value={pauseDateMap[customer.id] || ''}
                  onChange={e => setPauseDateMap(p => ({ ...p, [customer.id]: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38] bg-white" />
                <button onClick={() => pauseDelivery(customer.id, customer.full_name, pauseDateMap[customer.id])}
                  className="bg-[#d4a017] text-white font-bold px-3 py-2 rounded-lg text-xs hover:bg-[#b8860b] transition whitespace-nowrap">
                  Pause Date
                </button>
              </div>
            </div>
          ))}
          {customerSearch && settingsCustomers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No customers found</p>
          )}
          {!customerSearch && (
            <p className="text-sm text-gray-400 text-center py-4">Type a name or phone number to search</p>
          )}
        </div>

        {/* E. Notification Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">📣 Broadcast Message</h3>
          <p className="text-sm text-gray-500 mb-4">Send a WhatsApp message to all {customers.filter(c => c.phone).length} customers</p>
          <textarea
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
            rows={4}
            placeholder="Type your message here..."
            className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] resize-none mb-3" />
          {!broadcastConfirm ? (
            <button onClick={() => setBroadcastConfirm(true)} disabled={!broadcastMessage.trim()}
              className="bg-[#d4a017] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#b8860b] transition disabled:opacity-50">
              Send to All via WhatsApp
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-3">⚠️ Confirm: Send to {customers.filter(c => c.phone).length} customers?</p>
              <div className="flex gap-2">
                <button onClick={sendBroadcast} disabled={broadcastLoading}
                  className="bg-[#1a5c38] text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
                  {broadcastLoading ? 'Sending...' : '✅ Confirm Send'}
                </button>
                <button onClick={() => setBroadcastConfirm(false)}
                  className="border border-gray-300 text-gray-600 font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* F. Priority Waitlist */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">⏳ Priority Waitlist</h3>
            <div className="flex items-center gap-2">
              <span className="bg-[#fdf6e3] border border-[#f0dfa0] text-[#d4a017] font-bold text-xs px-3 py-1.5 rounded-full">
                {waitlistEntries.length} total
              </span>
              <button onClick={exportWaitlistCSV}
                className="bg-[#f5f0e8] text-[#1c1c1c] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#e8e0d0] transition">
                Export CSV
              </button>
            </div>
          </div>
          {waitlistEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No waitlist entries yet</p>
          ) : (
            Object.entries(
              waitlistEntries.reduce((groups, entry) => {
                const area = entry.area || 'Other'
                if (!groups[area]) groups[area] = []
                groups[area].push(entry)
                return groups
              }, {})
            ).sort(([a], [b]) => a.localeCompare(b)).map(([area, entries]) => (
              <div key={area} className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-[#1a5c38]">📍 {area}</span>
                  <span className="bg-[#f0faf4] border border-[#c8e6d4] text-[#1a5c38] font-bold text-xs px-2 py-0.5 rounded-full">{entries.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {entries.map(entry => (
                    <div key={entry.id} className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border ${entry.invited ? 'bg-[#f0faf4] border-[#c8e6d4]' : 'bg-[#f5f0e8] border-[#e8e0d0]'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1c1c1c] truncate">{entry.name}</p>
                        <p className="text-xs text-gray-400">📞 {entry.phone} · {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        {entry.invited && <span className="text-xs text-[#1a5c38] font-semibold">✅ Invited</span>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => inviteWaitlistEntry(entry)} disabled={entry.invited || invitingId === entry.id}
                          className="bg-[#25D366] text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#1da851] transition disabled:opacity-40 whitespace-nowrap">
                          {invitingId === entry.id ? '…' : 'Invite'}
                        </button>
                        <button onClick={() => deleteWaitlistEntry(entry.id)}
                          className="bg-red-50 border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-red-100 transition">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* G. Discount Codes */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-4">🏷️ Discount Codes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Code *</label>
              <input type="text" placeholder="e.g. SUMMER20"
                value={newCode.code}
                onChange={e => setNewCode(c => ({ ...c, code: e.target.value.toUpperCase() }))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Discount % *</label>
              <input type="number" placeholder="e.g. 15" min="1" max="99"
                value={newCode.percent}
                onChange={e => setNewCode(c => ({ ...c, percent: e.target.value }))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description (optional)</label>
              <input type="text" placeholder="e.g. Summer promotion"
                value={newCode.description}
                onChange={e => setNewCode(c => ({ ...c, description: e.target.value }))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Applies To</label>
              <select value={newCode.applies_to}
                onChange={e => setNewCode(c => ({ ...c, applies_to: e.target.value }))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-white">
                <option value="all">All subscriptions</option>
                <option value="subscription_1month">1-Month subscription only</option>
                <option value="trial">Trial orders only</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="one_time_toggle"
                checked={newCode.one_time_per_customer}
                onChange={e => setNewCode(c => ({ ...c, one_time_per_customer: e.target.checked }))}
                className="w-4 h-4 accent-[#1a5c38] cursor-pointer" />
              <label htmlFor="one_time_toggle" className="text-sm text-gray-600 cursor-pointer">
                Each customer can use this code only once
              </label>
            </div>
          </div>
          <button
            disabled={discountSaving || !newCode.code.trim() || !newCode.percent}
            onClick={async () => {
              setDiscountSaving(true)
              const { data: { session } } = await supabase.auth.getSession()
              const res = await fetch('/api/admin/discount-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ code: newCode.code.trim(), percent: parseInt(newCode.percent), description: newCode.description.trim(), one_time_per_customer: newCode.one_time_per_customer, applies_to: newCode.applies_to }),
              })
              if (res.ok) {
                const { data } = await res.json()
                setDiscountCodes(prev => [data, ...prev])
                setNewCode({ code: '', percent: '', description: '', one_time_per_customer: true, applies_to: 'all' })
              }
              setDiscountSaving(false)
            }}
            className="bg-[#1a5c38] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#14472c] transition disabled:opacity-50 mb-5">
            {discountSaving ? 'Saving...' : '+ Add Code'}
          </button>
          {discountCodes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No discount codes yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {discountCodes.map((dc) => (
                <div key={dc.id} className="flex items-center gap-4 bg-[#f5f0e8] rounded-xl px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[#1a5c38]">{dc.code}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dc.is_active ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-gray-100 text-gray-400'}`}>
                        {dc.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {dc.one_time_per_customer && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">🔒 One-time</span>
                      )}
                      {dc.applies_to === 'subscription_1month' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">📅 1-Month only</span>
                      )}
                    </div>
                    <p className="text-sm text-[#d4a017] font-bold mt-0.5">{dc.percent}% off{dc.description ? ` · ${dc.description}` : ''}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await fetch('/api/admin/discount-codes', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                        body: JSON.stringify({ id: dc.id, is_active: !dc.is_active }),
                      })
                      if (res.ok) setDiscountCodes(prev => prev.map(x => x.id === dc.id ? { ...x, is_active: !dc.is_active } : x))
                    }} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${dc.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] hover:bg-[#e0f5ea]'}`}>
                      {dc.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={async () => {
                      if (!confirm(`Delete code "${dc.code}"?`)) return
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await fetch('/api/admin/discount-codes', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                        body: JSON.stringify({ id: dc.id }),
                      })
                      if (res.ok) setDiscountCodes(prev => prev.filter(x => x.id !== dc.id))
                    }} className="text-xs bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* H. Referral Check */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">🎁 Referral Activation Check</h3>
          <p className="text-sm text-gray-500 mb-4">Manually check pending referrals and award 100 points to both parties when the referred friend has completed 30+ subscription deliveries.</p>
          {referralCheckResult && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${referralCheckResult.success ? 'bg-[#f0faf4] border border-[#c8e6d4] text-[#1a5c38]' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {referralCheckResult.message || referralCheckResult.error}
            </div>
          )}
          <button
            disabled={referralCheckLoading}
            onClick={async () => {
              setReferralCheckLoading(true)
              setReferralCheckResult(null)
              const { data: { session } } = await supabase.auth.getSession()
              const res = await fetch('/api/admin/check-referrals', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.access_token}` },
              })
              const data = await res.json()
              setReferralCheckResult(data)
              setReferralCheckLoading(false)
            }}
            className="bg-[#1a5c38] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#14472c] transition disabled:opacity-50">
            {referralCheckLoading ? 'Checking...' : '🔍 Check & Activate Referrals'}
          </button>
        </div>

        {/* I. Bulk Enquiries */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-[#f5f0e8]">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">📦 Bulk Enquiries</h3>
            <p className="text-xs text-gray-400 mt-0.5">{bulkEnquiries.length} enquiries total</p>
          </div>
          {bulkEnquiries.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">No bulk enquiries yet.</div>
          ) : (
            <div className="divide-y divide-[#f5f0e8]">
              {bulkEnquiries.map((e) => (
                <div key={e.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-[#1c1c1c]">{e.name}</p>
                      {e.institution && <p className="text-xs text-gray-500 mt-0.5">🏢 {e.institution}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">📞 {e.phone}{e.quantity ? ` · 🥛 ${e.quantity}` : ''}</p>
                      {e.message && <p className="text-xs text-gray-400 mt-1 italic">"{e.message}"</p>}
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        </div>
      </div>
    )}

    {/* ── Add Order Tab ── */}
    {activeTab === 'add_order' && (() => {
      const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      const handleAddOrderSearch = (val) => {
        setAddOrderSearch(val)
        if (!val.trim()) { setAddOrderSearchResults([]); return }
        const q = val.toLowerCase()
        setAddOrderSearchResults(
          customers.filter(c =>
            c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
          ).slice(0, 5)
        )
      }

      const handleAddOrderSubmit = async () => {
        if (!addOrderCustomer || !addOrderProduct) return
        setAddOrderLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        try {
          if (addOrderType === 'trial') {
            const res = await fetch('/api/admin/place-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
              body: JSON.stringify({
                target_user_id: addOrderCustomer.id,
                product_id: addOrderProduct,
                quantity: addOrderQuantity,
                delivery_date: addOrderDate,
                delivery_slot: addOrderSlot,
                is_trial: true,
              }),
            })
            const data = await res.json()
            if (!res.ok) { showError(data.error || 'Failed to place order'); return }
            showSuccess(`3-day trial placed for ${addOrderCustomer.full_name}! (${data.order_count || 3} orders)`)
            setAddOrderCustomer(null); setAddOrderProduct(null); setAddOrderDate('')
          } else if (addOrderType === 'extra') {
            if (addOrderExtraDates.length === 0) { showError('Select at least one date.'); return }
            const res = await fetch('/api/admin/place-addon-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
              body: JSON.stringify({
                target_user_id: addOrderCustomer.id,
                product_id: addOrderProduct,
                quantity: addOrderQuantity,
                delivery_slot: addOrderSlot,
                dates: addOrderExtraDates,
              }),
            })
            const data = await res.json()
            if (!res.ok) { showError(data.error || 'Failed to place extra orders'); return }
            const selectedProduct = products.find(p => p.id === addOrderProduct)
            showSuccess(`${data.order_count} extra order${data.order_count !== 1 ? 's' : ''} placed for ${addOrderCustomer.full_name}! Total: ₹${data.total_amount}`)
            setAddOrderCustomer(null); setAddOrderProduct(null); setAddOrderExtraDates([]); setAddOrderExtraDateInput('')
          } else {
            const res = await fetch('/api/admin/place-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
              body: JSON.stringify({
                target_user_id: addOrderCustomer.id,
                product_id: addOrderProduct,
                quantity: addOrderQuantity,
                delivery_slot: addOrderSlot,
                delivery_frequency: addOrderFrequency,
                subscription_type: addOrderSubType,
                start_date: addOrderDate,
                end_date: addOrderSubType === 'fixed' ? addOrderEndDate : null,
                discount_percent: addOrderDiscount,
              }),
            })
            const data = await res.json()
            if (!res.ok) { showError(data.error || 'Failed to place subscription'); return }
            showSuccess(`Subscription activated for ${addOrderCustomer.full_name}!`)
            setAddOrderCustomer(null); setAddOrderProduct(null); setAddOrderDate(''); setAddOrderEndDate('')
          }
        } finally {
          setAddOrderLoading(false)
        }
      }

      const walletBalance = wallets.find(w => w.user_id === addOrderCustomer?.id)?.balance ?? null

      return (
        <div className="flex flex-col gap-5 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#f5f0e8]">
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c]">➕ Place Order for Customer</h2>
              <p className="text-sm text-gray-500 mt-1">Admin override — bypasses COD restrictions and wallet checks</p>
            </div>

            {/* Section 1 — Customer search */}
            <div className="px-6 py-5 border-b border-[#f5f0e8]">
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-2 block">Customer</label>
              {addOrderCustomer ? (
                <div className="flex items-center justify-between bg-[#f0faf4] border border-[#c8e6d4] rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#1c1c1c] text-sm">{addOrderCustomer.full_name}</p>
                    <p className="text-xs text-gray-500">{addOrderCustomer.phone} · {addOrderCustomer.area}</p>
                    {walletBalance !== null && (
                      <p className="text-xs text-[#1a5c38] font-semibold mt-0.5">Wallet: ₹{walletBalance}</p>
                    )}
                  </div>
                  <button onClick={() => { setAddOrderCustomer(null); setAddOrderSearch('') }}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={addOrderSearch}
                    onChange={e => handleAddOrderSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]"
                  />
                  {addOrderSearchResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#e8e0d0] rounded-xl shadow-lg overflow-hidden">
                      {addOrderSearchResults.map(c => (
                        <button key={c.id} onClick={() => { setAddOrderCustomer(c); setAddOrderSearch(''); setAddOrderSearchResults([]) }}
                          className="w-full text-left px-4 py-3 hover:bg-[#f0faf4] transition border-b border-[#f5f0e8] last:border-0">
                          <p className="text-sm font-semibold text-[#1c1c1c]">{c.full_name}</p>
                          <p className="text-xs text-gray-400">{c.phone} · {c.area}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2 — Order type */}
            <div className="px-6 py-5 border-b border-[#f5f0e8]">
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 block">Order Type</label>
              <div className="flex gap-2">
                {[
                  { id: 'trial',        label: '🎁 Trial Order'  },
                  { id: 'subscription', label: '📅 Subscription'  },
                  { id: 'extra',        label: '➕ Extra Order'   },
                ].map(({ id, label }) => (
                  <button key={id} onClick={() => setAddOrderType(id)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition border ${
                      addOrderType === id
                        ? 'bg-[#1a5c38] text-white border-[#1a5c38]'
                        : 'bg-white text-gray-600 border-[#e8e0d0] hover:border-[#1a5c38] hover:text-[#1a5c38]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              {addOrderType === 'extra' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                  Extra (add-on) orders — placed on top of existing subscription. No subscription check. Wallet deducted on delivery.
                </p>
              )}
            </div>

            {/* Section 3 — Order details */}
            <div className="px-6 py-5 flex flex-col gap-4 border-b border-[#f5f0e8]">
              {/* Product */}
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Product</label>
                <select value={addOrderProduct || ''} onChange={e => setAddOrderProduct(e.target.value)}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-white">
                  <option value="">Select product...</option>
                  {products.filter(p => p.is_available).map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.size} — ₹{p.price}</option>
                  ))}
                </select>
              </div>

              {/* Quantity + Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Quantity</label>
                  <input type="number" min="1" max="20" value={addOrderQuantity} onChange={e => setAddOrderQuantity(Number(e.target.value))}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Delivery Slot</label>
                  <select value={addOrderSlot} onChange={e => setAddOrderSlot(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-white">
                    <option value="morning">Morning (7–9 AM)</option>
                    <option value="evening">Evening (5–7 PM)</option>
                  </select>
                </div>
              </div>

              {/* Trial-specific */}
              {addOrderType === 'trial' && (
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Trial Start Date</label>
                  <input type="date" min={todayStr} value={addOrderDate} onChange={e => setAddOrderDate(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
                  {addOrderDate && (() => {
                    const d1 = addOrderDate
                    const d2 = (() => { const d = new Date(d1 + 'T00:00:00+05:30'); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) })()
                    const d3 = (() => { const d = new Date(d1 + 'T00:00:00+05:30'); d.setDate(d.getDate() + 2); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) })()
                    const fmt = s => new Date(s + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                    return (
                      <div className="mt-2 bg-[#f0faf4] rounded-lg p-3 space-y-1">
                        <p className="text-xs font-semibold text-[#1a5c38] mb-1.5">3 delivery days:</p>
                        {[d1, d2, d3].map((d, i) => (
                          <div key={d} className="flex items-center gap-2">
                            <span className="w-12 text-[10px] font-bold text-white bg-[#1a5c38] px-1.5 py-0.5 rounded text-center">Day {i + 1}</span>
                            <span className="text-xs text-[#1c1c1c]">{fmt(d)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Extra order — multi-date picker */}
              {addOrderType === 'extra' && (
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">
                    Delivery Dates <span className="text-gray-400 normal-case font-normal ml-1">({addOrderExtraDates.length} selected)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="date"
                      min={todayStr}
                      value={addOrderExtraDateInput}
                      onChange={e => setAddOrderExtraDateInput(e.target.value)}
                      className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]"
                    />
                    <button
                      onClick={() => {
                        const d = addOrderExtraDateInput
                        if (!d || addOrderExtraDates.includes(d)) return
                        setAddOrderExtraDates(prev => [...prev, d].sort())
                        setAddOrderExtraDateInput('')
                      }}
                      disabled={!addOrderExtraDateInput || addOrderExtraDates.includes(addOrderExtraDateInput)}
                      className="bg-[#1a5c38] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-40">
                      + Add
                    </button>
                  </div>
                  {/* Quick-add: next 7 days */}
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date()
                      d.setDate(d.getDate() + i + 1)
                      const str = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                      const selected = addOrderExtraDates.includes(str)
                      return (
                        <button key={str}
                          onClick={() => setAddOrderExtraDates(prev => selected ? prev.filter(x => x !== str) : [...prev, str].sort())}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${selected ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'bg-white text-gray-600 border-[#e8e0d0] hover:border-[#1a5c38]'}`}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {addOrderExtraDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#f5f0e8] rounded-xl">
                      {addOrderExtraDates.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 bg-white border border-[#e8e0d0] text-xs px-2.5 py-1 rounded-full font-medium text-[#1c1c1c]">
                          {new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          <button onClick={() => setAddOrderExtraDates(prev => prev.filter(x => x !== d))}
                            className="text-gray-400 hover:text-red-500 transition leading-none ml-0.5">×</button>
                        </span>
                      ))}
                      <button onClick={() => setAddOrderExtraDates([])}
                        className="text-xs text-red-400 hover:text-red-600 underline ml-1">Clear all</button>
                    </div>
                  )}
                  {addOrderExtraDates.length > 0 && addOrderProduct && (() => {
                    const p = products.find(pr => pr.id === addOrderProduct)
                    const total = p ? Math.round(p.price * addOrderQuantity) * addOrderExtraDates.length : 0
                    return total > 0 ? (
                      <p className="text-xs text-[#1a5c38] font-semibold mt-2">
                        Total: ₹{total} ({addOrderExtraDates.length} × ₹{Math.round((p?.price || 0) * addOrderQuantity)})
                      </p>
                    ) : null
                  })()}
                </div>
              )}

              {/* Subscription-specific */}
              {addOrderType === 'subscription' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Frequency</label>
                    <div className="flex gap-2">
                      {[{ id: 'daily', label: 'Daily' }, { id: 'alternate', label: 'Every 2 Days' }, { id: 'weekly', label: 'Weekly' }].map(({ id, label }) => (
                        <button key={id} onClick={() => setAddOrderFrequency(id)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition border ${
                            addOrderFrequency === id ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'bg-white text-gray-600 border-[#e8e0d0] hover:border-[#1a5c38]'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-2 block">Discount %</label>
                    <div className="flex gap-2">
                      {[0, 5, 10, 15, 20].map(d => (
                        <button key={d} onClick={() => setAddOrderDiscount(d)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            addOrderDiscount === d ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'bg-white text-gray-600 border-[#e8e0d0]'
                          }`}>
                          {d === 0 ? 'No discount' : `${d}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Subscription Type</label>
                    <div className="flex gap-2">
                      {[{ id: 'ongoing', label: 'Ongoing' }, { id: 'fixed', label: 'Fixed Duration' }].map(({ id, label }) => (
                        <button key={id} onClick={() => setAddOrderSubType(id)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition border ${
                            addOrderSubType === id ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'bg-white text-gray-600 border-[#e8e0d0] hover:border-[#1a5c38]'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {addOrderSubType === 'fixed' && (
                    <div>
                      <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-2 block">Duration</label>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {[{ label: '1 Week', days: 7 }, { label: '2 Weeks', days: 14 }, { label: '1 Month', days: 30 }, { label: '3 Months', days: 90 }].map(({ label, days }) => {
                          const start = addOrderDate || tomorrowStr
                          const end = new Date(start)
                          end.setDate(end.getDate() + days - 1)
                          const endStr = end.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                          return (
                            <button key={label} onClick={() => setAddOrderEndDate(endStr)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                addOrderEndDate === endStr ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'bg-white text-gray-600 border-[#e8e0d0] hover:border-[#1a5c38]'
                              }`}>
                              {label}
                            </button>
                          )
                        })}
                      </div>
                      <input type="date" value={addOrderEndDate} onChange={e => setAddOrderEndDate(e.target.value)}
                        className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Start Date</label>
                    <input type="date" min={todayStr} value={addOrderDate} onChange={e => setAddOrderDate(e.target.value)}
                      className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
                  </div>
                </>
              )}
            </div>

            {/* Section 4 — Submit */}
            <div className="px-6 py-5">
              <button
                disabled={
                  addOrderLoading || !addOrderCustomer || !addOrderProduct ||
                  (addOrderType === 'trial' && !addOrderDate) ||
                  (addOrderType === 'subscription' && (!addOrderDate || (addOrderSubType === 'fixed' && !addOrderEndDate))) ||
                  (addOrderType === 'extra' && addOrderExtraDates.length === 0)
                }
                onClick={handleAddOrderSubmit}
                className="w-full bg-[#1a5c38] text-white font-bold py-3.5 rounded-xl hover:bg-[#14472c] transition disabled:opacity-40 text-sm">
                {addOrderLoading
                  ? 'Placing...'
                  : !addOrderCustomer
                    ? 'Select a customer first'
                    : addOrderType === 'trial'
                      ? `Place Trial Order for ${addOrderCustomer.full_name}`
                      : addOrderType === 'extra'
                        ? `Place ${addOrderExtraDates.length} Extra Order${addOrderExtraDates.length !== 1 ? 's' : ''} for ${addOrderCustomer.full_name}`
                        : `Activate Subscription for ${addOrderCustomer.full_name}`}
              </button>
            </div>
          </div>
        </div>
      )
    })()}

    {/* ── Financials Tab ── */}
    {activeTab === 'financials' && (() => {
      const filtered = transactions.filter(tx =>
        txTypeFilter === 'all' || tx.type === txTypeFilter
      )
      const totalCredits = filtered.filter(tx => tx.type === 'credit').reduce((s, tx) => s + (tx.amount || 0), 0)
      const totalDebits = filtered.filter(tx => tx.type === 'debit').reduce((s, tx) => s + (tx.amount || 0), 0)

      const exportCsv = () => {
        const headers = ['Date/Time', 'Customer Name', 'Phone', 'Type', 'Amount', 'Description']
        const rows = filtered.map(tx => [
          new Date(tx.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          tx.profiles?.full_name || '-',
          tx.profiles?.phone || '-',
          tx.type,
          tx.type === 'credit' ? tx.amount : -tx.amount,
          tx.description || '',
        ])
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `transactions-${txStartDate}-${txEndDate}.csv`; a.click()
        URL.revokeObjectURL(url)
      }

      return (
        <div className="flex flex-col gap-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Credits', value: `₹${totalCredits.toLocaleString('en-IN')}`, color: 'text-[#1a5c38]', bg: 'bg-[#f0faf4] border-[#c8e6d4]' },
              { label: 'Total Debits', value: `₹${totalDebits.toLocaleString('en-IN')}`, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
              { label: 'Net', value: `₹${(totalCredits - totalDebits).toLocaleString('en-IN')}`, color: (totalCredits - totalDebits) >= 0 ? 'text-[#1a5c38]' : 'text-red-600', bg: 'bg-white border-[#e8e0d0]' },
              { label: 'Transactions', value: filtered.length, color: 'text-[#1c1c1c]', bg: 'bg-white border-[#e8e0d0]' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] p-5 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 block">From</label>
                <input type="date" value={txStartDate} onChange={e => setTxStartDate(e.target.value)}
                  className="border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 block">To</label>
                <input type="date" value={txEndDate} onChange={e => setTxEndDate(e.target.value)}
                  className="border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
              <button onClick={() => { setTransactionsLoaded(false); loadTransactions(txStartDate, txEndDate) }}
                disabled={transactionsLoading}
                className="bg-[#1a5c38] text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
                {transactionsLoading ? 'Loading...' : 'Load'}
              </button>
              <div className="flex gap-2 ml-auto">
                {[{ id: 'all', label: 'All' }, { id: 'credit', label: 'Credits' }, { id: 'debit', label: 'Debits' }].map(({ id, label }) => (
                  <button key={id} onClick={() => setTxTypeFilter(id)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                      txTypeFilter === id ? 'bg-[#1a5c38] text-white border-[#1a5c38]' : 'bg-white text-gray-600 border-[#e8e0d0] hover:border-[#1a5c38]'
                    }`}>
                    {label}
                  </button>
                ))}
                <button onClick={exportCsv}
                  className="px-3 py-2 rounded-lg text-sm font-semibold border border-[#e8e0d0] text-gray-600 hover:border-[#1a5c38] hover:text-[#1a5c38] transition">
                  ⬇ CSV
                </button>
              </div>
            </div>
          </div>

          {/* Transactions table */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f5f0e8] flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">Transactions</h3>
              <span className="text-xs text-gray-400">{filtered.length} records</span>
            </div>
            {transactionsLoading ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">No transactions found for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f5f0e8] text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest whitespace-nowrap">Date / Time</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Customer</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tx, i, arr) => (
                      <tr key={tx.id} className={`${i !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''} hover:bg-[#fafaf8]`}>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          <br />
                          <span className="text-gray-400">{new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#1c1c1c] text-sm">{tx.profiles?.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">{tx.profiles?.phone || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            tx.type === 'credit'
                              ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {tx.type === 'credit' ? '↑ Credit' : '↓ Debit'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${tx.type === 'credit' ? 'text-[#1a5c38]' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                          {(tx.description || '').slice(0, 60)}{(tx.description || '').length > 60 ? '…' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )
    })()}

    {/* ── Stop Subscription Modal ── */}
    {stopSubPopup && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 className="font-bold text-lg text-[#1c1c1c] mb-3">Stop Subscription?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to stop this subscription for{' '}
            <strong>{stopSubPopup.profiles?.full_name}</strong>?
            <br />
            <span className="text-xs text-gray-400">This will send an email and WhatsApp notification to the customer.</span>
          </p>
          <div className="mb-3">
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Cancelled by</label>
            <select
              value={stopCancelledBy}
              onChange={e => setStopCancelledBy(e.target.value)}
              className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
              <option value="delivery_agent">Delivery Agent</option>
            </select>
          </div>
          <div className="mb-5">
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Reason (optional)</label>
            <input
              type="text"
              value={stopCancellationReason}
              onChange={e => setStopCancellationReason(e.target.value)}
              placeholder="e.g. Customer relocated"
              className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStopSubPopup(null)}
              className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              disabled={stoppingSubId === stopSubPopup.id}
              onClick={async () => {
                setStoppingSubId(stopSubPopup.id)
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/admin/stop-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({
                    subscription_id: stopSubPopup.id,
                    cancelled_by: stopCancelledBy,
                    cancellation_reason: stopCancellationReason || null,
                  }),
                })
                if (res.ok) {
                  setSubscriptions(prev => prev.map(s => s.id !== stopSubPopup.id ? s : {
                    ...s, is_active: false,
                    cancelled_by: stopCancelledBy,
                    cancellation_reason: stopCancellationReason || null,
                  }))
                  setTodaySubscriptions(prev => prev.filter(s => s.id !== stopSubPopup.id))
                  showSuccess(`Subscription stopped for ${stopSubPopup.profiles?.full_name}`)
                  setStopSubPopup(null)
                } else {
                  showError('Failed to stop subscription. Please try again.')
                }
                setStoppingSubId(null)
              }}
              className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-red-600 transition disabled:opacity-50">
              {stoppingSubId === stopSubPopup.id ? 'Stopping...' : 'Yes, Stop'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Send WhatsApp Modal ── */}
    {customWaModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-[#1c1c1c]">Send WhatsApp</h3>
            <button onClick={() => setCustomWaModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <p className="text-sm text-gray-500 mb-4">To: <strong className="text-[#1c1c1c]">{customWaModal.full_name}</strong> ({customWaModal.phone})</p>
          <div className="mb-4">
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2 block">Message Type</label>
            <select
              value={customWaType}
              onChange={e => setCustomWaType(e.target.value)}
              className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]">
              <option value="order_confirmation">Order Confirmation</option>
              <option value="subscription_active">Subscription Active</option>
              <option value="low_balance">Low Balance Alert</option>
              <option value="custom">Custom Message</option>
            </select>
          </div>
          {customWaType === 'custom' && (
            <div className="mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
                <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Custom messages only work if the customer has messaged your WhatsApp number first (within 24 hours). Use template messages for outbound.
                </p>
              </div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2 block">Message</label>
              <textarea
                value={customWaMessage}
                onChange={e => setCustomWaMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] resize-none"
              />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setCustomWaModal(null)}
              className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              disabled={customWaLoading || (customWaType === 'custom' && !customWaMessage.trim())}
              onClick={async () => {
                setCustomWaLoading(true)
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/admin/resend-whatsapp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ userId: customWaModal.id, messageType: customWaType, customMessage: customWaMessage }),
                })
                setCustomWaLoading(false)
                if (res.ok) {
                  showSuccess('WhatsApp sent to ' + customWaModal.full_name)
                  setCustomWaModal(null)
                } else {
                  showError('Failed to send WhatsApp')
                }
              }}
              className="flex-1 bg-[#25D366] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1da851] transition disabled:opacity-50">
              {customWaLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Convert Balance → Deposit Modal ── */}
    {convertDepositModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
          <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-1">Convert Balance → Deposit</h3>
          <p className="text-sm text-gray-500 mb-4">
            Move amount from <strong>{convertDepositModal.customer.full_name}</strong>'s wallet balance into their bottle deposit.
            Available balance: <strong>₹{convertDepositModal.balance}</strong>
          </p>
          <input
            type="number"
            placeholder={`Amount (max ₹${convertDepositModal.balance})`}
            value={convertDepositAmount}
            onChange={e => setConvertDepositAmount(e.target.value)}
            className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] mb-3"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={convertDepositNote}
            onChange={e => setConvertDepositNote(e.target.value)}
            className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] mb-4"
          />
          <div className="flex gap-3">
            <button onClick={() => setConvertDepositModal(null)}
              className="flex-1 border border-[#e8e0d0] text-gray-500 font-bold py-3 rounded-xl text-sm">
              Cancel
            </button>
            <button
              disabled={convertDepositLoading || !convertDepositAmount || Number(convertDepositAmount) <= 0 || Number(convertDepositAmount) > convertDepositModal.balance}
              onClick={async () => {
                setConvertDepositLoading(true)
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/admin/convert-to-deposit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ target_user_id: convertDepositModal.customer.id, amount: Number(convertDepositAmount), note: convertDepositNote || undefined }),
                })
                setConvertDepositLoading(false)
                if (res.ok) {
                  const { new_balance, new_deposit } = await res.json()
                  setWallets(prev => prev.map(w => w.user_id === convertDepositModal.customer.id ? { ...w, balance: new_balance, deposit_balance: new_deposit } : w))
                  setConvertDepositModal(null)
                  showSuccess(`₹${convertDepositAmount} moved to deposit for ${convertDepositModal.customer.full_name}`)
                } else {
                  const j = await res.json()
                  showError(j.error || 'Failed to convert.')
                }
              }}
              className="flex-1 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 transition"
              style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
              {convertDepositLoading ? 'Converting...' : '🍼 Convert'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Deposit Refund Modal ── */}
    {refundModal && (() => {
      const good = Number(refundGoodBottles) || 0
      const damaged = Number(refundDamagedBottles) || 0
      const refundAmt = good * 100
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-[#1c1c1c]">Process Deposit Refund</h3>
              <button onClick={() => setRefundModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="bg-[#f5f0e8] rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-[#1c1c1c]">{refundModal.customer.full_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total deposit on account: <strong>₹{refundModal.depositBalance}</strong></p>
            </div>

            <div className="flex flex-col gap-4 mb-5">
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Bottles returned in good condition</label>
                <input type="number" min="0" value={refundGoodBottles}
                  onChange={e => setRefundGoodBottles(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Bottles damaged/broken</label>
                <input type="number" min="0" value={refundDamagedBottles}
                  onChange={e => setRefundDamagedBottles(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Notes (optional)</label>
                <input type="text" value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  placeholder="Condition notes or remarks..."
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
            </div>

            <div className={`rounded-xl p-4 mb-5 ${refundAmt > 0 ? 'bg-[#f0faf4] border border-[#c8e6d4]' : 'bg-[#f5f0e8]'}`}>
              <p className="text-sm text-gray-600">{good} bottle(s) × ₹100 = <strong className={refundAmt > 0 ? 'text-[#1a5c38]' : 'text-gray-400'}>₹{refundAmt} refund</strong></p>
              {damaged > 0 && <p className="text-xs text-red-500 mt-1">{damaged} damaged bottle(s) — no refund for these</p>}
              {refundAmt > refundModal.depositBalance && <p className="text-xs text-red-500 mt-1">Refund exceeds deposit balance of ₹{refundModal.depositBalance}</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)}
                className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
                Cancel
              </button>
              <button
                disabled={refundProcessing || refundAmt <= 0 || refundAmt > refundModal.depositBalance}
                onClick={async () => {
                  setRefundProcessing(true)
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/refund-deposit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({
                      user_id: refundModal.customer.id,
                      refund_amount: refundAmt,
                      good_bottles: good,
                      notes: refundNotes,
                    }),
                  })
                  if (res.ok) {
                    setWallets(prev => prev.map(ww => ww.user_id === refundModal.customer.id
                      ? { ...ww, deposit_balance: (ww.deposit_balance || 0) - refundAmt, balance: (ww.balance || 0) + refundAmt }
                      : ww
                    ))
                    showSuccess(`₹${refundAmt} deposit refunded to ${refundModal.customer.full_name}`)
                    setRefundModal(null)
                  }
                  setRefundProcessing(false)
                }}
                className="flex-1 bg-[#d4a017] text-white font-bold py-3 rounded-xl hover:bg-[#b8860b] transition text-sm disabled:opacity-50">
                {refundProcessing ? 'Processing...' : `Confirm Refund ₹${refundAmt}`}
              </button>
            </div>
          </div>
        </div>
      )
    })()}

    </div>
    </div>

  )
}