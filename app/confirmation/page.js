'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer)
          window.location.href = '/dashboard'
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const content = {
    order: {
      icon: '🥛',
      title: 'Order Placed Successfully!',
      message: 'Your milk will be delivered at your doorstep on the selected date.',
      color: '#1a5c38',
    },
    subscription: {
      icon: '📅',
      title: 'Subscription Activated!',
      message: 'Fresh milk will be delivered to your doorstep every day as per your plan.',
      color: '#1a5c38',
    },
  }

  const current = content[type] || content.order

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      <header className="bg-white px-6 py-4 flex items-center shadow-sm border-b border-[#e8e0d0]">
        <a href="/dashboard" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh - Pure - Natural</p>
          </div>
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-[#e8e0d0] p-10 w-full max-w-md text-center">

          {/* Success Animation */}
          <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl shadow-lg"
            style={{background:'linear-gradient(135deg, #f0faf4, #d4eddf)'}}>
            {current.icon}
          </div>

          {/* Gold checkmark */}
          <div className="w-10 h-10 rounded-full bg-[#d4a017] flex items-center justify-center mx-auto -mt-8 mb-6 shadow border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-3">
            {current.title}
          </h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            {current.message}
          </p>

          {/* What happens next */}
          <div className="bg-[#f5f0e8] rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-[#d4a017] uppercase tracking-widest mb-3">What happens next?</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38]">✓</span>
                <span>Our team has received your {type === 'subscription' ? 'subscription' : 'order'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38]">✓</span>
                <span>Fresh milk will be prepared from our farm</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38]">✓</span>
                <span>Delivered to your doorstep on time</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="flex gap-3 justify-center mb-6">
            <a href="https://wa.me/918553666002" target="_blank"
              className="flex items-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1da851] transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.74-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Us
            </a>
            <a href="tel:8553666002"
              className="flex items-center gap-2 border border-[#e8e0d0] text-[#1c1c1c] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#f5f0e8] transition">
              📞 Call Us
            </a>
          </div>

          {/* Auto redirect */}
          <p className="text-xs text-gray-400">
            Redirecting to dashboard in <span className="font-bold text-[#1a5c38]">{countdown}</span> seconds...
          </p>

          <a href="/dashboard"
            className="block mt-4 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            Go to Dashboard
          </a>

        </div>
      </div>

    </div>
  )
}

export default function Confirmation() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <p className="text-[#1a5c38] font-semibold">Loading...</p>
    </div>}>
      <ConfirmationContent />
    </Suspense>
  )
}