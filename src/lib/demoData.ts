import type { MonthlyFinancial, PLLineItem, EOMTask, CapitalItem, DeptBudget, FinancialRatio } from './types'

export const COMPANY_NAME = 'Meridian Group'
export const REPORTING_PERIOD = 'March 2026'
export const CURRENCY = 'USD'

export const monthlyData: MonthlyFinancial[] = [
  { month: 'Apr 25', revenue: 1820000, budgetRevenue: 1900000, priorRevenue: 1650000, cogs: 637000, grossProfit: 1183000, grossMargin: 65.0, rdExpense: 218400, smExpense: 291200, gaExpense: 127400, totalOpex: 637000, ebitda: 546000, ebitdaMargin: 30.0, depreciation: 72800, ebit: 473200, interest: 28000, taxExpense: 111330, netIncome: 333870, cashPosition: 3820000, ar: 910000, ap: 318500 },
  { month: 'May 25', revenue: 1950000, budgetRevenue: 1900000, priorRevenue: 1700000, cogs: 682500, grossProfit: 1267500, grossMargin: 65.0, rdExpense: 234000, smExpense: 312000, gaExpense: 136500, totalOpex: 682500, ebitda: 585000, ebitdaMargin: 30.0, depreciation: 78000, ebit: 507000, interest: 28000, taxExpense: 119725, netIncome: 359275, cashPosition: 4020000, ar: 975000, ap: 341250 },
  { month: 'Jun 25', revenue: 2100000, budgetRevenue: 2000000, priorRevenue: 1820000, cogs: 735000, grossProfit: 1365000, grossMargin: 65.0, rdExpense: 252000, smExpense: 336000, gaExpense: 147000, totalOpex: 735000, ebitda: 630000, ebitdaMargin: 30.0, depreciation: 84000, ebit: 546000, interest: 28000, taxExpense: 129450, netIncome: 388550, cashPosition: 4250000, ar: 1050000, ap: 367500 },
  { month: 'Jul 25', revenue: 2050000, budgetRevenue: 2100000, priorRevenue: 1780000, cogs: 717500, grossProfit: 1332500, grossMargin: 65.0, rdExpense: 246000, smExpense: 328000, gaExpense: 143500, totalOpex: 717500, ebitda: 615000, ebitdaMargin: 30.0, depreciation: 82000, ebit: 533000, interest: 28000, taxExpense: 126225, netIncome: 378775, cashPosition: 4100000, ar: 1025000, ap: 358750 },
  { month: 'Aug 25', revenue: 2200000, budgetRevenue: 2200000, priorRevenue: 1900000, cogs: 770000, grossProfit: 1430000, grossMargin: 65.0, rdExpense: 264000, smExpense: 352000, gaExpense: 154000, totalOpex: 770000, ebitda: 660000, ebitdaMargin: 30.0, depreciation: 88000, ebit: 572000, interest: 28000, taxExpense: 135600, netIncome: 408400, cashPosition: 4380000, ar: 1100000, ap: 385000 },
  { month: 'Sep 25', revenue: 2350000, budgetRevenue: 2300000, priorRevenue: 2050000, cogs: 822500, grossProfit: 1527500, grossMargin: 65.0, rdExpense: 282000, smExpense: 376000, gaExpense: 164500, totalOpex: 822500, ebitda: 705000, ebitdaMargin: 30.0, depreciation: 94000, ebit: 611000, interest: 28000, taxExpense: 145575, netIncome: 437425, cashPosition: 4620000, ar: 1175000, ap: 411250 },
  { month: 'Oct 25', revenue: 2180000, budgetRevenue: 2250000, priorRevenue: 1980000, cogs: 763000, grossProfit: 1417000, grossMargin: 65.0, rdExpense: 261600, smExpense: 348800, gaExpense: 152600, totalOpex: 763000, ebitda: 654000, ebitdaMargin: 30.0, depreciation: 87200, ebit: 566800, interest: 28000, taxExpense: 134460, netIncome: 404340, cashPosition: 4510000, ar: 1090000, ap: 381500 },
  { month: 'Nov 25', revenue: 2290000, budgetRevenue: 2300000, priorRevenue: 2100000, cogs: 801500, grossProfit: 1488500, grossMargin: 65.0, rdExpense: 274800, smExpense: 366400, gaExpense: 160300, totalOpex: 801500, ebitda: 687000, ebitdaMargin: 30.0, depreciation: 91600, ebit: 595400, interest: 28000, taxExpense: 140985, netIncome: 426415, cashPosition: 4750000, ar: 1145000, ap: 400750 },
  { month: 'Dec 25', revenue: 2420000, budgetRevenue: 2400000, priorRevenue: 2200000, cogs: 847000, grossProfit: 1573000, grossMargin: 65.0, rdExpense: 290400, smExpense: 387200, gaExpense: 169400, totalOpex: 847000, ebitda: 726000, ebitdaMargin: 30.0, depreciation: 96800, ebit: 629200, interest: 28000, taxExpense: 150180, netIncome: 451020, cashPosition: 5020000, ar: 1210000, ap: 423500 },
  { month: 'Jan 26', revenue: 2510000, budgetRevenue: 2500000, priorRevenue: 2150000, cogs: 878500, grossProfit: 1631500, grossMargin: 65.0, rdExpense: 301200, smExpense: 401600, gaExpense: 175700, totalOpex: 878500, ebitda: 753000, ebitdaMargin: 30.0, depreciation: 100400, ebit: 652600, interest: 28000, taxExpense: 155655, netIncome: 468945, cashPosition: 5210000, ar: 1255000, ap: 439250 },
  { month: 'Feb 26', revenue: 2380000, budgetRevenue: 2550000, priorRevenue: 2080000, cogs: 833000, grossProfit: 1547000, grossMargin: 65.0, rdExpense: 285600, smExpense: 380800, gaExpense: 166600, totalOpex: 833000, ebitda: 714000, ebitdaMargin: 30.0, depreciation: 95200, ebit: 618800, interest: 28000, taxExpense: 146895, netIncome: 443905, cashPosition: 5080000, ar: 1190000, ap: 415500 },
  { month: 'Mar 26', revenue: 2450000, budgetRevenue: 2600000, priorRevenue: 2200000, cogs: 857500, grossProfit: 1592500, grossMargin: 65.0, rdExpense: 294000, smExpense: 392000, gaExpense: 171500, totalOpex: 857500, ebitda: 735000, ebitdaMargin: 30.0, depreciation: 98000, ebit: 637000, interest: 28000, taxExpense: 151725, netIncome: 457275, cashPosition: 5150000, ar: 1225000, ap: 428750 },
]

