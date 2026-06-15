import type { Building, Apartment, Customer, MeterReading, ElectricityInvoice, ElectricitySettings } from './electricityTypes'

export const BUILDINGS: Building[] = [
  { id: 'b1', name: 'The Meridian',  address: '15 Collins Street',   suburb: 'Melbourne', state: 'VIC', postcode: '3000', totalUnits: 90, lowUsageThreshold: 180, highUsageThreshold: 380 },
  { id: 'b2', name: 'The Vertex',    address: '28 Spencer Street',   suburb: 'Melbourne', state: 'VIC', postcode: '3000', totalUnits: 90, lowUsageThreshold: 180, highUsageThreshold: 380 },
  { id: 'b3', name: 'The Apex',      address: '45 Docklands Drive',  suburb: 'Docklands', state: 'VIC', postcode: '3008', totalUnits: 85, lowUsageThreshold: 170, highUsageThreshold: 360 },
  { id: 'b4', name: 'The Summit',    address: '180 City Road',       suburb: 'Southbank', state: 'VIC', postcode: '3006', totalUnits: 80, lowUsageThreshold: 200, highUsageThreshold: 400 },
  { id: 'b5', name: 'The Pinnacle',  address: '12 Kavanagh Street',  suburb: 'Southbank', state: 'VIC', postcode: '3006', totalUnits: 85, lowUsageThreshold: 170, highUsageThreshold: 360 },
  { id: 'b6', name: 'The Crest',     address: '77 Queens Road',      suburb: 'Melbourne', state: 'VIC', postcode: '3004', totalUnits: 85, lowUsageThreshold: 160, highUsageThreshold: 350 },
  { id: 'b7', name: 'The Heights',   address: '33 Power Street',     suburb: 'Hawthorn',  state: 'VIC', postcode: '3122', totalUnits: 85, lowUsageThreshold: 175, highUsageThreshold: 370 },
]

function buildingFloorUnits(buildingId: string): { floors: number; unitsPerFloor: number; topFloorUnits: number } {
  const configs: Record<string, { floors: number; unitsPerFloor: number; topFloorUnits: number }> = {
    b1: { floors: 9, unitsPerFloor: 10, topFloorUnits: 10 },
    b2: { floors: 9, unitsPerFloor: 10, topFloorUnits: 10 },
    b3: { floors: 9, unitsPerFloor: 10, topFloorUnits: 5 },
    b4: { floors: 8, unitsPerFloor: 10, topFloorUnits: 10 },
    b5: { floors: 9, unitsPerFloor: 10, topFloorUnits: 5 },
    b6: { floors: 9, unitsPerFloor: 10, topFloorUnits: 5 },
    b7: { floors: 9, unitsPerFloor: 10, topFloorUnits: 5 },
  }
  return configs[buildingId] ?? { floors: 8, unitsPerFloor: 10, topFloorUnits: 10 }
}

export function generateApartmentsForBuilding(building: Building, floors?: number, unitsPerFloor?: number): Apartment[] {
  const apts: Apartment[] = []
  const { floors: defFloors, unitsPerFloor: defUPF, topFloorUnits } = buildingFloorUnits(building.id)
  const f = floors ?? defFloors
  const upf = unitsPerFloor ?? defUPF
  for (let floor = 1; floor <= f; floor++) {
    const units = (floor === f && !floors) ? topFloorUnits : upf
    for (let unit = 1; unit <= units; unit++) {
      const unitNum = `${floor}${String(unit).padStart(2, '0')}`
      apts.push({
        id: `${building.id}-u${unitNum}`,
        buildingId: building.id,
        unitNumber: unitNum,
        floor,
        meterNumber: `${building.id.toUpperCase()}M${unitNum}`,
      })
    }
  }
  return apts
}

export function generateAllApartments(buildings: Building[]): Apartment[] {
  return buildings.flatMap(b => generateApartmentsForBuilding(b))
}

