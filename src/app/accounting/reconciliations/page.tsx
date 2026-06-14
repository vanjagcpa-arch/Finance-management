'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import {
  CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown,
  Download, Plus, Eye, ChevronRight, Scale, FileText, Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fmt = (n: number) => {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${s})` : s
}
const fmtSign = (n: number) => n === 0 ? '—' : (n > 0 ? '+' : '') + fmt(n)

// ---- Reconciliation data ----
const RECONCILIATIONS = [
  {
    id: 'REC-001', accountCode: '1100', accountName: 'Cash at Bank — ANZ Operating', category: 'current_assets',
    openingBalance: 2_890_000, closingBalance: 3_420_000, variance: 0, status: 'reconciled',
    lastUpdated: '31 May 2024', preparedBy: 'Sarah Chen', reviewedBy: 'CFO',
    supportingSchedule: 'Bank Rec — ANZ May 2024',
    movements: [
      { id: 'M001', date: '01-31 May', description: 'Cash receipts from customers', reference: 'GL batch', type: 'addition', debit: 9_420_000, credit: 0, runningBalance: 12_310_000 },
      { id: 'M002', date: '01-31 May', description: 'Supplier payments', reference: 'AP run', type: 'payment', debit: 0, credit: 7_840_000, runningBalance: 4_470_000 },
      { id: 'M003', date: '01-31 May', description: 'Payroll disbursements', reference: 'PR-MAY', type: 'payment', debit: 0, credit: 1_850_000, runningBalance: 2_620_000 },
      { id: 'M004', date: '31 May', description: 'Interest received', reference: 'ANZ stmt', type: 'addition', debit: 12_400, credit: 0, runningBalance: 2_632_400 },
      { id: 'M005', date: '31 May', description: 'Bank charges', reference: 'ANZ stmt', type: 'adjustment', debit: 0, credit: 1_240, runningBalance: 2_631_160 },
      { id: 'M006', date: '01-31 May', description: 'Other receipts / disbursements', reference: 'GL batch', type: 'adjustment', debit: 789_000, credit: 0, runningBalance: 3_420_160 },
    ],
  },
  {
    id: 'REC-002', accountCode: '1200', accountName: 'Trade Receivables', category: 'current_assets',
    openingBalance: 4_960_000, closingBalance: 5_180_000, variance: 0, status: 'reconciled',
    lastUpdated: '31 May 2024', preparedBy: 'Michael Park', reviewedBy: 'CFO',
    supportingSchedule: 'AR Aging May 2024',
    movements: [
      { id: 'M001', date: '01-31 May', description: 'Sales invoices raised (incl GST)', reference: 'AR batch', type: 'addition', debit: 9_174_000, credit: 0, runningBalance: 14_134_000 },
      { id: 'M002', date: '01-31 May', description: 'Cash receipts applied', reference: 'Cash alloc', type: 'payment', debit: 0, credit: 8_802_000, runningBalance: 5_332_000 },
      { id: 'M003', date: '31 May', description: 'Credit notes issued', reference: 'CN-142', type: 'adjustment', debit: 0, credit: 152_000, runningBalance: 5_180_000 },
    ],
  },
  {
    id: 'REC-003', accountCode: '1400', accountName: 'Prepayments', category: 'current_assets',
    openingBalance: 520_000, closingBalance: 640_000, variance: 0, status: 'reconciled',
    lastUpdated: '30 May 2024', preparedBy: 'Sarah Chen', reviewedBy: null,
    supportingSchedule: 'Prepayment Schedule May 2024',
    movements: [
      { id: 'M001', date: '01 May', description: 'Allianz insurance renewal — 12 months', reference: 'INV-3821', type: 'addition', debit: 180_000, credit: 0, runningBalance: 700_000 },
      { id: 'M002', date: '01 May', description: 'Microsoft 365 renewal — annual', reference: 'MS-2024', type: 'addition', debit: 42_000, credit: 0, runningBalance: 742_000 },
      { id: 'M003', date: '31 May', description: 'Monthly amortisation of prepayments', reference: 'JNL-2024-056', type: 'accrual', debit: 0, credit: 102_000, runningBalance: 640_000 },
    ],
  },
  {
    id: 'REC-004', accountCode: '2100', accountName: 'Property, Plant & Equipment (net)', category: 'non_current_assets',
    openingBalance: 6_840_000, closingBalance: 6_420_000, variance: 0, status: 'reconciled',
    lastUpdated: '31 May 2024', preparedBy: 'Sarah Chen', reviewedBy: 'CFO',
    supportingSchedule: 'Fixed Asset Register May 2024',
    movements: [
      { id: 'M001', date: '08 May', description: 'Vehicle purchase — Toyota HiLux', reference: 'PO-2024-318', type: 'addition', debit: 68_400, credit: 0, runningBalance: 6_908_400 },
      { id: 'M002', date: '31 May', description: 'Monthly depreciation charge', reference: 'JNL-2024-055', type: 'accrual', debit: 0, credit: 140_800, runningBalance: 6_767_600 },
      { id: 'M003', date: '15 May', description: 'Disposal — old server rack (NBV)', reference: 'DISP-042', type: 'disposal', debit: 0, credit: 347_600, runningBalance: 6_420_000 },
    ],
  },
  {
    id: 'REC-005', accountCode: '3100', accountName: 'Trade Payables', category: 'current_liabilities',
    openingBalance: 2_640_000, closingBalance: 2_840_000, variance: 0, status: 'reconciled',
    lastUpdated: '31 May 2024', preparedBy: 'Michael Park', reviewedBy: null,
    supportingSchedule: 'AP Aging May 2024',
    movements: [
      { id: 'M001', date: '01-31 May', description: 'Supplier invoices processed', reference: 'AP batch', type: 'addition', debit: 0, credit: 7_940_000, runningBalance: 10_580_000 },
      { id: 'M002', date: '01-31 May', description: 'Supplier payments made', reference: 'AP run', type: 'payment', debit: 7_740_000, credit: 0, runningBalance: 2_840_000 },
    ],
  },
  {
    id: 'REC-006', accountCode: '3200', accountName: 'Accrued Liabilities', category: 'current_liabilities',
    openingBalance: 1_120_000, closingBalance: 1_280_000, variance: 0, status: 'reconciled',
    lastUpdated: '31 May 2024', preparedBy: 'Sarah Chen', reviewedBy: 'CFO',
    supportingSchedule: 'Accruals Schedule May 2024',
    movements: [
      { id: 'M001', date: '01 May', description: 'Reversal of Apr accruals', reference: 'JNL-2024-048', type: 'reversal', debit: 1_120_000, credit: 0, runningBalance: 0 },
      { id: 'M002', date: '31 May', description: 'New accruals raised — May closing', reference: 'JNL-2024-058', type: 'accrual', debit: 0, credit: 1_280_000, runningBalance: 1_280_000 },
    ],
  },
  {
    id: 'REC-007', accountCode: '3300', accountName: 'GST Payable', category: 'current_liabilities',
    openingBalance: 380_000, closingBalance: 420_000, variance: 1_250, status: 'in_progress',
    lastUpdated: '31 May 2024', preparedBy: 'Sarah Chen', reviewedBy: null,
    supportingSchedule: 'GST Workpaper May 2024',
    movements: [
      { id: 'M001', date: '01-31 May', description: 'GST collected on sales', reference: 'GL batch', type: 'addition', debit: 0, credit: 834_000, runningBalance: 1_214_000 },
      { id: 'M002', date: '01-31 May', description: 'GST credits on purchases', reference: 'GL batch', type: 'payment', debit: 414_000, credit: 0, runningBalance: 800_000 },
      { id: 'M003', date: '15 May', description: 'BAS payment — Q3 FY2024', reference: 'ATO-43821', type: 'payment', debit: 381_250, credit: 0, runningBalance: 418_750 },
    ],
  },
  {
    id: 'REC-008', accountCode: '5200', accountName: 'Retained Earnings', category: 'equity',
    openingBalance: 8_460_000, closingBalance: 9_130_000, variance: 0, status: 'reconciled',
    lastUpdated: '31 May 2024', preparedBy: 'CFO', reviewedBy: 'CFO',
    supportingSchedule: null,
    movements: [
      { id: 'M001', date: '01-31 May', description: 'Net profit for the month', reference: 'P&L May 2024', type: 'addition', debit: 0, credit: 1_502_200, runningBalance: 9_962_200 },
      { id: 'M002', date: '31 May', description: 'Dividend paid', reference: 'DIV-2024-02', type: 'payment', debit: 832_200, credit: 0, runningBalance: 9_130_000 },
    ],
  },
]

const statusConfig: Record<string, { label: string; icon: any; color: string; dot: string }> = {
  reconciled: { label: 'Reconciled', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' },
  unreconciled: { label: 'Unreconciled', icon: XCircle, color: 'text-red-600 bg-red-50', dot: 'bg-red-500' },
  not_started: { label: 'Not Started', icon: AlertTriangle, color: 'text-slate-500 bg-slate-100', dot: 'bg-slate-400' },
}

const catLabel: Record<string, string> = {
  current_assets: 'Current Assets',
  non_current_assets: 'Non-Current Assets',
  current_liabilities: 'Current Liabilities',
  non_current_liabilities: 'Non-Current Liabilities',
  equity: 'Equity',
}

const movTypeColor: Record<string, string> = {
  addition: 'text-emerald-600',
  disposal: 'text-red-500',
  adjustment: 'text-amber-600',
  accrual: 'text-indigo-600',
  payment: 'text-red-500',
  reversal: 'text-purple-600',
}

export default function ReconciliationsPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const filtered = RECONCILIATIONS.filter(r =>
    (filterStatus === 'all' || r.status === filterStatus) &&
    (filterCategory === 'all' || r.category === filterCategory)
  )

  const totals = {
    reconciled: RECONCILIATIONS.filter(r => r.status === 'reconciled').length,
    inProgress: RECONCILIATIONS.filter(r => r.status === 'in_progress').length,
    unreconciled: RECONCILIATIONS.filter(r => r.status === 'unreconciled').length,
    totalVariance: RECONCILIATIONS.reduce((s, r) => s + Math.abs(r.variance), 0),
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Balance Sheet Reconciliations" subtitle="Period: May 2024 — Supporting schedules for all balance sheet accounts" />
      <div className="flex-1 overflow-auto p-6">
        {/* Summary row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Reconciled', value: `${totals.reconciled} / ${RECONCILIATIONS.length}`, sub: 'accounts cleared', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
            { label: 'In Progress', value: totals.inProgress, sub: 'accounts pending review', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
            { label: 'Unreconciled', value: totals.unreconciled, sub: 'accounts with differences', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
            { label: 'Total Variance', value: `$${totals.totalVariance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`, sub: 'across all accounts', color: totals.totalVariance === 0 ? 'text-emerald-600' : 'text-red-600', bg: totals.totalVariance === 0 ? 'bg-emerald-50' : 'bg-red-50', icon: Scale },
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-start gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', k.bg)}>
                <k.icon size={16} className={k.color} />
              </div>
              <div>
                <p className="kpi-label mb-1">{k.label}</p>
                <p className={cn('text-xl font-bold font-mono', k.color)}>{k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + actions */}
        <div className="flex items-center gap-3 mb-4">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Status</option>
            <option value="reconciled">Reconciled</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Categories</option>
            <option value="current_assets">Current Assets</option>
            <option value="non_current_assets">Non-Current Assets</option>
            <option value="current_liabilities">Current Liabilities</option>
            <option value="equity">Equity</option>
          </select>
          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              <Download size={12} /> Export Pack
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus size={12} /> Add Account
            </button>
          </div>
        </div>

        {/* Rec list */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px_100px_80px_120px_100px_36px] px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Account</span>
            <span className="text-right">Opening Bal</span>
            <span className="text-right">Closing Bal</span>
            <span className="text-right">Variance</span>
            <span className="text-center">Status</span>
            <span className="text-center">Prepared By</span>
            <span className="text-center">Reviewed</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.map(rec => {
              const cfg = statusConfig[rec.status]
              const isOpen = expanded === rec.id
              return (
                <div key={rec.id}>
                  <div
                    className="grid grid-cols-[1fr_120px_120px_100px_80px_120px_100px_36px] px-4 py-3 hover:bg-slate-50 cursor-pointer items-center"
                    onClick={() => setExpanded(isOpen ? null : rec.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                        <span className="text-xs font-mono text-slate-400">{rec.accountCode}</span>
                        <span className="text-sm font-medium text-slate-800">{rec.accountName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 pl-4">
                        <span className="text-xs text-slate-400">{catLabel[rec.category]}</span>
                        {rec.supportingSchedule && (
                          <span className="text-xs text-indigo-500 flex items-center gap-0.5">
                            <FileText size={10} /> {rec.supportingSchedule}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-600 text-right">{fmt(rec.openingBalance)}</span>
                    <span className="text-xs font-mono text-slate-800 font-medium text-right">{fmt(rec.closingBalance)}</span>
                    <span className={cn('text-xs font-mono font-semibold text-right', rec.variance === 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {rec.variance === 0 ? '—' : fmt(rec.variance)}
                    </span>
                    <div className="flex justify-center">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>{cfg.label}</span>
                    </div>
                    <span className="text-xs text-slate-500 text-center">{rec.preparedBy || '—'}</span>
                    <div className="flex justify-center">
                      {rec.reviewedBy
                        ? <CheckCircle size={13} className="text-emerald-500" />
                        : <Clock size={13} className="text-amber-500" />
                      }
                    </div>
                    <ChevronDown size={14} className={cn('text-slate-400 transition-transform mx-auto', isOpen ? 'rotate-180' : '')} />
                  </div>

                  {/* Expanded movement schedule */}
                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-200 px-4 pb-4">
                      <div className="pt-3 mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-700">Movement Schedule — {rec.accountName}</h4>
                        <div className="flex gap-2">
                          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50">
                            <Plus size={11} /> Add Movement
                          </button>
                          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50">
                            <Download size={11} /> Export
                          </button>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="table-header text-left px-3 py-2">Date</th>
                              <th className="table-header text-left px-3 py-2">Description</th>
                              <th className="table-header text-left px-3 py-2">Reference</th>
                              <th className="table-header text-center px-3 py-2">Type</th>
                              <th className="table-header text-right px-3 py-2">Dr</th>
                              <th className="table-header text-right px-3 py-2">Cr</th>
                              <th className="table-header text-right px-3 py-2">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-indigo-50 border-b border-slate-200">
                              <td colSpan={6} className="px-3 py-2 text-xs font-medium text-slate-600">Opening Balance</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{fmt(rec.openingBalance)}</td>
                            </tr>
                            {rec.movements.map(m => (
                              <tr key={m.id} className="data-row">
                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{m.date}</td>
                                <td className="px-3 py-2 text-slate-700">{m.description}</td>
                                <td className="px-3 py-2 font-mono text-slate-400">{m.reference}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={cn('capitalize text-xs font-medium', movTypeColor[m.type])}>{m.type}</span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">{m.debit ? fmt(m.debit) : '—'}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">{m.credit ? fmt(m.credit) : '—'}</td>
                                <td className="px-3 py-2 text-right font-mono font-medium text-slate-800">{fmt(m.runningBalance)}</td>
                              </tr>
                            ))}
                            <tr className={cn('border-t-2 font-semibold', rec.variance === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}>
                              <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-slate-700">Closing Balance</td>
                              <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-slate-600">
                                {rec.variance !== 0 && <span className="text-red-500">Variance: {fmt(rec.variance)}</span>}
                              </td>
                              <td className={cn('px-3 py-2 text-right font-mono font-bold', rec.variance === 0 ? 'text-emerald-700' : 'text-red-600')}>
                                {fmt(rec.closingBalance)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {rec.status !== 'reconciled' && (
                        <div className="mt-3 flex gap-2">
                          <button className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Mark Reconciled</button>
                          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50">Request Review</button>
                          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50">Add Note</button>
                        </div>
                      )}
                      {rec.status === 'reconciled' && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                          <CheckCircle size={13} />
                          <span>Reconciled by {rec.preparedBy} · Reviewed by {rec.reviewedBy} · {rec.lastUpdated}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