export const currentMonth = monthlyData[monthlyData.length - 1]
export const priorMonth = monthlyData[monthlyData.length - 2]

export const plLineItems: PLLineItem[] = [
  { id: 'rev', label: 'Revenue', actual: 2450000, budget: 2600000, priorYear: 2200000, isTotal: true },
  { id: 'cogs', label: 'Cost of Revenue', actual: 857500, budget: 910000, priorYear: 770000, indent: 1, invertSign: true },
  { id: 'gp', label: 'Gross Profit', actual: 1592500, budget: 1690000, priorYear: 1430000, isSubtotal: true },
  { id: 'gpm', label: 'Gross Margin %', actual: 65.0, budget: 65.0, priorYear: 65.0, indent: 1 },
  { id: 'opex_hdr', label: 'Operating Expenses', actual: 0, budget: 0, priorYear: 0, isHeader: true },
  { id: 'rd', label: 'Research & Development', actual: 294000, budget: 312000, priorYear: 264000, indent: 1, invertSign: true },
  { id: 'sm', label: 'Sales & Marketing', actual: 392000, budget: 416000, priorYear: 352000, indent: 1, invertSign: true },
  { id: 'ga', label: 'General & Administrative', actual: 171500, budget: 182000, priorYear: 154000, indent: 1, invertSign: true },
  { id: 'total_opex', label: 'Total OpEx', actual: 857500, budget: 910000, priorYear: 770000, isSubtotal: true, invertSign: true },
  { id: 'ebitda', label: 'EBITDA', actual: 735000, budget: 780000, priorYear: 660000, isSubtotal: true },
  { id: 'ebitdam', label: 'EBITDA Margin %', actual: 30.0, budget: 30.0, priorYear: 30.0, indent: 1 },
  { id: 'da', label: 'Depreciation & Amortization', actual: 98000, budget: 96000, priorYear: 88000, indent: 1, invertSign: true },
  { id: 'ebit', label: 'EBIT', actual: 637000, budget: 684000, priorYear: 572000, isSubtotal: true },
  { id: 'int', label: 'Interest Expense', actual: 28000, budget: 28000, priorYear: 28000, indent: 1, invertSign: true },
  { id: 'ebt', label: 'Earnings Before Tax', actual: 609000, budget: 656000, priorYear: 544000, isSubtotal: true },
  { id: 'tax', label: 'Income Tax (25%)', actual: 151725, budget: 164000, priorYear: 135600, indent: 1, invertSign: true },
  { id: 'ni', label: 'Net Income', actual: 457275, budget: 492000, priorYear: 408400, isTotal: true },
  { id: 'nim', label: 'Net Income Margin %', actual: 18.7, budget: 18.9, priorYear: 18.6, indent: 1 },
]

