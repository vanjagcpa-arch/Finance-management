import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

export interface ExtractedCustomer {
  firstName:     string | null
  lastName:      string | null
  email:         string | null
  phone:         string | null
  buildingName:  string | null
  unitNumber:    string | null
  moveInDate:    string | null  // YYYY-MM-DD
  paymentMethod: 'direct_debit' | 'bpay' | 'eft' | null
  bankName:      string | null
  bsb:           string | null
  accountNumber: string | null
  accountName:   string | null
  notes:         string | null
}

const PROMPT = `Extract customer information from this completed application form.
Return ONLY a JSON object with exactly these fields (use null for any field not found):
{
  "firstName": string,
  "lastName": string,
  "email": string,
  "phone": string,
  "buildingName": string,
  "unitNumber": string,
  "moveInDate": "YYYY-MM-DD",
  "paymentMethod": "direct_debit" | "bpay" | "eft",
  "bankName": string,
  "bsb": string,
  "accountNumber": string,
  "accountName": string,
  "notes": string
}

Rules:
- paymentMethod: use "direct_debit" if bank account details are provided or "direct debit" / "DDR" is mentioned; "bpay" if BPAY is mentioned; otherwise "eft"
- bsb: format as nnn-nnn (add dash if missing)
- moveInDate: convert any date format to YYYY-MM-DD; if only month/year given use the 1st of that month
- notes: capture anything that doesn't fit other fields (special requests, notes, etc)
- Return ONLY the JSON object with no markdown fences or other text`

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const { pdfBase64 } = await req.json()
    if (!pdfBase64) return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await (client.messages.create as (p: any) => Promise<any>)({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    // Strip markdown fences if model ignored instructions
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const extracted: ExtractedCustomer = JSON.parse(json)
    return NextResponse.json({ extracted })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
