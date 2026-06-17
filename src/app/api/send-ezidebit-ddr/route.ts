import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export interface SendEzidebitDDRPayload {
  to: string
  firstName: string
  unitNumber: string
  buildingName: string
  buildingAddress: string
  customerId: string
  ezidebitDigitalKey: string   // from settings — used to build the hosted DDR form URL
  companyName: string
  fromEmail: string
  companyEmail: string
  companyPhone: string
}

function buildDDRUrl(digitalKey: string, customerId: string): string {
  // Ezidebit hosted DDR form URL format
  // Tenants enter bank details directly on Ezidebit's secure servers
  return `https://secure.ezidebit.com.au/ddr/v2?q=${encodeURIComponent(digitalKey)}&ref=${encodeURIComponent(customerId)}`
}

function buildEmail(p: SendEzidebitDDRPayload): string {
  const ddrUrl = p.ezidebitDigitalKey
    ? buildDDRUrl(p.ezidebitDigitalKey, p.customerId)
    : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Set up Direct Debit</title>
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

        <!-- Violet strip -->
        <tr>
          <td style="background-color:#7c3aed;padding:14px 40px;">
            <p style="margin:0;color:#ddd6fe;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Action Required</p>
            <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:600;">Set up your Direct Debit</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;color:#1e293b;font-size:15px;">Dear ${p.firstName},</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.65;">
              Your electricity account at <strong style="color:#334155;">${p.buildingName}, Unit ${p.unitNumber}</strong> has been set up.
              To complete your payment setup, please register your bank account details with Ezidebit — our secure payment processor.
            </p>

            <!-- Security callout -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f3ff;border:1px solid #ede9fe;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:18px 20px;">
                <p style="margin:0 0 6px;color:#6d28d9;font-size:13px;font-weight:700;">&#128274; Your details are secure</p>
                <p style="margin:0;color:#7c3aed;font-size:13px;line-height:1.5;">
                  Your bank account details are entered <strong>directly into Ezidebit's secure platform</strong> — they are never stored by ${p.companyName}.
                  Ezidebit is an Australian payment processor compliant with banking regulations.
                </p>
              </td></tr>
            </table>

            ${ddrUrl ? `
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
              <tr><td style="text-align:center;padding:24px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <p style="margin:0 0 8px;color:#334155;font-size:14px;font-weight:600;">Click below to securely register your bank account</p>
                <p style="margin:0 0 16px;color:#64748b;font-size:12px;">Takes about 2 minutes. Your reference number: <span style="font-family:Courier New,monospace;color:#1e293b;font-weight:600;">${p.customerId}</span></p>
                <a href="${ddrUrl}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;">
                  Register Direct Debit with Ezidebit &#8594;
                </a>
                <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;">Link is unique to your account. Do not share it.</p>
              </td></tr>
            </table>
            ` : `
            <!-- No digital key — manual instructions -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
              <tr><td style="padding:18px 20px;background-color:#fefce8;border:1px solid #fef08a;border-radius:12px;">
                <p style="margin:0 0 6px;color:#854d0e;font-size:13px;font-weight:700;">Next steps</p>
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  Our team will send you a secure registration link shortly. In the meantime, if you have any questions please contact us at
                  <a href="mailto:${p.companyEmail}" style="color:#7c3aed;">${p.companyEmail}</a>.
                </p>
              </td></tr>
            </table>
            `}

            <!-- What happens next -->
            <p style="margin:0 0 12px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">What happens next</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              ${[
                ['1', 'Register your bank account using the button above (one-time setup)'],
                ['2', 'Your electricity bill is generated each month based on your meter readings'],
                ['3', 'The amount is automatically debited from your account on the due date'],
                ['4', 'You\'ll receive an invoice by email before each debit so you know what\'s coming'],
              ].map(([num, text]) => `
              <tr>
                <td style="padding:6px 0;vertical-align:top;">
                  <span style="display:inline-block;width:20px;height:20px;background-color:#ede9fe;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#7c3aed;margin-right:10px;">${num}</span>
                </td>
                <td style="padding:6px 0;color:#334155;font-size:13px;vertical-align:top;line-height:1.5;">${text}</td>
              </tr>`).join('')}
            </table>

            <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Questions? Contact us at
              <a href="mailto:${p.companyEmail}" style="color:#7c3aed;text-decoration:none;">${p.companyEmail}</a>
              or call ${p.companyPhone}.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName} &middot; ${p.companyEmail} &middot; ${p.companyPhone}</p>
            <p style="margin:4px 0 0;color:#cbd5e1;font-size:10px;">Ref: ${p.customerId}</p>
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
    const payload: SendEzidebitDDRPayload = await req.json()
    const { data, error } = await resend.emails.send({
      from: `${payload.companyName} <onboarding@resend.dev>`,
      replyTo: payload.fromEmail,
      to: [payload.to],
      subject: `Set up your Direct Debit — ${payload.buildingName} Unit ${payload.unitNumber}`,
      html: buildEmail(payload),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
