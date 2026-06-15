import { NextRequest, NextResponse } from 'next/server'
import type { Customer } from '@/lib/electricityTypes'

export const runtime = 'nodejs'

export interface SyncCustomersPayload {
  accessToken: string
  companyFileUrl: string
  customers: Customer[]
  buildings: Array<{ id: string; name: string; address: string; suburb: string; state: string; postcode: string }>
  apartments: Array<{ id: string; buildingId: string; unitNumber: string }>
}

export interface SyncResult {
  created: number
  updated: number
  failed: number
  errors: string[]
}

function toMYOBDate(dateStr: string): string {
  return `/Date(${new Date(dateStr + 'T00:00:00').getTime()})/`
}

export async function POST(req: NextRequest) {
  const payload: SyncCustomersPayload = await req.json()
  const { accessToken, companyFileUrl, customers, buildings, apartments } = payload

  if (!accessToken || !companyFileUrl || !customers?.length) {
    return NextResponse.json({ error: 'accessToken, companyFileUrl, and customers are required' }, { status: 400 })
  }

  const baseUrl = companyFileUrl.replace(/\/$/, '')
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-myobapi-version': 'v2',
    'Content-Type': 'application/json',
  }

  const result: SyncResult = { created: 0, updated: 0, failed: 0, errors: [] }
  const aptMap = new Map(apartments.map(a => [a.id, a]))
  const bldMap = new Map(buildings.map(b => [b.id, b]))

  for (const c of customers) {
    const apt = aptMap.get(c.apartmentId)
    const bld = apt ? bldMap.get(apt.buildingId) : undefined

    const body = {
      IsIndividual: true,
      FirstName: c.firstName,
      LastName: c.lastName,
      DisplayID: c.myobCardId || `CUST-${c.id.slice(-8)}`,
      Addresses: bld && apt ? [{
        Type: 'Location',
        Street: `Unit ${apt.unitNumber}, ${bld.address}`,
        City: bld.suburb,
        State: bld.state,
        PostCode: bld.postcode,
      }] : [],
      EmailAddress: c.email,
      PhoneNumbers: c.phone ? [{ PhoneType: 'Mobile', Number: c.phone }] : [],
      ...(c.moveInDate ? { Notes: `Move-in: ${c.moveInDate}` } : {}),
      ...(c.bankName ? {
        PaymentDetails: {
          PaymentMethod: c.paymentMethod === 'direct_debit' ? 'DirectDebit' : 'EFT',
          BSBNumber: c.bsb,
          BankAccountNumber: c.accountNumber,
          BankAccountName: c.accountName,
        }
      } : {}),
    }

    try {
      // Check if exists by DisplayID
      const searchRes = await fetch(
        `${baseUrl}/Contact/Customer?$filter=DisplayID eq '${body.DisplayID}'`,
        { headers }
      )
      const searchData = searchRes.ok ? await searchRes.json() : { Count: 0, Items: [] }

      if (searchData.Count > 0) {
        const existing = searchData.Items[0]
        const putRes = await fetch(`${baseUrl}/Contact/Customer/${existing.UID}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...body, UID: existing.UID }),
        })
        if (putRes.ok || putRes.status === 204) {
          result.updated++
        } else {
          result.failed++
          result.errors.push(`${c.firstName} ${c.lastName}: PUT failed (${putRes.status})`)
        }
      } else {
        const postRes = await fetch(`${baseUrl}/Contact/Customer`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        if (postRes.ok || postRes.status === 201) {
          result.created++
        } else {
          result.failed++
          const errText = await postRes.text()
          result.errors.push(`${c.firstName} ${c.lastName}: POST failed (${postRes.status}) ${errText.slice(0, 100)}`)
        }
      }
    } catch (err) {
      result.failed++
      result.errors.push(`${c.firstName} ${c.lastName}: ${String(err)}`)
    }
  }

  return NextResponse.json(result)
}
