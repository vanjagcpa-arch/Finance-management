'use client'
import { useState, useEffect } from 'react'
import { Settings, Building2, Zap, CreditCard, Save, Plus, Edit2, Trash2, X, Check, AlertCircle, Link2, RefreshCw, Users, FileText, ChevronRight, Loader2, Unlink, ExternalLink, Shield, Eye, EyeOff, KeyRound, UserCog } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { generateApartmentsForBuilding } from '@/lib/electricityData'
import type { Building, ElectricitySettings } from '@/lib/electricityTypes'
import { useAuth } from '@/lib/AuthContext'
import type { AppUser, UserRole } from '@/lib/authTypes'

type Tab = 'company' | 'buildings' | 'tariff' | 'banking' | 'myob' | 'ezidebit' | 'users'

const TABS: Array<{ id: Tab; label: string; icon: typeof Settings }> = [
  { id: 'company',   label: 'Company & Invoice', icon: Settings },
  { id: 'buildings', label: 'Buildings',          icon: Building2 },
  { id: 'tariff',    label: 'Electricity Tariff', icon: Zap },
  { id: 'banking',   label: 'Banking & ABA',      icon: CreditCard },
  { id: 'myob',      label: 'MYOB',               icon: Link2 },
  { id: 'ezidebit',  label: 'Ezidebit',           icon: Shield },
  { id: 'users',     label: 'Users',              icon: Users },
]

const EMPTY_BUILDING: Omit<Building, 'id'> = {
  name: '', address: '', suburb: '', state: 'VIC', postcode: '',
  totalUnits: 80, lowUsageThreshold: 180, highUsageThreshold: 380, notes: '',
}

interface MYOBFile { Id: string; Name: string; Uri: string }

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'admin',    label: 'Admin',     desc: 'Full access including user management & settings' },
  { value: 'billing',  label: 'Billing',   desc: 'Manage customers, readings, invoices and debtors' },
  { value: 'readonly', label: 'Read Only', desc: 'View data only — no create, edit or delete' },
]

const ROLE_BADGE: Record<UserRole, string> = {
  admin:    'bg-indigo-100 text-indigo-700',
  billing:  'bg-emerald-100 text-emerald-700',
  readonly: 'bg-slate-100 text-slate-600',
}

interface UserForm {
  firstName: string; lastName: string; username: string
  email: string; role: UserRole; active: boolean
  password: string; confirmPassword: string
}

const EMPTY_USER_FORM: UserForm = {
  firstName: '', lastName: '', username: '', email: '',
  role: 'billing', active: true, password: '', confirmPassword: '',
}

