import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

interface SendStatementPayload {
  to: string
  customerName: string
  outstanding: number
  pdfBase64: string
  pdfFilename: string
  companyName: string
  fromEmail: string
  companyEmail: string
  companyPhone: string
  companyABN?: string
}

const aud  = (n: number) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
const date = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

function buildStatementEmail(p: SendStatementPayload): string {
  const hasOutstanding = p.outstanding > 0.005
  const asOf = new Date().toISOString().split('T')[0]

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Account Statement — ${p.customerName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr><td align="center" style="padding:28px 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background-color:#0c1120;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${p.companyName}</p>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Electricity Billing Services</p>
          </td>
        </tr>

        <!-- Indigo strip -->
        <tr>
          <td style="background-color:#4f46e5;padding:14px 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding-right:32px;">
                  <p style="margin:0;color:#a5b4fc;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Document</p>
                  <p style="margin:3px 0 0;color:#ffffff;font-size:13px;font-weight:600;">Account Statement</p>
                </td>
                <td style="padding-right:32px;">
                  <p style="margin:0;color:#a5b4fc;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">As At</p>
                  <p style="margin:3px 0 0;color:#ffffff;font-size:13px;font-weight:600;">${date(asOf)}</p>
                </td>
                <td>
                  <p style="margin:0;color:#a5b4fc;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Outstanding</p>
                  <p style="margin:3px 0 0;color:#ffffff;font-size:13px;font-weight:600;">${aud(Math.max(p.outstanding, 0))}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;color:#1e293b;font-size:15px;">Dear ${p.customerName},</p>
            <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.65;">
              Please find attached your electricity account statement as at ${date(asOf)}.
              Your full transaction history and current balance are detailed in the PDF.
            </p>

            <!-- Balance box -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${hasOutstanding ? '#4f46e5' : '#059669'};border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:24px 28px;">
                <p style="margin:0;color:${hasOutstanding ? '#a5b4fc' : '#a7f3d0'};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Total Outstanding</p>
                <p style="margin:6px 0 4px;color:#ffffff;font-size:40px;font-weight:800;letter-spacing:-1.5px;line-height:1;">${aud(Math.max(p.outstanding, 0))}</p>
                <p style="margin:0;color:${hasOutstanding ? '#a5b4fc' : '#a7f3d0'};font-size:13px;">
                  ${hasOutstanding ? 'Please remit payment at your earliest convenience.' : 'Your account is clear — no amount owing.'}
                </p>
              </td></tr>
            </table>

            ${hasOutstanding ? `
            <p style="margin:0 0 10px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">How to Pay</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 4px;color:#1e293b;font-size:13px;font-weight:600;">EFT / Bank Transfer</p>
                <p style="margin:0 0 3px;color:#64748b;font-size:12px;">Please reference your account name in the payment description.</p>
                <p style="margin:0;color:#64748b;font-size:12px;">Contact us at <a href="mailto:${p.companyEmail}" style="color:#4f46e5;">${p.companyEmail}</a> or ${p.companyPhone} to discuss payment options.</p>
              </td></tr>
            </table>` : ''}

            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              If you have any questions about this statement, please contact us at
              <a href="mailto:${p.companyEmail}" style="color:#4f46e5;text-decoration:none;">${p.companyEmail}</a>
              or call ${p.companyPhone}.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName}${p.companyABN ? ` &middot; ABN ${p.companyABN}` : ''} &middot; ${p.companyEmail} &middot; ${p.companyPhone}</p>
            <p style="margin:4px 0 0;color:#cbd5e1;font-size:10px;font-family:Courier New,monospace;">Statement as at ${asOf}</p>
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
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const payload: SendStatementPayload = await req.json()
    const { data, error } = await resend.emails.send({
      from: `${payload.companyName} <onboarding@resend.dev>`,
      replyTo: payload.fromEmail,
      to: [payload.to],
      subject: `Account Statement — ${payload.customerName}`,
      html: buildStatementEmail(payload),
      attachments: payload.pdfBase64
        ? [{ filename: payload.pdfFilename, content: Buffer.from(payload.pdfBase64, 'base64') }]
        : [],
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
