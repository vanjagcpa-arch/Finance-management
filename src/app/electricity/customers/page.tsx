'use client'
import { useState, useMemo } from 'react'
import { Users, Search, Plus, Edit2, Trash2, X, Building2, CreditCard, Mail, Phone } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { BUILDINGS, APARTMENTS } from '@/lib/electricityData'
import type { Customer, PaymentMethod } from '@/lib/electricityTypes'

const EMPTY_CUSTOMER: Omit<Customer, 'id'> = {
  apartmentId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  moveInDate: new Date().toISOString().split('T')[0],
  bankName: '',
  bsb: '',
  accountNumber: '',
  accountName: '',
  myobCardId: '',
  paymentMethod: 'direct_debit',
}

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, removeCustomer, isLoaded } = useElectricity()
  const [search, setSearch] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<Omit<Customer, 'id'>>(EMPTY_CUSTOMER)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const aptMap = useMemo(() => new Map(APARTMENTS.map(a => [a.id, a])), [])
  const bldMap = useMemo(() => new Map(BUILDINGS.map(b => [b.id, b])), [])

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const apt = aptMap.get(c.apartmentId)
      const matchSearch = !search || `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
      const matchBuilding = !filterBuilding || apt?.buildingId === filterBuilding
      return matchSearch && matchBuilding
    })
  }, [customers, search, filterBuilding, aptMap])

  const availableApts = useMemo(() => {
    const occupied = new Set(customers.filter(c => c.id !== editing?.id).map(c => c.apartmentId))
    return APARTMENTS.filter(a =>
      !occupied.has(a.id) &&
      (!filterBuilding || a.buildingId === filterBuilding)
    )
  }, [customers, editing, filterBuilding])

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_CUSTOMER })
    setModalOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ ...c })
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.apartmentId || !form.firstName || !form.lastName || !form.email) return
    const apt = aptMap.get(form.apartmentId)
    const bld = apt ? bldMap.get(apt.buildingId) : undefined
    const myobId = form.myobCardId || `CUST-${form.lastName.toUpperCase().slice(0, 4)}${Date.now().toString().slice(-4)}`

    if (editing) {
      updateCustomer({ ...editing, ...form, myobCardId: myobId })
    } else {
      addCustomer({ id: `cust-${form.apartmentId}-${Date.now()}`, ...form, myobCardId: myobId })
    }
    setModalOpen(false)
  }

  function field(key: keyof typeof form, label: string, type = 'text', required = false) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}{required && ' *'}</label>
        <input
          type={type}
          value={String(form[key] ?? '')}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required={required}
        />
      </div>
    )
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Users size={22} className="text-indigo-600" />Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{customers.length} tenants across {BUILDINGS.length} buildings</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
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
        <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Buildings</option>
          {BUILDINGS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {(search || filterBuilding) && (
          <button onClick={() => { setSearch(''); setFilterBuilding('') }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
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
              <th className="table-header text-left px-4 py-3">MYOB ID</th>
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
              return (
                <tr key={c.id} className="data-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs flex-shrink-0">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-400">Since {c.moveInDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-slate-600"><Mail size={11} />{c.email}</span>
                      <span className="flex items-center gap-1 text-slate-500 text-xs"><Phone size={11} />{c.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {bld && apt ? (
                      <div className="flex items-start gap-1.5">
                        <Building2 size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-700">{bld.name}</p>
                          <p className="text-xs text-slate-400">Unit {apt.unitNumber} · Level {apt.floor}</p>
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
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Personal Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {field('firstName', 'First Name', 'text', true)}
                  {field('lastName', 'Last Name', 'text', true)}
                  {field('email', 'Email Address', 'email', true)}
                  {field('phone', 'Phone Number')}
                  {field('moveInDate', 'Move-in Date', 'date', true)}
                  {field('moveOutDate', 'Move-out Date', 'date')}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Property Assignment</p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Apartment *</label>
                  <select
                    value={form.apartmentId}
                    onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select apartment…</option>
                    {BUILDINGS.map(b => (
                      <optgroup key={b.id} label={b.name}>
                        {(editing && editing.apartmentId ? [APARTMENTS.find(a => a.id === editing.apartmentId)!, ...availableApts.filter(a => a.buildingId === b.id)] : availableApts.filter(a => a.buildingId === b.id))
                          .filter(Boolean)
                          .map(a => <option key={a!.id} value={a!.id}>Unit {a!.unitNumber} – Level {a!.floor} (Meter: {a!.meterNumber})</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment & Banking</p>
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
                  {field('bankName', 'Bank Name')}
                  {field('bsb', 'BSB (nnn-nnn)')}
                  {field('accountNumber', 'Account Number')}
                  {field('accountName', 'Account Name')}
                  {field('myobCardId', 'MYOB Card ID')}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleSave}
                disabled={!form.apartmentId || !form.firstName || !form.lastName || !form.email}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editing ? 'Save Changes' : 'Add Customer'}
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
            <p className="text-sm text-slate-500 mb-5">This will remove the customer from the system. Existing invoices will remain.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { removeCustomer(deleteId!); setDeleteId(null) }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
