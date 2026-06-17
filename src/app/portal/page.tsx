'use client'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap, Download, Calendar, CreditCard, Building2, Check, AlertTriangle, Phone, Mail, LogOut, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortalData {
  customer: {
    customerId?: string
    firstName: string; lastName: string; email: string; phone: string
    paymentMethod: 'direct_debit' | 'bpay' | 'eft' | 'ezidebit'
    bsb?: string; accountNumber?: string; accountName?: string
  }
  invoice: {
    invoiceNumber: string; period: string; issueDate: string; dueDate: string
    total: number; usage: number; usageCharge: number; supplyCharge: number
    subtotal: number; gst: number; ratePerKwh: number; daysInPeriod: number
    gstRate: number; status: string; isFinalBill?: boolean
    previousReading: number; currentReading: number
    billingPeriodStart: string; billingPeriodEnd: string
    month: number; year: number
  }
  company: {
    name: string; email: string; phone: string; abn: string
    bpayBillerCode: string; bankBSB: string; bankAccount: string
    bankAccountName: string; bankName: string
    fromEmail?: string
    address?: string; suburb?: string; state?: string; postcode?: string; website?: string
  }
  property: {
    unitNumber: string; floor: number; meterNumber: string
    buildingName: string; buildingAddress: string; suburb: string; state: string; postcode: string
    lowUsageThreshold?: number; highUsageThreshold?: number
  }
  usageHistory: Array<{ label: string; usage: number | null; isCurrent?: boolean; color?: string; month?: number; year?: number }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const aud = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
const fdate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
const usageColor = (u: number | null) => {
  if (u === null) return '#e2e8f0'
  // Simple threshold-agnostic coloring for portal (company thresholds not passed)
  return '#4f46e5'
}

const today = new Date().toISOString().split('T')[0]

export default function PortalPage() {
  const params = useSearchParams()
  const [downloading, setDownloading] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [moveOutDate, setMoveOutDate] = useState(today)
  const [disconnectNotes, setDisconnectNotes] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectDone, setDisconnectDone] = useState(false)
  const [disconnectError, setDisconnectError] = useState('')

  const data = useMemo<PortalData | null>(() => {
    const raw = params.get('d')
    if (!raw) return null
    try {
      return JSON.parse(atob(raw)) as PortalData
    } catch {
      return null
    }
  }, [params])

  async function handleDownloadPDF() {
    if (!data) return
    setDownloading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: InvoicePDF } = await import('@/components/electricity/InvoicePDF')

      const { invoice: inv, customer, company, property, usageHistory } = data

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoiceObj: any = {
        id: inv.invoiceNumber, invoiceNumber: inv.invoiceNumber,
        customerId: '', apartmentId: '', buildingId: '',
        month: inv.month, year: inv.year,
        issueDate: inv.issueDate, dueDate: inv.dueDate,
        billingPeriodStart: inv.billingPeriodStart, billingPeriodEnd: inv.billingPeriodEnd,
        daysInPeriod: inv.daysInPeriod,
        previousReading: inv.previousReading, currentReading: inv.currentReading,
        usage: inv.usage, ratePerKwh: inv.ratePerKwh,
        usageCharge: inv.usageCharge, supplyCharge: inv.supplyCharge,
        subtotal: inv.subtotal, gst: inv.gst, total: inv.total,
        status: inv.status, isFinalBill: inv.isFinalBill,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customerObj: any = {
        id: customer.customerId ?? '', apartmentId: '',
        firstName: customer.firstName, lastName: customer.lastName,
        email: customer.email, phone: customer.phone,
        moveInDate: '', bankName: '',
        bsb: customer.bsb ?? '', accountNumber: customer.accountNumber ?? '',
        accountName: customer.accountName ?? '',
        myobCardId: '', paymentMethod: customer.paymentMethod,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aptObj: any = {
        id: '', buildingId: '',
        unitNumber: property.unitNumber, floor: property.floor, meterNumber: property.meterNumber,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildingObj: any = {
        id: '', name: property.buildingName, address: property.buildingAddress,
        suburb: property.suburb, state: property.state, postcode: property.postcode,
        totalUnits: 0,
        lowUsageThreshold: property.lowUsageThreshold ?? 180,
        highUsageThreshold: property.highUsageThreshold ?? 380,
      }
      const dailyRate = inv.daysInPeriod > 0 ? inv.supplyCharge / inv.daysInPeriod : 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settingsObj: any = {
        companyName: company.name, abn: company.abn,
        address: company.address ?? '', suburb: company.suburb ?? '',
        state: company.state ?? '', postcode: company.postcode ?? '',
        phone: company.phone, email: company.email, website: company.website ?? '',
        bankName: company.bankName, bsb: company.bankBSB, accountNumber: company.bankAccount,
        accountName: company.bankAccountName, bpayBillerCode: company.bpayBillerCode,
        tariff: { ratePerKwh: inv.ratePerKwh, dailySupplyCharge: dailyRate, gstRate: inv.gstRate },
        apcsUserId: '', institutionCode: '', invoicePrefix: '', paymentTermsDays: 21,
        senderEmail: '', myobClientId: '', myobClientSecret: '', myobAccessToken: '',
        myobRefreshToken: '', myobTokenExpiry: '', myobCompanyFileUrl: '',
        myobCompanyFileName: '', myobIncomeAccountCode: '', myobLastSyncCustomers: '',
        myobLastSyncInvoices: '', ezidebitDigitalKey: '',
      }

      const historyItems = usageHistory.map(h => ({
        month: h.month ?? 1, year: h.year ?? 2025,
        usage: h.usage, label: h.label,
      }))

      const blob = await pdf(
        <InvoicePDF
          invoice={invoiceObj}
          customer={customerObj}
          apt={aptObj}
          building={buildingObj}
          settings={settingsObj}
          usageHistory={historyItems}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${inv.invoiceNumber}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  // ── Invalid / no data ─────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm text-center">
          <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-500 text-sm">This portal link appears to be invalid or expired. Please check your invoice email for the correct link.</p>
        </div>
      </div>
    )
  }

  const { invoice: inv, customer, company, property, usageHistory } = data
  const avgUsage = useMemo(() => {
    const filled = usageHistory.filter(h => h.usage !== null && h.usage > 0)
    return filled.length ? Math.round(filled.reduce((s, h) => s + (h.usage ?? 0), 0) / filled.length) : 0
  }, [usageHistory])

  const isDDR = customer.paymentMethod === 'direct_debit' || customer.paymentMethod === 'ezidebit'
  const bpayRef = inv.invoiceNumber.replace(/-/g, '')

  async function handleDisconnectRequest() {
    if (!moveOutDate) return
    setDisconnecting(true)
    setDisconnectError('')
    try {
      const origin = window.location.origin
      const customerId = customer.customerId ?? ''
      const processUrl = customerId
        ? `${origin}/electricity/customers?offboard=${customerId}&date=${moveOutDate}`
        : `${origin}/electricity/customers`

      const res = await fetch('/api/send-disconnection-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          unitNumber: property.unitNumber,
          buildingName: property.buildingName,
          invoiceNumber: inv.invoiceNumber,
          moveOutDate,
          notes: disconnectNotes || undefined,
          companyName: company.name,
          companyEmail: company.email,
          fromEmail: company.fromEmail ?? company.email,
          processUrl,
          origin,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit')
      setDisconnectDone(true)
    } catch (e) {
      setDisconnectError(e instanceof Error ? e.message : String(e))
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div style={{ background: '#0c1120' }} className="px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">{company.name}</p>
          <p className="text-slate-400 text-xs">Electricity Billing Portal</p>
        </div>
        <div className="ml-auto">
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            <Download size={14} className={downloading ? 'animate-spin' : ''} />
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Invoice header card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Indigo strip */}
          <div className="bg-indigo-600 px-6 py-4 flex flex-wrap gap-6">
            <div>
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Invoice</p>
              <p className="text-white font-bold text-sm font-mono mt-0.5">{inv.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Billing Period</p>
              <p className="text-white font-bold text-sm mt-0.5">{inv.period}</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Due Date</p>
              <p className="text-white font-bold text-sm mt-0.5">{fdate(inv.dueDate)}</p>
            </div>
            <div className="ml-auto">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full
                ${inv.status === 'paid' ? 'bg-emerald-500 text-white' :
                  inv.status === 'overdue' ? 'bg-red-500 text-white' :
                  'bg-white/20 text-white'}`}>
                {inv.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-slate-600 mb-6">
              Dear <strong>{customer.firstName}</strong>,{' '}
              {inv.isFinalBill ? 'your final electricity bill is shown below.' : `your electricity bill for <strong>${inv.period}</strong> is ready.`}
            </p>

            {/* Amount box */}
            <div className="rounded-2xl p-6 mb-6 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
              <div>
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">{inv.isFinalBill ? 'Final Amount Due' : 'Total Amount Due'}</p>
                <p className="text-indigo-200 text-xs mt-0.5">Due by {fdate(inv.dueDate)} · Including GST</p>
              </div>
              <p className="text-white text-4xl font-black tracking-tight">{aud(inv.total)}</p>
            </div>

            {/* Charges */}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Charges Summary</p>
            <table className="w-full text-sm mb-6">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-700">Electricity usage
                    <span className="text-slate-400 ml-2 text-xs">{inv.usage.toLocaleString()} kWh × {(inv.ratePerKwh*100).toFixed(2)}¢/kWh</span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">{aud(inv.usageCharge)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-700">Daily supply charge
                    <span className="text-slate-400 ml-2 text-xs">{inv.daysInPeriod} days</span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">{aud(inv.supplyCharge)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 text-slate-500 text-sm">Subtotal (excl. GST)</td>
                  <td className="py-2 text-right text-slate-600">{aud(inv.subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500 text-sm">GST ({(inv.gstRate*100).toFixed(0)}%)</td>
                  <td className="py-2 text-right text-slate-600">{aud(inv.gst)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 12-month usage chart */}
        {usageHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-indigo-600" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">12-Month Usage History</p>
              <span className="ml-auto text-xs text-slate-400">Avg: {avgUsage} kWh/month</span>
            </div>
            <div className="h-36 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageHistory} barSize={16} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v} kWh`, 'Usage']}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                  />
                  {avgUsage > 0 && (
                    <ReferenceLine y={avgUsage} stroke="#94a3b8" strokeDasharray="4 4"
                      label={{ value: 'avg', fill: '#94a3b8', fontSize: 9 }} />
                  )}
                  <Bar dataKey="usage" radius={[3,3,0,0]}>
                    {usageHistory.map((entry, i) => (
                      <Cell key={i} fill={entry.isCurrent ? '#4f46e5' : '#a5b4fc'} opacity={entry.isCurrent ? 1 : 0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Payment info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={14} className="text-indigo-600" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Options</p>
          </div>

          {isDDR ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={12} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-indigo-900 text-sm">Direct Debit Scheduled</p>
                <p className="text-indigo-700 text-sm mt-0.5">{aud(inv.total)} will be automatically debited on <strong>{fdate(inv.dueDate)}</strong></p>
                {customer.paymentMethod === 'direct_debit' && customer.bsb && (
                  <p className="text-indigo-500 text-xs mt-1">From: {customer.accountName} · BSB {customer.bsb} · Account {customer.accountNumber}</p>
                )}
                <p className="text-indigo-400 text-xs mt-1">No action required — we handle this automatically.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {company.bpayBillerCode && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="font-semibold text-slate-800 text-sm mb-2">BPAY</p>
                  <p className="text-slate-500 text-xs">Biller Code: <span className="font-mono font-semibold text-slate-800">{company.bpayBillerCode}</span></p>
                  <p className="text-slate-500 text-xs mt-1">Reference: <span className="font-mono font-semibold text-slate-800">{bpayRef}</span></p>
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="font-semibold text-slate-800 text-sm mb-2">EFT Transfer</p>
                <p className="text-slate-500 text-xs">{company.bankName}</p>
                <p className="text-slate-500 text-xs mt-1">BSB: <span className="font-mono font-semibold text-slate-800">{company.bankBSB}</span></p>
                <p className="text-slate-500 text-xs">Account: <span className="font-mono font-semibold text-slate-800">{company.bankAccount}</span></p>
                <p className="text-slate-500 text-xs">Name: <span className="font-semibold text-slate-800">{company.bankAccountName}</span></p>
                <p className="text-slate-500 text-xs">Reference: <span className="font-mono font-semibold text-slate-800">{inv.invoiceNumber}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Property + Meter */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={14} className="text-indigo-600" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Property</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Previous Reading</p>
              <p className="text-xl font-bold text-slate-700 font-mono">{inv.previousReading.toLocaleString()}</p>
              <p className="text-xs text-slate-400">kWh</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Current Reading</p>
              <p className="text-xl font-bold text-slate-700 font-mono">{inv.currentReading.toLocaleString()}</p>
              <p className="text-xs text-slate-400">kWh</p>
            </div>
            <div className="bg-indigo-600 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-200 mb-1">Usage This Period</p>
              <p className="text-xl font-bold text-white font-mono">{inv.usage.toLocaleString()}</p>
              <p className="text-xs text-indigo-200">kWh</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex gap-4">
            <span>{property.buildingName} · Unit {property.unitNumber} · Level {property.floor}</span>
            <span className="font-mono">Meter: {property.meterNumber}</span>
          </div>
        </div>

        {/* Disconnection Request */}
        {!inv.isFinalBill && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setDisconnectOpen(o => !o)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                <LogOut size={15} className="text-amber-500" />
                <span className="text-sm font-semibold text-slate-700">Request Service Disconnection</span>
              </div>
              {disconnectOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </button>

            {disconnectOpen && (
              <div className="px-6 pb-6 border-t border-slate-100">
                {disconnectDone ? (
                  <div className="pt-5 text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check size={22} className="text-emerald-600" />
                    </div>
                    <p className="font-semibold text-slate-900 text-sm mb-1">Request Submitted</p>
                    <p className="text-slate-500 text-xs">
                      We&apos;ve received your disconnection request for <strong>{property.buildingName}, Unit {property.unitNumber}</strong>.
                      A confirmation has been sent to {customer.email}.
                    </p>
                  </div>
                ) : (
                  <div className="pt-4 space-y-4">
                    <p className="text-sm text-slate-500">
                      Planning to move out? Submit a disconnection request and we&apos;ll arrange a final meter reading and bill.
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Requested Move-out Date *</label>
                      <input type="date" value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
                      <textarea value={disconnectNotes} onChange={e => setDisconnectNotes(e.target.value)}
                        rows={2} placeholder="Any additional information for the property manager…"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                    </div>
                    {disconnectError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{disconnectError}</p>
                    )}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                      A final meter reading will be arranged on or around your move-out date.
                      Your final bill will be emailed within 2 business days.
                    </div>
                    <button onClick={handleDisconnectRequest} disabled={disconnecting || !moveOutDate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors">
                      <Send size={14} />{disconnecting ? 'Submitting…' : 'Submit Disconnection Request'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-3">Questions about this invoice? We&apos;re here to help.</p>
          <div className="flex flex-wrap gap-4">
            <a href={`mailto:${company.email}`}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
              <Mail size={13} />{company.email}
            </a>
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <Phone size={13} />{company.phone}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-4">{company.name} · ABN {company.abn} · {inv.invoiceNumber}</p>
        </div>

      </div>
    </div>
  )
}
