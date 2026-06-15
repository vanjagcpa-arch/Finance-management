import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export interface DisconnectionRequestPayload {
  // Customer
  customerId: string
  customerName: string
  customerEmail: string
  unitNumber: string
  buildingName: string
  invoiceNumber: string
  // Request
  moveOutDate: string
  notes?: string
  // Routing
  companyName: string
  companyEmail: string
  fromEmail: string
  processUrl: string   // deep-link into /electricity/customers?offboard=...
  origin: string
}

function buildAdminEmail(p: DisconnectionRequestPayload): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:28px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

  <tr><td style="background-color:#0c1120;padding:24px 36px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${p.companyName}</p>
    <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Disconnection Request</p>
  </td></tr>

  <tr><td style="background-color:#f59e0b;padding:12px 36px;">
    <p style="margin:0;color:#fffbeb;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Action Required</p>
    <p style="margin:3px 0 0;color:#ffffff;font-size:14px;font-weight:700;">${p.customerName} — Unit ${p.unitNumber}, ${p.buildingName}</p>
  </td></tr>

  <tr><td style="padding:28px 36px;">
    <p style="margin:0 0 20px;color:#334155;font-size:14px;">
      A tenant has requested to disconnect their electricity service. Review the details and click <strong>Process Disconnection</strong> to generate their final bill.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;color:#92400e;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Disconnection Details</p>
        <p style="margin:0 0 2px;color:#1e293b;font-size:14px;font-weight:600;">${p.customerName}</p>
        <p style="margin:0 0 1px;color:#64748b;font-size:12px;">${p.customerEmail}</p>
        <p style="margin:0 0 1px;color:#64748b;font-size:12px;">Unit ${p.unitNumber}, ${p.buildingName}</p>
        <p style="margin:6px 0 2px;color:#92400e;font-size:12px;font-weight:600;">Requested move-out date: <span style="color:#b45309;">${p.moveOutDate}</span></p>
        ${p.notes ? `<p style="margin:4px 0 0;color:#64748b;font-size:12px;font-style:italic;">"${p.notes}"</p>` : ''}
        <p style="margin:8px 0 0;color:#94a3b8;font-size:11px;font-family:Courier New,monospace;">Last invoice: ${p.invoiceNumber}</p>
      </td></tr>
    </table>

    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="padding-right:8px;">
        <a href="${p.processUrl}" style="display:block;text-align:center;background-color:#f59e0b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 20px;border-radius:10px;">
          Process Disconnection
        </a>
      </td>
      <td>
        <a href="${p.origin}/electricity/customers" style="display:block;text-align:center;background-color:#f8fafc;color:#64748b;text-decoration:none;font-size:13px;font-weight:600;padding:14px 20px;border-radius:10px;border:1px solid #e2e8f0;">
          View Customers
        </a>
      </td>
    </tr></table>

    <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;">
      The Process button opens the offboard flow pre-filled with the requested date. You&apos;ll need to enter the final meter reading before confirming.
    </p>
  </td></tr>

  <tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 36px;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName} &middot; ${p.companyEmail}</p>
  </td></tr>
</table></td></tr></table>
</body></html>`
}

function buildTenantAckEmail(p: DisconnectionRequestPayload): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:28px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="background-color:#0c1120;padding:24px 36px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${p.companyName}</p>
    <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Electricity Billing Services</p>
  </td></tr>
  <tr><td style="background-color:#f59e0b;padding:12px 36px;">
    <p style="margin:0;color:#fffbeb;font-size:10px;font-weight:700;text-transform:uppercase;">Disconnection Request Received</p>
    <p style="margin:3px 0 0;color:#ffffff;font-size:14px;font-weight:700;">Unit ${p.unitNumber}, ${p.buildingName}</p>
  </td></tr>
  <tr><td style="padding:28px 36px;">
    <p style="margin:0 0 16px;color:#1e293b;font-size:14px;">Hi ${p.customerName.split(' ')[0]},</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      We've received your disconnection request for <strong>Unit ${p.unitNumber}, ${p.buildingName}</strong> with a requested move-out date of <strong>${p.moveOutDate}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;">What happens next</p>
        ${[
          'We will arrange a final meter reading on or around your move-out date.',
          'A final bill will be calculated and emailed to you within 2 business days.',
          'Any direct debit will be processed for the final amount on the due date.',
        ].map((s, i) => `<p style="margin:0 0 4px;color:#334155;font-size:13px;"><span style="color:#f59e0b;font-weight:700;">${i+1}.</span> ${s}</p>`).join('')}
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
    const p: DisconnectionRequestPayload = await req.json()
    const [adminResult, tenantResult] = await Promise.all([
      resend.emails.send({
        from: `${p.companyName} <${p.fromEmail}>`,
        to: [p.companyEmail],
        subject: `Disconnection Request — ${p.customerName}, Unit ${p.unitNumber} (Move-out: ${p.moveOutDate})`,
        html: buildAdminEmail(p),
      }),
      resend.emails.send({
        from: `${p.companyName} <${p.fromEmail}>`,
        to: [p.customerEmail],
        subject: `Disconnection Request Received — ${p.companyName}`,
        html: buildTenantAckEmail(p),
      }),
    ])
    if (adminResult.error) return NextResponse.json({ error: adminResult.error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
