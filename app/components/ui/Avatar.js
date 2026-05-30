'use client'
import { useState } from 'react'

/**
 * Avatar — initials-based with optional image, deterministic color from name.
 *
 * Props:
 *   name   – string  (used for initials + color)
 *   src    – string  (image URL; falls back to initials on error)
 *   size   – 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 *   shape  – 'circle' | 'rounded'
 *   color  – string  (override the auto background color)
 *   className – string
 *
 * Usage:
 *   <Avatar name="Thejesh SM" />
 *   <Avatar name="Priya K" size="lg" />
 *   <Avatar name="Admin" src={profile.photo_url} size="md" />
 */

// Deterministic color from name — same name always gets same color.
// Uses the brand palette so initials always look on-brand.
const COLORS = [
  '#1a5c38', // primary green
  '#0d3320', // dark green
  '#2d7a50', // mid green
  '#d4a017', // gold
  '#b88a10', // dark gold
  '#1d4ed8', // blue
  '#6d28d9', // purple
  '#0e7490', // teal
  '#be123c', // rose
  '#c2410c', // orange
]

function colorFromName(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZES = {
  xs: { box: 'w-6 h-6',   text: 'text-[9px]'  },
  sm: { box: 'w-8 h-8',   text: 'text-xs'     },
  md: { box: 'w-10 h-10', text: 'text-sm'     },
  lg: { box: 'w-12 h-12', text: 'text-base'   },
  xl: { box: 'w-16 h-16', text: 'text-xl'     },
}

export default function Avatar({ name = '', src, size = 'md', shape = 'circle', color, className = '' }) {
  const [imgError, setImgError] = useState(false)
  const bg = color || colorFromName(name)
  const sz = SIZES[size] || SIZES.md
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl'
  const showImage = src && !imgError

  return (
    <div
      className={`${sz.box} ${radius} flex items-center justify-center flex-shrink-0 select-none overflow-hidden ${className}`}
      style={showImage ? {} : { background: bg }}
      aria-label={name || 'User avatar'}
      role="img"
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={`${sz.text} font-bold text-white leading-none`}>
          {initials(name)}
        </span>
      )}
    </div>
  )
}
