'use client'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import {
  Upload, Search, BarChart3, Scale, BookMarked,
  CheckCircle, AlertTriangle, Clock, XCircle,
  TrendingUp, TrendingDown, ChevronRight, ArrowRight,
  FileText, AlertCircle, Calendar, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fmt = (n: number, short?: boolean) => {
  const abs = Math.abs(n)
  if (short && abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (short && abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`
  return `$${abs.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const MODULES = [
  {
    href: '/accounting/import',
    icon: Upload,
    label: 'Import Data',
    desc: 'Import GL, bank, payroll and budget files from Xero, MYOB, CSV or Excel',
    stats: [{ label: 'Last import', value: '31 May 2024' }, { label: 'Records', value: '1,847' }],
    color: 'indigo',
    status: 'ok',
  },
  {
    href: '/accounting/audit',
    icon: Search,
    label: 'Audit & Validate',
    desc: 'Data quality checks, anomaly detection, reconciliation validation and audit trail',
    stats: [{ label: 'Audit score', value: '83%' }, { label: 'Open anomalies', value: '5' }],
    color: 'amber',
    status: 'warning',
  },
  {
    href: '/accounting/analysis',
    icon: BarChart3,
    label: 'Analysis',
    desc: 'P&L, balance sheet, KPIs, margin analysis and 12-month trend reporting',
    stats: [{ label: 'Revenue', value: '$8.3M' }, { label: 'EBITDA', value: '26.7%' }],
    color: 'emerald',
    status: 'ok',
  },
  {
    href: '/accounting/reconciliations',
    icon: Scale,
    label: 'Reconciliations',
    desc: 'Balance sheet account reconciliations with movement schedules and sign-off workflow',
    stats: [{ label: 'Reconciled', value: '7 / 8' }, { label: 'Variance', value: '$1,250' }],
    color: 'purple',
    status: 'warning',
  },
  {
    href: '/accounting/journals',
    icon: BookMarked,
    label: 'Journal Schedules',
    desc: 'Accruals, prepayments, depreciation register and manual journal entries',
    stats: [{ label: 'Accruals', value: '$821K' }, { label: 'Journals', value: '6 posted' }],
    color: 'rose',
    status: 'ok',
  },
]

const colorMap: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' },
}

const ALERTS = [
  { type: 'warning', icon: AlertTriangle, msg: 'GST Payable reconciliation has $1,250 unreconciled difference', href: '/accounting/reconciliations', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { type: 'warning', icon: AlertTriangle, msg: '5 open anomalies require review — including 2 potential duplicates', href: '/accounting/audit', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { type: 'info', icon: AlertCircle, msg: 'Bank reconciliation: $1,250 difference between GL and ANZ statement', href: '/accounting/audit', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { type: 'success', icon: CheckCircle, msg: 'Trial balance verified — debits equal credits ($14,823,441)', href: '/accounting/audit', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { type: 'success', icon: CheckCircle, msg: 'Monthly depreciation posted — $98,800 charged across 9 active assets', href: '/accounting/journals', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
]

const RECENT_JOURNALS = [
  { ref: 'JNL-2024-060', type: 'Reversal', desc: 'May accruals auto-reversal', date: '01 Jun 2024', amount: 178_300, status: 'posted' },
  { ref: 'JNL-2024-058', type: 'Accrual', desc: 'Monthly closing accruals — May 2024', date: '31 May 2024', amount: 821_300, status: 'posted' },
  { ref: 'JNL-2024-057', type: 'Accrual', desc: 'Income tax expense accrual', date: '31 May 2024', amount: 643_800, status: 'posted' },
  { ref: 'JNL-2024-056', type: 'Prepayment', desc: 'Prepayment amortisation — May', date: '31 May 2024', amount: 52_500, status: 'posted' },
  { ref: 'JNL-2024-055', type: 'Depreciation', desc: 'Monthly depreciation run', date: '31 May 2024', amount: 98_800, status: 'posted' },
]

const REC_STATUS = [
  { name: 'Cash at Bank', status: 'reconciled', variance: 0 },
  { name: 'Trade Receivables', status: 'reconciled', variance: 0 },
  { name: 'Prepayments', status: 'reconciled', variance: 0 },
  { name: 'Fixed Assets', status: 'reconciled', variance: 0 },
  { name: 'Trade Payables', status: 'reconciled', variance: 0 },
  { name: 'Accrued Liabilities', status: 'reconciled', variance: 0 },
  { name: 'GST Payable', status: 'in_progress', variance: 1_250 },
  { name: 'Retained Earnings', status: 'reconciled', variance: 0 },
]

const KPIs = [
  { name: 'Revenue', value: '$8.34M', change: +2.4, good: true },
  { name: 'Gross Margin', value: '66.0%', change: 0, good: true },
  { name: 'EBITDA Margin', value: '26.7%', change: -1.1, good: false },
  { name: 'Net Profit', value: '$1.50M', change: +3.0, good: true },
]

export default function AccountingOverview() {
  const reconciledCount = REC_STATUS.filter(r => r.status === 'reconciled').length
  const totalVariance = REC_STATUS.reduce((s, r) => s + Math.abs(r.variance), 0)

  return (
    <div className="flex flex-col h-full">
      <Header title="Financial Accounting" subtitle="May 2024 — Import · Audit · Analysis · Reconciliations · Journals" />
      <div className="flex-1 overflow-auto p-6">
        {/* Period banner */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-xl text-white">
          <div>
            <p className="text-xs text-indigo-300 font-medium uppercase tracking-wider mb-0.5">Active Period</p>
            <p className="text-lg font-bold">May 2024 — Month End Close</p>
            <p className="text-xs text-indigo-300 mt-0.5">Period: 01 May 2024 – 31 May 2024 · Status: <span className="text-amber-300 font-medium">In Review</span></p>
          </div>
          <div className="flex items-center gap-6">
            {KPIs.map(k => (
              <div key={k.name} className="text-center">
                <p className="text-xs text-indigo-300 mb-0.5">{k.name}</p>
                <p className="text-lg font-bold font-mono">{k.value}</p>
                <div className={cn('flex items-center gap-0.5 justify-center text-xs font-medium', k.good ? 'text-emerald-400' : 'text-red-400')}>
                  {k.change === 0 ? <span>— flat</span> : k.change > 0 ? <><TrendingUp size={10} /> +{k.change}%</> : <><TrendingDown size={10} /> {k.change}%</>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {MODULES.map(mod => {
            const c = colorMap[mod.color]
            return (
              <Link key={mod.href} href={mod.href} className="card p-4 hover:shadow-md transition-all group cursor-pointer block">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', c.bg)}>
                    <mod.icon size={18} className={c.icon} />
                  </div>
                  {mod.status === 'warning' && <AlertTriangle size={13} className="text-amber-500 mt-0.5" />}
                  {mod.status === 'ok' && <CheckCircle size={13} className="text-emerald-500 mt-0.5" />}
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{mod.label}</p>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">{mod.desc}</p>
                <div className="space-y-1">
                  {mod.stats.map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{s.label}</span>
                      <span className={cn('text-xs font-semibold font-mono px-1.5 py-0.5 rounded', c.badge)}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Alerts */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Alerts & Actions</h3>
              <span className="text-xs text-slate-400">{ALERTS.filter(a => a.type !== 'success').length} requiring attention</span>
            </div>
            <div className="space-y-2">
              {ALERTS.map((a, i) => (
                <Link key={i} href={a.href} className={cn('flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-all hover:shadow-sm cursor-pointer', a.color)}>
                  <a.icon size={13} className="flex-shrink-0 mt-0.5" />
                  <span className="flex-1 leading-relaxed">{a.msg}</span>
                  <ChevronRight size={11} className="flex-shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Reconciliation status */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">BS Reconciliation Status</h3>
              <span className="text-xs font-medium text-emerald-600">{reconciledCount}/{REC_STATUS.length} cleared</span>
            </div>
            <div className="space-y-1.5">
              {REC_STATUS.map(r => (
                <div key={r.name} className="flex items-center gap-2 py-1">
                  {r.status === 'reconciled'
                    ? <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                    : <Clock size={13} className="text-amber-500 flex-shrink-0" />
                  }
                  <span className="text-xs text-slate-600 flex-1">{r.name}</span>
                  {r.variance !== 0
                    ? <span className="text-xs text-red-500 font-mono">{fmt(r.variance)}</span>
                    : <span className="text-xs text-emerald-500 font-medium">Clear</span>
                  }
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Total unreconciled variance</span>
              <span className={cn('text-xs font-mono font-semibold', totalVariance === 0 ? 'text-emerald-600' : 'text-red-500')}>
                {totalVariance === 0 ? '$0.00' : `$${totalVariance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>

          {/* Recent journals */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Recent Journals</h3>
              <Link href="/accounting/journals" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                View all <ChevronRight size={11} />
              </Link>
            </div>
            <div className="space-y-2">
              {RECENT_JOURNALS.map(j => (
                <div key={j.ref} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-slate-400">{j.ref}</span>
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">{j.type}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{j.desc}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{j.date}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-mono font-semibold text-slate-800">{fmt(j.amount, true)}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Posted</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
