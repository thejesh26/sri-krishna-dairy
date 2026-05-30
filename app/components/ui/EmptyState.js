'use client'
import Button from './Button'

/**
 * EmptyState — zero-data, error, and loading states.
 *
 * Props:
 *   icon        – string (emoji) | ReactNode
 *   title       – string
 *   description – string
 *   action      – { label, onClick, href, variant, loading }
 *   secondaryAction – { label, onClick, href }
 *   compact     – boolean  (reduced padding for inline use)
 *   className   – string
 *
 * Usage:
 *   <EmptyState icon="📦" title="No orders yet"
 *     description="Your orders will appear here."
 *     action={{ label: 'Place an order', href: '/order' }} />
 *
 *   <EmptyState icon="⚠️" title="Something went wrong"
 *     description={error.message}
 *     action={{ label: 'Try again', onClick: retry }} />
 *
 *   <EmptyState title="Loading your orders…" loading />
 */

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  loading = false,
  className = '',
}) {
  const padding = compact ? 'py-8 px-4' : 'py-14 px-6'

  return (
    <div className={`flex flex-col items-center justify-center text-center ${padding} ${className}`}>
      {loading ? (
        <LoadingSpinner />
      ) : icon ? (
        <div className="text-4xl mb-3 select-none" aria-hidden="true">
          {icon}
        </div>
      ) : null}

      {title && (
        <p className={`font-semibold text-[#1c1c1c] font-[family-name:var(--font-playfair)] ${compact ? 'text-base' : 'text-lg'} mb-1`}>
          {title}
        </p>
      )}
      {description && (
        <p className={`text-gray-400 leading-relaxed ${compact ? 'text-xs' : 'text-sm'} max-w-xs`}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && !loading && (
        <div className="flex items-center gap-3 mt-5 flex-wrap justify-center">
          {action && (
            action.href ? (
              <a href={action.href}>
                <Button variant={action.variant || 'primary'} size="sm" loading={action.loading}>
                  {action.label}
                </Button>
              </a>
            ) : (
              <Button
                variant={action.variant || 'primary'}
                size="sm"
                onClick={action.onClick}
                loading={action.loading}
              >
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <a href={secondaryAction.href}>
                <Button variant="ghost" size="sm">{secondaryAction.label}</Button>
              </a>
            ) : (
              <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-3 mb-2">
      <svg
        className="animate-spin text-[#1a5c38]"
        width="32" height="32" viewBox="0 0 24 24" fill="none"
        aria-label="Loading"
        role="status"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
        <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}
