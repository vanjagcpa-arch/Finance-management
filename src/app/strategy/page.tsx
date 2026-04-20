'use client'
import Header from '@/components/layout/Header'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { capitalItems, deptBudgets, financialRatios, monthlyData } from '@/lib/demoData'
import { fmt, fmtFull, variance } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">{typeof p.value === 'number' && p.value > 10000 ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.08) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function RatioCard({ ratio }: { ratio: typeof financialRatios[0] }) {
  const good = ratio.direction === 'higher' ? ratio.value >= ratio.benchmark : ratio.value <= ratio.benchmark
  const pct = ((ratio.value - ratio.benchmark) / ratio.benchmark) * 100

  const formatVal = (v: number) => {
    if (ratio.format === 'x') return `${v.toFixed(1)}x`
    if (ratio.format === '%') return `${v.toFixed(1)}%`
    if (ratio.format === 'days') return `${v} days`
    return v.toFixed(1)
  }

  const Icon = Math.abs(pct) < 1 ? Minus : good ? TrendingUp : TrendingDown

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-slate-500">{ratio.name}</p>
        <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full', good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
          {good ? '✓' : '!'} {good ? 'Good' : 'Watch'}
        </span>
      </div>
      <p className={cn('text-xl font-bold font-mono mb-1', good ? 'text-slate-900' : 'text-red-600')}>
        {formatVal(ratio.value)}
      </p>
      <div className={cn('flex items-center gap-1 text-xs', good ? 'text-emerald-600' : 'text-red-500')}>
        <Icon size={11} />
        <span>Benchmark: {formatVal(ratio.benchmark)}</span>
      </div>
      <p className="text-xs text-slate-400 mt-1.5">{ratio.description}</p>
    </div>
  )
}

const forecastData = [
  ...monthlyData.slice(-6).map(d => ({ month: d.month, Actual: d.revenue, Forecast: null })),
  { month: 'Apr 26', Actual: null, Forecast: 2620000 },
  { month: 'May 26', Actual: null, Forecast: 2750000 },
  { month: 'Jun 26', Actual: null, Forecast: 2900000 },
  { month: 'Jul 26', Actual: null, Forecast: 2800000 },
  { month: 'Aug 26', Actual: null, Forecast: 2950000 },
  { month: 'Sep 26', Actual: null, Forecast: 3100000 },
]

const totalCapital = capitalItems.reduce((s, c) => s + c.amount, 0)

export default function StrategyPage() {
  const deptData = deptBudgets.map(d => ({
    dept: d.dept.split(' ').slice(0, 2).join(' '),
    Budget: d.budget,
    Actual: d.actual,
    Forecast: d.forecast,
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Finance Strategy" subtitle="Capital allocation, ratios, budget vs actuals, forecast" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Top Row: Capital Allocation + Rolling Forecast */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Capital Allocation */}
          <div className="card p-5">
            <p className="section-title mb-1">Capital Allocation — FY 2026</p>
            <p className="text-xs text-slate-400 mb-4">Total deployed: {fmt(totalCapital)}</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={capitalItems} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={72} labelLine={false} label={renderCustomLabel}>
                    {capitalItems.map((item, i) => (
                      <Cell key={i} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {capitalItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-slate-600 truncate">{item.label}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="font-semibold text-slate-800">{fmt(item.amount)}</span>
                      <span className="text-slate-400 ml-1">({((item.amount / totalCapital) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rolling Revenue Forecast */}
          <div className="card p-5 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="section-title mb-0">Rolling Revenue Forecast</p>
                <p className="text-xs text-slate-400">Last 6 months actual + 6 month forward view</p>
              </div>
              <span className="badge-primary text-xs">+18% YoY growth target</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={forecastData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Actual" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
                <Line type="monotone" dataKey="Forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actuals by Department */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title mb-0">Budget vs Actuals by Department — YTD</p>
              <p className="text-xs text-slate-400">Comparing full-year budget, YTD actuals, and full-year forecast</p>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Budget" fill="#e2e8f0" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Actual" fill="#4f46e5" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Forecast" fill="#10b981" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header text-left py-2 pb-3">Department</th>
                    <th className="table-header text-right py-2 pb-3">Budget</th>
                    <th className="table-header text-right py-2 pb-3">Actual</th>
                    <th className="table-header text-right py-2 pb-3">Var</th>
                    <th className="table-header text-right py-2 pb-3">Forecast</th>
                  </tr>
                </thead>
                <tbody>
                  {deptBudgets.map((d, i) => {
                    const v = variance(d.actual, d.budget)
                    const over = v > 0
                    return (
                      <tr key={i} className="data-row">
                        <td className="py-2.5 text-slate-700 font-medium text-xs">{d.dept}</td>
                        <td className="py-2.5 text-right font-mono text-xs text-slate-500">{fmt(d.budget)}</td>
                        <td className="py-2.5 text-right font-mono text-xs font-semibold">{fmt(d.actual)}</td>
                        <td className={cn('py-2.5 text-right text-xs font-semibold', over ? 'text-red-500' : 'text-emerald-600')}>
                          {over ? '+' : ''}{v.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs text-slate-500">{fmt(d.forecast)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Financial Ratios */}
        <div className="card p-5">
          <p className="section-title mb-4">Key Financial Ratios</p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {financialRatios.map((r, i) => (
              <RatioCard key={i} ratio={r} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
