'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UserPlus, Building2, User, CreditCard, Zap, Check, ArrowLeft, ArrowRight,
  ChevronRight, Mail, Phone, AlertCircle, Send, ExternalLink,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import type { Customer, PaymentMethod } from '@/lib/electricityTypes'
import { formatDate, monthName } from '@/lib/electricityUtils'

type Step = 'unit' | 'details' | 'payment' | 'reading' | 'confirm'
const STEPS: Array<{ id: Step; label: string; icon: typeof User }> = [
  { id: 'unit',    label: 'Select Unit',    icon: Building2 },
  { id: 'details', label: 'Tenant Details', icon: User },
  { id: 'payment', label: 'Payment',        icon: CreditCard },
  { id: 'reading', label: 'Meter Reading',  icon: Zap },
  { id: 'confirm', label: 'Confirm',        icon: Check },
]

interface FormState {
  buildingId: string
  apartmentId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  moveInDate: string
  paymentMethod: PaymentMethod
  bankName: string
  bsb: string
  accountNumber: string
  accountName: string
  openingReading: string
  sendWelcome: boolean
}

const today = new Date().toISOString().split('T')[0]
const EMPTY: FormState = {
  buildingId: '', apartmentId: '',
  firstName: '', lastName: '', email: '', phone: '',
  moveInDate: today,
  paymentMethod: 'direct_debit',
  bankName: '', bsb: '', accountNumber: '', accountName: '',
  openingReading: '',
  sendWelcome: true,
}