export const eomTasks: EOMTask[] = [
  // Accounts Receivable
  { id: 'ar-1', category: 'Accounts Receivable', name: 'Reconcile AR sub-ledger to GL', owner: 'J. Martinez', dueDay: 3, status: 'complete', priority: 'high', notes: 'Completed. $0 variance.' },
  { id: 'ar-2', category: 'Accounts Receivable', name: 'Review AR aging — escalate 90+ day balances', owner: 'J. Martinez', dueDay: 4, status: 'complete', priority: 'high', notes: '3 accounts escalated to collections.' },
  { id: 'ar-3', category: 'Accounts Receivable', name: 'Process bad debt write-offs', owner: 'J. Martinez', dueDay: 5, status: 'in-progress', priority: 'medium', notes: 'Pending CFO sign-off.' },
  { id: 'ar-4', category: 'Accounts Receivable', name: 'Confirm cut-off — all March invoices posted', owner: 'J. Martinez', dueDay: 3, status: 'complete', priority: 'high', notes: '' },
  // Accounts Payable
  { id: 'ap-1', category: 'Accounts Payable', name: 'Process all vendor invoices received by month end', owner: 'T. Wilson', dueDay: 3, status: 'complete', priority: 'high', notes: '' },
  { id: 'ap-2', category: 'Accounts Payable', name: 'Accrue for goods/services received not yet invoiced', owner: 'T. Wilson', dueDay: 4, status: 'complete', priority: 'high', notes: 'Accrued $42K for 6 vendors.' },
  { id: 'ap-3', category: 'Accounts Payable', name: 'Reconcile AP sub-ledger to GL', owner: 'T. Wilson', dueDay: 5, status: 'in-progress', priority: 'high', notes: '$1.2K unreconciled — investigating.' },
  { id: 'ap-4', category: 'Accounts Payable', name: 'Review employee expense reports', owner: 'T. Wilson', dueDay: 4, status: 'complete', priority: 'medium', notes: '' },
  // General Ledger
  { id: 'gl-1', category: 'General Ledger', name: 'Post all recurring journal entries', owner: 'K. Patel', dueDay: 2, status: 'complete', priority: 'high', notes: '' },
  { id: 'gl-2', category: 'General Ledger', name: 'Reconcile all bank accounts', owner: 'K. Patel', dueDay: 3, status: 'complete', priority: 'high', notes: '3 accounts reconciled.' },
  { id: 'gl-3', category: 'General Ledger', name: 'Clear suspense account balances', owner: 'K. Patel', dueDay: 5, status: 'not-started', priority: 'high', notes: '' },
  { id: 'gl-4', category: 'General Ledger', name: 'Post payroll and benefits accruals', owner: 'K. Patel', dueDay: 3, status: 'complete', priority: 'high', notes: '' },
  { id: 'gl-5', category: 'General Ledger', name: 'Review and post intercompany eliminations', owner: 'K. Patel', dueDay: 6, status: 'not-started', priority: 'medium', notes: '' },
  { id: 'gl-6', category: 'General Ledger', name: 'Perform flux analysis on GL accounts', owner: 'K. Patel', dueDay: 7, status: 'not-started', priority: 'medium', notes: '' },
  // Fixed Assets
  { id: 'fa-1', category: 'Fixed Assets', name: 'Post monthly depreciation', owner: 'K. Patel', dueDay: 2, status: 'complete', priority: 'high', notes: 'Depreciation posted: $98K.' },
  { id: 'fa-2', category: 'Fixed Assets', name: 'Record asset additions and disposals', owner: 'K. Patel', dueDay: 5, status: 'in-progress', priority: 'medium', notes: '2 new assets pending tagging.' },
  { id: 'fa-3', category: 'Fixed Assets', name: 'Reconcile fixed asset register to GL', owner: 'K. Patel', dueDay: 6, status: 'not-started', priority: 'medium', notes: '' },
  // Revenue
  { id: 'rev-1', category: 'Revenue', name: 'Reconcile revenue to CRM/billing system', owner: 'S. Thompson', dueDay: 3, status: 'complete', priority: 'high', notes: 'Matched to Salesforce. $0 variance.' },
  { id: 'rev-2', category: 'Revenue', name: 'Review deferred revenue schedule', owner: 'S. Thompson', dueDay: 4, status: 'complete', priority: 'high', notes: '' },
  { id: 'rev-3', category: 'Revenue', name: 'Post revenue recognition entries', owner: 'S. Thompson', dueDay: 3, status: 'complete', priority: 'high', notes: '' },
  { id: 'rev-4', category: 'Revenue', name: 'Confirm contract modifications applied correctly', owner: 'S. Thompson', dueDay: 5, status: 'not-started', priority: 'medium', notes: '' },
  // Reporting
  { id: 'rep-1', category: 'Reporting', name: 'Generate draft P&L, Balance Sheet, Cash Flow', owner: 'CFO', dueDay: 8, status: 'not-started', priority: 'high', notes: '' },
  { id: 'rep-2', category: 'Reporting', name: 'Prepare budget vs actuals variance commentary', owner: 'CFO', dueDay: 9, status: 'not-started', priority: 'high', notes: '' },
  { id: 'rep-3', category: 'Reporting', name: 'Management reporting package', owner: 'CFO', dueDay: 10, status: 'not-started', priority: 'high', notes: '' },
  { id: 'rep-4', category: 'Reporting', name: 'Board report preparation', owner: 'CFO', dueDay: 12, status: 'not-started', priority: 'high', notes: '' },
  { id: 'rep-5', category: 'Reporting', name: 'Submit financials to external accountants', owner: 'CFO', dueDay: 15, status: 'not-started', priority: 'medium', notes: '' },
]