export const APARTMENTS = generateAllApartments(BUILDINGS)

const FIRST_NAMES = [
  'James','Oliver','William','Noah','Jack','Lucas','Henry','Ethan','Liam','Alexander',
  'Emma','Charlotte','Mia','Olivia','Amelia','Sophia','Isabella','Chloe','Lily','Grace',
  'Emily','Sophie','Hannah','Zoe','Lucy','Sarah','Jessica','Ruby','Ella','Ava',
  'Thomas','Joshua','Samuel','Benjamin','Daniel','Ryan','Matthew','Jake','Michael','Nathan',
  'Wei','Mei','Anh','Priya','Raj','Isha','Ahmed','Fatima','Omar','Laila',
]
const LAST_NAMES = [
  'Smith','Jones','Williams','Taylor','Brown','Wilson','Johnson','Davies','Robinson','Thompson',
  'White','Walker','Hall','Martin','Lewis','Young','Hughes','Harris','Clarke','Lee',
  'Mitchell','Scott','Baker','Carter','Nelson','Turner','Hill','Allen','Phillips','Cook',
  'Chen','Wang','Nguyen','Patel','Kim','Singh','Kumar','Ahmed','Hassan','Khan',
  'Anderson','Jackson','Miller','Davis','Garcia','Rodriguez','Moore','Martinez','Moore','Taylor',
]
const BANKS = [
  { name: 'Commonwealth Bank', bsb: '062-000' },
  { name: 'Commonwealth Bank', bsb: '062-121' },
  { name: 'NAB',               bsb: '083-004' },
  { name: 'NAB',               bsb: '083-170' },
  { name: 'Westpac',           bsb: '032-000' },
  { name: 'Westpac',           bsb: '032-001' },
  { name: 'ANZ',               bsb: '013-001' },
  { name: 'ANZ',               bsb: '013-003' },
  { name: 'St George',         bsb: '112-032' },
  { name: 'Bendigo Bank',      bsb: '633-000' },
]
const PAYMENT_METHODS: Array<'direct_debit'|'bpay'|'eft'> = ['direct_debit','direct_debit','direct_debit','bpay','eft']

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

// Reference start for cumulative readings: June 2025
const REF_MONTH = 6, REF_YEAR = 2025

function monthsElapsedSinceRef(month: number, year: number): number {
  return (year - REF_YEAR) * 12 + (month - REF_MONTH)
}

function monthUsageSeed(idx: number, month: number, year: number): number {
  return idx * 17 + month * 3 + year * 7
}

