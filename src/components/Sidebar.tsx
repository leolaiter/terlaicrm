import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/',             icon: '⊡', label: 'Dashboard',   end: true },
  { to: '/comprovantes', icon: '◧', label: 'Comprovantes', end: false },
  { to: '/dinamicas',    icon: '⊞', label: 'Dinâmicas',    end: false },
]
const ADMIN_NAV = [
  { to: '/relatorios', icon: '◈', label: 'Relatórios' },
  { to: '/admin',      icon: '◉', label: 'Admin' },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const iconBtn = (isActive: boolean) => ({
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, cursor: 'pointer', transition: 'all 0.15s',
    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.30)',
    border: isActive ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
  })

  return (
    <aside style={{
      width: 64, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(255,255,255,0.03)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      paddingTop: 20, paddingBottom: 16, gap: 0,
    }}>
      {/* Logo */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: '#FFFFFF', color: '#0E0E11',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 800, marginBottom: 28, flexShrink: 0,
      }}>
        T
      </div>

      {/* Nav icons */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.label}
            style={({ isActive }) => iconBtn(isActive)}>
            {item.icon}
          </NavLink>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 4px' }} />
            {ADMIN_NAV.map(item => (
              <NavLink key={item.to} to={item.to} title={item.label}
                style={({ isActive }) => iconBtn(isActive)}>
                {item.icon}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User avatar */}
      <button
        onClick={handleSignOut}
        title={`${profile?.full_name ?? 'Sair'} — clique para sair`}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.60)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)' }}
      >
        {initials}
      </button>
    </aside>
  )
}
