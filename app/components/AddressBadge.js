'use client'
import { getAddress } from '../lib/address'

export default function AddressBadge({ profile }) {
  const { tower, flat } = getAddress(profile)
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
