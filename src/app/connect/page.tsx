'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Building2, User, CreditCard, Check, ArrowLeft, ArrowRight,
  Zap, AlertCircle, Mail, Phone,
} from 'lucide-react'

type PaymentMethod = 'direct_debit' | 'bpay' | 'eft'
type Step = 'property' | 'details' | 'payment' | 'confirm'

const STEPS: Array<{ id: Step; label: string; icon: typeof User }> = [
  { id: 'property', label: 'Property',    icon: Building2  },
  { id: 'details',  label: 'Your Details', icon: User       },
  { id: 'payment',  label: 'Payment',      icon: CreditCard },
  { id: 'confirm',  label: 'Confirm',      icon: Check      },
]
const ORDER: Step[] = ['property', 'details', 'payment', 'confirm']

interface FormState {
  buildingName: string
  unitNumber: string
  moveInDate: string
  firstName: string
  lastName: string
  email: string
  phone: string
  paymentMethod: PaymentMethod
  bankName: string
  bsb: string
  accountNumber: string
  accountName: string
}

const today = new Date().toISOString().split('T')[0]

export default function ConnectPage() {
  const params = useSearchParams()

  // Company info embedded in QR / link by the admin
  const companyName  = params.get('cn') || 'Property Management'
  const companyEmail = params.get('ce') || ''
  const fromEmail    = params.get('fe') || ''

  const [step, setStep] = useState<Step>('property')
  const [form, setForm] = useState<FormState>({
    buildingName:  params.get('bname') || '',
    unitNumber:    params.get('unum')  || '',
    moveInDate:    today,
    firstName: '', lastName: '', email: '', phone: '',
    paymentMethod: 'direct_debit',
    bankName: '', bsb: '', accountNumber: '', accountName: '',
  })
  const [busy,  setBusy]  = useState(false)
  const [done,  setDone]  = useState(false)
  const [error, setError] = useState('')

  function sf<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  const stepIdx = ORDER.indexOf(step)

  function canAdvance(): boolean {
    if (step === 'property') return !!form.buildingName && !!form.unitNumber && !!form.moveInDate
    if (step === 'details')  return !!form.firstName && !!form.lastName && !!form.email
    if (step === 'payment' && form.paymentMethod === 'direct_debit')
      return !!form.bankName && !!form.bsb && !!form.accountNumber && !!form.accountName
    return true
  }

  function next() { if (stepIdx < ORDER.length - 1) setStep(ORDER[stepIdx + 1]) }
  function back() { if (stepIdx > 0) setStep(ORDER[stepIdx - 1]) }

  async function handleSubmit() {
    setBusy(true)
    setError('')
    try {
      const origin = window.location.origin
      const prefill = btoa(JSON.stringify({
        buildingName:  form.buildingName,
        unitNumber:    form.unitNumber,
        moveInDate:    form.moveInDate,
        firstName:     form.firstName,
        lastName:      form.lastName,
        email:         form.email,
        phone:         form.phone,
        paymentMethod: form.paymentMethod,
        bankName:      form.bankName    || undefined,
        bsb:           form.bsb         || undefined,
        accountNumber: form.accountNumber || undefined,
        accountName:   form.accountName   || undefined,
      }))
      const approveUrl = `${origin}/electricity/onboard?prefill=${prefill}`

      const res = await fetch('/api/send-connection-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingName:  form.buildingName,
          unitNumber:    form.unitNumber,
          moveInDate:    form.moveInDate,
          firstName:     form.firstName,
          lastName:      form.lastName,
          email:         form.email,
          phone:         form.phone,
          paymentMethod: form.paymentMethod,
          bankName:      form.bankName    || undefined,
          bsb:           form.bsb         || undefined,
          accountNumber: form.accountNumber || undefined,
          accountName:   form.accountName   || undefined,
          companyName,
          companyEmail,
          fromEmail,
          approveUrl,
          origin,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit')
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-xl p-10">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Request Submitted!</h1>
          <p className="text-slate-600 mb-2">
            Thank you, <strong>{form.firstName}</strong>! Your electricity connection request for{' '}
            <strong>Unit {form.unitNumber}, {form.buildingName}</strong> has been received.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            You&apos;ll receive a confirmation email at <strong>{form.email}</strong>.
            We&apos;ll set up your account within 1 business day.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">What happens next</p>
            {[
              'We review your request and verify the unit.',
              'Your electricity account is set up within 1 business day.',
              'You receive a welcome email with full account details.',
            ].map((s, i) => (
              <p key={i} className="text-sm text-slate-600 mb-1.5 flex items-start gap-2">
                <span className="text-emerald-600 font-bold flex-shrink-0">{i + 1}.</span>{s}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div style={{ background: '#0c1120' }} className="px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">{companyName}</p>
          <p className="text-slate-400 text-xs">New Electricity Connection Request</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

        {/* Progress stepper */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const isDone = i < stepIdx
              const isCur  = i === stepIdx
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${isDone ? 'bg-emerald-500 text-white' : isCur ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isDone ? <Check size={14} /> : <s.icon size={14} />}
                    </div>
                    <p className={`text-xs mt-1.5 font-medium text-center leading-tight
                      ${isCur ? 'text-sky-600' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
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
        <div className="bg-white rounded-2xl shadow-sm p-6">

          {/* STEP 1: Property */}
          {step === 'property' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Property Details</h2>
                <p className="text-sm text-slate-500 mt-1">Tell us which unit you&apos;re moving into.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Building Name *</label>
                  <input value={form.buildingName} onChange={e => sf('buildingName', e.target.value)}
                    placeholder="e.g. Meridian Apartments"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unit Number *</label>
                  <input value={form.unitNumber} onChange={e => sf('unitNumber', e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Requested Move-in Date *</label>
                  <input type="date" value={form.moveInDate} onChange={e => sf('moveInDate', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Tenant Details */}
          {step === 'details' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Your Details</h2>
                <p className="text-sm text-slate-500 mt-1">We&apos;ll use this to set up your electricity account.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([['firstName','First Name *'],['lastName','Last Name *']] as [keyof FormState, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input value={String(form[key])} onChange={e => sf(key, e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email Address *</label>
                  <input type="email" value={form.email} onChange={e => sf('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => sf('phone', e.target.value)}
                    placeholder="04xx xxx xxx"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Payment */}
          {step === 'payment' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Payment Preference</h2>
                <p className="text-sm text-slate-500 mt-1">How would you like to pay your electricity bills?</p>
              </div>
              <div className="space-y-3">
                {([
                  ['direct_debit', 'Direct Debit', 'Automatically debited on your due date — no action needed each month.'],
                  ['bpay',         'BPAY',          'Pay via your bank using a BPAY biller code and reference number.'],
                  ['eft',          'EFT Transfer',   'Pay via bank transfer using the account details on your invoice.'],
                ] as [PaymentMethod, string, string][]).map(([val, lbl, desc]) => (
                  <button key={val} onClick={() => sf('paymentMethod', val)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all
                      ${form.paymentMethod === val ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                        ${form.paymentMethod === val ? 'border-sky-500' : 'border-slate-300'}`}>
                        {form.paymentMethod === val && <div className="w-2 h-2 rounded-full bg-sky-500" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{lbl}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-tight">{desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {form.paymentMethod === 'direct_debit' && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bank Account for Direct Debit</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['bankName',      'Bank Name *'],
                      ['bsb',           'BSB (nnn-nnn) *'],
                      ['accountNumber', 'Account Number *'],
                      ['accountName',   'Account Name *'],
                    ] as [keyof FormState, string][]).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                        <input value={String(form[key])} onChange={e => sf(key, e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Review & Submit</h2>
                <p className="text-sm text-slate-500 mt-1">Please check your details before submitting.</p>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Property</p>
                  <p className="font-semibold text-slate-900">{form.buildingName} — Unit {form.unitNumber}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Requested move-in: {form.moveInDate}</p>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Details</p>
                  <p className="font-semibold text-slate-900">{form.firstName} {form.lastName}</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="flex items-center gap-1 text-sm text-slate-500"><Mail size={12} />{form.email}</span>
                    {form.phone && <span className="flex items-center gap-1 text-sm text-slate-500"><Phone size={12} />{form.phone}</span>}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment</p>
                  <p className="font-semibold text-slate-900">
                    {form.paymentMethod === 'direct_debit' ? 'Direct Debit' : form.paymentMethod === 'bpay' ? 'BPAY' : 'EFT Transfer'}
                  </p>
                  {form.paymentMethod === 'direct_debit' && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {form.accountName} · {form.bankName} · BSB {form.bsb} · {form.accountNumber}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} />{error}
                </div>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                By submitting, you authorise {companyName} to set up your electricity account and process payments
                as selected above.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={back} disabled={stepIdx === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 shadow-sm">
            <ArrowLeft size={15} />Back
          </button>
          <span className="text-xs text-slate-400">Step {stepIdx + 1} of {STEPS.length}</span>
          {step !== 'confirm' ? (
            <button onClick={next} disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 disabled:opacity-40 transition-colors shadow-sm">
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={busy}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
              <Check size={15} />{busy ? 'Submitting…' : 'Submit Request'}
            </button>
          )}
        </div>

        {companyEmail && (
          <p className="text-center text-xs text-slate-400 pb-4">
            Questions? Contact us at{' '}
            <a href={`mailto:${companyEmail}`} className="text-sky-600 hover:underline">{companyEmail}</a>
          </p>
        )}
      </div>
    </div>
  )
}
