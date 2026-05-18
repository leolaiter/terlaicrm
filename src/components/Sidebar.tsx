import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/',             label: 'Dashboard',   icon: '⊡', end: true },
  { to: '/comprovantes', label: 'Comprovantes', icon: '◧', end: false },
  { to: '/dinamicas',    label: 'Dinâmicas',    icon: '⊞', end: false },
]
const ADMIN_NAV = [
  { to: '/relatorios', label: 'Relatórios', icon: '◈' },
  { to: '/admin',      label: 'Admin',      icon: '◉' },
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

  return (
    <aside
      className="w-[220px] shrink-0 h-screen flex flex-col sticky top-0"
      style={{
        background: 'rgba(255,255,255,0.52)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRight: '1px solid rgba(255,255,255,0.70)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: '#1A1A1A' }}
          >
            T
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#1A1A1A] tracking-tight leading-none">TERLAI</div>
            <div className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: '#CCCCCC' }}>System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'text-[#1A1A1A]'
                  : 'text-[#999999] hover:text-[#1A1A1A]'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'rgba(255,255,255,0.75)',
              boxShadow: '0 1px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
            } : undefined}
          >
            {({ isActive }) => (
              <>
                <span className="text-base leading-none" style={{ opacity: isActive ? 0.9 : 0.4 }}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div className="px-3 pt-5 pb-1.5">
              <span className="label">Administração</span>
            </div>
            {ADMIN_NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
                    isActive ? 'text-[#1A1A1A]' : 'text-[#999999] hover:text-[#1A1A1A]'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'rgba(255,255,255,0.75)',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
                } : undefined}
              >
                {({ isActive }) => (
                  <>
                    <span className="text-base leading-none" style={{ opacity: isActive ? 0.9 : 0.4 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{ background: 'rgba(0,0,0,0.08)', color: '#666' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium text-[#1A1A1A] truncate leading-tight">
              {profile?.full_name ?? 'Usuário'}
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#CCCCCC' }}>
              {profile?.role}
            </div>
          </div>
          <button onClick={handleSignOut} title="Sair"
            className="text-base leading-none transition-opacity hover:opacity-60"
            style={{ color: '#CCCCCC' }}>
            →
          </button>
        </div>
      </div>
    </aside>
  )
}
