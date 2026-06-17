'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Building, Apartment, Customer, MeterReading, ElectricityInvoice, ElectricitySettings, DebtorComm, DebtorStatus, PaymentPlan } from './electricityTypes'
import {
  BUILDINGS as SEED_BUILDINGS,
  APARTMENTS as SEED_APARTMENTS,
  generateAllApartments,
  generateDemoCustomers,
  generateDemoReadings,
  generateDemoInvoices,
  DEFAULT_SETTINGS,
} from './electricityData'
import { calculateProRataBill } from './electricityUtils'

const KEYS = {
  buildings:      'elec_buildings_v2',
  apartments:     'elec_apartments_v2',
  customers:      'elec_customers_v2',
  readings:       'elec_readings_v2',
  invoices:       'elec_invoices_v2',
  settings:       'elec_settings_v2',
  initialized:    'elec_initialized_v2',
  counter:        'elec_counter_v2',
  debtorComms:    'elec_debtor_comms_v2',
  debtorStatuses: 'elec_debtor_statuses_v2',
  paymentPlans:   'elec_payment_plans_v2',
}

// ── DB sync helpers ────────────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// Fire-and-forget: persist a collection to the database
function dbSave(key: string, value: unknown) {
  fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  }).catch(() => {/* silent — localStorage already has it */})
}

// Save to localStorage + DB
function save(key: string, value: unknown) {
  lsSet(key, value)
  dbSave(key, value)
}

// ── Context types ──────────────────────────────────────────────────────────────

interface ElectricityStore {
  buildings:  Building[]
  apartments: Apartment[]
  customers:  Customer[]
  readings:   MeterReading[]
  invoices:   ElectricityInvoice[]
  settings:   ElectricitySettings
  isLoaded:   boolean
  addBuilding:    (b: Building) => Apartment[]
  updateBuilding: (b: Building) => void
  removeBuilding: (id: string) => void
  updateApartment: (a: Apartment) => void
  addCustomer:    (c: Customer) => void
  updateCustomer: (c: Customer) => void
  removeCustomer: (id: string) => void
  offboardCustomer: (customerId: string, moveOutDate: string, finalReading: number) => void
  setVacateRequest: (customerId: string, date: string) => void
  updateReading: (r: MeterReading) => void
  upsertReadings: (r: MeterReading[]) => void
  upsertInvoices: (i: ElectricityInvoice[]) => void
  updateInvoice:  (i: ElectricityInvoice) => void
  updateSettings: (s: ElectricitySettings) => void
  nextInvoiceNumber: (month: number, year: number) => string
  resetToDemo: () => void
  debtorComms:    DebtorComm[]
  debtorStatuses: DebtorStatus[]
  paymentPlans:   PaymentPlan[]
  addDebtorComm:    (c: DebtorComm) => void
  setDebtorStatus:  (s: DebtorStatus) => void
  upsertPaymentPlan:(p: PaymentPlan) => void
}

const Ctx = createContext<ElectricityStore | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────────

