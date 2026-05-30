'use client'
import { useRef } from 'react'

/**
 * TabBar — accessible tab navigation with keyboard support.
 *
 * Props:
 *   tabs      – Array<{ id, label, badge?: number, icon?: string|ReactNode, disabled?: boolean }>
 *   active    – string  (current tab id)
 *   onChange  – fn(id)
 *   variant   – 'pills' | 'underline' | 'box'
 *   scrollable – boolean  (enables horizontal scroll on overflow)
 *   size      – 'sm' | 'md'
 *   className – string
 *
 * Usage:
 *   <TabBar
 *     tabs={[
 *       { id: 'overview', label: 'Overview', icon: '📊' },
 *       { id: 'orders',   label: 'Orders',   badge: 3 },
 *       { id: 'wallet',   label: 'Wallet' },
 *     ]}
 *     active={activeTab}
 *     onChange={setActiveTab}
 *     variant="pills"
 *   />
 */

const CONTAINER_VARIANTS = {
  pills:     'flex gap-1 p-1 bg-[#f5f0e8] rounded-xl',
  underline: 'flex gap-0 border-b border-[#e8e0d0]',
  box:       'flex gap-0 bg-white border border-[#e8e0d0] rounded-xl overflow-hidden',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

function TabItem({ tab, active, onChange, variant, size }) {
  const isActive = active === tab.id
  const sizeClass = SIZES[size] || SIZES.md

  const activeStyles = {
    pills: isActive
      ? 'bg-white text-[#1a5c38] shadow-sm font-semibold'
      : 'text-gray-500 hover:text-[#1a5c38] hover:bg-white/60',
    underline: isActive
      ? 'text-[#1a5c38] font-semibold border-b-2 border-[#1a5c38] -mb-px'
      : 'text-gray-500 hover:text-[#1a5c38] border-b-2 border-transparent -mb-px',
    box: isActive
      ? 'bg-[#f0faf4] text-[#1a5c38] font-semibold border-r border-[#e8e0d0] last:border-r-0'
      : 'text-gray-500 hover:text-[#1a5c38] hover:bg-[#fdfbf7] border-r border-[#e8e0d0] last:border-r-0',
  }

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${tab.id}`}
      id={`tab-${tab.id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={tab.disabled}
      onClick={() => !tab.disabled && onChange(tab.id)}
      className={[
        'relative inline-flex items-center gap-1.5 rounded-lg whitespace-nowrap',
        'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c38] focus-visible:ring-inset',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        sizeClass,
        activeStyles[variant] || activeStyles.pills,
      ].join(' ')}
    >
      {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
      <span>{tab.label}</span>
      {tab.badge != null && tab.badge > 0 && (
        <span
          className="ml-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
          style={{
            background: isActive ? '#1a5c38' : '#e5e7eb',
            color: isActive ? '#fff' : '#374151',
          }}
          aria-label={`${tab.badge} items`}
        >
          {tab.badge > 99 ? '99+' : tab.badge}
        </span>
      )}
    </button>
  )
}

export default function TabBar({
  tabs = [],
  active,
  onChange,
  variant = 'pills',
  scrollable = false,
  size = 'md',
  className = '',
}) {
  const listRef = useRef(null)

  // Arrow-key navigation for accessibility (ARIA tabs pattern)
  const handleKeyDown = (e) => {
    const enabledTabs = tabs.filter(t => !t.disabled)
    const currentIdx = enabledTabs.findIndex(t => t.id === active)

    let nextIdx = currentIdx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIdx = (currentIdx + 1) % enabledTabs.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIdx = (currentIdx - 1 + enabledTabs.length) % enabledTabs.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIdx = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIdx = enabledTabs.length - 1
    } else {
      return
    }

    const nextTab = enabledTabs[nextIdx]
    onChange(nextTab.id)
    // Move DOM focus to the newly active tab
    listRef.current
      ?.querySelector(`[id="tab-${nextTab.id}"]`)
      ?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={[
        CONTAINER_VARIANTS[variant] || CONTAINER_VARIANTS.pills,
        scrollable ? 'overflow-x-auto scrollbar-hide' : '',
        className,
      ].join(' ')}
    >
      {tabs.map(tab => (
        <TabItem
          key={tab.id}
          tab={tab}
          active={active}
          onChange={onChange}
          variant={variant}
          size={size}
        />
      ))}
    </div>
  )
}

/**
 * TabPanel — the content area matching a TabBar.
 * Hide/show pattern using aria-hidden for accessibility.
 *
 * Usage:
 *   <TabPanel id="overview" active={activeTab}>...</TabPanel>
 */
export function TabPanel({ id, active, children, className = '' }) {
  const isActive = active === id
  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={!isActive}
      className={isActive ? className : ''}
    >
      {isActive && children}
    </div>
  )
}
