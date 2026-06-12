import type { ElectricityInvoice, Customer, ElectricitySettings, Apartment, Building } from './electricityTypes'

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

export function generateABAFile(
  invoices: ElectricityInvoice[],
  customers: Customer[],
  settings: ElectricitySettings,
  processDate: Date
): string {
  const ddInvoices = invoices.filter(inv => {
    const customer = customers.find(c => c.id === inv.customerId)
    return customer?.paymentMethod === 'direct_debit' && inv.status === 'sent'
  })

  const dd = String(processDate.getDate()).padStart(2, '0')
  const mm = String(processDate.getMonth() + 1).padStart(2, '0')
  const yy = String(processDate.getFullYear()).slice(-2)
  const dateStr = `${dd}${mm}${yy}`

  const bsbClean = settings.bsb.replace('-', '')
  const traceBsb = settings.bsb // nnn-nnn format

  // Type 0 Header: 120 chars
  // Pos 1: '0'
  // Pos 2-18: 17 blanks
  // Pos 19-21: Financial Institution (3 chars)
  // Pos 22-47: User name (26 chars)
  // Pos 48-53: User ID (6 chars)
  // Pos 54-65: Description (12 chars)
  // Pos 66-71: Date (DDMMYY)
  // Pos 72-75: Time (4 blanks)
  // Pos 76-120: Reserved (45 blanks)
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
  let totalCents = 0
  let creditCents = 0
  let debitCents = 0

  for (const inv of ddInvoices) {
    const customer = customers.find(c => c.id === inv.customerId)
    if (!customer) continue

    const cents = Math.round(inv.total * 100)
    totalCents += cents
    debitCents += cents

    const custBsb = customer.bsb // already nnn-nnn format
    const custAcct = padL(customer.accountNumber, 9)
    const custName = padR(`${customer.firstName} ${customer.lastName}`, 32)
    const lodgRef = padR(inv.invoiceNumber, 18)
    const traceAcct = padL(settings.accountNumber, 9)
    const remitter = padR(settings.companyName.slice(0, 16), 16)

    // Type 1 Detail: 120 chars
    // Pos 1: '1'
    // Pos 2-8: Customer BSB (nnn-nnn)
    // Pos 9-17: Customer account (9 chars right-justified blank fill)
    // Pos 18: Withholding indicator (blank)
    // Pos 19-20: Transaction code (13=debit)
    // Pos 21-30: Amount in cents (10 chars zero filled)
    // Pos 31-62: Account title (32 chars)
    // Pos 63-80: Lodgement reference (18 chars)
    // Pos 81-87: Trace BSB (7 chars)
    // Pos 88-96: Trace account (9 chars)
    // Pos 97-112: Remitter name (16 chars)
    // Pos 113-120: Withholding tax (8 zeros)
    const detail = [
      '1',
      custBsb,
      custAcct,
      ' ',
      '13',
      abaAmount(cents),
      custName,
      lodgRef,
      traceBsb,
      traceAcct,
      remitter,
      '00000000',
    ].join('')

    lines.push(detail)
  }

  // Credit record for net settlement (originating account receives nothing; all debits go to owner account)
  // Add a balancing credit line for the originating bank (net = 0 for pass-through), but actually
  // for a standard DDR, we just have debit records. The net total = debit total.

  // Type 7 File Total: 120 chars
  // Pos 1: '7'
  // Pos 2-8: '999-999'
  // Pos 9-20: 12 blanks
  // Pos 21-30: Net total (10 chars)
  // Pos 31-40: Credit total (10 chars)
  // Pos 41-50: Debit total (10 chars)
  // Pos 51-74: 24 blanks
  // Pos 75-80: Count of type 1 records (6 chars)
  // Pos 81-120: 40 blanks
  const count = ddInvoices.length
  const trailer = [
    '7',
    '999-999',
    padR('', 12),
    abaAmount(totalCents),
    abaAmount(creditCents),
    abaAmount(debitCents),
    padR('', 24),
    padL(String(count), 6, '0'),
    padR('', 40),
  ].join('')

  lines.push(trailer)
  return lines.join('\r\n')
}

// --- MYOB CSV Exports ---

