export interface Building {
  id: string
  name: string
  address: string
  suburb: string
  state: string
  postcode: string
  totalUnits: number
  lowUsageThreshold: number   // kWh/month – below = low (green)
  highUsageThreshold: number  // kWh/month – above = high (amber)
  notes?: string
}

export interface Apartment {
  id: string
  buildingId: string
  unitNumber: string
  floor: number
  meterNumber: string
}

export type PaymentMethod = 'direct_debit' | 'bpay' | 'eft' | 'ezidebit'

export interface Customer {
  id: string
  apartmentId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  moveInDate: string
  moveOutDate?: string
  vacateRequestDate?: string   // set when tenant notifies intent to vacate (before final bill is processed)
  bankName: string
  bsb: string
  accountNumber: string
  accountName: string
  myobCardId: string
  paymentMethod: PaymentMethod
  ezidebitCustomerId?: string   // assigned by Ezidebit after tenant completes DDR registration
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
  isFinalBill?: boolean
  paidDate?: string
  paidAmount?: number
  paymentReference?: string
  notes?: string
}

export interface DebtorComm {
  id: string
  invoiceId: string
  customerId: string
  date: string
  type: 'reminder_1' | 'reminder_2' | 'final_notice' | 'note' | 'call' | 'dispute_raised' | 'dispute_resolved' | 'plan_created' | 'payment_received' | 'sent_to_recovery'
  notes?: string
}

export type DebtorStatusType = 'active' | 'disputed' | 'payment_plan' | 'hardship' | 'recovery' | 'written_off'

export interface DebtorStatus {
  invoiceId: string
  status: DebtorStatusType
  updatedAt: string
  notes?: string
}

export interface PaymentPlan {
  id: string
  invoiceId: string
  customerId: string
  totalAmount: number
  instalmentAmount: number
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  startDate: string
  notes: string
  status: 'active' | 'completed' | 'broken'
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
  senderEmail: string
  tariff: Tariff
  // MYOB API integration
  myobClientId: string
  myobClientSecret: string
  myobAccessToken: string
  myobRefreshToken: string
  myobTokenExpiry: string        // ISO timestamp
  myobCompanyFileUrl: string     // e.g. https://api.myob.com/accountright/{uid}
  myobCompanyFileName: string
  myobIncomeAccountCode: string  // DisplayID of the income account, e.g. "4-1000"
  myobLastSyncCustomers: string  // ISO timestamp
  myobLastSyncInvoices: string   // ISO timestamp
  // Ezidebit integration
  ezidebitDigitalKey: string     // public/digital key from Ezidebit portal — used to build hosted DDR form URLs
}