export function generateDemoCustomers(apartments: Apartment[]): Customer[] {
  return apartments
    .filter((_, idx) => seeded(idx * 7 + 3) < 0.9)
    .map((apt, i) => {
      const idx = apartments.indexOf(apt)
      const s = idx * 31
      const firstName = pick(FIRST_NAMES, s)
      const lastName  = pick(LAST_NAMES, s + 1)
      const bank = pick(BANKS, s + 2)
      const pm = pick(PAYMENT_METHODS, s + 4)
      const accNum = String(seededInt(s + 5, 10000000, 99999999))
      return {
        id: `cust-${apt.id}`,
        apartmentId: apt.id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${seededInt(s+6,1,99)}@email.com`,
        phone: `04${seededInt(s+7,10,99)} ${seededInt(s+8,100,999)} ${seededInt(s+9,100,999)}`,
        moveInDate: `202${seededInt(s+10,2,5)}-${String(seededInt(s+11,1,12)).padStart(2,'0')}-01`,
        bankName: bank.name,
        bsb: bank.bsb,
        accountNumber: accNum,
        accountName: `${firstName} ${lastName}`,
        myobCardId: `CUST${String(apartments.indexOf(apt)+1).padStart(4,'0')}`,
        paymentMethod: pm,
      }
    })
}

// Single-month reading generator with proper cumulative meter values
export function generateDemoReadings(apartments: Apartment[], month: number, year: number): MeterReading[] {
  const elapsed = monthsElapsedSinceRef(month, year)
  const daysInMonth = new Date(year, month, 0).getDate()
  const readingDate = `${year}-${String(month).padStart(2,'0')}-${daysInMonth}`

  return apartments.map((apt, idx) => {
    const baseReading = seededInt(idx * 17, 8000, 25000)

    // Sum prior months' usage for cumulative previousReading
    let cumulative = 0
    for (let i = 0; i < elapsed; i++) {
      const d = new Date(REF_YEAR, REF_MONTH - 1 + i, 1)
      cumulative += seededInt(monthUsageSeed(idx, d.getMonth() + 1, d.getFullYear()) + 2, 170, 430)
    }

    const usage = seededInt(monthUsageSeed(idx, month, year) + 2, 170, 430)
    const previousReading = baseReading + cumulative

    return {
      id: `reading-${apt.id}-${year}${String(month).padStart(2,'0')}`,
      apartmentId: apt.id,
      month, year,
      previousReading,
      currentReading: previousReading + usage,
      usage,
      readingDate,
    }
  })
}

export function generateDemoInvoices(
  apartments: Apartment[],
  customers: Customer[],
  readings: MeterReading[],
  month: number,
  year: number,
  settings: ElectricitySettings,
): ElectricityInvoice[] {
  const invoices: ElectricityInvoice[] = []
  const custMap = new Map(customers.map(c => [c.apartmentId, c]))
  const readMap = new Map(
    readings.filter(r => r.month === month && r.year === year).map(r => [r.apartmentId, r])
  )
  const daysInMonth = new Date(year, month, 0).getDate()
  const issueDate = `${year}-${String(month).padStart(2,'0')}-01`
  const dueDate = new Date(year, month - 1, 1 + settings.paymentTermsDays).toISOString().split('T')[0]
  const billingEnd = `${year}-${String(month).padStart(2,'0')}-${daysInMonth}`
  const statuses: Array<'paid'|'sent'|'overdue'> = ['paid','paid','paid','sent','overdue']
  let counter = 1

  apartments.forEach((apt, idx) => {
    const customer = custMap.get(apt.id)
    const reading  = readMap.get(apt.id)
    if (!customer || !reading) return

    const { ratePerKwh, dailySupplyCharge, gstRate } = settings.tariff
    const usageCharge = Math.round(reading.usage * ratePerKwh * 100) / 100
    const supplyCharge = Math.round(daysInMonth * dailySupplyCharge * 100) / 100
    const subtotal = Math.round((usageCharge + supplyCharge) * 100) / 100
    const gst = Math.round(subtotal * gstRate * 100) / 100
    const total = subtotal + gst

    const status = idx < 400 ? pick(statuses, idx * 13 + month) : 'draft'
    invoices.push({
      id: `inv-${apt.id}-${year}${String(month).padStart(2,'0')}`,
      invoiceNumber: `${settings.invoicePrefix}-${year}${String(month).padStart(2,'0')}-${String(counter++).padStart(4,'0')}`,
      customerId: customer.id,
      apartmentId: apt.id,
      buildingId: apt.buildingId,
      month, year,
      issueDate, dueDate,
      billingPeriodStart: issueDate,
      billingPeriodEnd: billingEnd,
      daysInPeriod: daysInMonth,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      usage: reading.usage,
      ratePerKwh, usageCharge, supplyCharge, subtotal, gst, total,
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
  senderEmail: 'electricity@meridianproperty.com.au',
  tariff: { ratePerKwh: 0.3276, dailySupplyCharge: 1.1524, gstRate: 0.10 },
  myobClientId: '',
  myobClientSecret: '',
  myobAccessToken: '',
  myobRefreshToken: '',
  myobTokenExpiry: '',
  myobCompanyFileUrl: '',
  myobCompanyFileName: '',
  myobIncomeAccountCode: '',
  myobLastSyncCustomers: '',
  myobLastSyncInvoices: '',
}
