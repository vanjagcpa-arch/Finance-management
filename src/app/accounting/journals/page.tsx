'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import {
  CheckCircle, Clock, FileText, ChevronDown, Download,
  Plus, Edit2, RotateCcw, AlertCircle, Calendar, TrendingDown,
  BookMarked, Shield, ArrowRight, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtC = (n: number) => `$${fmt(n)}`

// ---- Accruals ----
const ACCRUALS = [
  { id: 'ACC-001', description: 'Audit fee accrual — Deloitte', supplier: 'Deloitte Touche Tohmatsu', accountCode: '6500', accountName: 'Audit & Accounting', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 45_000, status: 'active', journalRef: 'JNL-2024-058', category: 'expense' },
  { id: 'ACC-002', description: 'Electricity — May usage estimate', supplier: 'AGL Energy', accountCode: '6130', accountName: 'Utilities', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 8_400, status: 'active', journalRef: 'JNL-2024-058', category: 'expense' },
  { id: 'ACC-003', description: 'IT maintenance — SLA billing', supplier: 'Datacom Group', accountCode: '6150', accountName: 'IT & Software', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 12_500, status: 'active', journalRef: 'JNL-2024-058', category: 'expense' },
  { id: 'ACC-004', description: 'Legal — patent filing (Q2)', supplier: 'Clayton Utz', accountCode: '6510', accountName: 'Legal Fees', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 22_000, status: 'active', journalRef: 'JNL-2024-058', category: 'expense' },
  { id: 'ACC-005', description: 'Interest payable — CBA facility', supplier: 'Commonwealth Bank', accountCode: '7100', accountName: 'Interest Expense', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 28_000, status: 'active', journalRef: 'JNL-2024-058', category: 'interest' },
  { id: 'ACC-006', description: 'Income tax payable — May estimate', supplier: 'ATO', accountCode: '9000', accountName: 'Income Tax Expense', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 643_800, status: 'active', journalRef: 'JNL-2024-058', category: 'tax' },
  { id: 'ACC-007', description: 'Sales commission — May (est.)', supplier: 'Sales Team', accountCode: '6115', accountName: 'Sales Commissions', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 38_400, status: 'active', journalRef: 'JNL-2024-058', category: 'expense' },
  { id: 'ACC-008', description: 'Marketing campaign — invoice pending', supplier: 'Ogilvy Australia', accountCode: '6140', accountName: 'Marketing', accrualDate: '31 May 2024', reversalDate: '01 Jun 2024', amount: 24_000, status: 'active', journalRef: 'JNL-2024-058', category: 'expense' },
]

// ---- Prepayments ----
const PREPAYMENTS = [
  { id: 'PREP-001', description: 'Public liability & property insurance', supplier: 'Allianz Australia', accountCode: '1400', invoiceDate: '01 Jan 2024', invoiceRef: 'ALZ-2024-00182', totalAmount: 180_000, startDate: '01 Jan 2024', endDate: '31 Dec 2024', monthlyAmortisation: 15_000, amortisedToDate: 75_000, remaining: 105_000, status: 'active', category: 'insurance' },
  { id: 'PREP-002', description: 'Office rent — Level 7 fitout contribution', supplier: 'GPT Group', accountCode: '1400', invoiceDate: '01 Apr 2024', invoiceRef: 'GPT-2024-4182', totalAmount: 120_000, startDate: '01 Apr 2024', endDate: '31 Mar 2025', monthlyAmortisation: 10_000, amortisedToDate: 20_000, remaining: 100_000, status: 'active', category: 'rent' },
  { id: 'PREP-003', description: 'Microsoft 365 E3 — 450 licences', supplier: 'Microsoft Australia', accountCode: '1400', invoiceDate: '01 Mar 2024', invoiceRef: 'MS-365-2024', totalAmount: 126_000, startDate: '01 Mar 2024', endDate: '28 Feb 2025', monthlyAmortisation: 10_500, amortisedToDate: 31_500, remaining: 94_500, status: 'active', category: 'software' },
  { id: 'PREP-004', description: 'Salesforce CRM — Enterprise annual', supplier: 'Salesforce Australia', accountCode: '1400', invoiceDate: '01 Feb 2024', invoiceRef: 'SF-2024-ENT', totalAmount: 84_000, startDate: '01 Feb 2024', endDate: '31 Jan 2025', monthlyAmortisation: 7_000, amortisedToDate: 28_000, remaining: 56_000, status: 'active', category: 'software' },
  { id: 'PREP-005', description: 'HVAC service contract — building wide', supplier: 'Daikin Australia', accountCode: '1400', invoiceDate: '01 May 2024', invoiceRef: 'DAI-2024-087', totalAmount: 48_000, startDate: '01 May 2024', endDate: '30 Apr 2025', monthlyAmortisation: 4_000, amortisedToDate: 4_000, remaining: 44_000, status: 'active', category: 'maintenance' },
  { id: 'PREP-006', description: 'Training & conference registrations', supplier: 'Various', accountCode: '1400', invoiceDate: '15 Jan 2024', invoiceRef: 'TRAIN-2024', totalAmount: 36_000, startDate: '15 Jan 2024', endDate: '30 Jun 2024', monthlyAmortisation: 6_000, amortisedToDate: 24_000, remaining: 12_000, status: 'active', category: 'other' },
]

