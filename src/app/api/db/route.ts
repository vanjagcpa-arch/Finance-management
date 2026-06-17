import { NextRequest, NextResponse } from 'next/server'
import { ensureSchema, dbGetMany, dbSet } from '@/lib/db'

// If DATABASE_URL is not set, return empty data (app falls back to localStorage)
function hasDb() { return !!process.env.DATABASE_URL }

// All keys that make up the app state
const ALL_KEYS = [
  'elec_buildings_v2',
  'elec_apartments_v2',
  'elec_customers_v2',
  'elec_readings_v2',
  'elec_invoices_v2',
  'elec_settings_v2',
  'elec_counter_v2',
  'elec_initialized_v2',
  'elec_debtor_comms_v2',
  'elec_debtor_statuses_v2',
  'elec_payment_plans_v2',
  'app_users_v1',
]

// GET /api/db — return all collections in one shot
export async function GET() {
  if (!hasDb()) return NextResponse.json({ ok: true, data: {} })
  try {
    await ensureSchema()
    const data = await dbGetMany(ALL_KEYS)
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[db GET]', err)
    return NextResponse.json({ ok: true, data: {} }) // degrade gracefully
  }
}

// POST /api/db — save one collection { key, value }
export async function POST(req: NextRequest) {
  if (!hasDb()) return NextResponse.json({ ok: true }) // no-op without DB
  try {
    const { key, value } = await req.json()
    if (!key || !ALL_KEYS.includes(key)) {
      return NextResponse.json({ ok: false, error: 'Invalid key' }, { status: 400 })
    }
    await ensureSchema()
    await dbSet(key, value)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[db POST]', err)
    return NextResponse.json({ ok: true }) // degrade gracefully — localStorage still has it
  }
}
