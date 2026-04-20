'use client'
import Header from '@/components/layout/Header'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { monthlyData, currentMonth, priorMonth, plLineItems } from '@/lib/demoData'
import { fmt, fmtFull, variance, varianceClass } from '@/lib/utils'
import Link from 'next/link'

function pctChange(a: number, b: number) {
  if (b === 0) return 0
  return ((a - b) / Math.abs(b)) * 100
}

interface KPICardProps {
  label: string
  value: string
  change: number
  invertGood?: boolean
  sub?: string
}

function KPICard({ label, value, change, invertGood, sub }: KPICardProps) {
  const good = invertGood ? change <= 0 : change >= 0
  const Icon = Math.abs(change) < 0.1 ? Minus : good ? TrendingUp : TrendingDown
  return (
    <div className="card p-5">
      <p className="kpi-label mb-3">{label}</p>
      <p className="kpi-value mb-2">{value}</p>
      <div className={`flex items-center gap-1 text-xs font-medium ${good ? 'text-emerald-600' : 'text-red-500'}`}>
        <Icon size={13} />
        <span>{Math.abs(change).toFixed(1)}% vs prior month</span>
      </div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

const CHART_COLORS = { actual: '#4f46e5', budget: '#94a3b8', prior: '#10b981' }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
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

const alerts = [
  { type: 'warning', msg: 'Revenue $150K below budget in Mar — investigate pipeline miss', link: '/reports' },
  { type: 'warning', msg: 'AP reconciliation has $1.2K unreconciled balance', link: '/eom-close' },
  { type: 'info', msg: '6 EOM close tasks not yet started — close due in 5 days', link: '/eom-close' },
  { type: 'success', msg: 'Gross margin holding at 65.0% — on budget', link: '/reports' },
  { type: 'info', msg: 'Q1 board report due in 12 days', link: '/reports' },
]

export default function DashboardPage() {
  const revChange = pctChange(currentMonth.revenue, priorMonth.revenue)
  const gpChange = pctChange(currentMonth.grossProfit, priorMonth.grossProfit)
  const ebitdaChange = pctChange(currentMonth.ebitda, priorMonth.ebitda)
  const cashChange = pctChange(currentMonth.cashPosition, priorMonth.cashPosition)
  const arChange = pctChange(currentMonth.ar, priorMonth.ar)
  const apChange = pctChange(currentMonth.ap, priorMonth.ap)

  const revVar = variance(currentMonth.revenue, currentMonth.budgetRevenue)
  const ebitdaVar = variance(currentMonth.ebitda, currentMonth.budgetRevenue * 0.30)

  const chartData = monthlyData.map(d => ({
    month: d.month,
    Actual: d.revenue,
    Budget: d.budgetRevenue,
    'Prior Year': d.priorRevenue,
  }))

  const ebitdaData = monthlyData.map(d => ({
    month: d.month,
    EBITDA: d.ebitda,
    'EBITDA %': d.ebitdaMargin,
  }))

  const summaryRows = plLineItems.filter(r =>
    ['rev', 'gp', 'ebitda', 'ni'].includes(r.id)
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="TEST CHANGE" subtitle="CFO Cockpit — real-time business overview" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard label="Revenue MTD" value={fmt(currentMonth.revenue)} change={revChange} sub={`Budget: ${fmt(currentMonth.budgetRevenue)}`} />
          <KPICard label="Gross Profit" value={fmt(currentMonth.grossProfit)} change={gpChange} sub={`${currentMonth.grossMargin.toFixed(1)}% margin`} />
          <KPICard label="EBITDA" value={fmt(currentMonth.ebitda)} change={ebitdaChange} sub={`${currentMonth.ebitdaMargin.toFixed(1)}% margin`} />
          <KPICard label="Cash Position" value={fmt(currentMonth.cashPosition)} change={cashChange} sub="Operating account" />
          <KPICard label="AR Outstanding" value={fmt(currentMonth.ar)} change={arChange} invertGood sub="15 days DSO" />
          <KPICard label="AP Outstanding" value={fmt(currentMonth.ap)} change={apChange} sub="28 days DPO" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Revenue Chart */}
          <div className="card p-5 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="section-title mb-0">Revenue — Actual vs Budget vs Prior Year</p>
              <div className={`text-xs font-semibold px-2 py-1 rounded-full ${revVar >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {revVar >= 0 ? '+' : ''}{revVar.toFixed(1)}% vs budget
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Actual" stroke={CHART_COLORS.actual} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Budget" stroke={CHART_COLORS.budget} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                <Line type="monotone" dataKey="Prior Year" stroke={CHART_COLORS.prior} strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* EBITDA Chart */}
          <div className="card p-5">
            <p className="section-title mb-4">EBITDA Trend ($)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ebitdaData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="EBITDA" fill="#4f46e5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row: P&L Summary + Alerts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* P&L Summary */}
          <div className="card p-5 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="section-title mb-0">P&L Summary — March 2026</p>
              <Link href="/reports" className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                Full report <ArrowRight size={12} />
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-header text-left py-2 w-1/3">Metric</th>
                  <th className="table-header text-right py-2">Actual</th>
                  <th className="table-header text-right py-2">Budget</th>
                  <th className="table-header text-right py-2">Var $</th>
                  <th className="table-header text-right py-2">Var %</th>
                  <th className="table-header text-right py-2">PY</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(row => {
                  const varDollar = row.actual - row.budget
                  const varPct = variance(row.actual, row.budget)
                  const isMargin = row.id.endsWith('m')
                  const isCost = row.invertSign
                  const goodVar = isCost ? varDollar <= 0 : varDollar >= 0
                  return (
                    <tr key={row.id} className="data-row">
                      <td className="py-3 font-semibold text-slate-800">{row.label}</td>
                      <td className="py-3 text-right font-mono font-semibold">
                        {isMargin ? `${row.actual.toFixed(1)}%` : fmt(row.actual)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500">
                        {isMargin ? `${row.budget.toFixed(1)}%` : fmt(row.budget)}
                      </td>
                      <td className={`py-3 text-right font-mono font-medium ${goodVar ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isMargin ? `${(row.actual - row.budget).toFixed(1)}pp` : fmt(Math.abs(varDollar))}
                      </td>
                      <td className={`py-3 text-right font-mono font-medium ${goodVar ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isMargin ? '—' : `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%`}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-400">
                        {isMargin ? `${row.priorYear.toFixed(1)}%` : fmt(row.priorYear)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Alerts & Actions */}
          <div className="card p-5">
            <p className="section-title mb-4">Alerts & Actions</p>
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <Link key={i} href={a.link} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                  {a.type === 'warning' && <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                  {a.type === 'success' && <CheckCircle size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />}
                  {a.type === 'info' && <Clock size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                  <p className="text-xs text-slate-600 leading-relaxed group-hover:text-slate-900">{a.msg}</p>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Link href="/eom-close" className="text-xs font-medium text-center py-2 px-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                EOM Close
              </Link>
              <Link href="/reports" className="text-xs font-medium text-center py-2 px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                Run Report
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
