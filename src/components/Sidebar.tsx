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

export const SIDEBAR_W = 192

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

  const navItem = (isActive: boolean) => ({
    width: '100%', height: 38, borderRadius: 10,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 12px',
    cursor: 'pointer', transition: 'all 0.15s',
    background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
    border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
    textDecoration: 'none',
  } as React.CSSProperties)

  return (
    <aside style={{
      width: SIDEBAR_W, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      background: 'rgba(255,255,255,0.03)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      paddingTop: 20, paddingBottom: 16, paddingLeft: 12, paddingRight: 12,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, paddingLeft: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: '#FFFFFF', color: '#0E0E11',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800,
        }}>
          T
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em' }}>TERLAI</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>System</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => navItem(isActive)}>
            {({ isActive }) => (
              <>
                <span style={{ fontSize: 15, color: isActive ? '#FFF' : 'rgba(255,255,255,0.30)', flexShrink: 0, width: 20, textAlign: 'center' }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: isActive ? '#FFF' : 'rgba(255,255,255,0.40)', letterSpacing: '-0.01em' }}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
            {ADMIN_NAV.map(item => (
              <NavLink key={item.to} to={item.to}
                style={({ isActive }) => navItem(isActive)}>
                {({ isActive }) => (
                  <>
                    <span style={{ fontSize: 15, color: isActive ? '#FFF' : 'rgba(255,255,255,0.30)', flexShrink: 0, width: 20, textAlign: 'center' }}>
                      {item.icon}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: isActive ? '#FFF' : 'rgba(255,255,255,0.40)', letterSpacing: '-0.01em' }}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <button
        onClick={handleSignOut}
        title={`${profile?.full_name ?? 'Sair'} — clique para sair`}
        style={{
          width: '100%', height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.09)',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 10px', cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.70)',
        }}>
          {initials}
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile?.full_name ?? 'Sair'}
        </span>
      </button>
    </aside>
  )
}
