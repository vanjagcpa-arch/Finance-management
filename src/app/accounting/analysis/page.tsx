'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, ArrowRight, Download, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

const fmt = (n: number, short?: boolean) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (short && abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (short && abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${n < 0 ? '-' : ''}$${abs.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const varClass = (v: number, invert = false) => v === 0 ? 'text-slate-500' : (v > 0) !== invert ? 'text-emerald-600' : 'text-red-500'

// ---- P&L Data ----
const PL_LINES = [
  { code: '4000', name: 'Total Revenue', type: 'revenue', actual: 8_340_000, budget: 8_500_000, priorYear: 7_820_000, ytdActual: 39_840_000, ytdBudget: 42_500_000, isSubtotal: true, indent: 0 },
  { code: '4100', name: '  Sales Revenue', type: 'revenue', actual: 7_980_000, budget: 8_100_000, priorYear: 7_450_000, ytdActual: 38_100_000, ytdBudget: 40_500_000, indent: 1 },
  { code: '4200', name: '  Service Revenue', type: 'revenue', actual: 360_000, budget: 400_000, priorYear: 370_000, ytdActual: 1_740_000, ytdBudget: 2_000_000, indent: 1 },
  { code: '5000', name: 'Cost of Goods Sold', type: 'cogs', actual: 2_838_000, budget: 2_890_000, priorYear: 2_660_000, ytdActual: 13_545_600, ytdBudget: 14_450_000, indent: 0 },
  { code: '3000', name: 'Gross Profit', type: 'gross_profit', actual: 5_502_000, budget: 5_610_000, priorYear: 5_160_000, ytdActual: 26_294_400, ytdBudget: 28_050_000, isSubtotal: true, indent: 0 },
  { code: '', name: 'Gross Margin %', type: 'subtotal', actual: 66.0, budget: 66.0, priorYear: 66.0, ytdActual: 66.0, ytdBudget: 66.0, indent: 0, isPct: true },
  { code: '6100', name: 'Operating Expenses', type: 'opex', actual: 3_420_000, budget: 3_350_000, priorYear: 3_120_000, ytdActual: 16_900_000, ytdBudget: 16_750_000, isSubtotal: true, indent: 0 },
  { code: '6110', name: '  Salaries & Wages', type: 'opex', actual: 1_850_000, budget: 1_820_000, priorYear: 1_680_000, ytdActual: 9_150_000, ytdBudget: 9_100_000, indent: 1 },
  { code: '6120', name: '  Superannuation', type: 'opex', actual: 185_000, budget: 182_000, priorYear: 168_000, ytdActual: 915_000, ytdBudget: 910_000, indent: 1 },
  { code: '6130', name: '  Rent & Occupancy', type: 'opex', actual: 222_000, budget: 220_000, priorYear: 210_000, ytdActual: 1_095_000, ytdBudget: 1_100_000, indent: 1 },
  { code: '6140', name: '  Marketing', type: 'opex', actual: 185_000, budget: 150_000, priorYear: 145_000, ytdActual: 820_000, ytdBudget: 750_000, indent: 1 },
  { code: '6150', name: '  IT & Software', type: 'opex', actual: 98_000, budget: 95_000, priorYear: 88_000, ytdActual: 475_000, ytdBudget: 475_000, indent: 1 },
  { code: '6160', name: '  Consulting Fees', type: 'opex', actual: 245_000, budget: 200_000, priorYear: 185_000, ytdActual: 1_050_000, ytdBudget: 1_000_000, indent: 1 },
  { code: '6170', name: '  D&A', type: 'opex', actual: 148_000, budget: 148_000, priorYear: 135_000, ytdActual: 740_000, ytdBudget: 740_000, indent: 1 },
  { code: '6190', name: '  Other Expenses', type: 'opex', actual: 487_000, budget: 535_000, priorYear: 509_000, ytdActual: 2_655_000, ytdBudget: 2_675_000, indent: 1 },
  { code: '7000', name: 'EBITDA', type: 'ebitda', actual: 2_230_000, budget: 2_408_000, priorYear: 2_175_000, ytdActual: 10_134_400, ytdBudget: 12_040_000, isSubtotal: true, indent: 0 },
  { code: '', name: 'EBITDA Margin %', type: 'subtotal', actual: 26.7, budget: 28.3, priorYear: 27.8, ytdActual: 25.4, ytdBudget: 28.3, indent: 0, isPct: true },
  { code: '7100', name: 'Interest Expense', type: 'opex', actual: 84_000, budget: 82_000, priorYear: 90_000, ytdActual: 420_000, ytdBudget: 410_000, indent: 0 },
  { code: '8000', name: 'EBIT', type: 'ebit', actual: 2_146_000, budget: 2_326_000, priorYear: 2_085_000, ytdActual: 9_714_400, ytdBudget: 11_630_000, isSubtotal: true, indent: 0 },
  { code: '9000', name: 'Income Tax Expense', type: 'opex', actual: 643_800, budget: 697_800, priorYear: 625_500, ytdActual: 2_914_320, ytdBudget: 3_489_000, indent: 0 },
  { code: '9999', name: 'Net Profit', type: 'net_profit', actual: 1_502_200, budget: 1_628_200, priorYear: 1_459_500, ytdActual: 6_800_080, ytdBudget: 8_141_000, isSubtotal: true, indent: 0 },
  { code: '', name: 'Net Margin %', type: 'subtotal', actual: 18.0, budget: 19.2, priorYear: 18.7, ytdActual: 17.1, ytdBudget: 19.2, indent: 0, isPct: true },
]

// ---- Balance Sheet ----
const BS_LINES = [
  { code: '1000', name: 'CURRENT ASSETS', category: 'current_assets', actual: 12_840_000, prior: 11_920_000, isSubtotal: true, indent: 0 },
  { code: '1100', name: '  Cash & Cash Equivalents', category: 'current_assets', actual: 3_420_000, prior: 2_890_000, indent: 1 },
  { code: '1200', name: '  Trade Receivables', category: 'current_assets', actual: 5_180_000, prior: 4_960_000, indent: 1 },
  { code: '1300', name: '  Inventory', category: 'current_assets', actual: 2_840_000, prior: 2_720_000, indent: 1 },
  { code: '1400', name: '  Prepayments', category: 'current_assets', actual: 640_000, prior: 520_000, indent: 1 },
  { code: '1500', name: '  Other Current Assets', category: 'current_assets', actual: 760_000, prior: 830_000, indent: 1 },
  { code: '2000', name: 'NON-CURRENT ASSETS', category: 'non_current_assets', actual: 9_230_000, prior: 9_580_000, isSubtotal: true, indent: 0 },
  { code: '2100', name: '  Property, Plant & Equipment', category: 'non_current_assets', actual: 6_420_000, prior: 6_840_000, indent: 1 },
  { code: '2200', name: '  Intangible Assets', category: 'non_current_assets', actual: 1_850_000, prior: 1_920_000, indent: 1 },
  { code: '2300', name: '  Right-of-Use Assets', category: 'non_current_assets', actual: 960_000, prior: 820_000, indent: 1 },
  { code: '', name: 'TOTAL ASSETS', category: 'current_assets', actual: 22_070_000, prior: 21_500_000, isSubtotal: true, indent: 0 },
  { code: '3000', name: 'CURRENT LIABILITIES', category: 'current_liabilities', actual: 6_120_000, prior: 5_840_000, isSubtotal: true, indent: 0 },
  { code: '3100', name: '  Trade Payables', category: 'current_liabilities', actual: 2_840_000, prior: 2_640_000, indent: 1 },
  { code: '3200', name: '  Accrued Liabilities', category: 'current_liabilities', actual: 1_280_000, prior: 1_120_000, indent: 1 },
  { code: '3300', name: '  GST Payable', category: 'current_liabilities', actual: 420_000, prior: 380_000, indent: 1 },
  { code: '3400', name: '  Current Portion of Debt', category: 'current_liabilities', actual: 480_000, prior: 480_000, indent: 1 },
  { code: '3500', name: '  Other Current Liabilities', category: 'current_liabilities', actual: 1_100_000, prior: 1_220_000, indent: 1 },
  { code: '4000', name: 'NON-CURRENT LIABILITIES', category: 'non_current_liabilities', actual: 4_820_000, prior: 5_200_000, isSubtotal: true, indent: 0 },
  { code: '4100', name: '  Long-Term Debt', category: 'non_current_liabilities', actual: 3_840_000, prior: 4_200_000, indent: 1 },
  { code: '4200', name: '  Lease Liabilities', category: 'non_current_liabilities', actual: 980_000, prior: 1_000_000, indent: 1 },
  { code: '', name: 'TOTAL LIABILITIES', category: 'current_liabilities', actual: 10_940_000, prior: 11_040_000, isSubtotal: true, indent: 0 },
  { code: '5000', name: 'EQUITY', category: 'equity', actual: 11_130_000, prior: 10_460_000, isSubtotal: true, indent: 0 },
  { code: '5100', name: '  Share Capital', category: 'equity', actual: 2_000_000, prior: 2_000_000, indent: 1 },
  { code: '5200', name: '  Retained Earnings', category: 'equity', actual: 9_130_000, prior: 8_460_000, indent: 1 },
  { code: '', name: 'TOTAL LIABILITIES & EQUITY', category: 'equity', actual: 22_070_000, prior: 21_500_000, isSubtotal: true, indent: 0 },
]

// ---- KPIs ----
const KPIs = [
  { name: 'Gross Margin', value: 66.0, prior: 66.0, unit: '%', benchmark: 65, good: true, trend: 'flat' },
  { name: 'EBITDA Margin', value: 26.7, prior: 27.8, unit: '%', benchmark: 28, good: false, trend: 'down' },
  { name: 'Net Margin', value: 18.0, prior: 18.7, unit: '%', benchmark: 18, good: true, trend: 'down' },
  { name: 'Current Ratio', value: 2.10, prior: 2.04, unit: 'x', benchmark: 2.0, good: true, trend: 'up' },
  { name: 'Quick Ratio', value: 1.63, prior: 1.57, unit: 'x', benchmark: 1.5, good: true, trend: 'up' },
  { name: 'DSO', value: 19.2, prior: 21.4, unit: 'days', benchmark: 30, good: true, trend: 'up' },
  { name: 'DPO', value: 32.4, prior: 30.8, unit: 'days', benchmark: 35, good: true, trend: 'up' },
  { name: 'Debt / Equity', value: 0.43, prior: 0.50, unit: 'x', benchmark: 0.5, good: true, trend: 'up' },
  { name: 'ROCE', value: 19.3, prior: 19.9, unit: '%', benchmark: 18, good: true, trend: 'down' },
  { name: 'Interest Cover', value: 25.5, prior: 23.2, unit: 'x', benchmark: 5, good: true, trend: 'up' },
]

const TREND_DATA = [
  { month: 'Jun', revenue: 7_420, gp: 4_897, ebitda: 1_980, netProfit: 1_310 },
  { month: 'Jul', revenue: 7_680, gp: 5_069, ebitda: 2_020, netProfit: 1_340 },
  { month: 'Aug', revenue: 7_950, gp: 5_247, ebitda: 2_100, netProfit: 1_390 },
  { month: 'Sep', revenue: 8_100, gp: 5_346, ebitda: 2_180, netProfit: 1_440 },
  { month: 'Oct', revenue: 7_840, gp: 5_175, ebitda: 2_060, netProfit: 1_360 },
  { month: 'Nov', revenue: 8_020, gp: 5_293, ebitda: 2_130, netProfit: 1_408 },
  { month: 'Dec', revenue: 7_680, gp: 5_069, ebitda: 1_960, netProfit: 1_290 },
  { month: 'Jan', revenue: 7_920, gp: 5_227, ebitda: 2_080, netProfit: 1_370 },
  { month: 'Feb', revenue: 8_080, gp: 5_333, ebitda: 2_140, netProfit: 1_410 },
  { month: 'Mar', revenue: 8_220, gp: 5_425, ebitda: 2_200, netProfit: 1_450 },
  { month: 'Apr', revenue: 8_180, gp: 5_399, ebitda: 2_190, netProfit: 1_440 },
  { month: 'May', revenue: 8_340, gp: 5_502, ebitda: 2_230, netProfit: 1_502 },
]

const CHART_COLORS = { revenue: '#4f46e5', gp: '#10b981', ebitda: '#f59e0b', netProfit: '#06b6d4', budget: '#94a3b8' }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">{fmt(p.value * 1000, true)}</span>
        </div>
      ))}
    </div>
  )
}

