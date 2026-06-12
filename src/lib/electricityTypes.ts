export interface Building {
  id: string
  name: string
  address: string
  suburb: string
  state: string
  postcode: string
  totalUnits: number
}

export interface Apartment {
  id: string
  buildingId: string
  unitNumber: string
  floor: number
  meterNumber: string
}

export type PaymentMethod = 'direct_debit' | 'bpay' | 'eft'

export interface Customer {
  id: string
  apartmentId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  moveInDate: string
  moveOutDate?: string
  bankName: string
  bsb: string
  accountNumber: string
  accountName: string
  myobCardId: string
  paymentMethod: PaymentMethod
}

export interface MeterReading {
  id: string
  apartmentId: string
  month: number
  year: number
  previousReading: number
  currentReading: number
  usage: number
  readingDate: string
  notes?: string
}

export interface Tariff {
  ratePerKwh: number
  dailySupplyCharge: number
  gstRate: number
}

export interface ElectricityInvoice {
  id: string
  invoiceNumber: string
  customerId: string
  apartmentId: string
  buildingId: string
  month: number
  year: number
  issueDate: string
  dueDate: string
  billingPeriodStart: string
  billingPeriodEnd: string
  daysInPeriod: number
  previousReading: number
  currentReading: number
  usage: number
  ratePerKwh: number
  usageCharge: number
  supplyCharge: number
  subtotal: number
  gst: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  paidDate?: string
  paidAmount?: number
  paymentReference?: string
  notes?: string
}

export interface ElectricitySettings {
  companyName: string
  abn: string
  address: string
  suburb: string
  state: string
  postcode: string
  phone: string
  email: string
  website: string
  bankName: string
  bsb: string
  accountNumber: string
  accountName: string
  apcsUserId: string
  institutionCode: string
  invoicePrefix: string
  paymentTermsDays: number
  bpayBillerCode: string
  tariff: Tariff
}
