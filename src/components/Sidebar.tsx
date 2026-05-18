import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/comprovantes', label: 'Comprovantes', icon: '◧' },
  { to: '/dinamicas', label: 'Dinâmicas', icon: '⊞' },
]

const ADMIN_ITEMS = [
  { to: '/relatorios', label: 'Relatórios', icon: '◈' },
  { to: '/admin', label: 'Admin', icon: '◉' },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-[220px] shrink-0 h-screen flex flex-col bg-white border-r border-[#E5E5E5] sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#E5E5E5]">
        <div className="text-[11px] label-text mb-0.5">SISTEMA</div>
        <div className="text-base font-semibold text-[#1A1A1A] tracking-tight">TERLAI</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#999999] hover:text-[#1A1A1A] hover:bg-[#F2F2F0]'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="label-text">ADMIN</span>
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-[#999999] hover:text-[#1A1A1A] hover:bg-[#F2F2F0]'
                  }`
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[#E5E5E5]">
        <div className="mb-1 text-xs font-medium text-[#1A1A1A] truncate">{profile?.full_name ?? 'Usuário'}</div>
        <div className="text-[11px] text-[#AAAAAA] uppercase tracking-wide mb-3">{profile?.role}</div>
        <button
          onClick={handleSignOut}
          className="w-full text-xs text-[#999] hover:text-[#1A1A1A] text-left transition-colors"
        >
          Sair →
        </button>
      </div>
    </aside>
  )
}
