'use client'
import { useState, useMemo } from 'react'
import { Download, FileText, Building2, Users, CreditCard, Check, AlertCircle, Settings, ChevronRight } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { BUILDINGS, APARTMENTS } from '@/lib/electricityData'
import {
  formatAUD, monthName,
  generateABAFile, generateMYOBCustomerExport, generateMYOBInvoiceExport, generateMYOBReceiptsExport,
  downloadFile,
} from '@/lib/electricityUtils'

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 5 - i, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) }
})

export default function ExportsPage() {
  const { customers, invoices, settings, updateSettings, isLoaded } = useElectricity()
  const [selectedMonth, setSelectedMonth] = useState(5)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [toast, setToast] = useState('')
  const [editSettings, setEditSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState(settings)

  const monthInvoices = useMemo(() =>
    invoices.filter(i => i.month === selectedMonth && i.year === selectedYear),
    [invoices, selectedMonth, selectedYear]
  )

  const ddInvoices = useMemo(() =>
    monthInvoices.filter(inv => {
      const c = customers.find(c => c.id === inv.customerId)
      return c?.paymentMethod === 'direct_debit' && inv.status === 'sent'
    }),
    [monthInvoices, customers]
  )

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function handleABA() {
    const content = generateABAFile(monthInvoices, customers, settings, new Date())
    downloadFile(content, `electricity_ddr_${selectedYear}${String(selectedMonth).padStart(2, '0')}.aba`, 'text/plain;charset=ascii')
    showToast(`ABA file downloaded — ${ddInvoices.length} direct debit transactions`)
  }

  function handleMYOBCustomers() {
    const csv = generateMYOBCustomerExport(customers, APARTMENTS, BUILDINGS)
    downloadFile(csv, `myob_customers_${Date.now()}.csv`, 'text/csv')
    showToast(`MYOB customer export downloaded — ${customers.length} customers`)
  }

  function handleMYOBInvoices() {
    const csv = generateMYOBInvoiceExport(monthInvoices, customers, APARTMENTS, BUILDINGS)
    downloadFile(csv, `myob_invoices_${selectedYear}${String(selectedMonth).padStart(2, '0')}.csv`, 'text/csv')
    showToast(`MYOB invoice export downloaded — ${monthInvoices.length} invoices`)
  }

  function handleMYOBReceipts() {
    const csv = generateMYOBReceiptsExport(monthInvoices, customers)
    const paidCount = monthInvoices.filter(i => i.status === 'paid').length
    downloadFile(csv, `myob_receipts_${selectedYear}${String(selectedMonth).padStart(2, '0')}.csv`, 'text/csv')
    showToast(`MYOB receipts export downloaded — ${paidCount} payments`)
  }

  function handleSaveSettings() {
    updateSettings(settingsForm)
    setEditSettings(false)
    showToast('Settings saved')
  }

  const totalDDAmount = ddInvoices.reduce((s, i) => s + i.total, 0)

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Download size={22} className="text-indigo-600" />Exports</h1>
          <p className="text-slate-500 text-sm mt-0.5">ABA direct debit files · MYOB integration exports</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={`${selectedYear}-${selectedMonth}`}
            onChange={e => { const [y, m] = e.target.value.split('-'); setSelectedYear(+y); setSelectedMonth(+m) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {MONTHS.map(opt => <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>)}
          </select>
          <button onClick={() => { setSettingsForm(settings); setEditSettings(true) }}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            <Settings size={14} />Settings
          </button>
        </div>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: monthInvoices.length },
          { label: 'DDR (sent)', value: ddInvoices.length },
          { label: 'DDR Total', value: formatAUD(totalDDAmount) },
          { label: 'Paid', value: monthInvoices.filter(i => i.status === 'paid').length },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{s.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ABA File */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CreditCard size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">ABA Direct Debit File</h2>
              <p className="text-xs text-slate-400">BECS format for your bank</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Period</span>
              <span className="font-medium text-slate-700">{monthName(selectedMonth, selectedYear)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">DDR Customers</span>
              <span className="font-medium text-slate-700">{ddInvoices.length} transactions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Debit Amount</span>
              <span className="font-bold text-slate-900">{formatAUD(totalDDAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Originating Account</span>
              <span className="font-mono text-xs text-slate-600">{settings.bsb} / {settings.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Institution</span>
              <span className="text-slate-700">{settings.bankName} ({settings.institutionCode})</span>
            </div>
          </div>

          {ddInvoices.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg mb-4">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">No DDR invoices with "Sent" status for this month. Mark DDR invoices as sent first.</p>
            </div>
          )}

          <button onClick={handleABA}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
            <Download size={16} />Download ABA File
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">Upload to your bank's internet banking system</p>
        </div>

        {/* MYOB Exports */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">MYOB AccountRight</h2>
              <p className="text-xs text-slate-400">Import-ready CSV files</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Customer Cards Export',
                desc: `${customers.length} customers — import as new or update existing cards`,
                icon: Users,
                color: 'bg-indigo-50 text-indigo-600',
                action: handleMYOBCustomers,
                filename: 'myob_customers.csv',
                note: 'Includes bank details for DDR setup',
              },
              {
                label: 'Sales Invoices Export',
                desc: `${monthInvoices.length} invoices for ${monthName(selectedMonth, selectedYear)}`,
                icon: FileText,
                color: 'bg-purple-50 text-purple-600',
                action: handleMYOBInvoices,
                filename: 'myob_invoices.csv',
                note: 'Import into MYOB Sales module',
              },
              {
                label: 'DDR Receipts Export',
                desc: `${monthInvoices.filter(i => i.status === 'paid').length} paid invoices — record direct debit receipts`,
                icon: CreditCard,
                color: 'bg-emerald-50 text-emerald-600',
                action: handleMYOBReceipts,
                filename: 'myob_receipts.csv',
                note: 'Import into MYOB Receive Payments',
              },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left group">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{item.note}</p>
                </div>
                <Download size={14} className="text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Building breakdown */}
      <div className="card p-5">
        <h2 className="section-title">Building Breakdown — {monthName(selectedMonth, selectedYear)}</h2>
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
            {BUILDINGS.map(b => {
              const bInvs = monthInvoices.filter(i => i.buildingId === b.id)
              const bDDR = bInvs.filter(i => {
                const c = customers.find(c => c.id === i.customerId)
                return c?.paymentMethod === 'direct_debit' && i.status === 'sent'
              })
              const bPaid = bInvs.filter(i => i.status === 'paid')
              const bTotal = bInvs.reduce((s, i) => s + i.total, 0)
              const bCollected = bPaid.reduce((s, i) => s + i.total, 0)
              return (
                <tr key={b.id} className="data-row">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-800">{b.name}</p>
                        <p className="text-xs text-slate-400">{b.address}</p>
                      </div>
                    </div>
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
              <td className="pt-2.5 text-right font-semibold">{monthInvoices.length}</td>
              <td className="pt-2.5 text-right font-semibold">{ddInvoices.length}</td>
              <td className="pt-2.5 text-right font-semibold text-emerald-700">{monthInvoices.filter(i => i.status === 'paid').length}</td>
              <td className="pt-2.5 text-right font-mono font-bold">{formatAUD(monthInvoices.reduce((s, i) => s + i.total, 0))}</td>
              <td className="pt-2.5 text-right font-mono font-bold text-emerald-700">{formatAUD(monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0))}</td>
              <td className="pt-2.5 text-right font-mono font-bold text-amber-700">{formatAUD(monthInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Settings Modal */}
      {editSettings && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Billing Settings</h2>
              <button onClick={() => setEditSettings(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Company Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['companyName', 'abn', 'address', 'suburb', 'state', 'postcode', 'phone', 'email'] as const).map(key => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <input value={settingsForm[key]} onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bank & ABA Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['bankName', 'bsb', 'accountNumber', 'accountName', 'apcsUserId', 'institutionCode', 'bpayBillerCode'] as const).map(key => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <input value={settingsForm[key]} onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tariff</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'ratePerKwh', label: 'Rate ($/kWh)' },
                    { key: 'dailySupplyCharge', label: 'Supply Charge ($/day)' },
                    { key: 'gstRate', label: 'GST Rate (e.g. 0.10)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                      <input type="number" step="0.0001"
                        value={settingsForm.tariff[key as keyof typeof settingsForm.tariff]}
                        onChange={e => setSettingsForm(f => ({ ...f, tariff: { ...f.tariff, [key]: parseFloat(e.target.value) } }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Invoice Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Prefix</label>
                    <input value={settingsForm.invoicePrefix} onChange={e => setSettingsForm(f => ({ ...f, invoicePrefix: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms (days)</label>
                    <input type="number" value={settingsForm.paymentTermsDays}
                      onChange={e => setSettingsForm(f => ({ ...f, paymentTermsDays: parseInt(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setEditSettings(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={handleSaveSettings} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