export const capitalItems: CapitalItem[] = [
  { label: 'Product & Engineering', amount: 4800000, color: '#4f46e5' },
  { label: 'Sales & Marketing', amount: 3200000, color: '#06b6d4' },
  { label: 'Operations', amount: 2100000, color: '#10b981' },
  { label: 'G&A', amount: 1400000, color: '#f59e0b' },
  { label: 'CapEx', amount: 800000, color: '#8b5cf6' },
  { label: 'Debt Service', amount: 700000, color: '#64748b' },
]

export const deptBudgets: DeptBudget[] = [
  { dept: 'Product & Engineering', budget: 4800000, actual: 4650000, forecast: 5100000 },
  { dept: 'Sales & Marketing', budget: 3200000, actual: 3410000, forecast: 3600000 },
  { dept: 'Operations', budget: 2100000, actual: 1980000, forecast: 2050000 },
  { dept: 'Finance & Legal', budget: 1400000, actual: 1320000, forecast: 1380000 },
  { dept: 'Customer Success', budget: 980000, actual: 1050000, forecast: 1100000 },
  { dept: 'HR & People', budget: 760000, actual: 720000, forecast: 750000 },
]

export const financialRatios: FinancialRatio[] = [
  { name: 'Current Ratio', value: 2.4, format: 'x', benchmark: 2.0, description: 'Current assets / current liabilities', direction: 'higher' },
  { name: 'Quick Ratio', value: 1.8, format: 'x', benchmark: 1.5, description: 'Liquid assets / current liabilities', direction: 'higher' },
  { name: 'Gross Margin', value: 65.0, format: '%', benchmark: 60.0, description: 'Gross profit / revenue', direction: 'higher' },
  { name: 'EBITDA Margin', value: 30.0, format: '%', benchmark: 25.0, description: 'EBITDA / revenue', direction: 'higher' },
  { name: 'Net Margin', value: 18.7, format: '%', benchmark: 15.0, description: 'Net income / revenue', direction: 'higher' },
  { name: 'Debt/Equity', value: 0.42, format: 'x', benchmark: 0.5, description: 'Total debt / total equity', direction: 'lower' },
  { name: 'DSO', value: 15, format: 'days', benchmark: 30, description: 'Days sales outstanding', direction: 'lower' },
  { name: 'DPO', value: 28, format: 'days', benchmark: 30, description: 'Days payable outstanding', direction: 'higher' },
  { name: 'Interest Coverage', value: 22.7, format: 'x', benchmark: 5.0, description: 'EBIT / interest expense', direction: 'higher' },
  { name: 'Cash Conversion', value: 88, format: '%', benchmark: 80, description: 'Operating cash / net income', direction: 'higher' },
]
