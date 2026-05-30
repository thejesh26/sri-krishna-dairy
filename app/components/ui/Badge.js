'use client'

/**
 * Badge — status and label chips
 *
 * Props:
 *   variant – 'active' | 'inactive' | 'pending' | 'delivered' | 'cancelled' |
 *             'paused' | 'warning' | 'info' | 'missed' | 'fixed' | 'ongoing' |
 *             'oneday' | 'morning' | 'evening' | 'cod' | 'success'
 *   size    – 'sm' | 'md'
 *   dot     – boolean (show colored dot prefix)
 *
 * Usage:
 *   <Badge variant="active">Active</Badge>
 *   <Badge variant="pending" dot>Pending</Badge>
 *   <Badge variant="cancelled" size="sm">Cancelled</Badge>
 */

const VARIANTS = {
  active:    { bg: '#f0faf4', border: '#c8e6d4', text: '#1a5c38', dot: '#1a5c38' },
  success:   { bg: '#f0faf4', border: '#c8e6d4', text: '#1a5c38', dot: '#1a5c38' },
  delivered: { bg: '#f0faf4', border: '#c8e6d4', text: '#1a5c38', dot: '#1a5c38' },
  inactive:  { bg: '#f5f5f5', border: '#e5e7eb', text: '#6b7280', dot: '#9ca3af' },
  cancelled: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#dc2626' },
  missed:    { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#dc2626' },
  pending:   { bg: '#fdf6e3', border: '#f0dfa0', text: '#92400e', dot: '#d4a017' },
  warning:   { bg: '#fdf6e3', border: '#f0dfa0', text: '#92400e', dot: '#d4a017' },
  paused:    { bg: '#fdf6e3', border: '#f0dfa0', text: '#92400e', dot: '#d4a017' },
  info:      { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
  fixed:     { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', dot: '#7c3aed' },
  oneday:    { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', dot: '#f43f5e' },
  ongoing:   { bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490', dot: '#06b6d4' },
  morning:   { bg: '#fdf6e3', border: '#f0dfa0', text: '#92400e', dot: '#d4a017' },
  evening:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
  cod:       { bg: '#f5f5f5', border: '#e5e7eb', text: '#374151', dot: '#6b7280' },
}

const FALLBACK = { bg: '#f5f5f5', border: '#e5e7eb', text: '#374151', dot: '#9ca3af' }

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
}

export default function Badge({ variant = 'info', size = 'md', dot = false, children, className = '' }) {
  const s = VARIANTS[variant] || FALLBACK
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${SIZE_CLASSES[size]} ${className}`}
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      {dot && (
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: 6, height: 6, background: s.dot }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

/**
 * StatusBadge — maps common string values to the right Badge variant automatically.
 *
 * Usage:
 *   <StatusBadge status={order.status} />
 *   <StatusBadge status={subscription.subscription_type} />
 */
const STATUS_MAP = {
  active:          'active',
  is_active:       'active',
  delivered:       'delivered',
  inactive:        'inactive',
  cancelled:       'cancelled',
  missed:          'missed',
  pending:         'pending',
  out_for_delivery:'info',
  paused:          'paused',
  fixed:           'fixed',
  oneday:          'oneday',
  ongoing:         'ongoing',
  morning:         'morning',
  evening:         'evening',
  completed:       'success',
  approved:        'active',
  cod:             'cod',
}

const STATUS_LABELS = {
  active:           'Active',
  delivered:        'Delivered',
  inactive:         'Inactive',
  cancelled:        'Cancelled',
  missed:           'Missed',
  pending:          'Pending',
  out_for_delivery: 'Out for Delivery',
  paused:           'Paused',
  fixed:            'Fixed',
  oneday:           'One Day',
  ongoing:          'Ongoing',
  morning:          'Morning',
  evening:          'Evening',
  completed:        'Completed',
  approved:         'Approved',
  cod:              'COD',
}

export function StatusBadge({ status, dot = true, size = 'md', className = '' }) {
  const key = String(status || '').toLowerCase()
  const variant = STATUS_MAP[key] || 'info'
  const label = STATUS_LABELS[key] || status
  return <Badge variant={variant} dot={dot} size={size} className={className}>{label}</Badge>
}
