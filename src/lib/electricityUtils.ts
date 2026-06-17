import type { ElectricityInvoice, Customer, ElectricitySettings, Apartment, Building, MeterReading, Tariff } from './electricityTypes'

export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function monthName(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

export function shortMonthLabel(month: number, year: number): string {
  const m = new Date(year, month - 1, 1).toLocaleDateString('en-AU', { month: 'short' })
  return `${m} '${String(year).slice(-2)}`
}

export function getUsageHistory(
  apartmentId: string,
  readings: MeterReading[],
  currentMonth: number,
  currentYear: number,
  months = 12,
): Array<{ month: number; year: number; usage: number | null; label: string }> {
  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    const reading = readings.find(r => r.apartmentId === apartmentId && r.month === m && r.year === y)
    result.push({ month: m, year: y, usage: reading?.usage ?? null, label: shortMonthLabel(m, y) })
  }
  return result
}

export function usageColor(usage: number | null, low: number, high: number): string {
  if (usage === null) return '#e2e8f0'
  if (usage < low) return '#10b981'
  if (usage > high) return '#f59e0b'
  return '#4f46e5'
}

export function calculateProRataBill(
  moveOutDate: string,
  billingPeriodStart: string,
  previousReading: number,
  finalReading: number,
  tariff: Tariff,
): { usage: number; usageCharge: number; supplyCharge: number; subtotal: number; gst: number; total: number; daysInPeriod: number } {
  const moveDay = parseInt(moveOutDate.split('-')[2])
  const startDay = parseInt(billingPeriodStart.split('-')[2])
  const daysInPeriod = moveDay - startDay + 1

  const usage = Math.max(0, finalReading - previousReading)
  const usageCharge = Math.round(usage * tariff.ratePerKwh * 100) / 100
  const supplyCharge = Math.round(daysInPeriod * tariff.dailySupplyCharge * 100) / 100
  const subtotal = Math.round((usageCharge + supplyCharge) * 100) / 100
  const gst = Math.round(subtotal * tariff.gstRate * 100) / 100
  const total = subtotal + gst

  return { usage, usageCharge, supplyCharge, subtotal, gst, total, daysInPeriod }
}

// --- ABA File Generation ---

function padL(str: string, len: number, char = ' '): string {
  return str.padStart(len, char).slice(-len)
}
function padR(str: string, len: number): string {
  return str.padEnd(len, ' ').slice(0, len)
}
function abaAmount(cents: number): string {
  return String(Math.round(Math.abs(cents))).padStart(10, '0')
}

export interface ABATransaction {
  invoiceId: string
  customerId: string
  invoiceNumber: string
  customerName: string
  bsb: string
  accountNumber: string
  accountName: string
  amount: number
}

/** Generate ABA file from an explicit list of transactions (caller controls selection and amounts). */
export function generateABAFileFromTransactions(
  transactions: ABATransaction[],
  settings: ElectricitySettings,
  processDate: Date,
): string {
  const dd = String(processDate.getDate()).padStart(2, '0')
  const mm = String(processDate.getMonth() + 1).padStart(2, '0')
  const yy = String(processDate.getFullYear()).slice(-2)
  const dateStr = `${dd}${mm}${yy}`
  const traceBsb = settings.bsb

  const header = [
    '0',
    padR('', 17),
    padR(settings.institutionCode, 3),
    padR(settings.accountName.slice(0, 26), 26),
    padL(settings.apcsUserId, 6, '0'),
    padR('ELECTRICITY', 12),
    dateStr,
    '    ',
    padR('', 45),
  ].join('')

  const lines = [header]
  let totalCents = 0, debitCents = 0

  for (const tx of transactions) {
    const cents = Math.round(tx.amount * 100)
    totalCents += cents
    debitCents += cents
    const detail = [
      '1',
      tx.bsb,
      padL(tx.accountNumber, 9),
      ' ',
      '13',
      abaAmount(cents),
      padR(tx.customerName, 32),
      padR(tx.invoiceNumber, 18),
      traceBsb,
      padL(settings.accountNumber, 9),
      padR(settings.companyName.slice(0, 16), 16),
      '00000000',
    ].join('')
    lines.push(detail)
  }

  const trailer = [
    '7',
    '999-999',
    padR('', 12),
    abaAmount(totalCents),
    abaAmount(0),
    abaAmount(debitCents),
    padR('', 24),
    padL(String(transactions.length), 6, '0'),
    padR('', 40),
  ].join('')
  lines.push(trailer)

  return lines.join('\r\n')
}

