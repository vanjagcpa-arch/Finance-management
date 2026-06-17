'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileBarChart2, CheckSquare,
  ShieldCheck, TrendingUp, Settings, ChevronRight,
  Zap, Users, Upload, FileText, Download, UserPlus, PieChart, AlertTriangle, Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPANY_NAME } from '@/lib/demoData'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Management Reports', icon: FileBarChart2 },
  { href: '/eom-close', label: 'Month-End Close', icon: CheckSquare },
  { href: '/audit', label: 'Data Audit', icon: ShieldCheck },
  { href: '/strategy', label: 'Finance Strategy', icon: TrendingUp },
]

const ELEC_NAV = [
  { href: '/electricity', label: 'Overview', icon: Zap, exact: true },
  { href: '/electricity/summary', label: 'Portfolio Summary', icon: PieChart },
  { href: '/electricity/customers', label: 'Customers', icon: Users },
  { href: '/electricity/vacant', label: 'Vacant Units', icon: Home },
  { href: '/electricity/onboard', label: 'Onboard Tenant', icon: UserPlus },
  { href: '/electricity/usage', label: 'Meter Readings', icon: Upload },
  { href: '/electricity/invoices', label: 'Invoices', icon: FileText },
  { href: '/electricity/debtors', label: 'Debtor Mgmt', icon: AlertTriangle },
  { href: '/electricity/exports', label: 'Exports & ABA', icon: Download },
  { href: '/electricity/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const inElec = pathname.startsWith('/electricity')

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col" style={{ width: 'var(--nav-width)', background: 'var(--nav-bg)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-nav-border">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-nav-textActive text-sm font-semibold truncate">{COMPANY_NAME}</p>
          <p className="text-nav-text text-xs">CFO Cockpit</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-nav-text text-xs font-medium uppercase tracking-wider px-2 mb-2">Workspace</p>
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    active
                      ? 'bg-nav-active text-nav-textActive'
                      : 'text-nav-text hover:bg-nav-hover hover:text-nav-textActive'
                  )}
                >
                  <Icon size={16} className={cn('flex-shrink-0', active ? 'text-indigo-400' : 'text-nav-text group-hover:text-nav-textActive')} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={14} className="text-indigo-400" />}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Electricity Billing Section */}
        <div className="mt-4">
          <p className="text-nav-text text-xs font-medium uppercase tracking-wider px-2 mb-2">Electricity Billing</p>
          <ul className="space-y-0.5">
            {ELEC_NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                      active
                        ? 'bg-nav-active text-nav-textActive'
                        : 'text-nav-text hover:bg-nav-hover hover:text-nav-textActive'
                    )}
                  >
                    <Icon size={16} className={cn('flex-shrink-0', active ? 'text-indigo-400' : 'text-nav-text group-hover:text-nav-textActive')} />
                    <span className="flex-1">{label}</span>
                    {active && <ChevronRight size={14} className="text-indigo-400" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-nav-border">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-nav-text hover:bg-nav-hover hover:text-nav-textActive transition-all">
          <Settings size={16} />
          <span>Settings</span>
        </Link>
        <div className="mt-3 px-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            CF
          </div>
          <div className="min-w-0">
            <p className="text-nav-textActive text-xs font-medium truncate">CFO</p>
            <p className="text-nav-text text-xs truncate">cfo@meridian.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
