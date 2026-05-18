import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/',             label: 'Dashboard',    icon: '⊡', end: true },
  { to: '/comprovantes', label: 'Comprovantes',  icon: '◧', end: false },
  { to: '/dinamicas',    label: 'Dinâmicas',     icon: '⊞', end: false },
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
      className="w-[228px] shrink-0 h-screen flex flex-col sticky top-0"
      style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E5' }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: '#1A1A1A' }}
          >
            T
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#1A1A1A] tracking-tight leading-none">TERLAI</div>
            <div className="text-[10px] text-[#BBBBBB] tracking-widest uppercase mt-0.5">System</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-[#F4F4F4] text-[#1A1A1A]'
                  : 'text-[#888888] hover:bg-[#F8F8F8] hover:text-[#1A1A1A]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="text-[15px] leading-none transition-opacity"
                  style={{ opacity: isActive ? 1 : 0.5 }}
                >
                  {item.icon}
                </span>
                {item.label}
                {isActive && (
                  <div
                    className="ml-auto w-1 h-1 rounded-full"
                    style={{ background: '#1A1A1A' }}
                  />
                )}
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
                  `flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#F4F4F4] text-[#1A1A1A]'
                      : 'text-[#888888] hover:bg-[#F8F8F8] hover:text-[#1A1A1A]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="text-[15px] leading-none" style={{ opacity: isActive ? 1 : 0.5 }}>
                      {item.icon}
                    </span>
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1 h-1 rounded-full" style={{ background: '#1A1A1A' }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #F0F0F0' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-[#666] shrink-0"
            style={{ background: '#F0F0F0' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium text-[#1A1A1A] truncate leading-tight">
              {profile?.full_name ?? 'Usuário'}
            </div>
            <div className="text-[10.5px] text-[#BBBBBB] uppercase tracking-wider mt-0.5">
              {profile?.role}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[#CCCCCC] hover:text-[#999] transition-colors text-base leading-none shrink-0"
            title="Sair"
          >
            →
          </button>
        </div>
      </div>
    </aside>
  )
}