/** Legacy wrapper — kept for any existing callers. */
export function generateABAFile(
  invoices: ElectricityInvoice[],
  customers: Customer[],
  settings: ElectricitySettings,
  processDate: Date,
): string {
  const transactions: ABATransaction[] = invoices
    .filter(inv => {
      const c = customers.find(c => c.id === inv.customerId)
      return c?.paymentMethod === 'direct_debit' && inv.status === 'sent'
    })
    .flatMap(inv => {
      const c = customers.find(c => c.id === inv.customerId)
      if (!c) return []
      return [{ invoiceId: inv.id, customerId: c.id, invoiceNumber: inv.invoiceNumber, customerName: `${c.firstName} ${c.lastName}`, bsb: c.bsb, accountNumber: c.accountNumber, accountName: c.accountName, amount: inv.total }]
    })
  return generateABAFileFromTransactions(transactions, settings, processDate)
}

/** Generate MYOB Receive Payments CSV for a set of ABA transactions (use ABA process date as receipt date). */
export function generateMYOBDDRReceipts(
  transactions: ABATransaction[],
  customers: Customer[],
  processDate: Date,
): string {
  const custMap = new Map(customers.map(c => [c.id, c]))
  const receiptDate = formatShortDate(processDate.toISOString().split('T')[0])
  const headers = ['Customer Card ID','Receipt Number','Receipt Date','Payment Method','Amount','Memo','Invoice Applied To','Amount Applied']
  const rows = transactions.map((tx, idx) => {
    const cust = custMap.get(tx.customerId)
    return csvRow([
      cust?.myobCardId ?? tx.customerId,
      `DDR-${String(idx + 1).padStart(4, '0')}`,
      receiptDate,
      'Direct Debit',
      tx.amount.toFixed(2),
      `DDR Payment - ${tx.invoiceNumber}`,
      tx.invoiceNumber,
      tx.amount.toFixed(2),
    ])
  })
  return [csvRow(headers), ...rows].join('\n')
}

// --- MYOB CSV Exports ---

