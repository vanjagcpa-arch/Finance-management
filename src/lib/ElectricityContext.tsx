'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Customer, MeterReading, ElectricityInvoice, ElectricitySettings } from './electricityTypes'
import {
  APARTMENTS,
  generateDemoCustomers,
  generateDemoReadings,
  generateDemoInvoices,
  DEFAULT_SETTINGS,
} from './electricityData'

const STORAGE_KEYS = {
  customers: 'elec_customers',
  readings: 'elec_readings',
  invoices: 'elec_invoices',
  settings: 'elec_settings',
  initialized: 'elec_initialized',
  invoiceCounter: 'elec_inv_counter',
}

interface ElectricityStore {
  customers: Customer[]
  readings: MeterReading[]
  invoices: ElectricityInvoice[]
  settings: ElectricitySettings
  isLoaded: boolean
  addCustomer: (c: Customer) => void
  updateCustomer: (c: Customer) => void
  removeCustomer: (id: string) => void
  upsertReadings: (readings: MeterReading[]) => void
  upsertInvoices: (invoices: ElectricityInvoice[]) => void
  updateInvoice: (invoice: ElectricityInvoice) => void
  updateSettings: (s: ElectricitySettings) => void
  nextInvoiceNumber: (prefix: string, month: number, year: number) => string
  resetToDemo: () => void
}

const ElectricityCtx = createContext<ElectricityStore | null>(null)

export function ElectricityProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [invoices, setInvoices] = useState<ElectricityInvoice[]>([])
  const [settings, setSettings] = useState<ElectricitySettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  const save = useCallback((key: string, data: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota exceeded */ }
  }, [])

  const initDemo = useCallback((cfg: ElectricitySettings) => {
    const demoCustomers = generateDemoCustomers(APARTMENTS)
    const demoReadings = generateDemoReadings(APARTMENTS, 5, 2026)
    const demoInvoices = generateDemoInvoices(APARTMENTS, demoCustomers, demoReadings, 5, 2026, cfg)
    save(STORAGE_KEYS.customers, demoCustomers)
    save(STORAGE_KEYS.readings, demoReadings)
    save(STORAGE_KEYS.invoices, demoInvoices)
    save(STORAGE_KEYS.initialized, true)
    save(STORAGE_KEYS.invoiceCounter, demoInvoices.length)
    setCustomers(demoCustomers)
    setReadings(demoReadings)
    setInvoices(demoInvoices)
  }, [save])

  useEffect(() => {
    const initialized = localStorage.getItem(STORAGE_KEYS.initialized)
    const savedSettings: ElectricitySettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? 'null') ?? DEFAULT_SETTINGS

    setSettings(savedSettings)

    if (!initialized) {
      initDemo(savedSettings)
    } else {
      setCustomers(JSON.parse(localStorage.getItem(STORAGE_KEYS.customers) ?? '[]'))
      setReadings(JSON.parse(localStorage.getItem(STORAGE_KEYS.readings) ?? '[]'))
      setInvoices(JSON.parse(localStorage.getItem(STORAGE_KEYS.invoices) ?? '[]'))
    }
    setIsLoaded(true)
  }, [initDemo])

  const addCustomer = useCallback((c: Customer) => {
    setCustomers(prev => {
      const next = [...prev, c]
      save(STORAGE_KEYS.customers, next)
      return next
    })
  }, [save])

  const updateCustomer = useCallback((c: Customer) => {
    setCustomers(prev => {
      const next = prev.map(x => x.id === c.id ? c : x)
      save(STORAGE_KEYS.customers, next)
      return next
    })
  }, [save])

  const removeCustomer = useCallback((id: string) => {
    setCustomers(prev => {
      const next = prev.filter(x => x.id !== id)
      save(STORAGE_KEYS.customers, next)
      return next
    })
  }, [save])

  const upsertReadings = useCallback((newReadings: MeterReading[]) => {
    setReadings(prev => {
      const map = new Map(prev.map(r => [r.id, r]))
      newReadings.forEach(r => map.set(r.id, r))
      const next = Array.from(map.values())
      save(STORAGE_KEYS.readings, next)
      return next
    })
  }, [save])

  const upsertInvoices = useCallback((newInvoices: ElectricityInvoice[]) => {
    setInvoices(prev => {
      const map = new Map(prev.map(i => [i.id, i]))
      newInvoices.forEach(i => map.set(i.id, i))
      const next = Array.from(map.values())
      save(STORAGE_KEYS.invoices, next)
      return next
    })
  }, [save])

  const updateInvoice = useCallback((invoice: ElectricityInvoice) => {
    setInvoices(prev => {
      const next = prev.map(i => i.id === invoice.id ? invoice : i)
      save(STORAGE_KEYS.invoices, next)
      return next
    })
  }, [save])

  const updateSettings = useCallback((s: ElectricitySettings) => {
    setSettings(s)
    save(STORAGE_KEYS.settings, s)
  }, [save])

  const nextInvoiceNumber = useCallback((prefix: string, month: number, year: number): string => {
    const counter = parseInt(localStorage.getItem(STORAGE_KEYS.invoiceCounter) ?? '0') + 1
    localStorage.setItem(STORAGE_KEYS.invoiceCounter, String(counter))
    return `${prefix}-${year}${String(month).padStart(2, '0')}-${String(counter).padStart(4, '0')}`
  }, [])

  const resetToDemo = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k))
    initDemo(DEFAULT_SETTINGS)
    setSettings(DEFAULT_SETTINGS)
  }, [initDemo])

  return (
    <ElectricityCtx.Provider value={{
      customers, readings, invoices, settings, isLoaded,
      addCustomer, updateCustomer, removeCustomer,
      upsertReadings, upsertInvoices, updateInvoice,
      updateSettings, nextInvoiceNumber, resetToDemo,
    }}>
      {children}
    </ElectricityCtx.Provider>
  )
}

export function useElectricity() {
  const ctx = useContext(ElectricityCtx)
  if (!ctx) throw new Error('useElectricity must be used within ElectricityProvider')
  return ctx
}
