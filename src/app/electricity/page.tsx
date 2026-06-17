'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Building2, Users, Zap, FileText, Download, CheckCircle2, Clock,
  Search, AlertCircle, ChevronLeft, ChevronRight, Upload, Settings,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { formatAUD, monthName } from '@/lib/electricityUtils'

const PAGE_SIZE = 25

const MONTHS = (() => {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 6 - i, 1)
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) }
  })
})()

type UnitFilter = 'all' | 'occupied' | 'vacant' | 'no_reading' | 'overdue' | 'final'

function pagRange(cur: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4)         return [1, 2, 3, 4, 5, '…', total]
  if (cur >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', cur - 1, cur, cur + 1, '…', total]
}

export default function ElectricityDashboard() {
  const { customers, invoices, readings, buildings, apartments, isLoaded } = useElectricity()

  const [month,          setMonth]          = useState(() => new Date().getMonth() + 1)
  const [year,           setYear]           = useState(() => new Date().getFullYear())
  const [search,         setSearch]         = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterStatus,   setFilterStatus]   = useState<UnitFilter>('all')
  const [page,           setPage]           = useState(1)

  // ── derived data ──────────────────────────────────────────────────────────
  const monthInvoices  = useMemo(() => invoices.filter(i => i.month === month && i.year === year), [invoices, month, year])
  const monthReadings  = useMemo(() => readings.filter(r => r.month === month && r.year === year), [readings, month, year])
  const activeCustomers = useMemo(() => customers.filter(c => !c.moveOutDate), [customers])

  const customerByApt = useMemo(() => new Map(customers.map(c => [c.apartmentId, c])), [customers])
  const readingByApt  = useMemo(() => new Map(monthReadings.map(r => [r.apartmentId, r])), [monthReadings])
  const invoiceByApt  = useMemo(() => new Map(monthInvoices.map(i => [i.apartmentId, i])), [monthInvoices])
  const buildingMap   = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalBilled      = monthInvoices.reduce((s, i) => s + i.total, 0)
  const totalPaid        = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalOutstanding = monthInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const overdueCount     = monthInvoices.filter(i => i.status === 'overdue').length
  const collectionRate   = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0
  const occupancy        = apartments.length > 0 ? (activeCustomers.length / apartments.length) * 100 : 0
  const vacantCount      = apartments.length - activeCustomers.length
  const finalBillCount   = customers.filter(c => c.moveOutDate).length

  const occupiedWithReading = useMemo(() =>
    monthReadings.filter(r => {
      const c = customerByApt.get(r.apartmentId)
      return c && !c.moveOutDate
    }).length,
    [monthReadings, customerByApt]
  )
  const missingReadings = activeCustomers.length - occupiedWithReading

  // ── All rows joined ───────────────────────────────────────────────────────
  const allRows = useMemo(() => apartments.map(apt => {
    const bld     = buildingMap.get(apt.buildingId)
    const cust    = customerByApt.get(apt.id)
    const reading = readingByApt.get(apt.id)
    const invoice = invoiceByApt.get(apt.id)
    const isOccupied = !!cust && !cust.moveOutDate
    const isVacant   = !cust
    const isFinal    = !!cust?.moveOutDate
    return { apt, bld, cust, reading, invoice, isOccupied, isVacant, isFinal }
  }), [apartments, buildingMap, customerByApt, readingByApt, invoiceByApt])

  const filtered = useMemo(() => allRows.filter(row => {
    if (filterBuilding && row.apt.buildingId !== filterBuilding) return false
    if (filterStatus === 'occupied'   && !row.isOccupied)                             return false
    if (filterStatus === 'vacant'     && !row.isVacant)                               return false
    if (filterStatus === 'no_reading' && (!row.isOccupied || !!row.reading))          return false
    if (filterStatus === 'overdue'    && row.invoice?.status !== 'overdue')           return false
    if (filterStatus === 'final'      && !row.isFinal)                                return false
    if (search) {
      const q    = search.toLowerCase()
      const name = row.cust ? `${row.cust.firstName} ${row.cust.lastName}`.toLowerCase() : ''
      const unit = row.apt.unitNumber.toLowerCase()
      const mtr  = row.apt.meterNumber.toLowerCase()
      const bld  = row.bld?.name.toLowerCase() ?? ''
      if (!name.includes(q) && !unit.includes(q) && !mtr.includes(q) && !bld.includes(q)) return false
    }
    return true
  }), [allRows, filterBuilding, filterStatus, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function applyFilter(v: UnitFilter) { setFilterStatus(v); setPage(1) }
  function applyBuilding(v: string)   { setFilterBuilding(v); setPage(1) }
  function applySearch(v: string)     { setSearch(v); setPage(1) }
  function changeMonth(v: string)     { const [y, m] = v.split('-'); setYear(+y); setMonth(+m); setPage(1) }

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts: { type: 'danger' | 'warning'; msg: string; href: string }[] = []
  if (overdueCount > 0)     alerts.push({ type: 'danger',  msg: `${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''} — action required`,                          href: '/electricity/invoices' })
  if (missingReadings > 0)  alerts.push({ type: 'warning', msg: `${missingReadings} occupied unit${missingReadings > 1 ? 's are' : ' is'} missing a reading for ${monthName(month, year)}`, href: '/electricity/usage' })

  const statusBreakdown = (['paid', 'sent', 'draft', 'overdue'] as const).map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    count: monthInvoices.filter(i => i.status === key).length,
    bar:   key === 'paid' ? 'bg-emerald-500' : key === 'sent' ? 'bg-indigo-500' : key === 'overdue' ? 'bg-red-500' : 'bg-slate-300',
  }))

  const FILTER_TABS: { key: UnitFilter; label: string; count: number }[] = [
    { key: 'all',        label: 'All Units',    count: apartments.length },
    { key: 'occupied',   label: 'Occupied',     count: activeCustomers.length },
    { key: 'vacant',     label: 'Vacant',       count: vacantCount },
    { key: 'no_reading', label: 'No Reading',   count: missingReadings },
    { key: 'overdue',    label: 'Overdue',      count: overdueCount },
    { key: 'final',      label: 'Final Bills',  count: finalBillCount },
  ]

  if (!isLoaded) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading electricity billing…</div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap size={24} className="text-indigo-600" />Electricity Billing
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {buildings.length} buildings · {apartments.length} units · {activeCustomers.length} occupied · {vacantCount} vacant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={`${year}-${month}`} onChange={e => changeMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {MONTHS.map(opt => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>
            ))}
          </select>
          <Link href="/electricity/invoices"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <FileText size={15} />View Invoices
          </Link>
        </div>
      </div>

      {/* ── KPI row (6 cards) ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        {([
          { label: 'Total Billed',  value: formatAUD(totalBilled),     sub: monthName(month, year),                       icon: FileText,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Collected',     value: formatAUD(totalPaid),        sub: `${collectionRate.toFixed(1)}% rate`,          icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Outstanding',   value: formatAUD(totalOutstanding), sub: `${overdueCount} overdue`,                    icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Occupancy',     value: `${occupancy.toFixed(0)}%`,  sub: `${activeCustomers.length} of ${apartments.length}`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Vacant Units',  value: String(vacantCount),         sub: 'available to lease',                         icon: Building2,    color: 'text-slate-500',  bg: 'bg-slate-100' },
          {
            label: 'Readings', value: `${monthReadings.length}`,
            sub: missingReadings > 0 ? `${missingReadings} missing` : 'All covered',
            icon: Zap,
            color: missingReadings > 0 ? 'text-amber-600' : 'text-emerald-600',
            bg:    missingReadings > 0 ? 'bg-amber-50'    : 'bg-emerald-50',
          },
        ] as const).map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={15} className={s.color} />
            </div>
            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5 leading-tight">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border
              ${a.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <AlertCircle size={15} className="flex-shrink-0" />
              <span className="flex-1 font-normal">{a.msg}</span>
              <Link href={a.href} className="text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100">Fix now →</Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Middle row: Status | Buildings | Actions ──────────────────────── */}
      <div className="grid grid-cols-5 gap-4">

        {/* Invoice status bars */}
        <div className="card p-4">
          <h2 className="section-title">Invoice Status</h2>
          <div className="space-y-3">
            {statusBreakdown.map(({ key, label, count, bar }) => {
              const pct = monthInvoices.length > 0 ? (count / monthInvoices.length) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${bar} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-slate-400 pt-1">{monthInvoices.length} total invoices</p>
          </div>
        </div>

        {/* Building overview table */}
        <div className="card p-4 col-span-3">
          <h2 className="section-title">Buildings — {monthName(month, year)}</h2>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="table-header text-left pb-2">Building</th>
                <th className="table-header text-right pb-2">Units</th>
                <th className="table-header text-right pb-2">Occupied</th>
                <th className="table-header text-right pb-2">Readings</th>
                <th className="table-header text-right pb-2">Billed</th>
                <th className="table-header text-right pb-2">Occ %</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map(b => {
                const apts  = apartments.filter(a => a.buildingId === b.id)
                const occ   = apts.filter(a => activeCustomers.find(c => c.apartmentId === a.id))
                const reads = monthReadings.filter(r => apts.find(a => a.id === r.apartmentId))
                const bTotal = monthInvoices.filter(i => i.buildingId === b.id).reduce((s, i) => s + i.total, 0)
                const pct = occ.length / apts.length
                return (
                  <tr key={b.id} className="data-row">
                    <td className="py-2">
                      <p className="font-medium text-slate-800">{b.name}</p>
                      <p className="text-slate-400">{b.suburb}</p>
                    </td>
                    <td className="py-2 text-right text-slate-600">{apts.length}</td>
                    <td className="py-2 text-right text-slate-600">{occ.length}</td>
                    <td className="py-2 text-right">
                      <span className={reads.length < occ.length ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
                        {reads.length}/{occ.length}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-slate-800">{formatAUD(bTotal)}</td>
                    <td className="py-2 text-right">
                      <span className={`badge-${pct > 0.95 ? 'success' : pct > 0.85 ? 'warning' : 'danger'}`}>
                        {(pct * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td className="pt-2 font-semibold text-slate-700">Total</td>
                <td className="pt-2 text-right font-semibold text-slate-700">{apartments.length}</td>
                <td className="pt-2 text-right font-semibold text-slate-700">{activeCustomers.length}</td>
                <td className="pt-2 text-right font-semibold text-slate-700">{monthReadings.length}</td>
                <td className="pt-2 text-right font-mono font-bold text-slate-900">{formatAUD(totalBilled)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Quick actions */}
        <div className="card p-4">
          <h2 className="section-title">Quick Actions</h2>
          <div className="space-y-1.5">
            {[
              { href: '/electricity/usage',     label: 'Upload Readings',  icon: Upload },
              { href: '/electricity/invoices',  label: 'Invoices',         icon: FileText },
              { href: '/electricity/exports',   label: 'ABA & Exports',    icon: Download },
              { href: '/electricity/customers', label: 'Customers',        icon: Users },
              { href: '/electricity/settings',  label: 'Settings',         icon: Settings },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                  <a.icon size={13} className="text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Meters Cockpit ───────────────────────────────────────────────── */}
      <div className="card overflow-hidden">

        {/* Table header / controls */}
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">All Meters & Units</h2>
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} of {apartments.length} units · {monthName(month, year)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => applySearch(e.target.value)}
                  placeholder="Unit, name, meter…"
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <select value={filterBuilding} onChange={e => applyBuilding(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Buildings</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_TABS.map(f => (
              <button key={f.key} onClick={() => applyFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${filterStatus === f.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {f.label}
                <span className={`rounded-full px-1.5 ${filterStatus === f.key ? 'bg-indigo-500 text-white' : 'bg-white/60 text-slate-500'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header text-left px-4 py-2.5">Unit</th>
                <th className="table-header text-left px-3 py-2.5">Building</th>
                <th className="table-header text-left px-3 py-2.5">Meter #</th>
                <th className="table-header text-left px-3 py-2.5">Customer</th>
                <th className="table-header text-center px-3 py-2.5">Pay</th>
                <th className="table-header text-right px-3 py-2.5">Usage</th>
                <th className="table-header text-center px-3 py-2.5">Invoice</th>
                <th className="table-header text-right px-4 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    No units match the current filters
                  </td>
                </tr>
              )}
              {pageRows.map(({ apt, bld, cust, reading, invoice, isVacant, isFinal }) => (
                <tr key={apt.id} className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors
                  ${isVacant ? 'opacity-60' : ''}`}>

                  {/* Unit */}
                  <td className="px-4 py-2.5">
                    {invoice
                      ? <Link href={`/electricity/invoices/${invoice.id}`}
                          className="font-mono font-semibold text-indigo-600 hover:underline text-sm">
                          {apt.unitNumber}
                        </Link>
                      : <span className="font-mono font-semibold text-slate-700 text-sm">{apt.unitNumber}</span>
                    }
                    <p className="text-xs text-slate-400">Fl {apt.floor}</p>
                  </td>

                  {/* Building */}
                  <td className="px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-700">{bld?.name}</p>
                    <p className="text-xs text-slate-400">{bld?.suburb}</p>
                  </td>

                  {/* Meter */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-slate-500">{apt.meterNumber}</span>
                  </td>

                  {/* Customer */}
                  <td className="px-3 py-2.5">
                    {isVacant ? (
                      <span className="badge-neutral text-xs">Vacant</span>
                    ) : isFinal ? (
                      <div>
                        <p className="text-xs font-medium text-slate-700">{cust!.firstName} {cust!.lastName}</p>
                        <span className="badge-danger text-xs">Final Bill</span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-slate-800">{cust!.firstName} {cust!.lastName}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[140px]">{cust!.email}</p>
                      </div>
                    )}
                  </td>

                  {/* Payment method */}
                  <td className="px-3 py-2.5 text-center">
                    {cust?.paymentMethod === 'direct_debit' && <span className="badge-primary text-xs">DDR</span>}
                    {cust?.paymentMethod === 'bpay'         && <span className="badge-neutral text-xs">BPAY</span>}
                    {cust?.paymentMethod === 'eft'          && <span className="badge-neutral text-xs">EFT</span>}
                    {!cust && <span className="text-slate-300 text-xs">—</span>}
                  </td>

                  {/* Usage */}
                  <td className="px-3 py-2.5 text-right">
                    {reading ? (
                      <span className="font-mono text-xs text-slate-700">{reading.usage.toLocaleString()} kWh</span>
                    ) : cust && !isFinal ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <AlertCircle size={10} />Missing
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Invoice status */}
                  <td className="px-3 py-2.5 text-center">
                    {invoice ? (
                      <span className={`badge-${
                        invoice.status === 'paid'    ? 'success' :
                        invoice.status === 'overdue' ? 'danger'  :
                        invoice.status === 'sent'    ? 'primary' : 'neutral'
                      } text-xs`}>
                        {invoice.status}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-2.5 text-right">
                    {invoice
                      ? <span className="font-mono text-xs font-semibold text-slate-800">{formatAUD(invoice.total)}</span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs text-slate-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} units
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 transition-colors">
                <ChevronLeft size={14} />
              </button>
              {pagRange(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="px-1 text-slate-300 text-xs select-none">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors
                      ${page === p ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