export function ElectricityProvider({ children }: { children: ReactNode }) {
  const [buildings,       setBuildings]       = useState<Building[]>([])
  const [apartments,      setApartments]      = useState<Apartment[]>([])
  const [customers,       setCustomers]       = useState<Customer[]>([])
  const [readings,        setReadings]        = useState<MeterReading[]>([])
  const [invoices,        setInvoices]        = useState<ElectricityInvoice[]>([])
  const [settings,        setSettings]        = useState<ElectricitySettings>(DEFAULT_SETTINGS)
  const [isLoaded,        setIsLoaded]        = useState(false)
  const [debtorComms,     setDebtorComms]     = useState<DebtorComm[]>([])
  const [debtorStatuses,  setDebtorStatuses]  = useState<DebtorStatus[]>([])
  const [paymentPlans,    setPaymentPlans]    = useState<PaymentPlan[]>([])
  // counter lives in a ref-like state to avoid stale closures
  const [counter, setCounter] = useState(0)

  // ── Seed helper ────────────────────────────────────────────────────────────

  const initDemo = useCallback((cfg: ElectricitySettings, blds: Building[]) => {
    const apts = generateAllApartments(blds)
    const demoCustomers = generateDemoCustomers(apts)
    const allReadings: MeterReading[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(2026, 4 - i, 1)
      allReadings.push(...generateDemoReadings(apts, d.getMonth() + 1, d.getFullYear()))
    }
    const demoInvoices = generateDemoInvoices(apts, demoCustomers, allReadings, 5, 2026, cfg)

    save(KEYS.buildings,   blds)
    save(KEYS.apartments,  apts)
    save(KEYS.customers,   demoCustomers)
    save(KEYS.readings,    allReadings)
    save(KEYS.invoices,    demoInvoices)
    save(KEYS.initialized, true)
    save(KEYS.counter,     demoInvoices.length)

    setBuildings(blds)
    setApartments(apts)
    setCustomers(demoCustomers)
    setReadings(allReadings)
    setInvoices(demoInvoices)
    setCounter(demoInvoices.length)
  }, [])

  // ── Bootstrap: try DB first, fall back to localStorage ────────────────────

  useEffect(() => {
    async function load() {
      let dbData: Record<string, unknown> = {}
      try {
        const res = await fetch('/api/db')
        if (res.ok) {
          const json = await res.json()
          if (json.ok) dbData = json.data ?? {}
        }
      } catch { /* offline — use localStorage */ }

      // Merge DB values into localStorage (DB wins when present)
      for (const [k, v] of Object.entries(dbData)) {
        if (v !== null && v !== undefined) lsSet(k, v)
      }

      const savedSettings: ElectricitySettings = {
        ...DEFAULT_SETTINGS,
        ...(lsGet<Partial<ElectricitySettings>>(KEYS.settings, {})),
      }
      setSettings(savedSettings)

      const initialized = lsGet<boolean | null>(KEYS.initialized, null)
      if (!initialized) {
        initDemo(savedSettings, SEED_BUILDINGS)
      } else {
        setBuildings(lsGet(KEYS.buildings,   SEED_BUILDINGS))
        setApartments(lsGet(KEYS.apartments,  SEED_APARTMENTS))
        setCustomers(lsGet(KEYS.customers,   []))
        setReadings(lsGet(KEYS.readings,    []))
        setInvoices(lsGet(KEYS.invoices,    []))
        setCounter(lsGet(KEYS.counter, 0))
      }
      setDebtorComms(lsGet(KEYS.debtorComms,    []))
      setDebtorStatuses(lsGet(KEYS.debtorStatuses, []))
      setPaymentPlans(lsGet(KEYS.paymentPlans,   []))
      setIsLoaded(true)
    }
    load()
  }, [initDemo])

  // ── Buildings ──────────────────────────────────────────────────────────────

  const addBuilding = useCallback((b: Building): Apartment[] => {
    const newApts = generateAllApartments([b])
    setBuildings(prev => { const next = [...prev, b]; save(KEYS.buildings, next); return next })
    setApartments(prev => { const next = [...prev, ...newApts]; save(KEYS.apartments, next); return next })
    return newApts
  }, [])

  const updateBuilding = useCallback((b: Building) => {
    setBuildings(prev => { const next = prev.map(x => x.id === b.id ? b : x); save(KEYS.buildings, next); return next })
  }, [])

  const removeBuilding = useCallback((id: string) => {
    setBuildings(prev  => { const next = prev.filter(x => x.id !== id);       save(KEYS.buildings,  next); return next })
    setApartments(prev => { const next = prev.filter(a => a.buildingId !== id); save(KEYS.apartments, next); return next })
  }, [])

  // ── Apartments ─────────────────────────────────────────────────────────────

  const updateApartment = useCallback((a: Apartment) => {
    setApartments(prev => { const next = prev.map(x => x.id === a.id ? a : x); save(KEYS.apartments, next); return next })
  }, [])

  // ── Customers ──────────────────────────────────────────────────────────────

  const addCustomer = useCallback((c: Customer) => {
    setCustomers(prev => { const next = [...prev, c]; save(KEYS.customers, next); return next })
  }, [])

  const updateCustomer = useCallback((c: Customer) => {
    setCustomers(prev => { const next = prev.map(x => x.id === c.id ? c : x); save(KEYS.customers, next); return next })
  }, [])

  const removeCustomer = useCallback((id: string) => {
    setCustomers(prev => { const next = prev.filter(x => x.id !== id); save(KEYS.customers, next); return next })
  }, [])

  const setVacateRequest = useCallback((customerId: string, date: string) => {
    setCustomers(prev => {
      if (prev.find(c => c.id === customerId)?.vacateRequestDate === date) return prev
      const next = prev.map(c => c.id === customerId ? { ...c, vacateRequestDate: date } : c)
      save(KEYS.customers, next)
      return next
    })
  }, [])

  const offboardCustomer = useCallback((customerId: string, moveOutDate: string, finalReading: number) => {
    setCustomers(prev => {
      const next = prev.map(c => c.id === customerId ? { ...c, moveOutDate } : c)
      save(KEYS.customers, next)
      return next
    })

    setInvoices(prev => {
      setReadings(currentReadings => {
        const aptId = currentReadings.find(r => {
          const any = prev.find(i => i.customerId === customerId)
          return any && r.apartmentId === any.apartmentId
        })?.apartmentId
        if (!aptId) return currentReadings

        const moveMonth = parseInt(moveOutDate.split('-')[1])
        const moveYear  = parseInt(moveOutDate.split('-')[0])
        const latestReading = currentReadings
          .filter(r => r.apartmentId === aptId)
          .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0]

        const prevReading  = latestReading?.currentReading ?? 0
        const billingStart = `${moveYear}-${String(moveMonth).padStart(2,'0')}-01`
        const bill = calculateProRataBill(moveOutDate, billingStart, prevReading, finalReading, settings.tariff)

        {
          const next = lsGet<number>(KEYS.counter, 0) + 1
          save(KEYS.counter, next)
          setCounter(next)
          const finalInvoice: ElectricityInvoice = {
            id: `final-${aptId}-${Date.now()}`,
            invoiceNumber: `${settings.invoicePrefix}-${moveYear}${String(moveMonth).padStart(2,'0')}-${String(next).padStart(4,'0')}`,
            customerId,
            apartmentId: aptId,
            buildingId: prev.find(i => i.apartmentId === aptId)?.buildingId ?? '',
            month: moveMonth, year: moveYear,
            issueDate: moveOutDate,
            dueDate: new Date(moveYear, moveMonth - 1, parseInt(moveOutDate.split('-')[2]) + settings.paymentTermsDays).toISOString().split('T')[0],
            billingPeriodStart: billingStart, billingPeriodEnd: moveOutDate,
            daysInPeriod: bill.daysInPeriod,
            previousReading: prevReading, currentReading: finalReading,
            usage: bill.usage, ratePerKwh: settings.tariff.ratePerKwh,
            usageCharge: bill.usageCharge, supplyCharge: bill.supplyCharge,
            subtotal: bill.subtotal, gst: bill.gst, total: bill.total,
            status: 'draft', isFinalBill: true,
          }
          setInvoices(inv => {
            const updated = inv.map(i =>
              i.apartmentId === aptId && i.month === moveMonth && i.year === moveYear && !i.isFinalBill
                ? { ...i, status: 'cancelled' as const } : i
            )
            const next2 = [...updated, finalInvoice]
            save(KEYS.invoices, next2)
            return next2
          })
        }
        return currentReadings
      })
      return prev
    })
  }, [settings])

  // ── Readings & Invoices ────────────────────────────────────────────────────

  const updateReading = useCallback((r: MeterReading) => {
    setReadings(prev => { const next = prev.map(x => x.id === r.id ? r : x); save(KEYS.readings, next); return next })
  }, [])

  const upsertReadings = useCallback((newR: MeterReading[]) => {
    setReadings(prev => {
      const map = new Map(prev.map(r => [r.id, r]))
      newR.forEach(r => map.set(r.id, r))
      const next = Array.from(map.values())
      save(KEYS.readings, next)
      return next
    })
  }, [])

  const upsertInvoices = useCallback((newI: ElectricityInvoice[]) => {
    setInvoices(prev => {
      const map = new Map(prev.map(i => [i.id, i]))
      newI.forEach(i => map.set(i.id, i))
      const next = Array.from(map.values())
      save(KEYS.invoices, next)
      return next
    })
  }, [])

  const updateInvoice = useCallback((invoice: ElectricityInvoice) => {
    setInvoices(prev => { const next = prev.map(i => i.id === invoice.id ? invoice : i); save(KEYS.invoices, next); return next })
  }, [])

  const updateSettings = useCallback((s: ElectricitySettings) => {
    setSettings(s)
    save(KEYS.settings, s)
  }, [])

  const nextInvoiceNumber = useCallback((month: number, year: number): string => {
    // Read directly from localStorage so the increment is synchronous
    const next = lsGet<number>(KEYS.counter, 0) + 1
    save(KEYS.counter, next)
    setCounter(next)
    return `${settings.invoicePrefix}-${year}${String(month).padStart(2,'0')}-${String(next).padStart(4,'0')}`
  }, [settings.invoicePrefix])

  // ── Debtors ────────────────────────────────────────────────────────────────

  const addDebtorComm = useCallback((c: DebtorComm) => {
    setDebtorComms(prev => { const next = [...prev, c]; save(KEYS.debtorComms, next); return next })
  }, [])

  const setDebtorStatus = useCallback((s: DebtorStatus) => {
    setDebtorStatuses(prev => {
      const next = prev.some(x => x.invoiceId === s.invoiceId)
        ? prev.map(x => x.invoiceId === s.invoiceId ? s : x)
        : [...prev, s]
      save(KEYS.debtorStatuses, next)
      return next
    })
  }, [])

  const upsertPaymentPlan = useCallback((p: PaymentPlan) => {
    setPaymentPlans(prev => {
      const next = prev.some(x => x.id === p.id)
        ? prev.map(x => x.id === p.id ? p : x)
        : [...prev, p]
      save(KEYS.paymentPlans, next)
      return next
    })
  }, [])

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetToDemo = useCallback(() => {
    Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k) } catch {} })
    initDemo(DEFAULT_SETTINGS, SEED_BUILDINGS)
    setSettings(DEFAULT_SETTINGS)
    setDebtorComms([])
    setDebtorStatuses([])
    setPaymentPlans([])
  }, [initDemo])

  return (
    <Ctx.Provider value={{
      buildings, apartments, customers, readings, invoices, settings, isLoaded,
      addBuilding, updateBuilding, removeBuilding,
      updateApartment,
      addCustomer, updateCustomer, removeCustomer, offboardCustomer, setVacateRequest,
      updateReading, upsertReadings, upsertInvoices, updateInvoice, updateSettings,
      nextInvoiceNumber, resetToDemo,
      debtorComms, debtorStatuses, paymentPlans,
      addDebtorComm, setDebtorStatus, upsertPaymentPlan,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useElectricity() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useElectricity must be used within ElectricityProvider')
  return ctx
}