export default function OnboardPage() {
  const router = useRouter()
  const { buildings, apartments, customers, readings, settings, addCustomer, upsertReadings, isLoaded } = useElectricity()
  const [step, setStep]   = useState<Step>('unit')
  const [form, setForm]   = useState<FormState>(EMPTY)
  const [busy, setBusy]   = useState(false)
  const [done, setDone]   = useState<{ customerId: string; customerName: string } | null>(null)
  const [error, setError] = useState('')

  const occupiedAptIds = useMemo(
    () => new Set(customers.filter(c => !c.moveOutDate).map(c => c.apartmentId)),
    [customers],
  )

  const vacantApts = useMemo(
    () => apartments.filter(a => !occupiedAptIds.has(a.id)),
    [apartments, occupiedAptIds],
  )

  const buildingVacancy = useMemo(() => {
    const m = new Map<string, number>()
    vacantApts.forEach(a => m.set(a.buildingId, (m.get(a.buildingId) ?? 0) + 1))
    return m
  }, [vacantApts])

  const vacantInBuilding = useMemo(
    () => vacantApts.filter(a => a.buildingId === form.buildingId),
    [vacantApts, form.buildingId],
  )

  const selectedApt = apartments.find(a => a.id === form.apartmentId)
  const selectedBld = buildings.find(b => b.id === form.buildingId)

  // Latest stored reading for selected apt (for opening reading hint)
  const latestReading = useMemo(() => {
    if (!form.apartmentId) return null
    return readings
      .filter(r => r.apartmentId === form.apartmentId)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0] ?? null
  }, [form.apartmentId, readings])

  function sf<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  const stepIdx = STEPS.findIndex(s => s.id === step)

  function canAdvance(): boolean {
    if (step === 'unit')    return !!form.buildingId && !!form.apartmentId
    if (step === 'details') return !!form.firstName && !!form.lastName && !!form.email && !!form.moveInDate
    if (step === 'payment') {
      if (form.paymentMethod === 'direct_debit') return !!form.bankName && !!form.bsb && !!form.accountNumber && !!form.accountName
      return true
    }
    if (step === 'reading') return true // optional
    return true
  }

  function next() {
    const order: Step[] = ['unit','details','payment','reading','confirm']
    const i = order.indexOf(step)
    if (i < order.length - 1) setStep(order[i + 1])
  }
  function back() {
    const order: Step[] = ['unit','details','payment','reading','confirm']
    const i = order.indexOf(step)
    if (i > 0) setStep(order[i - 1])
  }

  async function handleConfirm() {
    if (!form.apartmentId || !form.firstName || !form.email) return
    setBusy(true)
    setError('')
    try {
      const myobId = `CUST-${form.lastName.toUpperCase().slice(0,4)}${Date.now().toString().slice(-4)}`
      const customerId = `cust-${form.apartmentId}-${Date.now()}`
      const customer: Customer = {
        id: customerId,
        apartmentId: form.apartmentId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        moveInDate: form.moveInDate,
        paymentMethod: form.paymentMethod,
        bankName: form.bankName,
        bsb: form.bsb,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        myobCardId: myobId,
      }
      addCustomer(customer)

      // Store opening reading if provided
      if (form.openingReading && !isNaN(parseFloat(form.openingReading))) {
        const d = new Date(form.moveInDate)
        upsertReadings([{
          id: `reading-${form.apartmentId}-opening`,
          apartmentId: form.apartmentId,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          previousReading: 0,
          currentReading: parseFloat(form.openingReading),
          usage: 0,
          readingDate: form.moveInDate,
          notes: 'Opening reading',
        }])
      }

      // Send welcome email
      if (form.sendWelcome && form.email) {
        const portalUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/portal`
          : undefined
        try {
          await fetch('/api/send-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: form.email,
              firstName: form.firstName,
              lastName: form.lastName,
              unitNumber: selectedApt?.unitNumber ?? '',
              floor: selectedApt?.floor ?? 0,
              buildingName: selectedBld?.name ?? '',
              buildingAddress: selectedBld?.address ?? '',
              meterNumber: selectedApt?.meterNumber ?? '',
              moveInDate: form.moveInDate,
              paymentMethod: form.paymentMethod,
              bsb: form.bsb || undefined,
              accountNumber: form.accountNumber || undefined,
              accountName: form.accountName || undefined,
              bankName: form.bankName || undefined,
              companyName: settings.companyName,
              fromEmail: settings.senderEmail,
              companyEmail: settings.email,
              companyPhone: settings.phone,
              companyABN: settings.abn,
              bpayBillerCode: settings.bpayBillerCode,
              bankBSB: settings.bsb,
              bankAccount: settings.accountNumber,
              bankAccountName: settings.accountName,
              bankName2: settings.bankName,
              portalUrl,
            }),
          })
        } catch {
          // welcome email failure is non-fatal
        }
      }

      setDone({ customerId, customerName: `${form.firstName} ${form.lastName}` })
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading…</div>

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Tenant Onboarded!</h1>
          <p className="text-slate-500 mb-1"><strong>{done.customerName}</strong> has been added to the system.</p>
          {form.sendWelcome && (
            <p className="text-slate-400 text-sm mb-6">Welcome email sent to {form.email}</p>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => { setForm(EMPTY); setStep('unit'); setDone(null) }}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserPlus size={15} />Onboard Another
            </button>
            <Link
              href="/electricity/customers"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              View Customers <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/electricity/customers" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UserPlus size={22} className="text-indigo-600" />Onboard New Tenant
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{vacantApts.length} vacant units available</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="card p-4">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const idx = STEPS.findIndex(x => x.id === step)
              const isDone = i < idx
              const isCur  = i === idx
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${isDone ? 'bg-emerald-500 text-white' : isCur ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isDone ? <Check size={14} /> : <s.icon size={14} />}
                    </div>
                    <p className={`text-xs mt-1.5 font-medium text-center leading-tight
                      ${isCur ? 'text-indigo-700' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {s.label}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 -mt-5 mx-1 transition-colors ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="card p-6">

          {/* STEP 1: Select Unit */}
          {step === 'unit' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Select a Vacant Unit</h2>

              {/* Building picker */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Choose Building</p>
                <div className="grid grid-cols-2 gap-3">
                  {buildings.map(b => {
                    const vacant = buildingVacancy.get(b.id) ?? 0
                    const sel = form.buildingId === b.id
                    return (
                      <button key={b.id} onClick={() => { sf('buildingId', b.id); sf('apartmentId', '') }}
                        disabled={vacant === 0}
                        className={`text-left p-4 rounded-xl border-2 transition-all
                          ${sel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                          ${vacant === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        <p className="font-semibold text-slate-900 text-sm">{b.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{b.address}</p>
                        <p className={`text-xs font-medium mt-2 ${vacant > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {vacant} vacant unit{vacant !== 1 ? 's' : ''}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Unit picker */}
              {form.buildingId && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Select Unit</p>
                  <select value={form.apartmentId} onChange={e => sf('apartmentId', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— pick a unit —</option>
                    {vacantInBuilding.map(a => (
                      <option key={a.id} value={a.id}>
                        Unit {a.unitNumber} — Level {a.floor} (Meter: {a.meterNumber})
                      </option>
                    ))}
                  </select>

                  {form.apartmentId && selectedApt && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-sm text-indigo-700">
                      <p className="font-semibold">Unit {selectedApt.unitNumber} selected</p>
                      <p className="text-xs text-indigo-500 mt-0.5">Level {selectedApt.floor} · Meter {selectedApt.meterNumber}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Tenant Details */}
          {step === 'details' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Tenant Information</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['firstName','First Name *'],['lastName','Last Name *'],
                  ['email','Email Address *'],['phone','Phone Number'],
                ] as [keyof FormState, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      type={key === 'email' ? 'email' : 'text'}
                      value={String(form[key])}
                      onChange={e => sf(key, e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Move-in Date *</label>
                  <input type="date" value={form.moveInDate}
                    onChange={e => sf('moveInDate', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Payment */}
          {step === 'payment' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Payment Setup</h2>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ['direct_debit','Direct Debit','Automatically debited on due date'],
                    ['bpay','BPAY','Tenant pays via BPAY reference'],
                    ['eft','EFT Transfer','Tenant pays via bank transfer'],
                  ] as [PaymentMethod, string, string][]).map(([val, lbl, desc]) => (
                    <button key={val} onClick={() => sf('paymentMethod', val)}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all
                        ${form.paymentMethod === val ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className="font-semibold text-slate-900 text-sm">{lbl}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-tight">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.paymentMethod === 'direct_debit' && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bank Account for Direct Debit</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['bankName','Bank Name *'],['bsb','BSB (nnn-nnn) *'],
                      ['accountNumber','Account Number *'],['accountName','Account Name *'],
                    ] as [keyof FormState, string][]).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                        <input value={String(form[key])} onChange={e => sf(key, e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(form.paymentMethod === 'bpay' || form.paymentMethod === 'eft') && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
                  <p className="font-medium text-slate-700 mb-2">Payment details will be included on each invoice:</p>
                  {form.paymentMethod === 'bpay' && settings.bpayBillerCode && (
                    <p className="text-xs">BPAY Biller Code: <span className="font-mono font-medium">{settings.bpayBillerCode}</span></p>
                  )}
                  <p className="text-xs mt-1">EFT: {settings.bankName} · BSB {settings.bsb} · Account {settings.accountNumber}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Opening Meter Reading */}
          {step === 'reading' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Opening Meter Reading</h2>
              <p className="text-sm text-slate-500">
                Record the meter reading at move-in to establish the baseline for the first invoice. This is optional but recommended.
              </p>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                <Zap size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Meter: {selectedApt?.meterNumber}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Unit {selectedApt?.unitNumber} · {selectedBld?.name}</p>
                  {latestReading && (
                    <p className="text-xs text-indigo-500 mt-1">Last recorded: {latestReading.currentReading.toLocaleString()} kWh ({latestReading.readingDate})</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Opening Reading (kWh) — optional</label>
                <input
                  type="number"
                  value={form.openingReading}
                  onChange={e => sf('openingReading', e.target.value)}
                  placeholder={latestReading ? `e.g. ${latestReading.currentReading}` : 'e.g. 14250'}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">This becomes the &ldquo;previous reading&rdquo; on the first invoice.</p>
              </div>
            </div>
          )}

          {/* STEP 5: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Review & Confirm</h2>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Property</p>
                  <p className="font-semibold text-slate-900">{selectedBld?.name} — Unit {selectedApt?.unitNumber}</p>
                  <p className="text-sm text-slate-500">{selectedBld?.address} · Level {selectedApt?.floor} · Meter {selectedApt?.meterNumber}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tenant</p>
                  <p className="font-semibold text-slate-900">{form.firstName} {form.lastName}</p>
                  <div className="flex gap-4 mt-1">
                    <span className="flex items-center gap-1 text-sm text-slate-500"><Mail size={12} />{form.email}</span>
                    {form.phone && <span className="flex items-center gap-1 text-sm text-slate-500"><Phone size={12} />{form.phone}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Move-in: {form.moveInDate}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment</p>
                  <p className="font-semibold text-slate-900">
                    {form.paymentMethod === 'direct_debit' ? 'Direct Debit (DDR)' : form.paymentMethod === 'bpay' ? 'BPAY' : 'EFT Transfer'}
                  </p>
                  {form.paymentMethod === 'direct_debit' && (
                    <p className="text-sm text-slate-500 mt-0.5">{form.accountName} · {form.bankName} · BSB {form.bsb} · {form.accountNumber}</p>
                  )}
                </div>
                {form.openingReading && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Opening Reading</p>
                    <p className="font-semibold text-slate-900">{parseFloat(form.openingReading).toLocaleString()} kWh</p>
                  </div>
                )}
              </div>

              {/* Welcome email toggle */}
              <div className="flex items-start gap-3 p-4 border border-indigo-200 bg-indigo-50 rounded-xl">
                <input type="checkbox" id="sendWelcome" checked={form.sendWelcome}
                  onChange={e => sf('sendWelcome', e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="sendWelcome" className="cursor-pointer">
                  <p className="text-sm font-medium text-indigo-900 flex items-center gap-1.5">
                    <Send size={14} />Send welcome email to {form.email}
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Includes property details, payment instructions, and portal access link.
                  </p>
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} />{error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={back} disabled={stepIdx === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            <ArrowLeft size={15} />Back
          </button>
          <span className="text-xs text-slate-400">Step {stepIdx + 1} of {STEPS.length}</span>
          {step !== 'confirm' ? (
            <button onClick={next} disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button onClick={handleConfirm} disabled={busy}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              <Check size={15} />{busy ? 'Processing…' : 'Confirm & Onboard'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
