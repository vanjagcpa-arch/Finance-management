'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UserPlus, Building2, User, CreditCard, Zap, Check, ArrowLeft, ArrowRight,
  ChevronRight, Mail, Phone, AlertCircle, Send, Info, FileUp, Sparkles, ChevronDown, ChevronUp, X,
  Shield,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import type { Customer, PaymentMethod } from '@/lib/electricityTypes'
import { formatDate, monthName } from '@/lib/electricityUtils'
import type { ExtractedCustomer } from '@/app/api/extract-customer-pdf/route'

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
  ezidebitCustomerId: string
  sendEzidebitDDR: boolean
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
  ezidebitCustomerId: '',
  sendEzidebitDDR: true,
  openingReading: '',
  sendWelcome: true,
}

export default function OnboardPage() {
  const router = useRouter()
  const { buildings, apartments, customers, readings, settings, addCustomer, upsertReadings, isLoaded } = useElectricity()
  const [step, setStep]       = useState<Step>('unit')
  const [form, setForm]       = useState<FormState>(EMPTY)
  const [busy, setBusy]       = useState(false)
  const [done, setDone]       = useState<{ customerId: string; customerName: string } | null>(null)
  const [error, setError]     = useState('')
  const [prefillBanner, setPrefillBanner] = useState('')

  // PDF smart-import state
  const [pdfOpen,      setPdfOpen]      = useState(false)
  const [pdfFile,      setPdfFile]      = useState<File | null>(null)
  const [pdfDragging,  setPdfDragging]  = useState(false)
  const [pdfExtracting, setPdfExtracting] = useState(false)
  const [pdfExtracted, setPdfExtracted] = useState<ExtractedCustomer | null>(null)
  const [pdfError,     setPdfError]     = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill from ?prefill= deep-link (from connection request approval email)
  useEffect(() => {
    if (!isLoaded) return
    const raw = new URLSearchParams(window.location.search).get('prefill')
    if (!raw) return
    try {
      const p = JSON.parse(atob(raw)) as Partial<{
        buildingName: string; unitNumber: string; moveInDate: string
        firstName: string; lastName: string; email: string; phone: string
        paymentMethod: PaymentMethod; bankName: string; bsb: string
        accountNumber: string; accountName: string
      }>

      // Try to resolve buildingId + apartmentId from building/unit name
      const matchedBuilding = buildings.find(b =>
        b.name.toLowerCase() === (p.buildingName ?? '').toLowerCase()
      )
      const occupiedIds = new Set(customers.filter(c => !c.moveOutDate).map(c => c.apartmentId))
      const matchedApt = matchedBuilding
        ? apartments.find(a =>
            a.buildingId === matchedBuilding.id &&
            a.unitNumber.toLowerCase() === (p.unitNumber ?? '').toLowerCase() &&
            !occupiedIds.has(a.id)
          )
        : undefined

      setForm(f => ({
        ...f,
        buildingId:    matchedBuilding?.id ?? '',
        apartmentId:   matchedApt?.id      ?? '',
        moveInDate:    p.moveInDate    ?? f.moveInDate,
        firstName:     p.firstName     ?? '',
        lastName:      p.lastName      ?? '',
        email:         p.email         ?? '',
        phone:         p.phone         ?? '',
        paymentMethod: p.paymentMethod ?? 'direct_debit',
        bankName:      p.bankName      ?? '',
        bsb:           p.bsb           ?? '',
        accountNumber: p.accountNumber ?? '',
        accountName:   p.accountName   ?? '',
      }))
      setPrefillBanner(
        matchedApt
          ? `Pre-filled from connection request — ${p.firstName} ${p.lastName}, Unit ${p.unitNumber}`
          : `Pre-filled from connection request — please select the unit for ${p.firstName} ${p.lastName} (Unit ${p.unitNumber ?? '?'}, ${p.buildingName ?? '?'})`
      )
      if (matchedBuilding && matchedApt) setStep('details')
    } catch {
      // silently ignore bad prefill data
    }
  }, [isLoaded, buildings, apartments, customers])

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

  async function handlePDFExtract(file: File) {
    setPdfFile(file)
    setPdfExtracted(null)
    setPdfError('')
    setPdfExtracting(true)
    try {
      const buf    = await file.arrayBuffer()
      const base64 = Buffer.from(buf).toString('base64')
      const res    = await fetch('/api/extract-customer-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Extraction failed')
      setPdfExtracted(json.extracted)
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : String(e))
    } finally {
      setPdfExtracting(false)
    }
  }

  function applyExtracted(p: ExtractedCustomer) {
    const occupiedIds = new Set(customers.filter(c => !c.moveOutDate).map(c => c.apartmentId))
    const matchedBuilding = p.buildingName
      ? buildings.find(b => b.name.toLowerCase().includes(p.buildingName!.toLowerCase()) ||
          p.buildingName!.toLowerCase().includes(b.name.toLowerCase()))
      : undefined
    const matchedApt = matchedBuilding && p.unitNumber
      ? apartments.find(a =>
          a.buildingId === matchedBuilding.id &&
          a.unitNumber.toLowerCase() === p.unitNumber!.toLowerCase() &&
          !occupiedIds.has(a.id)
        )
      : undefined

    setForm(f => ({
      ...f,
      buildingId:    matchedBuilding?.id ?? f.buildingId,
      apartmentId:   matchedApt?.id      ?? f.apartmentId,
      firstName:     p.firstName     ?? f.firstName,
      lastName:      p.lastName      ?? f.lastName,
      email:         p.email         ?? f.email,
      phone:         p.phone         ?? f.phone,
      moveInDate:    p.moveInDate    ?? f.moveInDate,
      paymentMethod: p.paymentMethod ?? f.paymentMethod,
      bankName:      p.bankName      ?? f.bankName,
      bsb:           p.bsb           ?? f.bsb,
      accountNumber: p.accountNumber ?? f.accountNumber,
      accountName:   p.accountName   ?? f.accountName,
    }))
    setPdfOpen(false)
    setPdfExtracted(null)
    setPdfFile(null)
    setPrefillBanner(
      matchedApt
        ? `PDF imported — ${p.firstName ?? ''} ${p.lastName ?? ''}, Unit ${p.unitNumber} matched successfully`
        : `PDF imported — ${p.firstName ?? ''} ${p.lastName ?? ''}${p.unitNumber ? ` (select unit ${p.unitNumber} manually)` : ''}`
    )
    setStep(matchedApt ? 'details' : 'unit')
  }

  const stepIdx = STEPS.findIndex(s => s.id === step)

  function canAdvance(): boolean {
    if (step === 'unit')    return !!form.buildingId && !!form.apartmentId
    if (step === 'details') return !!form.firstName && !!form.lastName && !!form.email && !!form.moveInDate
    if (step === 'payment') {
      if (form.paymentMethod === 'direct_debit') return !!form.bankName && !!form.bsb && !!form.accountNumber && !!form.accountName
      if (form.paymentMethod === 'ezidebit') return true  // bank details held by Ezidebit
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
        bankName: form.paymentMethod === 'ezidebit' ? '' : form.bankName,
        bsb: form.paymentMethod === 'ezidebit' ? '' : form.bsb,
        accountNumber: form.paymentMethod === 'ezidebit' ? '' : form.accountNumber,
        accountName: form.paymentMethod === 'ezidebit' ? '' : form.accountName,
        myobCardId: myobId,
        ezidebitCustomerId: form.ezidebitCustomerId || undefined,
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

      // Send Ezidebit DDR registration email
      if (form.paymentMethod === 'ezidebit' && form.sendEzidebitDDR && form.email) {
        try {
          await fetch('/api/send-ezidebit-ddr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: form.email,
              firstName: form.firstName,
              unitNumber: selectedApt?.unitNumber ?? '',
              buildingName: selectedBld?.name ?? '',
              buildingAddress: selectedBld?.address ?? '',
              customerId,
              ezidebitDigitalKey: settings.ezidebitDigitalKey ?? '',
              companyName: settings.companyName,
              fromEmail: settings.senderEmail || settings.email,
              companyEmail: settings.email,
              companyPhone: settings.phone,
            }),
          })
        } catch {
          // non-fatal — tenant can be sent the link manually later
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

        {/* PDF Smart Import */}
        <div className="card overflow-hidden">
          <button
            onClick={() => { setPdfOpen(o => !o); setPdfExtracted(null); setPdfError('') }}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Sparkles size={14} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Smart Import from PDF</p>
                <p className="text-xs text-slate-400">Upload a completed application form — AI extracts and fills the fields</p>
              </div>
            </div>
            {pdfOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>

          {pdfOpen && (
            <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
              {/* Drop zone */}
              {!pdfExtracted && (
                <div
                  onDragOver={e => { e.preventDefault(); setPdfDragging(true) }}
                  onDragLeave={() => setPdfDragging(false)}
                  onDrop={e => {
                    e.preventDefault(); setPdfDragging(false)
                    const f = e.dataTransfer.files[0]
                    if (f?.type === 'application/pdf') handlePDFExtract(f)
                    else setPdfError('Please drop a PDF file.')
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
                    ${pdfDragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/50'}`}>
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePDFExtract(f) }} />
                  {pdfExtracting ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                        <Sparkles size={20} className="text-violet-600 animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">Extracting data…</p>
                        <p className="text-xs text-slate-400 mt-0.5">Claude is reading {pdfFile?.name}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileUp size={20} className="text-slate-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">Drop PDF here or click to browse</p>
                        <p className="text-xs text-slate-400 mt-0.5">Completed application / connection form</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {pdfError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} />{pdfError}
                  <button onClick={() => setPdfError('')} className="ml-auto"><X size={13} /></button>
                </div>
              )}

              {/* Extracted data preview */}
              {pdfExtracted && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <Check size={15} className="text-emerald-600" />
                    Extracted from {pdfFile?.name}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['Name',          `${pdfExtracted.firstName ?? ''} ${pdfExtracted.lastName ?? ''}`.trim()],
                      ['Email',         pdfExtracted.email],
                      ['Phone',         pdfExtracted.phone],
                      ['Building',      pdfExtracted.buildingName],
                      ['Unit',          pdfExtracted.unitNumber],
                      ['Move-in Date',  pdfExtracted.moveInDate],
                      ['Payment',       pdfExtracted.paymentMethod === 'direct_debit' ? 'Direct Debit'
                                        : pdfExtracted.paymentMethod === 'bpay' ? 'BPAY' : pdfExtracted.paymentMethod ?? null],
                      ['Bank',          pdfExtracted.bankName],
                      ['BSB',           pdfExtracted.bsb],
                      ['Account No.',   pdfExtracted.accountNumber],
                      ['Account Name',  pdfExtracted.accountName],
                      ['Notes',         pdfExtracted.notes],
                    ] as [string, string | null][]).filter(([, v]) => v).map(([label, val]) => (
                      <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-400 font-medium">{label}</p>
                        <p className="text-sm text-slate-800 font-medium truncate">{val}</p>
                      </div>
                    ))}
                  </div>
                  {pdfExtracted.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-amber-600 mb-0.5">Notes from form</p>
                      <p className="text-sm text-amber-800">{pdfExtracted.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setPdfExtracted(null); setPdfFile(null) }}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                      Try another
                    </button>
                    <button onClick={() => applyExtracted(pdfExtracted)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700">
                      <Sparkles size={13} />Use This Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pre-fill banner */}
        {prefillBanner && (
          <div className="flex items-start gap-2 px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-800">
            <Info size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
            <span>{prefillBanner}</span>
          </div>
        )}

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
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['direct_debit','Direct Debit','Debited via your ABA file'],
                    ['ezidebit','Ezidebit DDR','Debited via Ezidebit — bank details stored by Ezidebit, not this app'],
                    ['bpay','BPAY','Tenant pays via BPAY'],
                    ['eft','EFT Transfer','Tenant pays via bank transfer'],
                  ] as [PaymentMethod, string, string][]).map(([val, lbl, desc]) => (
                    <button key={val} onClick={() => sf('paymentMethod', val)}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all
                        ${form.paymentMethod === val
                          ? val === 'ezidebit' ? 'border-violet-500 bg-violet-50' : 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className={`font-semibold text-sm ${form.paymentMethod === val && val === 'ezidebit' ? 'text-violet-900' : 'text-slate-900'}`}>{lbl}</p>
                        {val === 'ezidebit' && <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium">Recommended</span>}
                      </div>
                      <p className="text-xs text-slate-500 leading-tight">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Debit — bank details stored in app */}
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

              {/* Ezidebit DDR — bank details held by Ezidebit */}
              {form.paymentMethod === 'ezidebit' && (
                <div className="space-y-4">
                  {/* Security callout */}
                  <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                    <Shield size={16} className="text-violet-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-violet-800">
                      <p className="font-semibold mb-1">Bank details stored securely by Ezidebit — not in this app</p>
                      <p className="leading-relaxed">The tenant registers their bank account directly on Ezidebit&apos;s secure platform. You never handle the raw account numbers, and they are never saved in this system.</p>
                    </div>
                  </div>

                  {/* Send registration email toggle */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer" onClick={() => sf('sendEzidebitDDR', !form.sendEzidebitDDR)}>
                      <div className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${form.sendEzidebitDDR ? 'bg-violet-600' : 'bg-slate-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.sendEzidebitDDR ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Send DDR registration link to tenant</span>
                    </label>
                    {form.sendEzidebitDDR && form.email && (
                      <p className="text-xs text-slate-500 ml-13 pl-0.5">
                        An email will be sent to <strong>{form.email}</strong> with a secure link to register their bank details directly with Ezidebit.
                        {!settings.ezidebitDigitalKey && (
                          <span className="text-amber-600 font-medium"> Add your Ezidebit Digital Key in Settings to include the registration link in the email.</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Existing Ezidebit Customer ID */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ezidebit Customer ID <span className="text-slate-400 font-normal">(optional — leave blank for new registrations)</span></label>
                    <input
                      value={form.ezidebitCustomerId}
                      onChange={e => sf('ezidebitCustomerId', e.target.value)}
                      placeholder="e.g. A1B2C3D4-xxxx-xxxx-xxxx (from Ezidebit portal)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                    <p className="text-xs text-slate-400 mt-1">If the tenant has already registered, paste their Ezidebit Customer ID here. Otherwise leave blank — it can be added later from the Customers page.</p>
                  </div>

                  {/* Settings nudge if no digital key */}
                  {!settings.ezidebitDigitalKey && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <AlertCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Configure your <strong>Ezidebit Digital Key</strong> in{' '}
                        <Link href="/electricity/settings" className="font-semibold underline">Settings</Link>
                        {' '}to include an automated registration link in the email.
                      </span>
                    </div>
                  )}
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
                <div className={`p-4 rounded-xl border ${form.paymentMethod === 'ezidebit' ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment</p>
                  <p className="font-semibold text-slate-900">
                    {form.paymentMethod === 'direct_debit' ? 'Direct Debit (DDR)'
                      : form.paymentMethod === 'ezidebit' ? 'Ezidebit DDR'
                      : form.paymentMethod === 'bpay' ? 'BPAY'
                      : 'EFT Transfer'}
                  </p>
                  {form.paymentMethod === 'direct_debit' && (
                    <p className="text-sm text-slate-500 mt-0.5">{form.accountName} · {form.bankName} · BSB {form.bsb} · {form.accountNumber}</p>
                  )}
                  {form.paymentMethod === 'ezidebit' && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-violet-700 flex items-center gap-1"><Shield size={11} />Bank details held securely by Ezidebit — not stored here</p>
                      {form.ezidebitCustomerId && <p className="text-xs text-slate-500 font-mono">ID: {form.ezidebitCustomerId}</p>}
                      {form.sendEzidebitDDR && <p className="text-xs text-violet-600 flex items-center gap-1"><Send size={11} />DDR registration email will be sent to {form.email}</p>}
                    </div>
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
