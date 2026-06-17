'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Download, FileText, Building2, Users, CreditCard, Check, AlertCircle,
  Settings, Search, X, CheckSquare, Square,
  Minus, Zap, Info,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import {
  formatAUD, monthName,
  generateABAFileFromTransactions, generateMYOBDDRReceipts,
  generateMYOBCustomerExport, generateMYOBInvoiceExport, generateMYOBReceiptsExport,
  generateEzidebitPaymentBatch, generateEzidebitCustomerRegistration,
  getCustomerBalance,
  downloadFile,
} from '@/lib/electricityUtils'
import type { ABATransaction } from '@/lib/electricityUtils'

type Tab = 'aba' | 'myob' | 'ezidebit'

const MONTHS = (() => {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 6 - i, 1)
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) }
  })
})()

// ── Row state ──────────────────────────────────────────────────────────────────
interface ABARow extends ABATransaction {
  selected: boolean
  invoiceAmount: number      // original invoice total
  invoiceStatus: string
  buildingName: string
  unitNumber: string
  bankName: string
  editing: boolean
  amountStr: string          // string for the editable input
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function ExportsPage() {
  const { customers, invoices, settings, buildings, apartments, updateInvoice, isLoaded } = useElectricity()
  const [tab, setTab] = useState<Tab>('aba')

  // ── ABA state ──────────────────────────────────────────────────────────────
  const [abaMonth, setAbaMonth] = useState(() => new Date().getMonth() + 1)
  const [abaYear,  setAbaYear]  = useState(() => new Date().getFullYear())
  const [processDate, setProcessDate] = useState(todayStr)
  const [search,  setSearch]  = useState('')
  const [filterBld, setFilterBld] = useState('')
  const [rows, setRows] = useState<ABARow[]>([])
  const [rowsInit, setRowsInit] = useState(false)
  const [balanceMode, setBalanceMode] = useState(false)

  // ── MYOB state ─────────────────────────────────────────────────────────────
  const [myobMonth, setMyobMonth] = useState(() => new Date().getMonth() + 1)
  const [myobYear,  setMyobYear]  = useState(() => new Date().getFullYear())

  // ── Ezidebit state ─────────────────────────────────────────────────────────
  const [eziMonth,  setEziMonth]  = useState(() => new Date().getMonth() + 1)
  const [eziYear,   setEziYear]   = useState(() => new Date().getFullYear())
  const [eziProcessDate, setEziProcessDate] = useState(todayStr)
  const [eziStatuses, setEziStatuses] = useState<string[]>(['sent', 'overdue'])

  const [toast, setToast] = useState('')

  const aptMap  = useMemo(() => new Map(apartments.map(a => [a.id, a])), [apartments])
  const custMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers])
  const bldMap  = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  // ── Build rows (per-invoice mode) ─────────────────────────────────────────
  const buildRows = useCallback((month: number, year: number) => {
    const monthInvs = invoices.filter(i => i.month === month && i.year === year)
    const newRows: ABARow[] = []
    for (const inv of monthInvs) {
      const cust = custMap.get(inv.customerId)
      if (!cust || (cust.paymentMethod !== 'direct_debit' && cust.paymentMethod !== 'ezidebit')) continue
      const apt  = aptMap.get(inv.apartmentId)
      const bld  = apt ? bldMap.get(apt.buildingId) : undefined
      newRows.push({
        invoiceId: inv.id,
        customerId: cust.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: `${cust.firstName} ${cust.lastName}`,
        bsb: cust.bsb,
        accountNumber: cust.accountNumber,
        accountName: cust.accountName,
        amount: inv.total,
        invoiceAmount: inv.total,
        invoiceStatus: inv.status,
        buildingName: bld?.name ?? '',
        unitNumber: apt?.unitNumber ?? '',
        bankName: cust.bankName,
        selected: inv.status === 'sent' || inv.status === 'overdue',
        editing: false,
        amountStr: inv.total.toFixed(2),
      })
    }
    newRows.sort((a, b) => {
      if (a.invoiceStatus === 'sent' && b.invoiceStatus !== 'sent') return -1
      if (b.invoiceStatus === 'sent' && a.invoiceStatus !== 'sent') return 1
      return a.customerName.localeCompare(b.customerName)
    })
    setRows(newRows)
    setRowsInit(true)
  }, [invoices, custMap, aptMap, bldMap])

  // ── Build rows (balance mode — one row per customer with full outstanding) ─
  const buildBalanceRows = useCallback(() => {
    const td = new Date().toISOString().split('T')[0]
    const ddrCustomers = customers.filter(c => c.paymentMethod === 'direct_debit' || c.paymentMethod === 'ezidebit')
    const newRows: ABARow[] = []
    for (const cust of ddrCustomers) {
      const bal = getCustomerBalance(invoices, cust.id, td)
      if (bal.balance <= 0.005) continue
      const apt = aptMap.get(cust.apartmentId)
      const bld = apt ? bldMap.get(apt.buildingId) : undefined
      // Use the oldest outstanding invoice number as reference
      const oldestInv = invoices
        .filter(i => i.customerId === cust.id && (i.status === 'sent' || i.status === 'overdue'))
        .sort((a, b) => a.issueDate.localeCompare(b.issueDate))[0]
      const invoiceRef = oldestInv?.invoiceNumber ?? `BAL-${cust.id.slice(-6).toUpperCase()}`
      newRows.push({
        invoiceId: oldestInv?.id ?? cust.id,
        customerId: cust.id,
        invoiceNumber: invoiceRef,
        customerName: `${cust.firstName} ${cust.lastName}`,
        bsb: cust.bsb,
        accountNumber: cust.accountNumber,
        accountName: cust.accountName,
        amount: Math.round(bal.balance * 100) / 100,
        invoiceAmount: Math.round(bal.balance * 100) / 100,
        invoiceStatus: bal.days90plus > 0.005 ? 'overdue' : bal.days30 > 0.005 ? 'overdue' : 'sent',
        buildingName: bld?.name ?? '',
        unitNumber: apt?.unitNumber ?? '',
        bankName: cust.bankName,
        selected: true,
        editing: false,
        amountStr: (Math.round(bal.balance * 100) / 100).toFixed(2),
      })
    }
    newRows.sort((a, b) => a.customerName.localeCompare(b.customerName))
    setRows(newRows)
    setRowsInit(true)
  }, [invoices, customers, custMap, aptMap, bldMap])

  // Initialise on first render
  useMemo(() => {
    if (isLoaded && !rowsInit) {
      if (balanceMode) buildBalanceRows()
      else buildRows(abaMonth, abaYear)
    }
  }, [isLoaded, rowsInit, buildRows, buildBalanceRows, balanceMode, abaMonth, abaYear])

  function handleMonthChange(month: number, year: number) {
    setAbaMonth(month); setAbaYear(year)
    buildRows(month, year)
    setSearch(''); setFilterBld('')
  }

  function handleToggleBalanceMode(val: boolean) {
    setBalanceMode(val)
    setSearch(''); setFilterBld('')
    if (val) buildBalanceRows()
    else buildRows(abaMonth, abaYear)
  }

  // ── Row mutations ──────────────────────────────────────────────────────────
  function toggleRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))
  }
  function toggleAll(val: boolean) {
    setRows(prev => prev.map(r => visibleIdxs.has(prev.indexOf(r)) ? { ...r, selected: val } : r))
  }
  function startEdit(idx: number) {
    setRows(prev => prev.map((r, i) => ({ ...r, editing: i === idx })))
  }
  function commitEdit(idx: number, val: string) {
    const n = parseFloat(val)
    setRows(prev => prev.map((r, i) => i === idx
      ? { ...r, amount: isNaN(n) || n < 0 ? r.invoiceAmount : Math.round(n * 100) / 100, amountStr: isNaN(n) || n < 0 ? r.invoiceAmount.toFixed(2) : (Math.round(n * 100) / 100).toFixed(2), editing: false }
      : r
    ))
  }
  function resetAmount(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: r.invoiceAmount, amountStr: r.invoiceAmount.toFixed(2), editing: false } : r))
  }

  // ── Filtered view ──────────────────────────────────────────────────────────
  const visibleIdxs = useMemo(() => {
    const s = new Set<number>()
    rows.forEach((r, i) => {
      const matchSearch = !search || r.customerName.toLowerCase().includes(search.toLowerCase()) || r.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || r.unitNumber.includes(search)
      const matchBld = !filterBld || r.buildingName === filterBld
      if (matchSearch && matchBld) s.add(i)
    })
    return s
  }, [rows, search, filterBld])

  const visibleRows = rows.filter((_, i) => visibleIdxs.has(i))
  const selectedRows = rows.filter(r => r.selected)
  const visibleSelected = visibleRows.filter(r => r.selected)

  const allVisibleSelected  = visibleRows.length > 0 && visibleSelected.length === visibleRows.length
  const someVisibleSelected = visibleSelected.length > 0 && !allVisibleSelected

  const totalSelected = selectedRows.reduce((s, r) => s + r.amount, 0)
  const totalAdjusted = selectedRows.filter(r => Math.abs(r.amount - r.invoiceAmount) > 0.001).length

  // ── Actions ────────────────────────────────────────────────────────────────
  function handleDownloadABA() {
    if (!selectedRows.length) return
    const txns = selectedRows.map<ABATransaction>(r => ({
      invoiceId: r.invoiceId, customerId: r.customerId,
      invoiceNumber: balanceMode ? `BAL-${r.customerId.slice(-6).toUpperCase()}` : r.invoiceNumber,
      customerName: r.customerName,
      bsb: r.bsb, accountNumber: r.accountNumber, accountName: r.accountName,
      amount: r.amount,
    }))
    const suffix = balanceMode ? `balance_${processDate.replace(/-/g,'')}` : `${abaYear}${String(abaMonth).padStart(2,'0')}_${processDate.replace(/-/g,'')}`
    const content = generateABAFileFromTransactions(txns, settings, new Date(processDate + 'T00:00:00'))
    downloadFile(content, `electricity_ddr_${suffix}.aba`, 'text/plain;charset=ascii')
    showToast(`ABA downloaded — ${txns.length} transactions · ${formatAUD(totalSelected)}`)
  }

  function handleDownloadMYOBReceipts() {
    if (!selectedRows.length) return
    const txns = selectedRows.map<ABATransaction>(r => ({
      invoiceId: r.invoiceId, customerId: r.customerId,
      invoiceNumber: balanceMode ? `BAL-${r.customerId.slice(-6).toUpperCase()}` : r.invoiceNumber,
      customerName: r.customerName,
      bsb: r.bsb, accountNumber: r.accountNumber, accountName: r.accountName,
      amount: r.amount,
    }))
    const suffix = balanceMode ? `balance_${processDate.replace(/-/g,'')}` : `${abaYear}${String(abaMonth).padStart(2,'0')}_${processDate.replace(/-/g,'')}`
    const csv = generateMYOBDDRReceipts(txns, customers, new Date(processDate + 'T00:00:00'))
    downloadFile(csv, `myob_ddr_receipts_${suffix}.csv`, 'text/csv')
    showToast(`MYOB DDR receipts downloaded — ${txns.length} rows`)
  }

  function handleMarkPaid() {
    const toMark = selectedRows.map(r => r.invoiceId)
    const paidDate = processDate
    let count = 0
    for (const inv of invoices) {
      if (toMark.includes(inv.id) && inv.status !== 'paid') {
        updateInvoice({ ...inv, status: 'paid', paidDate, paidAmount: rows.find(r => r.invoiceId === inv.id)?.amount })
        count++
      }
    }
    setRows(prev => prev.map(r => toMark.includes(r.invoiceId) ? { ...r, invoiceStatus: 'paid' } : r))
    showToast(`${count} invoices marked as paid (${processDate})`)
  }

  // ── MYOB tab helpers ───────────────────────────────────────────────────────
  const myobMonthInvoices = useMemo(() =>
    invoices.filter(i => i.month === myobMonth && i.year === myobYear),
    [invoices, myobMonth, myobYear]
  )

  function handleMYOBCustomers() {
    downloadFile(generateMYOBCustomerExport(customers, apartments, buildings), `myob_customers_${Date.now()}.csv`, 'text/csv')
    showToast(`MYOB customers exported — ${customers.length} records`)
  }
  function handleMYOBInvoices() {
    downloadFile(generateMYOBInvoiceExport(myobMonthInvoices, customers, apartments, buildings), `myob_invoices_${myobYear}${String(myobMonth).padStart(2,'0')}.csv`, 'text/csv')
    showToast(`MYOB invoices exported — ${myobMonthInvoices.length} records`)
  }
  function handleMYOBReceipts() {
    const paid = myobMonthInvoices.filter(i => i.status === 'paid')
    downloadFile(generateMYOBReceiptsExport(myobMonthInvoices, customers), `myob_receipts_${myobYear}${String(myobMonth).padStart(2,'0')}.csv`, 'text/csv')
    showToast(`MYOB receipts exported — ${paid.length} records`)
  }

  // ── Ezidebit handlers ──────────────────────────────────────────────────────
  const eziMonthInvoices = useMemo(() =>
    invoices.filter(i => i.month === eziMonth && i.year === eziYear),
    [invoices, eziMonth, eziYear]
  )

  const eziEligibleInvoices = useMemo(() =>
    eziMonthInvoices.filter(i => {
      if (!eziStatuses.includes(i.status)) return false
      const c = custMap.get(i.customerId)
      return c?.paymentMethod === 'direct_debit'
    }),
    [eziMonthInvoices, eziStatuses, custMap]
  )

  function handleEziPaymentBatch() {
    if (!eziEligibleInvoices.length) return
    const csv = generateEzidebitPaymentBatch(eziMonthInvoices, customers, eziProcessDate, eziStatuses)
    downloadFile(csv, `ezidebit_payments_${eziYear}${String(eziMonth).padStart(2,'0')}_${eziProcessDate.replace(/-/g,'')}.csv`, 'text/csv')
    showToast(`Ezidebit payment batch exported — ${eziEligibleInvoices.length} transactions`)
  }

  function handleEziCustomerReg() {
    const ddrCustomers = customers.filter(c => c.paymentMethod === 'direct_debit' && !c.moveOutDate)
    const csv = generateEzidebitCustomerRegistration(customers, apartments, buildings)
    downloadFile(csv, `ezidebit_customers_${todayStr()}.csv`, 'text/csv')
    showToast(`Ezidebit customer registration exported — ${ddrCustomers.length} customers`)
  }

  function toggleEziStatus(s: string) {
    setEziStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading…</div>

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      {/* Page header */}
      <div className="px-6 pt-6 pb-0 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Download size={22} className="text-indigo-600" />Exports
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">ABA direct debit files · MYOB integration exports</p>
        </div>
        <Link href="/electricity/settings"
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
          <Settings size={14} />Settings
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-4 flex gap-1 border-b border-slate-200 flex-shrink-0">
        {([
          ['aba',      'ABA Direct Debit',  CreditCard],
          ['myob',     'MYOB Exports',      FileText],
          ['ezidebit', 'Ezidebit',          Zap],
        ] as [Tab, string, typeof CreditCard][]).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${tab === id ? 'text-indigo-700 bg-white border border-slate-200 border-b-white -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── ABA TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'aba' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ABA toolbar */}
          <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0 bg-white border-b border-slate-100 flex-wrap">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button onClick={() => handleToggleBalanceMode(false)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${!balanceMode ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                Per Invoice
              </button>
              <button onClick={() => handleToggleBalanceMode(true)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-200 ${balanceMode ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                Customer Balance
              </button>
            </div>
            {!balanceMode && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Billing Period</label>
                <select
                  value={`${abaYear}-${abaMonth}`}
                  onChange={e => { const [y, m] = e.target.value.split('-'); handleMonthChange(+m, +y) }}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MONTHS.map(opt => <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>)}
                </select>
              </div>
            )}
            {balanceMode && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
                <Info size={12} />One debit per customer — full outstanding balance across all invoices
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ABA Process Date</label>
              <input type="date" value={processDate} onChange={e => setProcessDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="relative ml-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, invoice, unit…"
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Building</label>
              <select value={filterBld} onChange={e => setFilterBld(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Buildings</option>
                {buildings.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>

            {/* Summary chips */}
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Selected</p>
                <p className="text-sm font-bold text-slate-900">{selectedRows.length} of {rows.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total to Debit</p>
                <p className="text-sm font-bold text-indigo-700">{formatAUD(totalSelected)}</p>
              </div>
              {totalAdjusted > 0 && (
                <span className="badge-warning">{totalAdjusted} adjusted</span>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={() => toggleAll(!allVisibleSelected)} className="flex items-center justify-center text-slate-500 hover:text-indigo-600">
                      {allVisibleSelected
                        ? <CheckSquare size={16} className="text-indigo-600" />
                        : someVisibleSelected
                          ? <Minus size={16} className="text-indigo-400" />
                          : <Square size={16} />}
                    </button>
                  </th>
                  <th className="table-header text-left px-3 py-3">Customer</th>
                  <th className="table-header text-left px-3 py-3">Property</th>
                  <th className="table-header text-left px-3 py-3">Bank Account</th>
                  <th className="table-header text-left px-3 py-3">{balanceMode ? 'Oldest Invoice' : 'Invoice'}</th>
                  <th className="table-header text-center px-3 py-3">Status</th>
                  <th className="table-header text-right px-3 py-3">{balanceMode ? 'Total Outstanding' : 'Invoice Amt'}</th>
                  <th className="table-header text-right px-4 py-3">Debit Amount</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      {rows.length === 0
                        ? balanceMode ? 'No DDR customers have an outstanding balance' : `No DDR customers have invoices for ${monthName(abaMonth, abaYear)}`
                        : 'No results match your filters'}
                    </td>
                  </tr>
                )}
                {rows.map((row, idx) => {
                  if (!visibleIdxs.has(idx)) return null
                  const amountChanged = Math.abs(row.amount - row.invoiceAmount) > 0.001
                  return (
                    <tr key={row.invoiceId}
                      className={`border-b border-slate-100 transition-colors
                        ${row.selected ? 'bg-white' : 'bg-slate-50/60 opacity-60'}
                        hover:bg-indigo-50/20`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleRow(idx)} className="flex items-center justify-center text-slate-400 hover:text-indigo-600">
                          {row.selected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">{row.customerName}</p>
                        <p className="text-xs text-slate-400 font-mono">{row.bsb} / {row.accountNumber}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-slate-700">{row.buildingName}</p>
                        <p className="text-xs text-slate-400">Unit {row.unitNumber}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-slate-700">{row.bankName}</p>
                        <p className="text-xs text-slate-400 font-mono">{row.accountName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-mono text-indigo-600 font-medium">{row.invoiceNumber}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                          ${row.invoiceStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            row.invoiceStatus === 'sent' ? 'bg-indigo-100 text-indigo-700' :
                            row.invoiceStatus === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'}`}>
                          {row.invoiceStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-mono text-sm ${amountChanged ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {formatAUD(row.invoiceAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.editing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-slate-400 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={row.amountStr}
                              autoFocus
                              onBlur={e => commitEdit(idx, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitEdit(idx, (e.target as HTMLInputElement).value)
                                if (e.key === 'Escape') resetAmount(idx)
                              }}
                              className="w-24 text-right border border-indigo-400 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ) : (
                          <button onClick={() => startEdit(idx)}
                            className={`font-mono text-sm font-semibold hover:text-indigo-600 hover:underline transition-colors
                              ${amountChanged ? 'text-amber-700' : 'text-slate-900'}`}
                            title="Click to edit amount">
                            {formatAUD(row.amount)}
                            {amountChanged && <span className="ml-1 text-xs text-amber-500">(adj)</span>}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Action bar */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0 flex items-center gap-3">
            <div className="text-xs text-slate-500 mr-2">
              <span className="font-semibold text-slate-700">{selectedRows.length}</span> customers selected ·
              <span className="font-semibold text-indigo-700 ml-1">{formatAUD(totalSelected)}</span> to debit ·
              Process date: <span className="font-semibold text-slate-700">{processDate}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {selectedRows.some(r => r.invoiceStatus !== 'paid') && (
                <button onClick={handleMarkPaid}
                  disabled={!selectedRows.length}
                  className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 disabled:opacity-40 transition-colors">
                  <Check size={14} />Mark Selected as Paid
                </button>
              )}
              <button onClick={handleDownloadMYOBReceipts}
                disabled={!selectedRows.length}
                className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-40 transition-colors">
                <FileText size={14} />MYOB Receipts CSV
              </button>
              <button onClick={handleDownloadABA}
                disabled={!selectedRows.length}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                <Download size={14} />Download ABA File
                {selectedRows.length > 0 && <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">{selectedRows.length}</span>}
              </button>
            </div>
          </div>

          {/* Empty / warning states */}
          {rows.length === 0 && isLoaded && (
            <div className="px-6 pb-4">
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  {balanceMode
                    ? 'No DDR customers have an outstanding balance. Invoices must be in "sent" or "overdue" status to appear here.'
                    : <>No DDR invoices found for {monthName(abaMonth, abaYear)}.
                      Go to <Link href="/electricity/invoices" className="underline">Invoices</Link> to generate and send invoices first.</>
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MYOB TAB ────────────────────────────────────────────────────────── */}
      {tab === 'myob' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Month selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Billing Period:</label>
            <select value={`${myobYear}-${myobMonth}`}
              onChange={e => { const [y, m] = e.target.value.split('-'); setMyobYear(+y); setMyobMonth(+m) }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {MONTHS.map(opt => <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>)}
            </select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Invoices', value: myobMonthInvoices.length },
              { label: 'DDR', value: myobMonthInvoices.filter(i => { const c = customers.find(c => c.id === i.customerId); return c?.paymentMethod === 'direct_debit' }).length },
              { label: 'Paid', value: myobMonthInvoices.filter(i => i.status === 'paid').length },
              { label: 'Total Customers', value: customers.length },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{s.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">MYOB AccountRight</h2>
                <p className="text-xs text-slate-400">Import-ready CSV files for {monthName(myobMonth, myobYear)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: 'Customer Cards',
                  desc: `${customers.length} customers — create or update customer cards in MYOB`,
                  note: 'Includes bank/BSB details for DDR authorisation setup',
                  icon: Users,
                  color: 'bg-indigo-50 text-indigo-600',
                  action: handleMYOBCustomers,
                },
                {
                  label: 'Sales Invoices',
                  desc: `${myobMonthInvoices.length} invoices for ${monthName(myobMonth, myobYear)}`,
                  note: 'Import into MYOB Sales → Enter Sales',
                  icon: FileText,
                  color: 'bg-purple-50 text-purple-600',
                  action: handleMYOBInvoices,
                },
                {
                  label: 'Receipts (Paid invoices)',
                  desc: `${myobMonthInvoices.filter(i => i.status === 'paid').length} paid invoices`,
                  note: 'Import into MYOB Sales → Receive Payments — use after marking invoices paid',
                  icon: CreditCard,
                  color: 'bg-emerald-50 text-emerald-600',
                  action: handleMYOBReceipts,
                },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>
                  </div>
                  <Download size={15} className="text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-700 font-medium mb-1">Recommended DDR workflow in MYOB:</p>
              <ol className="text-xs text-blue-600 space-y-1 list-none">
                {[
                  'Import Sales Invoices to create the invoice records',
                  'After ABA processes, go to ABA tab → Download MYOB Receipts CSV',
                  'Import Receipts CSV into MYOB Receive Payments',
                  'Alternatively use the "Receipts (Paid)" export above after marking invoices paid here',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Building breakdown */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Building Breakdown — {monthName(myobMonth, myobYear)}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header text-left pb-2">Building</th>
                  <th className="table-header text-right pb-2">Invoices</th>
                  <th className="table-header text-right pb-2">DDR</th>
                  <th className="table-header text-right pb-2">Paid</th>
                  <th className="table-header text-right pb-2">Total Billed</th>
                  <th className="table-header text-right pb-2">Collected</th>
                  <th className="table-header text-right pb-2">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map(b => {
                  const bInvs = myobMonthInvoices.filter(i => i.buildingId === b.id)
                  const bDDR  = bInvs.filter(i => custMap.get(i.customerId)?.paymentMethod === 'direct_debit' && i.status === 'sent')
                  const bPaid = bInvs.filter(i => i.status === 'paid')
                  const bTotal = bInvs.reduce((s, i) => s + i.total, 0)
                  const bCollected = bPaid.reduce((s, i) => s + i.total, 0)
                  return (
                    <tr key={b.id} className="data-row">
                      <td className="py-2.5 flex items-center gap-2">
                        <Building2 size={13} className="text-slate-400" />
                        <span className="font-medium text-slate-800">{b.name}</span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600">{bInvs.length}</td>
                      <td className="py-2.5 text-right text-slate-600">{bDDR.length}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-medium">{bPaid.length}</td>
                      <td className="py-2.5 text-right font-mono text-slate-800">{formatAUD(bTotal)}</td>
                      <td className="py-2.5 text-right font-mono text-emerald-700">{formatAUD(bCollected)}</td>
                      <td className="py-2.5 text-right font-mono text-amber-700">{formatAUD(bTotal - bCollected)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td className="pt-2.5 font-semibold text-slate-700">Total</td>
                  <td className="pt-2.5 text-right font-semibold">{myobMonthInvoices.length}</td>
                  <td className="pt-2.5 text-right font-semibold">{myobMonthInvoices.filter(i => custMap.get(i.customerId)?.paymentMethod === 'direct_debit').length}</td>
                  <td className="pt-2.5 text-right font-semibold text-emerald-700">{myobMonthInvoices.filter(i => i.status === 'paid').length}</td>
                  <td className="pt-2.5 text-right font-mono font-bold">{formatAUD(myobMonthInvoices.reduce((s, i) => s + i.total, 0))}</td>
                  <td className="pt-2.5 text-right font-mono font-bold text-emerald-700">{formatAUD(myobMonthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0))}</td>
                  <td className="pt-2.5 text-right font-mono font-bold text-amber-700">{formatAUD(myobMonthInvoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── EZIDEBIT TAB ────────────────────────────────────────────────────── */}
      {tab === 'ezidebit' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* How-it-works banner */}
          <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-indigo-800 space-y-1">
              <p className="font-semibold text-sm">Two-step Ezidebit workflow</p>
              <p><span className="font-semibold">Step 1 (once):</span> Export &amp; upload the <span className="font-semibold">Customer Registration</span> file to Ezidebit → Customers → Import. This registers your tenants in Ezidebit so they can hold the bank details.</p>
              <p><span className="font-semibold">Step 2 (monthly):</span> Export the <span className="font-semibold">Payment Batch</span> for each billing period and upload to Ezidebit → Payments → Upload Payment File. Ezidebit debits each customer for their invoice amount on the specified date.</p>
              <p className="text-indigo-600">Once all customers are registered in Ezidebit, you can remove bank details from this app and store only the Ezidebit Customer ID against each tenant.</p>
            </div>
          </div>

          {/* ── Payment Batch ── */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Download size={20} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Payment Batch</h2>
                <p className="text-xs text-slate-400">Monthly CSV uploaded to Ezidebit → Payments → Upload Payment File</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Billing Period</label>
                <select value={`${eziYear}-${eziMonth}`}
                  onChange={e => { const [y, m] = e.target.value.split('-'); setEziYear(+y); setEziMonth(+m) }}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MONTHS.map(opt => <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Debit Date</label>
                <input type="date" value={eziProcessDate} onChange={e => setEziProcessDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Include Statuses</label>
                <div className="flex gap-2">
                  {['sent','overdue','draft'].map(s => (
                    <button key={s} onClick={() => toggleEziStatus(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        eziStatuses.includes(s)
                          ? s === 'draft' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary table */}
            {eziEligibleInvoices.length > 0 ? (
              <>
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="table-header text-left px-4 py-2.5">Customer</th>
                        <th className="table-header text-left px-4 py-2.5">Bank Account</th>
                        <th className="table-header text-left px-4 py-2.5">Invoice</th>
                        <th className="table-header text-center px-4 py-2.5">Status</th>
                        <th className="table-header text-right px-4 py-2.5">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eziEligibleInvoices.map(inv => {
                        const c = custMap.get(inv.customerId)
                        if (!c) return null
                        return (
                          <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-slate-800 text-xs">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-slate-400">{c.email}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="text-xs text-slate-700">{c.accountName}</p>
                              <p className="font-mono text-xs text-slate-400">{c.bsb.replace(/[^0-9]/g,'').slice(0,6)} / {c.accountNumber}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="font-mono text-xs text-indigo-600">{inv.invoiceNumber}</p>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                inv.status === 'sent' ? 'bg-indigo-100 text-indigo-700' :
                                inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-600'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-slate-900">
                              {formatAUD(inv.total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={4} className="px-4 py-2.5 text-sm font-semibold text-slate-700">
                          {eziEligibleInvoices.length} transactions · Debit date: {eziProcessDate}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-700">
                          {formatAUD(eziEligibleInvoices.reduce((s, i) => s + i.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <button onClick={handleEziPaymentBatch}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                  <Download size={15} />Download Payment Batch CSV
                  <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">{eziEligibleInvoices.length}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500">
                <AlertCircle size={15} className="text-slate-400 flex-shrink-0" />
                No DDR invoices with status [{eziStatuses.join(', ')}] for {monthName(eziMonth, eziYear)}.
              </div>
            )}
          </div>

          {/* ── Customer Registration ── */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Customer Registration</h2>
                <p className="text-xs text-slate-400">One-time export — upload to Ezidebit → Customers → Import Customers</p>
              </div>
            </div>

            {(() => {
              const ddrCustomers = customers.filter(c => c.paymentMethod === 'direct_debit' && !c.moveOutDate)
              return (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                      { label: 'DDR Customers', value: ddrCustomers.length, color: 'text-slate-900' },
                      { label: 'With Bank Details', value: ddrCustomers.filter(c => c.bsb && c.accountNumber).length, color: 'text-emerald-700' },
                      { label: 'Missing Bank Details', value: ddrCustomers.filter(c => !c.bsb || !c.accountNumber).length, color: 'text-amber-600' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-xs text-amber-800">
                    <p className="font-semibold mb-1">What happens after you import this file into Ezidebit:</p>
                    <ol className="space-y-1 list-none">
                      {[
                        'Ezidebit registers each customer with BillingCycleCode=M (monthly, variable amount)',
                        'Ezidebit securely stores the bank details — you can then remove them from this app',
                        'Going forward, upload a Payment Batch CSV each month with the invoice amounts',
                        'Ezidebit debits each customer and you reconcile payments back here',
                      ].map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <button onClick={handleEziCustomerReg}
                    disabled={ddrCustomers.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 transition-colors">
                    <Download size={15} />Download Customer Registration CSV
                    <span className="bg-violet-500 text-white text-xs px-1.5 py-0.5 rounded-full">{ddrCustomers.length}</span>
                  </button>
                </>
              )
            })()}
          </div>

          {/* Column reference */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">CSV Column Reference</h3>
            <div className="grid grid-cols-2 gap-6 text-xs text-slate-600">
              <div>
                <p className="font-semibold text-slate-700 mb-2">Payment Batch columns</p>
                {[
                  ['YourSystemReference', 'Your customer ID — used to match to Ezidebit customer'],
                  ['DebitDate', 'DD/MM/YYYY — when Ezidebit processes the debit'],
                  ['PaymentAmountInCents', 'Invoice total in cents (e.g. 12550 = $125.50)'],
                  ['YourPaymentReference', 'Invoice number — appears on bank statement'],
                  ['PaymentDescription', 'Billing period description'],
                ].map(([col, desc]) => (
                  <div key={col} className="flex gap-2 py-1 border-b border-slate-100">
                    <span className="font-mono text-indigo-600 w-44 flex-shrink-0">{col}</span>
                    <span className="text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-2">Customer Registration columns</p>
                {[
                  ['YourSystemReference', 'Your customer ID — keep this to match future payments'],
                  ['BankBSBNumber', '6 digits, no dash (e.g. 063123)'],
                  ['BillingCycleCode', 'M = monthly variable amount (set per payment batch)'],
                  ['PaymentAmountInCents', '0 = variable; Ezidebit uses amount from payment batch'],
                  ['FirstScheduledPaymentDate', 'Registration date; actual debits set per batch'],
                ].map(([col, desc]) => (
                  <div key={col} className="flex gap-2 py-1 border-b border-slate-100">
                    <span className="font-mono text-violet-600 w-44 flex-shrink-0">{col}</span>
                    <span className="text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
