'use client'

/**
 * Card — the universal white rounded container used throughout the app.
 *
 * Props:
 *   padding     – 'none' | 'sm' | 'md' | 'lg'  (default 'md')
 *   bordered    – boolean  (default true)
 *   elevated    – boolean  (adds shadow)
 *   interactive – boolean  (hover/focus states for clickable cards)
 *   className   – string
 *   onClick     – fn  (auto-enables interactive mode)
 *
 * Usage:
 *   <Card><p>Content</p></Card>
 *   <Card padding="lg" elevated>...</Card>
 *   <Card interactive onClick={handleClick}>Clickable card</Card>
 */

const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5 sm:p-6',
  lg:   'p-6 sm:p-8',
}

export default function Card({
  children,
  padding = 'md',
  bordered = true,
  elevated = false,
  interactive = false,
  onClick,
  className = '',
  as: Tag = 'div',
  ...props
}) {
  const isInteractive = interactive || !!onClick

  return (
    <Tag
      onClick={onClick}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? 'button' : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e) } : undefined}
      className={[
        'bg-white rounded-2xl',
        bordered ? 'border border-[#e8e0d0]' : '',
        elevated ? 'shadow-md' : 'shadow-sm',
        isInteractive
          ? 'cursor-pointer hover:border-[#1a5c38] hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c38] focus-visible:ring-offset-2'
          : '',
        PADDING[padding] ?? PADDING.md,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Tag>
  )
}

/**
 * CardSection — a titled section inside a Card with divider.
 *
 * Usage:
 *   <Card padding="none">
 *     <CardSection title="Details" action={<Button size="sm">Edit</Button>}>
 *       <p>Content</p>
 *     </CardSection>
 *   </Card>
 */
export function CardSection({ title, description, action, children, className = '' }) {
  return (
    <section className={`flex flex-col ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#f5f0e8]">
          <div>
            {title && (
              <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="px-5 sm:px-6 py-4">{children}</div>
    </section>
  )
}
