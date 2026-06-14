'use client'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap, Download, Calendar, CreditCard, Building2, Check, AlertTriangle, Phone, Mail } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortalData {
  customer: {
    firstName: string; lastName: string; email: string; phone: string
    paymentMethod: 'direct_debit' | 'bpay' | 'eft'
    bsb?: string; accountNumber?: string; accountName?: string
  }
  invoice: {
    invoiceNumber: string; period: string; issueDate: string; dueDate: string
    total: number; usage: number; usageCharge: number; supplyCharge: number
    subtotal: number; gst: number; ratePerKwh: number; daysInPeriod: number
    gstRate: number; status: string; isFinalBill?: boolean
    previousReading: number; currentReading: number
    billingPeriodStart: string; billingPeriodEnd: string
  }
  company: {
    name: string; email: string; phone: string; abn: string
    bpayBillerCode: string; bankBSB: string; bankAccount: string
    bankAccountName: string; bankName: string
  }
  property: {
    unitNumber: string; floor: number; meterNumber: string
    buildingName: string; buildingAddress: string; suburb: string; state: string; postcode: string
  }
  usageHistory: Array<{ label: string; usage: number | null; isCurrent?: boolean; color?: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const aud = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
const fdate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
const usageColor = (u: number | null) => {
  if (u === null) return '#e2e8f0'
  // Simple threshold-agnostic coloring for portal (company thresholds not passed)
  return '#4f46e5'
}

export default function PortalPage() {
  const params = useSearchParams()
  const [downloading, setDownloading] = useState(false)

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
      const { pdf, Document, Page, View, Text, StyleSheet, Font } = await import('@react-pdf/renderer')
      const { createElement: h } = await import('react')

      // Simple styled PDF for portal (no full InvoicePDF component needed — build inline)
      const styles = StyleSheet.create({
        page: { fontFamily: 'Helvetica', fontSize: 9, padding: 40, backgroundColor: '#ffffff' },
        header: { backgroundColor: '#0c1120', padding: 20, marginBottom: 0 },
        strip: { backgroundColor: '#4f46e5', padding: '10 20', marginBottom: 16 },
        row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
        label: { color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
        value: { fontFamily: 'Helvetica-Bold', color: '#1e293b', fontSize: 9 },
        total: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      })

      const PDFDoc = () => h(Document, {},
        h(Page, { size: 'A4', style: styles.page },
          h(View, { style: styles.header },
            h(Text, { style: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' } }, data.company.name),
            h(Text, { style: { color: '#94a3b8', fontSize: 9, marginTop: 2 } }, 'Electricity Billing Services'),
          ),
          h(View, { style: styles.strip },
            h(View, { style: { flexDirection: 'row', gap: 24 } },
              h(View, {},
                h(Text, { style: styles.label }, 'Invoice'),
                h(Text, { style: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 } }, data.invoice.invoiceNumber),
              ),
              h(View, {},
                h(Text, { style: styles.label }, 'Period'),
                h(Text, { style: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 } }, data.invoice.period),
              ),
              h(View, {},
                h(Text, { style: styles.label }, 'Due Date'),
                h(Text, { style: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 } }, fdate(data.invoice.dueDate)),
              ),
            ),
          ),
          h(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 } },
            h(View, { style: { flex: 1, marginRight: 8 } },
              h(Text, { style: { ...styles.label, marginBottom: 4 } }, 'Billed To'),
              h(Text, { style: styles.value }, `${data.customer.firstName} ${data.customer.lastName}`),
              h(Text, { style: { color: '#64748b', fontSize: 8, marginTop: 2 } }, data.customer.email),
            ),
            h(View, { style: { flex: 1 } },
              h(Text, { style: { ...styles.label, marginBottom: 4 } }, 'Property'),
              h(Text, { style: styles.value }, `${data.property.buildingName} — Unit ${data.property.unitNumber}`),
              h(Text, { style: { color: '#64748b', fontSize: 8, marginTop: 2 } }, `${data.property.buildingAddress}, ${data.property.suburb} ${data.property.state}`),
              h(Text, { style: { color: '#94a3b8', fontSize: 7, marginTop: 1 } }, `Meter: ${data.property.meterNumber}`),
            ),
          ),
          h(View, { style: styles.total },
            h(View, {},
              h(Text, { style: { color: '#a5b4fc', fontSize: 8 } }, data.invoice.isFinalBill ? 'Final Amount Due' : 'Total Amount Due'),
              h(Text, { style: { color: '#a5b4fc', fontSize: 7, marginTop: 2 } }, 'Including GST · AUD'),
            ),
            h(Text, { style: { color: '#ffffff', fontSize: 22, fontFamily: 'Helvetica-Bold' } }, aud(data.invoice.total)),
          ),
          // Charges table
          h(Text, { style: { ...styles.label, marginBottom: 6 } }, 'Charges Summary'),
          ...[
            [`Electricity usage (${data.invoice.usage.toLocaleString()} kWh × ${(data.invoice.ratePerKwh*100).toFixed(2)}¢/kWh)`, aud(data.invoice.usageCharge)],
            [`Daily supply charge (${data.invoice.daysInPeriod} days)`, aud(data.invoice.supplyCharge)],
            ['Subtotal (excl. GST)', aud(data.invoice.subtotal)],
            [`GST (${(data.invoice.gstRate*100).toFixed(0)}%)`, aud(data.invoice.gst)],
          ].map(([label, val]) =>
            h(View, { style: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #f1f5f9' } },
              h(Text, { style: { color: '#334155', fontSize: 8 } }, label),
              h(Text, { style: { color: '#1e293b', fontFamily: 'Helvetica-Bold', fontSize: 8 } }, val),
            )
          ),
          // Footer
          h(View, { style: { position: 'absolute', bottom: 20, left: 40, right: 40, borderTop: '1 solid #e2e8f0', paddingTop: 8 } },
            h(Text, { style: { color: '#94a3b8', fontSize: 7 } }, `${data.company.name} · ABN ${data.company.abn} · ${data.company.email} · ${data.company.phone}`),
            h(Text, { style: { color: '#cbd5e1', fontSize: 6, fontFamily: 'Courier', marginTop: 2 } }, data.invoice.invoiceNumber),
          ),
        )
      )

      const blob = await pdf(h(PDFDoc, {})).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${data.invoice.invoiceNumber}.pdf`
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

  const isDDR = customer.paymentMethod === 'direct_debit'
  const bpayRef = inv.invoiceNumber.replace(/-/g, '')

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
                <p className="text-indigo-500 text-xs mt-1">From: {customer.accountName} · BSB {customer.bsb} · Account {customer.accountNumber}</p>
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
