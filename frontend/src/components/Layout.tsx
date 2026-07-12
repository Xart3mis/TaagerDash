import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { getTokenRole } from '@/utils/auth'
import {
  LayoutDashboard,
  Trophy,
  Filter,
  Target,
  UserPlus,
  LogOut,
  BarChart3,
  User,
  Users,
} from 'lucide-react'
import clsx from 'clsx'

const BUYER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/funnel', label: 'Funnel', icon: Filter },
  { to: '/targets', label: 'Targets', icon: Target },
]

const ADMIN_EXTRA = [
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/invites', label: 'Invites', icon: UserPlus },
]

type NavItemProps = {
  to: string
  label: string
  icon: React.ElementType
  mobile?: boolean
}

function NavItem({ to, label, icon: Icon, mobile = false }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        mobile
          ? clsx(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
              isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-700',
            )
          : clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )
      }
    >
      <Icon className={mobile ? 'w-5 h-5' : 'w-4 h-4 shrink-0'} />
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const role = getTokenRole()
  const isAdmin = role === 'admin'

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  const allLinks = isAdmin ? [...BUYER_LINKS, ...ADMIN_EXTRA] : BUYER_LINKS
  // Mobile bottom nav: cap at 5 items
  const mobileLinks = allLinks.slice(0, 5)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-white border-r border-slate-200 z-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-500">
            <BarChart3 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">TaagerDash</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {allLinks.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
        </nav>

        {/* Footer: profile + sign out */}
        <div className="p-3 border-t border-slate-100 shrink-0 space-y-0.5">
          <NavItem to="/profile" label="Profile" icon={User} />
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 md:ml-56 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 h-12 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-500">
              <BarChart3 className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">TaagerDash</span>
          </div>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom nav (max 5 items) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 flex">
        {mobileLinks.map((link) => (
          <NavItem key={link.to} {...link} mobile />
        ))}
      </nav>
    </div>
  )
}
