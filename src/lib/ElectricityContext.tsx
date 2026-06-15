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
  initialized:    'elec_init_v2',
  counter:        'elec_counter_v2',
  debtorComms:    'elec_debtor_comms_v2',
  debtorStatuses: 'elec_debtor_statuses_v2',
  paymentPlans:   'elec_payment_plans_v2',
}

interface ElectricityStore {
  buildings:  Building[]
  apartments: Apartment[]
  customers:  Customer[]
  readings:   MeterReading[]
  invoices:   ElectricityInvoice[]
  settings:   ElectricitySettings
  isLoaded:   boolean
  // Buildings
  addBuilding:    (b: Building) => Apartment[]
  updateBuilding: (b: Building) => void
  removeBuilding: (id: string) => void
  // Customers
  addCustomer:    (c: Customer) => void
  updateCustomer: (c: Customer) => void
  removeCustomer: (id: string) => void
  offboardCustomer: (customerId: string, moveOutDate: string, finalReading: number) => void
  // Data
  upsertReadings: (r: MeterReading[]) => void
  upsertInvoices: (i: ElectricityInvoice[]) => void
  updateInvoice:  (i: ElectricityInvoice) => void
  updateSettings: (s: ElectricitySettings) => void
  nextInvoiceNumber: (month: number, year: number) => string
  resetToDemo: () => void
  // Debtors
  debtorComms:    DebtorComm[]
  debtorStatuses: DebtorStatus[]
  paymentPlans:   PaymentPlan[]
  addDebtorComm:    (c: DebtorComm) => void
  setDebtorStatus:  (s: DebtorStatus) => void
  upsertPaymentPlan:(p: PaymentPlan) => void
}

const Ctx = createContext<ElectricityStore | null>(null)

