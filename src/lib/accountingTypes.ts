// ─── Import Types ────────────────────────────────────────────────────────────

export type ImportSource = 'csv' | 'excel' | 'xero' | 'myob' | 'quickbooks' | 'manual'

export interface ColumnMapping {
  sourceColumn: string
  targetField: string
  dataType: string
  sampleValue: string
}

export interface ImportBatch {
  id: string
  filename: string
  importedAt: string
  source: ImportSource
  rowCount: number
  validRows: number
  errorRows: number
  warningRows: number
  status: 'completed' | 'failed' | 'processing' | 'pending'
  period: string
  mappings: ColumnMapping[]
}

// ─── Audit Types ─────────────────────────────────────────────────────────────

export interface AuditCheck {
  id: string
  category: 'completeness' | 'accuracy' | 'validity' | 'consistency' | 'timeliness'
  name: string
  description: string
  status: 'pass' | 'fail' | 'warning' | 'info'
  count: number
  amount?: number
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface AuditAnomaly {
  id: string
  date: string
  account: string
  accountCode: string
  description: string
  amount: number
  expectedRange: { min: number; max: number }
  flag: 'duplicate' | 'outlier' | 'missing' | 'rounding' | 'unusual_timing'
  status: 'open' | 'reviewed' | 'resolved' | 'waived'
  assignedTo?: string
  notes?: string
  detectedAt: string
}

export interface AuditLog {
  id: string
  action: string
  user: string
  timestamp: string
  module: string
  details: string
  outcome: 'success' | 'warning' | 'error'
}

// ─── Analysis Types ───────────────────────────────────────────────────────────

export interface PLLine {
  code: string
  name: string
  type: 'revenue' | 'cogs' | 'gross_profit' | 'opex' | 'ebitda' | 'ebit' | 'net_profit' | 'subtotal'
  actual: number
  budget: number
  priorYear: number
  ytdActual: number
  ytdBudget: number
  isSubtotal?: boolean
  indent?: number
}

export interface BSLine {
  code: string
  name: string
  category: 'current_assets' | 'non_current_assets' | 'current_liabilities' | 'non_current_liabilities' | 'equity'
  actual: number
  prior: number
  isSubtotal?: boolean
  indent?: number
}

export interface CashFlowLine {
  name: string
  category: 'operating' | 'investing' | 'financing'
  actual: number
  prior: number
  isSubtotal?: boolean
}

export interface KPIMetric {
  name: string
  value: number
  unit: 'currency' | 'percent' | 'ratio' | 'days'
  prior: number
  benchmark?: number
  trend: 'up' | 'down' | 'flat'
  good: boolean
}

// ─── Reconciliation Types ─────────────────────────────────────────────────────

export interface RecMovement {
  id: string
  date: string
  description: string
  reference: string
  type: 'addition' | 'disposal' | 'adjustment' | 'accrual' | 'payment' | 'reversal'
  debit: number
  credit: number
  runningBalance: number
}

export interface BSReconciliation {
  id: string
  accountCode: string
  accountName: string
  category: string
  openingBalance: number
  closingBalance: number
  movements: RecMovement[]
  variance: number
  status: 'reconciled' | 'unreconciled' | 'in_progress' | 'not_started'
  lastUpdated: string
  preparedBy?: string
  reviewedBy?: string
  supportingSchedule?: string
}

// ─── Journal Types ────────────────────────────────────────────────────────────

export type JournalType = 'accrual' | 'prepayment' | 'depreciation' | 'payroll' | 'tax' | 'reclass' | 'manual'

export interface JournalLine {
  id: string
  accountCode: string
  accountName: string
  description: string
  debit: number
  credit: number
  costCenter?: string
}

export interface JournalEntry {
  id: string
  type: JournalType
  period: string
  reference: string
  date: string
  description: string
  preparedBy: string
  status: 'draft' | 'posted' | 'reversed' | 'pending_approval'
  lines: JournalLine[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  approvedBy?: string
  postedAt?: string
  reversalDate?: string
}

// ─── Accrual Schedule ─────────────────────────────────────────────────────────

export interface AccrualItem {
  id: string
  description: string
  supplier: string
  accountCode: string
  accountName: string
  accrualDate: string
  reversalDate: string
  amount: number
  status: 'active' | 'reversed' | 'partial'
  journalRef: string
  category: 'expense' | 'revenue' | 'interest' | 'tax'
}

// ─── Prepayment Schedule ──────────────────────────────────────────────────────

export interface PrepaymentItem {
  id: string
  description: string
  supplier: string
  accountCode: string
  accountName: string
  invoiceDate: string
  invoiceRef: string
  totalAmount: number
  startDate: string
  endDate: string
  monthlyAmortisation: number
  amortisedToDate: number
  remaining: number
  status: 'active' | 'fully_amortised'
  category: 'insurance' | 'rent' | 'software' | 'maintenance' | 'other'
}

// ─── Fixed Assets / Depreciation ─────────────────────────────────────────────

export interface FixedAsset {
  id: string
  assetCode: string
  assetName: string
  category: 'plant' | 'equipment' | 'vehicle' | 'furniture' | 'intangible' | 'leasehold' | 'computer'
  acquisitionDate: string
  cost: number
  residualValue: number
  usefulLife: number
  depreciationMethod: 'straight_line' | 'diminishing_value'
  accumulatedDepreciation: number
  netBookValue: number
  monthlyDepreciation: number
  status: 'active' | 'disposed' | 'fully_depreciated'
}
