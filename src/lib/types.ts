export interface MonthlyFinancial {
  month: string
  revenue: number
  budgetRevenue: number
  priorRevenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  rdExpense: number
  smExpense: number
  gaExpense: number
  totalOpex: number
  ebitda: number
  ebitdaMargin: number
  depreciation: number
  ebit: number
  interest: number
  taxExpense: number
  netIncome: number
  cashPosition: number
  ar: number
  ap: number
}

export interface PLLineItem {
  id: string
  label: string
  actual: number
  budget: number
  priorYear: number
  isHeader?: boolean
  isTotal?: boolean
  isSubtotal?: boolean
  indent?: number
  invertSign?: boolean
}

export interface EOMTask {
  id: string
  category: string
  name: string
  owner: string
  dueDay: number
  status: 'not-started' | 'in-progress' | 'complete' | 'blocked'
  priority: 'high' | 'medium' | 'low'
  notes: string
}

export interface AuditIssue {
  severity: 'error' | 'warning' | 'info'
  type: string
  description: string
  rows?: number[]
  count: number
}

export interface AuditStats {
  totalRows: number
  totalColumns: number
  issues: AuditIssue[]
  passedChecks: string[]
}

export interface CapitalItem {
  label: string
  amount: number
  color: string
}

export interface DeptBudget {
  dept: string
  budget: number
  actual: number
  forecast: number
}

export interface FinancialRatio {
  name: string
  value: number
  format: 'x' | '%' | 'days' | 'number'
  benchmark: number
  description: string
  direction: 'higher' | 'lower'
}