// ---- Fixed Assets / Depreciation ----
const FIXED_ASSETS = [
  { id: 'FA-001', assetCode: 'VEH-001', assetName: 'Toyota HiLux SR5 — Sales Fleet', category: 'vehicle', acquisitionDate: '08 May 2024', cost: 68_400, residualValue: 10_000, usefulLife: 5, depreciationMethod: 'straight_line', accumulatedDepreciation: 974, netBookValue: 67_426, monthlyDepreciation: 974, status: 'active' },
  { id: 'FA-002', assetCode: 'EQ-042', assetName: 'CNC Milling Machine — Line 3', category: 'plant', acquisitionDate: '15 Jan 2022', cost: 420_000, residualValue: 20_000, usefulLife: 10, depreciationMethod: 'straight_line', accumulatedDepreciation: 144_167, netBookValue: 275_833, monthlyDepreciation: 3_333, status: 'active' },
  { id: 'FA-003', assetCode: 'IT-018', assetName: 'Dell PowerEdge Server Cluster', category: 'computer', acquisitionDate: '01 Jul 2022', cost: 180_000, residualValue: 5_000, usefulLife: 4, depreciationMethod: 'straight_line', accumulatedDepreciation: 126_875, netBookValue: 53_125, monthlyDepreciation: 3_646, status: 'active' },
  { id: 'FA-004', assetCode: 'LH-003', assetName: 'Office Fitout — Level 7', category: 'leasehold', acquisitionDate: '01 Oct 2021', cost: 650_000, residualValue: 0, usefulLife: 10, depreciationMethod: 'straight_line', accumulatedDepreciation: 243_750, netBookValue: 406_250, monthlyDepreciation: 5_417, status: 'active' },
  { id: 'FA-005', assetCode: 'INT-001', assetName: 'SAP S/4HANA Implementation', category: 'intangible', acquisitionDate: '01 Jan 2023', cost: 1_200_000, residualValue: 0, usefulLife: 7, depreciationMethod: 'straight_line', accumulatedDepreciation: 214_286, netBookValue: 985_714, monthlyDepreciation: 14_286, status: 'active' },
  { id: 'FA-006', assetCode: 'EQ-038', assetName: 'Forklift — Warehouse', category: 'plant', acquisitionDate: '01 Mar 2020', cost: 85_000, residualValue: 5_000, usefulLife: 8, depreciationMethod: 'diminishing_value', accumulatedDepreciation: 72_400, netBookValue: 12_600, monthlyDepreciation: 1_313, status: 'active' },
  { id: 'FA-007', assetCode: 'FRN-012', assetName: 'Executive Furniture — Boardroom', category: 'furniture', acquisitionDate: '01 Apr 2022', cost: 48_000, residualValue: 0, usefulLife: 8, depreciationMethod: 'straight_line', accumulatedDepreciation: 19_000, netBookValue: 29_000, monthlyDepreciation: 500, status: 'active' },
  { id: 'FA-008', assetCode: 'IT-021', assetName: 'MacBook Pro — Engineering Team (x15)', category: 'computer', acquisitionDate: '01 Jan 2024', cost: 72_000, residualValue: 0, usefulLife: 3, depreciationMethod: 'straight_line', accumulatedDepreciation: 10_000, netBookValue: 62_000, monthlyDepreciation: 2_000, status: 'active' },
  { id: 'FA-009', assetCode: 'VEH-008', assetName: 'Mercedes Sprinter — Delivery Van', category: 'vehicle', acquisitionDate: '01 Jun 2019', cost: 62_000, residualValue: 5_000, usefulLife: 7, depreciationMethod: 'straight_line', accumulatedDepreciation: 57_000, netBookValue: 5_000, monthlyDepreciation: 679, status: 'fully_depreciated' },
  { id: 'FA-010', assetCode: 'EQ-055', assetName: 'Precision Laser Cutter — Line 5', category: 'equipment', acquisitionDate: '01 Aug 2023', cost: 290_000, residualValue: 15_000, usefulLife: 8, depreciationMethod: 'straight_line', accumulatedDepreciation: 29_479, netBookValue: 260_521, monthlyDepreciation: 2_917, status: 'active' },
]

