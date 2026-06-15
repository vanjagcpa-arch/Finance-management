import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export interface ConnectionRequestPayload {
  // Unit
  buildingName: string
  unitNumber: string
  moveInDate: string
  // Tenant
  firstName: string
  lastName: string
  email: string
  phone: string
  // Payment
  paymentMethod: 'direct_debit' | 'bpay' | 'eft'
  bankName?: string
  bsb?: string
  accountNumber?: string
  accountName?: string
  // Routing
  companyName: string
  companyEmail: string
  fromEmail: string
  approveUrl: string   // deep-link into /electricity/onboard?prefill=...
  origin: string
}

function buildAdminEmail(p: ConnectionRequestPayload): string {
  const payInfo = p.paymentMethod === 'direct_debit'
    ? `<p style="margin:0 0 2px;color:#64748b;font-size:12px;">Bank: <b>${p.bankName}</b> &middot; BSB: <span style="font-family:Courier New,monospace;">${p.bsb}</span> &middot; Account: <span style="font-family:Courier New,monospace;">${p.accountNumber}</span></p>
       <p style="margin:0;color:#64748b;font-size:12px;">Account Name: ${p.accountName}</p>`
    : `<p style="margin:0;color:#64748b;font-size:12px;">Method: <b>${p.paymentMethod === 'bpay' ? 'BPAY' : 'EFT Transfer'}</b></p>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:28px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

  <tr><td style="background-color:#0c1120;padding:24px 36px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${p.companyName}</p>
    <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">New Connection Request</p>
  </td></tr>

  <tr><td style="background-color:#0ea5e9;padding:12px 36px;">
    <p style="margin:0;color:#e0f2fe;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Incoming Request</p>
    <p style="margin:3px 0 0;color:#ffffff;font-size:14px;font-weight:700;">Unit ${p.unitNumber} — ${p.buildingName}</p>
  </td></tr>

  <tr><td style="padding:28px 36px;">
    <p style="margin:0 0 20px;color:#334155;font-size:14px;">
      A new electricity connection has been requested. Review the details below and click <strong>Approve & Onboard</strong> to proceed.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Tenant</p>
        <p style="margin:0 0 2px;color:#1e293b;font-size:14px;font-weight:600;">${p.firstName} ${p.lastName}</p>
        <p style="margin:0 0 1px;color:#64748b;font-size:12px;">${p.email} &middot; ${p.phone}</p>
        <p style="margin:8px 0 2px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Property</p>
        <p style="margin:0 0 1px;color:#1e293b;font-size:13px;font-weight:600;">Unit ${p.unitNumber}, ${p.buildingName}</p>
        <p style="margin:0 0 1px;color:#64748b;font-size:12px;">Move-in: <b>${p.moveInDate}</b></p>
        <p style="margin:8px 0 2px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Payment</p>
        ${payInfo}
      </td></tr>
    </table>

    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="padding-right:8px;">
        <a href="${p.approveUrl}" style="display:block;text-align:center;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 20px;border-radius:10px;">
          &#10003;&nbsp; Approve &amp; Onboard
        </a>
      </td>
      <td>
        <a href="${p.origin}/electricity/customers" style="display:block;text-align:center;background-color:#f8fafc;color:#64748b;text-decoration:none;font-size:13px;font-weight:600;padding:14px 20px;border-radius:10px;border:1px solid #e2e8f0;">
          View Customers
        </a>
      </td>
    </tr></table>

    <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;">
      The Approve button opens your admin portal with all fields pre-filled. Review and confirm before saving.
    </p>
  </td></tr>

  <tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 36px;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName} &middot; ${p.companyEmail}</p>
  </td></tr>

</table></td></tr></table>
</body></html>`
}

function buildTenantAckEmail(p: ConnectionRequestPayload): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:28px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="background-color:#0c1120;padding:24px 36px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${p.companyName}</p>
    <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Electricity Billing Services</p>
  </td></tr>
  <tr><td style="background-color:#0ea5e9;padding:12px 36px;">
    <p style="margin:0;color:#e0f2fe;font-size:10px;font-weight:700;text-transform:uppercase;">Request Received</p>
    <p style="margin:3px 0 0;color:#ffffff;font-size:14px;font-weight:700;">Connection Request — Unit ${p.unitNumber}</p>
  </td></tr>
  <tr><td style="padding:28px 36px;">
    <p style="margin:0 0 16px;color:#1e293b;font-size:14px;">Hi ${p.firstName},</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      We've received your electricity connection request for <strong>Unit ${p.unitNumber}, ${p.buildingName}</strong> with a move-in date of <strong>${p.moveInDate}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;">What happens next</p>
        ${['We will review your request and verify the unit is ready.', 'Your account will be set up within 1 business day.', 'You will receive a welcome email once your account is active.'].map((s, i) => `
        <p style="margin:0 0 4px;color:#334155;font-size:13px;"><span style="color:#0ea5e9;font-weight:700;">${i+1}.</span> ${s}</p>`).join('')}
      </td></tr>
    </table>
    <p style="margin:0;color:#94a3b8;font-size:12px;">Questions? Contact us at <a href="mailto:${p.companyEmail}" style="color:#4f46e5;text-decoration:none;">${p.companyEmail}</a></p>
  </td></tr>
  <tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 36px;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName} &middot; ${p.companyEmail}</p>
  </td></tr>
</table></td></tr></table>
</body></html>`
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const p: ConnectionRequestPayload = await req.json()
    const [adminResult, tenantResult] = await Promise.all([
      resend.emails.send({
        from: `${p.companyName} <${p.fromEmail}>`,
        to: [p.companyEmail],
        subject: `New Connection Request — Unit ${p.unitNumber}, ${p.buildingName} (${p.firstName} ${p.lastName})`,
        html: buildAdminEmail(p),
      }),
      resend.emails.send({
        from: `${p.companyName} <${p.fromEmail}>`,
        to: [p.email],
        subject: `Connection Request Received — ${p.companyName}`,
        html: buildTenantAckEmail(p),
      }),
    ])
    if (adminResult.error) return NextResponse.json({ error: adminResult.error.message }, { status: 400 })
    return NextResponse.json({ success: true, adminId: adminResult.data?.id, tenantId: tenantResult.data?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
