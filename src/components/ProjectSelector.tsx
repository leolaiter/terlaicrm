import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'

export function ProjectSelector() {
  const { profile } = useAuth()
  const { projects, activeProject, setActiveProject } = useProject()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!profile) return null

  if (profile.role !== 'admin') {
    return (
      <div className="glass-sm" style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.45)' }}>Projeto:</span>
        <span style={{ color: '#FFF', fontWeight: 600 }}>{activeProject?.name || '—'}</span>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        className="glass-sm"
        style={{
          padding: '7px 12px',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 600, color: '#FFF',
          cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)',
          background: open ? 'rgba(255,255,255,0.10)' : undefined,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>Projeto:</span>
        <span>{activeProject?.name || 'Selecionar'}</span>
        <span style={{ fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
          minWidth: 220,
          background: 'rgba(14,14,17,0.96)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          padding: 6,
        }}>
          {projects.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: 12, textAlign: 'center' }}>Nenhum projeto</p>
          ) : projects.map(p => {
            const isActive = activeProject?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => { setActiveProject(p); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', borderRadius: 8, border: 'none',
                  background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: '#FFF',
                  fontSize: 13, textAlign: 'left', cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ flex: 1 }}>{p.name}</span>
                {isActive && <span style={{ color: '#D4C429', fontSize: 11 }}>●</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
