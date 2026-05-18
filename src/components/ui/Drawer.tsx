import { useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export function Drawer({ open, onClose, title, children, width = '480px' }: DrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, zIndex: 50,
          height: '100%', width,
          background: 'rgba(248, 246, 242, 0.82)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          borderLeft: '1px solid rgba(255,255,255,0.70)',
          boxShadow: '-8px 0 48px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.01em' }}>{title}</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#AAAAAA', background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.06)'; (e.target as HTMLElement).style.color = '#1A1A1A' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = '#AAAAAA' }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</div>
      </div>
    </>
  )
}
