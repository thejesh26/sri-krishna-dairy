'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only show if push is supported, VAPID key is configured, not already subscribed
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!VAPID_PUBLIC_KEY) return
    if (localStorage.getItem('push_dismissed')) return

    // Check if already subscribed
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription()
      if (existing) { setSubscribed(true); return }
      // Show prompt after 5s on dashboard
      setTimeout(() => setShow(true), 5000)
    })
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      setSubscribed(true)
      setShow(false)
    } catch (err) {
      console.error('[push] subscribe failed:', err)
    }
    setLoading(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('push_dismissed', '1')
    setShow(false)
  }

  if (!show || subscribed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-[#e8e0d0] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#f0faf4] border border-[#c8e6d4] flex items-center justify-center text-xl flex-shrink-0">
            🔔
          </div>
          <div>
            <p className="font-semibold text-[#1c1c1c] text-sm leading-tight">Stay updated</p>
            <p className="text-xs text-gray-500 mt-0.5">Get notified for deliveries, low wallet balance, and more.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSubscribe} disabled={loading}
            className="flex-1 bg-[#1a5c38] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#14472c] transition disabled:opacity-50">
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </button>
          <button onClick={handleDismiss}
            className="px-4 py-2.5 text-gray-400 hover:text-gray-600 text-sm transition rounded-xl hover:bg-gray-50">
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
