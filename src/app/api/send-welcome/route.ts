import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export interface SendWelcomePayload {
  to: string
  firstName: string
  lastName: string
  unitNumber: string
  floor: number
  buildingName: string
  buildingAddress: string
  meterNumber: string
  moveInDate: string
  paymentMethod: 'direct_debit' | 'bpay' | 'eft'
  bsb?: string
  accountNumber?: string
  accountName?: string
  bankName?: string
  companyName: string
  fromEmail: string
  companyEmail: string
  companyPhone: string
  companyABN: string
  bpayBillerCode: string
  bankBSB: string
  bankAccount: string
  bankAccountName: string
  bankName2: string
  portalUrl?: string
}

function buildWelcomeEmail(p: SendWelcomePayload): string {
  const payMethod =
    p.paymentMethod === 'direct_debit' ? 'Direct Debit (DDR)' :
    p.paymentMethod === 'bpay' ? 'BPAY' : 'EFT Transfer'

  const paymentSection = p.paymentMethod === 'direct_debit' ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#eef2ff;border:1px solid #e0e7ff;border-radius:10px;margin:0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;color:#3730a3;font-size:13px;font-weight:700;">&#10003; Direct Debit Authorised</p>
        <p style="margin:0 0 4px;color:#4338ca;font-size:13px;">Your invoices will be automatically debited from your account.</p>
        <p style="margin:0;color:#6366f1;font-size:12px;">${p.accountName ?? ''} &middot; BSB: ${p.bsb ?? ''} &middot; Account: ${p.accountNumber ?? ''}</p>
      </td></tr>
    </table>` : `
    <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">Payment Method: ${payMethod}</p>
    ${p.paymentMethod === 'bpay' && p.bpayBillerCode ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 8px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 4px;color:#1e293b;font-size:12px;font-weight:700;">BPAY</p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;">Biller Code: <span style="font-family:Courier New,monospace;color:#1e293b;font-weight:600;">${p.bpayBillerCode}</span></p>
        <p style="margin:0;color:#64748b;font-size:12px;">Reference: <em style="color:#94a3b8;">(your invoice number — shown on each invoice)</em></p>
      </td></tr>
    </table>` : ''}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 4px;color:#1e293b;font-size:12px;font-weight:700;">EFT Transfer</p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;">${p.bankName2}</p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;">BSB: <span style="font-family:Courier New,monospace;color:#1e293b;">${p.bankBSB}</span></p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;">Account: <span style="font-family:Courier New,monospace;color:#1e293b;">${p.bankAccount}</span></p>
        <p style="margin:0;color:#64748b;font-size:12px;">Name: <span style="color:#1e293b;">${p.bankAccountName}</span></p>
      </td></tr>
    </table>`

  const portalSection = p.portalUrl ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0;">
      <tr><td style="text-align:center;padding:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
        <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">Your Online Account</p>
        <p style="margin:0 0 12px;color:#64748b;font-size:12px;">View your invoices and account details online anytime.</p>
        <a href="${p.portalUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;">Access Your Account</a>
      </td></tr>
    </table>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to ${p.companyName}</title>
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

        <!-- Green welcome strip -->
        <tr>
          <td style="background-color:#059669;padding:14px 40px;">
            <p style="margin:0;color:#d1fae5;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Welcome &mdash; Account Activated</p>
            <p style="margin:3px 0 0;color:#ffffff;font-size:15px;font-weight:700;">${p.firstName} ${p.lastName}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;color:#1e293b;font-size:15px;">Hi ${p.firstName},</p>
            <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.65;">
              Welcome to ${p.companyName} electricity billing. Your account has been set up and you&rsquo;ll receive your first invoice at the end of the billing period.
            </p>

            <!-- Property info -->
            <p style="margin:0 0 12px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Your Property</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 4px;color:#1e293b;font-size:14px;font-weight:600;">${p.buildingName} &mdash; Unit ${p.unitNumber}</p>
                <p style="margin:0 0 4px;color:#64748b;font-size:13px;">${p.buildingAddress}</p>
                <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Floor ${p.floor} &middot; Move-in: ${p.moveInDate}</p>
                <p style="margin:0;color:#94a3b8;font-size:11px;font-family:Courier New,monospace;">Meter: ${p.meterNumber}</p>
              </td></tr>
            </table>

            <!-- Payment info -->
            <p style="margin:0 0 12px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Payment Information</p>
            ${paymentSection}

            ${portalSection}

            <!-- Contact -->
            <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Questions? Contact us at
              <a href="mailto:${p.companyEmail}" style="color:#4f46e5;text-decoration:none;">${p.companyEmail}</a>
              or call ${p.companyPhone}.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName} &middot; ABN ${p.companyABN} &middot; ${p.companyEmail} &middot; ${p.companyPhone}</p>
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
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured.' }, { status: 500 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const payload: SendWelcomePayload = await req.json()
    const { data, error } = await resend.emails.send({
      from: `${payload.companyName} <onboarding@resend.dev>`,
      replyTo: payload.fromEmail,
      to: [payload.to],
      subject: `Welcome to ${payload.companyName} — Account Activated`,
      html: buildWelcomeEmail(payload),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
