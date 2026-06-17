'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText, Search, Send, RefreshCw, Check, AlertTriangle, PlusCircle, Minus,
  TrendingUp, TrendingDown, ZapOff, ChevronDown, ChevronUp, X, Zap,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { formatAUD, monthName, detectUsageAnomalies } from '@/lib/electricityUtils'
import type { ElectricityInvoice } from '@/lib/electricityTypes'

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 5 - i, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) }
})

type SendStatus = 'sending' | 'sent' | 'failed'

export default function InvoicesPage() {
  const { customers, invoices, readings, settings, buildings, apartments, upsertInvoices, updateInvoice, isLoaded } = useElectricity()
  const [selectedMonth, setSelectedMonth] = useState(5)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAnomaly, setFilterAnomaly] = useState(false)
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sendingBatch, setSendingBatch] = useState(false)
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null)
  const [sendStatuses, setSendStatuses] = useState<Record<string, SendStatus>>({})
  const [toast, setToast] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [anomalyOpen, setAnomalyOpen] = useState(true)
  const [showReadinessPanel, setShowReadinessPanel] = useState(true)

  const aptMap  = useMemo(() => new Map(apartments.map(a => [a.id, a])), [apartments])
  const custMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers])
  const bldMap  = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings])

  // Customers with active tenancy indexed by apartmentId
  const activeCustAptMap = useMemo(
    () => new Map(customers.filter(c => !c.moveOutDate).map(c => [c.apartmentId, c])),
    [customers]
  )

  // All invoices for selected month (incl adjustments)
  const monthInvoices = useMemo(
    () => invoices.filter(i => i.month === selectedMonth && i.year === selectedYear),
    [invoices, selectedMonth, selectedYear]
  )

  // Regular (non-adjustment) invoices for this month
  const regularInvoices = useMemo(() => monthInvoices.filter(i => !i.isAdjustment), [monthInvoices])

  // Generation readiness
  const monthReadings = useMemo(
    () => readings.filter(r => r.month === selectedMonth && r.year === selectedYear),
    [readings, selectedMonth, selectedYear]
  )
  const existingAptIds = useMemo(() => new Set(regularInvoices.map(i => i.apartmentId)), [regularInvoices])
  const readingsWithCustomer = useMemo(
    () => monthReadings.filter(r => activeCustAptMap.has(r.apartmentId)),
    [monthReadings, activeCustAptMap]
  )
  const willGenerate = useMemo(
    () => readingsWithCustomer.filter(r => !existingAptIds.has(r.apartmentId)),
    [readingsWithCustomer, existingAptIds]
  )
  const missingReadings = useMemo(() => {
    const readingAptIds = new Set(monthReadings.map(r => r.apartmentId))
    return apartments.filter(a => activeCustAptMap.has(a.id) && !readingAptIds.has(a.id))
  }, [apartments, activeCustAptMap, monthReadings])

  // Usage anomalies
  const anomalies = useMemo(
    () => detectUsageAnomalies(regularInvoices, readings, selectedMonth, selectedYear),
    [regularInvoices, readings, selectedMonth, selectedYear]
  )
  const anomalyInvoiceIds = useMemo(() => new Set(anomalies.map(a => a.invoiceId)), [anomalies])
  const anomalyMap = useMemo(() => new Map(anomalies.map(a => [a.invoiceId, a])), [anomalies])

  const filtered = useMemo(() => {
    return monthInvoices.filter(inv => {
      const cust = custMap.get(inv.customerId)
      const matchSearch   = !search        || `${cust?.firstName} ${cust?.lastName} ${inv.invoiceNumber}`.toLowerCase().includes(search.toLowerCase())
      const matchBuilding = !filterBuilding || inv.buildingId === filterBuilding
      const matchStatus   = !filterStatus  || inv.status === filterStatus
      const matchAnomaly  = !filterAnomaly || anomalyInvoiceIds.has(inv.id)
      return matchSearch && matchBuilding && matchStatus && matchAnomaly
    })
  }, [monthInvoices, search, filterBuilding, filterStatus, filterAnomaly, custMap, anomalyInvoiceIds])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ---------- Generation ----------
  function generateInvoices() {
    setGenerating(true)
    const existingIds = new Set(monthInvoices.map(i => i.id))
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const issueDate   = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const dueDateObj  = new Date(selectedYear, selectedMonth - 1, 1 + settings.paymentTermsDays)
    const dueDate     = dueDateObj.toISOString().split('T')[0]
    const billingEnd  = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`

    const newInvoices: ElectricityInvoice[] = []
    let counter = monthInvoices.filter(i => !i.isAdjustment).length

    willGenerate.forEach(r => {
      const id = `inv-${r.apartmentId}-${selectedYear}${String(selectedMonth).padStart(2, '0')}`
      if (existingIds.has(id)) return
      const customer = activeCustAptMap.get(r.apartmentId)
      if (!customer) return
      const apt = aptMap.get(r.apartmentId)
      if (!apt) return
      const { ratePerKwh, dailySupplyCharge, gstRate } = settings.tariff
      const usageCharge = Math.round(r.usage * ratePerKwh * 100) / 100
      const supplyCharge = Math.round(daysInMonth * dailySupplyCharge * 100) / 100
      const subtotal = Math.round((usageCharge + supplyCharge) * 100) / 100
      const gst   = Math.round(subtotal * gstRate * 100) / 100
      const total = Math.round((subtotal + gst) * 100) / 100
      counter++
      newInvoices.push({
        id,
        invoiceNumber: `${settings.invoicePrefix}-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${String(counter).padStart(4, '0')}`,
        customerId: customer.id, apartmentId: r.apartmentId, buildingId: apt.buildingId,
        month: selectedMonth, year: selectedYear,
        issueDate, dueDate,
        billingPeriodStart: issueDate, billingPeriodEnd: billingEnd,
        daysInPeriod: daysInMonth,
        previousReading: r.previousReading, currentReading: r.currentReading, usage: r.usage,
        ratePerKwh, usageCharge, supplyCharge, subtotal, gst, total,
        status: 'draft',
      })
    })

    setTimeout(() => {
      upsertInvoices(newInvoices)
      setGenerating(false)
      if (newInvoices.length > 0) {
        setShowReadinessPanel(false)
        showToast(`Generated ${newInvoices.length} invoice${newInvoices.length !== 1 ? 's' : ''}`)
      } else {
        showToast('All invoices already generated')
      }
    }, 600)
  }

  // ---------- Batch Send ----------
  const sendInvoice = useCallback(async (inv: ElectricityInvoice) => {
    const cust = custMap.get(inv.customerId)
    if (!cust?.email) return 'failed'
    const isDDR = cust.paymentMethod === 'direct_debit' || cust.paymentMethod === 'ezidebit'
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cust.email, customerFirstName: cust.firstName,
          isDDR,
          customerBSB: isDDR ? cust.bsb : undefined,
          customerAccount: isDDR ? cust.accountNumber : undefined,
          customerAccountName: isDDR ? cust.accountName : undefined,
          invoiceNumber: inv.invoiceNumber,
          period: monthName(inv.month, inv.year),
          issueDate: inv.issueDate, dueDate: inv.dueDate,
          isFinalBill: inv.isFinalBill ?? false,
          usage: inv.usage, usageCharge: inv.usageCharge, supplyCharge: inv.supplyCharge,
          subtotal: inv.subtotal, gst: inv.gst, total: inv.total,
          ratePerKwh: inv.ratePerKwh,
          dailySupplyCharge: settings.tariff.dailySupplyCharge,
          daysInPeriod: inv.daysInPeriod, gstRate: settings.tariff.gstRate,
          companyName: settings.companyName, fromEmail: settings.senderEmail,
          companyEmail: settings.email, companyPhone: settings.phone,
          companyABN: settings.abn, bpayBillerCode: settings.bpayBillerCode,
          bankBSB: settings.bsb, bankAccount: settings.accountNumber,
          bankAccountName: settings.accountName, bankName: settings.bankName,
          pdfFilename: `${inv.invoiceNumber}.pdf`,
        }),
      })
      return res.ok ? 'sent' : 'failed'
    } catch { return 'failed' }
  }, [custMap, settings])

  async function runBatchSend(targets: ElectricityInvoice[]) {
    if (!targets.length) return
    setSendingBatch(true)
    setSendProgress({ done: 0, total: targets.length })
    const statuses: Record<string, SendStatus> = {}
    targets.forEach(i => { statuses[i.id] = 'sending' })
    setSendStatuses(prev => ({ ...prev, ...statuses }))
    let sent = 0, failed = 0
    for (const inv of targets) {
      const result = await sendInvoice(inv)
      setSendStatuses(prev => ({ ...prev, [inv.id]: result }))
      if (result === 'sent') { updateInvoice({ ...inv, status: 'sent' }); sent++ }
      else failed++
      setSendProgress({ done: sent + failed, total: targets.length })
    }
    setSendingBatch(false)
    setSendProgress(null)
    setSelected(new Set())
    showToast(failed > 0 ? `Sent ${sent}, failed ${failed}` : `${sent} invoice${sent !== 1 ? 's' : ''} sent`)
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    const allIds = filtered.filter(i => i.status === 'draft').map(i => i.id)
    const allSelected = allIds.every(id => selected.has(id))
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  const draftInvoices  = useMemo(() => monthInvoices.filter(i => i.status === 'draft' && !i.isAdjustment), [monthInvoices])
  const selectedDrafts = useMemo(() => filtered.filter(i => selected.has(i.id) && i.status === 'draft'), [filtered, selected])
  const overdueCount   = useMemo(() => regularInvoices.filter(i => i.status === 'overdue').length, [regularInvoices])
  const totalBilled    = useMemo(() => filtered.reduce((s, i) => s + i.total, 0), [filtered])
  const filteredDraftCount = useMemo(() => filtered.filter(i => i.status === 'draft' && !i.isAdjustment).length, [filtered])
  const allDraftsSelected  = filteredDraftCount > 0 && filtered.filter(i => i.status === 'draft').every(i => selected.has(i.id))

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  const showReadiness = showReadinessPanel && (willGenerate.length > 0 || missingReadings.length > 0)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={22} className="text-indigo-600" />Invoices
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {regularInvoices.length} invoices · {formatAUD(regularInvoices.reduce((s, i) => s + i.total, 0))} billed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={`${selectedYear}-${selectedMonth}`}
            onChange={e => {
              const [y, m] = e.target.value.split('-')
              setSelectedYear(+y); setSelectedMonth(+m)
              setSelected(new Set()); setSendStatuses({})
              setShowReadinessPanel(true)
            }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {MONTHS.map(opt => <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>)}
          </select>
          {overdueCount > 0 && (
            <Link href="/electricity/debtors"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              <AlertTriangle size={14} />Debtors ({overdueCount})
            </Link>
          )}
        </div>
      </div>

      {/* ── Generation Readiness Panel ── */}
      {showReadiness && (
        <div className="card border border-indigo-100 overflow-hidden">
          <div className="bg-indigo-50 px-5 py-3 flex items-center justify-between border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-900">Invoice Generation — {monthName(selectedMonth, selectedYear)}</span>
            </div>
            <button onClick={() => setShowReadinessPanel(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-4 mb-5">
              {[
                {
                  label: 'Readings loaded',
                  value: monthReadings.length,
                  sub: 'for this month',
                  color: monthReadings.length > 0 ? 'text-indigo-700' : 'text-slate-400',
                  bg: monthReadings.length > 0 ? 'bg-indigo-50' : 'bg-slate-50',
                },
                {
                  label: 'Will generate',
                  value: willGenerate.length,
                  sub: 'new draft invoices',
                  color: willGenerate.length > 0 ? 'text-emerald-700' : 'text-slate-400',
                  bg: willGenerate.length > 0 ? 'bg-emerald-50' : 'bg-slate-50',
                },
                {
                  label: 'Already invoiced',
                  value: existingAptIds.size,
                  sub: 'skipped (exist)',
                  color: 'text-slate-500',
                  bg: 'bg-slate-50',
                },
                {
                  label: 'Missing readings',
                  value: missingReadings.length,
                  sub: 'active tenants without reading',
                  color: missingReadings.length > 0 ? 'text-amber-700' : 'text-slate-400',
                  bg: missingReadings.length > 0 ? 'bg-amber-50' : 'bg-slate-50',
                },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                  <p className="text-xs text-slate-500 font-medium mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {missingReadings.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex items-start gap-2.5 text-sm text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                  <span className="font-medium">Missing readings: </span>
                  {missingReadings.slice(0, 5).map((a, i) => (
                    <span key={a.id}>{i > 0 && ', '}Unit {a.unitNumber} ({bldMap.get(a.buildingId)?.name})</span>
                  ))}
                  {missingReadings.length > 5 && ` and ${missingReadings.length - 5} more`}
                  {' '}— these tenants won&apos;t receive invoices until readings are uploaded.
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={generateInvoices} disabled={generating || willGenerate.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Generating…' : willGenerate.length > 0 ? `Generate ${willGenerate.length} Invoice${willGenerate.length !== 1 ? 's' : ''}` : 'Nothing to generate'}
              </button>
              {willGenerate.length === 0 && existingAptIds.size > 0 && (
                <span className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <Check size={14} />All invoices already created for this month
                </span>
              )}
              {monthReadings.length === 0 && (
                <span className="text-sm text-slate-400">Upload meter readings on the <Link href="/electricity/usage" className="text-indigo-600 hover:underline">Meter Readings</Link> page first.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show readiness toggle when panel is hidden */}
      {!showReadiness && willGenerate.length > 0 && (
        <button onClick={() => setShowReadinessPanel(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
          <RefreshCw size={13} />{willGenerate.length} reading{willGenerate.length !== 1 ? 's' : ''} ready to invoice
        </button>
      )}

      {/* ── Usage Anomaly Panel ── */}
      {anomalies.length > 0 && (
        <div className="card border border-amber-200 overflow-hidden">
          <button
            onClick={() => setAnomalyOpen(o => !o)}
            className="w-full bg-amber-50 px-5 py-3 flex items-center justify-between hover:bg-amber-100 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">
                {anomalies.length} Usage Anomal{anomalies.length !== 1 ? 'ies' : 'y'} Detected
              </span>
              <span className="text-xs text-amber-600 ml-1">— review before sending</span>
            </div>
            {anomalyOpen ? <ChevronUp size={15} className="text-amber-600" /> : <ChevronDown size={15} className="text-amber-600" />}
          </button>
          {anomalyOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="table-header text-left px-4 py-2.5">Unit</th>
                    <th className="table-header text-left px-4 py-2.5">Customer</th>
                    <th className="table-header text-center px-4 py-2.5">Issue</th>
                    <th className="table-header text-right px-4 py-2.5">This Month</th>
                    <th className="table-header text-right px-4 py-2.5">Avg (11mo)</th>
                    <th className="table-header text-right px-4 py-2.5">Variance</th>
                    <th className="px-4 py-2.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map(a => {
                    const apt  = aptMap.get(a.apartmentId)
                    const bld  = apt ? bldMap.get(apt.buildingId) : undefined
                    const cust = custMap.get(a.customerId)
                    return (
                      <tr key={a.invoiceId} className="border-b border-slate-100 hover:bg-amber-50/40">
                        <td className="px-4 py-2.5">
                          <p className="font-mono text-slate-700">Unit {apt?.unitNumber}</p>
                          <p className="text-xs text-slate-400">{bld?.name}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{cust ? `${cust.firstName} ${cust.lastName}` : '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          {a.issue === 'spike' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              <TrendingUp size={11} />Spike
                            </span>
                          )}
                          {a.issue === 'drop' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              <TrendingDown size={11} />Drop
                            </span>
                          )}
                          {a.issue === 'zero' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              <ZapOff size={11} />Zero
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900">{a.currentUsage.toLocaleString()} kWh</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">{a.avgUsage.toLocaleString()} kWh</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-semibold text-sm
                          ${a.issue === 'spike' ? 'text-red-600' : a.issue === 'zero' ? 'text-slate-500' : 'text-indigo-600'}`}>
                          {a.pctDiff > 0 ? '+' : ''}{a.pctDiff}%
                        </td>
                        <td className="px-4 py-2.5">
                          <Link href={`/electricity/invoices/${a.invoiceId}`}
                            className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors">
                            Review
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', value: regularInvoices.length, color: 'text-slate-900', click: null },
          { label: 'Draft', value: regularInvoices.filter(i => i.status === 'draft').length, color: 'text-slate-500', click: () => setFilterStatus('draft') },
          { label: 'Sent', value: regularInvoices.filter(i => i.status === 'sent').length, color: 'text-indigo-600', click: () => setFilterStatus('sent') },
          { label: 'Paid', value: regularInvoices.filter(i => i.status === 'paid').length, color: 'text-emerald-600', click: () => setFilterStatus('paid') },
          { label: 'Overdue', value: regularInvoices.filter(i => i.status === 'overdue').length, color: 'text-red-600', click: () => setFilterStatus('overdue') },
        ].map(s => (
          <div key={s.label}
            onClick={() => s.click?.()}
            className={`card px-4 py-3 text-center ${s.click ? 'cursor-pointer hover:border-indigo-200 transition-colors' : ''}`}>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
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
        <button
          onClick={() => setFilterAnomaly(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors
            ${filterAnomaly ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'}`}>
          <AlertTriangle size={13} />
          Anomalies {anomalies.length > 0 && <span className={`text-xs font-bold ${filterAnomaly ? 'text-white' : 'text-amber-600'}`}>({anomalies.length})</span>}
        </button>
        {(filterStatus || filterBuilding || search || filterAnomaly) && (
          <button onClick={() => { setSearch(''); setFilterBuilding(''); setFilterStatus(''); setFilterAnomaly(false) }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">
            <X size={12} />Clear filters
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} results · {formatAUD(totalBilled)}</span>
      </div>

      {/* ── Batch action bar ── */}
      {(selectedDrafts.length > 0 || draftInvoices.length > 0) && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <span className="text-sm text-indigo-800">
            {selectedDrafts.length > 0
              ? <><strong>{selectedDrafts.length}</strong> invoice{selectedDrafts.length !== 1 ? 's' : ''} selected</>
              : <><strong>{draftInvoices.length}</strong> draft invoice{draftInvoices.length !== 1 ? 's' : ''} ready to send</>
            }
          </span>
          {sendProgress && (
            <div className="flex-1 mx-2">
              <div className="h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${(sendProgress.done / sendProgress.total) * 100}%` }} />
              </div>
              <p className="text-xs text-indigo-600 mt-1">{sendProgress.done}/{sendProgress.total} sent</p>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {selectedDrafts.length > 0 ? (
              <>
                <button onClick={() => setSelected(new Set())}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  <X size={11} />Deselect all
                </button>
                <button onClick={() => runBatchSend(selectedDrafts)} disabled={sendingBatch}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send size={13} className={sendingBatch ? 'animate-pulse' : ''} />
                  Send Selected ({selectedDrafts.length})
                </button>
              </>
            ) : (
              <button onClick={() => runBatchSend(draftInvoices)} disabled={sendingBatch}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                <Send size={13} className={sendingBatch ? 'animate-pulse' : ''} />
                Send All Drafts ({draftInvoices.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Invoice Table ── */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox"
                  checked={allDraftsSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  title="Select all draft invoices" />
              </th>
              <th className="table-header text-left px-4 py-3">Invoice #</th>
              <th className="table-header text-left px-4 py-3">Customer</th>
              <th className="table-header text-left px-4 py-3">Property</th>
              <th className="table-header text-right px-4 py-3">Usage</th>
              <th className="table-header text-right px-4 py-3">Amount</th>
              <th className="table-header text-left px-4 py-3">Due</th>
              <th className="table-header text-center px-4 py-3">Status</th>
              <th className="px-4 py-3 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">
                {monthInvoices.length === 0
                  ? 'No invoices yet — use the panel above to generate them from uploaded readings'
                  : 'No invoices match the current filters'}
              </td></tr>
            )}
            {filtered.map(inv => {
              const cust    = custMap.get(inv.customerId)
              const apt     = aptMap.get(inv.apartmentId)
              const bld     = bldMap.get(inv.buildingId)
              const anomaly = anomalyMap.get(inv.id)
              const sendSt  = sendStatuses[inv.id]
              const isDraft = inv.status === 'draft' && !inv.isAdjustment
              return (
                <tr key={inv.id} className={`data-row ${anomaly ? 'border-l-2 border-amber-400' : ''}`}>
                  <td className="px-4 py-3">
                    {isDraft && (
                      <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    )}
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
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">FINAL</span>
                    )}
                    {anomaly && (
                      <span className="block mt-1">
                        {anomaly.issue === 'spike' && <span className="inline-flex items-center gap-0.5 text-xs text-red-600"><TrendingUp size={10} />+{anomaly.pctDiff}%</span>}
                        {anomaly.issue === 'drop'  && <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600"><TrendingDown size={10} />{anomaly.pctDiff}%</span>}
                        {anomaly.issue === 'zero'  && <span className="inline-flex items-center gap-0.5 text-xs text-slate-500"><ZapOff size={10} />zero usage</span>}
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
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {inv.isAdjustment ? '—' : `${inv.usage.toLocaleString()} kWh`}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${inv.total < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {formatAUD(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{inv.dueDate}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={inv.status}
                      onChange={e => updateInvoice({ ...inv, status: e.target.value as ElectricityInvoice['status'] })}
                      className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500
                        ${inv.status === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'sent'    ? 'bg-indigo-100 text-indigo-700'  :
                          inv.status === 'overdue' ? 'bg-red-100 text-red-700'        :
                                                     'bg-slate-100 text-slate-600'}`}>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {sendSt === 'sending' && <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                      {sendSt === 'sent'    && <Check size={14} className="text-emerald-500" />}
                      {sendSt === 'failed'  && <span className="text-xs text-red-500">✗</span>}
                      <Link href={`/electricity/invoices/${inv.id}`}
                        className="px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                        View
                      </Link>
                    </div>
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
