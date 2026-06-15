'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, Search, Plus, Edit2, Trash2, X, Building2, CreditCard, Mail, Phone,
  LogOut, AlertCircle, UserPlus, Calendar, CheckCircle, Send,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import type { Customer, PaymentMethod } from '@/lib/electricityTypes'
import { formatAUD, calculateProRataBill } from '@/lib/electricityUtils'

const EMPTY: Omit<Customer, 'id'> = {
  apartmentId: '', firstName: '', lastName: '', email: '', phone: '',
  moveInDate: new Date().toISOString().split('T')[0],
  bankName: '', bsb: '', accountNumber: '', accountName: '',
  myobCardId: '', paymentMethod: 'direct_debit',
}

export default function CustomersPage() {
  const {
    customers, apartments, buildings, readings, settings,
    addCustomer, updateCustomer, removeCustomer, offboardCustomer, setVacateRequest, isLoaded,
  } = useElectricity()

  const [search,     setSearch]     = useState('')
  const [filterBld,  setFilterBld]  = useState('')
  const [showActive, setShowActive] = useState<'active' | 'all' | 'moved'>('active')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState<Customer | null>(null)
  const [form,       setForm]       = useState<Omit<Customer,'id'>>(EMPTY)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)

  // Finalize vacate state
  const [offboardId,     setOffboardId]     = useState<string | null>(null)
  const [moveOutDate,    setMoveOutDate]     = useState(new Date().toISOString().split('T')[0])
  const [useEstimate,    setUseEstimate]     = useState(true)
  const [manualReading,  setManualReading]   = useState(0)
  const [offboarding,    setOffboarding]     = useState(false)
  const [sendFinalEmail, setSendFinalEmail]  = useState(true)
  const [emailSending,   setEmailSending]    = useState(false)
  const [emailStatus,    setEmailStatus]     = useState<'idle' | 'sent' | 'error'>('idle')

  const aptMap = useMemo(() => new Map(apartments.map(a => [a.id, a])), [apartments])
  const bldMap = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings])

  // Auto-open finalize modal from disconnection-request email deep-link
  useEffect(() => {
    if (!isLoaded) return
    const sp = new URLSearchParams(window.location.search)
    const offboardParam = sp.get('offboard')
    const dateParam     = sp.get('date')
    if (offboardParam) {
      setOffboardId(offboardParam)
      if (dateParam) {
        setMoveOutDate(dateParam)
        setVacateRequest(offboardParam, dateParam)
      }
      setUseEstimate(true)
      setManualReading(0)
      setEmailStatus('idle')
    }
  }, [isLoaded, setVacateRequest])

  const offboardCustomerObj = offboardId ? customers.find(c => c.id === offboardId) : null
  const offboardApt = offboardCustomerObj ? aptMap.get(offboardCustomerObj.apartmentId) : null

  const customerReadings = useMemo(() => {
    if (!offboardApt) return []
    return readings
      .filter(r => r.apartmentId === offboardApt.id)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
  }, [offboardApt, readings])

  const latestReading = customerReadings[0] ?? null

  // Estimate final reading: daily kWh from last billing period × days since that reading
  const estimatedFinalReading = useMemo(() => {
    if (!latestReading || !moveOutDate) return null
    const daysInMonth = new Date(latestReading.year, latestReading.month, 0).getDate()
    const dailyUsage  = latestReading.usage / Math.max(daysInMonth, 1)
    const lastDate    = new Date(latestReading.readingDate + 'T00:00:00')
    const vacateDate  = new Date(moveOutDate + 'T00:00:00')
    const daysSince   = Math.round((vacateDate.getTime() - lastDate.getTime()) / 86400000)
    return Math.round(latestReading.currentReading + dailyUsage * Math.max(0, daysSince))
  }, [latestReading, moveOutDate])

  const effectiveFinalReading = useEstimate
    ? (estimatedFinalReading ?? 0)
    : manualReading

  const proRata = useMemo(() => {
    if (!latestReading || !moveOutDate || effectiveFinalReading < latestReading.currentReading) return null
    const d = new Date(moveOutDate)
    const billingStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`
    return calculateProRataBill(moveOutDate, billingStart, latestReading.currentReading, effectiveFinalReading, settings.tariff)
  }, [latestReading, moveOutDate, effectiveFinalReading, settings.tariff])

  const filtered = useMemo(() => customers.filter(c => {
    const apt = aptMap.get(c.apartmentId)
    const matchSearch = !search || `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
    const matchBld    = !filterBld || apt?.buildingId === filterBld
    const matchActive = showActive === 'all' ? true : showActive === 'active' ? !c.moveOutDate : !!c.moveOutDate
    return matchSearch && matchBld && matchActive
  }), [customers, search, filterBld, showActive, aptMap])

  const occupiedAptIds = useMemo(() =>
    new Set(customers.filter(c => c.id !== editing?.id && !c.moveOutDate).map(c => c.apartmentId)),
    [customers, editing]
  )
  const availableApts = apartments.filter(a => !occupiedAptIds.has(a.id))

  function openAdd() { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true) }
  function openEdit(c: Customer) { setEditing(c); setForm({ ...c }); setModalOpen(true) }

  function handleSave() {
    if (!form.apartmentId || !form.firstName || !form.lastName || !form.email) return
    const myobId = form.myobCardId || `CUST-${form.lastName.toUpperCase().slice(0,4)}${Date.now().toString().slice(-4)}`
    if (editing) {
      updateCustomer({ ...editing, ...form, myobCardId: myobId })
    } else {
      addCustomer({ id: `cust-${form.apartmentId}-${Date.now()}`, ...form, myobCardId: myobId })
    }
    setModalOpen(false)
  }

  function openFinalize(c: Customer) {
    setOffboardId(c.id)
    setMoveOutDate(c.vacateRequestDate || new Date().toISOString().split('T')[0])
    setUseEstimate(true)
    setManualReading(0)
    setEmailStatus('idle')
    setSendFinalEmail(true)
  }

  async function handleFinalize() {
    if (!offboardId || !moveOutDate || effectiveFinalReading <= 0) return
    setOffboarding(true)
    setEmailStatus('idle')

    // Pre-compute invoice number — offboardCustomer will increment counter by 1
    const counterNow = parseInt(localStorage.getItem('elec_counter_v2') ?? '0')
    const month  = parseInt(moveOutDate.split('-')[1])
    const year   = parseInt(moveOutDate.split('-')[0])
    const dayNum = parseInt(moveOutDate.split('-')[2])
    const invoiceNum = `${settings.invoicePrefix}-${year}${String(month).padStart(2,'0')}-${String(counterNow + 1).padStart(4,'0')}`

    offboardCustomer(offboardId, moveOutDate, effectiveFinalReading)

    if (sendFinalEmail && offboardCustomerObj && proRata) {
      setEmailSending(true)
      const dueDate = new Date(year, month - 1, dayNum + settings.paymentTermsDays)
        .toISOString().split('T')[0]
      try {
        const resp = await fetch('/api/send-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: offboardCustomerObj.email,
            customerFirstName: offboardCustomerObj.firstName,
            isDDR: offboardCustomerObj.paymentMethod === 'direct_debit',
            customerBSB: offboardCustomerObj.bsb,
            customerAccount: offboardCustomerObj.accountNumber,
            customerAccountName: offboardCustomerObj.accountName,
            invoiceNumber: invoiceNum,
            period: `Final bill — ${new Date(moveOutDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            issueDate: moveOutDate,
            dueDate,
            isFinalBill: true,
            usage: proRata.usage,
            usageCharge: proRata.usageCharge,
            supplyCharge: proRata.supplyCharge,
            subtotal: proRata.subtotal,
            gst: proRata.gst,
            total: proRata.total,
            ratePerKwh: settings.tariff.ratePerKwh,
            dailySupplyCharge: settings.tariff.dailySupplyCharge,
            daysInPeriod: proRata.daysInPeriod,
            gstRate: settings.tariff.gstRate,
            companyName: settings.companyName,
            fromEmail: settings.senderEmail || settings.email,
            companyEmail: settings.email,
            companyPhone: settings.phone,
            companyABN: settings.abn,
            bpayBillerCode: settings.bpayBillerCode,
            bankBSB: settings.bsb,
            bankAccount: settings.accountNumber,
            bankAccountName: settings.accountName,
            bankName: settings.bankName,
            pdfFilename: `final-bill-${invoiceNum}.pdf`,
          }),
        })
        setEmailStatus(resp.ok ? 'sent' : 'error')
      } catch {
        setEmailStatus('error')
      }
      setEmailSending(false)
    }

    setOffboarding(false)
    if (!sendFinalEmail) setOffboardId(null)
  }

  function field(key: keyof typeof form, label: string, type = 'text', required = false) {
    return (
      <div key={key}>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}{required && ' *'}</label>
        <input type={type} value={String(form[key] ?? '')}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required={required} />
      </div>
    )
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading…</div></div>

  const activeCount       = customers.filter(c => !c.moveOutDate).length
  const movedCount        = customers.filter(c => !!c.moveOutDate).length
  const pendingVacateCount = customers.filter(c => c.vacateRequestDate && !c.moveOutDate).length

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-indigo-600" />Customers
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {activeCount} active · {movedCount} moved out
            {pendingVacateCount > 0 && (
              <span className="text-amber-600 font-medium"> · {pendingVacateCount} pending vacate</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Plus size={15} />Quick Add
          </button>
          <Link href="/electricity/onboard" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <UserPlus size={15} />Onboard Tenant
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone…"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterBld} onChange={e => setFilterBld(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {[['active','Active'],['all','All'],['moved','Moved Out']].map(([val,lbl]) => (
            <button key={val} onClick={() => setShowActive(val as typeof showActive)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${showActive === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {lbl}
            </button>
          ))}
        </div>
        {(search || filterBld) && (
          <button onClick={() => { setSearch(''); setFilterBld('') }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
            <X size={13} />Clear
          </button>
        )}
      </div>

      {/* Table — overflow-x-auto so columns never clip */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-header text-left px-4 py-3">Customer</th>
              <th className="table-header text-left px-4 py-3">Contact</th>
              <th className="table-header text-left px-4 py-3">Property</th>
              <th className="table-header text-left px-4 py-3">Banking</th>
              <th className="table-header text-left px-4 py-3">Vacate Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400">No customers found</td></tr>
            )}
            {filtered.map(c => {
              const apt = aptMap.get(c.apartmentId)
              const bld = apt ? bldMap.get(apt.buildingId) : undefined
              const movedOut     = !!c.moveOutDate
              const pendingVacate = !!c.vacateRequestDate && !movedOut
              return (
                <tr key={c.id} className={`data-row ${movedOut ? 'opacity-60' : ''}`}>
                  {/* Customer */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                        ${movedOut ? 'bg-slate-100 text-slate-400' : pendingVacate ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{c.firstName} {c.lastName}</p>
                        {movedOut
                          ? <p className="text-xs text-red-500">Moved out {c.moveOutDate}</p>
                          : <p className="text-xs text-slate-400">Since {c.moveInDate}</p>}
                      </div>
                    </div>
                  </td>
                  {/* Contact */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-slate-600 text-xs"><Mail size={10} />{c.email}</span>
                      <span className="flex items-center gap-1 text-slate-500 text-xs"><Phone size={10} />{c.phone}</span>
                    </div>
                  </td>
                  {/* Property */}
                  <td className="px-4 py-3">
                    {bld && apt ? (
                      <div className="flex items-start gap-1.5">
                        <Building2 size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-700">{bld.name}</p>
                          <p className="text-xs text-slate-400">Unit {apt.unitNumber} · L{apt.floor}</p>
                        </div>
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  {/* Banking (merged payment + bank + MYOB) */}
                  <td className="px-4 py-3">
                    <span className={`badge-${c.paymentMethod === 'direct_debit' ? 'primary' : 'neutral'} text-xs`}>
                      {c.paymentMethod === 'direct_debit' ? 'DDR' : c.paymentMethod === 'bpay' ? 'BPAY' : 'EFT'}
                    </span>
                    {c.bankName && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <CreditCard size={10} className="flex-shrink-0" />{c.bankName}
                      </p>
                    )}
                    {c.bsb && (
                      <p className="font-mono text-xs text-slate-400">{c.bsb} / {c.accountNumber}</p>
                    )}
                    {c.myobCardId && (
                      <span className="font-mono text-xs text-slate-300 bg-slate-50 px-1 py-0.5 rounded">{c.myobCardId}</span>
                    )}
                  </td>
                  {/* Vacate Date */}
                  <td className="px-4 py-3 min-w-[140px]">
                    {movedOut ? (
                      <span className="text-xs text-slate-400">Moved out</span>
                    ) : pendingVacate ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <Calendar size={11} className="text-amber-500 flex-shrink-0" />
                          <span className="text-xs font-semibold text-amber-700">{c.vacateRequestDate}</span>
                        </div>
                        <button onClick={() => openFinalize(c)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors whitespace-nowrap">
                          <LogOut size={10} />Finalize Vacate
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => openEdit(c)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors">
                        <Edit2 size={11} />Edit
                      </button>
                      {!movedOut && (
                        <button onClick={() => openFinalize(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Finalize vacate">
                          <LogOut size={13} />
                        </button>
                      )}
                      <button onClick={() => setDeleteId(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {field('firstName','First Name','text',true)}
                  {field('lastName','Last Name','text',true)}
                  {field('email','Email','email',true)}
                  {field('phone','Phone')}
                  {field('moveInDate','Move-in Date','date',true)}
                  {field('moveOutDate','Move-out Date','date')}
                  {field('vacateRequestDate','Requested Vacate Date','date')}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Property Assignment</p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Apartment *</label>
                  <select value={form.apartmentId} onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select apartment…</option>
                    {buildings.map(b => (
                      <optgroup key={b.id} label={b.name}>
                        {(editing?.apartmentId
                          ? [apartments.find(a => a.id === editing.apartmentId), ...availableApts.filter(a => a.buildingId === b.id)].filter(Boolean)
                          : availableApts.filter(a => a.buildingId === b.id)
                        ).map(a => a && <option key={a.id} value={a.id}>Unit {a.unitNumber} – Level {a.floor} (Meter: {a.meterNumber})</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payment & Banking</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
                    <select value={form.paymentMethod}
                      onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="direct_debit">Direct Debit (DDR)</option>
                      <option value="bpay">BPAY</option>
                      <option value="eft">EFT Transfer</option>
                    </select>
                  </div>
                  {field('bankName','Bank Name')}
                  {field('bsb','BSB (nnn-nnn)')}
                  {field('accountNumber','Account Number')}
                  {field('accountName','Account Name')}
                  {field('myobCardId','MYOB Card ID')}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={handleSave} disabled={!form.apartmentId || !form.firstName || !form.lastName || !form.email}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
                {editing ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Finalize Vacate Modal ──────────────────────────────────────────────── */}
      {offboardId && offboardCustomerObj && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <LogOut size={18} className="text-amber-500" />Finalize Vacate
              </h2>
              <button onClick={() => setOffboardId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-sm font-bold flex-shrink-0">
                  {offboardCustomerObj.firstName[0]}{offboardCustomerObj.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-amber-900">{offboardCustomerObj.firstName} {offboardCustomerObj.lastName}</p>
                  {offboardApt && (
                    <p className="text-sm text-amber-700">Unit {offboardApt.unitNumber} · {bldMap.get(offboardApt.buildingId)?.name}</p>
                  )}
                  <p className="text-xs text-amber-600 mt-0.5">
                    {offboardCustomerObj.paymentMethod === 'direct_debit' ? 'Direct Debit (DDR)' : offboardCustomerObj.paymentMethod === 'bpay' ? 'BPAY' : 'EFT'}
                    {latestReading && ` · Last reading: ${latestReading.currentReading.toLocaleString()} kWh (${latestReading.readingDate})`}
                  </p>
                </div>
              </div>

              {/* Vacate date */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vacate Date *</label>
                <input type="date" value={moveOutDate}
                  onChange={e => { setMoveOutDate(e.target.value); setEmailStatus('idle') }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Meter reading */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Final Meter Reading (kWh)</p>
                {estimatedFinalReading !== null && (
                  <div className="flex gap-2">
                    <button onClick={() => setUseEstimate(true)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        useEstimate ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>
                      Use Estimate ({estimatedFinalReading.toLocaleString()} kWh)
                    </button>
                    <button onClick={() => setUseEstimate(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        !useEstimate ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}>
                      Enter Manually
                    </button>
                  </div>
                )}
                {useEstimate && estimatedFinalReading !== null ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5 text-xs text-indigo-700">
                    Based on {latestReading?.usage.toLocaleString()} kWh in{' '}
                    {latestReading ? new Date(latestReading.year, latestReading.month - 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) : 'prior month'}.{' '}
                    Daily avg: {latestReading ? (latestReading.usage / new Date(latestReading.year, latestReading.month, 0).getDate()).toFixed(1) : '—'} kWh.
                  </div>
                ) : (
                  <>
                    <input type="number" value={manualReading || ''}
                      onChange={e => setManualReading(parseFloat(e.target.value) || 0)}
                      placeholder={latestReading ? `Must be ≥ ${latestReading.currentReading.toLocaleString()} kWh` : 'Enter reading'}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    {manualReading > 0 && latestReading && manualReading < latestReading.currentReading && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={11} />Must be ≥ {latestReading.currentReading.toLocaleString()} kWh
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Final bill preview */}
              {proRata && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Final Bill Preview</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Usage ({proRata.usage.toLocaleString()} kWh × {(settings.tariff.ratePerKwh * 100).toFixed(2)}¢)</span>
                      <span className="font-mono">{formatAUD(proRata.usageCharge)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Supply ({proRata.daysInPeriod} days)</span>
                      <span className="font-mono">{formatAUD(proRata.supplyCharge)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs border-t border-slate-200 pt-1.5 mt-1.5">
                      <span>Subtotal + GST (10%)</span>
                      <span className="font-mono">{formatAUD(proRata.subtotal)} + {formatAUD(proRata.gst)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                      <span>TOTAL DUE</span>
                      <span className="font-mono text-indigo-700 text-base">{formatAUD(proRata.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Email toggle */}
              {proRata && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => { setSendFinalEmail(v => !v); setEmailStatus('idle') }}>
                    <div className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${sendFinalEmail ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendFinalEmail ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-slate-700 font-medium">Email final bill to tenant</span>
                  </label>

                  {sendFinalEmail && (
                    <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                      offboardCustomerObj.paymentMethod === 'direct_debit'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      {offboardCustomerObj.paymentMethod === 'direct_debit' ? (
                        <>
                          <p className="font-semibold">DDR notice will confirm:</p>
                          <p>· {formatAUD(proRata.total)} will be automatically debited on the due date</p>
                          <p>· Account: {offboardCustomerObj.bsb} / {offboardCustomerObj.accountNumber}</p>
                          <p>· No action required from the tenant</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">Payment request will include:</p>
                          <p>· Final bill: {formatAUD(proRata.total)} due within {settings.paymentTermsDays} days</p>
                          <p>· {offboardCustomerObj.paymentMethod === 'bpay' ? 'BPAY biller code & reference' : 'EFT bank details & reference'}</p>
                        </>
                      )}
                      <p className="mt-1 text-slate-500">→ {offboardCustomerObj.email}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Email result */}
              {emailStatus === 'sent' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <CheckCircle size={15} className="flex-shrink-0" />
                  Final bill emailed to {offboardCustomerObj.email}. Draft invoice created.
                </div>
              )}
              {emailStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  Email failed — draft invoice was still created. Retry from the Invoices page.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setOffboardId(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">
                {emailStatus !== 'idle' ? 'Close' : 'Cancel'}
              </button>
              {emailStatus === 'idle' && (
                <button onClick={handleFinalize}
                  disabled={offboarding || emailSending || !moveOutDate || effectiveFinalReading <= 0}
                  className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 flex items-center gap-2">
                  {emailSending ? (
                    <><Send size={14} />Sending email…</>
                  ) : offboarding ? (
                    <><LogOut size={14} />Processing…</>
                  ) : (
                    <><LogOut size={14} />{sendFinalEmail && proRata ? 'Finalize & Send Final Bill' : 'Finalize Vacate'}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove Customer?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This permanently removes the customer record. Use Finalize Vacate instead to generate a final bill first.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { removeCustomer(deleteId!); setDeleteId(null) }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
