'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import {
  CheckCircle, XCircle, AlertTriangle, Info, Search,
  ChevronDown, ChevronRight, Filter, Download, Eye,
  RefreshCw, Clock, User, Tag, TrendingUp, TrendingDown,
  AlertCircle, CheckSquare, BarChart2, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n >= 0 ? `$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const AUDIT_CHECKS = [
  { id: 'AC-01', category: 'completeness', name: 'All periods posted', description: 'Verify all 12 months have journal entries', status: 'pass', count: 12, severity: 'high' },
  { id: 'AC-02', category: 'completeness', name: 'No missing account codes', description: 'All transactions reference valid chart of accounts codes', status: 'pass', count: 1847, severity: 'critical' },
  { id: 'AC-03', category: 'completeness', name: 'Payroll reconciliation', description: 'GL payroll matches payroll system total', status: 'pass', count: 312, severity: 'high' },
  { id: 'AC-04', category: 'accuracy', name: 'Trial balance: debits = credits', description: 'Sum of all debits equals sum of all credits', status: 'pass', count: 1, severity: 'critical', amount: 0 },
  { id: 'AC-05', category: 'accuracy', name: 'Bank reconciliation', description: 'GL bank balance matches bank statement closing balance', status: 'warning', count: 1, severity: 'critical', amount: 1250 },
  { id: 'AC-06', category: 'accuracy', name: 'GST reconciliation', description: 'GST collected/paid matches BAS lodgement', status: 'pass', count: 1, severity: 'high', amount: 0 },
  { id: 'AC-07', category: 'validity', name: 'Duplicate transactions', description: 'Detect potential duplicate journal entries by amount + date + account', status: 'fail', count: 3, severity: 'high', amount: 7840 },
  { id: 'AC-08', category: 'validity', name: 'Round number entries', description: 'Flag suspiciously round journal entries > $10K', status: 'warning', count: 8, severity: 'medium', amount: 124000 },
  { id: 'AC-09', category: 'validity', name: 'Journal preparer authority', description: 'All manual journals approved by authorised user', status: 'pass', count: 48, severity: 'high' },
  { id: 'AC-10', category: 'consistency', name: 'Period-over-period anomalies', description: 'Accounts with >50% movement vs prior month', status: 'warning', count: 5, severity: 'medium', amount: 38200 },
  { id: 'AC-11', category: 'consistency', name: 'Intercompany eliminations', description: 'All interco balances eliminated in consolidation', status: 'pass', count: 4, severity: 'high', amount: 0 },
  { id: 'AC-12', category: 'timeliness', name: 'Cut-off accuracy', description: 'Transactions posted within the correct period', status: 'fail', count: 2, severity: 'medium', amount: 3200 },
]

const ANOMALIES = [
  { id: 'ANO-001', date: '31/05/2024', account: '6300', accountName: 'Consulting Fees', description: 'Consulting — Project Delta', amount: 45000, flag: 'outlier', status: 'open', notes: 'Amount is 340% above monthly average of $10,250', detectedAt: '1 Jun 2024 08:15' },
  { id: 'ANO-002', date: '28/05/2024', account: '6100', accountName: 'Rent Expense', description: 'Rent — Level 7 Office', amount: 18500, flag: 'duplicate', status: 'open', notes: 'Identical entry found on 1/05/2024 — possible duplicate', detectedAt: '1 Jun 2024 08:15' },
  { id: 'ANO-003', date: '15/05/2024', account: '4100', accountName: 'Sales Revenue', description: 'Revenue recognition — May accrual', amount: -25000, flag: 'unusual_timing', status: 'reviewed', notes: 'Credit to revenue mid-month — requires explanation', detectedAt: '1 Jun 2024 08:16' },
  { id: 'ANO-004', date: '30/05/2024', account: '2400', accountName: 'Accrued Liabilities', description: 'Legal accrual Q2', amount: 50000, flag: 'outlier', status: 'resolved', notes: 'Confirmed by CFO — Q2 legal dispute provision', detectedAt: '1 Jun 2024 08:16' },
  { id: 'ANO-005', date: '31/05/2024', account: '1100', accountName: 'Cash at Bank', description: 'Bank transfer — ANZ to CBA', amount: 200000, flag: 'outlier', status: 'open', notes: 'Large inter-account transfer — confirm authorisation', detectedAt: '1 Jun 2024 08:17' },
  { id: 'ANO-006', date: '29/05/2024', account: '5100', accountName: 'Cost of Goods Sold', description: 'Inventory adjustment', amount: 7840, flag: 'duplicate', status: 'open', notes: 'Duplicate of entry on 28/05/2024 — same amount, same account', detectedAt: '1 Jun 2024 08:17' },
  { id: 'ANO-007', date: '01/05/2024', account: '9900', accountName: 'Suspense Account', description: 'Unclassified entry — import error', amount: 1250, flag: 'missing', status: 'open', notes: 'Entry in suspense — no account classification', detectedAt: '1 Jun 2024 08:18' },
  { id: 'ANO-008', date: '31/05/2024', account: '7200', accountName: 'Depreciation Expense', description: 'Monthly depreciation run', amount: 12333, flag: 'rounding', status: 'reviewed', notes: 'Depreciation amount differs from schedule by $0.58', detectedAt: '1 Jun 2024 08:18' },
]

const AUDIT_LOG = [
  { id: 'LOG-010', action: 'Anomaly Resolved', user: 'Sarah Chen', timestamp: '2024-06-01 14:22', module: 'Anomalies', details: 'ANO-004 marked resolved — CFO confirmed legal provision', outcome: 'success' },
  { id: 'LOG-009', action: 'Anomaly Reviewed', user: 'Michael Park', timestamp: '2024-06-01 11:45', module: 'Anomalies', details: 'ANO-003 revenue credit reviewed — accrual reversal confirmed', outcome: 'success' },
  { id: 'LOG-008', action: 'Data Import Run', user: 'System', timestamp: '2024-05-31 18:42', module: 'Import', details: 'IMP-006: Xero GL Export May 2024 — 1,847 rows', outcome: 'success' },
  { id: 'LOG-007', action: 'Audit Check Failed', user: 'System', timestamp: '2024-05-31 18:43', module: 'Audit Checks', details: 'AC-07 Duplicate Transactions — 3 items flagged, $7,840', outcome: 'warning' },
  { id: 'LOG-006', action: 'Bank Rec Discrepancy', user: 'System', timestamp: '2024-05-31 18:43', module: 'Reconciliation', details: 'AC-05 Bank Rec unreconciled — $1,250 difference', outcome: 'warning' },
  { id: 'LOG-005', action: 'Trial Balance Verified', user: 'System', timestamp: '2024-05-31 18:44', module: 'Audit Checks', details: 'AC-04 Trial Balance: Debits = Credits = $14,823,441.20', outcome: 'success' },
  { id: 'LOG-004', action: 'Payroll Run Imported', user: 'Sarah Chen', timestamp: '2024-05-31 16:15', module: 'Import', details: 'IMP-005: Payroll May 2024 — 312 rows, $0 discrepancy', outcome: 'success' },
  { id: 'LOG-003', action: 'Period Locked', user: 'CFO', timestamp: '2024-04-30 19:30', module: 'Period Control', details: 'April 2024 period locked — no further posting allowed', outcome: 'success' },
  { id: 'LOG-002', action: 'Cut-off Flag', user: 'System', timestamp: '2024-05-01 09:12', module: 'Audit Checks', details: 'AC-12 Cut-off: 2 transactions in wrong period — $3,200', outcome: 'warning' },
  { id: 'LOG-001', action: 'GST Reconciled', user: 'Michael Park', timestamp: '2024-04-28 16:00', module: 'Reconciliation', details: 'BAS Q3 FY2024 — GST collected $142,800 matches ATO lodgement', outcome: 'success' },
]

const catColors: Record<string, string> = {
  completeness: 'bg-indigo-50 text-indigo-700',
  accuracy: 'bg-emerald-50 text-emerald-700',
  validity: 'bg-purple-50 text-purple-700',
  consistency: 'bg-amber-50 text-amber-700',
  timeliness: 'bg-pink-50 text-pink-700',
}

const flagColors: Record<string, string> = {
  duplicate: 'badge-danger',
  outlier: 'badge-warning',
  unusual_timing: 'badge-warning',
  missing: 'badge-danger',
  rounding: 'badge-neutral',
}

const statusColors: Record<string, string> = {
  open: 'badge-danger',
  reviewed: 'badge-warning',
  resolved: 'badge-success',
  waived: 'badge-neutral',
}

const outcomeColors: Record<string, string> = {
  success: 'text-emerald-600',
  warning: 'text-amber-500',
  error: 'text-red-500',
}

type Tab = 'summary' | 'checks' | 'anomalies' | 'log'

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const passed = AUDIT_CHECKS.filter(c => c.status === 'pass').length
  const failed = AUDIT_CHECKS.filter(c => c.status === 'fail').length
  const warned = AUDIT_CHECKS.filter(c => c.status === 'warning').length
  const openAnomalies = ANOMALIES.filter(a => a.status === 'open').length

  const filteredChecks = AUDIT_CHECKS.filter(c =>
    (filterCategory === 'all' || c.category === filterCategory) &&
    (filterStatus === 'all' || c.status === filterStatus)
  )

  const filteredAnomalies = ANOMALIES.filter(a =>
    filterStatus === 'all' || a.status === filterStatus
  )

  const overallScore = Math.round((passed / AUDIT_CHECKS.length) * 100)

  return (
    <div className="flex flex-col h-full">
      <Header title="Audit & Validate" subtitle="Comprehensive data quality checks and anomaly detection — May 2024" />
      <div className="flex-1 overflow-auto p-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="card p-4 col-span-1">
            <p className="kpi-label mb-2">Audit Score</p>
            <div className="flex items-end gap-2">
              <p className={cn('text-3xl font-bold font-mono', overallScore >= 90 ? 'text-emerald-600' : overallScore >= 70 ? 'text-amber-500' : 'text-red-500')}>{overallScore}%</p>
            </div>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', overallScore >= 90 ? 'bg-emerald-500' : overallScore >= 70 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${overallScore}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">May 2024</p>
          </div>
          {[
            { label: 'Checks Passed', value: passed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Checks Failed', value: failed, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Warnings', value: warned, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Open Anomalies', value: openAnomalies, icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', k.bg)}>
                  <k.icon size={14} className={k.color} />
                </div>
                <p className="kpi-label">{k.label}</p>
              </div>
              <p className={cn('text-2xl font-bold font-mono', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-1 w-fit">
          {([
            { id: 'summary', label: 'Summary', icon: BarChart2 },
            { id: 'checks', label: 'Audit Checks', icon: CheckSquare },
            { id: 'anomalies', label: `Anomalies (${openAnomalies} open)`, icon: AlertCircle },
            { id: 'log', label: 'Audit Log', icon: Clock },
          ] as { id: Tab; label: string; icon: any }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', activeTab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700')}
            >
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-2 gap-5">
            {/* Category breakdown */}
            <div className="card p-5">
              <h3 className="section-title">Check Results by Category</h3>
              <div className="space-y-3">
                {['completeness', 'accuracy', 'validity', 'consistency', 'timeliness'].map(cat => {
                  const checks = AUDIT_CHECKS.filter(c => c.category === cat)
                  const p = checks.filter(c => c.status === 'pass').length
                  const f = checks.filter(c => c.status === 'fail').length
                  const w = checks.filter(c => c.status === 'warning').length
                  const pct = Math.round((p / checks.length) * 100)
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', catColors[cat])}>{cat}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-600">{p} pass</span>
                          {f > 0 && <span className="text-red-500">{f} fail</span>}
                          {w > 0 && <span className="text-amber-500">{w} warn</span>}
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', f > 0 ? 'bg-red-400' : w > 0 ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Failed / Warning checks */}
            <div className="card p-5">
              <h3 className="section-title">Issues Requiring Attention</h3>
              <div className="space-y-2">
                {AUDIT_CHECKS.filter(c => c.status !== 'pass').map(c => (
                  <div key={c.id} className={cn('flex items-start gap-3 p-3 rounded-lg border', c.status === 'fail' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200')}>
                    {c.status === 'fail' ? <XCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                      {c.amount !== undefined && <p className="text-xs font-mono text-slate-700 mt-1">{fmt(c.amount)} {c.amount === 0 ? 'variance' : 'flagged'}</p>}
                    </div>
                    <span className={cn('text-xs font-medium flex-shrink-0', c.severity === 'critical' ? 'text-red-600' : c.severity === 'high' ? 'text-amber-600' : 'text-slate-500')}>{c.severity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly breakdown */}
            <div className="card p-5">
              <h3 className="section-title">Anomalies by Type</h3>
              <div className="space-y-2">
                {['duplicate', 'outlier', 'unusual_timing', 'missing', 'rounding'].map(flag => {
                  const items = ANOMALIES.filter(a => a.flag === flag)
                  if (items.length === 0) return null
                  const total = items.reduce((s, a) => s + a.amount, 0)
                  return (
                    <div key={flag} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', flagColors[flag] === 'badge-danger' ? 'bg-red-50 text-red-700' : flagColors[flag] === 'badge-warning' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                          {flag.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-500">{items.length} item{items.length > 1 ? 's' : ''}</span>
                      </div>
                      <span className="font-mono text-xs text-slate-700">{fmt(total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent log */}
            <div className="card p-5">
              <h3 className="section-title">Recent Activity</h3>
              <div className="space-y-2">
                {AUDIT_LOG.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', outcomeColors[log.outcome] === 'text-emerald-600' ? 'bg-emerald-500' : outcomeColors[log.outcome] === 'text-amber-500' ? 'bg-amber-500' : 'bg-red-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">{log.action}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{log.user} · {log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit Checks Tab */}
        {activeTab === 'checks' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none">
                <option value="all">All Categories</option>
                {['completeness', 'accuracy', 'validity', 'consistency', 'timeliness'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none">
                <option value="all">All Status</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="warning">Warning</option>
              </select>
              <span className="text-xs text-slate-400 ml-auto">{filteredChecks.length} checks</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredChecks.map(check => (
                <div key={check.id}>
                  <div
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-4"
                    onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
                  >
                    <div className="flex-shrink-0">
                      {check.status === 'pass' && <CheckCircle size={16} className="text-emerald-500" />}
                      {check.status === 'fail' && <XCircle size={16} className="text-red-500" />}
                      {check.status === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                    </div>
                    <span className="text-xs font-mono text-slate-400 flex-shrink-0 w-16">{check.id}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{check.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{check.description}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0', catColors[check.category])}>{check.category}</span>
                    <span className={cn('text-xs font-medium w-16 text-right flex-shrink-0', check.severity === 'critical' ? 'text-red-600' : check.severity === 'high' ? 'text-amber-600' : 'text-slate-500')}>{check.severity}</span>
                    {check.amount !== undefined && (
                      <span className={cn('font-mono text-xs w-24 text-right flex-shrink-0', check.amount === 0 ? 'text-emerald-600' : 'text-red-600')}>{check.amount === 0 ? 'Balanced' : fmt(check.amount)}</span>
                    )}
                    <ChevronDown size={14} className={cn('text-slate-400 flex-shrink-0 transition-transform', expandedCheck === check.id ? 'rotate-180' : '')} />
                  </div>
                  {expandedCheck === check.id && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="pt-3 grid grid-cols-3 gap-4">
                        <div><p className="text-xs text-slate-400">Items Checked</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{check.count.toLocaleString()}</p></div>
                        <div><p className="text-xs text-slate-400">Severity</p><p className={cn('text-sm font-semibold mt-0.5 capitalize', check.severity === 'critical' ? 'text-red-600' : check.severity === 'high' ? 'text-amber-600' : 'text-slate-800')}>{check.severity}</p></div>
                        {check.amount !== undefined && <div><p className="text-xs text-slate-400">Amount Flagged</p><p className={cn('text-sm font-semibold font-mono mt-0.5', check.amount === 0 ? 'text-emerald-600' : 'text-red-600')}>{check.amount === 0 ? '$0.00 (clear)' : fmt(check.amount)}</p></div>}
                      </div>
                      {check.status !== 'pass' && (
                        <div className="mt-3 flex gap-2">
                          <button className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Investigate</button>
                          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-white">Mark Reviewed</button>
                          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-white">Add Note</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anomalies Tab */}
        {activeTab === 'anomalies' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none">
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 ml-auto">
                <Download size={12} /> Export
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredAnomalies.map(a => (
                <div key={a.id} className="px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-start gap-4">
                    <AlertCircle size={16} className={cn('mt-0.5 flex-shrink-0', a.status === 'open' ? 'text-red-500' : a.status === 'reviewed' ? 'text-amber-500' : 'text-slate-400')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">{a.id}</span>
                        <span className="text-sm font-medium text-slate-800">{a.accountName}</span>
                        <span className="text-xs text-slate-400">({a.account})</span>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', flagColors[a.flag] === 'badge-danger' ? 'bg-red-50 text-red-700' : flagColors[a.flag] === 'badge-warning' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                          {a.flag.replace('_', ' ')}
                        </span>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ml-auto', statusColors[a.status] === 'badge-danger' ? 'bg-red-50 text-red-700' : statusColors[a.status] === 'badge-warning' ? 'bg-amber-50 text-amber-700' : statusColors[a.status] === 'badge-success' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-1">{a.description} · <span className="font-mono">{fmt(a.amount)}</span> · {a.date}</p>
                      <p className="text-xs text-slate-500 italic">{a.notes}</p>
                    </div>
                    {a.status === 'open' && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button className="px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Review</button>
                        <button className="px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">Resolve</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'log' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Audit Trail</h2>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                <Download size={12} /> Export Log
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {AUDIT_LOG.map(log => (
                <div key={log.id} className="px-4 py-3 hover:bg-slate-50 flex items-start gap-4">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', log.outcome === 'success' ? 'bg-emerald-500' : log.outcome === 'warning' ? 'bg-amber-400' : 'bg-red-500')} />
                  <div className="w-32 flex-shrink-0">
                    <p className="text-xs font-mono text-slate-400">{log.id}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{log.timestamp}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{log.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{log.module}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User size={11} />
                      {log.user}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
