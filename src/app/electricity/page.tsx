'use client'
import Link from 'next/link'
import { Building2, Users, Zap, FileText, Download, TrendingUp, AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { BUILDINGS, APARTMENTS } from '@/lib/electricityData'
import { formatAUD, monthName } from '@/lib/electricityUtils'

export default function ElectricityDashboard() {
  const { customers, invoices, readings, isLoaded } = useElectricity()

  if (!isLoaded) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading electricity billing...</div>
    </div>
  )

  const latestMonth = 5
  const latestYear = 2026

  const monthInvoices = invoices.filter(i => i.month === latestMonth && i.year === latestYear)
  const totalBilled = monthInvoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalOutstanding = monthInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const overdueCount = monthInvoices.filter(i => i.status === 'overdue').length
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0
  const occupancy = customers.length > 0 ? (customers.filter(c => !c.moveOutDate).length / APARTMENTS.length) * 100 : 0

  const stats = [
    { label: 'Total Billed', value: formatAUD(totalBilled), sub: monthName(latestMonth, latestYear), icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Collected', value: formatAUD(totalPaid), sub: `${collectionRate.toFixed(1)}% collection rate`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Outstanding', value: formatAUD(totalOutstanding), sub: `${overdueCount} overdue`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Occupancy', value: `${occupancy.toFixed(0)}%`, sub: `${customers.filter(c => !c.moveOutDate).length} of ${APARTMENTS.length} units`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  const quickActions = [
    { href: '/electricity/usage', label: 'Upload Monthly Readings', icon: Zap, desc: 'Import CSV or enter manually' },
    { href: '/electricity/invoices', label: 'Generate Invoices', icon: FileText, desc: 'Create & send invoices' },
    { href: '/electricity/exports', label: 'Download ABA File', icon: Download, desc: 'Direct debit batch file' },
    { href: '/electricity/customers', label: 'Manage Customers', icon: Users, desc: 'Add, edit, remove tenants' },
  ]

  const buildingStats = BUILDINGS.map(b => {
    const apts = APARTMENTS.filter(a => a.buildingId === b.id)
    const occupied = apts.filter(a => customers.find(c => c.apartmentId === a.id && !c.moveOutDate))
    const bInvoices = monthInvoices.filter(i => i.buildingId === b.id)
    const bTotal = bInvoices.reduce((s, i) => s + i.total, 0)
    return { building: b, occupied: occupied.length, total: apts.length, billed: bTotal }
  })

  const recentInvoices = [...monthInvoices]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap size={24} className="text-indigo-600" />
            Electricity Billing
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{monthName(latestMonth, latestYear)} · 7 buildings · {APARTMENTS.length} apartments</p>
        </div>
        <Link href="/electricity/invoices" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <FileText size={15} />
          View All Invoices
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="kpi-label">{s.label}</p>
                <p className="kpi-value mt-1">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card p-5">
          <h2 className="section-title">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                  <a.icon size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{a.label}</p>
                  <p className="text-xs text-slate-400">{a.desc}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400" />
              </Link>
            ))}
          </div>
        </div>

        {/* Building Overview */}
        <div className="card p-5 col-span-2">
          <h2 className="section-title">Building Overview — {monthName(latestMonth, latestYear)}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header text-left pb-2">Building</th>
                <th className="table-header text-right pb-2">Units</th>
                <th className="table-header text-right pb-2">Occupied</th>
                <th className="table-header text-right pb-2">Billed</th>
                <th className="table-header text-right pb-2">Occ. Rate</th>
              </tr>
            </thead>
            <tbody>
              {buildingStats.map(({ building: b, occupied, total, billed }) => (
                <tr key={b.id} className="data-row">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-800">{b.name}</p>
                        <p className="text-xs text-slate-400">{b.address}, {b.suburb}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-slate-600">{total}</td>
                  <td className="py-2.5 text-right text-slate-600">{occupied}</td>
                  <td className="py-2.5 text-right font-mono text-slate-800">{formatAUD(billed)}</td>
                  <td className="py-2.5 text-right">
                    <span className={`badge-${occupied / total > 0.95 ? 'success' : occupied / total > 0.85 ? 'warning' : 'danger'}`}>
                      {((occupied / total) * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td className="pt-2.5 font-semibold text-slate-700">Total</td>
                <td className="pt-2.5 text-right font-semibold text-slate-700">{APARTMENTS.length}</td>
                <td className="pt-2.5 text-right font-semibold text-slate-700">{customers.filter(c => !c.moveOutDate).length}</td>
                <td className="pt-2.5 text-right font-mono font-bold text-slate-900">{formatAUD(totalBilled)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Invoice Status + Recent */}
      <div className="grid grid-cols-5 gap-6">
        {/* Status breakdown */}
        <div className="card p-5">
          <h2 className="section-title">Invoice Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Paid', key: 'paid', color: 'bg-emerald-500' },
              { label: 'Sent', key: 'sent', color: 'bg-indigo-500' },
              { label: 'Overdue', key: 'overdue', color: 'bg-red-500' },
              { label: 'Draft', key: 'draft', color: 'bg-slate-300' },
            ].map(({ label, key, color }) => {
              const count = monthInvoices.filter(i => i.status === key).length
              const pct = monthInvoices.length > 0 ? (count / monthInvoices.length) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-medium text-slate-800">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          {overdueCount > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{overdueCount} invoice{overdueCount > 1 ? 's' : ''} overdue — action required</p>
            </div>
          )}
        </div>

        {/* Recent high-value invoices */}
        <div className="card p-5 col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Recent Invoices</h2>
            <Link href="/electricity/invoices" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header text-left pb-2">Invoice</th>
                <th className="table-header text-left pb-2">Customer</th>
                <th className="table-header text-left pb-2">Building</th>
                <th className="table-header text-right pb-2">Usage</th>
                <th className="table-header text-right pb-2">Amount</th>
                <th className="table-header text-center pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map(inv => {
                const cust = customers.find(c => c.id === inv.customerId)
                const bld = BUILDINGS.find(b => b.id === inv.buildingId)
                return (
                  <tr key={inv.id} className="data-row">
                    <td className="py-2.5">
                      <Link href={`/electricity/invoices/${inv.id}`} className="text-indigo-600 hover:underline font-mono text-xs">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 text-slate-700">{cust ? `${cust.firstName} ${cust.lastName}` : '—'}</td>
                    <td className="py-2.5 text-slate-500 text-xs">{bld?.name} · Unit {APARTMENTS.find(a => a.id === inv.apartmentId)?.unitNumber}</td>
                    <td className="py-2.5 text-right text-slate-600 font-mono">{inv.usage} kWh</td>
                    <td className="py-2.5 text-right font-mono font-medium text-slate-900">{formatAUD(inv.total)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`badge-${inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : inv.status === 'sent' ? 'primary' : 'neutral'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
