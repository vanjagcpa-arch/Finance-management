'use client'
import { useState } from 'react'
import { Settings, Building2, Zap, CreditCard, Save, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { generateApartmentsForBuilding } from '@/lib/electricityData'
import type { Building, ElectricitySettings } from '@/lib/electricityTypes'

type Tab = 'company' | 'buildings' | 'tariff' | 'banking'

const TABS: Array<{ id: Tab; label: string; icon: typeof Settings }> = [
  { id: 'company',   label: 'Company & Invoice', icon: Settings },
  { id: 'buildings', label: 'Buildings',          icon: Building2 },
  { id: 'tariff',    label: 'Electricity Tariff', icon: Zap },
  { id: 'banking',   label: 'Banking & ABA',      icon: CreditCard },
]

const EMPTY_BUILDING: Omit<Building, 'id'> = {
  name: '', address: '', suburb: '', state: 'VIC', postcode: '',
  totalUnits: 80, lowUsageThreshold: 180, highUsageThreshold: 380, notes: '',
}

export default function SettingsPage() {
  const { settings, buildings, customers, apartments, updateSettings, addBuilding, updateBuilding, removeBuilding, resetToDemo, isLoaded } = useElectricity()
  const [tab,   setTab]   = useState<Tab>('company')
  const [form,  setForm]  = useState<ElectricitySettings>(settings)
  const [saved, setSaved] = useState(false)
  const [bldModal, setBldModal]   = useState(false)
  const [editBld,  setEditBld]    = useState<Building | null>(null)
  const [bldForm,  setBldForm]    = useState<Omit<Building,'id'>>(EMPTY_BUILDING)
  const [bldFloors, setBldFloors] = useState(8)
  const [bldUPF,    setBldUPF]    = useState(10)
  const [deleteBld, setDeleteBld] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function handleSave() {
    updateSettings(form)
    setSaved(true)
    showToast('Settings saved')
    setTimeout(() => setSaved(false), 2000)
  }

  function openAddBuilding() {
    setEditBld(null)
    setBldForm({ ...EMPTY_BUILDING })
    setBldFloors(8)
    setBldUPF(10)
    setBldModal(true)
  }

  function openEditBuilding(b: Building) {
    setEditBld(b)
    setBldForm({ name: b.name, address: b.address, suburb: b.suburb, state: b.state, postcode: b.postcode,
      totalUnits: b.totalUnits, lowUsageThreshold: b.lowUsageThreshold, highUsageThreshold: b.highUsageThreshold, notes: b.notes })
    setBldModal(true)
  }

  function handleSaveBuilding() {
    if (!bldForm.name || !bldForm.address) return
    if (editBld) {
      updateBuilding({ ...editBld, ...bldForm })
      showToast(`${bldForm.name} updated`)
    } else {
      const newId = `b-${Date.now()}`
      const newBuilding: Building = { id: newId, ...bldForm, totalUnits: bldFloors * bldUPF }
      addBuilding(newBuilding)
      showToast(`${bldForm.name} added with ${bldFloors * bldUPF} apartments`)
    }
    setBldModal(false)
  }

  function handleDeleteBuilding(id: string) {
    const hasCustomers = customers.some(c => apartments.find(a => a.id === c.apartmentId)?.buildingId === id)
    if (hasCustomers) { showToast('Cannot remove — building has active customers'); setDeleteBld(null); return }
    removeBuilding(id)
    showToast('Building removed')
    setDeleteBld(null)
  }

  function sf(key: keyof ElectricitySettings, val: string | number) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function field(key: keyof ElectricitySettings, label: string, type = 'text') {
    const val = form[key]
    return (
      <div key={key}>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input type={type} value={String(val ?? '')}
          onChange={e => sf(key, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
    )
  }

  function bldField(key: keyof Omit<Building,'id'>, label: string, type = 'text') {
    return (
      <div key={key}>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input type={type}
          value={String(bldForm[key] ?? '')}
          onChange={e => setBldForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
    )
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings size={22} className="text-indigo-600" />Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Company details, buildings, tariff rates, and banking</p>
        </div>
        <button onClick={() => { if (confirm('Reset all data to demo data? This cannot be undone.')) resetToDemo() }}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors">Reset to Demo Data</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${tab === t.id ? 'text-indigo-700 bg-white border border-slate-200 border-b-white -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Company & Invoice */}
      {tab === 'company' && (
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Company Information</p>
            <div className="grid grid-cols-2 gap-3">
              {field('companyName', 'Company Name')}
              {field('abn', 'ABN')}
              {field('address', 'Street Address')}
              {field('suburb', 'Suburb')}
              {field('state', 'State')}
              {field('postcode', 'Postcode')}
              {field('phone', 'Phone')}
              {field('email', 'Email')}
              {field('website', 'Website')}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Invoice Settings</p>
            <div className="grid grid-cols-3 gap-3">
              {field('invoicePrefix', 'Invoice Prefix')}
              {field('paymentTermsDays', 'Payment Terms (days)', 'number')}
              {field('bpayBillerCode', 'BPAY Biller Code')}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email (Resend)</p>
            <p className="text-xs text-slate-400 mb-3">The verified sender address configured in your Resend account. Invoices are sent from this address.</p>
            <div className="grid grid-cols-2 gap-3">
              {field('senderEmail', 'Sender Email (From address)')}
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Save size={14} />{saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Buildings */}
      {tab === 'buildings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{buildings.length} buildings · {apartments.length} total apartments</p>
            <button onClick={openAddBuilding}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Plus size={14} />Add Building
            </button>
          </div>

          <div className="space-y-3">
            {buildings.map(b => {
              const apts = apartments.filter(a => a.buildingId === b.id)
              const occupied = customers.filter(c => apts.find(a => a.id === c.apartmentId) && !c.moveOutDate)
              return (
                <div key={b.id} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{b.name}</p>
                        <p className="text-sm text-slate-500">{b.address}, {b.suburb} {b.state} {b.postcode}</p>
                        <p className="text-xs text-slate-400 mt-1">{apts.length} apartments · {occupied.length} occupied ({Math.round(occupied.length/Math.max(1,apts.length)*100)}%)</p>
                        {b.notes && <p className="text-xs text-slate-400 italic mt-0.5">{b.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditBuilding(b)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteBld(b.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">Total Units</p>
                      <p className="text-lg font-bold text-slate-800">{apts.length}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs text-emerald-600 mb-0.5">Low Usage Threshold</p>
                      <p className="text-lg font-bold text-emerald-700">&lt; {b.lowUsageThreshold} kWh</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-600 mb-0.5">High Usage Threshold</p>
                      <p className="text-lg font-bold text-amber-700">&gt; {b.highUsageThreshold} kWh</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tariff */}
      {tab === 'tariff' && (
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Current Tariff Rates</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-2">Usage Rate</p>
                <p className="text-3xl font-bold text-indigo-900">{(form.tariff.ratePerKwh * 100).toFixed(2)}¢</p>
                <p className="text-xs text-indigo-600 mt-0.5">per kWh (incl. GST)</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Daily Supply</p>
                <p className="text-3xl font-bold text-slate-900">${form.tariff.dailySupplyCharge.toFixed(4)}</p>
                <p className="text-xs text-slate-400 mt-0.5">per day</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">GST</p>
                <p className="text-3xl font-bold text-slate-900">{(form.tariff.gstRate * 100).toFixed(0)}%</p>
                <p className="text-xs text-slate-400 mt-0.5">applied to subtotal</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'ratePerKwh',        label: 'Rate ($/kWh)', placeholder: '0.3276' },
                { key: 'dailySupplyCharge', label: 'Daily Supply Charge ($/day)', placeholder: '1.1524' },
                { key: 'gstRate',           label: 'GST Rate (e.g. 0.10 = 10%)', placeholder: '0.10' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input type="number" step="0.0001" placeholder={placeholder}
                    value={String(form.tariff[key as keyof typeof form.tariff])}
                    onChange={e => setForm(f => ({ ...f, tariff: { ...f.tariff, [key]: parseFloat(e.target.value) } }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Changing tariff rates only affects new invoices generated after saving. Existing invoices are not recalculated.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Save size={14} />{saved ? 'Saved!' : 'Save Tariff'}
            </button>
          </div>
        </div>
      )}

      {/* Banking & ABA */}
      {tab === 'banking' && (
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Originating Bank Account</p>
            <p className="text-xs text-slate-400 mb-4">This is YOUR company's bank account that direct debits are collected into.</p>
            <div className="grid grid-cols-2 gap-3">
              {field('bankName', 'Bank Name')}
              {field('bsb', 'BSB (nnn-nnn)')}
              {field('accountNumber', 'Account Number')}
              {field('accountName', 'Account Name')}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">ABA / Direct Entry File Settings</p>
            <div className="grid grid-cols-2 gap-3">
              {field('apcsUserId', 'APCS User ID (6 digits)')}
              {field('institutionCode', 'Financial Institution Code (e.g. CBA, NAB, WBC, ANZ)')}
            </div>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-600 mb-1">ABA File Preview (Type 0 Header)</p>
              <code className="text-xs font-mono text-slate-500 break-all">
                0{'                 '}{form.institutionCode.padEnd(3)}{form.accountName.slice(0,26).padEnd(26)}{form.apcsUserId.padStart(6,'0')}ELECTRICITY  010626
              </code>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Save size={14} />{saved ? 'Saved!' : 'Save Banking Details'}
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Building Modal */}
      {bldModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">{editBld ? 'Edit Building' : 'Add Building'}</h2>
              <button onClick={() => setBldModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {bldField('name', 'Building Name')}
                {bldField('address', 'Street Address')}
                {bldField('suburb', 'Suburb')}
                {bldField('state', 'State')}
                {bldField('postcode', 'Postcode')}
              </div>
              {!editBld && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Apartment Layout</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Floors</label>
                      <input type="number" value={bldFloors} onChange={e => setBldFloors(parseInt(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Units per Floor</label>
                      <input type="number" value={bldUPF} onChange={e => setBldUPF(parseInt(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 flex flex-col justify-center text-center">
                      <p className="text-xs text-indigo-600">Total Units</p>
                      <p className="text-2xl font-bold text-indigo-700">{bldFloors * bldUPF}</p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Usage Thresholds</p>
                <div className="grid grid-cols-2 gap-3">
                  {bldField('lowUsageThreshold', 'Low Usage (kWh/month)', 'number')}
                  {bldField('highUsageThreshold', 'High Usage (kWh/month)', 'number')}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 rounded-lg p-2"><span className="text-emerald-700">🟢 Low: &lt;{bldForm.lowUsageThreshold} kWh</span></div>
                  <div className="bg-indigo-50 rounded-lg p-2"><span className="text-indigo-700">🔵 Normal range</span></div>
                  <div className="bg-amber-50 rounded-lg p-2"><span className="text-amber-700">🟡 High: &gt;{bldForm.highUsageThreshold} kWh</span></div>
                </div>
              </div>
              <div>{bldField('notes', 'Notes (optional)')}</div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setBldModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={handleSaveBuilding} disabled={!bldForm.name || !bldForm.address}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
                {editBld ? 'Save Changes' : `Add Building (${bldFloors * bldUPF} units)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteBld && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove Building?</h3>
            <p className="text-sm text-slate-500 mb-5">All apartments in this building will be removed. Customers must be offboarded first.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteBld(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDeleteBuilding(deleteBld!)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
