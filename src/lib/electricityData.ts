import type { Building, Apartment, Customer, MeterReading, ElectricityInvoice, ElectricitySettings } from './electricityTypes'

export const BUILDINGS: Building[] = [
  { id: 'b1', name: 'The Meridian', address: '15 Collins Street', suburb: 'Melbourne', state: 'VIC', postcode: '3000', totalUnits: 90 },
  { id: 'b2', name: 'The Vertex', address: '28 Spencer Street', suburb: 'Melbourne', state: 'VIC', postcode: '3000', totalUnits: 90 },
  { id: 'b3', name: 'The Apex', address: '45 Docklands Drive', suburb: 'Docklands', state: 'VIC', postcode: '3008', totalUnits: 85 },
  { id: 'b4', name: 'The Summit', address: '180 City Road', suburb: 'Southbank', state: 'VIC', postcode: '3006', totalUnits: 80 },
  { id: 'b5', name: 'The Pinnacle', address: '12 Kavanagh Street', suburb: 'Southbank', state: 'VIC', postcode: '3006', totalUnits: 85 },
  { id: 'b6', name: 'The Crest', address: '77 Queens Road', suburb: 'Melbourne', state: 'VIC', postcode: '3004', totalUnits: 85 },
  { id: 'b7', name: 'The Heights', address: '33 Power Street', suburb: 'Hawthorn', state: 'VIC', postcode: '3122', totalUnits: 85 },
]

function buildingFloorUnits(buildingId: string): { floors: number; unitsPerFloor: number; extraUnits: number } {
  const configs: Record<string, { floors: number; unitsPerFloor: number; extraUnits: number }> = {
    b1: { floors: 9, unitsPerFloor: 10, extraUnits: 0 },
    b2: { floors: 9, unitsPerFloor: 10, extraUnits: 0 },
    b3: { floors: 8, unitsPerFloor: 10, extraUnits: 5 },
    b4: { floors: 8, unitsPerFloor: 10, extraUnits: 0 },
    b5: { floors: 8, unitsPerFloor: 10, extraUnits: 5 },
    b6: { floors: 8, unitsPerFloor: 10, extraUnits: 5 },
    b7: { floors: 8, unitsPerFloor: 10, extraUnits: 5 },
  }
  return configs[buildingId] ?? { floors: 8, unitsPerFloor: 10, extraUnits: 0 }
}

export function generateApartments(): Apartment[] {
  const apartments: Apartment[] = []
  for (const building of BUILDINGS) {
    const { floors, unitsPerFloor, extraUnits } = buildingFloorUnits(building.id)
    for (let floor = 1; floor <= floors; floor++) {
      for (let unit = 1; unit <= unitsPerFloor; unit++) {
        const unitNum = `${floor}${String(unit).padStart(2, '0')}`
        apartments.push({
          id: `${building.id}-u${unitNum}`,
          buildingId: building.id,
          unitNumber: unitNum,
          floor,
          meterNumber: `${building.id.toUpperCase()}M${unitNum}`,
        })
      }
    }
    if (extraUnits > 0) {
      const topFloor = floors + 1
      for (let unit = 1; unit <= extraUnits; unit++) {
        const unitNum = `${topFloor}${String(unit).padStart(2, '0')}`
        apartments.push({
          id: `${building.id}-u${unitNum}`,
          buildingId: building.id,
          unitNumber: unitNum,
          floor: topFloor,
          meterNumber: `${building.id.toUpperCase()}M${unitNum}`,
        })
      }
    }
  }
  return apartments
}

export const APARTMENTS = generateApartments()

const FIRST_NAMES = [
  'James', 'Oliver', 'William', 'Noah', 'Jack', 'Lucas', 'Henry', 'Ethan', 'Liam', 'Alexander',
  'Emma', 'Charlotte', 'Mia', 'Olivia', 'Amelia', 'Sophia', 'Isabella', 'Chloe', 'Lily', 'Grace',
  'Emily', 'Sophie', 'Hannah', 'Zoe', 'Lucy', 'Sarah', 'Jessica', 'Ruby', 'Ella', 'Ava',
  'Thomas', 'Joshua', 'Samuel', 'Benjamin', 'Daniel', 'Ryan', 'Matthew', 'Jake', 'Michael', 'Nathan',
  'Wei', 'Mei', 'Anh', 'Priya', 'Raj', 'Isha', 'Ahmed', 'Fatima', 'Omar', 'Laila',
]