function csvEscape(val: string | number | undefined): string {
  if (val === undefined || val === null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(fields: (string | number | undefined)[]): string {
  return fields.map(csvEscape).join(',')
}

export function generateMYOBCustomerExport(
  customers: Customer[],
  apartments: Apartment[],
  buildings: Building[]
): string {
  const aptMap = new Map(apartments.map(a => [a.id, a]))
  const bldMap = new Map(buildings.map(b => [b.id, b]))

  const headers = [
    'Co./Last Name', 'First Name', 'Card ID', 'Card Type', 'Phone 1', 'Email',
    'Addr 1 - Line 1', 'Addr 1 - City', 'Addr 1 - State', 'Addr 1 - Postcode',
    'Payment Method', 'Bank Name', 'BSB', 'Account Number', 'Account Name',
    'Custom Field 1', 'Custom Field 2',
  ]

  const rows = customers.map(c => {
    const apt = aptMap.get(c.apartmentId)
    const bld = apt ? bldMap.get(apt.buildingId) : undefined
    const addr = bld ? `Unit ${apt?.unitNumber}, ${bld.address}` : ''
    const city = bld?.suburb ?? ''
    const state = bld?.state ?? ''
    const postcode = bld?.postcode ?? ''
    const payMethod = c.paymentMethod === 'direct_debit' ? 'Direct Debit' : c.paymentMethod === 'bpay' ? 'BPAY' : 'EFT'

    return csvRow([
      c.lastName, c.firstName, c.myobCardId, 'Customer',
      c.phone, c.email,
      addr, city, state, postcode,
      payMethod, c.bankName, c.bsb, c.accountNumber, c.accountName,
      apt?.unitNumber ?? '', bld?.name ?? '',
    ])
  })

  return [csvRow(headers), ...rows].join('\n')
}

export function generateMYOBInvoiceExport(
  invoices: ElectricityInvoice[],
  customers: Customer[],
  apartments: Apartment[],
  buildings: Building[]
): string {
  const custMap = new Map(customers.map(c => [c.id, c]))
  const aptMap = new Map(apartments.map(a => [a.id, a]))
  const bldMap = new Map(buildings.map(b => [b.id, b]))

  const headers = [
    'Customer Card ID', 'Invoice Number', 'Invoice Date', 'Due Date',
    'Description', 'Quantity', 'Unit Price', 'Tax Code', 'Amount (excl GST)', 'GST', 'Amount (incl GST)',
    'Journal Memo',
  ]

  const rows = invoices.map(inv => {
    const customer = custMap.get(inv.customerId)
    const apt = aptMap.get(inv.apartmentId)
    const bld = apt ? bldMap.get(apt.buildingId) : undefined
    const desc = `Electricity - Unit ${apt?.unitNumber ?? ''} ${bld?.name ?? ''} - ${monthName(inv.month, inv.year)}`
    const memo = `Electricity billing ${monthName(inv.month, inv.year)}`

    return csvRow([
      customer?.myobCardId ?? '', inv.invoiceNumber,
      formatShortDate(inv.issueDate), formatShortDate(inv.dueDate),
      desc, '1', inv.subtotal.toFixed(2), 'GST',
      inv.subtotal.toFixed(2), inv.gst.toFixed(2), inv.total.toFixed(2),
      memo,
    ])
  })

  return [csvRow(headers), ...rows].join('\n')
}

export function generateMYOBReceiptsExport(
  invoices: ElectricityInvoice[],
  customers: Customer[]
): string {
  const custMap = new Map(customers.map(c => [c.id, c]))
  const paidInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paidDate)

  const headers = [
    'Customer Card ID', 'Receipt Number', 'Receipt Date', 'Payment Method',
    'Amount', 'Memo', 'Invoice Applied To', 'Amount Applied',
  ]

  const rows = paidInvoices.map((inv, idx) => {
    const customer = custMap.get(inv.customerId)
    const receiptNum = `DDR-${String(idx + 1).padStart(4, '0')}`
    const method = customer?.paymentMethod === 'direct_debit' ? 'Direct Debit' : 'Bank Transfer'

    return csvRow([
      customer?.myobCardId ?? '', receiptNum,
      formatShortDate(inv.paidDate!), method,
      inv.total.toFixed(2), `DDR Payment - ${inv.invoiceNumber}`,
      inv.invoiceNumber, inv.total.toFixed(2),
    ])
  })

  return [csvRow(headers), ...rows].join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadABA(invoices: ElectricityInvoice[], customers: Customer[], settings: ElectricitySettings) {
  const content = generateABAFile(invoices, customers, settings, new Date())
  const monthYear = invoices[0] ? `${invoices[0].year}${String(invoices[0].month).padStart(2, '0')}` : 'export'
  downloadFile(content, `electricity_ddr_${monthYear}.aba`, 'text/plain')
}

export function getMonthOptions(): Array<{ month: number; year: number; label: string }> {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) })
  }
  return options
}

export function generateUsageCSVTemplate(apartments: Apartment[], buildings: Building[]): string {
  const bldMap = new Map(buildings.map(b => [b.id, b]))
  const headers = ['Apartment ID', 'Unit Number', 'Building', 'Meter Number', 'Reading Date (YYYY-MM-DD)', 'Previous Reading (kWh)', 'Current Reading (kWh)']
  const rows = apartments.map(apt => {
    const bld = bldMap.get(apt.buildingId)
    return csvRow([apt.id, apt.unitNumber, bld?.name ?? '', apt.meterNumber, '', '', ''])
  })
  return [csvRow(headers), ...rows].join('\n')
}