export default function SettingsPage() {
  const { settings, buildings, customers, apartments, invoices, updateSettings, addBuilding, updateBuilding, removeBuilding, resetToDemo, isLoaded } = useElectricity()
  const { users, session, addUser, updateUser, changePassword, removeUser } = useAuth()
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
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  // User management state
  const [userModal,   setUserModal]   = useState(false)
  const [editUserId,  setEditUserId]  = useState<string | null>(null)
  const [userForm,    setUserForm]    = useState<UserForm>(EMPTY_USER_FORM)
  const [userError,   setUserError]   = useState('')
  const [userSaving,  setUserSaving]  = useState(false)
  const [showPw,      setShowPw]      = useState(false)
  const [showCPw,     setShowCPw]     = useState(false)
  const [pwModal,     setPwModal]     = useState<string | null>(null) // userId for change-pw modal
  const [pwForm,      setPwForm]      = useState({ password: '', confirm: '' })
  const [pwError,     setPwError]     = useState('')
  const [pwSaving,    setPwSaving]    = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  // MYOB states
  const [myobFiles,         setMyobFiles]         = useState<MYOBFile[]>([])
  const [myobFilesLoading,  setMyobFilesLoading]  = useState(false)
  const [myobConnecting,    setMyobConnecting]     = useState(false)
  const [myobSyncing,       setMyobSyncing]        = useState<'customers' | 'invoices' | null>(null)
  const [myobSyncResult,    setMyobSyncResult]     = useState<string>('')
  const [myobError,         setMyobError]          = useState('')

  // Read OAuth callback tokens from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const at  = sp.get('myob_at')
    const rt  = sp.get('myob_rt')
    const exp = sp.get('myob_exp')
    const err = sp.get('myob_error')

    if (err) {
      setTab('myob')
      setMyobError(`OAuth error: ${err}`)
      window.history.replaceState({}, '', '/electricity/settings')
      return
    }
    if (at && rt && exp) {
      setTab('myob')
      setForm(f => ({ ...f, myobAccessToken: at, myobRefreshToken: rt, myobTokenExpiry: exp }))
      window.history.replaceState({}, '', '/electricity/settings')
      showToast('MYOB connected successfully! Save settings to persist.', 'success')
    }
  }, [])

  // Sync form when settings load
  useEffect(() => { if (isLoaded) setForm(settings) }, [isLoaded, settings])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToastType(type)
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function handleSave() {
    updateSettings(form)
    setSaved(true)
    showToast('Settings saved', 'success')
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
      showToast(`${bldForm.name} updated`, 'success')
    } else {
      const newId = `b-${Date.now()}`
      const newBuilding: Building = { id: newId, ...bldForm, totalUnits: bldFloors * bldUPF }
      addBuilding(newBuilding)
      showToast(`${bldForm.name} added with ${bldFloors * bldUPF} apartments`, 'success')
    }
    setBldModal(false)
  }

  function handleDeleteBuilding(id: string) {
    const hasCustomers = customers.some(c => apartments.find(a => a.id === c.apartmentId)?.buildingId === id)
    if (hasCustomers) { showToast('Cannot remove — building has active customers', 'error'); setDeleteBld(null); return }
    removeBuilding(id)
    showToast('Building removed', 'success')
    setDeleteBld(null)
  }

  function sf(key: keyof ElectricitySettings, val: string | number) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function field(key: keyof ElectricitySettings, label: string, type = 'text', placeholder?: string) {
    const val = form[key]
    return (
      <div key={key}>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input type={type} value={String(val ?? '')} placeholder={placeholder}
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

  // MYOB helpers
  const isMyobConnected = !!(form.myobAccessToken && form.myobTokenExpiry && new Date(form.myobTokenExpiry) > new Date())
  const isMyobTokenExpired = !!(form.myobAccessToken && form.myobTokenExpiry && new Date(form.myobTokenExpiry) <= new Date())

  async function handleMyobConnect() {
    if (!form.myobClientId || !form.myobClientSecret) {
      setMyobError('Enter your MYOB Client ID and Client Secret first.')
      return
    }
    setMyobConnecting(true)
    setMyobError('')
    try {
      const redirectUri = `${window.location.origin}/api/myob/callback`
      const res = await fetch('/api/myob/start-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: form.myobClientId, clientSecret: form.myobClientSecret, redirectUri }),
      })
      const data = await res.json()
      if (data.error) { setMyobError(data.error); return }
      // Save credentials before redirect so they persist
      updateSettings({ ...form })
      window.location.href = data.authUrl
    } catch (err) {
      setMyobError(String(err))
    } finally {
      setMyobConnecting(false)
    }
  }

  function handleMyobDisconnect() {
    setForm(f => ({
      ...f,
      myobAccessToken: '',
      myobRefreshToken: '',
      myobTokenExpiry: '',
      myobCompanyFileUrl: '',
      myobCompanyFileName: '',
    }))
    setMyobFiles([])
    setMyobSyncResult('')
    setMyobError('')
    showToast('MYOB disconnected. Save to persist.', 'success')
  }

  async function handleLoadFiles() {
    if (!form.myobAccessToken) return
    setMyobFilesLoading(true)
    setMyobError('')
    try {
      const res = await fetch(`/api/myob/list-files?accessToken=${encodeURIComponent(form.myobAccessToken)}`)
      const data = await res.json()
      if (data.error) { setMyobError(data.error); return }
      setMyobFiles(data.files ?? [])
      if (!data.files?.length) setMyobError('No company files found in this MYOB account.')
    } catch (err) {
      setMyobError(String(err))
    } finally {
      setMyobFilesLoading(false)
    }
  }

  async function handleSyncCustomers() {
    if (!form.myobAccessToken || !form.myobCompanyFileUrl) {
      setMyobError('Select a company file first.')
      return
    }
    setMyobSyncing('customers')
    setMyobSyncResult('')
    setMyobError('')
    try {
      const activeCustomers = customers.filter(c => !c.moveOutDate)
      const res = await fetch('/api/myob/sync-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: form.myobAccessToken,
          companyFileUrl: form.myobCompanyFileUrl,
          customers: activeCustomers,
          buildings,
          apartments,
        }),
      })
      const data = await res.json()
      if (data.error) { setMyobError(data.error); return }
      const now = new Date().toISOString()
      setForm(f => ({ ...f, myobLastSyncCustomers: now }))
      updateSettings({ ...form, myobLastSyncCustomers: now })
      setMyobSyncResult(`Customers: ${data.created} created · ${data.updated} updated · ${data.failed} failed`)
      if (data.errors?.length) setMyobError(data.errors.slice(0, 5).join('\n'))
      else showToast(`Synced ${data.created + data.updated} customers to MYOB`, 'success')
    } catch (err) {
      setMyobError(String(err))
    } finally {
      setMyobSyncing(null)
    }
  }

  async function handleSyncInvoices() {
    if (!form.myobAccessToken || !form.myobCompanyFileUrl) {
      setMyobError('Select a company file first.')
      return
    }
    if (!form.myobIncomeAccountCode) {
      setMyobError('Enter an income account code (e.g. 4-1000) first.')
      return
    }
    setMyobSyncing('invoices')
    setMyobSyncResult('')
    setMyobError('')
    try {
      const syncableInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'paid' || i.status === 'overdue')
      const res = await fetch('/api/myob/sync-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: form.myobAccessToken,
          companyFileUrl: form.myobCompanyFileUrl,
          incomeAccountCode: form.myobIncomeAccountCode,
          invoices: syncableInvoices,
          customers,
        }),
      })
      const data = await res.json()
      if (data.error) { setMyobError(data.error); return }
      const now = new Date().toISOString()
      setForm(f => ({ ...f, myobLastSyncInvoices: now }))
      updateSettings({ ...form, myobLastSyncInvoices: now })
      setMyobSyncResult(`Invoices: ${data.created} synced · ${data.skipped} skipped · ${data.failed} failed`)
      if (data.errors?.length) setMyobError(data.errors.slice(0, 5).join('\n'))
      else showToast(`Synced ${data.created} invoices to MYOB`, 'success')
    } catch (err) {
      setMyobError(String(err))
    } finally {
      setMyobSyncing(null)
    }
  }

  // --- User management handlers ---
  function openAddUser() {
    setEditUserId(null)
    setUserForm(EMPTY_USER_FORM)
    setUserError('')
    setShowPw(false)
    setShowCPw(false)
    setUserModal(true)
  }

  function openEditUser(u: AppUser) {
    setEditUserId(u.id)
    setUserForm({ firstName: u.firstName, lastName: u.lastName, username: u.username, email: u.email, role: u.role, active: u.active, password: '', confirmPassword: '' })
    setUserError('')
    setUserModal(true)
  }

  async function handleSaveUser() {
    setUserError('')
    if (!userForm.firstName || !userForm.lastName || !userForm.username || !userForm.email) {
      setUserError('All fields are required'); return
    }
    if (!editUserId && !userForm.password) { setUserError('Password is required'); return }
    if (userForm.password && userForm.password !== userForm.confirmPassword) {
      setUserError('Passwords do not match'); return
    }
    if (userForm.password && userForm.password.length < 6) {
      setUserError('Password must be at least 6 characters'); return
    }
    setUserSaving(true)
    if (editUserId) {
      updateUser(editUserId, { firstName: userForm.firstName, lastName: userForm.lastName, email: userForm.email, role: userForm.role, active: userForm.active })
      if (userForm.password) await changePassword(editUserId, userForm.password)
      showToast('User updated', 'success')
    } else {
      const result = await addUser({ ...userForm })
      if (!result.ok) { setUserError(result.error ?? 'Failed to create user'); setUserSaving(false); return }
      showToast('User created', 'success')
    }
    setUserSaving(false)
    setUserModal(false)
  }

  async function handleChangePw() {
    setPwError('')
    if (!pwForm.password) { setPwError('Enter a new password'); return }
    if (pwForm.password.length < 6) { setPwError('Password must be at least 6 characters'); return }
    if (pwForm.password !== pwForm.confirm) { setPwError('Passwords do not match'); return }
    setPwSaving(true)
    await changePassword(pwModal!, pwForm.password)
    setPwSaving(false)
    setPwModal(null)
    setPwForm({ password: '', confirm: '' })
    showToast('Password changed', 'success')
  }

  function handleDeleteUser(id: string) {
    const adminCount = users.filter(u => u.role === 'admin' && u.active).length
    const target = users.find(u => u.id === id)
    if (target?.role === 'admin' && adminCount <= 1) { showToast('Cannot remove the last admin', 'error'); setDeleteUserId(null); return }
    if (id === session?.userId) { showToast('Cannot delete your own account', 'error'); setDeleteUserId(null); return }
    removeUser(id)
    showToast('User removed', 'success')
    setDeleteUserId(null)
  }

  function fmtDate(iso: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 ${toastType === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
          <Check size={14} className="text-emerald-400" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings size={22} className="text-indigo-600" />Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Company details, buildings, tariff rates, banking, and MYOB sync</p>
        </div>
        <button onClick={() => { if (confirm('Reset all data to demo data? This cannot be undone.')) resetToDemo() }}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors">Reset to Demo Data</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${tab === t.id ? 'text-indigo-700 bg-white border border-slate-200 border-b-white -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} />{t.label}
            {t.id === 'myob' && isMyobConnected && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Connected
              </span>
            )}
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
            <p className="text-xs text-slate-400 mb-3">The verified sender address configured in your Resend account.</p>
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

      {/* MYOB */}
      {tab === 'myob' && (
        <div className="space-y-4">
          {/* Connection status banner */}
          {isMyobConnected ? (
            <div className="card p-5 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Check size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Connected to MYOB AccountRight</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Token expires {fmtDate(form.myobTokenExpiry)}
                      {form.myobCompanyFileName && <> · Company: <strong>{form.myobCompanyFileName}</strong></>}
                    </p>
                  </div>
                </div>
                <button onClick={handleMyobDisconnect}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  <Unlink size={12} />Disconnect
                </button>
              </div>
            </div>
          ) : isMyobTokenExpired ? (
            <div className="card p-5 border-l-4 border-amber-400">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">MYOB token expired</p>
                  <p className="text-xs text-slate-500 mt-0.5">Reconnect below to refresh your access token.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5 border-l-4 border-slate-300">
              <div className="flex items-center gap-3">
                <Link2 size={18} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">Not connected to MYOB</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enter your API credentials and click Connect to authorise via OAuth2.</p>
                </div>
              </div>
            </div>
          )}

          {/* API Credentials */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MYOB API Credentials</p>
              <a href="https://my.myob.com.au/Bd/DevAppDetail.aspx" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                <ExternalLink size={11} />Get credentials from MYOB Developer Portal
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {field('myobClientId', 'Client ID', 'text', 'Your MYOB API client ID')}
              {field('myobClientSecret', 'Client Secret', 'password', '••••••••••••')}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 mb-4">
              <strong className="text-slate-700">Redirect URI to register in MYOB Developer Portal:</strong><br />
              <code className="font-mono text-indigo-600">{typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/myob/callback</code>
            </div>
            <div className="flex gap-3">
              <button onClick={handleMyobConnect} disabled={myobConnecting || !form.myobClientId || !form.myobClientSecret}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                {myobConnecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {isMyobConnected ? 'Reconnect' : 'Connect to MYOB'}
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                <Save size={14} />Save Credentials
              </button>
            </div>
          </div>

          {/* Company File selection */}
          {isMyobConnected && (
            <div className="card p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Company File</p>
              <p className="text-xs text-slate-500 mb-3">Select which MYOB company file to sync data into.</p>
              <div className="flex gap-3 mb-3">
                <button onClick={handleLoadFiles} disabled={myobFilesLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
                  {myobFilesLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Load Company Files
                </button>
              </div>
              {myobFiles.length > 0 && (
                <div className="space-y-2">
                  {myobFiles.map(f => (
                    <label key={f.Id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${form.myobCompanyFileUrl === f.Uri ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="companyFile" value={f.Uri}
                        checked={form.myobCompanyFileUrl === f.Uri}
                        onChange={() => setForm(prev => ({ ...prev, myobCompanyFileUrl: f.Uri, myobCompanyFileName: f.Name }))}
                        className="text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{f.Name}</p>
                        <p className="text-xs text-slate-400 font-mono">{f.Uri}</p>
                      </div>
                      {form.myobCompanyFileUrl === f.Uri && <Check size={14} className="text-indigo-600 ml-auto" />}
                    </label>
                  ))}
                </div>
              )}
              {form.myobCompanyFileUrl && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Income Account Code</p>
                  <p className="text-xs text-slate-500 mb-2">DisplayID of the income account for electricity revenue (e.g. <code className="font-mono bg-slate-100 px-1 rounded">4-1000</code>). Find it in your MYOB Chart of Accounts.</p>
                  <input type="text" value={form.myobIncomeAccountCode} placeholder="4-1000"
                    onChange={e => setForm(f => ({ ...f, myobIncomeAccountCode: e.target.value }))}
                    className="w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </div>
          )}

          {/* Sync controls */}
          {isMyobConnected && form.myobCompanyFileUrl && (
            <div className="card p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Sync Data to MYOB</p>

              <div className="grid grid-cols-2 gap-4">
                {/* Customers */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={16} className="text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-900">Customers</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Sync {customers.filter(c => !c.moveOutDate).length} active tenants as MYOB Customer Cards.
                    {form.myobLastSyncCustomers && <><br />Last synced: {fmtDate(form.myobLastSyncCustomers)}</>}
                  </p>
                  <button onClick={handleSyncCustomers} disabled={!!myobSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 w-full justify-center">
                    {myobSyncing === 'customers' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {myobSyncing === 'customers' ? 'Syncing...' : 'Sync Customers'}
                  </button>
                </div>

                {/* Invoices */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className="text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-900">Invoices</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Push {invoices.filter(i => i.status === 'sent' || i.status === 'paid' || i.status === 'overdue').length} sent/paid/overdue invoices as MYOB Service Invoices.
                    {form.myobLastSyncInvoices && <><br />Last synced: {fmtDate(form.myobLastSyncInvoices)}</>}
                  </p>
                  <button onClick={handleSyncInvoices} disabled={!!myobSyncing || !form.myobIncomeAccountCode}
                    title={!form.myobIncomeAccountCode ? 'Enter income account code above' : ''}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 w-full justify-center">
                    {myobSyncing === 'invoices' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {myobSyncing === 'invoices' ? 'Syncing...' : 'Sync Invoices'}
                  </button>
                </div>
              </div>

              {/* Sync result */}
              {myobSyncResult && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 font-medium">
                  {myobSyncResult}
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {myobError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-1">Error</p>
                <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">{myobError}</pre>
                <button onClick={() => setMyobError('')} className="mt-2 text-xs text-red-500 underline">Dismiss</button>
              </div>
            </div>
          )}

          {/* How it works */}
          {!isMyobConnected && !isMyobTokenExpired && (
            <div className="card p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">How MYOB Integration Works</p>
              <ol className="space-y-3">
                {[
                  { n: '1', text: 'Register your app in the MYOB Developer Portal and copy your Client ID and Secret.' },
                  { n: '2', text: 'Add the Redirect URI shown above to your MYOB app\'s allowed redirect URIs.' },
                  { n: '3', text: 'Click "Connect to MYOB" — you\'ll be sent to the MYOB login page to authorise access.' },
                  { n: '4', text: 'After authorising, you\'ll return here automatically and can select your company file.' },
                  { n: '5', text: 'Use the sync buttons to push customers and invoices into MYOB AccountRight.' },
                ].map(step => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{step.n}</span>
                    <p className="text-sm text-slate-600">{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Ezidebit */}
      {tab === 'ezidebit' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Shield size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Ezidebit Direct Debit</p>
                <p className="text-xs text-slate-500 mt-0.5">Australian payment processor for automated direct debits</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Digital Key (Public Key)
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Found in the Ezidebit Portal under Account → API Credentials. Used to build secure hosted DDR form links sent to new tenants.
              </p>
              <input
                type="text"
                value={form.ezidebitDigitalKey}
                onChange={e => setForm(f => ({ ...f, ezidebitDigitalKey: e.target.value }))}
                placeholder="e.g. A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {form.ezidebitDigitalKey && (
              <div className="mb-4 bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs">
                <p className="font-semibold text-violet-700 mb-1">Preview DDR form URL</p>
                <code className="text-violet-600 break-all">
                  {`https://secure.ezidebit.com.au/ddr/v2?q=${encodeURIComponent(form.ezidebitDigitalKey)}&ref=CUSTOMER_REF`}
                </code>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                <Save size={14} />{saved ? 'Saved!' : 'Save Ezidebit Settings'}
              </button>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">How Ezidebit Integration Works</p>
            <ol className="space-y-3">
              {[
                { n: '1', text: 'Log in to the Ezidebit Portal and navigate to Account → API Credentials to find your Digital Key (public key).' },
                { n: '2', text: 'Paste the Digital Key above and save. This key is used to build secure hosted DDR form URLs.' },
                { n: '3', text: 'When onboarding a new tenant with "Ezidebit" payment method, a DDR invitation email is sent automatically with a unique link to complete their bank registration on Ezidebit\'s secure servers.' },
                { n: '4', text: 'After the tenant completes the DDR form, Ezidebit assigns them a Customer Reference. Enter this in the tenant\'s profile as the Ezidebit Customer ID.' },
                { n: '5', text: 'Use the Exports → Ezidebit tab to download a payment batch CSV each month and upload it to the Ezidebit Portal to trigger bulk direct debits.' },
              ].map(step => (
                <li key={step.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{step.n}</span>
                  <p className="text-sm text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''} configured</p>
              <p className="text-xs text-slate-400 mt-0.5">Credentials are stored locally. Each user can sign in with their username and password.</p>
            </div>
            {session?.role === 'admin' && (
              <button onClick={openAddUser}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                <Plus size={14} />Add User
              </button>
            )}
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header text-left px-5 py-3">User</th>
                  <th className="table-header text-left px-5 py-3">Username</th>
                  <th className="table-header text-left px-5 py-3">Role</th>
                  <th className="table-header text-left px-5 py-3">Status</th>
                  <th className="table-header text-left px-5 py-3">Last Login</th>
                  {session?.role === 'admin' && <th className="px-5 py-3 w-32"></th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`data-row ${!u.active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(u.firstName[0] ?? '') + (u.lastName[0] ?? '')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                        {u.id === session?.userId && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600 text-xs">{u.username}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[u.role]}`}>
                        {ROLE_OPTIONS.find(r => r.value === u.role)?.label ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.active
                        ? <span className="flex items-center gap-1 text-xs text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Active</span>
                        : <span className="flex items-center gap-1 text-xs text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />Inactive</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {u.lastLogin ? fmtDate(u.lastLogin) : 'Never'}
                    </td>
                    {session?.role === 'admin' && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setPwModal(u.id); setPwForm({ password: '', confirm: '' }); setPwError('') }}
                            title="Change password"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                            <KeyRound size={14} />
                          </button>
                          <button onClick={() => openEditUser(u)}
                            title="Edit user"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                            <UserCog size={14} />
                          </button>
                          {u.id !== session.userId && (
                            <button onClick={() => setDeleteUserId(u.id)}
                              title="Remove user"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-5 bg-slate-50 border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Role Permissions</p>
            <div className="grid grid-cols-3 gap-3">
              {ROLE_OPTIONS.map(r => (
                <div key={r.value} className="bg-white rounded-xl p-3 border border-slate-200">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[r.value]}`}>{r.label}</span>
                  <p className="text-xs text-slate-500 mt-2">{r.desc}</p>
                </div>
              ))}
            </div>
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

      {/* Add/Edit User Modal */}
      {userModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                {editUserId ? 'Edit User' : 'Add User'}
              </h2>
              <button onClick={() => setUserModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
                  <input type="text" value={userForm.firstName} onChange={e => setUserForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
                  <input type="text" value={userForm.lastName} onChange={e => setUserForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Username *</label>
                  <input type="text" value={userForm.username} disabled={!!editUserId}
                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" />
                  {editUserId && <p className="text-xs text-slate-400 mt-0.5">Username cannot be changed</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role *</label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map(r => (
                    <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${userForm.role === r.value ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="role" value={r.value} checked={userForm.role === r.value}
                        onChange={() => setUserForm(f => ({ ...f, role: r.value }))} className="mt-0.5" />
                      <div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[r.value]}`}>{r.label}</span>
                        <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {!editUserId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={userForm.password}
                        onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input type={showCPw ? 'text' : 'password'} value={userForm.confirmPassword}
                        onChange={e => setUserForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={() => setShowCPw(s => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {editUserId && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input type="checkbox" checked={userForm.active} onChange={e => setUserForm(f => ({ ...f, active: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Account active
                  </label>
                  <span className="text-xs text-slate-400">Inactive users cannot sign in</span>
                </div>
              )}
              {userError && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} />{userError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setUserModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
              <button onClick={handleSaveUser} disabled={userSaving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                <Save size={14} />{userSaving ? 'Saving…' : editUserId ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <KeyRound size={15} className="text-indigo-600" />
                Change Password
              </h2>
              <button onClick={() => setPwModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Setting new password for <strong>{users.find(u => u.id === pwModal)?.username}</strong>
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
                <input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {pwError && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={13} />{pwError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setPwModal(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleChangePw} disabled={pwSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                <Check size={14} />{pwSaving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User confirm */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove User?</h3>
            <p className="text-sm text-slate-500 mb-1">
              This will permanently remove <strong>{users.find(u => u.id === deleteUserId)?.firstName} {users.find(u => u.id === deleteUserId)?.lastName}</strong>.
            </p>
            <p className="text-sm text-slate-400 mb-5">They will no longer be able to sign in.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUserId(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDeleteUser(deleteUserId!)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
