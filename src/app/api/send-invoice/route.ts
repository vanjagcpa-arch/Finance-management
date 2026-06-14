import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SendInvoicePayload {
  // Recipient
  to: string
  customerFirstName: string
  isDDR: boolean
  customerBSB?: string
  customerAccount?: string
  customerAccountName?: string
  // Invoice
  invoiceNumber: string
  period: string
  issueDate: string
  dueDate: string
  isFinalBill: boolean
  usage: number
  usageCharge: number
  supplyCharge: number
  subtotal: number
  gst: number
  total: number
  ratePerKwh: number
  dailySupplyCharge: number
  daysInPeriod: number
  gstRate: number
  // Company / settings
  companyName: string
  fromEmail: string
  companyEmail: string
  companyPhone: string
  companyABN: string
  bpayBillerCode: string
  bankBSB: string
  bankAccount: string
  bankAccountName: string
  bankName: string
  // PDF (single-send only)
  pdfBase64?: string
  pdfFilename: string
  // Tenant portal
  portalUrl?: string
}

// ── Formatters ────────────────────────────────────────────────────────────────
const aud  = (n: number) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
const date = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

// ── HTML email builder ────────────────────────────────────────────────────────
function buildEmail(p: SendInvoicePayload): string {
  const hasPDF   = !!p.pdfBase64
  const rateDisp = (p.ratePerKwh * 100).toFixed(2)
  const gstPct   = (p.gstRate * 100).toFixed(0)
  const bpayRef  = p.invoiceNumber.replace(/-/g, '')

  const ddrBlock = p.isDDR ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#eef2ff;border:1px solid #e0e7ff;border-radius:10px;margin:24px 0 0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;color:#3730a3;font-size:13px;font-weight:700;">&#10003; Direct Debit Scheduled</p>
        <p style="margin:0 0 4px;color:#4338ca;font-size:13px;">${aud(p.total)} will be automatically debited on ${date(p.dueDate)}</p>
        <p style="margin:0;color:#6366f1;font-size:12px;">${p.customerAccountName ?? ''} &middot; BSB: ${p.customerBSB ?? ''} &middot; Account: ${p.customerAccount ?? ''}</p>
        <p style="margin:6px 0 0;color:#818cf8;font-size:11px;">No action required &mdash; we will handle this automatically.</p>
      </td></tr>
    </table>` : ''

  const paymentBlock = p.isDDR ? ddrBlock : `
    ${ddrBlock}
    <p style="margin:24px 0 12px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Payment Options</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr valign="top">
        ${p.bpayBillerCode ? `
        <td width="48%" style="padding-right:8px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 8px;color:#1e293b;font-size:12px;font-weight:700;">BPAY</p>
              <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Biller Code: <span style="font-family:Courier New,monospace;color:#1e293b;font-weight:600;">${p.bpayBillerCode}</span></p>
              <p style="margin:0;color:#64748b;font-size:12px;">Reference: <span style="font-family:Courier New,monospace;color:#1e293b;font-weight:600;">${bpayRef}</span></p>
            </td></tr>
          </table>
        </td>
        <td width="4%"></td>` : ''}
        <td width="${p.bpayBillerCode ? '48%' : '100%'}">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 8px;color:#1e293b;font-size:12px;font-weight:700;">EFT Transfer</p>
              <p style="margin:0 0 3px;color:#64748b;font-size:12px;">${p.bankName}</p>
              <p style="margin:0 0 3px;color:#64748b;font-size:12px;">BSB: <span style="font-family:Courier New,monospace;color:#1e293b;">${p.bankBSB}</span></p>
              <p style="margin:0 0 3px;color:#64748b;font-size:12px;">Account: <span style="font-family:Courier New,monospace;color:#1e293b;">${p.bankAccount}</span></p>
              <p style="margin:0 0 3px;color:#64748b;font-size:12px;">Name: <span style="color:#1e293b;">${p.bankAccountName}</span></p>
              <p style="margin:0;color:#64748b;font-size:12px;">Reference: <span style="font-family:Courier New,monospace;color:#1e293b;">${p.invoiceNumber}</span></p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${p.invoiceNumber}</title>
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
                  <p style="margin:0;color:#a5b4fc;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Invoice</p>
                  <p style="margin:3px 0 0;color:#ffffff;font-size:13px;font-weight:600;font-family:Courier New,monospace;">${p.invoiceNumber}</p>
                </td>
                <td style="padding-right:32px;">
                  <p style="margin:0;color:#a5b4fc;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Billing Period</p>
                  <p style="margin:3px 0 0;color:#ffffff;font-size:13px;font-weight:600;">${p.period}</p>
                </td>
                <td>
                  <p style="margin:0;color:#a5b4fc;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Due Date</p>
                  <p style="margin:3px 0 0;color:#ffffff;font-size:13px;font-weight:600;">${date(p.dueDate)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;color:#1e293b;font-size:15px;">Dear ${p.customerFirstName},</p>
            <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.65;">
              ${p.isFinalBill
                ? 'Your final electricity bill is enclosed below.'
                : `Your electricity invoice for <strong style="color:#334155;">${p.period}</strong> is ready.`}
              ${hasPDF ? ' Your invoice PDF is attached to this email for your records.' : ''}
            </p>

            <!-- Amount box -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#4f46e5;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:24px 28px;">
                <p style="margin:0;color:#a5b4fc;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">
                  ${p.isFinalBill ? 'Final Amount Due' : 'Total Amount Due'}
                </p>
                <p style="margin:6px 0 4px;color:#ffffff;font-size:40px;font-weight:800;letter-spacing:-1.5px;line-height:1;">${aud(p.total)}</p>
                <p style="margin:0;color:#a5b4fc;font-size:13px;">Due by ${date(p.dueDate)} &middot; Including GST &middot; AUD</p>
              </td></tr>
            </table>

            <!-- Charges -->
            <p style="margin:0 0 12px;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Charges Summary</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:10px 0;color:#334155;font-size:14px;border-bottom:1px solid #e2e8f0;">
                  Electricity usage
                  <span style="color:#94a3b8;font-size:12px;margin-left:6px;">${p.usage.toLocaleString()} kWh &times; ${rateDisp}&#162;/kWh</span>
                </td>
                <td style="padding:10px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #e2e8f0;">${aud(p.usageCharge)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#334155;font-size:14px;border-bottom:1px solid #e2e8f0;">
                  Daily supply charge
                  <span style="color:#94a3b8;font-size:12px;margin-left:6px;">${p.daysInPeriod} days</span>
                </td>
                <td style="padding:10px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #e2e8f0;">${aud(p.supplyCharge)}</td>
              </tr>
              <tr>
                <td style="padding:9px 0;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Subtotal (excl. GST)</td>
                <td style="padding:9px 0;color:#64748b;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0;">${aud(p.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:9px 0;color:#64748b;font-size:13px;">GST (${gstPct}%)</td>
                <td style="padding:9px 0;color:#64748b;font-size:13px;text-align:right;">${aud(p.gst)}</td>
              </tr>
            </table>

            <!-- Payment info -->
            ${paymentBlock}

            <!-- Portal link -->
            ${p.portalUrl ? `
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0;">
              <tr><td style="text-align:center;padding:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">View Invoice Online</p>
                <p style="margin:0 0 12px;color:#64748b;font-size:12px;">Access your account, view usage history, and download invoices anytime.</p>
                <a href="${p.portalUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;">View Invoice Online</a>
              </td></tr>
            </table>` : ''}

            <!-- Contact -->
            <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Questions about this invoice? Contact us at
              <a href="mailto:${p.companyEmail}" style="color:#4f46e5;text-decoration:none;">${p.companyEmail}</a>
              or call ${p.companyPhone}.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">${p.companyName} &middot; ABN ${p.companyABN} &middot; ${p.companyEmail} &middot; ${p.companyPhone}</p>
            <p style="margin:4px 0 0;color:#cbd5e1;font-size:10px;font-family:Courier New,monospace;">${p.invoiceNumber}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured. Add it to your environment variables.' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const payload: SendInvoicePayload = await req.json()

    const attachments = payload.pdfBase64
      ? [{ filename: payload.pdfFilename, content: Buffer.from(payload.pdfBase64, 'base64') }]
      : []

    const { data, error } = await resend.emails.send({
      from: `${payload.companyName} <${payload.fromEmail}>`,
      to:   [payload.to],
      subject: `${payload.isFinalBill ? 'Final Electricity Bill' : 'Electricity Invoice'} ${payload.invoiceNumber} — ${payload.period}`,
      html: buildEmail(payload),
      attachments,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