export function ElectricityProvider({ children }: { children: ReactNode }) {
  const [buildings,  setBuildings]  = useState<Building[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [customers,  setCustomers]  = useState<Customer[]>([])
  const [readings,   setReadings]   = useState<MeterReading[]>([])
  const [invoices,   setInvoices]   = useState<ElectricityInvoice[]>([])
  const [settings,       setSettings]       = useState<ElectricitySettings>(DEFAULT_SETTINGS)
  const [isLoaded,       setIsLoaded]       = useState(false)
  const [debtorComms,    setDebtorComms]    = useState<DebtorComm[]>([])
  const [debtorStatuses, setDebtorStatuses] = useState<DebtorStatus[]>([])
  const [paymentPlans,   setPaymentPlans]   = useState<PaymentPlan[]>([])

  const save = useCallback((key: string, data: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
  }, [])

  const initDemo = useCallback((cfg: ElectricitySettings, blds: Building[]) => {
    const apts = generateAllApartments(blds)
    const demoCustomers = generateDemoCustomers(apts)

    // Generate 12 months of readings: Jun 2025 → May 2026
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
  }, [save])

  useEffect(() => {
    const initialized = localStorage.getItem(KEYS.initialized)
    const savedSettings: ElectricitySettings = { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEYS.settings) ?? 'null') ?? {}) }
    setSettings(savedSettings)

    if (!initialized) {
      initDemo(savedSettings, SEED_BUILDINGS)
    } else {
      setBuildings(JSON.parse(localStorage.getItem(KEYS.buildings) ?? 'null') ?? SEED_BUILDINGS)
      setApartments(JSON.parse(localStorage.getItem(KEYS.apartments) ?? 'null') ?? SEED_APARTMENTS)
      setCustomers(JSON.parse(localStorage.getItem(KEYS.customers) ?? '[]'))
      setReadings(JSON.parse(localStorage.getItem(KEYS.readings) ?? '[]'))
      setInvoices(JSON.parse(localStorage.getItem(KEYS.invoices) ?? '[]'))
    }
    setDebtorComms(JSON.parse(localStorage.getItem(KEYS.debtorComms) ?? '[]'))
    setDebtorStatuses(JSON.parse(localStorage.getItem(KEYS.debtorStatuses) ?? '[]'))
    setPaymentPlans(JSON.parse(localStorage.getItem(KEYS.paymentPlans) ?? '[]'))
    setIsLoaded(true)
  }, [initDemo])

  // --- Buildings ---
  const addBuilding = useCallback((b: Building): Apartment[] => {
    const newApts = generateAllApartments([b])
    setBuildings(prev => { const next = [...prev, b]; save(KEYS.buildings, next); return next })
    setApartments(prev => { const next = [...prev, ...newApts]; save(KEYS.apartments, next); return next })
    return newApts
  }, [save])

  const updateBuilding = useCallback((b: Building) => {
    setBuildings(prev => { const next = prev.map(x => x.id === b.id ? b : x); save(KEYS.buildings, next); return next })
  }, [save])

  const removeBuilding = useCallback((id: string) => {
    setBuildings(prev => { const next = prev.filter(x => x.id !== id); save(KEYS.buildings, next); return next })
    setApartments(prev => { const next = prev.filter(a => a.buildingId !== id); save(KEYS.apartments, next); return next })
  }, [save])

  // --- Customers ---
  const addCustomer = useCallback((c: Customer) => {
    setCustomers(prev => { const next = [...prev, c]; save(KEYS.customers, next); return next })
  }, [save])

  const updateCustomer = useCallback((c: Customer) => {
    setCustomers(prev => { const next = prev.map(x => x.id === c.id ? c : x); save(KEYS.customers, next); return next })
  }, [save])

  const removeCustomer = useCallback((id: string) => {
    setCustomers(prev => { const next = prev.filter(x => x.id !== id); save(KEYS.customers, next); return next })
  }, [save])

  const offboardCustomer = useCallback((customerId: string, moveOutDate: string, finalReading: number) => {
    setCustomers(prev => {
      const next = prev.map(c => c.id === customerId ? { ...c, moveOutDate } : c)
      save(KEYS.customers, next)
      return next
    })

    setInvoices(prev => {
      const customer = prev.find(i => i.customerId === customerId) // find any invoice for customer
      if (!customer) return prev

      // Get apt from context readings
      setReadings(currentReadings => {
        const aptId = currentReadings.find(r => {
          const any = prev.find(i => i.customerId === customerId)
          return any && r.apartmentId === any.apartmentId
        })?.apartmentId

        if (!aptId) return currentReadings

        const moveMonth = parseInt(moveOutDate.split('-')[1])
        const moveYear  = parseInt(moveOutDate.split('-')[0])

        // Get latest reading for previous reading
        const latestReading = currentReadings
          .filter(r => r.apartmentId === aptId)
          .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0]

        const prevReading = latestReading?.currentReading ?? 0
        const billingStart = `${moveYear}-${String(moveMonth).padStart(2,'0')}-01`

        const bill = calculateProRataBill(moveOutDate, billingStart, prevReading, finalReading, settings.tariff)

        const counter = parseInt(localStorage.getItem(KEYS.counter) ?? '0') + 1
        localStorage.setItem(KEYS.counter, String(counter))

        const finalInvoice: ElectricityInvoice = {
          id: `final-${aptId}-${Date.now()}`,
          invoiceNumber: `${settings.invoicePrefix}-${moveYear}${String(moveMonth).padStart(2,'0')}-${String(counter).padStart(4,'0')}`,
          customerId,
          apartmentId: aptId,
          buildingId: prev.find(i => i.apartmentId === aptId)?.buildingId ?? '',
          month: moveMonth, year: moveYear,
          issueDate: moveOutDate,
          dueDate: new Date(moveYear, moveMonth - 1, parseInt(moveOutDate.split('-')[2]) + settings.paymentTermsDays).toISOString().split('T')[0],
          billingPeriodStart: billingStart,
          billingPeriodEnd: moveOutDate,
          daysInPeriod: bill.daysInPeriod,
          previousReading: prevReading,
          currentReading: finalReading,
          usage: bill.usage,
          ratePerKwh: settings.tariff.ratePerKwh,
          usageCharge: bill.usageCharge,
          supplyCharge: bill.supplyCharge,
          subtotal: bill.subtotal,
          gst: bill.gst,
          total: bill.total,
          status: 'draft',
          isFinalBill: true,
        }

        // Cancel existing invoice for this apartment in this month (if any)
        const updated = prev.map(i =>
          i.apartmentId === aptId && i.month === moveMonth && i.year === moveYear && !i.isFinalBill
            ? { ...i, status: 'cancelled' as const }
            : i
        )
        const next = [...updated, finalInvoice]
        save(KEYS.invoices, next)

        return currentReadings
      })

      return prev // outer setInvoices returns unchanged (inner setReadings handles it)
    })
  }, [save, settings])

  // --- Readings & Invoices ---
  const upsertReadings = useCallback((newR: MeterReading[]) => {
    setReadings(prev => {
      const map = new Map(prev.map(r => [r.id, r]))
      newR.forEach(r => map.set(r.id, r))
      const next = Array.from(map.values())
      save(KEYS.readings, next)
      return next
    })
  }, [save])

  const upsertInvoices = useCallback((newI: ElectricityInvoice[]) => {
    setInvoices(prev => {
      const map = new Map(prev.map(i => [i.id, i]))
      newI.forEach(i => map.set(i.id, i))
      const next = Array.from(map.values())
      save(KEYS.invoices, next)
      return next
    })
  }, [save])

  const updateInvoice = useCallback((invoice: ElectricityInvoice) => {
    setInvoices(prev => {
      const next = prev.map(i => i.id === invoice.id ? invoice : i)
      save(KEYS.invoices, next)
      return next
    })
  }, [save])

  const updateSettings = useCallback((s: ElectricitySettings) => {
    setSettings(s)
    save(KEYS.settings, s)
  }, [save])

  const nextInvoiceNumber = useCallback((month: number, year: number): string => {
    const counter = parseInt(localStorage.getItem(KEYS.counter) ?? '0') + 1
    localStorage.setItem(KEYS.counter, String(counter))
    return `${settings.invoicePrefix}-${year}${String(month).padStart(2,'0')}-${String(counter).padStart(4,'0')}`
  }, [settings.invoicePrefix])

  const addDebtorComm = useCallback((c: DebtorComm) => {
    setDebtorComms(prev => { const next = [...prev, c]; save(KEYS.debtorComms, next); return next })
  }, [save])

  const setDebtorStatus = useCallback((s: DebtorStatus) => {
    setDebtorStatuses(prev => {
      const next = prev.some(x => x.invoiceId === s.invoiceId)
        ? prev.map(x => x.invoiceId === s.invoiceId ? s : x)
        : [...prev, s]
      save(KEYS.debtorStatuses, next)
      return next
    })
  }, [save])

  const upsertPaymentPlan = useCallback((p: PaymentPlan) => {
    setPaymentPlans(prev => {
      const next = prev.some(x => x.id === p.id)
        ? prev.map(x => x.id === p.id ? p : x)
        : [...prev, p]
      save(KEYS.paymentPlans, next)
      return next
    })
  }, [save])

  const resetToDemo = useCallback(() => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k))
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
      addCustomer, updateCustomer, removeCustomer, offboardCustomer,
      upsertReadings, upsertInvoices, updateInvoice, updateSettings,
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
