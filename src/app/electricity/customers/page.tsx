'use client'
import { useState, useMemo } from 'react'
import { Users, Search, Plus, Edit2, Trash2, X, Building2, CreditCard, Mail, Phone, LogOut, AlertCircle } from 'lucide-react'
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
  const { customers, apartments, buildings, readings, settings, addCustomer, updateCustomer, removeCustomer, offboardCustomer, isLoaded } = useElectricity()
  const [search,     setSearch]     = useState('')
  const [filterBld,  setFilterBld]  = useState('')
  const [showActive, setShowActive] = useState<'active' | 'all' | 'moved'>('active')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState<Customer | null>(null)
  const [form,       setForm]       = useState<Omit<Customer,'id'>>(EMPTY)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  // Offboarding
  const [offboardId,     setOffboardId]     = useState<string | null>(null)
  const [moveOutDate,    setMoveOutDate]     = useState(new Date().toISOString().split('T')[0])
  const [finalReading,   setFinalReading]   = useState(0)
  const [offboarding,    setOffboarding]    = useState(false)

  const aptMap = useMemo(() => new Map(apartments.map(a => [a.id, a])), [apartments])
  const bldMap = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings])

  const offboardCustomerObj = offboardId ? customers.find(c => c.id === offboardId) : null
  const offboardApt = offboardCustomerObj ? aptMap.get(offboardCustomerObj.apartmentId) : null

  const latestReading = useMemo(() => {
    if (!offboardApt) return null
    return readings
      .filter(r => r.apartmentId === offboardApt.id)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0] ?? null
  }, [offboardApt, readings])

  const proRata = useMemo(() => {
    if (!latestReading || !moveOutDate || finalReading < latestReading.currentReading) return null
    const now = new Date(moveOutDate)
    const billingStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`
    return calculateProRataBill(moveOutDate, billingStart, latestReading.currentReading, finalReading, settings.tariff)
  }, [latestReading, moveOutDate, finalReading, settings.tariff])

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const apt = aptMap.get(c.apartmentId)
      const matchSearch  = !search || `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
      const matchBld     = !filterBld || apt?.buildingId === filterBld
      const matchActive  = showActive === 'all' ? true : showActive === 'active' ? !c.moveOutDate : !!c.moveOutDate
      return matchSearch && matchBld && matchActive
    })
  }, [customers, search, filterBld, showActive, aptMap])

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

  function handleOffboard() {
    if (!offboardId || !moveOutDate) return
    setOffboarding(true)
    setTimeout(() => {
      offboardCustomer(offboardId, moveOutDate, finalReading || (latestReading?.currentReading ?? 0))
      setOffboarding(false)
      setOffboardId(null)
    }, 600)
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

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  const activeCount = customers.filter(c => !c.moveOutDate).length
  const movedCount  = customers.filter(c => !!c.moveOutDate).length

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Users size={22} className="text-indigo-600" />Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{activeCount} active · {movedCount} moved out</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={15} />Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
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
          {[['active','Active'],['all','All'],['moved','Moved Out']] .map(([val,lbl]) => (
            <button key={val} onClick={() => setShowActive(val as typeof showActive)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${showActive === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {lbl}
            </button>
          ))}
        </div>
        {(search || filterBld) && (
          <button onClick={() => { setSearch(''); setFilterBld('') }} className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
            <X size={13} />Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-header text-left px-4 py-3">Customer</th>
              <th className="table-header text-left px-4 py-3">Contact</th>
              <th className="table-header text-left px-4 py-3">Property</th>
              <th className="table-header text-left px-4 py-3">Payment</th>
              <th className="table-header text-left px-4 py-3">Bank</th>
              <th className="table-header text-left px-4 py-3">MYOB</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400">No customers found</td></tr>
            )}
            {filtered.map(c => {
              const apt = aptMap.get(c.apartmentId)
              const bld = apt ? bldMap.get(apt.buildingId) : undefined
              const movedOut = !!c.moveOutDate
              return (
                <tr key={c.id} className={`data-row ${movedOut ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                        ${movedOut ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-700'}`}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{c.firstName} {c.lastName}</p>
                        {movedOut
                          ? <p className="text-xs text-red-500">Moved out {c.moveOutDate}</p>
                          : <p className="text-xs text-slate-400">Since {c.moveInDate}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-slate-600 text-xs"><Mail size={10} />{c.email}</span>
                      <span className="flex items-center gap-1 text-slate-500 text-xs"><Phone size={10} />{c.phone}</span>
                    </div>
                  </td>
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
                  <td className="px-4 py-3">
                    <span className={`badge-${c.paymentMethod === 'direct_debit' ? 'primary' : 'neutral'}`}>
                      {c.paymentMethod === 'direct_debit' ? 'DDR' : c.paymentMethod === 'bpay' ? 'BPAY' : 'EFT'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5">
                      <CreditCard size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-700 text-xs">{c.bankName}</p>
                        <p className="text-slate-400 text-xs font-mono">{c.bsb} / {c.accountNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{c.myobCardId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 size={13} /></button>
                      {!movedOut && (
                        <button onClick={() => { setOffboardId(c.id); setMoveOutDate(new Date().toISOString().split('T')[0]); setFinalReading(0) }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Offboard customer">
                          <LogOut size={13} />
                        </button>
                      )}
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
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

      {/* Offboard Modal */}
      {offboardId && offboardCustomerObj && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <LogOut size={18} className="text-amber-500" />Offboard Customer
              </h2>
              <button onClick={() => setOffboardId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-semibold text-amber-900">{offboardCustomerObj.firstName} {offboardCustomerObj.lastName}</p>
                {offboardApt && (
                  <p className="text-sm text-amber-700 mt-0.5">
                    Unit {offboardApt.unitNumber} · {bldMap.get(offboardApt.buildingId)?.name}
                  </p>
                )}
                {latestReading && (
                  <p className="text-xs text-amber-600 mt-1">Last reading: {latestReading.currentReading.toLocaleString()} kWh ({latestReading.readingDate})</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Move-out Date *</label>
                <input type="date" value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Final Meter Reading (kWh) *</label>
                <input type="number" value={finalReading || ''}
                  onChange={e => setFinalReading(parseFloat(e.target.value) || 0)}
                  placeholder={latestReading ? `Last: ${latestReading.currentReading.toLocaleString()} kWh` : 'Enter final reading'}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {finalReading > 0 && latestReading && finalReading < latestReading.currentReading && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />Final reading must be ≥ previous reading ({latestReading.currentReading.toLocaleString()} kWh)
                  </p>
                )}
              </div>

              {/* Pro-rata preview */}
              {proRata && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Final Bill Preview</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Usage ({proRata.usage} kWh × {(settings.tariff.ratePerKwh*100).toFixed(2)}¢)</span>
                      <span className="font-mono">{formatAUD(proRata.usageCharge)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Supply ({proRata.daysInPeriod} days)</span>
                      <span className="font-mono">{formatAUD(proRata.supplyCharge)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>Subtotal + GST</span>
                      <span className="font-mono">{formatAUD(proRata.subtotal)} + {formatAUD(proRata.gst)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                      <span>TOTAL DUE</span>
                      <span className="font-mono text-indigo-700">{formatAUD(proRata.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400">
                A final invoice will be created as a draft. The apartment will be available for a new tenant immediately.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setOffboardId(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={handleOffboard} disabled={offboarding || !moveOutDate || finalReading <= 0}
                className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 flex items-center gap-2">
                <LogOut size={14} />{offboarding ? 'Processing…' : 'Confirm Offboard & Generate Final Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove Customer?</h3>
            <p className="text-sm text-slate-500 mb-5">This permanently removes the customer record. Use offboard instead to generate a final bill first.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { removeCustomer(deleteId!); setDeleteId(null) }} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
