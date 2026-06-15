import { NextRequest, NextResponse } from 'next/server'
import type { ElectricityInvoice, Customer } from '@/lib/electricityTypes'

export const runtime = 'nodejs'

export interface SyncInvoicesPayload {
  accessToken: string
  companyFileUrl: string
  incomeAccountCode: string
  invoices: ElectricityInvoice[]
  customers: Customer[]
}

export interface SyncInvoicesResult {
  created: number
  skipped: number
  failed: number
  errors: string[]
}

function toMYOBDate(dateStr: string): string {
  return `/Date(${new Date(dateStr + 'T00:00:00').getTime()})/`
}

export async function POST(req: NextRequest) {
  const payload: SyncInvoicesPayload = await req.json()
  const { accessToken, companyFileUrl, incomeAccountCode, invoices, customers } = payload

  if (!accessToken || !companyFileUrl || !incomeAccountCode || !invoices?.length) {
    return NextResponse.json({ error: 'accessToken, companyFileUrl, incomeAccountCode, and invoices are required' }, { status: 400 })
  }

  const baseUrl = companyFileUrl.replace(/\/$/, '')
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-myobapi-version': 'v2',
    'Content-Type': 'application/json',
  }

  const result: SyncInvoicesResult = { created: 0, skipped: 0, failed: 0, errors: [] }
  const custMap = new Map(customers.map(c => [c.id, c]))

  // Fetch income account UID
  let accountUID: string | null = null
  try {
    const accRes = await fetch(
      `${baseUrl}/GeneralLedger/Account?$filter=DisplayID eq '${incomeAccountCode}'`,
      { headers }
    )
    if (accRes.ok) {
      const accData = await accRes.json()
      if (accData.Count > 0) accountUID = accData.Items[0].UID
    }
  } catch {}

  for (const inv of invoices) {
    // Skip drafts and cancelled invoices
    if (inv.status === 'draft' || inv.status === 'cancelled') {
      result.skipped++
      continue
    }

    const customer = custMap.get(inv.customerId)
    if (!customer) {
      result.skipped++
      result.errors.push(`Invoice ${inv.invoiceNumber}: customer not found`)
      continue
    }

    try {
      // Check if already synced by CustomerPurchaseOrderNumber
      const searchRes = await fetch(
        `${baseUrl}/Sale/Invoice/Service?$filter=CustomerPurchaseOrderNumber eq '${inv.invoiceNumber}'`,
        { headers }
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData.Count > 0) {
          result.skipped++
          continue
        }
      }

      const lines = [
        {
          Type: 'Transaction',
          Description: `Electricity usage ${inv.billingPeriodStart} – ${inv.billingPeriodEnd} (${inv.usage} kWh @ $${inv.ratePerKwh}/kWh)`,
          Quantity: 1,
          UnitPrice: inv.usageCharge,
          Total: inv.usageCharge,
          TaxCode: { Code: 'GST' },
          ...(accountUID ? { Account: { UID: accountUID } } : {}),
        },
        {
          Type: 'Transaction',
          Description: `Supply charge (${inv.daysInPeriod} days)`,
          Quantity: inv.daysInPeriod,
          UnitPrice: inv.supplyCharge / inv.daysInPeriod,
          Total: inv.supplyCharge,
          TaxCode: { Code: 'GST' },
          ...(accountUID ? { Account: { UID: accountUID } } : {}),
        },
      ]

      const body: Record<string, unknown> = {
        Customer: {
          DisplayID: customer.myobCardId || `CUST-${customer.id.slice(-8)}`,
          Name: `${customer.firstName} ${customer.lastName}`,
        },
        CustomerPurchaseOrderNumber: inv.invoiceNumber,
        Date: toMYOBDate(inv.issueDate),
        IsTaxInclusive: false,
        Lines: lines,
        ...(inv.status === 'paid' ? {
          Status: 'Closed',
          Payments: [{
            Date: toMYOBDate(inv.paidDate ?? inv.issueDate),
            Amount: inv.paidAmount ?? inv.total,
          }],
        } : {}),
      }

      const postRes = await fetch(`${baseUrl}/Sale/Invoice/Service`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (postRes.ok || postRes.status === 201) {
        result.created++
      } else {
        const errText = await postRes.text()
        result.failed++
        result.errors.push(`${inv.invoiceNumber}: ${postRes.status} ${errText.slice(0, 120)}`)
      }
    } catch (err) {
      result.failed++
      result.errors.push(`${inv.invoiceNumber}: ${String(err)}`)
    }
  }

  return NextResponse.json(result)
}