const LAST_NAMES = [
  'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Thompson',
  'White', 'Walker', 'Hall', 'Martin', 'Lewis', 'Young', 'Hughes', 'Harris', 'Clarke', 'Lee',
  'Mitchell', 'Scott', 'Baker', 'Carter', 'Nelson', 'Turner', 'Hill', 'Allen', 'Phillips', 'Cook',
  'Chen', 'Wang', 'Nguyen', 'Patel', 'Kim', 'Singh', 'Kumar', 'Ahmed', 'Hassan', 'Khan',
  'Anderson', 'Jackson', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Moore', 'Taylor',
]

const BANKS = [
  { name: 'Commonwealth Bank', bsb: '062-000' },
  { name: 'Commonwealth Bank', bsb: '062-121' },
  { name: 'NAB', bsb: '083-004' },
  { name: 'NAB', bsb: '083-170' },
  { name: 'Westpac', bsb: '032-000' },
  { name: 'Westpac', bsb: '032-001' },
  { name: 'ANZ', bsb: '013-001' },
  { name: 'ANZ', bsb: '013-003' },
  { name: 'St George', bsb: '112-032' },
  { name: 'Bendigo Bank', bsb: '633-000' },
]

const PAYMENT_METHODS: Array<'direct_debit' | 'bpay' | 'eft'> = ['direct_debit', 'direct_debit', 'direct_debit', 'bpay', 'eft']

function seeded(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seeded(seed) * (max - min + 1)) + min
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seeded(seed) * arr.length)]
}