// ---- Journal Entries ----
const JOURNALS: {
  id: string; type: string; period: string; reference: string; date: string;
  description: string; preparedBy: string; status: string;
  lines: { id: string; accountCode: string; accountName: string; description: string; debit: number; credit: number }[];
  approvedBy?: string; reversalDate?: string;
}[] = [
  {
    id: 'JNL-2024-058', type: 'accrual', period: 'May 2024', reference: 'JNL-2024-058',
    date: '31 May 2024', description: 'Monthly closing accruals — May 2024',
    preparedBy: 'Sarah Chen', status: 'posted', approvedBy: 'CFO', reversalDate: '01 Jun 2024',
    lines: [
      { id: 'L1', accountCode: '6500', accountName: 'Audit & Accounting', description: 'Audit fee accrual — Deloitte', debit: 45_000, credit: 0 },
      { id: 'L2', accountCode: '6130', accountName: 'Utilities', description: 'Electricity — May usage estimate', debit: 8_400, credit: 0 },
      { id: 'L3', accountCode: '6150', accountName: 'IT & Software', description: 'IT maintenance — SLA billing', debit: 12_500, credit: 0 },
      { id: 'L4', accountCode: '6510', accountName: 'Legal Fees', description: 'Legal — patent filing (Q2)', debit: 22_000, credit: 0 },
      { id: 'L5', accountCode: '7100', accountName: 'Interest Expense', description: 'Interest payable — CBA facility', debit: 28_000, credit: 0 },
      { id: 'L6', accountCode: '6115', accountName: 'Sales Commissions', description: 'Sales commission — May estimate', debit: 38_400, credit: 0 },
      { id: 'L7', accountCode: '6140', accountName: 'Marketing', description: 'Marketing campaign — Ogilvy', debit: 24_000, credit: 0 },
      { id: 'L8', accountCode: '3200', accountName: 'Accrued Liabilities', description: 'Accrual control account', debit: 0, credit: 178_300 },
    ],
  },
  {
    id: 'JNL-2024-057', type: 'accrual', period: 'May 2024', reference: 'JNL-2024-057',
    date: '31 May 2024', description: 'Income tax expense accrual — May 2024',
    preparedBy: 'CFO', status: 'posted', approvedBy: 'CFO', reversalDate: '01 Jun 2024',
    lines: [
      { id: 'L1', accountCode: '9000', accountName: 'Income Tax Expense', description: 'Current tax estimate — May 2024', debit: 643_800, credit: 0 },
      { id: 'L2', accountCode: '3350', accountName: 'Income Tax Payable', description: 'Tax payable — ATO', debit: 0, credit: 643_800 },
    ],
  },
  {
    id: 'JNL-2024-055', type: 'depreciation', period: 'May 2024', reference: 'JNL-2024-055',
    date: '31 May 2024', description: 'Monthly depreciation run — May 2024',
    preparedBy: 'System', status: 'posted', approvedBy: 'Sarah Chen',
    lines: [
      { id: 'L1', accountCode: '7200', accountName: 'Depreciation Expense', description: 'Plant & Equipment depreciation', debit: 78_400, credit: 0 },
      { id: 'L2', accountCode: '7201', accountName: 'Amortisation Expense', description: 'Intangible asset amortisation', debit: 14_286, credit: 0 },
      { id: 'L3', accountCode: '7202', accountName: 'ROU Amortisation', description: 'Right-of-use asset amortisation', debit: 6_114, credit: 0 },
      { id: 'L4', accountCode: '1601', accountName: 'Accum. Depn — Plant & Equipment', description: 'P&E accumulated depreciation', debit: 0, credit: 78_400 },
      { id: 'L5', accountCode: '1701', accountName: 'Accum. Amort — Intangibles', description: 'Intangible accumulated amortisation', debit: 0, credit: 14_286 },
      { id: 'L6', accountCode: '1801', accountName: 'Accum. Amort — ROU Assets', description: 'ROU accumulated amortisation', debit: 0, credit: 6_114 },
    ],
  },
  {
    id: 'JNL-2024-056', type: 'prepayment', period: 'May 2024', reference: 'JNL-2024-056',
    date: '31 May 2024', description: 'Prepayment amortisation — May 2024',
    preparedBy: 'Sarah Chen', status: 'posted', approvedBy: 'CFO',
    lines: [
      { id: 'L1', accountCode: '6120', accountName: 'Insurance Expense', description: 'Allianz insurance — monthly charge', debit: 15_000, credit: 0 },
      { id: 'L2', accountCode: '6130', accountName: 'Rent Expense', description: 'GPT fitout contribution — monthly', debit: 10_000, credit: 0 },
      { id: 'L3', accountCode: '6150', accountName: 'IT & Software', description: 'Microsoft 365 — monthly charge', debit: 10_500, credit: 0 },
      { id: 'L4', accountCode: '6150', accountName: 'IT & Software', description: 'Salesforce CRM — monthly charge', debit: 7_000, credit: 0 },
      { id: 'L5', accountCode: '6160', accountName: 'Maintenance', description: 'HVAC contract — monthly charge', debit: 4_000, credit: 0 },
      { id: 'L6', accountCode: '6170', accountName: 'Training & Development', description: 'Training registrations — monthly', debit: 6_000, credit: 0 },
      { id: 'L7', accountCode: '1400', accountName: 'Prepayments', description: 'Prepayment control account', debit: 0, credit: 52_500 },
    ],
  },
  {
    id: 'JNL-2024-054', type: 'reclass', period: 'May 2024', reference: 'JNL-2024-054',
    date: '28 May 2024', description: 'Reclassification — consulting fees to COGS',
    preparedBy: 'Michael Park', status: 'posted', approvedBy: 'CFO',
    lines: [
      { id: 'L1', accountCode: '5200', accountName: 'Direct Labour — Contract', description: 'Reclassify consulting per rev. guidance', debit: 18_000, credit: 0 },
      { id: 'L2', accountCode: '6300', accountName: 'Consulting Fees', description: 'Remove from OpEx', debit: 0, credit: 18_000 },
    ],
  },
  {
    id: 'JNL-2024-060', type: 'manual', period: 'Jun 2024', reference: 'JNL-2024-060',
    date: '01 Jun 2024', description: 'Reversal — May accruals (auto-reversal)',
    preparedBy: 'System', status: 'posted',
    lines: [
      { id: 'L1', accountCode: '3200', accountName: 'Accrued Liabilities', description: 'Reversal of May accruals', debit: 178_300, credit: 0 },
      { id: 'L2', accountCode: '6500', accountName: 'Audit & Accounting', description: 'Reversal — audit fee accrual', debit: 0, credit: 45_000 },
      { id: 'L3', accountCode: '6130', accountName: 'Utilities', description: 'Reversal — electricity accrual', debit: 0, credit: 8_400 },
      { id: 'L4', accountCode: '6150', accountName: 'IT & Software', description: 'Reversal — IT maintenance accrual', debit: 0, credit: 12_500 },
      { id: 'L5', accountCode: '6510', accountName: 'Legal Fees', description: 'Reversal — legal accrual', debit: 0, credit: 22_000 },
      { id: 'L6', accountCode: '7100', accountName: 'Interest Expense', description: 'Reversal — interest accrual', debit: 0, credit: 28_000 },
      { id: 'L7', accountCode: '6115', accountName: 'Sales Commissions', description: 'Reversal — commission accrual', debit: 0, credit: 38_400 },
      { id: 'L8', accountCode: '6140', accountName: 'Marketing', description: 'Reversal — marketing accrual', debit: 0, credit: 24_000 },
    ],
  },
]

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  accrual: { label: 'Accrual', color: 'bg-indigo-50 text-indigo-700', icon: Calendar },
  prepayment: { label: 'Prepayment', color: 'bg-emerald-50 text-emerald-700', icon: ArrowRight },
  depreciation: { label: 'Depreciation', color: 'bg-amber-50 text-amber-700', icon: TrendingDown },
  reclass: { label: 'Reclass', color: 'bg-purple-50 text-purple-700', icon: ArrowRight },
  manual: { label: 'Manual', color: 'bg-slate-100 text-slate-600', icon: FileText },
  reversal: { label: 'Reversal', color: 'bg-pink-50 text-pink-700', icon: RotateCcw },
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  posted: { label: 'Posted', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  draft: { label: 'Draft', color: 'text-amber-600 bg-amber-50', icon: Clock },
  pending_approval: { label: 'Pending', color: 'text-indigo-600 bg-indigo-50', icon: AlertCircle },
  reversed: { label: 'Reversed', color: 'text-slate-500 bg-slate-100', icon: RotateCcw },
}