type Tab = 'pl' | 'bs' | 'kpi' | 'trends'
type PLView = 'month' | 'ytd'

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pl')
  const [plView, setPLView] = useState<PLView>('month')

  return (
    <div className="flex flex-col h-full">
      <Header title="Financial Analysis" subtitle="Comprehensive P&L, Balance Sheet and KPI analysis — May 2024" />
      <div className="flex-1 overflow-auto p-6">
        {/* Tab bar */}
        <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-1 w-fit">
          {([
            { id: 'pl', label: 'Profit & Loss' },
            { id: 'bs', label: 'Balance Sheet' },
            { id: 'kpi', label: 'KPIs' },
            { id: 'trends', label: 'Trends' },
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

        {/* P&L Tab */}
        {activeTab === 'pl' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Profit & Loss Statement</h2>
                <p className="text-xs text-slate-400 mt-0.5">All amounts in AUD thousands</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {(['month', 'ytd'] as PLView[]).map(v => (
                    <button key={v} onClick={() => setPLView(v)} className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all', plView === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}>
                      {v === 'month' ? 'May 2024' : 'YTD'}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  <Download size={12} /> Export
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="table-header text-left px-4 py-2.5 w-64">Account</th>
                    <th className="table-header text-right px-4 py-2.5">Actual</th>
                    <th className="table-header text-right px-4 py-2.5">Budget</th>
                    <th className="table-header text-right px-4 py-2.5">Variance $</th>
                    <th className="table-header text-right px-4 py-2.5">Variance %</th>
                    <th className="table-header text-right px-4 py-2.5">Prior Year</th>
                    <th className="table-header text-right px-4 py-2.5">PY Var %</th>
                  </tr>
                </thead>
                <tbody>
                  {PL_LINES.map((line, i) => {
                    const actual = plView === 'month' ? line.actual : line.ytdActual
                    const budget = plView === 'month' ? line.budget : line.ytdBudget
                    const varAmt = actual - budget
                    const varPct = budget !== 0 ? (varAmt / Math.abs(budget)) * 100 : 0
                    const pyPct = line.priorYear !== 0 ? ((actual - line.priorYear) / Math.abs(line.priorYear)) * 100 : 0
                    const isExpense = ['cogs', 'opex'].includes(line.type)
                    const isGoodVar = isExpense ? varAmt <= 0 : varAmt >= 0
                    const isPct = (line as any).isPct
                    return (
                      <tr key={i} className={cn(
                        line.isSubtotal ? 'bg-slate-50 font-semibold border-t border-b border-slate-200' : 'data-row',
                        line.type === 'net_profit' ? 'bg-indigo-50 font-bold' : ''
                      )}>
                        <td className={cn('px-4 py-2.5 text-slate-700', line.isSubtotal ? 'font-semibold text-slate-800' : '')} style={{ paddingLeft: `${(line.indent || 0) * 12 + 16}px` }}>
                          {line.code && <span className="text-slate-400 font-mono mr-2">{line.code}</span>}
                          {line.name}
                        </td>
                        {isPct ? (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{actual.toFixed(1)}%</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-500">{budget.toFixed(1)}%</td>
                            <td className={cn('px-4 py-2.5 text-right font-mono', (actual - budget) >= 0 ? 'text-emerald-600' : 'text-red-500')}>{((actual - budget) >= 0 ? '+' : '')}{(actual - budget).toFixed(1)}pp</td>
                            <td className="px-4 py-2.5 text-right text-slate-300">—</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-500">{line.priorYear.toFixed(1)}%</td>
                            <td className="px-4 py-2.5 text-right text-slate-300">—</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-800">{fmt(actual, true)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmt(budget, true)}</td>
                            <td className={cn('px-4 py-2.5 text-right font-mono font-medium', isGoodVar ? 'text-emerald-600' : 'text-red-500')}>
                              {varAmt === 0 ? '—' : `${varAmt > 0 ? '+' : ''}${fmt(varAmt, true)}`}
                            </td>
                            <td className={cn('px-4 py-2.5 text-right font-mono', isGoodVar ? 'text-emerald-600' : 'text-red-500')}>
                              {varPct === 0 ? '—' : fmtPct(isExpense ? -varPct : varPct)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmt(line.priorYear, true)}</td>
                            <td className={cn('px-4 py-2.5 text-right font-mono', pyPct >= 0 !== isExpense ? 'text-emerald-600' : 'text-red-500')}>
                              {fmtPct(isExpense ? -pyPct : pyPct)}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Balance Sheet Tab */}
        {activeTab === 'bs' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Balance Sheet</h2>
                <p className="text-xs text-slate-400 mt-0.5">As at 31 May 2024 vs 30 April 2024</p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                <Download size={12} /> Export
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="table-header text-left px-4 py-2.5 w-72">Account</th>
                    <th className="table-header text-right px-4 py-2.5">May 2024</th>
                    <th className="table-header text-right px-4 py-2.5">Apr 2024</th>
                    <th className="table-header text-right px-4 py-2.5">Movement $</th>
                    <th className="table-header text-right px-4 py-2.5">Movement %</th>
                  </tr>
                </thead>
                <tbody>
                  {BS_LINES.map((line, i) => {
                    const mov = line.actual - line.prior
                    const movPct = line.prior !== 0 ? (mov / Math.abs(line.prior)) * 100 : 0
                    return (
                      <tr key={i} className={cn(
                        line.isSubtotal ? 'bg-slate-50 font-semibold border-t border-b border-slate-200' : 'data-row',
                        line.name.includes('TOTAL') ? 'bg-indigo-50 font-bold' : ''
                      )}>
                        <td className={cn('px-4 py-2.5 text-slate-700')} style={{ paddingLeft: `${(line.indent || 0) * 12 + 16}px` }}>
                          {line.code && <span className="text-slate-400 font-mono mr-2">{line.code}</span>}
                          {line.name}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-800">{fmt(line.actual, true)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmt(line.prior, true)}</td>
                        <td className={cn('px-4 py-2.5 text-right font-mono font-medium', mov === 0 ? 'text-slate-400' : mov > 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {mov === 0 ? '—' : `${mov > 0 ? '+' : ''}${fmt(mov, true)}`}
                        </td>
                        <td className={cn('px-4 py-2.5 text-right font-mono', mov === 0 ? 'text-slate-400' : mov > 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {mov === 0 ? '—' : fmtPct(movPct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KPIs Tab */}
        {activeTab === 'kpi' && (
          <div className="space-y-5">
            <div className="grid grid-cols-5 gap-4">
              {KPIs.map(kpi => {
                const change = kpi.prior !== 0 ? ((kpi.value - kpi.prior) / Math.abs(kpi.prior)) * 100 : 0
                const Icon = Math.abs(change) < 0.1 ? Minus : kpi.trend === 'up' ? TrendingUp : TrendingDown
                return (
                  <div key={kpi.name} className="card p-4">
                    <p className="kpi-label mb-2">{kpi.name}</p>
                    <p className="text-xl font-bold font-mono text-slate-900 mb-1">
                      {kpi.unit === '%' || kpi.unit === 'days' || kpi.unit === 'x' ? '' : ''}
                      {kpi.value.toFixed(kpi.unit === 'days' ? 1 : kpi.unit === 'x' ? 2 : 1)}{kpi.unit === '%' ? '%' : kpi.unit === 'days' ? 'd' : 'x'}
                    </p>
                    <div className={cn('flex items-center gap-1 text-xs font-medium', kpi.good ? 'text-emerald-600' : 'text-red-500')}>
                      <Icon size={12} />
                      <span>{Math.abs(change).toFixed(1)}% vs prior</span>
                    </div>
                    {kpi.benchmark && (
                      <p className="text-xs text-slate-400 mt-1">Benchmark: {kpi.benchmark}{kpi.unit === '%' ? '%' : kpi.unit === 'days' ? 'd' : 'x'}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* KPI bar chart */}
            <div className="card p-5">
              <h3 className="section-title">Margin Analysis — Actual vs Budget vs Prior Year (May 2024)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { name: 'Gross Margin', actual: 66.0, budget: 66.0, prior: 66.0 },
                  { name: 'EBITDA Margin', actual: 26.7, budget: 28.3, prior: 27.8 },
                  { name: 'EBIT Margin', actual: 25.7, budget: 27.4, prior: 26.7 },
                  { name: 'Net Margin', actual: 18.0, budget: 19.2, prior: 18.7 },
                ]} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="actual" name="Actual" fill={CHART_COLORS.revenue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="budget" name="Budget" fill={CHART_COLORS.budget} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="prior" name="Prior Year" fill={CHART_COLORS.gp} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="section-title">Revenue & Gross Profit Trend — 12 Months (AUD $000s)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={TREND_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gp" name="Gross Profit" stroke={CHART_COLORS.gp} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title">EBITDA & Net Profit Trend — 12 Months (AUD $000s)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={TREND_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ebitda" name="EBITDA" fill={CHART_COLORS.ebitda} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="netProfit" name="Net Profit" fill={CHART_COLORS.netProfit} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
