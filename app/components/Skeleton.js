'use client'

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`

const shimmerStyle = {
  background: 'linear-gradient(90deg, #f5f0e8 25%, #e8e0d0 50%, #f5f0e8 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.4s infinite linear',
}

export function SkeletonBlock({ width = '100%', height = '16px', radius = '8px', style = {} }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ width, height, borderRadius: radius, ...shimmerStyle, ...style }} />
    </>
  )
}

export function SkeletonText({ lines = 3, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
      <style>{shimmer}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '14px',
            borderRadius: '6px',
            width: i === lines - 1 ? '65%' : '100%',
            ...shimmerStyle,
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ style = {} }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8e0d0',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        ...style,
      }}
    >
      <style>{shimmer}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, ...shimmerStyle }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ height: '14px', borderRadius: '6px', width: '55%', ...shimmerStyle }} />
          <div style={{ height: '12px', borderRadius: '6px', width: '35%', ...shimmerStyle }} />
        </div>
      </div>
      <div style={{ height: '12px', borderRadius: '6px', ...shimmerStyle }} />
      <div style={{ height: '12px', borderRadius: '6px', width: '75%', ...shimmerStyle }} />
      <div style={{ height: '36px', borderRadius: '10px', ...shimmerStyle }} />
    </div>
  )
}

export function SkeletonStatCard({ style = {} }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8e0d0',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        ...style,
      }}
    >
      <style>{shimmer}</style>
      <div style={{ height: '12px', borderRadius: '6px', width: '50%', ...shimmerStyle }} />
      <div style={{ height: '28px', borderRadius: '8px', width: '40%', ...shimmerStyle }} />
      <div style={{ height: '10px', borderRadius: '5px', width: '65%', ...shimmerStyle }} />
    </div>
  )
}

export function SkeletonProductCard({ style = {} }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '2px solid #e8e0d0',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        ...style,
      }}
    >
      <style>{shimmer}</style>
      <div style={{ height: '80px', borderRadius: '12px', ...shimmerStyle }} />
      <div style={{ height: '14px', borderRadius: '6px', width: '60%', ...shimmerStyle }} />
      <div style={{ height: '12px', borderRadius: '6px', width: '40%', ...shimmerStyle }} />
      <div style={{ height: '32px', borderRadius: '10px', ...shimmerStyle }} />
    </div>
  )
}
