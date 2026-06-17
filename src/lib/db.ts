import { neon } from '@neondatabase/serverless'

// Vercel+Neon integration exposes DATABASE_URL automatically
const sql = neon(process.env.DATABASE_URL!)

export default sql

// Create the store table if it doesn't exist.
// Call this once per cold-start from any API route.
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS store (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function dbGet(key: string): Promise<unknown | null> {
  const rows = await sql`SELECT value FROM store WHERE key = ${key}`
  return rows[0]?.value ?? null
}

export async function dbSet(key: string, value: unknown): Promise<void> {
  await sql`
    INSERT INTO store (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW()
  `
}

export async function dbGetMany(keys: string[]): Promise<Record<string, unknown>> {
  if (keys.length === 0) return {}
  const rows = await sql`SELECT key, value FROM store WHERE key = ANY(${keys})`
  const out: Record<string, unknown> = {}
  for (const r of rows) out[r.key as string] = r.value
  return out
}
