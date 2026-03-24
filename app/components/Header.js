import Link from 'next/link'

export default function Header({ title, showBack, backUrl }) {
  return (
    <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-3">
        <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
        <div>
          <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
          <p className="text-xs text-[#d4a017] font-medium">{title || 'Farm Fresh • Pure • Natural'}</p>
        </div>
      </Link>
      {showBack && (
        <Link href={backUrl || '/dashboard'}
          className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          ← Dashboard
        </Link>
      )}
    </header>
  )
}