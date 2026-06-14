import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { ElectricityInvoice, Customer, Apartment, Building, ElectricitySettings } from '@/lib/electricityTypes'
import { formatAUD, formatDate, monthName, usageColor } from '@/lib/electricityUtils'

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.woff', fontWeight: 400 },
    { src: '/fonts/Inter-SemiBold.woff', fontWeight: 600 },
    { src: '/fonts/Inter-Bold.woff', fontWeight: 700 },
  ],
})

const C = {
  dark:     '#0c1120',
  primary:  '#4f46e5',
  primaryL: '#eef2ff',
  primaryD: '#818cf8',
  primaryX: '#a5b4fc',
  indigo50: '#eef2ff',
  indigo100:'#e0e7ff',
  indigo700:'#4338ca',
  indigo900:'#312e81',
  success:  '#059669',
  warning:  '#f59e0b',
  danger:   '#dc2626',
  text:     '#0f172a',
  text2:    '#1e293b',
  muted:    '#64748b',
  subtle:   '#94a3b8',
  border:   '#e2e8f0',
  border2:  '#cbd5e1',
  light:    '#f8fafc',
  mid:      '#f1f5f9',
  white:    '#ffffff',
}

const S = StyleSheet.create({
  page: { fontFamily: 'Inter', fontWeight: 400, fontSize: 9, color: C.text, backgroundColor: C.white },

  // ── Header ──────────────────────────────────────────────────────────────
  header:       { backgroundColor: C.dark, paddingHorizontal: 36, paddingVertical: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyName:  { fontWeight: 700, fontSize: 14, color: C.white, marginBottom: 3 },
  companyDetail:{ fontSize: 7.5, color: '#94a3b8', marginBottom: 1.5 },
  invoiceTitle: { fontWeight: 700, fontSize: 30, color: C.white },
  invoiceNum:   { fontSize: 9.5, fontWeight: 600, color: C.primaryD, marginTop: 5, textAlign: 'right' },

  // ── Status badges ────────────────────────────────────────────────────────
  badgePaid:    { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 7, alignSelf: 'flex-end' },
  badgeSent:    { backgroundColor: C.primary,  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 7, alignSelf: 'flex-end' },
  badgeOverdue: { backgroundColor: '#dc2626',  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 7, alignSelf: 'flex-end' },
  badgeDraft:   { backgroundColor: '#475569',  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 7, alignSelf: 'flex-end' },
  badgeFinal:   { backgroundColor: '#dc2626',  borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,  alignSelf: 'flex-end' },
  badgeText:    { fontWeight: 700, fontSize: 6.5, color: C.white, letterSpacing: 0.6 },

  // ── Indigo strip ─────────────────────────────────────────────────────────
  strip:      { backgroundColor: C.primary, paddingHorizontal: 36, paddingVertical: 10, flexDirection: 'row' },
  stripItem:  { marginRight: 36 },
  stripLabel: { fontSize: 6.5, fontWeight: 600, color: C.primaryX, letterSpacing: 0.7, marginBottom: 2 },
  stripValue: { fontSize: 9, fontWeight: 600, color: C.white },

  // ── Bill To / Property ───────────────────────────────────────────────────
  twoCol:     { flexDirection: 'row', paddingHorizontal: 36, paddingVertical: 22, borderBottomWidth: 1, borderBottomColor: C.border },
  col:        { flex: 1 },
  colDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 24 },
  colHead:    { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  colLabel:   { fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.8 },
  colName:    { fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 4 },
  colLine:    { fontSize: 8.5, color: C.muted, marginBottom: 2 },
  colMeta:    { fontSize: 7, color: C.subtle, marginTop: 2 },
  colMetaRed: { fontSize: 7, color: C.danger, marginTop: 2, fontWeight: 600 },

  // ── Shared section wrapper ───────────────────────────────────────────────
  section:    { paddingHorizontal: 36, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionAlt: { paddingHorizontal: 36, paddingVertical: 16, backgroundColor: C.light, borderBottomWidth: 1, borderBottomColor: C.border },
  sLabel:     { fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.8, marginBottom: 12 },

  // ── Meter reading boxes ──────────────────────────────────────────────────
  readRow:    { flexDirection: 'row', gap: 8 },
  readBox:    { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  readBoxHL:  { flex: 1, backgroundColor: C.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  readLabel:  { fontSize: 6.5, fontWeight: 600, color: C.subtle, letterSpacing: 0.5, marginBottom: 5 },
  readLabelW: { fontSize: 6.5, fontWeight: 600, color: C.primaryX, letterSpacing: 0.5, marginBottom: 5 },
  readVal:    { fontWeight: 700, fontSize: 19, color: C.text },
  readValW:   { fontWeight: 700, fontSize: 19, color: C.white },
  readUnit:   { fontSize: 7, color: C.subtle, marginTop: 2 },
  readUnitW:  { fontSize: 7, color: C.primaryX, marginTop: 2 },
  deltaRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  deltaText:  { fontSize: 7.5, fontWeight: 600 },
  deltaBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  deltaBadgeText: { fontSize: 6.5, fontWeight: 600 },

  // ── Charges table ────────────────────────────────────────────────────────
  chargeRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  chargeLast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6 },
  chargeL:    { fontSize: 9, fontWeight: 600, color: C.text2 },
  chargeNote: { fontSize: 7, color: C.subtle, marginTop: 2 },
  chargeSub:  { fontSize: 9, color: C.muted },
  chargeAmt:  { fontSize: 9, fontWeight: 600, color: C.text2, textAlign: 'right' },
  chargeAmtS: { fontSize: 9, color: C.muted, textAlign: 'right' },

  // ── Total amount box ─────────────────────────────────────────────────────
  totalBox:   { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  totalHead:  { fontSize: 9, fontWeight: 600, color: C.primaryX },
  totalSub:   { fontSize: 7, color: C.primaryX, marginTop: 2 },
  totalAmt:   { fontWeight: 700, fontSize: 28, color: C.white, textAlign: 'right' },
  totalDue:   { fontSize: 7, color: C.primaryX, marginTop: 2, textAlign: 'right' },

  // ── Usage history chart ──────────────────────────────────────────────────
  chartLegendRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  chartLegendDot:  { width: 8, height: 8, borderRadius: 2, marginRight: 3 },
  chartLegendText: { fontSize: 6.5, color: C.subtle },
  chartAvgText:    { fontSize: 6.5, color: C.subtle },

  // ── Payment info ─────────────────────────────────────────────────────────
  payGrid:    { flexDirection: 'row', gap: 8 },
  payCol:     { flex: 1 },
  payBox:     { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: C.white },
  payBoxHL:   { borderWidth: 1, borderColor: C.indigo100, backgroundColor: C.indigo50, borderRadius: 8, padding: 10, marginBottom: 8 },
  payTitle:   { fontWeight: 700, fontSize: 8.5, color: C.text, marginBottom: 5 },
  payTitleHL: { fontWeight: 700, fontSize: 8.5, color: C.indigo700, marginBottom: 5 },
  payLine:    { fontSize: 7.5, color: C.muted, marginBottom: 2 },
  payLineHL:  { fontSize: 7.5, color: C.indigo700, marginBottom: 2 },
  payMono:    { fontFamily: 'Courier', fontSize: 7.5 },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer:     { backgroundColor: C.light, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 36, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 6.5, color: C.subtle },
  footerMono: { fontSize: 6.5, fontFamily: 'Courier', color: C.border2 },
})

interface UsageHistoryItem { month: number; year: number; usage: number | null; label: string }
interface Props {
  invoice:      ElectricityInvoice
  customer:     Customer
  apt:          Apartment
  building:     Building
  settings:     ElectricitySettings
  usageHistory: UsageHistoryItem[]
}

function StatusBadges({ status, isFinalBill }: { status: string; isFinalBill?: boolean }) {
  const badge = status === 'paid' ? S.badgePaid : status === 'sent' ? S.badgeSent : status === 'overdue' ? S.badgeOverdue : S.badgeDraft
  return (
    <View>
      <View style={badge}><Text style={S.badgeText}>{status.toUpperCase()}</Text></View>
      {isFinalBill && <View style={S.badgeFinal}><Text style={S.badgeText}>FINAL BILL</Text></View>}
    </View>
  )
}

function BarChart({ history, low, high, currentMonth, currentYear }: { history: UsageHistoryItem[]; low: number; high: number; currentMonth: number; currentYear: number }) {
  const maxUsage = Math.max(...history.map(h => h.usage ?? 0), 1, low + high)
  const chartH = 60

  return (
    <View>
      <View style={{ flexDirection: 'row', height: chartH, alignItems: 'flex-end' }}>
        {history.map((item, i) => {
          const isCurrent = item.month === currentMonth && item.year === currentYear
          const barH = item.usage ? Math.max(2, (item.usage / maxUsage) * chartH) : 2
          const spacer = chartH - barH
          const color = item.usage ? usageColor(item.usage, low, high) : C.border
          return (
            <View key={i} style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
              <View style={{ height: spacer }} />
              <View style={{
                width: isCurrent ? '92%' : '74%',
                height: barH,
                backgroundColor: color,
                borderRadius: 2,
                opacity: isCurrent ? 1 : 0.68,
              }} />
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {history.map((item, i) => {
          const lbl = item.label.split("'")[0].trim().slice(0, 3)
          const isCurrent = item.month === currentMonth && item.year === currentYear
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 5, color: isCurrent ? C.primary : C.subtle, fontWeight: isCurrent ? 700 : 400 }}>{lbl}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function InvoicePDF({ invoice, customer, apt, building, settings, usageHistory }: Props) {
  const filledHistory = usageHistory.filter(h => h.usage !== null)
  const avgUsage = filledHistory.length
    ? Math.round(filledHistory.reduce((s, h) => s + (h.usage ?? 0), 0) / filledHistory.length)
    : invoice.usage

  const usageDelta = invoice.usage - avgUsage
  const low  = building.lowUsageThreshold
  const high = building.highUsageThreshold

  const usageCategory = invoice.usage < low ? 'Low user' : invoice.usage > high ? 'High user' : 'Normal usage'
  const usageCategoryColor = invoice.usage < low ? '#059669' : invoice.usage > high ? '#d97706' : C.primary

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── 1. Header ───────────────────────────────────────────────── */}
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.companyName}>{settings.companyName}</Text>
            <Text style={S.companyDetail}>Electricity Billing Services</Text>
            <Text style={S.companyDetail}>{settings.address}, {settings.suburb} {settings.state} {settings.postcode}</Text>
            <Text style={S.companyDetail}>ABN {settings.abn} · {settings.phone}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.invoiceTitle}>INVOICE</Text>
            <Text style={S.invoiceNum}>{invoice.invoiceNumber}</Text>
            <StatusBadges status={invoice.status} isFinalBill={invoice.isFinalBill} />
          </View>
        </View>

        {/* ── 2. Indigo meta strip ────────────────────────────────────── */}
        <View style={S.strip}>
          {[
            { label: 'INVOICE DATE', value: formatDate(invoice.issueDate) },
            { label: 'DUE DATE',     value: formatDate(invoice.dueDate) },
            { label: 'BILLING PERIOD', value: monthName(invoice.month, invoice.year) },
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

        {/* ── 3. Bill To / Property ───────────────────────────────────── */}
        <View style={S.twoCol}>
          <View style={S.col}>
            <View style={S.colHead}>
              <Text style={S.colLabel}>BILLED TO</Text>
            </View>
            <Text style={S.colName}>{customer.firstName} {customer.lastName}</Text>
            <Text style={S.colLine}>{customer.email}</Text>
            <Text style={S.colLine}>{customer.phone}</Text>
            <Text style={S.colMeta}>Account: {customer.myobCardId}</Text>
            <Text style={S.colMeta}>Move-in: {customer.moveInDate}</Text>
            {invoice.isFinalBill && customer.moveOutDate && (
              <Text style={S.colMetaRed}>Move-out: {customer.moveOutDate}</Text>
            )}
          </View>

          <View style={S.colDivider} />

          <View style={[S.col, { marginLeft: 0 }]}>
            <View style={S.colHead}>
              <Text style={S.colLabel}>PROPERTY</Text>
            </View>
            <Text style={S.colName}>{building.name}</Text>
            <Text style={S.colLine}>Unit {apt.unitNumber}, Level {apt.floor}</Text>
            <Text style={S.colLine}>{building.address}</Text>
            <Text style={S.colLine}>{building.suburb} {building.state} {building.postcode}</Text>
            <Text style={S.colMeta}>Meter: {apt.meterNumber}</Text>
            <Text style={S.colMeta}>
              Period: {invoice.billingPeriodStart} → {invoice.billingPeriodEnd} ({invoice.daysInPeriod} days)
            </Text>
          </View>
        </View>

        {/* ── 4. Meter Readings ────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sLabel}>METER READINGS</Text>
          <View style={S.readRow}>
            <View style={[S.readBox, { marginRight: 8 }]}>
              <Text style={S.readLabel}>PREVIOUS READING</Text>
              <Text style={S.readVal}>{invoice.previousReading.toLocaleString()}</Text>
              <Text style={S.readUnit}>kWh</Text>
            </View>
            <View style={[S.readBox, { marginRight: 8 }]}>
              <Text style={S.readLabel}>CURRENT READING</Text>
              <Text style={S.readVal}>{invoice.currentReading.toLocaleString()}</Text>
              <Text style={S.readUnit}>kWh</Text>
            </View>
            <View style={S.readBoxHL}>
              <Text style={S.readLabelW}>USAGE THIS PERIOD</Text>
              <Text style={S.readValW}>{invoice.usage.toLocaleString()}</Text>
              <Text style={S.readUnitW}>kWh consumed</Text>
            </View>
          </View>
          <View style={S.deltaRow}>
            <Text style={[S.deltaText, { color: usageDelta > 0 ? '#d97706' : '#059669' }]}>
              {usageDelta > 0 ? `▲ ${usageDelta} kWh above` : `▼ ${Math.abs(usageDelta)} kWh below`} 12-month average
            </Text>
            <View style={[S.deltaBadge, { backgroundColor: usageDelta > 0 ? '#fef3c7' : invoice.usage < low ? '#d1fae5' : C.indigo50 }]}>
              <Text style={[S.deltaBadgeText, { color: usageCategoryColor }]}>{usageCategory}</Text>
            </View>
          </View>
        </View>

        {/* ── 5. Charges ──────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sLabel}>CHARGES</Text>

          <View style={S.chargeRow}>
            <View>
              <Text style={S.chargeL}>Electricity usage</Text>
              <Text style={S.chargeNote}>{invoice.usage.toLocaleString()} kWh × {(invoice.ratePerKwh * 100).toFixed(2)}¢/kWh</Text>
            </View>
            <Text style={S.chargeAmt}>{formatAUD(invoice.usageCharge)}</Text>
          </View>

          <View style={S.chargeRow}>
            <View>
              <Text style={S.chargeL}>Daily supply charge</Text>
              <Text style={S.chargeNote}>{invoice.daysInPeriod} days × ${settings.tariff.dailySupplyCharge.toFixed(4)}/day</Text>
            </View>
            <Text style={S.chargeAmt}>{formatAUD(invoice.supplyCharge)}</Text>
          </View>

          <View style={S.chargeRow}>
            <Text style={S.chargeSub}>Subtotal (excl. GST)</Text>
            <Text style={S.chargeAmtS}>{formatAUD(invoice.subtotal)}</Text>
          </View>

          <View style={S.chargeLast}>
            <Text style={S.chargeSub}>GST ({(settings.tariff.gstRate * 100).toFixed(0)}%)</Text>
            <Text style={S.chargeAmtS}>{formatAUD(invoice.gst)}</Text>
          </View>

          {/* Total box */}
          <View style={S.totalBox}>
            <View>
              <Text style={S.totalHead}>{invoice.isFinalBill ? 'FINAL AMOUNT DUE' : 'TOTAL AMOUNT DUE'}</Text>
              <Text style={S.totalSub}>Including GST · AUD</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={S.totalAmt}>{formatAUD(invoice.total)}</Text>
              <Text style={S.totalDue}>Due {formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* ── 6. 12-Month Usage History ────────────────────────────────── */}
        <View style={S.sectionAlt}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[S.sLabel, { marginBottom: 0, flex: 1 }]}>12-MONTH USAGE HISTORY</Text>
            <Text style={S.chartAvgText}>Avg: {avgUsage} kWh/month</Text>
          </View>
          <View style={S.chartLegendRow}>
            {[
              { color: '#10b981', label: `Low (<${low} kWh)` },
              { color: '#4f46e5', label: 'Normal' },
              { color: '#f59e0b', label: `High (>${high} kWh)` },
            ].map(l => (
              <View key={l.label} style={S.chartLegendItem}>
                <View style={[S.chartLegendDot, { backgroundColor: l.color }]} />
                <Text style={S.chartLegendText}>{l.label}</Text>
              </View>
            ))}
          </View>
          <BarChart
            history={usageHistory}
            low={low}
            high={high}
            currentMonth={invoice.month}
            currentYear={invoice.year}
          />
        </View>

        {/* ── 7. Payment Information ───────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sLabel}>PAYMENT INFORMATION</Text>
          <View style={S.payGrid}>
            <View style={S.payCol}>
              {customer.paymentMethod === 'direct_debit' && (
                <View style={S.payBoxHL}>
                  <Text style={S.payTitleHL}>Direct Debit (DDR)</Text>
                  <Text style={S.payLineHL}>
                    {formatAUD(invoice.total)} will be debited on {formatDate(invoice.dueDate)}
                  </Text>
                  <Text style={S.payLineHL}>From: {customer.accountName}</Text>
                  <Text style={S.payLineHL}>
                    BSB: <Text style={S.payMono}>{customer.bsb}</Text>{'  '}
                    Acc: <Text style={S.payMono}>{customer.accountNumber}</Text>
                  </Text>
                </View>
              )}
              {settings.bpayBillerCode && (
                <View style={S.payBox}>
                  <Text style={S.payTitle}>BPAY</Text>
                  <Text style={S.payLine}>Biller Code: <Text style={S.payMono}>{settings.bpayBillerCode}</Text></Text>
                  <Text style={S.payLine}>Reference: <Text style={S.payMono}>{invoice.invoiceNumber.replace(/-/g, '')}</Text></Text>
                </View>
              )}
            </View>
            <View style={S.payCol}>
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

        {/* ── 8. Footer ────────────────────────────────────────────────── */}
        <View style={S.footer}>
          <Text style={S.footerText}>
            {settings.companyName} · ABN {settings.abn} · {settings.email} · {settings.phone}
            {settings.website ? ` · ${settings.website}` : ''}
          </Text>
          <Text style={S.footerMono}>{invoice.invoiceNumber}</Text>
        </View>

      </Page>
    </Document>
  )
}
