'use client'
import { Bell, RefreshCw } from 'lucide-react'
import { REPORTING_PERIOD } from '@/lib/demoData'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
          Period: {REPORTING_PERIOD}
        </span>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="Refresh">
          <RefreshCw size={15} />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative" title="Notifications">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  )
}
