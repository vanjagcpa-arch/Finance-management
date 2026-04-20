'use client'
import { useState, useRef } from 'react'
import Header from '@/components/layout/Header'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Upload, FileText, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { plLineItems, monthlyData, REPORTING_PERIOD } from '@/lib/demoData'
import { fmt, fmtFull, variance } from '@/lib/utils'
import type { PLLineItem } from '@/lib/types'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function VarianceBadge({ actual, budget, invertGood = false }: { actual: number, budget: number, invertGood?: boolean }) {
  const v = variance(actual, budget)
  const good = invertGood ? v <= 0 : v >= 0
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${good ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
      {v >= 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  )
}

function PLRow({ item }: { item: PLLineItem }) {
  const isPercent = item.label.includes('%')
  const varDollar = item.actual - item.budget
  const varPct = variance(item.actual, item.budget)
  const good = item.invertSign ? varDollar <= 0 : varDollar >= 0
  const pyVar = variance(item.actual, item.priorYear)
  const pyGood = item.invertSign ? pyVar <= 0 : pyVar >= 0

  if (item.isHeader) {
    return (
      <tr>
        <td colSpan={7} className="pt-4 pb-1 px-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${item.isTotal ? 'bg-slate-50' : ''}`}>
      <td className={`py-2.5 px-4 text-sm ${item.isTotal ? 'font-bold text-slate-900' : item.isSubtotal ? 'font-semibold text-slate-800' : 'text-slate-700'}`}
        style={{ paddingLeft: `${(item.indent || 0) * 16 + 16}px` }}>
        {item.label}
      </td>
      <td className={`py-2.5 px-3 text-right font-mono text-sm ${item.isTotal || item.isSubtotal ? 'font-bold' : 'font-medium'}`}>
        {isPercent ? `${item.actual.toFixed(1)}%` : fmtFull(item.actual)}
      </td>
      <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-500">
        {isPercent ? `${item.budget.toFixed(1)}%` : fmtFull(item.budget)}
      </td>
      <td className={`py-2.5 px-3 text-right font-mono text-sm font-medium ${good ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPercent ? `${(item.actual - item.budget) > 0 ? '+' : ''}${(item.actual - item.budget).toFixed(1)}pp` : (good ? '+' : '') + fmtFull(varDollar)}
      </td>
      <td className={`py-2.5 px-3 text-right text-sm ${good ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPercent ? '—' : `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%`}
      </td>
      <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-500">
        {isPercent ? `${item.priorYear.toFixed(1)}%` : fmtFull(item.priorYear)}
      </td>
      <td className={`py-2.5 px-3 text-right text-sm ${pyGood ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPercent ? '—' : `${pyVar >= 0 ? '+' : ''}${pyVar.toFixed(1)}%`}
      </td>
    </tr>
  )
}

const marginData = monthlyData.map(d => ({
  month: d.month,
  'Gross Margin': d.grossMargin,
  'EBITDA Margin': d.ebitdaMargin,
}))

const revenueData = monthlyData.map(d => ({
  month: d.month,
  Actual: d.revenue,
  Budget: d.budgetRevenue,
}))

export default function ReportsPage() {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await new Promise(r => setTimeout(r, 1200))
    setUploaded(file.name)
    setUploading(false)
  }

  const handlePrint = () => window.print()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Management Reports" subtitle="P&L with variance analysis — upload data or use demo" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Upload Bar */}
        <div className="card p-4 flex items-center gap-4">
          <div className="flex-1 flex items-center gap-3">
            <FileText size={18} className="text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">
                {uploaded ? `Loaded: ${uploaded}` : 'Demo data loaded — March 2026'}
              </p>
              <p className="text-xs text-slate-500">Upload a CSV or Excel file to replace with your data</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Processing…' : 'Upload File'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Download size={14} /> Export
          </button>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="section-title">Revenue — Actual vs Budget (12 months)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Actual" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Budget" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <p className="section-title">Margin Trends (%)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={marginData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 80]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Gross Margin" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="EBITDA Margin" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L Table */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Income Statement — {REPORTING_PERIOD}</p>
              <p className="text-xs text-slate-500 mt-0.5">Actuals vs Budget vs Prior Year</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Actual
              <span className="w-2 h-2 rounded-full bg-slate-300 ml-2" /> Budget
              <span className="w-2 h-2 rounded-full bg-slate-200 ml-2" /> Prior Year
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="table-header text-left py-3 px-4 w-1/3">Line Item</th>
                  <th className="table-header text-right py-3 px-3">Actual</th>
                  <th className="table-header text-right py-3 px-3">Budget</th>
                  <th className="table-header text-right py-3 px-3">Var $</th>
                  <th className="table-header text-right py-3 px-3">Var %</th>
                  <th className="table-header text-right py-3 px-3">Prior Year</th>
                  <th className="table-header text-right py-3 px-3">YoY %</th>
                </tr>
              </thead>
              <tbody>
                {plLineItems.map(item => (
                  <PLRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commentary */}
        <div className="card p-5">
          <p className="section-title mb-3">Executive Commentary</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <p className="font-semibold text-amber-900 mb-2">Revenue — Below Budget</p>
              <p className="text-amber-800 text-xs leading-relaxed">Revenue of $2.45M was $150K (5.8%) below the March budget of $2.6M. Pipeline shortfall in enterprise segment was primary driver. SMB segment performed in line with plan.</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="font-semibold text-emerald-900 mb-2">Margins — On Target</p>
              <p className="text-emerald-800 text-xs leading-relaxed">Gross margin held at 65.0%, exactly on budget. EBITDA margin of 30.0% reflects disciplined OpEx management. Cost savings in G&A offset marketing overspend.</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="font-semibold text-blue-900 mb-2">Outlook — Q2 2026</p>
              <p className="text-blue-800 text-xs leading-relaxed">Q2 pipeline is 18% ahead of Q1 at this stage. Revenue guidance of $7.8M–$8.2M maintained. EBITDA expected to improve to 31–32% as revenue scale benefits flow through.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
