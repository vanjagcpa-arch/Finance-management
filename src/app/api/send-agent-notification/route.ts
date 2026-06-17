import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export interface AgentNotificationPayload {
  to: string
  agentName: string
  agencyName: string
  buildingName: string
  buildingAddress: string
  unitNumber: string
  floor: number
  meterNumber: string
  usageKwh: number
  period: string          // e.g. "May 2026"
  readingDate: string     // ISO date
  companyName: string
  fromEmail: string
  companyEmail: string
  companyPhone: string
}

const fdate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

function buildEmail(p: AgentNotificationPayload): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Vacant Unit Usage Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr><td align="center" style="padding:28px 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background-color:#0c1120;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${p.companyName}</p>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Electricity Billing Services</p>
          </td>
        </tr>

        <!-- Amber strip -->
        <tr>
          <td style="background-color:#d97706;padding:14px 40px;">
            <p style="margin:0;color:#fef3c7;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Action Required</p>
            <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:600;">Electricity usage detected in vacant unit</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;color:#1e293b;font-size:15px;">Dear ${p.agentName ? p.agentName : 'Property Manager'},</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.65;">
              We manage electricity billing for <strong style="color:#334155;">${p.buildingName}</strong> and have detected electricity consumption
              at Unit <strong style="color:#334155;">${p.unitNumber}</strong> during <strong style="color:#334155;">${p.period}</strong>.
              This unit currently appears <strong style="color:#dc2626;">vacant</strong> in our records with no registered tenant.
            </p>

            <!-- Unit detail card -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Unit Details</p>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${[
                    ['Building', `${p.buildingName}, ${p.buildingAddress}`],
                    ['Unit', `Unit ${p.unitNumber} — Level ${p.floor}`],
                    ['Meter', p.meterNumber],
                    ['Period', p.period],
                    ['Usage detected', `${p.usageKwh.toLocaleString()} kWh`],
                    ['Reading date', fdate(p.readingDate)],
                  ].map(([label, value]) => `
                  <tr>
                    <td style="padding:4px 0;color:#92400e;font-size:12px;font-weight:600;width:130px;">${label}</td>
                    <td style="padding:4px 0;color:#78350f;font-size:12px;">${value}</td>
                  </tr>`).join('')}
                </table>
              </td></tr>
            </table>

            <!-- Request -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:18px 20px;">
                <p style="margin:0 0 8px;color:#0369a1;font-size:13px;font-weight:700;">We need your help</p>
                <p style="margin:0 0 8px;color:#0c4a6e;font-size:13px;line-height:1.6;">
                  Could you please provide the contact details of the current occupant of Unit ${p.unitNumber} so we can:
                </p>
                <ul style="margin:0;padding-left:18px;color:#0c4a6e;font-size:13px;line-height:1.8;">
                  <li>Set up their electricity account</li>
                  <li>Issue a bill for the usage already consumed</li>
                  <li>Arrange a Direct Debit for future payments</li>
                </ul>
              </td></tr>
            </table>

            <p style="margin:0 0 6px;color:#64748b;font-size:13px;line-height:1.6;">
              Please reply to this email with the tenant&apos;s name, email address, phone number, and move-in date. Alternatively, call us on ${p.companyPhone}.
            </p>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              If this unit is legitimately vacant and the usage is unexplained (e.g. common area circuit, meter error), please let us know so we can investigate.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName} &middot; ${p.companyEmail} &middot; ${p.companyPhone}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured.' }, { status: 500 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const payload: AgentNotificationPayload = await req.json()
    const { data, error } = await resend.emails.send({
      from: `${payload.companyName} <onboarding@resend.dev>`,
      replyTo: payload.fromEmail,
      to: [payload.to],
      subject: `Electricity usage at vacant Unit ${payload.unitNumber}, ${payload.buildingName} — ${payload.period}`,
      html: buildEmail(payload),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
