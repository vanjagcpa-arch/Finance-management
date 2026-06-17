'use client'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Send, Check, Zap, Building2, User, Calendar, AlertTriangle, ExternalLink, PlusCircle, X, Minus, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts'
import { useElectricity } from '@/lib/ElectricityContext'
import { formatAUD, formatDate, monthName, getUsageHistory, usageColor, downloadFile } from '@/lib/electricityUtils'
import type { ElectricityInvoice } from '@/lib/electricityTypes'

interface AdjustmentForm {
  type: 'credit' | 'debit_adj'
  reason: string
  amountExclGST: string
  date: string
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { invoices, customers, buildings, apartments, settings, updateInvoice, upsertInvoices, nextInvoiceNumber, readings, isLoaded } = useElectricity()
  const [emailSent,    setEmailSent]    = useState(false)
  const [sending,      setSending]      = useState(false)
  const [downloading,  setDownloading]  = useState(false)
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [markPaidDate, setMarkPaidDate] = useState(() => new Date().toISOString().split('T')[0])
  const [adjForm, setAdjForm] = useState<AdjustmentForm>({
    type: 'credit',
    reason: '',
    amountExclGST: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [adjSaved, setAdjSaved] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const invoice  = useMemo(() => invoices.find(i => i.id === id), [invoices, id])
  const customer = useMemo(() => invoice ? customers.find(c => c.id === invoice.customerId) : undefined, [invoice, customers])
  const apt      = useMemo(() => invoice ? apartments.find(a => a.id === invoice.apartmentId) : undefined, [invoice, apartments])
  const building = useMemo(() => apt ? buildings.find(b => b.id === apt.buildingId) : undefined, [apt, buildings])

  const relatedAdjustments = useMemo(() =>
    invoices.filter(i => i.linkedInvoiceId === id && i.status !== 'cancelled'),
    [invoices, id]
  )

  const linkedReading = useMemo(() =>
    invoice ? readings.find(r => r.apartmentId === invoice.apartmentId && r.month === invoice.month && r.year === invoice.year) : undefined,
    [readings, invoice]
  )

  function handleRecalculate() {
    if (!invoice || !linkedReading) return
    setRecalculating(true)
    const { ratePerKwh, dailySupplyCharge, gstRate } = settings.tariff
    const usage        = linkedReading.usage
    const usageCharge  = Math.round(usage * ratePerKwh * 100) / 100
    const supplyCharge = Math.round(invoice.daysInPeriod * dailySupplyCharge * 100) / 100
    const subtotal     = Math.round((usageCharge + supplyCharge) * 100) / 100
    const gst          = Math.round(subtotal * gstRate * 100) / 100
    const total        = Math.round((subtotal + gst) * 100) / 100
    updateInvoice({
      ...invoice,
      previousReading: linkedReading.previousReading,
      currentReading: linkedReading.currentReading,
      usage, ratePerKwh, usageCharge, supplyCharge, subtotal, gst, total,
    })
    setTimeout(() => setRecalculating(false), 800)
  }

  const usageHistory = useMemo(() => {
    if (!invoice) return []
    return getUsageHistory(invoice.apartmentId, readings, invoice.month, invoice.year, 12)
  }, [invoice, readings])

  const avgUsage = useMemo(() => {
    const filled = usageHistory.filter(h => h.usage !== null)
    if (!filled.length) return invoice?.usage ?? 0
    return Math.round(filled.reduce((s, h) => s + (h.usage ?? 0), 0) / filled.length)
  }, [usageHistory, invoice])

  const chartData = useMemo(() => usageHistory.map(h => ({
    label: h.label,
    usage: h.usage ?? 0,
    isCurrent: h.month === invoice?.month && h.year === invoice?.year,
    color: usageColor(h.usage, building?.lowUsageThreshold ?? 180, building?.highUsageThreshold ?? 380),
  })), [usageHistory, invoice, building])

  async function generatePDFBlob(): Promise<Blob> {
    const { pdf } = await import('@react-pdf/renderer')
    const { default: InvoicePDF } = await import('@/components/electricity/InvoicePDF')
    return pdf(
      <InvoicePDF
        invoice={invoice!}
        customer={customer!}
        apt={apt!}
        building={building!}
        settings={settings}
        usageHistory={usageHistory}
      />
    ).toBlob()
  }

  const isDDR = customer ? (customer.paymentMethod === 'direct_debit' || customer.paymentMethod === 'ezidebit') : false

  function buildPortalData() {
    if (!invoice || !customer || !apt || !building) return null
    return {
      customer: {
        customerId: customer.id,
        firstName: customer.firstName, lastName: customer.lastName,
        email: customer.email, phone: customer.phone,
        paymentMethod: customer.paymentMethod,
        bsb: customer.bsb, accountNumber: customer.accountNumber, accountName: customer.accountName,
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        period: monthName(invoice.month, invoice.year),
        issueDate: invoice.issueDate, dueDate: invoice.dueDate,
        total: invoice.total, usage: invoice.usage,
        usageCharge: invoice.usageCharge, supplyCharge: invoice.supplyCharge,
        subtotal: invoice.subtotal, gst: invoice.gst,
        ratePerKwh: invoice.ratePerKwh, daysInPeriod: invoice.daysInPeriod,
        gstRate: settings.tariff.gstRate,
        status: invoice.status, isFinalBill: invoice.isFinalBill,
        previousReading: invoice.previousReading, currentReading: invoice.currentReading,
        billingPeriodStart: invoice.billingPeriodStart, billingPeriodEnd: invoice.billingPeriodEnd,
        month: invoice.month, year: invoice.year,
      },
      company: {
        name: settings.companyName, email: settings.email, phone: settings.phone, abn: settings.abn,
        bpayBillerCode: settings.bpayBillerCode,
        bankBSB: settings.bsb, bankAccount: settings.accountNumber,
        bankAccountName: settings.accountName, bankName: settings.bankName,
        fromEmail: settings.senderEmail,
        address: settings.address, suburb: settings.suburb, state: settings.state, postcode: settings.postcode,
        website: settings.website,
      },
      property: {
        unitNumber: apt.unitNumber, floor: apt.floor, meterNumber: apt.meterNumber,
        buildingName: building.name, buildingAddress: building.address,
        suburb: building.suburb, state: building.state, postcode: building.postcode,
        lowUsageThreshold: building.lowUsageThreshold,
        highUsageThreshold: building.highUsageThreshold,
      },
      usageHistory: usageHistory.map(h => ({
        label: h.label, usage: h.usage,
        month: h.month, year: h.year,
        isCurrent: h.month === invoice.month && h.year === invoice.year,
      })),
    }
  }

  async function handleDownloadPDF() {
    if (!invoice || !customer || !apt || !building) return
    setDownloading(true)
    try {
      const blob = await generatePDFBlob()
      downloadFile(blob, `${invoice.invoiceNumber}.pdf`, 'application/pdf')
    } catch (e) {
      console.error('PDF error', e)
    } finally {
      setDownloading(false)
    }
  }

  async function handleSend() {
    if (!invoice || !customer || !apt || !building) return
    setSending(true)
    try {
      const blob = await generatePDFBlob()
      const arrayBuf = await blob.arrayBuffer()
      const pdfBase64 = Buffer.from(arrayBuf).toString('base64')

      const portalData = buildPortalData()!
      const portalUrl = `${window.location.origin}/portal?d=${btoa(JSON.stringify(portalData))}`

      const outstandingInvoices = invoices
        .filter(inv => inv.customerId === customer.id && (inv.status === 'sent' || inv.status === 'overdue') && inv.id !== invoice.id)
        .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
        .map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          period: monthName(inv.month, inv.year),
          dueDate: inv.dueDate,
          total: inv.total,
          status: inv.status as 'sent' | 'overdue',
        }))

      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.email,
          customerFirstName: customer.firstName,
          isDDR,
          customerBSB: isDDR ? customer.bsb : undefined,
          customerAccount: isDDR ? customer.accountNumber : undefined,
          customerAccountName: isDDR ? customer.accountName : undefined,
          invoiceNumber: invoice.invoiceNumber,
          period: `${monthName(invoice.month, invoice.year)}`,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          isFinalBill: invoice.isFinalBill ?? false,
          usage: invoice.usage,
          usageCharge: invoice.usageCharge,
          supplyCharge: invoice.supplyCharge,
          subtotal: invoice.subtotal,
          gst: invoice.gst,
          total: invoice.total,
          ratePerKwh: invoice.ratePerKwh,
          dailySupplyCharge: settings.tariff.dailySupplyCharge,
          daysInPeriod: invoice.daysInPeriod,
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
          pdfBase64,
          pdfFilename: `${invoice.invoiceNumber}.pdf`,
          portalUrl,
          outstandingInvoices,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Send failed')
      updateInvoice({ ...invoice, status: 'sent' })
      setEmailSent(true)
    } catch (e) {
      console.error('Send error', e)
      alert(`Failed to send: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSending(false)
    }
  }

  function handleCreateAdjustment() {
    if (!invoice || !customer || !apt) return
    const amtExcl = parseFloat(adjForm.amountExclGST)
    if (isNaN(amtExcl) || amtExcl <= 0 || !adjForm.reason) return

    const sign = adjForm.type === 'credit' ? -1 : 1
    const subtotal = Math.round(amtExcl * sign * 100) / 100
    const gst = Math.round(subtotal * settings.tariff.gstRate * 100) / 100
    const total = Math.round((subtotal + gst) * 100) / 100
    const today = adjForm.date
    const d = new Date(today)
    const adjMonth = d.getMonth() + 1
    const adjYear = d.getFullYear()
    const prefix = adjForm.type === 'credit' ? 'CRED' : 'ADJ'
    const invoiceNumber = `${prefix}-${nextInvoiceNumber(adjMonth, adjYear)}`

    const adjInvoice: ElectricityInvoice = {
      id: `adj-${invoice.id}-${Date.now()}`,
      invoiceNumber,
      customerId: customer.id,
      apartmentId: apt.id,
      buildingId: invoice.buildingId,
      month: adjMonth,
      year: adjYear,
      issueDate: today,
      dueDate: today,
      billingPeriodStart: invoice.billingPeriodStart,
      billingPeriodEnd: invoice.billingPeriodEnd,
      daysInPeriod: invoice.daysInPeriod,
      previousReading: invoice.previousReading,
      currentReading: invoice.currentReading,
      usage: 0,
      ratePerKwh: invoice.ratePerKwh,
      usageCharge: 0,
      supplyCharge: 0,
      subtotal,
      gst,
      total,
      status: 'draft',
      isAdjustment: true,
      adjustmentType: adjForm.type,
      adjustmentReason: adjForm.reason,
      linkedInvoiceId: invoice.id,
    }

    upsertInvoices([adjInvoice])
    setAdjSaved(true)
    setTimeout(() => { setShowAdjModal(false); setAdjSaved(false) }, 1500)
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>
  if (!invoice || !customer || !apt || !building) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 mb-3">Invoice not found</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm hover:underline">Go back</button>
      </div>
    </div>
  )

  const usageDelta = invoice.usage - avgUsage
  const low = building.lowUsageThreshold
  const high = building.highUsageThreshold

  const adjAmtExcl = parseFloat(adjForm.amountExclGST)
  const adjValid = !isNaN(adjAmtExcl) && adjAmtExcl > 0 && adjForm.reason.trim().length > 0
  const adjGST = adjValid ? Math.round(adjAmtExcl * settings.tariff.gstRate * 100) / 100 : 0
  const adjTotal = adjValid ? Math.round((adjAmtExcl + adjGST) * (adjForm.type === 'credit' ? -1 : 1) * 100) / 100 : 0

  return (
    <>
      {/* Mark Paid Modal */}
      {markPaidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Check size={16} className="text-emerald-600" />Mark as Paid
              </h2>
              <button onClick={() => setMarkPaidOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Invoice <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                <span className="ml-2 font-bold text-slate-900">{formatAUD(invoice.total)}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Date Paid</label>
                <input type="date" value={markPaidDate}
                  onChange={e => setMarkPaidDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setMarkPaidOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  updateInvoice({ ...invoice, status: 'paid', paidDate: markPaidDate })
                  setMarkPaidOpen(false)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                <Check size={14} />Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <PlusCircle size={16} className="text-indigo-600" />
                Create Adjustment / Credit Note
              </h2>
              <button onClick={() => setShowAdjModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">Linked to invoice <span className="font-mono font-medium">{invoice.invoiceNumber}</span></p>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Type</label>
                <div className="flex gap-3">
                  {(['credit', 'debit_adj'] as const).map(t => (
                    <label key={t} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors
                      ${adjForm.type === t ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <input type="radio" name="adjType" value={t} checked={adjForm.type === t}
                        onChange={() => setAdjForm(f => ({ ...f, type: t }))} className="sr-only" />
                      {t === 'credit' ? <><Minus size={14} className="text-emerald-600" />Credit Note</> : <><PlusCircle size={14} className="text-amber-600" />Debit Adjustment</>}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1.5">Reason <span className="text-red-500">*</span></label>
                <input type="text" value={adjForm.reason} placeholder="e.g. Meter reading correction, billing error, goodwill credit"
                  onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">Amount (excl. GST) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" value={adjForm.amountExclGST} placeholder="0.00"
                      onChange={e => setAdjForm(f => ({ ...f, amountExclGST: e.target.value }))}
                      className="w-full pl-7 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">Date</label>
                  <input type="date" value={adjForm.date} onChange={e => setAdjForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {adjValid && (
                <div className={`rounded-xl p-4 text-sm ${adjForm.type === 'credit' ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Subtotal (excl. GST)</span>
                    <span className="font-mono">{formatAUD(adjAmtExcl * (adjForm.type === 'credit' ? -1 : 1))}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>GST ({(settings.tariff.gstRate * 100).toFixed(0)}%)</span>
                    <span className="font-mono">{formatAUD(adjGST * (adjForm.type === 'credit' ? -1 : 1))}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-base pt-2 border-t ${adjForm.type === 'credit' ? 'border-emerald-200 text-emerald-800' : 'border-amber-200 text-amber-800'}`}>
                    <span>{adjForm.type === 'credit' ? 'Credit Total' : 'Adjustment Total'}</span>
                    <span className="font-mono">{formatAUD(adjTotal)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowAdjModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              {adjSaved ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                  <Check size={14} />Created
                </span>
              ) : (
                <button onClick={handleCreateAdjustment} disabled={!adjValid}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <PlusCircle size={14} />
                  Create {adjForm.type === 'credit' ? 'Credit Note' : 'Adjustment'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} />Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          {invoice.isFinalBill && (
            <span className="badge-danger flex items-center gap-1"><AlertTriangle size={11} />Final Bill</span>
          )}
          {invoice.isAdjustment && (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
              ${invoice.adjustmentType === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {invoice.adjustmentType === 'credit' ? <Minus size={11} /> : <PlusCircle size={11} />}
              {invoice.adjustmentType === 'credit' ? 'Credit Note' : 'Debit Adjustment'}
            </span>
          )}
          <select value={invoice.status}
            onChange={e => updateInvoice({ ...invoice, status: e.target.value as ElectricityInvoice['status'] })}
            className={`text-xs rounded-full px-3 py-1.5 border font-medium cursor-pointer focus:outline-none
              ${invoice.status === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                invoice.status === 'sent' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' :
                invoice.status === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
                'border-slate-200 bg-slate-50 text-slate-600'}`}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {!emailSent ? (
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors">
              <Send size={14} className={sending ? 'animate-pulse' : ''} />
              {sending ? 'Sending…' : 'Email Invoice'}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
              <Check size={14} />Email Sent
            </span>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <button
              onClick={() => { setMarkPaidDate(new Date().toISOString().split('T')[0]); setMarkPaidOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">
              <Check size={14} />Mark Paid
            </button>
          )}
          {linkedReading && !invoice.isAdjustment && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={handleRecalculate} disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 disabled:opacity-50 transition-colors">
              <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
              {recalculating ? 'Recalculating…' : 'Recalculate'}
            </button>
          )}
          <button
            onClick={() => {
              const pd = buildPortalData()
              if (!pd) return
              window.open(`/portal?d=${btoa(JSON.stringify(pd))}`, '_blank')
            }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <ExternalLink size={14} />Tenant View
          </button>
          {!invoice.isAdjustment && (
            <button onClick={() => setShowAdjModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <PlusCircle size={14} />Adjustment
            </button>
          )}
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors">
            <Download size={14} className={downloading ? 'animate-spin' : ''} />
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="flex-1 overflow-y-auto bg-slate-100 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">

            {/* Header */}
            <div style={{ background: '#0c1120' }} className="px-10 py-8 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Zap size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg leading-none">{settings.companyName}</p>
                    <p className="text-slate-400 text-sm mt-0.5">Electricity Billing Services</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm">{settings.address}, {settings.suburb} {settings.state} {settings.postcode}</p>
                <p className="text-slate-400 text-sm">{settings.phone} · {settings.email}</p>
                <p className="text-slate-500 text-xs mt-1">ABN {settings.abn}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-white tracking-tight">INVOICE</p>
                <p className="text-indigo-400 font-mono text-sm font-bold mt-1">{invoice.invoiceNumber}</p>
                <div className="flex flex-col items-end gap-1.5 mt-2">
                  <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full
                    ${invoice.status === 'paid' ? 'bg-emerald-500 text-white' :
                      invoice.status === 'overdue' ? 'bg-red-500 text-white' :
                      invoice.status === 'sent' ? 'bg-indigo-500 text-white' :
                      'bg-slate-600 text-slate-200'}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                  {invoice.isFinalBill && (
                    <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-red-500 text-white">
                      FINAL BILL
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Meta strip */}
            <div className="bg-indigo-600 px-10 py-4 flex gap-8">
              <div><p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Invoice Date</p><p className="text-white font-semibold text-sm mt-0.5">{formatDate(invoice.issueDate)}</p></div>
              <div><p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Due Date</p><p className="text-white font-semibold text-sm mt-0.5">{formatDate(invoice.dueDate)}</p></div>
              <div><p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Billing Period</p><p className="text-white font-semibold text-sm mt-0.5">{monthName(invoice.month, invoice.year)}</p></div>
              {invoice.status === 'paid' && invoice.paidDate && (
                <div className="ml-auto"><p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Paid On</p><p className="text-white font-semibold text-sm mt-0.5">{formatDate(invoice.paidDate)}</p></div>
              )}
            </div>

            {/* Bill To / Property */}
            <div className="grid grid-cols-2 px-10 py-8 gap-8 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-3"><User size={14} className="text-slate-400" /><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To</p></div>
                <p className="font-bold text-slate-900 text-lg">{customer.firstName} {customer.lastName}</p>
                <p className="text-slate-600 text-sm mt-1">{customer.email}</p>
                <p className="text-slate-600 text-sm">{customer.phone}</p>
                <p className="text-slate-400 text-xs mt-2">Account: {customer.myobCardId}</p>
                {invoice.isFinalBill && customer.moveOutDate && (
                  <p className="text-red-500 text-xs mt-1 font-medium">Move-out: {customer.moveOutDate}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3"><Building2 size={14} className="text-slate-400" /><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Property</p></div>
                <p className="font-bold text-slate-900 text-lg">{building.name}</p>
                <p className="text-slate-600 text-sm mt-1">Unit {apt.unitNumber}, Level {apt.floor}</p>
                <p className="text-slate-600 text-sm">{building.address}</p>
                <p className="text-slate-600 text-sm">{building.suburb} {building.state} {building.postcode}</p>
                <p className="text-slate-400 text-xs mt-2">Meter: {apt.meterNumber}</p>
                <p className="text-slate-400 text-xs">{invoice.billingPeriodStart} → {invoice.billingPeriodEnd} ({invoice.daysInPeriod} days)</p>
              </div>
            </div>

            {/* 12-Month Usage History */}
            <div className="px-10 py-7 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-indigo-600" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">12-Month Usage History</p>
                <span className="ml-auto text-xs text-slate-400">Avg: {avgUsage} kWh/month</span>
              </div>
              <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
                {[
                  { color: 'bg-emerald-500', label: `Low (<${low} kWh)` },
                  { color: 'bg-indigo-500',  label: 'Normal' },
                  { color: 'bg-amber-500',   label: `High (>${high} kWh)` },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                    {l.label}
                  </span>
                ))}
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={16} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: number) => [`${v} kWh`, 'Usage']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                    />
                    <ReferenceLine y={avgUsage} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'avg', fill: '#94a3b8', fontSize: 9 }} />
                    <Bar dataKey="usage" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={entry.isCurrent ? 1 : 0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Meter Readings */}
            <div className="px-10 py-7 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">Meter Readings</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Previous Reading</p>
                  <p className="text-2xl font-bold text-slate-700 font-mono">{invoice.previousReading.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">kWh</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Current Reading</p>
                  <p className="text-2xl font-bold text-slate-700 font-mono">{invoice.currentReading.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">kWh</p>
                </div>
                <div className="bg-indigo-600 rounded-xl p-4 text-center">
                  <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-2">Usage This Month</p>
                  <p className="text-2xl font-bold text-white font-mono">{invoice.usage.toLocaleString()}</p>
                  <p className="text-xs text-indigo-200 mt-1">kWh consumed</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span className={`font-medium ${usageDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {usageDelta > 0 ? `▲ ${usageDelta} kWh above` : `▼ ${Math.abs(usageDelta)} kWh below`} 12-month average
                </span>
                <span className="text-slate-300">·</span>
                <span className={`badge-${invoice.usage < low ? 'success' : invoice.usage > high ? 'warning' : 'neutral'}`}>
                  {invoice.usage < low ? 'Low user' : invoice.usage > high ? 'High user' : 'Normal usage'}
                </span>
              </div>
            </div>

            {/* Charges */}
            <div className="px-10 py-7">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">Charges</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3">
                      <span className="font-medium text-slate-700">Electricity usage</span>
                      <span className="text-slate-400 ml-2 text-xs">{invoice.usage.toLocaleString()} kWh × {(invoice.ratePerKwh * 100).toFixed(2)}¢/kWh</span>
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-slate-900">{formatAUD(invoice.usageCharge)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3">
                      <span className="font-medium text-slate-700">Daily supply charge</span>
                      <span className="text-slate-400 ml-2 text-xs">{invoice.daysInPeriod} days × ${settings.tariff.dailySupplyCharge.toFixed(4)}/day</span>
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-slate-900">{formatAUD(invoice.supplyCharge)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-slate-500">Subtotal (excl. GST)</td>
                    <td className="py-3 text-right font-mono text-slate-700">{formatAUD(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-500">GST ({(settings.tariff.gstRate * 100).toFixed(0)}%)</td>
                    <td className="py-3 text-right font-mono text-slate-700">{formatAUD(invoice.gst)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div>
                    <p className="text-indigo-200 text-sm font-medium">{invoice.isFinalBill ? 'Final Amount Due' : 'Total Amount Due'}</p>
                    <p className="text-indigo-200 text-xs mt-0.5">Including GST</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-black text-4xl font-mono tracking-tight">{formatAUD(invoice.total)}</p>
                    <p className="text-indigo-200 text-xs mt-1">AUD · Due {formatDate(invoice.dueDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mx-10 mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Payment Information</p>
              <div className="space-y-3">
                {customer.paymentMethod === 'direct_debit' && (
                  <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-indigo-900 text-sm">Direct Debit (DDR)</p>
                      <p className="text-indigo-700 text-sm mt-0.5">{formatAUD(invoice.total)} will be debited on <strong>{formatDate(invoice.dueDate)}</strong></p>
                      <p className="text-indigo-600 text-xs mt-1">From: {customer.accountName} · BSB: {customer.bsb} · Account: {customer.accountNumber}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {settings.bpayBillerCode && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <p className="font-semibold text-slate-700 mb-1.5">BPAY</p>
                      <p className="text-slate-500 text-xs">Biller Code: <span className="font-mono font-medium text-slate-700">{settings.bpayBillerCode}</span></p>
                      <p className="text-slate-500 text-xs">Reference: <span className="font-mono font-medium text-slate-700">{invoice.invoiceNumber.replace(/-/g,'')}</span></p>
                    </div>
                  )}
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-1.5">EFT Transfer</p>
                    <p className="text-slate-500 text-xs">BSB: <span className="font-mono font-medium text-slate-700">{settings.bsb}</span></p>
                    <p className="text-slate-500 text-xs">Account: <span className="font-mono font-medium text-slate-700">{settings.accountNumber}</span></p>
                    <p className="text-slate-500 text-xs">Name: <span className="font-medium text-slate-700">{settings.accountName}</span></p>
                    <p className="text-slate-500 text-xs">Reference: <span className="font-mono font-medium text-slate-700">{invoice.invoiceNumber}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ background: '#f8fafc' }} className="border-t border-slate-200 px-10 py-5 flex items-center justify-between">
              <p className="text-xs text-slate-400">{settings.companyName} · ABN {settings.abn} · {settings.email} · {settings.phone}</p>
              <p className="text-xs text-slate-300 font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>

          {/* Related Adjustments / Credit Notes */}
          {relatedAdjustments.length > 0 && (
            <div className="mt-4 bg-white shadow-md rounded-2xl overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                <PlusCircle size={14} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">
                  {relatedAdjustments.length} Related {relatedAdjustments.length === 1 ? 'Adjustment' : 'Adjustments'}
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {relatedAdjustments.map(adj => (
                  <button key={adj.id} onClick={() => router.push(`/electricity/invoices/${adj.id}`)}
                    className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        adj.adjustmentType === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {adj.adjustmentType === 'credit' ? <Minus size={10} /> : <PlusCircle size={10} />}
                        {adj.adjustmentType === 'credit' ? 'Credit Note' : 'Debit Adj'}
                      </span>
                      <span className="font-mono text-sm text-slate-700">{adj.invoiceNumber}</span>
                      {adj.adjustmentReason && (
                        <span className="text-xs text-slate-400">{adj.adjustmentReason}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono text-sm ${adj.total < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {formatAUD(adj.total)}
                      </p>
                      <p className="text-xs text-slate-400">{adj.issueDate} · {adj.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
