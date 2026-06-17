'use client'
import { useState, useMemo } from 'react'
import { Building2, TrendingUp, TrendingDown, Users, Zap, DollarSign, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useElectricity } from '@/lib/ElectricityContext'
import { formatAUD, monthName, shortMonthLabel } from '@/lib/electricityUtils'

const MONTHS = (() => {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 6 - i, 1)
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) }
  })
})()

const BUILDING_COLORS = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444']

export default function SummaryPage() {
  const { buildings, apartments, customers, invoices, readings, isLoaded } = useElectricity()
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [year,  setYear]  = useState(() => new Date().getFullYear())

  const aptMap      = useMemo(() => new Map(apartments.map(a => [a.id, a])), [apartments])
  const custMap     = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers])

  const monthInvoices = useMemo(
    () => invoices.filter(i => i.month === month && i.year === year),
    [invoices, month, year]
  )
  const monthReadings = useMemo(
    () => readings.filter(r => r.month === month && r.year === year),
    [readings, month, year]
  )

  // ── Per-building stats ────────────────────────────────────────────────────
  const buildingStats = useMemo(() => buildings.map((bld, idx) => {
    const bldApts       = apartments.filter(a => a.buildingId === bld.id)
    const activeCusts   = customers.filter(c => {
      const apt = aptMap.get(c.apartmentId)
      return apt?.buildingId === bld.id && !c.moveOutDate
    })
    const ddrCount = activeCusts.filter(c => c.paymentMethod === 'direct_debit').length

    const bldInvoices   = monthInvoices.filter(i => i.buildingId === bld.id)
    const billed        = bldInvoices.reduce((s, i) => s + i.total, 0)
    const collected     = bldInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
    const outstanding   = bldInvoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
    const overdueAmt    = bldInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)
    const overdueCount  = bldInvoices.filter(i => i.status === 'overdue').length
    const collectionRate = billed > 0 ? (collected / billed) * 100 : 0

    const bldReadings   = monthReadings.filter(r => aptMap.get(r.apartmentId)?.buildingId === bld.id)
    const totalUsage    = bldReadings.reduce((s, r) => s + r.usage, 0)
    const avgUsage      = bldReadings.length > 0 ? Math.round(totalUsage / bldReadings.length) : 0

    return {
      bld, idx,
      totalUnits: bldApts.length,
      activeCount: activeCusts.length,
      occupancyRate: bldApts.length > 0 ? (activeCusts.length / bldApts.length) * 100 : 0,
      ddrCount, ddrRate: activeCusts.length > 0 ? (ddrCount / activeCusts.length) * 100 : 0,
      billed, collected, outstanding, overdueAmt, overdueCount,
      collectionRate, avgUsage, totalUsage,
      invoiceCount: bldInvoices.length,
      color: BUILDING_COLORS[idx % BUILDING_COLORS.length],
    }
  }), [buildings, apartments, customers, monthInvoices, monthReadings, aptMap])

  // ── Portfolio totals ───────────────────────────────────────────────────────
  const portfolio = useMemo(() => ({
    totalUnits:     apartments.length,
    activeCount:    customers.filter(c => !c.moveOutDate).length,
    totalBilled:    buildingStats.reduce((s, b) => s + b.billed, 0),
    totalCollected: buildingStats.reduce((s, b) => s + b.collected, 0),
    totalOutstanding: buildingStats.reduce((s, b) => s + b.outstanding, 0),
    totalOverdue:   buildingStats.reduce((s, b) => s + b.overdueAmt, 0),
    overdueCount:   buildingStats.reduce((s, b) => s + b.overdueCount, 0),
    totalUsage:     buildingStats.reduce((s, b) => s + b.totalUsage, 0),
    ddrCount:       customers.filter(c => !c.moveOutDate && c.paymentMethod === 'direct_debit').length,
  }), [buildingStats, apartments, customers])

  const collectionRate = portfolio.totalBilled > 0
    ? (portfolio.totalCollected / portfolio.totalBilled) * 100 : 0
  const occupancyRate = portfolio.totalUnits > 0
    ? (portfolio.activeCount / portfolio.totalUnits) * 100 : 0
  const ddrRate = portfolio.activeCount > 0
    ? (portfolio.ddrCount / portfolio.activeCount) * 100 : 0

  // ── 6-month trend (all buildings combined) ─────────────────────────────────
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i), 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const inv = invoices.filter(x => x.month === m && x.year === y)
      return {
        label: shortMonthLabel(m, y),
        billed:    inv.reduce((s, x) => s + x.total, 0),
        collected: inv.filter(x => x.status === 'paid').reduce((s, x) => s + x.total, 0),
      }
    })
  }, [invoices, month, year])

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading…</div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={22} className="text-indigo-600" />Portfolio Summary
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{buildings.length} buildings · {portfolio.totalUnits} units</p>
        </div>
        <select value={`${year}-${month}`}
          onChange={e => { const [y, m] = e.target.value.split('-'); setYear(+y); setMonth(+m) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {MONTHS.map(o => <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>{o.label}</option>)}
        </select>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Billed',    value: formatAUD(portfolio.totalBilled),    sub: monthName(month, year), icon: DollarSign,    color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
          { label: 'Collected',       value: formatAUD(portfolio.totalCollected), sub: `${collectionRate.toFixed(0)}% collection rate`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Outstanding',     value: formatAUD(portfolio.totalOutstanding), sub: `${formatAUD(portfolio.totalOverdue)} overdue`, icon: AlertCircle, color: 'text-amber-600',  bg: 'bg-amber-50'   },
          { label: 'DDR Tenants',     value: `${portfolio.ddrCount} / ${portfolio.activeCount}`, sub: `${ddrRate.toFixed(0)}% on auto-pay`, icon: CreditCard, color: 'text-sky-600', bg: 'bg-sky-50' },
        ].map(k => (
          <div key={k.label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <k.icon size={18} className={k.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{k.label}</p>
              <p className={`text-xl font-bold ${k.color} leading-tight mt-0.5`}>{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy + Usage row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Occupancy</p>
          <div className="flex items-end gap-2 mb-2">
            <p className="text-3xl font-bold text-slate-900">{occupancyRate.toFixed(0)}<span className="text-lg text-slate-500">%</span></p>
            <p className="text-sm text-slate-500 mb-1">{portfolio.activeCount} / {portfolio.totalUnits} units</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${occupancyRate}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">{portfolio.totalUnits - portfolio.activeCount} vacant</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Collection Rate</p>
          <div className="flex items-end gap-2 mb-2">
            <p className="text-3xl font-bold text-slate-900">{collectionRate.toFixed(0)}<span className="text-lg text-slate-500">%</span></p>
            <p className={`text-sm mb-1 font-medium ${collectionRate >= 90 ? 'text-emerald-600' : collectionRate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
              {collectionRate >= 90 ? '↑ Good' : collectionRate >= 70 ? '↔ Fair' : '↓ Low'}
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${collectionRate >= 90 ? 'bg-emerald-500' : collectionRate >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
              style={{ width: `${Math.min(collectionRate, 100)}%` }} />
          </div>
          {portfolio.overdueCount > 0 && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle size={11} />{portfolio.overdueCount} overdue · {formatAUD(portfolio.totalOverdue)}
            </p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Total Usage</p>
          <div className="flex items-end gap-2 mb-2">
            <p className="text-3xl font-bold text-slate-900">{(portfolio.totalUsage / 1000).toFixed(1)}<span className="text-lg text-slate-500"> MWh</span></p>
          </div>
          <p className="text-sm text-slate-500">{portfolio.totalUsage.toLocaleString()} kWh</p>
          <p className="text-xs text-slate-400 mt-1">
            Avg {portfolio.activeCount > 0 ? Math.round(portfolio.totalUsage / portfolio.activeCount) : 0} kWh / tenant
          </p>
        </div>
      </div>

      {/* 6-month trend + building chart */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue trend */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">6-Month Revenue Trend</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barSize={18} margin={{ top: 4, right: 0, left: -15, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number, name: string) => [formatAUD(v), name === 'billed' ? 'Billed' : 'Collected']}
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="billed" name="Billed" fill="#a5b4fc" radius={[3,3,0,0]} />
                <Bar dataKey="collected" name="Collected" fill="#4f46e5" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Building comparison */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Billed by Building — {monthName(month, year)}</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buildingStats.map(b => ({ name: b.bld.name, billed: b.billed, collected: b.collected }))}
                barSize={18} margin={{ top: 4, right: 0, left: -15, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number, name: string) => [formatAUD(v), name === 'billed' ? 'Billed' : 'Collected']}
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                <Bar dataKey="billed" name="Billed" radius={[3,3,0,0]}>
                  {buildingStats.map((b) => <Cell key={b.bld.id} fill={b.color} opacity={0.4} />)}
                </Bar>
                <Bar dataKey="collected" name="Collected" radius={[3,3,0,0]}>
                  {buildingStats.map((b) => <Cell key={b.bld.id} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-building breakdown table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800">Building Breakdown — {monthName(month, year)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Building</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Units</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenants</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">DDR</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Billed</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collection %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg kWh</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {buildingStats.map(b => (
                <tr key={b.bld.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: b.color }} />
                      <div>
                        <p className="font-semibold text-slate-800">{b.bld.name}</p>
                        <p className="text-xs text-slate-400">{b.bld.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600">{b.totalUnits}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-slate-800 font-medium">{b.activeCount}</span>
                    <span className="text-slate-400 text-xs ml-1">({b.occupancyRate.toFixed(0)}%)</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-slate-800 font-medium">{b.ddrCount}</span>
                    <span className="text-slate-400 text-xs ml-1">({b.ddrRate.toFixed(0)}%)</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-800">{b.billed > 0 ? formatAUD(b.billed) : '—'}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-700">{b.collected > 0 ? formatAUD(b.collected) : '—'}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-amber-600">{b.outstanding > 0 ? formatAUD(b.outstanding) : '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    {b.billed > 0 ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${b.collectionRate >= 90 ? 'bg-emerald-500' : b.collectionRate >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(b.collectionRate, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${b.collectionRate >= 90 ? 'text-emerald-600' : b.collectionRate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                          {b.collectionRate.toFixed(0)}%
                        </span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600">{b.avgUsage > 0 ? `${b.avgUsage.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    {b.overdueCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <AlertCircle size={10} />{b.overdueCount}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-5 py-3 font-semibold text-slate-700">Portfolio Total</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{portfolio.totalUnits}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{portfolio.activeCount}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{portfolio.ddrCount}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{formatAUD(portfolio.totalBilled)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">{formatAUD(portfolio.totalCollected)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600">{formatAUD(portfolio.totalOutstanding)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  <span className={collectionRate >= 90 ? 'text-emerald-600' : collectionRate >= 70 ? 'text-amber-500' : 'text-red-500'}>
                    {collectionRate.toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">
                  {portfolio.activeCount > 0 ? Math.round(portfolio.totalUsage / portfolio.activeCount).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {portfolio.overdueCount > 0
                    ? <span className="text-red-600">{portfolio.overdueCount}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  )
}
