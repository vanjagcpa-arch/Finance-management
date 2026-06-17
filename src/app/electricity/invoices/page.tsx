'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Search, Send, RefreshCw, Check, AlertTriangle, Download, PlusCircle, Minus } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { formatAUD, monthName } from '@/lib/electricityUtils'
import type { ElectricityInvoice } from '@/lib/electricityTypes'

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 5 - i, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) }
})

export default function InvoicesPage() {
  const { customers, invoices, readings, settings, buildings, apartments, upsertInvoices, updateInvoice, isLoaded } = useElectricity()
  const [selectedMonth, setSelectedMonth] = useState(5)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null)
  const [toast, setToast] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const aptMap = useMemo(() => new Map(apartments.map(a => [a.id, a])), [apartments])
  const custMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers])
  const bldMap = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings])

  const monthInvoices = useMemo(() =>
    invoices.filter(i => i.month === selectedMonth && i.year === selectedYear),
    [invoices, selectedMonth, selectedYear]
  )

  const filtered = useMemo(() => {
    return monthInvoices.filter(inv => {
      const cust = custMap.get(inv.customerId)
      const apt = aptMap.get(inv.apartmentId)
      const matchSearch = !search || `${cust?.firstName} ${cust?.lastName} ${inv.invoiceNumber}`.toLowerCase().includes(search.toLowerCase())
      const matchBuilding = !filterBuilding || inv.buildingId === filterBuilding
      const matchStatus = !filterStatus || inv.status === filterStatus
      return matchSearch && matchBuilding && matchStatus
    })
  }, [monthInvoices, search, filterBuilding, filterStatus, custMap, aptMap])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function generateInvoices() {
    setGenerating(true)
    const monthReadings = readings.filter(r => r.month === selectedMonth && r.year === selectedYear)
    const custAptMap = new Map(customers.map(c => [c.apartmentId, c]))
    const existingIds = new Set(monthInvoices.map(i => i.id))
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const issueDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const dueDateObj = new Date(selectedYear, selectedMonth - 1, 1 + settings.paymentTermsDays)
    const dueDate = dueDateObj.toISOString().split('T')[0]
    const billingEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`

    const newInvoices: ElectricityInvoice[] = []
    let counter = monthInvoices.length

    monthReadings.forEach(r => {
      const id = `inv-${r.apartmentId}-${selectedYear}${String(selectedMonth).padStart(2, '0')}`
      if (existingIds.has(id)) return
      const customer = custAptMap.get(r.apartmentId)
      if (!customer) return
      const apt = aptMap.get(r.apartmentId)
      if (!apt) return

      const { ratePerKwh, dailySupplyCharge, gstRate } = settings.tariff
      const usageCharge = Math.round(r.usage * ratePerKwh * 100) / 100
      const supplyCharge = Math.round(daysInMonth * dailySupplyCharge * 100) / 100
      const subtotal = Math.round((usageCharge + supplyCharge) * 100) / 100
      const gst = Math.round(subtotal * gstRate * 100) / 100
      const total = Math.round((subtotal + gst) * 100) / 100
      counter++

      newInvoices.push({
        id,
        invoiceNumber: `${settings.invoicePrefix}-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${String(counter).padStart(4, '0')}`,
        customerId: customer.id,
        apartmentId: r.apartmentId,
        buildingId: apt.buildingId,
        month: selectedMonth,
        year: selectedYear,
        issueDate,
        dueDate,
        billingPeriodStart: issueDate,
        billingPeriodEnd: billingEnd,
        daysInPeriod: daysInMonth,
        previousReading: r.previousReading,
        currentReading: r.currentReading,
        usage: r.usage,
        ratePerKwh,
        usageCharge,
        supplyCharge,
        subtotal,
        gst,
        total,
        status: 'draft',
      })
    })

    setTimeout(() => {
      upsertInvoices(newInvoices)
      setGenerating(false)
      showToast(newInvoices.length > 0 ? `Generated ${newInvoices.length} new invoices` : 'All invoices already generated')
    }, 800)
  }

  async function markAllSent() {
    const drafts = filtered.filter(i => i.status === 'draft')
    if (!drafts.length) return
    setSendingAll(true)
    setSendProgress({ done: 0, total: drafts.length })
    let sent = 0
    let failed = 0
    for (const inv of drafts) {
      const cust = custMap.get(inv.customerId)
      if (!cust?.email) { failed++; continue }
      const isDDR = cust.paymentMethod === 'direct_debit'
      try {
        const res = await fetch('/api/send-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cust.email,
            customerFirstName: cust.firstName,
            isDDR,
            customerBSB: isDDR ? cust.bsb : undefined,
            customerAccount: isDDR ? cust.accountNumber : undefined,
            customerAccountName: isDDR ? cust.accountName : undefined,
            invoiceNumber: inv.invoiceNumber,
            period: `${monthName(inv.month, inv.year)}`,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            isFinalBill: inv.isFinalBill ?? false,
            usage: inv.usage,
            usageCharge: inv.usageCharge,
            supplyCharge: inv.supplyCharge,
            subtotal: inv.subtotal,
            gst: inv.gst,
            total: inv.total,
            ratePerKwh: inv.ratePerKwh,
            dailySupplyCharge: settings.tariff.dailySupplyCharge,
            daysInPeriod: inv.daysInPeriod,
            gstRate: settings.tariff.gstRate,
            companyName: settings.companyName,
            fromEmail: settings.senderEmail,
            companyEmail: settings.email,
            companyPhone: settings.phone,
            companyABN: settings.abn,
            bpayBillerCode: settings.bpayBillerCode,
            bankBSB: settings.bsb,
            bankAccount: settings.accountNumber,
            bankAccountName: settings.accountName,
            bankName: settings.bankName,
            pdfFilename: `${inv.invoiceNumber}.pdf`,
          }),
        })
        if (res.ok) {
          updateInvoice({ ...inv, status: 'sent' })
          sent++
        } else {
          failed++
        }
      } catch {
        failed++
      }
      setSendProgress({ done: sent + failed, total: drafts.length })
    }
    setSendingAll(false)
    setSendProgress(null)
    showToast(failed > 0 ? `Sent ${sent}, failed ${failed}` : `${sent} invoices sent successfully`)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalBilled = filtered.reduce((s, i) => s + i.total, 0)
  const draftCount  = monthInvoices.filter(i => i.status === 'draft').length
  const overdueCount = monthInvoices.filter(i => i.status === 'overdue').length

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-pulse">
          <Check size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileText size={22} className="text-indigo-600" />Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">{monthInvoices.length} invoices · {formatAUD(monthInvoices.reduce((s, i) => s + i.total, 0))} total</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={`${selectedYear}-${selectedMonth}`}
            onChange={e => { const [y, m] = e.target.value.split('-'); setSelectedYear(+y); setSelectedMonth(+m) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {MONTHS.map(opt => <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>)}
          </select>
          <button onClick={generateInvoices} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating…' : 'Generate Invoices'}
          </button>
          {overdueCount > 0 && (
            <Link href="/electricity/debtors"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              <AlertTriangle size={14} />
              Manage Debtors ({overdueCount})
            </Link>
          )}
          {draftCount > 0 && (
            <button onClick={markAllSent} disabled={sendingAll}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Send size={14} className={sendingAll ? 'animate-pulse' : ''} />
              {sendProgress
                ? `Sending ${sendProgress.done}/${sendProgress.total}…`
                : sendingAll ? 'Sending…' : `Send All (${draftCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', value: monthInvoices.length, color: 'text-slate-900' },
          { label: 'Draft', value: monthInvoices.filter(i => i.status === 'draft').length, color: 'text-slate-500' },
          { label: 'Sent', value: monthInvoices.filter(i => i.status === 'sent').length, color: 'text-indigo-600' },
          { label: 'Paid', value: monthInvoices.filter(i => i.status === 'paid').length, color: 'text-emerald-600' },
          { label: 'Overdue', value: monthInvoices.filter(i => i.status === 'overdue').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card px-4 py-3 text-center">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, customer…"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <span className="text-xs text-slate-400">{filtered.length} results · {formatAUD(totalBilled)}</span>
      </div>

      {/* Invoice Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="table-header text-left px-4 py-3">Invoice #</th>
              <th className="table-header text-left px-4 py-3">Customer</th>
              <th className="table-header text-left px-4 py-3">Property</th>
              <th className="table-header text-right px-4 py-3">Usage</th>
              <th className="table-header text-right px-4 py-3">Amount</th>
              <th className="table-header text-left px-4 py-3">Due</th>
              <th className="table-header text-center px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">
                {monthInvoices.length === 0 ? 'No invoices yet — click "Generate Invoices" to create them from uploaded readings' : 'No invoices match the current filters'}
              </td></tr>
            )}
            {filtered.map(inv => {
              const cust = custMap.get(inv.customerId)
              const apt = aptMap.get(inv.apartmentId)
              const bld = bldMap.get(inv.buildingId)
              return (
                <tr key={inv.id} className="data-row">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/electricity/invoices/${inv.id}`} className="text-indigo-600 hover:underline font-mono text-xs font-medium">
                      {inv.invoiceNumber}
                    </Link>
                    {inv.isAdjustment && (
                      <span className={`ml-1.5 inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full
                        ${inv.adjustmentType === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inv.adjustmentType === 'credit' ? <Minus size={9} /> : <PlusCircle size={9} />}
                        {inv.adjustmentType === 'credit' ? 'CR' : 'ADJ'}
                      </span>
                    )}
                    {inv.isFinalBill && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                        FINAL
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{cust ? `${cust.firstName} ${cust.lastName}` : '—'}</p>
                    <p className="text-xs text-slate-400">{cust?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{bld?.name}</p>
                    <p className="text-xs text-slate-400">Unit {apt?.unitNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">{inv.isAdjustment ? '—' : `${inv.usage.toLocaleString()} kWh`}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${inv.total < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{formatAUD(inv.total)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{inv.dueDate}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={inv.status}
                      onChange={e => updateInvoice({ ...inv, status: e.target.value as ElectricityInvoice['status'] })}
                      className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500
                        ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'sent' ? 'bg-indigo-100 text-indigo-700' :
                          inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'}`}>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/electricity/invoices/${inv.id}`}
                      className="px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
