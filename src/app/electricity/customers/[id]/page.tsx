'use client'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Download, FileText, Building2, Mail, Phone, CreditCard,
  AlertCircle, CheckCircle, Send,
  ExternalLink, Calendar, Plus, X, RefreshCw,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import {
  formatAUD, formatShortDate,
  getCustomerBalance, buildCustomerLedger, downloadFile,
} from '@/lib/electricityUtils'
import type { PaymentPlan } from '@/lib/electricityTypes'

const today = new Date().toISOString().split('T')[0]

interface MarkPaidModal { invId: string; invoiceNumber: string; amount: number; date: string }

export default function CustomerLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { customers, invoices, apartments, buildings, settings, updateInvoice, paymentPlans, upsertPaymentPlan, isLoaded } = useElectricity()

  const [downloading, setDownloading] = useState(false)
  const [sendingStatement, setSendingStatement] = useState(false)
  const [statementSent, setStatementSent] = useState(false)
  const [toast, setToast] = useState('')
  const [markPaidModal, setMarkPaidModal] = useState<MarkPaidModal | null>(null)

  // Payment plan form state
  const [planFormOpen, setPlanFormOpen] = useState(false)
  const [planForm, setPlanForm] = useState({
    totalAmount: '',
    instalmentAmount: '',
    frequency: 'monthly' as PaymentPlan['frequency'],
    startDate: today,
    notes: '',
  })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const customer = useMemo(() => customers.find(c => c.id === id), [customers, id])
  const apt      = useMemo(() => customer ? apartments.find(a => a.id === customer.apartmentId) : undefined, [customer, apartments])
  const building = useMemo(() => apt ? buildings.find(b => b.id === apt.buildingId) : undefined, [apt, buildings])

  const custInvoices = useMemo(
    () => invoices.filter(i => i.customerId === id && i.status !== 'cancelled').sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
    [invoices, id],
  )

  const balance = useMemo(() => getCustomerBalance(invoices, id, today), [invoices, id])
  const ledger  = useMemo(() => buildCustomerLedger(invoices, id), [invoices, id])

  async function handleDownloadStatement() {
    if (!customer || !apt || !building) return
    setDownloading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: StatementPDF } = await import('@/components/electricity/StatementPDF')
      const blob = await pdf(
        <StatementPDF
          customer={customer}
          apt={apt}
          building={building}
          settings={settings}
          ledger={[...ledger].reverse()}
          balance={balance}
          asOfDate={today}
        />
      ).toBlob()
      const safeId = `${customer.lastName.toUpperCase()}-${customer.firstName.toUpperCase()}`.replace(/[^A-Z]/g, '')
      downloadFile(blob, `statement-${safeId}-${today}.pdf`, 'application/pdf')
      showToast('Statement PDF downloaded')
    } catch (err) {
      console.error(err)
      showToast('Failed to generate PDF')
    }
    setDownloading(false)
  }

  async function handleSendStatement() {
    if (!customer || !apt || !building) return
    setSendingStatement(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: StatementPDF } = await import('@/components/electricity/StatementPDF')
      const blob = await pdf(
        <StatementPDF
          customer={customer}
          apt={apt}
          building={building}
          settings={settings}
          ledger={[...ledger].reverse()}
          balance={balance}
          asOfDate={today}
        />
      ).toBlob()

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const resp = await fetch('/api/send-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          outstanding: balance.balance,
          pdfBase64: base64,
          pdfFilename: `statement-${today}.pdf`,
          companyName: settings.companyName,
          fromEmail: settings.senderEmail || settings.email,
          companyEmail: settings.email,
          companyPhone: settings.phone,
        }),
      })
      setStatementSent(resp.ok)
      showToast(resp.ok ? `Statement emailed to ${customer.email}` : 'Email failed — PDF still downloaded')
    } catch {
      showToast('Email failed')
    }
    setSendingStatement(false)
  }

  function openMarkPaid(invId: string) {
    const inv = invoices.find(i => i.id === invId)
    if (!inv) return
    setMarkPaidModal({ invId, invoiceNumber: inv.invoiceNumber, amount: inv.total, date: today })
  }

  function confirmMarkPaid() {
    if (!markPaidModal) return
    const inv = invoices.find(i => i.id === markPaidModal.invId)
    if (!inv) return
    updateInvoice({ ...inv, status: 'paid', paidDate: markPaidModal.date, paidAmount: inv.total })
    showToast(`${inv.invoiceNumber} marked as paid on ${markPaidModal.date}`)
    setMarkPaidModal(null)
  }

  const custPaymentPlans = useMemo(
    () => paymentPlans.filter(p => p.customerId === id).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [paymentPlans, id],
  )

  function openNewPlan() {
    setPlanForm({ totalAmount: String(Math.max(balance.balance, 0).toFixed(2)), instalmentAmount: '', frequency: 'monthly', startDate: today, notes: '' })
    setPlanFormOpen(true)
  }

  function savePlan() {
    const total = parseFloat(planForm.totalAmount)
    const instalment = parseFloat(planForm.instalmentAmount)
    if (!total || !instalment || !planForm.startDate) return
    const plan: PaymentPlan = {
      id: `plan-${id}-${Date.now()}`,
      invoiceId: '',
      customerId: id,
      totalAmount: total,
      instalmentAmount: instalment,
      frequency: planForm.frequency,
      startDate: planForm.startDate,
      notes: planForm.notes,
      status: 'active',
    }
    upsertPaymentPlan(plan)
    setPlanFormOpen(false)
    showToast('Payment plan created')
  }

  function updatePlanStatus(planId: string, status: PaymentPlan['status']) {
    const plan = paymentPlans.find(p => p.id === planId)
    if (!plan) return
    upsertPaymentPlan({ ...plan, status })
    showToast(`Plan marked as ${status}`)
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading…</div>
  if (!customer) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <AlertCircle size={32} className="text-slate-300" />
      <p className="text-slate-500">Customer not found</p>
      <Link href="/electricity/customers" className="text-indigo-600 text-sm hover:underline">← Back to Customers</Link>
    </div>
  )

  const hasOutstanding = balance.balance > 0.005
  const isDDR = customer.paymentMethod === 'direct_debit' || customer.paymentMethod === 'ezidebit'
  const isIncoming = !customer.moveOutDate && customer.moveInDate > today
  const movedOut = !!customer.moveOutDate

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push('/electricity/customers')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg mt-0.5">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                ${movedOut ? 'bg-slate-100 text-slate-400' : isIncoming ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {customer.firstName[0]}{customer.lastName[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{customer.firstName} {customer.lastName}</h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {isIncoming && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">Incoming {customer.moveInDate}</span>}
                  {movedOut && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Moved out {customer.moveOutDate}</span>}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDDR ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {customer.paymentMethod === 'direct_debit' ? 'DDR' : customer.paymentMethod === 'bpay' ? 'BPAY' : customer.paymentMethod === 'ezidebit' ? 'Ezidebit' : 'EFT'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleSendStatement} disabled={sendingStatement}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
            {sendingStatement ? <><Send size={14} className="animate-pulse" />Sending…</> : <><Send size={14} />Email Statement</>}
          </button>
          <button onClick={handleDownloadStatement} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
            {downloading ? <><Download size={14} className="animate-pulse" />Generating…</> : <><FileText size={14} />Download Statement</>}
          </button>
        </div>
      </div>

      {/* Customer info strip */}
      <div className="card p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Email</p>
              <p className="text-slate-700">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Phone</p>
              <p className="text-slate-700">{customer.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Property</p>
              {building && apt ? (
                <p className="text-slate-700">{building.name} · Unit {apt.unitNumber}</p>
              ) : <p className="text-slate-400">—</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Bank</p>
              <p className="text-slate-700">{customer.bankName || '—'}</p>
              {customer.bsb && <p className="font-mono text-xs text-slate-400">{customer.bsb} / {customer.accountNumber}</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Tenancy</p>
              <p className="text-slate-700">From {customer.moveInDate}</p>
              {customer.moveOutDate && <p className="text-xs text-red-500">to {customer.moveOutDate}</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Account ID</p>
              <p className="font-mono text-xs text-slate-600">{customer.myobCardId || customer.id.slice(0, 14)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Balance summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Total Invoiced</p>
          <p className="text-xl font-bold text-slate-900 font-mono">{formatAUD(balance.totalBilled)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Total Paid</p>
          <p className="text-xl font-bold text-emerald-700 font-mono">{formatAUD(balance.totalPaid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Credits</p>
          <p className="text-xl font-bold text-sky-700 font-mono">{formatAUD(balance.totalCredits)}</p>
        </div>
        <div className={`card p-4 ${hasOutstanding ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className={`text-xs uppercase tracking-wider font-medium mb-1 ${hasOutstanding ? 'text-red-400' : 'text-emerald-500'}`}>
            Outstanding Balance
          </p>
          <p className={`text-xl font-bold font-mono ${hasOutstanding ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatAUD(Math.max(balance.balance, 0))}
          </p>
        </div>
      </div>

      {/* Aging breakdown */}
      {hasOutstanding && (
        <div className="card p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Aging Breakdown</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Current (not yet due)', amount: balance.current, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
              { label: '1–30 days overdue', amount: balance.days30, color: balance.days30 > 0.005 ? 'text-amber-700' : 'text-slate-400', bg: balance.days30 > 0.005 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200' },
              { label: '31–60 days overdue', amount: balance.days60, color: balance.days60 > 0.005 ? 'text-red-700' : 'text-slate-400', bg: balance.days60 > 0.005 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200' },
              { label: '61+ days overdue', amount: balance.days90plus, color: balance.days90plus > 0.005 ? 'text-red-800' : 'text-slate-400', bg: balance.days90plus > 0.005 ? 'bg-red-100 border-red-300' : 'bg-slate-50 border-slate-200' },
            ].map(a => (
              <div key={a.label} className={`rounded-lg border p-3 ${a.bg}`}>
                <p className="text-xs text-slate-500 mb-1">{a.label}</p>
                <p className={`text-base font-bold font-mono ${a.color}`}>{formatAUD(a.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">Transaction Ledger</h2>
          <span className="text-xs text-slate-400">{ledger.length} entries</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-header text-left px-4 py-2.5 w-28">Date</th>
              <th className="table-header text-left px-4 py-2.5">Description</th>
              <th className="table-header text-left px-4 py-2.5 w-36">Reference</th>
              <th className="table-header text-right px-4 py-2.5 w-28">Debit</th>
              <th className="table-header text-right px-4 py-2.5 w-28">Credit</th>
              <th className="table-header text-right px-4 py-2.5 w-28">Balance</th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-sm">No transactions on record</td></tr>
            )}
            {ledger.map((entry, i) => {
              const isPayment = entry.type === 'payment'
              const isCredit  = entry.type === 'credit'
              const rowBg = isPayment ? 'bg-emerald-50/60' : isCredit ? 'bg-sky-50/60' : i % 2 === 0 ? '' : 'bg-slate-50/40'
              return (
                <tr key={`${entry.invoiceId}-${i}`} className={`border-b border-slate-100 ${rowBg}`}>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatShortDate(entry.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-slate-700 text-xs">{entry.description}</span>
                    {isPayment && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">paid</span>}
                    {isCredit  && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">credit</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/electricity/invoices/${entry.invoiceId}`}
                      className="font-mono text-xs text-indigo-600 hover:underline flex items-center gap-1">
                      {entry.invoiceNumber}<ExternalLink size={10} />
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {entry.debit > 0 ? <span className="text-slate-800 font-semibold">{formatAUD(entry.debit)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {entry.credit > 0 ? <span className="text-emerald-700 font-semibold">{formatAUD(entry.credit)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {entry.balance > 0.005
                      ? <span className="font-bold text-slate-900">{formatAUD(entry.balance)}</span>
                      : entry.balance < -0.005
                        ? <span className="font-bold text-sky-700">({formatAUD(Math.abs(entry.balance))})</span>
                        : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              )
            })}
          </tbody>
          {ledger.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold text-slate-700 text-right">
                  Outstanding balance as at {formatShortDate(today)}
                </td>
                <td className={`px-4 py-2.5 text-right font-mono font-bold text-base ${hasOutstanding ? 'text-red-700' : 'text-emerald-700'}`}>
                  {formatAUD(Math.max(balance.balance, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Invoice list */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">Invoices ({custInvoices.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-header text-left px-4 py-2.5">Invoice</th>
              <th className="table-header text-left px-4 py-2.5">Period</th>
              <th className="table-header text-left px-4 py-2.5">Issued</th>
              <th className="table-header text-left px-4 py-2.5">Due</th>
              <th className="table-header text-center px-4 py-2.5">Status</th>
              <th className="table-header text-right px-4 py-2.5">Amount</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {custInvoices.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-sm">No invoices</td></tr>
            )}
            {custInvoices.map(inv => {
              const isOverdue = inv.status === 'overdue'
              const isSent    = inv.status === 'sent'
              const isPaid    = inv.status === 'paid'
              return (
                <tr key={inv.id} className="border-b border-slate-100 hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/electricity/invoices/${inv.id}`} className="font-mono text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1">
                      {inv.invoiceNumber}<ExternalLink size={10} />
                    </Link>
                    {inv.isAdjustment && (
                      <span className="text-xs text-slate-400 ml-0.5">{inv.adjustmentType === 'credit' ? '(credit)' : '(adj)'}</span>
                    )}
                    {inv.isFinalBill && <span className="text-xs text-red-500 ml-0.5">(final)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {inv.billingPeriodStart} → {inv.billingPeriodEnd}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{formatShortDate(inv.issueDate)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {formatShortDate(inv.dueDate)}
                    {isOverdue && (
                      <span className="ml-1 text-red-500 font-medium">
                        ({Math.floor((new Date(today).getTime() - new Date(inv.dueDate + 'T00:00:00').getTime()) / 86400000)}d)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      isPaid    ? 'bg-emerald-100 text-emerald-700' :
                      isSent    ? 'bg-indigo-100 text-indigo-700' :
                      isOverdue ? 'bg-red-100 text-red-700' :
                      inv.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {inv.status}
                    </span>
                    {isPaid && inv.paidDate && <p className="text-xs text-slate-400 mt-0.5">{formatShortDate(inv.paidDate)}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold">
                    <span className={inv.total < 0 ? 'text-sky-700' : 'text-slate-800'}>
                      {formatAUD(inv.total)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {(isSent || isOverdue) && (
                      <button onClick={() => openMarkPaid(inv.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors whitespace-nowrap">
                        <CheckCircle size={11} />Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Payment Plans ── */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Payment Plans</h2>
            <p className="text-xs text-slate-400 mt-0.5">Instalment arrangements for outstanding balances</p>
          </div>
          {hasOutstanding && (
            <button onClick={openNewPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors">
              <Plus size={12} />New Plan
            </button>
          )}
        </div>
        {custPaymentPlans.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            {hasOutstanding ? 'No payment plan active — click "New Plan" to set one up' : 'No payment plans on record'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {custPaymentPlans.map(plan => {
              const instalmentCount = Math.ceil(plan.totalAmount / plan.instalmentAmount)
              const nextDue = (() => {
                const d = new Date(plan.startDate + 'T00:00:00')
                while (d.toISOString().split('T')[0] <= today) {
                  if (plan.frequency === 'weekly') d.setDate(d.getDate() + 7)
                  else if (plan.frequency === 'fortnightly') d.setDate(d.getDate() + 14)
                  else d.setMonth(d.getMonth() + 1)
                }
                return d.toISOString().split('T')[0]
              })()
              return (
                <div key={plan.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          plan.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          plan.status === 'completed' ? 'bg-slate-100 text-slate-500' :
                          'bg-red-100 text-red-700'
                        }`}>{plan.status}</span>
                        <span className="text-sm font-semibold text-slate-800">{formatAUD(plan.instalmentAmount)}</span>
                        <span className="text-xs text-slate-500">/ {plan.frequency}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{instalmentCount} instalments · total {formatAUD(plan.totalAmount)}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar size={10} />Starts {formatShortDate(plan.startDate)}
                        </span>
                        {plan.status === 'active' && (
                          <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                            Next: {formatShortDate(nextDue)}
                          </span>
                        )}
                        {plan.notes && <span className="text-xs text-slate-400 italic truncate max-w-xs">{plan.notes}</span>}
                      </div>
                    </div>
                    {plan.status === 'active' && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => updatePlanStatus(plan.id, 'completed')}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors">
                          <CheckCircle size={10} />Completed
                        </button>
                        <button onClick={() => updatePlanStatus(plan.id, 'broken')}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors">
                          <X size={10} />Broken
                        </button>
                      </div>
                    )}
                    {plan.status !== 'active' && (
                      <button onClick={() => updatePlanStatus(plan.id, 'active')}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors flex-shrink-0">
                        <RefreshCw size={10} />Reactivate
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Mark Paid Modal ── */}
      {markPaidModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />Mark Invoice Paid
              </h3>
              <button onClick={() => setMarkPaidModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Invoice</p>
                <p className="font-mono font-semibold text-slate-800">{markPaidModal.invoiceNumber}</p>
                <p className="text-lg font-bold text-indigo-700 mt-1">{formatAUD(markPaidModal.amount)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment / Receipt Date</label>
                <input type="date" value={markPaidModal.date}
                  onChange={e => setMarkPaidModal(m => m ? { ...m, date: e.target.value } : m)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-slate-400 mt-1">This date will appear in MYOB receipts export and the customer ledger.</p>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setMarkPaidModal(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-white">Cancel</button>
              <button onClick={confirmMarkPaid} disabled={!markPaidModal.date}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-2">
                <CheckCircle size={14} />Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Payment Plan Modal ── */}
      {planFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />New Payment Plan
              </h3>
              <button onClick={() => setPlanFormOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Total Amount Owed ($)</label>
                  <input type="number" step="0.01" value={planForm.totalAmount}
                    onChange={e => setPlanForm(f => ({ ...f, totalAmount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Instalment Amount ($)</label>
                  <input type="number" step="0.01" value={planForm.instalmentAmount}
                    onChange={e => setPlanForm(f => ({ ...f, instalmentAmount: e.target.value }))}
                    placeholder="e.g. 150.00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
                  <select value={planForm.frequency} onChange={e => setPlanForm(f => ({ ...f, frequency: e.target.value as PaymentPlan['frequency'] }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                  <input type="date" value={planForm.startDate}
                    onChange={e => setPlanForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {planForm.totalAmount && planForm.instalmentAmount && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
                  {Math.ceil(parseFloat(planForm.totalAmount) / parseFloat(planForm.instalmentAmount))} instalments of {formatAUD(parseFloat(planForm.instalmentAmount))} {planForm.frequency}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input type="text" value={planForm.notes} onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Hardship arrangement agreed on phone"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setPlanFormOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-white">Cancel</button>
              <button onClick={savePlan}
                disabled={!planForm.totalAmount || !planForm.instalmentAmount || !planForm.startDate}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
