import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, ClipboardCheck,
  LogOut, Shield, ChevronRight, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/lib/types'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['hr'] },
  { to: '/hr/employees', icon: Users, label: 'Employees', roles: ['hr'] },
  { to: '/bgv/queue', icon: ClipboardCheck, label: 'Review Queue', roles: ['bgv_team', 'admin'] },
  { to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['admin'] },
  { to: '/admin/orgs', icon: Building2, label: 'Orgs', roles: ['admin'] },
  { to: '/admin/users', icon: Users, label: 'Users', roles: ['admin'] },
  { to: '/admin/reports', icon: FileText, label: 'Reports', roles: ['admin'] },
  { to: '/admin/employees', icon: Users, label: 'All Employees', roles: ['admin'] },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()

  const visibleItems = navItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  )

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#063840] flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/relynt_logo.svg" alt="Relynt" className="w-8 h-8 rounded-lg" />
          <div>
            <div className="text-white font-bold text-lg leading-none">relynt</div>
            <div className="text-[#6FC2CB] text-xs font-medium mt-0.5">BGV Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-[#6FC2CB]/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#6FC2CB] text-xs font-bold uppercase">
              {profile?.full_name?.charAt(0) ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{profile?.full_name}</div>
            <div className="text-white/50 text-xs truncate capitalize">{profile?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
