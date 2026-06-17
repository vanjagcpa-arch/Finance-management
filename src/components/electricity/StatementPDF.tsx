import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { Customer, Apartment, Building, ElectricitySettings } from '@/lib/electricityTypes'
import type { LedgerEntry, CustomerBalance } from '@/lib/electricityUtils'
import { formatAUD, formatDate } from '@/lib/electricityUtils'

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
  success:  '#059669',
  successL: '#d1fae5',
  warning:  '#d97706',
  warningL: '#fef3c7',
  danger:   '#dc2626',
  dangerL:  '#fee2e2',
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

  header:        { backgroundColor: C.dark, paddingHorizontal: 36, paddingVertical: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyName:   { fontWeight: 700, fontSize: 14, color: C.white, marginBottom: 3 },
  companyDetail: { fontSize: 7.5, color: '#94a3b8', marginBottom: 1.5 },
  stmtTitle:     { fontWeight: 700, fontSize: 26, color: C.white },
  stmtDate:      { fontSize: 8.5, fontWeight: 600, color: C.primaryD, marginTop: 5, textAlign: 'right' },

  strip:      { backgroundColor: C.primary, paddingHorizontal: 36, paddingVertical: 10, flexDirection: 'row' },
  stripItem:  { marginRight: 36 },
  stripLabel: { fontSize: 6.5, fontWeight: 600, color: C.primaryX, letterSpacing: 0.7, marginBottom: 2 },
  stripValue: { fontSize: 9, fontWeight: 600, color: C.white },

  twoCol:     { flexDirection: 'row', paddingHorizontal: 36, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  col:        { flex: 1 },
  colDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 24 },
  colHead:    { marginBottom: 8 },
  colLabel:   { fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.8 },
  colName:    { fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 3, marginTop: 4 },
  colLine:    { fontSize: 8.5, color: C.muted, marginBottom: 2 },
  colMeta:    { fontSize: 7, color: C.subtle, marginTop: 2 },

  agingSection: { paddingHorizontal: 36, paddingVertical: 16, backgroundColor: C.light, borderBottomWidth: 1, borderBottomColor: C.border },
  agingLabel:   { fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.8, marginBottom: 10 },
  agingRow:     { flexDirection: 'row', gap: 8 },
  agingBox:     { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, backgroundColor: C.white },
  agingBoxWarn: { flex: 1, borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 10, backgroundColor: C.warningL },
  agingBoxDang: { flex: 1, borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, padding: 10, backgroundColor: C.dangerL },
  agingBLabel:  { fontSize: 6.5, color: C.subtle, marginBottom: 4 },
  agingBLabelW: { fontSize: 6.5, color: C.warning, marginBottom: 4 },
  agingBLabelD: { fontSize: 6.5, color: C.danger, marginBottom: 4 },
  agingBAmt:    { fontWeight: 700, fontSize: 12, color: C.text },
  agingBAmtW:   { fontWeight: 700, fontSize: 12, color: C.warning },
  agingBAmtD:   { fontWeight: 700, fontSize: 12, color: C.danger },

  section:    { paddingHorizontal: 36, paddingTop: 14, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  sLabel:     { fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.8, marginBottom: 8 },

  tableHeader: { flexDirection: 'row', backgroundColor: C.mid, paddingVertical: 6, paddingHorizontal: 6, marginBottom: 0 },
  thDate:      { width: 52, fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.5 },
  thDesc:      { flex: 1, fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.5 },
  thInv:       { width: 80, fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.5 },
  thAmt:       { width: 60, fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.5, textAlign: 'right' },
  thBal:       { width: 64, fontSize: 6.5, fontWeight: 700, color: C.subtle, letterSpacing: 0.5, textAlign: 'right' },

  row:         { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  rowAlt:      { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.light },
  rowCredit:   { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.successL },
  rowPayment:  { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#f0fdf4' },
  cellDate:    { width: 52, fontSize: 8, color: C.muted },
  cellDesc:    { flex: 1, fontSize: 8, color: C.text2 },
  cellDescSub: { fontSize: 7, color: C.subtle, marginTop: 1 },
  cellInv:     { width: 80, fontSize: 7.5, color: C.primary, fontFamily: 'Courier' },
  cellDebit:   { width: 60, fontSize: 8, color: C.text, textAlign: 'right', fontWeight: 600 },
  cellCredit:  { width: 60, fontSize: 8, color: C.success, textAlign: 'right', fontWeight: 600 },
  cellNeutral: { width: 60, fontSize: 8, color: C.subtle, textAlign: 'right' },
  cellBal:     { width: 64, fontSize: 8, fontWeight: 700, textAlign: 'right' },

  totalBox:    { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginHorizontal: 36, marginBottom: 16 },
  totalHead:   { fontSize: 9, fontWeight: 600, color: C.primaryX },
  totalSub:    { fontSize: 7, color: C.primaryX, marginTop: 2 },
  totalAmt:    { fontWeight: 700, fontSize: 26, color: C.white, textAlign: 'right' },
  totalNote:   { fontSize: 7, color: C.primaryX, marginTop: 2, textAlign: 'right' },

  paySection: { paddingHorizontal: 36, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  payGrid:    { flexDirection: 'row', gap: 8 },
  payCol:     { flex: 1 },
  payBox:     { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: C.white },
  payBoxHL:   { borderWidth: 1, borderColor: C.indigo100, backgroundColor: C.indigo50, borderRadius: 8, padding: 10, marginBottom: 8 },
  payTitle:   { fontWeight: 700, fontSize: 8.5, color: C.text, marginBottom: 5 },
  payTitleHL: { fontWeight: 700, fontSize: 8.5, color: C.indigo700, marginBottom: 5 },
  payLine:    { fontSize: 7.5, color: C.muted, marginBottom: 2 },
  payLineHL:  { fontSize: 7.5, color: C.indigo700, marginBottom: 2 },
  payMono:    { fontFamily: 'Courier', fontSize: 7.5 },

  footer:     { backgroundColor: C.light, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 36, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 6.5, color: C.subtle },
  footerMono: { fontSize: 6.5, fontFamily: 'Courier', color: C.border2 },
})

interface Props {
  customer:  Customer
  apt:       Apartment
  building:  Building
  settings:  ElectricitySettings
  ledger:    LedgerEntry[]
  balance:   CustomerBalance
  asOfDate:  string
}

export default function StatementPDF({ customer, apt, building, settings, ledger, balance, asOfDate }: Props) {
  const outstanding = balance.balance
  const hasOutstanding = outstanding > 0.005

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── 1. Header ── */}
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.companyName}>{settings.companyName}</Text>
            <Text style={S.companyDetail}>Electricity Billing Services</Text>
            <Text style={S.companyDetail}>{settings.address}, {settings.suburb} {settings.state} {settings.postcode}</Text>
            <Text style={S.companyDetail}>ABN {settings.abn} · {settings.phone}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.stmtTitle}>STATEMENT</Text>
            <Text style={S.stmtDate}>As at {formatDate(asOfDate)}</Text>
          </View>
        </View>

        {/* ── 2. Strip ── */}
        <View style={S.strip}>
          {[
            { label: 'ACCOUNT', value: customer.myobCardId || customer.id.slice(0, 12) },
            { label: 'OUTSTANDING', value: formatAUD(Math.max(outstanding, 0)) },
            { label: 'TOTAL INVOICED', value: formatAUD(balance.totalBilled) },
            { label: 'TOTAL PAID', value: formatAUD(balance.totalPaid) },
          ].map(item => (
            <View key={item.label} style={S.stripItem}>
              <Text style={S.stripLabel}>{item.label}</Text>
              <Text style={S.stripValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── 3. Account / Property ── */}
        <View style={S.twoCol}>
          <View style={S.col}>
            <View style={S.colHead}><Text style={S.colLabel}>ACCOUNT</Text></View>
            <Text style={S.colName}>{customer.firstName} {customer.lastName}</Text>
            <Text style={S.colLine}>{customer.email}</Text>
            <Text style={S.colLine}>{customer.phone}</Text>
            <Text style={S.colMeta}>ID: {customer.myobCardId}</Text>
            <Text style={S.colMeta}>Move-in: {customer.moveInDate}</Text>
            {customer.moveOutDate && <Text style={[S.colMeta, { color: C.danger }]}>Move-out: {customer.moveOutDate}</Text>}
          </View>
          <View style={S.colDivider} />
          <View style={[S.col, { marginLeft: 0 }]}>
            <View style={S.colHead}><Text style={S.colLabel}>PROPERTY</Text></View>
            <Text style={S.colName}>{building.name}</Text>
            <Text style={S.colLine}>Unit {apt.unitNumber}, Level {apt.floor}</Text>
            <Text style={S.colLine}>{building.address}</Text>
            <Text style={S.colLine}>{building.suburb} {building.state} {building.postcode}</Text>
            <Text style={S.colMeta}>Meter: {apt.meterNumber}</Text>
          </View>
        </View>

        {/* ── 4. Aging summary ── */}
        <View style={S.agingSection}>
          <Text style={S.agingLabel}>AGING SUMMARY</Text>
          <View style={S.agingRow}>
            <View style={S.agingBox}>
              <Text style={S.agingBLabel}>Current (not yet due)</Text>
              <Text style={S.agingBAmt}>{formatAUD(balance.current)}</Text>
            </View>
            <View style={balance.days30 > 0.005 ? S.agingBoxWarn : S.agingBox}>
              <Text style={balance.days30 > 0.005 ? S.agingBLabelW : S.agingBLabel}>1–30 days overdue</Text>
              <Text style={balance.days30 > 0.005 ? S.agingBAmtW : S.agingBAmt}>{formatAUD(balance.days30)}</Text>
            </View>
            <View style={balance.days60 > 0.005 ? S.agingBoxDang : S.agingBox}>
              <Text style={balance.days60 > 0.005 ? S.agingBLabelD : S.agingBLabel}>31–60 days overdue</Text>
              <Text style={balance.days60 > 0.005 ? S.agingBAmtD : S.agingBAmt}>{formatAUD(balance.days60)}</Text>
            </View>
            <View style={balance.days90plus > 0.005 ? S.agingBoxDang : S.agingBox}>
              <Text style={balance.days90plus > 0.005 ? S.agingBLabelD : S.agingBLabel}>61+ days overdue</Text>
              <Text style={balance.days90plus > 0.005 ? S.agingBAmtD : S.agingBAmt}>{formatAUD(balance.days90plus)}</Text>
            </View>
          </View>
        </View>

        {/* ── 5. Transaction ledger ── */}
        <View style={S.section}>
          <Text style={S.sLabel}>TRANSACTION HISTORY</Text>
          <View style={S.tableHeader}>
            <Text style={S.thDate}>DATE</Text>
            <Text style={S.thDesc}>DESCRIPTION</Text>
            <Text style={S.thInv}>REF</Text>
            <Text style={S.thAmt}>DEBIT</Text>
            <Text style={S.thAmt}>CREDIT</Text>
            <Text style={S.thBal}>BALANCE</Text>
          </View>
          {ledger.map((entry, i) => {
            const isPayment = entry.type === 'payment'
            const isCredit  = entry.type === 'credit'
            const rowStyle  = isPayment ? S.rowPayment : isCredit ? S.rowCredit : i % 2 === 0 ? S.row : S.rowAlt
            return (
              <View key={`${entry.invoiceId}-${i}`} style={rowStyle}>
                <Text style={S.cellDate}>{entry.date}</Text>
                <Text style={S.cellDesc}>{entry.description}</Text>
                <Text style={S.cellInv}>{entry.invoiceNumber}</Text>
                <Text style={entry.debit > 0 ? S.cellDebit : S.cellNeutral}>
                  {entry.debit > 0 ? formatAUD(entry.debit) : '—'}
                </Text>
                <Text style={entry.credit > 0 ? S.cellCredit : S.cellNeutral}>
                  {entry.credit > 0 ? formatAUD(entry.credit) : '—'}
                </Text>
                <Text style={[S.cellBal, { color: entry.balance > 0.005 ? C.text : entry.balance < -0.005 ? C.success : C.subtle }]}>
                  {entry.balance > 0.005 ? formatAUD(entry.balance) : entry.balance < -0.005 ? `(${formatAUD(Math.abs(entry.balance))})` : '—'}
                </Text>
              </View>
            )
          })}
          {ledger.length === 0 && (
            <View style={S.row}><Text style={[S.cellDesc, { color: C.subtle }]}>No transactions on record</Text></View>
          )}
        </View>

        {/* ── 6. Outstanding total ── */}
        <View style={S.totalBox}>
          <View>
            <Text style={S.totalHead}>TOTAL OUTSTANDING</Text>
            <Text style={S.totalSub}>{hasOutstanding ? 'Please remit payment at your earliest convenience' : 'Account is clear — no amount owing'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.totalAmt}>{formatAUD(Math.max(outstanding, 0))}</Text>
            <Text style={S.totalNote}>As at {formatDate(asOfDate)}</Text>
          </View>
        </View>

        {/* ── 7. Payment information ── */}
        {hasOutstanding && (
          <View style={S.paySection}>
            <Text style={[S.sLabel, { marginBottom: 10 }]}>PAYMENT OPTIONS</Text>
            <View style={S.payGrid}>
              <View style={S.payCol}>
                {(customer.paymentMethod === 'direct_debit' || customer.paymentMethod === 'ezidebit') && (
                  <View style={S.payBoxHL}>
                    <Text style={S.payTitleHL}>
                      {customer.paymentMethod === 'ezidebit' ? 'Ezidebit DDR' : 'Direct Debit (DDR)'}
                    </Text>
                    <Text style={S.payLineHL}>Your outstanding balance will be automatically debited</Text>
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
                    <Text style={S.payLine}>Reference: <Text style={S.payMono}>{customer.myobCardId || customer.id.slice(0, 10)}</Text></Text>
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
                  <Text style={S.payLine}>Reference: <Text style={S.payMono}>{customer.myobCardId || customer.id.slice(0, 10)}</Text></Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── 8. Footer ── */}
        <View style={S.footer}>
          <Text style={S.footerText}>
            {settings.companyName} · ABN {settings.abn} · {settings.email} · {settings.phone}
            {settings.website ? ` · ${settings.website}` : ''}
          </Text>
          <Text style={S.footerMono}>Statement as at {asOfDate}</Text>
        </View>

      </Page>
    </Document>
  )
}
