'use client'

/**
 * StatCard — metric display card used in admin dashboard and overview pages.
 *
 * Props:
 *   label    – string
 *   value    – string | number
 *   icon     – string (emoji) | ReactNode
 *   trend    – { value: string|number, direction: 'up' | 'down' | 'neutral', label?: string }
 *   loading  – boolean  (shows skeleton)
 *   color    – 'green' | 'gold' | 'blue' | 'default'
 *   onClick  – fn  (makes card interactive)
 *   sublabel – string  (small secondary text below value)
 *
 * Usage:
 *   <StatCard label="Active Subscribers" value={42} icon="🥛" color="green" />
 *   <StatCard label="Today's Revenue" value="₹3,240" icon="💰"
 *     trend={{ value: '+12%', direction: 'up', label: 'vs yesterday' }} />
 *   <StatCard label="Orders" value={loading ? null : orders.length} loading={loading} />
 */

const COLORS = {
  green:   { bg: '#f0faf4', border: '#c8e6d4', text: '#1a5c38', iconBg: '#c8e6d4' },
  gold:    { bg: '#fdf6e3', border: '#f0dfa0', text: '#92400e', iconBg: '#f0dfa0' },
  blue:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', iconBg: '#dbeafe' },
  default: { bg: '#fff',    border: '#e8e0d0', text: '#1c1c1c', iconBg: '#f5f0e8' },
}

const TREND_STYLES = {
  up:      { color: '#1a5c38', symbol: '↑' },
  down:    { color: '#dc2626', symbol: '↓' },
  neutral: { color: '#6b7280', symbol: '→' },
}

function SkeletonLine({ w = '60%', h = '14px', radius = '6px' }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #f5f0e8 25%, #e8e0d0 50%, #f5f0e8 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.4s infinite linear',
    }} />
  )
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  loading = false,
  color = 'default',
  onClick,
  sublabel,
  className = '',
}) {
  const c = COLORS[color] || COLORS.default
  const isInteractive = !!onClick

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      <div
        onClick={onClick}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter') onClick?.(e) } : undefined}
        className={`rounded-2xl border p-5 flex flex-col gap-3 ${isInteractive ? 'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c38] focus-visible:ring-offset-1' : ''} ${className}`}
        style={{ background: c.bg, borderColor: c.border }}
      >
        <div className="flex items-center justify-between">
          {loading ? (
            <SkeletonLine w="45%" h="12px" />
          ) : (
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: c.text, opacity: 0.7 }}>
              {label}
            </p>
          )}
          {icon && !loading && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 select-none"
              style={{ background: c.iconBg }}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </div>

        {loading ? (
          <SkeletonLine w="40%" h="28px" radius="8px" />
        ) : (
          <p className="font-[family-name:var(--font-playfair)] font-bold text-2xl leading-none" style={{ color: c.text }}>
            {value ?? '—'}
          </p>
        )}

        {loading ? (
          <SkeletonLine w="65%" h="10px" />
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {sublabel && (
              <span className="text-xs" style={{ color: c.text, opacity: 0.6 }}>{sublabel}</span>
            )}
            {trend && (
              <span
                className="text-xs font-semibold"
                style={{ color: TREND_STYLES[trend.direction]?.color || TREND_STYLES.neutral.color }}
                aria-label={`Trend: ${trend.direction} ${trend.value}`}
              >
                {TREND_STYLES[trend.direction]?.symbol} {trend.value}
                {trend.label && <span className="font-normal opacity-70 ml-1">{trend.label}</span>}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
}