function csvEscape(val: string | number | undefined): string {
  if (val === undefined || val === null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`
  return str
}
function csvRow(fields: (string | number | undefined)[]): string {
  return fields.map(csvEscape).join(',')
}

export function generateMYOBCustomerExport(customers: Customer[], apartments: Apartment[], buildings: Building[]): string {
  const aptMap = new Map(apartments.map(a => [a.id, a]))
  const bldMap = new Map(buildings.map(b => [b.id, b]))
  const headers = ['Co./Last Name','First Name','Card ID','Card Type','Phone 1','Email','Addr 1 - Line 1','Addr 1 - City','Addr 1 - State','Addr 1 - Postcode','Payment Method','Bank Name','BSB','Account Number','Account Name','Custom Field 1','Custom Field 2']
  const rows = customers.map(c => {
    const apt = aptMap.get(c.apartmentId)
    const bld = apt ? bldMap.get(apt.buildingId) : undefined
    return csvRow([
      c.lastName, c.firstName, c.myobCardId, 'Customer',
      c.phone, c.email,
      bld ? `Unit ${apt?.unitNumber}, ${bld.address}` : '', bld?.suburb ?? '', bld?.state ?? '', bld?.postcode ?? '',
      c.paymentMethod === 'direct_debit' ? 'Direct Debit' : c.paymentMethod === 'bpay' ? 'BPAY' : 'EFT',
      c.bankName, c.bsb, c.accountNumber, c.accountName,
      apt?.unitNumber ?? '', bld?.name ?? '',
    ])
  })
  return [csvRow(headers), ...rows].join('\n')
}

export function generateMYOBInvoiceExport(invoices: ElectricityInvoice[], customers: Customer[], apartments: Apartment[], buildings: Building[]): string {
  const custMap = new Map(customers.map(c => [c.id, c]))
  const aptMap  = new Map(apartments.map(a => [a.id, a]))
  const bldMap  = new Map(buildings.map(b => [b.id, b]))
  const headers = ['Customer Card ID','Invoice Number','Invoice Date','Due Date','Description','Quantity','Unit Price','Tax Code','Amount (excl GST)','GST','Amount (incl GST)','Journal Memo']
  const rows = invoices.map(inv => {
    const cust = custMap.get(inv.customerId)
    const apt  = aptMap.get(inv.apartmentId)
    const bld  = apt ? bldMap.get(apt.buildingId) : undefined
    return csvRow([
      cust?.myobCardId ?? '', inv.invoiceNumber,
      formatShortDate(inv.issueDate), formatShortDate(inv.dueDate),
      `Electricity - Unit ${apt?.unitNumber ?? ''} ${bld?.name ?? ''} - ${monthName(inv.month, inv.year)}`,
      '1', inv.subtotal.toFixed(2), 'GST',
      inv.subtotal.toFixed(2), inv.gst.toFixed(2), inv.total.toFixed(2),
      `Electricity billing ${monthName(inv.month, inv.year)}`,
    ])
  })
  return [csvRow(headers), ...rows].join('\n')
}

export function generateMYOBReceiptsExport(invoices: ElectricityInvoice[], customers: Customer[]): string {
  const custMap = new Map(customers.map(c => [c.id, c]))
  const paidInvoices = invoices.filter(i => i.status === 'paid' && i.paidDate)
  const headers = ['Customer Card ID','Receipt Number','Receipt Date','Payment Method','Amount','Memo','Invoice Applied To','Amount Applied']
  const rows = paidInvoices.map((inv, idx) => {
    const cust = custMap.get(inv.customerId)
    return csvRow([
      cust?.myobCardId ?? '',
      `DDR-${String(idx + 1).padStart(4, '0')}`,
      formatShortDate(inv.paidDate!),
      cust?.paymentMethod === 'direct_debit' ? 'Direct Debit' : 'Bank Transfer',
      inv.total.toFixed(2),
      `DDR Payment - ${inv.invoiceNumber}`,
      inv.invoiceNumber, inv.total.toFixed(2),
    ])
  })
  return [csvRow(headers), ...rows].join('\n')
}

export interface UsageAnomaly {
  invoiceId: string
  apartmentId: string
  customerId: string
  issue: 'spike' | 'drop' | 'zero'
  currentUsage: number
  avgUsage: number
  pctDiff: number
}

export function detectUsageAnomalies(
  invoices: ElectricityInvoice[],
  readings: MeterReading[],
  month: number,
  year: number,
  spikeThresholdPct = 50,
  dropThresholdPct  = 50,
  minAvgForDrop     = 50,
): UsageAnomaly[] {
  const anomalies: UsageAnomaly[] = []
  for (const inv of invoices) {
    if (inv.isAdjustment || inv.status === 'cancelled') continue
    const history = readings
      .filter(r => r.apartmentId === inv.apartmentId && !(r.month === month && r.year === year))
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
      .slice(0, 11)
    if (history.length < 2) continue
    const avgUsage = Math.round(history.reduce((s, r) => s + r.usage, 0) / history.length)
    if (avgUsage === 0) continue
    const current = inv.usage
    const pctDiff  = Math.round(((current - avgUsage) / avgUsage) * 100)
    if (current === 0 && avgUsage >= minAvgForDrop) {
      anomalies.push({ invoiceId: inv.id, apartmentId: inv.apartmentId, customerId: inv.customerId, issue: 'zero', currentUsage: current, avgUsage, pctDiff: -100 })
    } else if (pctDiff >= spikeThresholdPct) {
      anomalies.push({ invoiceId: inv.id, apartmentId: inv.apartmentId, customerId: inv.customerId, issue: 'spike', currentUsage: current, avgUsage, pctDiff })
    } else if (pctDiff <= -dropThresholdPct && avgUsage >= minAvgForDrop) {
      anomalies.push({ invoiceId: inv.id, apartmentId: inv.apartmentId, customerId: inv.customerId, issue: 'drop', currentUsage: current, avgUsage, pctDiff })
    }
  }
  return anomalies.sort((a, b) => Math.abs(b.pctDiff) - Math.abs(a.pctDiff))
}

// ── Customer ledger / balance ─────────────────────────────────────────────────

export interface LedgerEntry {
  date: string
  type: 'invoice' | 'payment' | 'credit' | 'adjustment'
  description: string
  invoiceNumber: string
  invoiceId: string
  debit: number
  credit: number
  balance: number
}

export interface CustomerBalance {
  customerId: string
  totalBilled: number
  totalPaid: number
  totalOutstanding: number
  totalCredits: number
  balance: number
  current: number
  days30: number
  days60: number
  days90plus: number
}

export function getCustomerBalance(
  invoices: ElectricityInvoice[],
  customerId: string,
  asOfDate?: string,
): CustomerBalance {
  const today = asOfDate ?? new Date().toISOString().split('T')[0]
  const custInvs = invoices.filter(i => i.customerId === customerId && i.status !== 'cancelled')
  let totalBilled = 0, totalPaid = 0, totalOutstanding = 0, totalCredits = 0
  let current = 0, days30 = 0, days60 = 0, days90plus = 0
  for (const inv of custInvs) {
    if (inv.isAdjustment && inv.adjustmentType === 'credit' && inv.total < 0) {
      totalCredits += Math.abs(inv.total)
    } else {
      if (inv.status !== 'cancelled') totalBilled += inv.total
      if (inv.status === 'paid') totalPaid += inv.total
      if (inv.status === 'sent' || inv.status === 'overdue') {
        totalOutstanding += inv.total
        const msOverdue = new Date(today).getTime() - new Date(inv.dueDate + 'T00:00:00').getTime()
        const daysOverdue = Math.floor(msOverdue / 86400000)
        if (daysOverdue <= 0) current += inv.total
        else if (daysOverdue <= 30) days30 += inv.total
        else if (daysOverdue <= 60) days60 += inv.total
        else days90plus += inv.total
      }
    }
  }
  return {
    customerId, totalBilled, totalPaid, totalOutstanding, totalCredits,
    balance: totalOutstanding - totalCredits,
    current, days30, days60, days90plus,
  }
}

export function buildCustomerLedger(invoices: ElectricityInvoice[], customerId: string): LedgerEntry[] {
  const custInvs = invoices
    .filter(i => i.customerId === customerId && i.status !== 'cancelled')
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate))

  type RawEntry = { date: string; order: number } & Omit<LedgerEntry, 'balance'>
  const raw: RawEntry[] = []

  for (const inv of custInvs) {
    const isCredit = inv.isAdjustment && inv.adjustmentType === 'credit' && inv.total < 0
    if (isCredit) {
      raw.push({
        date: inv.issueDate, order: 0,
        type: 'credit',
        description: inv.adjustmentReason ? `Credit Note — ${inv.adjustmentReason}` : 'Credit Note',
        invoiceNumber: inv.invoiceNumber, invoiceId: inv.id,
        debit: 0, credit: Math.abs(inv.total),
      })
    } else {
      const monthLabel = new Date(inv.billingPeriodStart + 'T00:00:00').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
      raw.push({
        date: inv.issueDate, order: 0,
        type: inv.isAdjustment ? 'adjustment' : 'invoice',
        description: inv.isAdjustment
          ? `Debit Adjustment${inv.adjustmentReason ? ' — ' + inv.adjustmentReason : ''}`
          : inv.isFinalBill ? `Final Bill — ${monthLabel}` : `Invoice — ${monthLabel}`,
        invoiceNumber: inv.invoiceNumber, invoiceId: inv.id,
        debit: inv.total, credit: 0,
      })
      if (inv.status === 'paid' && inv.paidDate) {
        raw.push({
          date: inv.paidDate, order: 1,
          type: 'payment',
          description: `Payment received`,
          invoiceNumber: inv.invoiceNumber, invoiceId: inv.id,
          debit: 0, credit: inv.paidAmount ?? inv.total,
        })
      }
    }
  }

  raw.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)

  let bal = 0
  return raw.map(({ order: _order, ...e }) => {
    bal += e.debit - e.credit
    return { ...e, balance: bal }
  })
}

export function downloadFile(content: string | Blob, filename: string, mimeType = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Ezidebit helpers ──────────────────────────────────────────────────────────

function ezDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function cleanBSB(bsb: string): string {
  return bsb.replace(/[^0-9]/g, '').slice(0, 6)
}

/**
 * Ezidebit Payment Batch CSV
 * Upload to Ezidebit portal → Payments → Upload Payment File
 * One row per DDR invoice for the selected month/status filter.
 */
export function generateEzidebitPaymentBatch(
  invoices: ElectricityInvoice[],
  customers: Customer[],
  processDate: string,           // YYYY-MM-DD
  statuses: string[] = ['sent', 'overdue'],
): string {
  const custMap = new Map(customers.map(c => [c.id, c]))
  const headers = [
    'YourSystemReference',
    'LastName',
    'FirstName',
    'Email',
    'BankAccountName',
    'BankBSBNumber',
    'BankAccountNumber',
    'DebitDate',
    'PaymentAmountInCents',
    'YourPaymentReference',
    'PaymentDescription',
  ]
  const rows: string[] = []
  for (const inv of invoices) {
    if (!statuses.includes(inv.status)) continue
    const cust = custMap.get(inv.customerId)
    if (!cust || (cust.paymentMethod !== 'direct_debit' && cust.paymentMethod !== 'ezidebit')) continue
    rows.push(csvRow([
      cust.id,
      cust.lastName,
      cust.firstName,
      cust.email,
      cust.accountName,
      cleanBSB(cust.bsb),
      cust.accountNumber,
      ezDate(processDate),
      Math.round(inv.total * 100),
      inv.invoiceNumber,
      `Electricity ${inv.month}/${inv.year}`,
    ]))
  }
  return [csvRow(headers), ...rows].join('\n')
}

/**
 * Ezidebit Customer Registration CSV
 * Upload to Ezidebit portal → Customers → Import Customers
 * Registers customers in Ezidebit without a fixed recurring amount
 * (amounts vary each month, so payment batches are uploaded separately).
 */
export function generateEzidebitCustomerRegistration(
  customers: Customer[],
  apartments: Apartment[],
  buildings: Building[],
): string {
  const aptMap = new Map(apartments.map(a => [a.id, a]))
  const bldMap = new Map(buildings.map(b => [b.id, b]))
  const today  = new Date().toISOString().split('T')[0]
  const headers = [
    'YourSystemReference',
    'LastName',
    'FirstName',
    'EmailAddress',
    'MobilePhoneNumber',
    'AddressLine1',
    'SuburbName',
    'State',
    'PostCode',
    'BankAccountName',
    'BankBSBNumber',
    'BankAccountNumber',
    'BillingCycleCode',    // M = monthly ad-hoc (amount supplied per batch)
    'PaymentAmountInCents', // 0 = variable (amount set per payment batch)
    'FirstScheduledPaymentDate',
    'YourGeneralReference',
  ]
  const ddrCustomers = customers.filter(c => (c.paymentMethod === 'direct_debit' || c.paymentMethod === 'ezidebit') && !c.moveOutDate)
  const rows = ddrCustomers.map(c => {
    const apt = aptMap.get(c.apartmentId)
    const bld = apt ? bldMap.get(apt.buildingId) : undefined
    const address = [bld?.address, bld?.suburb].filter(Boolean).join(', ')
    return csvRow([
      c.id,
      c.lastName,
      c.firstName,
      c.email,
      c.phone,
      address || (bld?.name ?? ''),
      bld?.suburb ?? '',
      bld?.state ?? 'NSW',
      bld?.postcode ?? '',
      c.accountName,
      cleanBSB(c.bsb),
      c.accountNumber,
      'M',
      0,
      ezDate(today),
      `Unit ${apt?.unitNumber ?? ''} ${bld?.name ?? ''}`.trim(),
    ])
  })
  return [csvRow(headers), ...rows].join('\n')
}

export function generateUsageCSVTemplate(apartments: Apartment[], buildings: Building[], readings: MeterReading[] = []): string {
  const bldMap = new Map(buildings.map(b => [b.id, b]))
  const headers = ['Apartment ID','Unit Number','Building','Meter Number','Reading Date (YYYY-MM-DD)','Previous Reading (kWh)','Current Reading (kWh)']
  const rows = apartments.map(apt => {
    const bld = bldMap.get(apt.buildingId)
    // Find the most recent stored reading for this apartment to pre-fill Previous Reading
    const lastReading = readings
      .filter(r => r.apartmentId === apt.id)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0]
    return csvRow([apt.id, apt.unitNumber, bld?.name ?? '', apt.meterNumber, '', lastReading?.currentReading ?? '', ''])
  })
  return [csvRow(headers), ...rows].join('\n')
}
