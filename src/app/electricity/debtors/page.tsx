'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, Mail, Phone, FileText, CheckCircle2, Calendar,
  DollarSign, ChevronDown, ChevronUp, X, AlertCircle,
  Download, Send, Clock, Users, TrendingDown, Check, Loader2,
  StickyNote, ShieldAlert, Search, type LucideIcon,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { formatAUD, monthName } from '@/lib/electricityUtils'
import type {
  DebtorComm, DebtorStatus, PaymentPlan, DebtorStatusType,
} from '@/lib/electricityTypes'

// ──────── Local types ────────

type AgingBucket = 'early' | 'moderate' | 'serious' | 'critical'
type View = 'overview' | 'debtors' | 'history'
type CommType = DebtorComm['type']

interface DebtorRecord {
  invoice: import('@/lib/electricityTypes').ElectricityInvoice
  customer: import('@/lib/electricityTypes').Customer
  apt: import('@/lib/electricityTypes').Apartment
  building: import('@/lib/electricityTypes').Building | undefined
  daysOverdue: number
  agingBucket: AgingBucket
  debtorStatus: DebtorStatus | null
  comms: DebtorComm[]
  emailCommsCount: number
  lastContact: DebtorComm | null
  nextStage: 1 | 2 | 3 | 4
  plan: PaymentPlan | null
}

// ──────── Config ────────

function getAgingBucket(days: number): AgingBucket {
  if (days <= 7) return 'early'
  if (days <= 14) return 'moderate'
  if (days <= 29) return 'serious'
  return 'critical'
}

function getNextStage(emailCount: number): 1 | 2 | 3 | 4 {
  if (emailCount === 0) return 1
  if (emailCount === 1) return 2
  if (emailCount === 2) return 3
  return 4
}

function stageEmailType(stage: 1 | 2 | 3): CommType {
  if (stage === 1) return 'reminder_1'
  if (stage === 2) return 'reminder_2'
  return 'final_notice'
}