export function generateDemoCustomers(apartments: Apartment[]): Customer[] {
  const customers: Customer[] = []
  apartments.forEach((apt, idx) => {
    if (seeded(idx * 7 + 3) < 0.9) {
      const s = idx * 31
      const firstName = pick(FIRST_NAMES, s)
      const lastName = pick(LAST_NAMES, s + 1)
      const bank = pick(BANKS, s + 2)
      const paymentMethod = pick(PAYMENT_METHODS, s + 4)
      const accNum = String(seededInt(s + 5, 10000000, 99999999))
      const myobId = `CUST${String(idx + 1).padStart(4, '0')}`
      customers.push({
        id: `cust-${apt.id}`,
        apartmentId: apt.id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${seededInt(s + 6, 1, 99)}@email.com`,
        phone: `04${seededInt(s + 7, 10, 99)} ${seededInt(s + 8, 100, 999)} ${seededInt(s + 9, 100, 999)}`,
        moveInDate: `202${seededInt(s + 10, 2, 5)}-${String(seededInt(s + 11, 1, 12)).padStart(2, '0')}-01`,
        bankName: bank.name,
        bsb: bank.bsb,
        accountNumber: accNum,
        accountName: `${firstName} ${lastName}`,
        myobCardId: myobId,
        paymentMethod,
      })
    }
  })
  return customers
}

export function generateDemoReadings(apartments: Apartment[], month: number, year: number): MeterReading[] {
  const readings: MeterReading[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  const readingDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

  apartments.forEach((apt, idx) => {
    const s = idx * 17 + month * 3
    const baseReading = seededInt(s, 8000, 25000)
    const prevUsage = seededInt(s + 1, 180, 420)
    const currUsage = seededInt(s + 2, 170, 430)
    const previousReading = baseReading
    const currentReading = baseReading + currUsage

    readings.push({
      id: `reading-${apt.id}-${year}${String(month).padStart(2, '0')}`,
      apartmentId: apt.id,
      month,
      year,
      previousReading,
      currentReading,
      usage: currUsage,
      readingDate,
    })

    // Previous month's reading (for context)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    readings.push({
      id: `reading-${apt.id}-${prevYear}${String(prevMonth).padStart(2, '0')}`,
      apartmentId: apt.id,
      month: prevMonth,
      year: prevYear,
      previousReading: baseReading - prevUsage,
      currentReading: baseReading,
      usage: prevUsage,
      readingDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${new Date(prevYear, prevMonth, 0).getDate()}`,
    })
  })
  return readings
}

export function generateDemoInvoices(
  apartments: Apartment[],
  customers: Customer[],
  readings: MeterReading[],
  month: number,
  year: number,
  settings: ElectricitySettings
): ElectricityInvoice[] {
  const invoices: ElectricityInvoice[] = []
  const customerMap = new Map(customers.map(c => [c.apartmentId, c]))
  const readingMap = new Map(
    readings
      .filter(r => r.month === month && r.year === year)
      .map(r => [r.apartmentId, r])
  )
  const daysInMonth = new Date(year, month, 0).getDate()
  const issueDate = `${year}-${String(month).padStart(2, '0')}-01`
  const dueDateObj = new Date(year, month - 1, 1 + settings.paymentTermsDays)
  const dueDate = dueDateObj.toISOString().split('T')[0]
  const billingStart = `${year}-${String(month).padStart(2, '0')}-01`
  const billingEnd = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

  const statuses: Array<'paid' | 'sent' | 'overdue'> = ['paid', 'paid', 'paid', 'sent', 'overdue']
  let invoiceNum = 1

  apartments.forEach((apt, idx) => {
    const customer = customerMap.get(apt.id)
    const reading = readingMap.get(apt.id)
    if (!customer || !reading) return

    const { ratePerKwh, dailySupplyCharge, gstRate } = settings.tariff
    const usageCharge = Math.round(reading.usage * ratePerKwh * 100) / 100
    const supplyCharge = Math.round(daysInMonth * dailySupplyCharge * 100) / 100
    const subtotal = Math.round((usageCharge + supplyCharge) * 100) / 100
    const gst = Math.round(subtotal * gstRate * 100) / 100
    const total = Math.round((subtotal + gst) * 100) / 100

    const s = idx * 13 + month
    const status = idx < 400 ? pick(statuses, s) : 'draft'
    const invoiceNumber = `${settings.invoicePrefix}-${year}${String(month).padStart(2, '0')}-${String(invoiceNum++).padStart(4, '0')}`

    invoices.push({
      id: `inv-${apt.id}-${year}${String(month).padStart(2, '0')}`,
      invoiceNumber,
      customerId: customer.id,
      apartmentId: apt.id,
      buildingId: apt.buildingId,
      month,
      year,
      issueDate,
      dueDate,
      billingPeriodStart: billingStart,
      billingPeriodEnd: billingEnd,
      daysInPeriod: daysInMonth,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      usage: reading.usage,
      ratePerKwh,
      usageCharge,
      supplyCharge,
      subtotal,
      gst,
      total,
      status,
      paidDate: status === 'paid' ? dueDate : undefined,
      paidAmount: status === 'paid' ? total : undefined,
    })
  })
  return invoices
}

export const DEFAULT_SETTINGS: ElectricitySettings = {
  companyName: 'Meridian Property Group',
  abn: '12 345 678 901',
  address: '1 Collins Street',
  suburb: 'Melbourne',
  state: 'VIC',
  postcode: '3000',
  phone: '(03) 9000 0000',
  email: 'electricity@meridianproperty.com.au',
  website: 'www.meridianproperty.com.au',
  bankName: 'Commonwealth Bank',
  bsb: '062-000',
  accountNumber: '123456789',
  accountName: 'Meridian Property Group',
  apcsUserId: '123456',
  institutionCode: 'CBA',
  invoicePrefix: 'EL',
  paymentTermsDays: 21,
  bpayBillerCode: '123456',
  tariff: {
    ratePerKwh: 0.3276,
    dailySupplyCharge: 1.1524,
    gstRate: 0.10,
  },
}
