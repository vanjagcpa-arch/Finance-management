import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export interface OverdueReminderPayload {
  to: string
  customerFirstName: string
  invoiceNumber: string
  period: string
  dueDate: string
  daysPastDue: number
  total: number
  isDDR: boolean
  bpayBillerCode?: string
  bankBSB?: string
  bankAccount?: string
  bankAccountName?: string
  bankName?: string
  companyName: string
  companyEmail: string
  companyPhone: string
  fromEmail: string
  portalUrl?: string
}

function buildReminderEmail(p: OverdueReminderPayload): string {
  const aud = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
  const fdate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const bpayRef = p.invoiceNumber.replace(/-/g, '')
  const urgency = p.daysPastDue >= 14 ? 'FINAL NOTICE' : p.daysPastDue >= 7 ? 'Second Reminder' : 'Payment Reminder'

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:28px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

  <tr><td style="background-color:#0c1120;padding:24px 36px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${p.companyName}</p>
    <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Electricity Billing Services</p>
  </td></tr>

  <tr><td style="background-color:#ef4444;padding:12px 36px;">
    <p style="margin:0;color:#fee2e2;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">${urgency}</p>
    <p style="margin:3px 0 0;color:#ffffff;font-size:14px;font-weight:700;">Invoice ${p.invoiceNumber} is ${p.daysPastDue} day${p.daysPastDue !== 1 ? 's' : ''} overdue</p>
  </td></tr>

  <tr><td style="padding:28px 36px;">
    <p style="margin:0 0 20px;color:#334155;font-size:14px;">
      Hi ${p.customerFirstName},
    </p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Our records show that your electricity invoice for <strong>${p.period}</strong> remains unpaid.
      This account is now <strong>${p.daysPastDue} days overdue</strong>. Please arrange payment as soon as possible
      to avoid further action.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#dc2626,#ef4444);border-radius:12px;margin:0 0 20px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0;color:#fecaca;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Amount Overdue</p>
        <p style="margin:4px 0 0;color:#ffffff;font-size:28px;font-weight:900;font-family:Courier New,monospace;">${aud(p.total)}</p>
        <p style="margin:4px 0 0;color:#fecaca;font-size:12px;">Was due ${fdate(p.dueDate)} · Invoice ${p.invoiceNumber}</p>
      </td></tr>
    </table>

    ${p.isDDR ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">Your direct debit payment could not be processed</p>
        <p style="margin:4px 0 0;color:#92400e;font-size:12px;">Please contact us to resolve the issue with your bank account.</p>
      </td></tr>
    </table>` : `
    <p style="margin:0 0 12px;color:#1e293b;font-size:13px;font-weight:600;">Payment options:</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        ${p.bpayBillerCode ? `
        <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">BPAY</p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;">Biller Code: <span style="font-family:Courier New,monospace;color:#1e293b;font-weight:700;">${p.bpayBillerCode}</span></p>
        <p style="margin:0 0 12px;color:#64748b;font-size:12px;">Reference: <span style="font-family:Courier New,monospace;color:#1e293b;font-weight:700;">${bpayRef}</span></p>
        ` : ''}
        <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">EFT Transfer</p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;">${p.bankName ?? ''} &middot; BSB: <span style="font-family:Courier New,monospace;">${p.bankBSB ?? ''}</span> &middot; Account: <span style="font-family:Courier New,monospace;">${p.bankAccount ?? ''}</span></p>
        <p style="margin:0;color:#64748b;font-size:12px;">Account Name: ${p.bankAccountName ?? ''} &middot; Reference: <span style="font-family:Courier New,monospace;">${p.invoiceNumber}</span></p>
      </td></tr>
    </table>`}

    ${p.portalUrl ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td>
      <a href="${p.portalUrl}" style="display:block;text-align:center;background-color:#dc2626;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 20px;border-radius:10px;">
        View Invoice &amp; Pay Now
      </a>
    </td></tr></table>` : ''}

    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
      If you have already paid, please disregard this notice. Questions? Contact us at
      <a href="mailto:${p.companyEmail}" style="color:#4f46e5;text-decoration:none;">${p.companyEmail}</a> or ${p.companyPhone}.
    </p>
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
    const p: OverdueReminderPayload = await req.json()
    const urgency = p.daysPastDue >= 14 ? 'FINAL NOTICE' : 'Payment Reminder'
    const result = await resend.emails.send({
      from: `${p.companyName} <${p.fromEmail}>`,
      to: [p.to],
      subject: `${urgency}: Invoice ${p.invoiceNumber} — ${p.total.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} overdue`,
      html: buildReminderEmail(p),
    })
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