const STAGE_CFG = {
  1: { label: '1st Reminder',  color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200',    btn: 'bg-sky-500 hover:bg-sky-600' },
  2: { label: '2nd Reminder',  color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  btn: 'bg-amber-500 hover:bg-amber-600' },
  3: { label: 'Final Notice',  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', btn: 'bg-orange-500 hover:bg-orange-600' },
  4: { label: 'Escalate',      color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    btn: 'bg-red-500 hover:bg-red-600' },
} as const

const AGING_CFG: Record<AgingBucket, { label: string; bar: string; bg: string; text: string; dot: string }> = {
  early:    { label: '1–7 days',   bar: 'bg-sky-400',    bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400' },
  moderate: { label: '8–14 days',  bar: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  serious:  { label: '15–29 days', bar: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { label: '30+ days',   bar: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
}

const STATUS_CFG: Record<DebtorStatusType, { label: string; color: string; bg: string }> = {
  active:       { label: 'Active',       color: 'text-slate-700',  bg: 'bg-slate-100' },
  disputed:     { label: 'In Dispute',   color: 'text-amber-700',  bg: 'bg-amber-100' },
  payment_plan: { label: 'Payment Plan', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  hardship:     { label: 'Hardship',     color: 'text-purple-700', bg: 'bg-purple-100' },
  recovery:     { label: 'Recovery',     color: 'text-orange-700', bg: 'bg-orange-100' },
  written_off:  { label: 'Written Off',  color: 'text-red-700',    bg: 'bg-red-100' },
}

const COMM_CFG: Record<CommType, { label: string; icon: LucideIcon; color: string }> = {
  reminder_1:       { label: '1st Reminder Sent',    icon: Mail,          color: 'text-sky-600' },
  reminder_2:       { label: '2nd Reminder Sent',    icon: Mail,          color: 'text-amber-600' },
  final_notice:     { label: 'Final Notice Sent',    icon: AlertTriangle, color: 'text-orange-600' },
  note:             { label: 'Note Added',           icon: StickyNote,    color: 'text-slate-500' },
  call:             { label: 'Phone Call Logged',    icon: Phone,         color: 'text-indigo-600' },
  dispute_raised:   { label: 'Dispute Raised',       icon: AlertCircle,   color: 'text-amber-600' },
  dispute_resolved: { label: 'Dispute Resolved',     icon: CheckCircle2,  color: 'text-emerald-600' },
  plan_created:     { label: 'Payment Plan Created', icon: Calendar,      color: 'text-indigo-600' },
  payment_received: { label: 'Payment Received',     icon: DollarSign,    color: 'text-emerald-600' },
  sent_to_recovery: { label: 'Sent to Recovery',     icon: ShieldAlert,   color: 'text-red-600' },
}

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ──────── Page ────────

export default function DebtorsPage() {
  const {
    invoices, customers, apartments, buildings, settings, updateInvoice,
    debtorComms, debtorStatuses, paymentPlans,
    addDebtorComm, setDebtorStatus, upsertPaymentPlan,
    isLoaded,
  } = useElectricity()

  const [view,           setView]           = useState<View>('overview')
  const [buildingFilter, setBuildingFilter] = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [agingFilter,    setAgingFilter]    = useState('')
  const [search,         setSearch]         = useState('')
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [noteInputs,     setNoteInputs]     = useState<Record<string, string>>({})
  const [callInputs,     setCallInputs]     = useState<Record<string, string>>({})
  const [planModal,      setPlanModal]      = useState<DebtorRecord | null>(null)
  const [planForm,       setPlanForm]       = useState({ amount: '', freq: 'fortnightly' as 'weekly' | 'fortnightly' | 'monthly', startDate: new Date().toISOString().split('T')[0], notes: '' })
  const [sending,        setSending]        = useState<string | null>(null)
  const [bulkSending,    setBulkSending]    = useState(false)
  const [bulkProgress,   setBulkProgress]   = useState<{ done: number; total: number } | null>(null)
  const [toast,          setToast]          = useState('')

  const today = useMemo(() => new Date(), [])

  const aptMap  = useMemo(() => new Map(apartments.map(a => [a.id, a])),  [apartments])
  const custMap = useMemo(() => new Map(customers.map(c => [c.id, c])),   [customers])
  const bldMap  = useMemo(() => new Map(buildings.map(b => [b.id, b])),   [buildings])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  // Build debtor records from all outstanding invoices
  const debtorRecords = useMemo((): DebtorRecord[] => {
    const result: DebtorRecord[] = []
    invoices.forEach(inv => {
      if (inv.status === 'cancelled' || inv.status === 'draft' || inv.status === 'paid') return
      if (inv.status !== 'overdue' && !(inv.status === 'sent' && new Date(inv.dueDate + 'T00:00:00') < today)) return
      const customer = custMap.get(inv.customerId)
      const apt      = aptMap.get(inv.apartmentId)
      if (!customer || !apt) return
      const building    = bldMap.get(inv.buildingId)
      const daysOverdue = Math.max(1, Math.floor((today.getTime() - new Date(inv.dueDate + 'T00:00:00').getTime()) / 86400000))
      const agingBucket = getAgingBucket(daysOverdue)
      const comms = debtorComms.filter(c => c.invoiceId === inv.id).sort((a, b) => b.date.localeCompare(a.date))
      const emailCommsCount = comms.filter(c => c.type === 'reminder_1' || c.type === 'reminder_2' || c.type === 'final_notice').length
      const nextStage    = getNextStage(emailCommsCount)
      const debtorStatus = debtorStatuses.find(s => s.invoiceId === inv.id) ?? null
      const plan         = paymentPlans.find(p => p.invoiceId === inv.id && p.status === 'active') ?? null
      const lastContact: DebtorComm | null = comms[0] ?? null
      result.push({ invoice: inv, customer, apt, building, daysOverdue, agingBucket, debtorStatus, comms, emailCommsCount, lastContact, nextStage, plan })
    })
    return result.sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [invoices, custMap, aptMap, bldMap, debtorComms, debtorStatuses, paymentPlans, today])

  const filteredRecords = useMemo(() => debtorRecords.filter(r => {
    if (buildingFilter && r.invoice.buildingId !== buildingFilter) return false
    if (statusFilter && (r.debtorStatus?.status ?? 'active') !== statusFilter) return false
    if (agingFilter && r.agingBucket !== agingFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${r.customer.firstName} ${r.customer.lastName}`.toLowerCase()
      if (!name.includes(q) && !r.invoice.invoiceNumber.toLowerCase().includes(q)) return false
    }
    return true
  }), [debtorRecords, buildingFilter, statusFilter, agingFilter, search])

  const agingStats = useMemo(() => {
    const b: Record<AgingBucket, { count: number; amount: number }> = {
      early: { count: 0, amount: 0 }, moderate: { count: 0, amount: 0 },
      serious: { count: 0, amount: 0 }, critical: { count: 0, amount: 0 },
    }
    debtorRecords.forEach(r => { b[r.agingBucket].count++; b[r.agingBucket].amount += r.invoice.total })
    return b
  }, [debtorRecords])

  const totalOverdue = useMemo(() => debtorRecords.reduce((s, r) => s + r.invoice.total, 0), [debtorRecords])
  const avgDays      = useMemo(() => debtorRecords.length ? Math.round(debtorRecords.reduce((s, r) => s + r.daysOverdue, 0) / debtorRecords.length) : 0, [debtorRecords])

  const stageQueue = useMemo(() => {
    const q: Record<1 | 2 | 3 | 4, DebtorRecord[]> = { 1: [], 2: [], 3: [], 4: [] }
    debtorRecords.forEach(r => {
      if ((r.debtorStatus?.status ?? 'active') === 'active') q[r.nextStage].push(r)
    })
    return q
  }, [debtorRecords])

  // ──────── Actions ────────

  async function sendReminder(record: DebtorRecord) {
    if (record.nextStage === 4) return
    const stage = record.nextStage as 1 | 2 | 3
    const { invoice: inv, customer: cust } = record
    setSending(inv.id)
    try {
      const res = await fetch('/api/send-overdue-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cust.email,
          customerFirstName: cust.firstName,
          invoiceNumber: inv.invoiceNumber,
          period: monthName(inv.month, inv.year),
          dueDate: inv.dueDate,
          daysPastDue: record.daysOverdue,
          total: inv.total,
          isDDR: cust.paymentMethod === 'direct_debit',
          bpayBillerCode: settings.bpayBillerCode,
          bankBSB: settings.bsb,
          bankAccount: settings.accountNumber,
          bankAccountName: settings.accountName,
          bankName: settings.bankName,
          companyName: settings.companyName,
          companyEmail: settings.email,
          companyPhone: settings.phone,
          fromEmail: settings.senderEmail,
        }),
      })
      if (res.ok) {
        addDebtorComm({ id: `comm-${Date.now()}`, invoiceId: inv.id, customerId: cust.id, date: new Date().toISOString(), type: stageEmailType(stage), notes: `Sent to ${cust.email}` })
        showToast(`${STAGE_CFG[stage].label} sent to ${cust.firstName}`)
      } else {
        showToast('Failed — check email configuration')
      }
    } catch { showToast('Send failed') }
    finally { setSending(null) }
  }

  async function sendBulkReminders(stage: 1 | 2 | 3) {
    const eligible = stageQueue[stage]
    if (!eligible.length) return
    setBulkSending(true)
    setBulkProgress({ done: 0, total: eligible.length })
    let sent = 0, failed = 0
    for (const record of eligible) {
      const { invoice: inv, customer: cust } = record
      try {
        const res = await fetch('/api/send-overdue-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cust.email, customerFirstName: cust.firstName,
            invoiceNumber: inv.invoiceNumber, period: monthName(inv.month, inv.year),
            dueDate: inv.dueDate, daysPastDue: record.daysOverdue, total: inv.total,
            isDDR: cust.paymentMethod === 'direct_debit',
            bpayBillerCode: settings.bpayBillerCode, bankBSB: settings.bsb,
            bankAccount: settings.accountNumber, bankAccountName: settings.accountName, bankName: settings.bankName,
            companyName: settings.companyName, companyEmail: settings.email,
            companyPhone: settings.phone, fromEmail: settings.senderEmail,
          }),
        })
        if (res.ok) {
          addDebtorComm({ id: `comm-${Date.now()}-${inv.id}`, invoiceId: inv.id, customerId: cust.id, date: new Date().toISOString(), type: stageEmailType(stage), notes: `Bulk send to ${cust.email}` })
          sent++
        } else { failed++ }
      } catch { failed++ }
      setBulkProgress({ done: sent + failed, total: eligible.length })
    }
    setBulkSending(false)
    setBulkProgress(null)
    showToast(failed ? `Sent ${sent}, failed ${failed}` : `${sent} ${STAGE_CFG[stage].label}${sent !== 1 ? 's' : ''} sent`)
  }

  function logComm(invoiceId: string, customerId: string, type: 'note' | 'call') {
    const text = type === 'note' ? noteInputs[invoiceId] : callInputs[invoiceId]
    if (!text?.trim()) return
    addDebtorComm({ id: `comm-${Date.now()}`, invoiceId, customerId, date: new Date().toISOString(), type, notes: text.trim() })
    if (type === 'note') setNoteInputs(p => ({ ...p, [invoiceId]: '' }))
    else setCallInputs(p => ({ ...p, [invoiceId]: '' }))
    showToast(type === 'note' ? 'Note added' : 'Call logged')
  }

  function changeStatus(record: DebtorRecord, status: DebtorStatusType) {
    const prev = record.debtorStatus?.status ?? 'active'
    setDebtorStatus({ invoiceId: record.invoice.id, status, updatedAt: new Date().toISOString() })
    const commType: CommType | null =
      status === 'disputed' && prev !== 'disputed' ? 'dispute_raised' :
      status === 'active' && prev === 'disputed'   ? 'dispute_resolved' :
      status === 'recovery'                         ? 'sent_to_recovery' : null
    if (commType) {
      addDebtorComm({ id: `comm-${Date.now()}`, invoiceId: record.invoice.id, customerId: record.customer.id, date: new Date().toISOString(), type: commType })
    }
    showToast(`Status → ${STATUS_CFG[status].label}`)
  }

  function markPaid(record: DebtorRecord) {
    const paidDate = new Date().toISOString().split('T')[0]
    updateInvoice({ ...record.invoice, status: 'paid', paidDate, paidAmount: record.invoice.total })
    addDebtorComm({ id: `comm-${Date.now()}`, invoiceId: record.invoice.id, customerId: record.customer.id, date: new Date().toISOString(), type: 'payment_received', notes: `${formatAUD(record.invoice.total)} marked paid` })
    showToast(`Invoice ${record.invoice.invoiceNumber} marked paid`)
  }

  function savePlan() {
    if (!planModal || !planForm.amount || !planForm.startDate) return
    const plan: PaymentPlan = {
      id: `plan-${Date.now()}`,
      invoiceId: planModal.invoice.id,
      customerId: planModal.customer.id,
      totalAmount: planModal.invoice.total,
      instalmentAmount: parseFloat(planForm.amount),
      frequency: planForm.freq,
      startDate: planForm.startDate,
      notes: planForm.notes,
      status: 'active',
    }
    upsertPaymentPlan(plan)
    setDebtorStatus({ invoiceId: planModal.invoice.id, status: 'payment_plan', updatedAt: new Date().toISOString() })
    addDebtorComm({ id: `comm-${Date.now()}`, invoiceId: planModal.invoice.id, customerId: planModal.customer.id, date: new Date().toISOString(), type: 'plan_created', notes: `${formatAUD(parseFloat(planForm.amount))} ${planForm.freq} from ${planForm.startDate}${planForm.notes ? ` — ${planForm.notes}` : ''}` })
    setPlanModal(null)
    showToast('Payment plan created')
  }

  function exportCSV() {
    const rows = [
      ['Tenant', 'Email', 'Building', 'Unit', 'Invoice', 'Due Date', 'Days Overdue', 'Amount', 'Status', 'Stage', 'Last Contact'],
      ...debtorRecords.map(r => [
        `${r.customer.firstName} ${r.customer.lastName}`, r.customer.email,
        r.building?.name ?? '', r.apt.unitNumber, r.invoice.invoiceNumber,
        r.invoice.dueDate, r.daysOverdue.toString(), r.invoice.total.toFixed(2),
        r.debtorStatus?.status ?? 'active', `Stage ${r.nextStage}`,
        r.lastContact?.date.split('T')[0] ?? '—',
      ]),
    ]
    const csv = rows.map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `debtors-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading…</div></div>

  // ──────── Render ────────
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-500" />Debtor Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {debtorRecords.length} outstanding accounts · {formatAUD(totalOverdue)} total
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
          <Download size={14} />Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">{formatAUD(totalOverdue)}</p>
          <p className="text-xs text-slate-400 mt-1">across all open accounts</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Open Debtors</p>
          <p className="text-2xl font-bold text-slate-900">{debtorRecords.length}</p>
          <p className="text-xs text-slate-400 mt-1">unique accounts</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Avg. Days Overdue</p>
          <p className="text-2xl font-bold text-amber-700">{avgDays}</p>
          <p className="text-xs text-slate-400 mt-1">average across all debtors</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Critical (30d+)</p>
          <p className="text-2xl font-bold text-red-700">{agingStats.critical.count}</p>
          <p className="text-xs text-slate-400 mt-1">{formatAUD(agingStats.critical.amount)} · immediate action</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: 'overview', label: 'Overview',                      icon: TrendingDown },
          { id: 'debtors',  label: `Debtors (${debtorRecords.length})`, icon: Users },
          { id: 'history',  label: `History (${debtorComms.length})`,   icon: Clock },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${view === t.id ? 'text-indigo-700 bg-white border border-slate-200 border-b-white -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ════════ OVERVIEW ════════ */}
      {view === 'overview' && (
        <div className="space-y-5">
          {/* Aging Analysis */}
          <div className="card p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Aging Analysis</p>
            <div className="space-y-4">
              {(['early', 'moderate', 'serious', 'critical'] as AgingBucket[]).map(bucket => {
                const cfg  = AGING_CFG[bucket]
                const stat = agingStats[bucket]
                const maxCount = Math.max(...Object.values(agingStats).map(s => s.count), 1)
                return (
                  <div key={bucket} className="flex items-center gap-4">
                    <div className="w-24 text-right shrink-0">
                      <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${cfg.bar} rounded-full transition-all`}
                        style={{ width: stat.count ? `${Math.round((stat.count / maxCount) * 100)}%` : '0%' }} />
                    </div>
                    <div className="w-44 flex items-center gap-2 text-sm shrink-0">
                      <span className="font-semibold text-slate-800">{stat.count} debtor{stat.count !== 1 ? 's' : ''}</span>
                      <span className="text-slate-400 text-xs">{formatAUD(stat.amount)}</span>
                    </div>
                    <button onClick={() => { setView('debtors'); setAgingFilter(bucket) }}
                      className={`text-xs px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.text} hover:opacity-80 shrink-0`}>
                      View →
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Queue */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Action Queue</p>
              {debtorRecords.length > 0 && (
                <p className="text-xs text-slate-500">
                  {stageQueue[1].length + stageQueue[2].length + stageQueue[3].length} actions pending
                </p>
              )}
            </div>

            {debtorRecords.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
                <p className="font-medium text-slate-600">No outstanding debtors</p>
                <p className="text-xs mt-1">All invoices are up to date</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {([1, 2, 3] as const).map(stage => {
                  const records = stageQueue[stage]
                  const cfg = STAGE_CFG[stage]
                  return (
                    <div key={stage} className={`rounded-xl p-4 border ${cfg.border} ${cfg.bg}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {records.length} debtor{records.length !== 1 ? 's' : ''} · {formatAUD(records.reduce((s, r) => s + r.invoice.total, 0))}
                          </p>
                        </div>
                        {records.length > 0 && (
                          <button onClick={() => sendBulkReminders(stage)} disabled={bulkSending}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white ${cfg.btn} disabled:opacity-50 transition-colors`}>
                            {bulkSending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                            Send All ({records.length})
                          </button>
                        )}
                      </div>
                      {records.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">None due</p>
                      ) : (
                        records.slice(0, 5).map(r => (
                          <div key={r.invoice.id} className="flex justify-between items-center py-1.5 text-xs border-t border-black/5">
                            <span className="font-medium text-slate-700 truncate">{r.customer.firstName} {r.customer.lastName}</span>
                            <span className="text-slate-500 shrink-0 ml-2">{r.daysOverdue}d · {formatAUD(r.invoice.total)}</span>
                          </div>
                        ))
                      )}
                      {records.length > 5 && <p className="text-xs text-slate-400 mt-1 pt-1 border-t border-black/5">+{records.length - 5} more</p>}
                    </div>
                  )
                })}

                {/* Recovery escalation */}
                {stageQueue[4].length > 0 && (
                  <div className={`rounded-xl p-4 border ${STAGE_CFG[4].border} ${STAGE_CFG[4].bg}`}>
                    <p className={`text-sm font-bold ${STAGE_CFG[4].color} mb-1`}>Escalate to Recovery</p>
                    <p className="text-xs text-slate-500 mb-3">
                      {stageQueue[4].length} debtor{stageQueue[4].length !== 1 ? 's' : ''} · {formatAUD(stageQueue[4].reduce((s, r) => s + r.invoice.total, 0))}
                    </p>
                    {stageQueue[4].slice(0, 5).map(r => (
                      <div key={r.invoice.id} className="flex justify-between items-center py-1.5 text-xs border-t border-black/5">
                        <span className="font-medium text-slate-700">{r.customer.firstName} {r.customer.lastName}</span>
                        <span className="text-red-600 font-semibold">{r.daysOverdue}d overdue</span>
                      </div>
                    ))}
                    {stageQueue[4].length > 5 && <p className="text-xs text-slate-400 mt-1">+{stageQueue[4].length - 5} more</p>}
                    <button onClick={() => { setView('debtors'); setStatusFilter('') }}
                      className="mt-3 text-xs text-red-600 underline">View all in Debtors →</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bulk progress */}
          {bulkProgress && (
            <div className="card p-4 flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" />
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
              </div>
              <span className="text-sm text-slate-600 shrink-0">{bulkProgress.done}/{bulkProgress.total} sent</span>
            </div>
          )}
        </div>
      )}

      {/* ════════ DEBTORS TABLE ════════ */}
      {view === 'debtors' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative min-w-48 max-w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, invoice…"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All Buildings</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_CFG) as DebtorStatusType[]).map(s => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>
            <select value={agingFilter} onChange={e => setAgingFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All Aging</option>
              {(['early', 'moderate', 'serious', 'critical'] as AgingBucket[]).map(b => (
                <option key={b} value={b}>{AGING_CFG[b].label}</option>
              ))}
            </select>
            {(buildingFilter || statusFilter || agingFilter || search) && (
              <button onClick={() => { setBuildingFilter(''); setStatusFilter(''); setAgingFilter(''); setSearch('') }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                <X size={12} />Clear
              </button>
            )}
            <span className="text-xs text-slate-400 ml-auto">
              {filteredRecords.length} debtor{filteredRecords.length !== 1 ? 's' : ''} · {formatAUD(filteredRecords.reduce((s, r) => s + r.invoice.total, 0))}
            </span>
          </div>

          {/* Debtor cards */}
          <div className="space-y-2">
            {filteredRecords.length === 0 && (
              <div className="card p-12 text-center text-slate-400">
                <AlertTriangle size={32} className="mx-auto mb-2 text-slate-300" />
                {debtorRecords.length === 0 ? 'No outstanding debtors — all clear!' : 'No debtors match the filters'}
              </div>
            )}
            {filteredRecords.map(record => {
              const isExpanded = expandedId === record.invoice.id
              const ageCfg    = AGING_CFG[record.agingBucket]
              const stageCfg  = STAGE_CFG[record.nextStage]
              const statusCfg = STATUS_CFG[record.debtorStatus?.status ?? 'active']
              const isActive  = (record.debtorStatus?.status ?? 'active') === 'active'

              return (
                <div key={record.invoice.id} className="card overflow-hidden">
                  {/* Summary row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ageCfg.dot}`} title={ageCfg.label} />

                    {/* Tenant */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm leading-tight">{record.customer.firstName} {record.customer.lastName}</p>
                      <p className="text-xs text-slate-400">{record.building?.name} · Unit {record.apt.unitNumber}</p>
                    </div>

                    {/* Invoice */}
                    <div className="w-32 hidden lg:block shrink-0">
                      <Link href={`/electricity/invoices/${record.invoice.id}`} className="text-xs text-indigo-600 hover:underline font-mono">
                        {record.invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-slate-400">Due {record.invoice.dueDate}</p>
                    </div>

                    {/* Aging badge */}
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 ${ageCfg.bg} ${ageCfg.text}`}>
                      {record.daysOverdue}d
                    </span>

                    {/* Amount */}
                    <p className="font-bold text-slate-900 w-24 text-right shrink-0">{formatAUD(record.invoice.total)}</p>

                    {/* Debtor status */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusCfg.bg} ${statusCfg.color} hidden md:block`}>
                      {statusCfg.label}
                    </span>

                    {/* Next stage */}
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium shrink-0 ${stageCfg.bg} ${stageCfg.color} border ${stageCfg.border} hidden lg:block`}>
                      → {stageCfg.label}
                    </span>

                    {/* Quick send button */}
                    {record.nextStage < 4 && isActive && (
                      <button onClick={() => sendReminder(record)} disabled={sending === record.invoice.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 shrink-0">
                        {sending === record.invoice.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        Send
                      </button>
                    )}

                    <button onClick={() => setExpandedId(isExpanded ? null : record.invoice.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded shrink-0">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-5">
                      <div className="grid grid-cols-3 gap-5">
                        {/* Timeline */}
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Communication History</p>
                          {record.comms.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No communications logged yet</p>
                          ) : (
                            <div className="space-y-2.5">
                              {record.comms.slice(0, 10).map(comm => {
                                const cfg  = COMM_CFG[comm.type]
                                const Icon = cfg.icon
                                return (
                                  <div key={comm.id} className="flex items-start gap-2.5 text-xs">
                                    <Icon size={13} className={`shrink-0 mt-0.5 ${cfg.color}`} />
                                    <div className="min-w-0">
                                      <span className="font-semibold text-slate-700">{cfg.label}</span>
                                      {comm.notes && <span className="text-slate-400 ml-2">— {comm.notes}</span>}
                                      <div className="text-slate-300 mt-0.5">{fmtTs(comm.date)}</div>
                                    </div>
                                  </div>
                                )
                              })}
                              {record.comms.length > 10 && (
                                <p className="text-xs text-slate-400">+{record.comms.length - 10} older entries</p>
                              )}
                            </div>
                          )}

                          {/* Log note */}
                          <div className="mt-4 flex gap-2">
                            <input
                              value={noteInputs[record.invoice.id] ?? ''}
                              onChange={e => setNoteInputs(p => ({ ...p, [record.invoice.id]: e.target.value }))}
                              placeholder="Add a note…"
                              onKeyDown={e => e.key === 'Enter' && logComm(record.invoice.id, record.customer.id, 'note')}
                              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <button onClick={() => logComm(record.invoice.id, record.customer.id, 'note')}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                              <StickyNote size={12} />
                            </button>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={callInputs[record.invoice.id] ?? ''}
                              onChange={e => setCallInputs(p => ({ ...p, [record.invoice.id]: e.target.value }))}
                              placeholder="Log a phone call…"
                              onKeyDown={e => e.key === 'Enter' && logComm(record.invoice.id, record.customer.id, 'call')}
                              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <button onClick={() => logComm(record.invoice.id, record.customer.id, 'call')}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                              <Phone size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Actions panel */}
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Debtor Status</label>
                              <select value={record.debtorStatus?.status ?? 'active'}
                                onChange={e => changeStatus(record, e.target.value as DebtorStatusType)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                {(Object.keys(STATUS_CFG) as DebtorStatusType[]).map(s => (
                                  <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                                ))}
                              </select>
                            </div>

                            {!record.plan ? (
                              <button onClick={() => { setPlanModal(record); setPlanForm({ amount: '', freq: 'fortnightly', startDate: new Date().toISOString().split('T')[0], notes: '' }) }}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 border border-indigo-200">
                                <Calendar size={12} />Set Up Payment Plan
                              </button>
                            ) : (
                              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                                <p className="text-xs font-bold text-indigo-800">Payment Plan Active</p>
                                <p className="text-xs text-indigo-700 mt-1">{formatAUD(record.plan.instalmentAmount)} / {record.plan.frequency}</p>
                                <p className="text-xs text-indigo-500">Started {record.plan.startDate}</p>
                                {record.plan.notes && <p className="text-xs text-indigo-400 italic mt-1">{record.plan.notes}</p>}
                                <button onClick={() => { upsertPaymentPlan({ ...record.plan!, status: 'broken' }); showToast('Plan cancelled') }}
                                  className="mt-2 text-xs text-red-500 underline">Cancel plan</button>
                              </div>
                            )}

                            <button onClick={() => markPaid(record)}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 border border-emerald-200">
                              <DollarSign size={12} />Mark as Paid
                            </button>

                            <Link href={`/electricity/invoices/${record.invoice.id}`}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200">
                              <FileText size={12} />View Invoice
                            </Link>

                            <a href={`mailto:${record.customer.email}`}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 truncate">
                              <Mail size={12} /><span className="truncate">{record.customer.email}</span>
                            </a>
                            {record.customer.phone && (
                              <a href={`tel:${record.customer.phone}`}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200">
                                <Phone size={12} />{record.customer.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════ HISTORY ════════ */}
      {view === 'history' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{debtorComms.length} entries across all accounts, most recent first</p>
          {debtorComms.length === 0 ? (
            <div className="card p-12 text-center text-slate-400">
              <Clock size={32} className="mx-auto mb-2 text-slate-300" />
              <p>No communications logged yet</p>
              <p className="text-xs mt-1">Send reminders or log calls from the Debtors tab</p>
            </div>
          ) : (
            [...debtorComms]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(comm => {
                const cfg      = COMM_CFG[comm.type]
                const Icon     = cfg.icon
                const invoice  = invoices.find(i => i.id === comm.invoiceId)
                const customer = customers.find(c => c.id === comm.customerId)
                return (
                  <div key={comm.id} className="card p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        {customer && <span className="text-xs text-slate-700 font-medium">{customer.firstName} {customer.lastName}</span>}
                        {invoice && (
                          <Link href={`/electricity/invoices/${invoice.id}`} className="text-xs text-indigo-600 hover:underline font-mono">
                            {invoice.invoiceNumber}
                          </Link>
                        )}
                      </div>
                      {comm.notes && <p className="text-xs text-slate-500 mt-0.5">{comm.notes}</p>}
                      <p className="text-xs text-slate-300 mt-1">{fmtTs(comm.date)}</p>
                    </div>
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* ════════ PAYMENT PLAN MODAL ════════ */}
      {planModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Payment Plan</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {planModal.customer.firstName} {planModal.customer.lastName} · {formatAUD(planModal.invoice.total)} outstanding
                </p>
              </div>
              <button onClick={() => setPlanModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Instalment Amount ($)</label>
                  <input type="number" step="0.01" value={planForm.amount} placeholder="e.g. 100"
                    onChange={e => setPlanForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
                  <select value={planForm.freq} onChange={e => setPlanForm(f => ({ ...f, freq: e.target.value as typeof planForm.freq }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">First Payment Date</label>
                <input type="date" value={planForm.startDate}
                  onChange={e => setPlanForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
                <textarea value={planForm.notes}
                  onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="e.g. Customer called, agreed to weekly payments"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {planForm.amount && parseFloat(planForm.amount) > 0 && (
                <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
                  <strong>Estimated payoff:</strong> ~{Math.ceil(planModal.invoice.total / parseFloat(planForm.amount))} {planForm.freq} payments to clear {formatAUD(planModal.invoice.total)}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setPlanModal(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={savePlan} disabled={!planForm.amount || !planForm.startDate}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
