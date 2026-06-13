'use client'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ArrowLeft, Printer, Send, Check, Zap, Building2, User, Calendar, CreditCard, BarChart3 } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { BUILDINGS, APARTMENTS } from '@/lib/electricityData'
import { formatAUD, formatDate, monthName } from '@/lib/electricityUtils'
import type { ElectricityInvoice } from '@/lib/electricityTypes'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { invoices, customers, settings, updateInvoice, readings, isLoaded } = useElectricity()
  const [emailSent, setEmailSent] = useState(false)
  const [sending, setSending] = useState(false)

  const invoice = useMemo(() => invoices.find(i => i.id === id), [invoices, id])
  const customer = useMemo(() => invoice ? customers.find(c => c.id === invoice.customerId) : undefined, [invoice, customers])
  const apt = useMemo(() => invoice ? APARTMENTS.find(a => a.id === invoice.apartmentId) : undefined, [invoice])
  const building = useMemo(() => apt ? BUILDINGS.find(b => b.id === apt.buildingId) : undefined, [apt])
  const prevReading = useMemo(() => {
    if (!invoice) return null
    const prevMonth = invoice.month === 1 ? 12 : invoice.month - 1
    const prevYear = invoice.month === 1 ? invoice.year - 1 : invoice.year
    return readings.find(r => r.apartmentId === invoice.apartmentId && r.month === prevMonth && r.year === prevYear)
  }, [invoice, readings])

  const avgUsage = useMemo(() => {
    if (!invoice) return 0
    const aptReadings = readings.filter(r => r.apartmentId === invoice.apartmentId)
    if (aptReadings.length === 0) return invoice.usage
    return Math.round(aptReadings.reduce((s, r) => s + r.usage, 0) / aptReadings.length)
  }, [invoice, readings])

  function handlePrint() {
    window.print()
  }

  function handleSend() {
    setSending(true)
    setTimeout(() => {
      if (invoice) updateInvoice({ ...invoice, status: 'sent' })
      setSending(false)
      setEmailSent(true)
    }, 1200)
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

  const usagePct = Math.min(100, avgUsage > 0 ? (invoice.usage / avgUsage) * 100 : 100)

  return (
    <>
      {/* Screen toolbar - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} />Back to Invoices
        </button>
        <div className="flex items-center gap-2">
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
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            <Printer size={14} />Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="flex-1 overflow-y-auto bg-slate-100 print:bg-white py-8 print:py-0">
        <div className="max-w-3xl mx-auto print:max-w-none">
          <div className="bg-white shadow-xl rounded-2xl print:shadow-none print:rounded-none overflow-hidden">

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
                <div className="mt-2">
                  <p className="text-indigo-400 font-mono text-sm font-bold">{invoice.invoiceNumber}</p>
                  <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full
                    ${invoice.status === 'paid' ? 'bg-emerald-500 text-white' :
                      invoice.status === 'overdue' ? 'bg-red-500 text-white' :
                      invoice.status === 'sent' ? 'bg-indigo-500 text-white' :
                      'bg-slate-600 text-slate-200'}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice meta strip */}
            <div className="bg-indigo-600 px-10 py-4 flex gap-8">
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Invoice Date</p>
                <p className="text-white font-semibold text-sm mt-0.5">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Due Date</p>
                <p className="text-white font-semibold text-sm mt-0.5">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Billing Period</p>
                <p className="text-white font-semibold text-sm mt-0.5">{monthName(invoice.month, invoice.year)}</p>
              </div>
              {invoice.status === 'paid' && invoice.paidDate && (
                <div className="ml-auto">
                  <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Paid On</p>
                  <p className="text-white font-semibold text-sm mt-0.5">{formatDate(invoice.paidDate)}</p>
                </div>
              )}
            </div>

            {/* Bill To / Property */}
            <div className="grid grid-cols-2 px-10 py-8 gap-8 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To</p>
                </div>
                <p className="font-bold text-slate-900 text-lg">{customer.firstName} {customer.lastName}</p>
                <p className="text-slate-600 text-sm mt-1">{customer.email}</p>
                <p className="text-slate-600 text-sm">{customer.phone}</p>
                <p className="text-slate-400 text-xs mt-2">Account: {customer.myobCardId}</p>
                <p className="text-slate-400 text-xs">Move-in: {customer.moveInDate}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Property</p>
                </div>
                <p className="font-bold text-slate-900 text-lg">{building.name}</p>
                <p className="text-slate-600 text-sm mt-1">Unit {apt.unitNumber}, Level {apt.floor}</p>
                <p className="text-slate-600 text-sm">{building.address}</p>
                <p className="text-slate-600 text-sm">{building.suburb} {building.state} {building.postcode}</p>
                <p className="text-slate-400 text-xs mt-2">Meter: {apt.meterNumber}</p>
              </div>
            </div>

            {/* Meter Readings */}
            <div className="px-10 py-7 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={15} className="text-indigo-600" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meter Readings</p>
                <span className="text-xs text-slate-400 ml-auto">{invoice.billingPeriodStart} → {invoice.billingPeriodEnd} ({invoice.daysInPeriod} days)</span>
              </div>

              {/* Reading cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
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

              {/* Usage bar vs average */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Usage vs. historical average ({avgUsage} kWh)</span>
                  <span className={invoice.usage > avgUsage ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                    {invoice.usage > avgUsage ? `+${invoice.usage - avgUsage} kWh above average` : `${avgUsage - invoice.usage} kWh below average`}
                  </span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usagePct > 110 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-300 mt-1">
                  <span>0 kWh</span>
                  <span>{avgUsage} kWh avg</span>
                </div>
              </div>
            </div>

            {/* Charges */}
            <div className="px-10 py-7">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard size={15} className="text-indigo-600" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Charges</p>
              </div>

              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 text-slate-700">
                      <span className="font-medium">Electricity usage</span>
                      <span className="text-slate-400 ml-2 text-xs">{invoice.usage.toLocaleString()} kWh × {(invoice.ratePerKwh * 100).toFixed(2)}¢/kWh</span>
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-slate-900">{formatAUD(invoice.usageCharge)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 text-slate-700">
                      <span className="font-medium">Daily supply charge</span>
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

              {/* Total box */}
              <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div>
                    <p className="text-indigo-200 text-sm font-medium">Total Amount Due</p>
                    <p className="text-indigo-200 text-xs mt-0.5">Including GST</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-black text-4xl font-mono tracking-tight">{formatAUD(invoice.total)}</p>
                    <p className="text-indigo-200 text-xs mt-1">AUD · Due {formatDate(invoice.dueDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="mx-10 mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={14} className="text-slate-500" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Information</p>
              </div>

              <div className="space-y-4">
                {customer.paymentMethod === 'direct_debit' && (
                  <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-indigo-900 text-sm">Direct Debit (DDR)</p>
                      <p className="text-indigo-700 text-sm mt-0.5">
                        {formatAUD(invoice.total)} will be automatically debited on <strong>{formatDate(invoice.dueDate)}</strong>
                      </p>
                      <p className="text-indigo-600 text-xs mt-1">
                        From: {customer.accountName} · BSB: {customer.bsb} · Account: {customer.accountNumber}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {settings.bpayBillerCode && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <p className="font-semibold text-slate-700 mb-1.5">BPAY</p>
                      <p className="text-slate-500 text-xs">Biller Code: <span className="font-mono font-medium text-slate-700">{settings.bpayBillerCode}</span></p>
                      <p className="text-slate-500 text-xs">Reference: <span className="font-mono font-medium text-slate-700">{invoice.invoiceNumber.replace(/-/g, '')}</span></p>
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
              <p className="text-xs text-slate-400">
                {settings.companyName} · ABN {settings.abn} · {settings.email} · {settings.phone}
              </p>
              <p className="text-xs text-slate-300 font-mono">{invoice.invoiceNumber}</p>
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
