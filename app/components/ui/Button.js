'use client'

/**
 * Button
 *
 * Props:
 *   variant   – 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
 *   size      – 'sm' | 'md' | 'lg'
 *   loading   – boolean  (shows spinner, disables interaction)
 *   fullWidth – boolean
 *   leftIcon  – ReactNode  (rendered before label)
 *   rightIcon – ReactNode  (rendered after label)
 *   + all native <button> attributes (onClick, disabled, type, …)
 *
 * Usage:
 *   <Button variant="primary" onClick={save}>Save</Button>
 *   <Button variant="danger" loading={deleting}>Delete</Button>
 *   <Button variant="secondary" size="sm" leftIcon={<PlusIcon />}>Add</Button>
 */

const VARIANTS = {
  primary:   'bg-[#1a5c38] text-white hover:bg-[#14472c] border-transparent focus-visible:ring-[#1a5c38]',
  secondary: 'bg-white text-[#1a5c38] border border-[#1a5c38] hover:bg-[#f0faf4] focus-visible:ring-[#1a5c38]',
  ghost:     'bg-transparent text-[#1a5c38] border border-transparent hover:bg-[#f0faf4] focus-visible:ring-[#1a5c38]',
  danger:    'bg-red-600 text-white hover:bg-red-700 border-transparent focus-visible:ring-red-500',
  gold:      'bg-[#d4a017] text-white hover:bg-[#b88a10] border-transparent focus-visible:ring-[#d4a017]',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
  lg: 'text-sm px-6 py-3 rounded-xl gap-2',
}

const SPINNER_SIZES = { sm: 12, md: 14, lg: 16 }

function Spinner({ size = 14 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <Spinner size={SPINNER_SIZES[size]} />
      ) : leftIcon ? (
        <span aria-hidden="true" className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {!loading && rightIcon && (
        <span aria-hidden="true" className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  )
}
