import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ElectricityInvoice, Customer, Apartment, Building, ElectricitySettings } from '@/lib/electricityTypes'
import { formatAUD, formatDate, monthName, usageColor } from '@/lib/electricityUtils'

const C = {
  dark:       '#0c1120',
  primary:    '#4f46e5',
  primaryL:   '#eef2ff',
  primaryMid: '#818cf8',
  success:    '#10b981',
  warning:    '#f59e0b',
  danger:     '#ef4444',
  text:       '#0f172a',
  muted:      '#64748b',
  subtle:     '#94a3b8',
  border:     '#e2e8f0',
  light:      '#f8fafc',
  white:      '#ffffff',
}

const S = StyleSheet.create({
  page:         { fontFamily: 'Helvetica', fontSize: 9, color: C.text, backgroundColor: C.white },
  // Header
  header:       { backgroundColor: C.dark, paddingHorizontal: 36, paddingVertical: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft:   { flex: 1 },
  companyName:  { fontFamily: 'Helvetica-Bold', fontSize: 15, color: C.white, marginBottom: 3 },
  companyLine:  { fontSize: 8, color: '#94a3b8', marginBottom: 1 },
  invoiceTitle: { fontFamily: 'Helvetica-Bold', fontSize: 30, color: C.white, letterSpacing: 2 },
  invoiceNum:   { fontFamily: 'Courier', fontSize: 10, color: C.primaryMid, marginTop: 4, textAlign: 'right' },
  // Status badge
  badgePaid:    { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-end' },
  badgeSent:    { backgroundColor: C.primary,  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-end' },
  badgeOverdue: { backgroundColor: '#dc2626',  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-end' },
  badgeDraft:   { backgroundColor: '#475569',  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-end' },
  badgeText:    { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, letterSpacing: 1 },
  finalBadge:   { backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-end' },
  // Strip
  strip:        { backgroundColor: C.primary, paddingHorizontal: 36, paddingVertical: 10, flexDirection: 'row', gap: 32 },
  stripItem:    { marginRight: 32 },
  stripLabel:   { fontSize: 7, color: '#a5b4fc', letterSpacing: 1, marginBottom: 2 },
  stripValue:   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.white },
  // Two-col section
  twoCol:       { flexDirection: 'row', paddingHorizontal: 36, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  col:          { flex: 1, marginRight: 20 },
  colLabel:     { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.subtle, letterSpacing: 1, marginBottom: 8 },
  colName:      { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.text, marginBottom: 4 },
  colLine:      { fontSize: 9, color: C.muted, marginBottom: 2 },
  colMeta:      { fontSize: 7, color: C.subtle, marginTop: 2 },
  // Section
  section:      { paddingHorizontal: 36, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionBg:    { paddingHorizontal: 36, paddingVertical: 16, backgroundColor: C.light, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.subtle, letterSpacing: 1, marginBottom: 10 },
  // Meter reading boxes
  readingRow:   { flexDirection: 'row', gap: 8 },
  readingBox:   { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10, alignItems: 'center', marginRight: 8 },
  readingBoxHL: { flex: 1, backgroundColor: C.primary, borderRadius: 6, padding: 10, alignItems: 'center' },
  readingLabel: { fontSize: 7, color: C.subtle, marginBottom: 4 },
  readingValue: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.text },
  readingUnit:  { fontSize: 7, color: C.subtle, marginTop: 2 },
  readingValueW:{ fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.white },
  readingLabelW:{ fontSize: 7, color: '#a5b4fc', marginBottom: 4 },
  readingUnitW: { fontSize: 7, color: '#a5b4fc', marginTop: 2 },
  // Charges table
  tableRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.border },
  tableRowLast: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  tableLabel:   { fontSize: 9, color: C.muted },
  tableLabelB:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text },
  tableNote:    { fontSize: 7, color: C.subtle, marginTop: 1 },
  tableAmt:     { fontFamily: 'Courier', fontSize: 9, color: C.text },
  tableAmtB:    { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.text },
  // Total box
  totalBox:     { backgroundColor: C.primary, borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  totalLabel:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#a5b4fc' },
  totalSub:     { fontSize: 7, color: '#a5b4fc', marginTop: 2 },
  totalAmount:  { fontFamily: 'Helvetica-Bold', fontSize: 24, color: C.white },
  totalDue:     { fontSize: 7, color: '#a5b4fc', marginTop: 2, textAlign: 'right' },
  // Payment info
  payBox:       { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, marginBottom: 8 },
  payBoxHL:     { borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: C.primaryL, borderRadius: 6, padding: 12, marginBottom: 8 },
  payTitle:     { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.text, marginBottom: 4 },
  payTitleHL:   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#3730a3', marginBottom: 4 },
  payLine:      { fontSize: 8, color: C.muted, marginBottom: 2 },
  payLineHL:    { fontSize: 8, color: '#4338ca', marginBottom: 2 },
  payMono:      { fontFamily: 'Courier', fontSize: 8 },
  twoColPay:    { flexDirection: 'row', gap: 8 },
  colPay:       { flex: 1, marginRight: 8 },
  // Footer
  footer:       { backgroundColor: C.light, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 36, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText:   { fontSize: 7, color: C.subtle },
  footerMono:   { fontFamily: 'Courier', fontSize: 7, color: C.border },
})

interface UsageHistoryItem {
  month: number
  year: number
  usage: number | null
  label: string
}

interface Props {
  invoice:       ElectricityInvoice
  customer:      Customer
  apt:           Apartment
  building:      Building
  settings:      ElectricitySettings
  usageHistory:  UsageHistoryItem[]
}

function statusBadge(status: string, isFinalBill?: boolean) {
  const map: Record<string, typeof S.badgePaid> = {
    paid: S.badgePaid, sent: S.badgeSent, overdue: S.badgeOverdue, draft: S.badgeDraft, cancelled: S.badgeDraft,
  }
  return (
    <View>
      <View style={map[status] ?? S.badgeDraft}>
        <Text style={S.badgeText}>{status.toUpperCase()}</Text>
      </View>
      {isFinalBill && (
        <View style={S.finalBadge}>
          <Text style={S.badgeText}>FINAL BILL</Text>
        </View>
      )}
    </View>
  )
}

function BarChart({ history, low, high }: { history: UsageHistoryItem[]; low: number; high: number }) {
  const maxUsage = Math.max(...history.map(h => h.usage ?? 0), low + high)
  const chartH = 55

  return (
    <View style={{ flexDirection: 'row', height: chartH + 18, alignItems: 'flex-end' }}>
      {history.map((item, i) => {
        const barH = item.usage ? Math.max(2, (item.usage / maxUsage) * chartH) : 2
        const spacer = chartH - barH
        const color = item.usage ? usageColor(item.usage, low, high) : C.border
        const parts = item.label.split(' ')
        const lbl = parts[0].slice(0, 3)

        return (
          <View key={i} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', marginRight: i < 11 ? 2 : 0 }}>
            <View style={{ height: spacer }} />
            <View style={{ width: '90%', height: barH, backgroundColor: color, borderRadius: 1 }} />
            <Text style={{ fontSize: 5, color: C.subtle, marginTop: 2, textAlign: 'center' }}>{lbl}</Text>
          </View>
        )
      })}
    </View>
  )
}

export default function InvoicePDF({ invoice, customer, apt, building, settings, usageHistory }: Props) {
  const avgUsage = Math.round(
    usageHistory.filter(h => h.usage !== null).reduce((s, h) => s + (h.usage ?? 0), 0) /
    Math.max(1, usageHistory.filter(h => h.usage !== null).length)
  )

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <View style={S.headerLeft}>
            <Text style={S.companyName}>{settings.companyName}</Text>
            <Text style={S.companyLine}>Electricity Billing Services</Text>
            <Text style={S.companyLine}>{settings.address}, {settings.suburb} {settings.state} {settings.postcode}</Text>
            <Text style={S.companyLine}>ABN {settings.abn} · {settings.phone}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.invoiceTitle}>INVOICE</Text>
            <Text style={S.invoiceNum}>{invoice.invoiceNumber}</Text>
            {statusBadge(invoice.status, invoice.isFinalBill)}
          </View>
        </View>

        {/* Strip */}
        <View style={S.strip}>
          {[
            { label: 'INVOICE DATE', value: formatDate(invoice.issueDate) },
            { label: 'DUE DATE',     value: formatDate(invoice.dueDate) },
            { label: 'PERIOD',       value: monthName(invoice.month, invoice.year) },
            ...(invoice.status === 'paid' && invoice.paidDate
              ? [{ label: 'PAID ON', value: formatDate(invoice.paidDate) }]
              : []),
          ].map(item => (
            <View key={item.label} style={S.stripItem}>
              <Text style={S.stripLabel}>{item.label}</Text>
              <Text style={S.stripValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Bill To / Property */}
        <View style={S.twoCol}>
          <View style={S.col}>
            <Text style={S.colLabel}>BILLED TO</Text>
            <Text style={S.colName}>{customer.firstName} {customer.lastName}</Text>
            <Text style={S.colLine}>{customer.email}</Text>
            <Text style={S.colLine}>{customer.phone}</Text>
            <Text style={S.colMeta}>Account: {customer.myobCardId}</Text>
            <Text style={S.colMeta}>Move-in: {customer.moveInDate}</Text>
            {invoice.isFinalBill && customer.moveOutDate && (
              <Text style={{ ...S.colMeta, color: C.danger }}>Move-out: {customer.moveOutDate}</Text>
            )}
          </View>
          <View style={S.col}>
            <Text style={S.colLabel}>PROPERTY</Text>
            <Text style={S.colName}>{building.name}</Text>
            <Text style={S.colLine}>Unit {apt.unitNumber}, Level {apt.floor}</Text>
            <Text style={S.colLine}>{building.address}</Text>
            <Text style={S.colLine}>{building.suburb} {building.state} {building.postcode}</Text>
            <Text style={S.colMeta}>Meter: {apt.meterNumber}</Text>
            <Text style={S.colMeta}>
              Billing: {invoice.billingPeriodStart} → {invoice.billingPeriodEnd} ({invoice.daysInPeriod} days)
            </Text>
          </View>
        </View>

        {/* 12-Month Usage History */}
        <View style={S.sectionBg}>
          <Text style={S.sectionLabel}>12-MONTH USAGE HISTORY</Text>
          <BarChart history={usageHistory} low={building.lowUsageThreshold} high={building.highUsageThreshold} />
          <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
            {[
              { color: '#10b981', label: `Low (<${building.lowUsageThreshold} kWh)` },
              { color: '#4f46e5', label: 'Normal' },
              { color: '#f59e0b', label: `High (>${building.highUsageThreshold} kWh)` },
              { color: '#e2e8f0', label: 'No data' },
            ].map(l => (
              <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <View style={{ width: 8, height: 8, backgroundColor: l.color, borderRadius: 2, marginRight: 3 }} />
                <Text style={{ fontSize: 6, color: C.subtle }}>{l.label}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 6, color: C.subtle, marginLeft: 'auto' }}>
              Historical avg: {avgUsage} kWh/month
            </Text>
          </View>
        </View>

        {/* Meter Readings */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>METER READINGS</Text>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ ...S.readingBox, marginRight: 8 }}>
              <Text style={S.readingLabel}>PREVIOUS READING</Text>
              <Text style={S.readingValue}>{invoice.previousReading.toLocaleString()}</Text>
              <Text style={S.readingUnit}>kWh</Text>
            </View>
            <View style={{ ...S.readingBox, marginRight: 8 }}>
              <Text style={S.readingLabel}>CURRENT READING</Text>
              <Text style={S.readingValue}>{invoice.currentReading.toLocaleString()}</Text>
              <Text style={S.readingUnit}>kWh</Text>
            </View>
            <View style={S.readingBoxHL}>
              <Text style={S.readingLabelW}>USAGE THIS MONTH</Text>
              <Text style={S.readingValueW}>{invoice.usage.toLocaleString()}</Text>
              <Text style={S.readingUnitW}>kWh consumed</Text>
            </View>
          </View>
        </View>

        {/* Charges */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>CHARGES</Text>
          <View style={S.tableRow}>
            <View>
              <Text style={S.tableLabelB}>Electricity usage</Text>
              <Text style={S.tableNote}>{invoice.usage.toLocaleString()} kWh × {(invoice.ratePerKwh * 100).toFixed(2)}¢/kWh</Text>
            </View>
            <Text style={S.tableAmtB}>{formatAUD(invoice.usageCharge)}</Text>
          </View>
          <View style={S.tableRow}>
            <View>
              <Text style={S.tableLabelB}>Daily supply charge</Text>
              <Text style={S.tableNote}>{invoice.daysInPeriod} days × ${settings.tariff.dailySupplyCharge.toFixed(4)}/day</Text>
            </View>
            <Text style={S.tableAmtB}>{formatAUD(invoice.supplyCharge)}</Text>
          </View>
          <View style={S.tableRow}>
            <Text style={S.tableLabel}>Subtotal (excl. GST)</Text>
            <Text style={S.tableAmt}>{formatAUD(invoice.subtotal)}</Text>
          </View>
          <View style={S.tableRowLast}>
            <Text style={S.tableLabel}>GST ({(settings.tariff.gstRate * 100).toFixed(0)}%)</Text>
            <Text style={S.tableAmt}>{formatAUD(invoice.gst)}</Text>
          </View>
          <View style={S.totalBox}>
            <View>
              <Text style={S.totalLabel}>{invoice.isFinalBill ? 'FINAL AMOUNT DUE' : 'TOTAL AMOUNT DUE'}</Text>
              <Text style={S.totalSub}>Including GST · AUD</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={S.totalAmount}>{formatAUD(invoice.total)}</Text>
              <Text style={S.totalDue}>Due {formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={S.section}>
          <Text style={S.sectionLabel}>PAYMENT INFORMATION</Text>
          <View style={S.twoColPay}>
            <View style={S.colPay}>
              {customer.paymentMethod === 'direct_debit' && (
                <View style={S.payBoxHL}>
                  <Text style={S.payTitleHL}>Direct Debit (DDR)</Text>
                  <Text style={S.payLineHL}>{formatAUD(invoice.total)} will be automatically debited on {formatDate(invoice.dueDate)}</Text>
                  <Text style={S.payLineHL}>From: {customer.accountName}</Text>
                  <Text style={[S.payLineHL, { fontFamily: 'Courier' }]}>BSB: {customer.bsb}  Acc: {customer.accountNumber}</Text>
                </View>
              )}
              {settings.bpayBillerCode && (
                <View style={S.payBox}>
                  <Text style={S.payTitle}>BPAY</Text>
                  <Text style={S.payLine}>Biller Code: <Text style={S.payMono}>{settings.bpayBillerCode}</Text></Text>
                  <Text style={S.payLine}>Reference: <Text style={S.payMono}>{invoice.invoiceNumber.replace(/-/g,'')}</Text></Text>
                </View>
              )}
            </View>
            <View style={S.colPay}>
              <View style={S.payBox}>
                <Text style={S.payTitle}>EFT Transfer</Text>
                <Text style={S.payLine}>Bank: {settings.bankName}</Text>
                <Text style={S.payLine}>BSB: <Text style={S.payMono}>{settings.bsb}</Text></Text>
                <Text style={S.payLine}>Account: <Text style={S.payMono}>{settings.accountNumber}</Text></Text>
                <Text style={S.payLine}>Name: {settings.accountName}</Text>
                <Text style={S.payLine}>Reference: <Text style={S.payMono}>{invoice.invoiceNumber}</Text></Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer}>
          <Text style={S.footerText}>
            {settings.companyName} · ABN {settings.abn} · {settings.email} · {settings.phone} · {settings.website}
          </Text>
          <Text style={S.footerMono}>{invoice.invoiceNumber}</Text>
        </View>

      </Page>
    </Document>
  )
}