const categoryColors: Record<string, string> = {
  insurance: 'bg-blue-50 text-blue-700',
  rent: 'bg-indigo-50 text-indigo-700',
  software: 'bg-purple-50 text-purple-700',
  maintenance: 'bg-amber-50 text-amber-700',
  other: 'bg-slate-100 text-slate-600',
  expense: 'bg-slate-100 text-slate-600',
  interest: 'bg-blue-50 text-blue-700',
  tax: 'bg-red-50 text-red-700',
}

const assetCategoryColors: Record<string, string> = {
  vehicle: 'bg-blue-50 text-blue-700',
  plant: 'bg-amber-50 text-amber-700',
  equipment: 'bg-orange-50 text-orange-700',
  computer: 'bg-indigo-50 text-indigo-700',
  furniture: 'bg-slate-100 text-slate-600',
  intangible: 'bg-purple-50 text-purple-700',
  leasehold: 'bg-emerald-50 text-emerald-700',
}

type Tab = 'accruals' | 'prepayments' | 'depreciation' | 'journals'

export default function JournalsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('accruals')
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null)

  const totalAccruals = ACCRUALS.filter(a => a.status === 'active').reduce((s, a) => s + a.amount, 0)
  const totalPrepayments = PREPAYMENTS.reduce((s, p) => s + p.remaining, 0)
  const totalMonthlyDepn = FIXED_ASSETS.filter(a => a.status === 'active').reduce((s, a) => s + a.monthlyDepreciation, 0)
  const totalNBV = FIXED_ASSETS.reduce((s, a) => s + a.netBookValue, 0)

  return (
    <div className="flex flex-col h-full">
      <Header title="Journal Schedules" subtitle="Accruals, prepayments, depreciation and manual journals — May 2024" />
      <div className="flex-1 overflow-auto p-6">
        {/* Summary row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Accruals (Active)', value: fmtC(totalAccruals), sub: `${ACCRUALS.filter(a => a.status === 'active').length} items`, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Calendar },
            { label: 'Prepayments (Remaining)', value: fmtC(totalPrepayments), sub: `${PREPAYMENTS.length} schedules active`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowRight },
            { label: 'Monthly Depreciation', value: fmtC(totalMonthlyDepn), sub: `${FIXED_ASSETS.filter(a => a.status === 'active').length} active assets`, color: 'text-amber-600', bg: 'bg-amber-50', icon: TrendingDown },
            { label: 'Total NBV (Assets)', value: fmtC(totalNBV), sub: `${FIXED_ASSETS.length} assets in register`, color: 'text-slate-700', bg: 'bg-slate-100', icon: BookMarked },
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-start gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', k.bg)}>
                <k.icon size={16} className={k.color} />
              </div>
              <div>
                <p className="kpi-label mb-1">{k.label}</p>
                <p className={cn('text-lg font-bold font-mono', k.color)}>{k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-1 w-fit">
          {([
            { id: 'accruals', label: `Accruals (${ACCRUALS.length})` },
            { id: 'prepayments', label: `Prepayments (${PREPAYMENTS.length})` },
            { id: 'depreciation', label: `Depreciation (${FIXED_ASSETS.length})` },
            { id: 'journals', label: `Journals (${JOURNALS.length})` },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn('px-4 py-1.5 rounded-md text-xs font-medium transition-all', activeTab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ---- ACCRUALS ---- */}
        {activeTab === 'accruals' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Accruals Schedule — May 2024</h2>
                <p className="text-xs text-slate-400 mt-0.5">All active accruals with auto-reversal on 01 Jun 2024</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  <Download size={12} /> Export
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Plus size={12} /> New Accrual
                </button>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header text-left px-4 py-2.5">Ref</th>
                  <th className="table-header text-left px-4 py-2.5">Description</th>
                  <th className="table-header text-left px-4 py-2.5">Supplier</th>
                  <th className="table-header text-left px-4 py-2.5">Account</th>
                  <th className="table-header text-center px-4 py-2.5">Category</th>
                  <th className="table-header text-right px-4 py-2.5">Amount</th>
                  <th className="table-header text-center px-4 py-2.5">Reversal Date</th>
                  <th className="table-header text-left px-4 py-2.5">Journal</th>
                  <th className="table-header text-center px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {ACCRUALS.map(a => (
                  <tr key={a.id} className="data-row">
                    <td className="px-4 py-2.5 font-mono text-slate-400">{a.id}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{a.description}</td>
                    <td className="px-4 py-2.5 text-slate-500">{a.supplier}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-slate-400">{a.accountCode}</span>
                      <span className="text-slate-500 ml-1">{a.accountName}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', categoryColors[a.category] || 'bg-slate-100 text-slate-600')}>{a.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">{fmtC(a.amount)}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{a.reversalDate}</td>
                    <td className="px-4 py-2.5 font-mono text-indigo-500 text-xs">{a.journalRef}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="badge-success">Active</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                  <td colSpan={5} className="px-4 py-2.5 text-sm text-slate-700">Total Accruals</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-900">{fmtC(totalAccruals)}</td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ---- PREPAYMENTS ---- */}
        {activeTab === 'prepayments' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Prepayment Amortisation Schedule — May 2024</h2>
                <p className="text-xs text-slate-400 mt-0.5">Monthly straight-line amortisation of prepaid expenses</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  <Download size={12} /> Export
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Plus size={12} /> New Prepayment
                </button>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header text-left px-4 py-2.5">Ref</th>
                  <th className="table-header text-left px-4 py-2.5">Description / Supplier</th>
                  <th className="table-header text-center px-4 py-2.5">Category</th>
                  <th className="table-header text-left px-4 py-2.5">Period</th>
                  <th className="table-header text-right px-4 py-2.5">Total</th>
                  <th className="table-header text-right px-4 py-2.5">Amortised</th>
                  <th className="table-header text-right px-4 py-2.5">Monthly Charge</th>
                  <th className="table-header text-right px-4 py-2.5">Remaining</th>
                  <th className="table-header text-center px-4 py-2.5">Progress</th>
                </tr>
              </thead>
              <tbody>
                {PREPAYMENTS.map(p => {
                  const progress = Math.round((p.amortisedToDate / p.totalAmount) * 100)
                  return (
                    <tr key={p.id} className="data-row">
                      <td className="px-4 py-3 font-mono text-slate-400">{p.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{p.description}</p>
                        <p className="text-slate-400 mt-0.5">{p.supplier} · {p.invoiceRef}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', categoryColors[p.category] || 'bg-slate-100 text-slate-600')}>{p.category}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <p>{p.startDate}</p>
                        <p className="text-slate-400">to {p.endDate}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtC(p.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">{fmtC(p.amortisedToDate)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600">{fmtC(p.monthlyAmortisation)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{fmtC(p.remaining)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                  <td colSpan={4} className="px-4 py-2.5 text-sm text-slate-700">Totals</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmtC(PREPAYMENTS.reduce((s, p) => s + p.totalAmount, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmtC(PREPAYMENTS.reduce((s, p) => s + p.amortisedToDate, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-indigo-700">{fmtC(PREPAYMENTS.reduce((s, p) => s + p.monthlyAmortisation, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-900">{fmtC(totalPrepayments)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ---- DEPRECIATION ---- */}
        {activeTab === 'depreciation' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Fixed Asset Register & Depreciation Schedule — May 2024</h2>
                <p className="text-xs text-slate-400 mt-0.5">All assets with net book value, accumulated depreciation and monthly charge</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  <Download size={12} /> Export Register
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Plus size={12} /> Add Asset
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="table-header text-left px-3 py-2.5">Asset Code</th>
                    <th className="table-header text-left px-3 py-2.5">Asset Name</th>
                    <th className="table-header text-center px-3 py-2.5">Category</th>
                    <th className="table-header text-center px-3 py-2.5">Method</th>
                    <th className="table-header text-right px-3 py-2.5">Cost</th>
                    <th className="table-header text-right px-3 py-2.5">Accum. Depn</th>
                    <th className="table-header text-right px-3 py-2.5">Net Book Value</th>
                    <th className="table-header text-right px-3 py-2.5">Monthly Depn</th>
                    <th className="table-header text-center px-3 py-2.5">Life (yrs)</th>
                    <th className="table-header text-center px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {FIXED_ASSETS.map(a => (
                    <tr key={a.id} className={cn('data-row', a.status === 'fully_depreciated' ? 'opacity-60' : '')}>
                      <td className="px-3 py-2.5 font-mono text-slate-400">{a.assetCode}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-700">{a.assetName}</p>
                        <p className="text-slate-400 mt-0.5">Acquired: {a.acquisitionDate}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', assetCategoryColors[a.category] || 'bg-slate-100 text-slate-600')}>{a.category}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500 capitalize">{a.depreciationMethod.replace('_', ' ')}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">{fmtC(a.cost)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-red-500">({fmt(a.accumulatedDepreciation)})</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">{fmtC(a.netBookValue)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600 font-semibold">
                        {a.status === 'fully_depreciated' ? '—' : fmtC(a.monthlyDepreciation)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{a.usefulLife}</td>
                      <td className="px-3 py-2.5 text-center">
                        {a.status === 'active' && <span className="badge-success">Active</span>}
                        {a.status === 'fully_depreciated' && <span className="badge-neutral">Fully Depn</span>}
                        {a.status === 'disposed' && <span className="badge-danger">Disposed</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <td colSpan={4} className="px-3 py-2.5 text-sm text-slate-700">Totals</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700">{fmtC(FIXED_ASSETS.reduce((s, a) => s + a.cost, 0))}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-600">({fmt(FIXED_ASSETS.reduce((s, a) => s + a.accumulatedDepreciation, 0))})</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-900">{fmtC(totalNBV)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-700">{fmtC(totalMonthlyDepn)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- JOURNALS ---- */}
        {activeTab === 'journals' && (
          <div className="space-y-3">
            <div className="flex justify-end gap-2 mb-1">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 bg-white">
                <Download size={12} /> Export All
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                <Plus size={12} /> New Journal
              </button>
            </div>
            {JOURNALS.map(j => {
              const isOpen = expandedJournal === j.id
              const totalDr = j.lines.reduce((s, l) => s + l.debit, 0)
              const totalCr = j.lines.reduce((s, l) => s + l.credit, 0)
              const balanced = Math.abs(totalDr - totalCr) < 0.01
              const typeCfg = typeConfig[j.type] || typeConfig.manual
              const statusCfg = statusConfig[j.status] || statusConfig.draft
              return (
                <div key={j.id} className="card overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-50 flex items-start gap-4"
                    onClick={() => setExpandedJournal(isOpen ? null : j.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-slate-400">{j.reference}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeCfg.color)}>{typeCfg.label}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusCfg.color)}>{statusCfg.label}</span>
                        {j.reversalDate && (
                          <span className="flex items-center gap-0.5 text-xs text-purple-600">
                            <RotateCcw size={10} /> Auto-reverses {j.reversalDate}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{j.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{j.date} · {j.period} · Prepared by {j.preparedBy}{j.approvedBy ? ` · Approved by ${j.approvedBy}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs flex-shrink-0">
                      <div className="text-right">
                        <p className="text-slate-400">Debit</p>
                        <p className="font-mono font-semibold text-slate-800">{fmtC(totalDr)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400">Credit</p>
                        <p className="font-mono font-semibold text-slate-800">{fmtC(totalCr)}</p>
                      </div>
                      <div className={cn('flex items-center gap-1 font-medium', balanced ? 'text-emerald-600' : 'text-red-500')}>
                        {balanced ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {balanced ? 'Balanced' : 'Unbalanced'}
                      </div>
                    </div>
                    <ChevronDown size={14} className={cn('text-slate-400 mt-0.5 flex-shrink-0 transition-transform', isOpen ? 'rotate-180' : '')} />
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-200 bg-slate-50">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="table-header text-left px-4 py-2">Account Code</th>
                            <th className="table-header text-left px-4 py-2">Account Name</th>
                            <th className="table-header text-left px-4 py-2">Description</th>
                            <th className="table-header text-right px-4 py-2">Debit</th>
                            <th className="table-header text-right px-4 py-2">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {j.lines.map(l => (
                            <tr key={l.id} className="border-b border-slate-200 last:border-0 bg-white hover:bg-slate-50">
                              <td className="px-4 py-2 font-mono text-slate-400">{l.accountCode}</td>
                              <td className="px-4 py-2 text-slate-700 font-medium">{l.accountName}</td>
                              <td className="px-4 py-2 text-slate-500">{l.description}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-800">{l.debit ? fmtC(l.debit) : '—'}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-800">{l.credit ? fmtC(l.credit) : '—'}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                            <td colSpan={3} className="px-4 py-2 text-slate-700">Total</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-900">{fmtC(totalDr)}</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-900">{fmtC(totalCr)}</td>
                          </tr>
                        </tbody>
                      </table>
                      {j.status === 'draft' && (
                        <div className="px-4 py-3 flex gap-2 border-t border-slate-200">
                          <button className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Post Journal</button>
                          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50">
                            <Edit2 size={11} className="inline mr-1" /> Edit
                          </button>
                          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50">Submit for Approval</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
