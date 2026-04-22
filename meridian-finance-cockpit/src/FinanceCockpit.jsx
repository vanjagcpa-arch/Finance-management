import React, { useState, useEffect, useMemo, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// MERIDIAN FINANCE COCKPIT — Fully Functional Finance Management App
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'meridian-finance-v1';

// ──────────────────────────────────────────────────────────────
// SEED DATA — Initial state if no saved data exists
// ──────────────────────────────────────────────────────────────
const SEED_DATA = {
  meta: {
    org: 'Meridian Industry Association',
    period: 'October 2024',
    preparedDate: '2024-11-07',
    currency: 'USD',
  },
  monthly: [
    { month: '2024-07', revenue: 388000, expenses: 340000, members: 1875, newMembers: 52, renewals: 92, demoRequests: 98, qualLeads: 71, nps: 70, eventRevenue: 95000, membershipRevenue: 256000, sponsorshipRevenue: 28000, otherRevenue: 9000 },
    { month: '2024-08', revenue: 367000, expenses: 348000, members: 1880, newMembers: 48, renewals: 91, demoRequests: 105, qualLeads: 74, nps: 71, eventRevenue: 78000, membershipRevenue: 264000, sponsorshipRevenue: 18000, otherRevenue: 7000 },
    { month: '2024-09', revenue: 341000, expenses: 352000, members: 1865, newMembers: 44, renewals: 89, demoRequests: 115, qualLeads: 78, nps: 70, eventRevenue: 65000, membershipRevenue: 241000, sponsorshipRevenue: 24000, otherRevenue: 11000 },
    { month: '2024-10', revenue: 412000, expenses: 390000, members: 1842, newMembers: 41, renewals: 88, demoRequests: 142, qualLeads: 87, nps: 68, eventRevenue: 118000, membershipRevenue: 248000, sponsorshipRevenue: 32000, otherRevenue: 14000 },
  ],
  budget: {
    revenue: 425000,
    expenses: 415000,
    membershipRevenue: 270000,
    eventRevenue: 140000,
    sponsorshipRevenue: 30000,
    otherRevenue: 15000,
    personnel: 255000,
    program: 92000,
    marketing: 40000,
    tech: 24000,
    ga: 4000,
  },
  costCategories: [
    { id: 'employee', name: 'Employee Costs', actual: 256000, budget: 272000, weight: 0.60, driver: 'Marketing Coordinator backfill pending ($7.5k savings) · Contractor ramp for fall conference', action: 'Finalise Dec hire to de-risk Q1 campaigns. Track monthly via COA headers.' },
    { id: 'technology', name: 'Technology', actual: 22000, budget: 24000, weight: 0.06, driver: 'Cloud optimization ($1.5k) · CRM renewal Jan (+12%)', action: 'Negotiate CRM renewal now. Review SaaS licence utilisation quarterly.' },
    { id: 'premises', name: 'Premises Costs', actual: 3800, budget: 4000, weight: 0.01, driver: 'Co-working membership steady', action: 'Lock in 2025 membership — consider dedicated space if headcount >30.' },
    { id: 'professional', name: 'Professional Services', actual: 13600, budget: 7800, weight: 0.04, driver: 'One-time $6k legal fees for sponsor contracts — $3k recoverable', action: 'Build legal retainer into 2025 base. Claim reimbursement from sponsor.' },
    { id: 'marketing', name: 'Marketing', actual: 38000, budget: 40000, weight: 0.10, driver: 'CAC at $612 vs $580 target; spend in line with plan', action: 'Reallocate $5k brand → performance for Q4 ROAS lift (+18% expected).' },
    { id: 'other', name: 'Other Costs', actual: 7100, budget: 6500, weight: 0.02, driver: 'Small over on travel from extra client visits', action: 'Monitor T&E; add pre-approval threshold at $2.5k/trip.' },
  ],
  balanceSheet: {
    cash: 2178000,
    accountsReceivable: 420000,
    otherCurrentAssets: 30000,
    accountsPayable: 148000,
    deferredRevenue: 382000,
    otherCurrentLiabilities: 38000,
    priorCash: 2156000,
    priorAR: 370000,
  },
  arAging: [
    { id: 1, period: 'Current (0-30 days)', amount: 242000, status: 'Normal collection cycle' },
    { id: 2, period: '31-60 days', amount: 109000, status: 'Within terms' },
    { id: 3, period: '61-90 days', amount: 44000, status: 'Follow-up in progress' },
    { id: 4, period: 'Over 90 days', amount: 25000, status: 'Escalated to collections' },
  ],
  risks: [
    { id: 1, name: 'Revenue Shortfall (Q4)', probability: 'High', impact: 'High', dollarImpact: -110000, mitigation: 'Active campaign launched', owner: 'CMO', status: 'Active' },
    { id: 2, name: 'Member Churn Acceleration', probability: 'High', impact: 'High', dollarImpact: -85000, mitigation: 'Retention program deployed', owner: 'Member Svcs', status: 'Active' },
    { id: 3, name: 'Event Revenue Volatility', probability: 'Medium', impact: 'High', dollarImpact: -50000, mitigation: 'Winter Summit 87% sold', owner: 'Events', status: 'Monitoring' },
    { id: 4, name: 'Cost Control Slippage', probability: 'Medium', impact: 'Medium', dollarImpact: -25000, mitigation: 'Monthly tracking in place', owner: 'CFO', status: 'Monitoring' },
    { id: 5, name: 'Staff Turnover', probability: 'Medium', impact: 'Low', dollarImpact: -15000, mitigation: 'Backfill pipeline active', owner: 'HR', status: 'Monitoring' },
  ],
  scenarios: [
    { id: 1, name: 'Bear Case', type: 'bear', revenueGrowth: -12, costGrowth: 2, churnRate: 16, conversionRate: 14, q1Revenue: 1050000, marCash: 2420000, runway: 4.8, assumptions: 'Renewal rate 84% · Low event attendance · Delayed conversions' },
    { id: 2, name: 'Base Case', type: 'base', revenueGrowth: 5, costGrowth: 4, churnRate: 12, conversionRate: 18, q1Revenue: 1190000, marCash: 2670000, runway: 5.4, assumptions: 'Renewal rate 88% · Event targets met · Normal conversion' },
    { id: 3, name: 'Bull Case', type: 'bull', revenueGrowth: 15, costGrowth: 5, churnRate: 8, conversionRate: 24, q1Revenue: 1340000, marCash: 2820000, runway: 6.1, assumptions: 'Renewal rate 92% · Strong event sales · Pipeline converts 24%' },
  ],
  actions: [
    { id: 1, title: 'Q4 Membership Acceleration Campaign', description: 'Deploy targeted outreach to 87 qualified leads. Convert 52 members by Nov 30.', owner: 'Sales / CMO', dueDate: '2024-11-15', startDate: '2024-11-04', impact: 9.2, urgency: 9, effort: 'L', status: 'In Progress', category: 'Revenue', linkedMetric: 'm_membership_rev', notes: 'Key Q4 driver. Pipeline review Mon 11/4.', subtasks: [{ id: 11, text: 'Brief sales team', done: true }, { id: 12, text: 'Launch email sequence', done: true }, { id: 13, text: 'Follow up enterprise leads', done: false }, { id: 14, text: 'Mid-campaign review', done: false }], blockers: [], created: '2024-10-28' },
    { id: 2, title: 'Optimize Demo-to-Conversion Funnel', description: 'Address 18% vs 24% benchmark gap. Interview demo participants and rework pricing presentation.', owner: 'Sales / Ops', dueDate: '2024-11-22', startDate: '2024-11-08', impact: 8.7, urgency: 7, effort: 'M', status: 'In Progress', category: 'Revenue', linkedMetric: null, notes: 'Stage gating issue per CRM analysis.', subtasks: [{ id: 21, text: 'Pull CRM funnel data', done: true }, { id: 22, text: 'Interview 10 won/lost prospects', done: false }, { id: 23, text: 'Recommend pricing changes', done: false }], blockers: [], created: '2024-10-30' },
    { id: 3, title: 'Secure Winter Summit Revenue', description: 'Push final 42 seats and 3 sponsorship packages by Nov 30.', owner: 'Events', dueDate: '2024-11-30', startDate: '2024-11-01', impact: 8.4, urgency: 9, effort: 'M', status: 'In Progress', category: 'Revenue', linkedMetric: 'm_event_rev_total', notes: 'Each sponsorship = $8k. VIP dinner upsell open.', subtasks: [{ id: 31, text: 'Partner channel push', done: true }, { id: 32, text: 'Member email campaign', done: false }, { id: 33, text: 'Close 2+ sponsors', done: false }], blockers: [], created: '2024-10-25' },
    { id: 4, title: 'At-Risk Member Retention Campaign', description: 'Target 180 members in bottom engagement quartile with personalized outreach.', owner: 'Member Svcs', dueDate: '2024-12-15', startDate: '2024-11-25', impact: 7.9, urgency: 5, effort: 'L', status: 'Planned', category: 'Revenue', linkedMetric: 'd_churn_rate', notes: 'Could prevent ~18 churned members worth $30k ARR.', subtasks: [{ id: 41, text: 'Segment at-risk list', done: false }, { id: 42, text: 'Build outreach templates', done: false }, { id: 43, text: 'Train member services team', done: false }], blockers: [], created: '2024-11-01' },
    { id: 5, title: 'Backfill Marketing Coordinator', description: 'Target Dec 1 start to support Q1 campaigns.', owner: 'HR / CMO', dueDate: '2024-11-29', startDate: '2024-10-25', impact: 6.8, urgency: 8, effort: 'M', status: 'In Progress', category: 'People', linkedMetric: 'd_headcount', notes: '3 final candidates. Reverses $14k/mo savings.', subtasks: [{ id: 51, text: 'Final round interviews', done: false }, { id: 52, text: 'Reference checks', done: false }, { id: 53, text: 'Extend offer', done: false }], blockers: [], created: '2024-10-20' },
    { id: 6, title: '2025 Budget Scenarios for Board', description: 'Three scenarios with sensitivity analysis. Present at Dec 7 board.', owner: 'CFO / CEO', dueDate: '2024-12-01', startDate: '2024-11-15', impact: 7.2, urgency: 6, effort: 'L', status: 'Planned', category: 'Strategy', linkedMetric: null, notes: 'Use xP&A model scenarios as basis.', subtasks: [{ id: 61, text: 'Build base case from xP&A', done: false }, { id: 62, text: 'Build bear/bull cases', done: false }, { id: 63, text: 'Sensitivity tables', done: false }, { id: 64, text: 'Board deck', done: false }], blockers: [], created: '2024-11-02' },
    { id: 7, title: 'Renegotiate CRM Contract', description: 'Lock multi-year terms before Jan 12% price increase.', owner: 'CFO', dueDate: '2024-12-15', startDate: '2024-11-18', impact: 6.5, urgency: 7, effort: 'S', status: 'Planned', category: 'Costs', linkedMetric: 'd_tech_cost', notes: 'Saves $8.6k/yr.', subtasks: [{ id: 71, text: 'Benchmark alternatives', done: false }, { id: 72, text: 'Negotiate with vendor', done: false }], blockers: [], created: '2024-11-03' },
    { id: 8, title: 'Monthly Board Update', description: 'Send November financial summary to board.', owner: 'CFO', dueDate: '2024-12-05', startDate: '2024-12-02', impact: 5.5, urgency: 6, effort: 'S', status: 'Planned', category: 'Strategy', linkedMetric: null, notes: 'Recurring monthly.', subtasks: [], blockers: [], created: '2024-11-01', recurring: 'monthly' },
  ],
  forecast: [
    { month: '2024-11', revenue: 468000, expenses: 342000, label: 'Forecast' },
    { month: '2024-12', revenue: 612000, expenses: 358000, label: 'Forecast' },
    { month: '2025-01', revenue: 398000, expenses: 360000, label: 'Forecast' },
    { month: '2025-02', revenue: 405000, expenses: 355000, label: 'Forecast' },
    { month: '2025-03', revenue: 388000, expenses: 362000, label: 'Forecast' },
    { month: '2025-04', revenue: 402000, expenses: 368000, label: 'Forecast' },
    { month: '2025-05', revenue: 418000, expenses: 372000, label: 'Forecast' },
    { month: '2025-06', revenue: 444000, expenses: 376000, label: 'Forecast' },
  ],

  // ════════════════════════════════════════════════════════════════
  // GOALS — Annual targets with time-based pacing
  // ════════════════════════════════════════════════════════════════
  goals: {
    year: 2024,
    fiscalStartMonth: 1, // January
    targets: [
      { id: 'g_revenue', label: 'Annual Revenue', metric: 'revenue_ytd', target: 5000000, unit: '$', icon: 'R', description: 'Total revenue across all streams' },
      { id: 'g_net_income', label: 'Net Income', metric: 'net_income_ytd', target: 450000, unit: '$', icon: 'N', description: 'Revenue minus all expenses' },
      { id: 'g_cash_min', label: 'Cash Floor', metric: 'cash_current', target: 2000000, unit: '$', icon: 'C', description: 'Maintain minimum cash balance', direction: 'maintain' },
      { id: 'g_members', label: 'Active Members', metric: 'members_current', target: 2100, unit: 'count', icon: 'M', description: 'Grow membership base' },
      { id: 'g_runway', label: 'Cash Runway', metric: 'runway_current', target: 6, unit: 'months', icon: 'T', description: 'Months of cash at current burn', direction: 'maintain' },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // CHART OF ACCOUNTS — Master list, used across Data, P&L, Forecast
  // Each account has monthlyValues: { 'YYYY-MM': amount } for historical and forecast periods
  // drivers: optional operational drivers for the account (e.g. headcount, ARPU)
  // Categories roll up into 6 expense headers, 4 revenue streams, plus BS lines
  // ════════════════════════════════════════════════════════════════
  chartOfAccounts: {
    expense: {
      employee: {
        name: 'Employee Costs',
        accounts: [
          { id: 'exp_emp_1', name: 'Salaries & Wages', monthlyValues: { '2024-07': 185000, '2024-08': 188000, '2024-09': 186000, '2024-10': 195000, '2024-11': 198000, '2024-12': 200000, '2025-01': 205000, '2025-02': 205000, '2025-03': 205000, '2025-04': 205000, '2025-05': 210000, '2025-06': 210000 }, drivers: { headcount: 22, avgSalary: 9000 }, notes: 'Gross salaries across all teams', committed: true },
          { id: 'exp_emp_2', name: 'Payroll Taxes & Benefits', monthlyValues: { '2024-07': 37000, '2024-08': 37600, '2024-09': 37200, '2024-10': 39000, '2024-11': 39600, '2024-12': 40000, '2025-01': 41000, '2025-02': 41000, '2025-03': 41000, '2025-04': 41000, '2025-05': 42000, '2025-06': 42000 }, drivers: { taxRate: 20 }, notes: '~20% of salary load', committed: true },
          { id: 'exp_emp_3', name: 'Contractors & Freelance', monthlyValues: { '2024-07': 8000, '2024-08': 12000, '2024-09': 15000, '2024-10': 12000, '2024-11': 10000, '2024-12': 8000, '2025-01': 10000, '2025-02': 10000, '2025-03': 10000, '2025-04': 10000, '2025-05': 10000, '2025-06': 10000 }, drivers: {}, notes: 'Short-term project help', committed: true },
          { id: 'exp_emp_4', name: 'Recruiting & Onboarding', monthlyValues: { '2024-07': 2000, '2024-08': 1500, '2024-09': 3000, '2024-10': 4500, '2024-11': 6000, '2024-12': 3500, '2025-01': 2000, '2025-02': 2000, '2025-03': 2000, '2025-04': 2000, '2025-05': 2000, '2025-06': 2000 }, drivers: {}, notes: 'Agencies, job boards, onboarding', committed: true },
          { id: 'exp_emp_5', name: 'Training & Development', monthlyValues: { '2024-07': 6000, '2024-08': 4000, '2024-09': 5000, '2024-10': 3500, '2024-11': 4000, '2024-12': 5500, '2025-01': 5000, '2025-02': 5000, '2025-03': 5000, '2025-04': 5000, '2025-05': 5000, '2025-06': 5000 }, drivers: {}, notes: 'L&D, certifications, conferences', committed: true },
        ],
      },
      technology: {
        name: 'Technology',
        accounts: [
          { id: 'exp_tech_1', name: 'Software Subscriptions', monthlyValues: { '2024-07': 8500, '2024-08': 8500, '2024-09': 8500, '2024-10': 8500, '2024-11': 8500, '2024-12': 8500, '2025-01': 9500, '2025-02': 9500, '2025-03': 9500, '2025-04': 9500, '2025-05': 9500, '2025-06': 9500 }, drivers: {}, notes: 'CRM, email, productivity — CRM renewal Jan +12%', committed: true },
          { id: 'exp_tech_2', name: 'Cloud Infrastructure', monthlyValues: { '2024-07': 6200, '2024-08': 6500, '2024-09': 5800, '2024-10': 5200, '2024-11': 5200, '2024-12': 5300, '2025-01': 5500, '2025-02': 5500, '2025-03': 5500, '2025-04': 5500, '2025-05': 5500, '2025-06': 5500 }, drivers: {}, notes: 'AWS / hosting — optimized Sept', committed: true },
          { id: 'exp_tech_3', name: 'Equipment & Hardware', monthlyValues: { '2024-07': 2500, '2024-08': 1500, '2024-09': 4500, '2024-10': 2000, '2024-11': 2000, '2024-12': 1500, '2025-01': 2000, '2025-02': 2000, '2025-03': 2000, '2025-04': 2000, '2025-05': 2000, '2025-06': 2000 }, drivers: {}, notes: 'Laptops, monitors, etc.', committed: true },
          { id: 'exp_tech_4', name: 'Security & Compliance', monthlyValues: { '2024-07': 1900, '2024-08': 1900, '2024-09': 1900, '2024-10': 1900, '2024-11': 1900, '2024-12': 1900, '2025-01': 2200, '2025-02': 2200, '2025-03': 2200, '2025-04': 2200, '2025-05': 2200, '2025-06': 2200 }, drivers: {}, notes: '1Password, Okta, audits', committed: true },
          { id: 'exp_tech_5', name: 'Analytics & Data Tools', monthlyValues: { '2024-07': 2400, '2024-08': 2400, '2024-09': 2400, '2024-10': 2400, '2024-11': 2400, '2024-12': 2400, '2025-01': 2600, '2025-02': 2600, '2025-03': 2600, '2025-04': 2600, '2025-05': 2600, '2025-06': 2600 }, drivers: {}, notes: 'Mixpanel, Amplitude, Looker', committed: true },
        ],
      },
      premises: {
        name: 'Premises Costs',
        accounts: [
          { id: 'exp_prem_1', name: 'Rent', monthlyValues: { '2024-07': 2400, '2024-08': 2400, '2024-09': 2400, '2024-10': 2400, '2024-11': 2400, '2024-12': 2400, '2025-01': 2500, '2025-02': 2500, '2025-03': 2500, '2025-04': 2500, '2025-05': 2500, '2025-06': 2500 }, drivers: {}, notes: 'Co-working membership', committed: true },
          { id: 'exp_prem_2', name: 'Utilities', monthlyValues: { '2024-07': 600, '2024-08': 650, '2024-09': 600, '2024-10': 550, '2024-11': 550, '2024-12': 600, '2025-01': 600, '2025-02': 600, '2025-03': 600, '2025-04': 600, '2025-05': 600, '2025-06': 600 }, drivers: {}, notes: 'Internet, phone', committed: true },
          { id: 'exp_prem_3', name: 'Office Supplies', monthlyValues: { '2024-07': 400, '2024-08': 350, '2024-09': 500, '2024-10': 450, '2024-11': 400, '2024-12': 400, '2025-01': 450, '2025-02': 450, '2025-03': 450, '2025-04': 450, '2025-05': 450, '2025-06': 450 }, drivers: {}, notes: '', committed: true },
          { id: 'exp_prem_4', name: 'Repairs & Maintenance', monthlyValues: { '2024-07': 200, '2024-08': 100, '2024-09': 300, '2024-10': 200, '2024-11': 200, '2024-12': 200, '2025-01': 200, '2025-02': 200, '2025-03': 200, '2025-04': 200, '2025-05': 200, '2025-06': 200 }, drivers: {}, notes: '', committed: true },
          { id: 'exp_prem_5', name: 'Cleaning & Services', monthlyValues: { '2024-07': 300, '2024-08': 300, '2024-09': 300, '2024-10': 300, '2024-11': 300, '2024-12': 300, '2025-01': 325, '2025-02': 325, '2025-03': 325, '2025-04': 325, '2025-05': 325, '2025-06': 325 }, drivers: {}, notes: 'Included in co-working typically', committed: true },
        ],
      },
      professional: {
        name: 'Professional Services',
        accounts: [
          { id: 'exp_prof_1', name: 'Legal Fees', monthlyValues: { '2024-07': 1500, '2024-08': 1500, '2024-09': 1500, '2024-10': 7500, '2024-11': 1500, '2024-12': 1500, '2025-01': 2000, '2025-02': 2000, '2025-03': 2000, '2025-04': 2000, '2025-05': 2000, '2025-06': 2000 }, drivers: {}, notes: 'Oct includes $6k sponsor contracts', committed: true },
          { id: 'exp_prof_2', name: 'Accounting & Audit', monthlyValues: { '2024-07': 2000, '2024-08': 2000, '2024-09': 2000, '2024-10': 2000, '2024-11': 2000, '2024-12': 2000, '2025-01': 2200, '2025-02': 2200, '2025-03': 2200, '2025-04': 2200, '2025-05': 2200, '2025-06': 2200 }, drivers: {}, notes: 'Bookkeeping + annual audit accrual', committed: true },
          { id: 'exp_prof_3', name: 'Consulting', monthlyValues: { '2024-07': 3000, '2024-08': 5000, '2024-09': 4000, '2024-10': 2000, '2024-11': 3000, '2024-12': 2000, '2025-01': 3000, '2025-02': 3000, '2025-03': 3000, '2025-04': 3000, '2025-05': 3000, '2025-06': 3000 }, drivers: {}, notes: 'External strategic advisors', committed: true },
          { id: 'exp_prof_4', name: 'Insurance', monthlyValues: { '2024-07': 1800, '2024-08': 1800, '2024-09': 1800, '2024-10': 1800, '2024-11': 1800, '2024-12': 1800, '2025-01': 1950, '2025-02': 1950, '2025-03': 1950, '2025-04': 1950, '2025-05': 1950, '2025-06': 1950 }, drivers: {}, notes: 'D&O + general liability', committed: true },
          { id: 'exp_prof_5', name: 'Memberships & Dues', monthlyValues: { '2024-07': 500, '2024-08': 500, '2024-09': 500, '2024-10': 500, '2024-11': 500, '2024-12': 500, '2025-01': 550, '2025-02': 550, '2025-03': 550, '2025-04': 550, '2025-05': 550, '2025-06': 550 }, drivers: {}, notes: 'Professional body fees', committed: true },
        ],
      },
      marketing: {
        name: 'Marketing',
        accounts: [
          { id: 'exp_mkt_1', name: 'Digital Advertising', monthlyValues: { '2024-07': 18000, '2024-08': 17000, '2024-09': 18500, '2024-10': 20000, '2024-11': 22000, '2024-12': 22000, '2025-01': 20000, '2025-02': 21000, '2025-03': 22000, '2025-04': 24000, '2025-05': 24000, '2025-06': 26000 }, drivers: { CAC: 612 }, notes: 'Google, LinkedIn, Meta — CAC target $580', committed: true },
          { id: 'exp_mkt_2', name: 'Content Production', monthlyValues: { '2024-07': 7000, '2024-08': 6500, '2024-09': 7000, '2024-10': 6500, '2024-11': 7000, '2024-12': 7500, '2025-01': 7500, '2025-02': 7500, '2025-03': 7500, '2025-04': 8000, '2025-05': 8000, '2025-06': 8000 }, drivers: {}, notes: 'Blog, social, video', committed: true },
          { id: 'exp_mkt_3', name: 'Events & Sponsorships', monthlyValues: { '2024-07': 5000, '2024-08': 4000, '2024-09': 6000, '2024-10': 5000, '2024-11': 5500, '2024-12': 5000, '2025-01': 5000, '2025-02': 5500, '2025-03': 5500, '2025-04': 6000, '2025-05': 6000, '2025-06': 6500 }, drivers: {}, notes: 'Industry conference presence', committed: true },
          { id: 'exp_mkt_4', name: 'Tools & Software', monthlyValues: { '2024-07': 2000, '2024-08': 2000, '2024-09': 2000, '2024-10': 2000, '2024-11': 2000, '2024-12': 2000, '2025-01': 2200, '2025-02': 2200, '2025-03': 2200, '2025-04': 2200, '2025-05': 2200, '2025-06': 2200 }, drivers: {}, notes: 'HubSpot, Mailchimp, SEO tools', committed: true },
          { id: 'exp_mkt_5', name: 'Brand & Creative', monthlyValues: { '2024-07': 4000, '2024-08': 5500, '2024-09': 3500, '2024-10': 4500, '2024-11': 4500, '2024-12': 4500, '2025-01': 4000, '2025-02': 4000, '2025-03': 4000, '2025-04': 4500, '2025-05': 4500, '2025-06': 4500 }, drivers: {}, notes: 'Agency retainer + design', committed: true },
        ],
      },
      other: {
        name: 'Other Costs',
        accounts: [
          { id: 'exp_oth_1', name: 'Travel & Entertainment', monthlyValues: { '2024-07': 3500, '2024-08': 2500, '2024-09': 4500, '2024-10': 3000, '2024-11': 3500, '2024-12': 3000, '2025-01': 3500, '2025-02': 3500, '2025-03': 3500, '2025-04': 4000, '2025-05': 4000, '2025-06': 4000 }, drivers: {}, notes: 'Client meetings, team offsites', committed: true },
          { id: 'exp_oth_2', name: 'Bank Fees & Interest', monthlyValues: { '2024-07': 400, '2024-08': 420, '2024-09': 410, '2024-10': 420, '2024-11': 420, '2024-12': 420, '2025-01': 450, '2025-02': 450, '2025-03': 450, '2025-04': 450, '2025-05': 450, '2025-06': 450 }, drivers: {}, notes: 'Merchant + FX fees', committed: true },
          { id: 'exp_oth_3', name: 'Subscriptions & Publications', monthlyValues: { '2024-07': 300, '2024-08': 300, '2024-09': 300, '2024-10': 300, '2024-11': 300, '2024-12': 300, '2025-01': 350, '2025-02': 350, '2025-03': 350, '2025-04': 350, '2025-05': 350, '2025-06': 350 }, drivers: {}, notes: 'Industry reports, journals', committed: true },
          { id: 'exp_oth_4', name: 'Depreciation', monthlyValues: { '2024-07': 1200, '2024-08': 1200, '2024-09': 1200, '2024-10': 1200, '2024-11': 1200, '2024-12': 1200, '2025-01': 1200, '2025-02': 1200, '2025-03': 1200, '2025-04': 1200, '2025-05': 1200, '2025-06': 1200 }, drivers: {}, notes: 'Non-cash — equipment', committed: true },
          { id: 'exp_oth_5', name: 'Misc & Contingency', monthlyValues: { '2024-07': 1000, '2024-08': 1500, '2024-09': 800, '2024-10': 1200, '2024-11': 1000, '2024-12': 1000, '2025-01': 1000, '2025-02': 1000, '2025-03': 1000, '2025-04': 1000, '2025-05': 1000, '2025-06': 1000 }, drivers: {}, notes: 'Buffer for unforeseen', committed: true },
        ],
      },
    },
    revenue: {
      membership: {
        name: 'Membership Revenue',
        accounts: [
          { id: 'rev_mem_1', name: 'Individual Tier', monthlyValues: { '2024-07': 106000, '2024-08': 108000, '2024-09': 104000, '2024-10': 102000, '2024-11': 106000, '2024-12': 108000, '2025-01': 110000, '2025-02': 112000, '2025-03': 114000, '2025-04': 116000, '2025-05': 118000, '2025-06': 120000 }, drivers: { count: 1250, arpu: 85 }, notes: '$85/mo', committed: true },
          { id: 'rev_mem_2', name: 'Team Tier', monthlyValues: { '2024-07': 115000, '2024-08': 118000, '2024-09': 110000, '2024-10': 112000, '2024-11': 115000, '2024-12': 118000, '2025-01': 118000, '2025-02': 120000, '2025-03': 122000, '2025-04': 124000, '2025-05': 126000, '2025-06': 128000 }, drivers: { count: 420, arpu: 275 }, notes: '5-seat teams', committed: true },
          { id: 'rev_mem_3', name: 'Enterprise Tier', monthlyValues: { '2024-07': 30000, '2024-08': 33000, '2024-09': 22000, '2024-10': 29000, '2024-11': 32000, '2024-12': 34000, '2025-01': 36000, '2025-02': 38000, '2025-03': 40000, '2025-04': 42000, '2025-05': 44000, '2025-06': 46000 }, drivers: { count: 62, arpu: 1800 }, notes: 'Custom contracts', committed: true },
          { id: 'rev_mem_4', name: 'Student Tier', monthlyValues: { '2024-07': 2500, '2024-08': 2800, '2024-09': 2700, '2024-10': 2700, '2024-11': 2800, '2024-12': 2900, '2025-01': 3000, '2025-02': 3100, '2025-03': 3200, '2025-04': 3300, '2025-05': 3400, '2025-06': 3500 }, drivers: { count: 110, arpu: 25 }, notes: 'Discounted', committed: true },
          { id: 'rev_mem_5', name: 'Add-ons & Upgrades', monthlyValues: { '2024-07': 2500, '2024-08': 2200, '2024-09': 2300, '2024-10': 2300, '2024-11': 2700, '2024-12': 2800, '2025-01': 2900, '2025-02': 3000, '2025-03': 3100, '2025-04': 3200, '2025-05': 3300, '2025-06': 3500 }, drivers: {}, notes: 'Extra seats, premium features', committed: true },
        ],
      },
      events: {
        name: 'Events Revenue',
        accounts: [
          { id: 'rev_ev_1', name: 'Conference Tickets', monthlyValues: { '2024-07': 45000, '2024-08': 20000, '2024-09': 15000, '2024-10': 88000, '2024-11': 25000, '2024-12': 145000, '2025-01': 0, '2025-02': 60000, '2025-03': 0, '2025-04': 95000, '2025-05': 0, '2025-06': 50000 }, drivers: { attendees: 380, avgTicket: 231 }, notes: 'Ticket sales by event', committed: true },
          { id: 'rev_ev_2', name: 'Event Sponsorship', monthlyValues: { '2024-07': 30000, '2024-08': 35000, '2024-09': 30000, '2024-10': 24000, '2024-11': 10000, '2024-12': 38000, '2025-01': 0, '2025-02': 15000, '2025-03': 0, '2025-04': 25000, '2025-05': 0, '2025-06': 15000 }, drivers: {}, notes: 'Per-event sponsor packages', committed: true },
          { id: 'rev_ev_3', name: 'Workshop Fees', monthlyValues: { '2024-07': 10000, '2024-08': 12000, '2024-09': 12000, '2024-10': 4000, '2024-11': 8000, '2024-12': 12000, '2025-01': 6000, '2025-02': 8000, '2025-03': 8000, '2025-04': 10000, '2025-05': 8000, '2025-06': 10000 }, drivers: {}, notes: 'Training workshops', committed: true },
          { id: 'rev_ev_4', name: 'Virtual Summits', monthlyValues: { '2024-07': 8000, '2024-08': 8000, '2024-09': 6000, '2024-10': 0, '2024-11': 0, '2024-12': 15000, '2025-01': 0, '2025-02': 10000, '2025-03': 0, '2025-04': 15000, '2025-05': 0, '2025-06': 10000 }, drivers: {}, notes: 'Online summits', committed: true },
          { id: 'rev_ev_5', name: 'Networking Events', monthlyValues: { '2024-07': 2000, '2024-08': 3000, '2024-09': 2000, '2024-10': 2000, '2024-11': 2000, '2024-12': 2000, '2025-01': 2000, '2025-02': 2000, '2025-03': 2000, '2025-04': 2000, '2025-05': 2000, '2025-06': 2000 }, drivers: {}, notes: 'Recurring meetups', committed: true },
        ],
      },
      sponsorship: {
        name: 'Sponsorship Revenue',
        accounts: [
          { id: 'rev_sp_1', name: 'Platinum Sponsors', monthlyValues: { '2024-07': 18000, '2024-08': 18000, '2024-09': 18000, '2024-10': 18000, '2024-11': 18000, '2024-12': 18000, '2025-01': 19500, '2025-02': 19500, '2025-03': 19500, '2025-04': 19500, '2025-05': 19500, '2025-06': 19500 }, drivers: { count: 4, fee: 4500 }, notes: '4 × $4,500/mo', committed: true },
          { id: 'rev_sp_2', name: 'Gold Sponsors', monthlyValues: { '2024-07': 13200, '2024-08': 13200, '2024-09': 13200, '2024-10': 13200, '2024-11': 13200, '2024-12': 13200, '2025-01': 13200, '2025-02': 13200, '2025-03': 13200, '2025-04': 13200, '2025-05': 13200, '2025-06': 13200 }, drivers: { count: 6, fee: 2200 }, notes: '6 × $2,200/mo', committed: true },
          { id: 'rev_sp_3', name: 'Silver Sponsors', monthlyValues: { '2024-07': 3800, '2024-08': 3800, '2024-09': 3800, '2024-10': 3800, '2024-11': 3800, '2024-12': 3800, '2025-01': 4750, '2025-02': 4750, '2025-03': 4750, '2025-04': 4750, '2025-05': 4750, '2025-06': 4750 }, drivers: { count: 4, fee: 950 }, notes: '4 × $950/mo', committed: true },
          { id: 'rev_sp_4', name: 'Media Partnerships', monthlyValues: { '2024-07': 2000, '2024-08': 2000, '2024-09': 2000, '2024-10': 2000, '2024-11': 2000, '2024-12': 2000, '2025-01': 2200, '2025-02': 2200, '2025-03': 2200, '2025-04': 2200, '2025-05': 2200, '2025-06': 2200 }, drivers: {}, notes: 'Content partnerships', committed: true },
          { id: 'rev_sp_5', name: 'Directory Listings', monthlyValues: { '2024-07': 1000, '2024-08': 1000, '2024-09': 1000, '2024-10': 1000, '2024-11': 1000, '2024-12': 1000, '2025-01': 1200, '2025-02': 1200, '2025-03': 1200, '2025-04': 1200, '2025-05': 1200, '2025-06': 1200 }, drivers: {}, notes: 'Vendor directory', committed: true },
        ],
      },
      other: {
        name: 'Other Revenue',
        accounts: [
          { id: 'rev_oth_1', name: 'Publications & Reports', monthlyValues: { '2024-07': 4500, '2024-08': 3500, '2024-09': 4500, '2024-10': 5000, '2024-11': 5000, '2024-12': 5500, '2025-01': 5000, '2025-02': 5200, '2025-03': 5500, '2025-04': 5500, '2025-05': 6000, '2025-06': 6000 }, drivers: {}, notes: 'Industry research', committed: true },
          { id: 'rev_oth_2', name: 'Consulting Services', monthlyValues: { '2024-07': 2500, '2024-08': 2000, '2024-09': 4000, '2024-10': 5500, '2024-11': 4500, '2024-12': 5000, '2025-01': 4000, '2025-02': 4500, '2025-03': 4500, '2025-04': 5000, '2025-05': 5000, '2025-06': 5500 }, drivers: {}, notes: 'Advisory hours', committed: true },
          { id: 'rev_oth_3', name: 'Certification & Training', monthlyValues: { '2024-07': 1500, '2024-08': 1000, '2024-09': 2000, '2024-10': 2500, '2024-11': 3500, '2024-12': 4500, '2025-01': 2500, '2025-02': 3000, '2025-03': 3500, '2025-04': 3500, '2025-05': 4000, '2025-06': 4500 }, drivers: {}, notes: 'Certification fees', committed: true },
          { id: 'rev_oth_4', name: 'Affiliate Revenue', monthlyValues: { '2024-07': 300, '2024-08': 400, '2024-09': 300, '2024-10': 500, '2024-11': 500, '2024-12': 600, '2025-01': 500, '2025-02': 600, '2025-03': 600, '2025-04': 700, '2025-05': 700, '2025-06': 800 }, drivers: {}, notes: 'Partner referrals', committed: true },
          { id: 'rev_oth_5', name: 'Interest & Other', monthlyValues: { '2024-07': 200, '2024-08': 100, '2024-09': 200, '2024-10': 500, '2024-11': 500, '2024-12': 400, '2025-01': 300, '2025-02': 300, '2025-03': 400, '2025-04': 400, '2025-05': 400, '2025-06': 500 }, drivers: {}, notes: 'Bank interest, misc', committed: true },
        ],
      },
    },
    balanceSheet: {
      assets: [
        { id: 'bs_a_1', name: 'Cash & Cash Equivalents', monthlyValues: { '2024-07': 2100000, '2024-08': 2140000, '2024-09': 2156000, '2024-10': 2178000, '2024-11': 2220000, '2024-12': 2310000, '2025-01': 2290000, '2025-02': 2310000, '2025-03': 2320000, '2025-04': 2350000, '2025-05': 2395000, '2025-06': 2450000 }, notes: 'Operating cash + money market', committed: true },
          { id: 'bs_a_2', name: 'Accounts Receivable', monthlyValues: { '2024-07': 340000, '2024-08': 360000, '2024-09': 370000, '2024-10': 420000, '2024-11': 400000, '2024-12': 450000, '2025-01': 410000, '2025-02': 415000, '2025-03': 420000, '2025-04': 425000, '2025-05': 430000, '2025-06': 435000 }, notes: 'Outstanding invoices — 31 day DSO', committed: true },
          { id: 'bs_a_3', name: 'Prepaid Expenses', monthlyValues: { '2024-07': 20000, '2024-08': 22000, '2024-09': 24000, '2024-10': 25000, '2024-11': 25000, '2024-12': 24000, '2025-01': 28000, '2025-02': 27000, '2025-03': 26000, '2025-04': 30000, '2025-05': 29000, '2025-06': 28000 }, notes: 'Annual subscriptions, insurance', committed: true },
          { id: 'bs_a_4', name: 'Other Current Assets', monthlyValues: { '2024-07': 8000, '2024-08': 7000, '2024-09': 6000, '2024-10': 5000, '2024-11': 5000, '2024-12': 5000, '2025-01': 6000, '2025-02': 6000, '2025-03': 6000, '2025-04': 6000, '2025-05': 6000, '2025-06': 6000 }, notes: 'Deposits, misc', committed: true },
          { id: 'bs_a_5', name: 'Fixed Assets (net)', monthlyValues: { '2024-07': 45000, '2024-08': 43800, '2024-09': 42600, '2024-10': 41400, '2024-11': 40200, '2024-12': 39000, '2025-01': 37800, '2025-02': 36600, '2025-03': 35400, '2025-04': 34200, '2025-05': 33000, '2025-06': 31800 }, notes: 'Equipment net of depreciation', committed: true },
      ],
      liabilities: [
        { id: 'bs_l_1', name: 'Accounts Payable', monthlyValues: { '2024-07': 120000, '2024-08': 130000, '2024-09': 135000, '2024-10': 148000, '2024-11': 140000, '2024-12': 155000, '2025-01': 145000, '2025-02': 148000, '2025-03': 150000, '2025-04': 152000, '2025-05': 154000, '2025-06': 156000 }, notes: 'Vendor payables — 30 day DPO', committed: true },
        { id: 'bs_l_2', name: 'Deferred Revenue', monthlyValues: { '2024-07': 360000, '2024-08': 370000, '2024-09': 375000, '2024-10': 382000, '2024-11': 385000, '2024-12': 395000, '2025-01': 400000, '2025-02': 405000, '2025-03': 410000, '2025-04': 415000, '2025-05': 420000, '2025-06': 425000 }, notes: 'Annual memberships prepaid', committed: true },
        { id: 'bs_l_3', name: 'Accrued Expenses', monthlyValues: { '2024-07': 30000, '2024-08': 32000, '2024-09': 34000, '2024-10': 35000, '2024-11': 35000, '2024-12': 38000, '2025-01': 36000, '2025-02': 36000, '2025-03': 36000, '2025-04': 37000, '2025-05': 37000, '2025-06': 38000 }, notes: 'Accrued salaries, audit', committed: true },
        { id: 'bs_l_4', name: 'Other Current Liabilities', monthlyValues: { '2024-07': 3000, '2024-08': 3000, '2024-09': 3000, '2024-10': 3000, '2024-11': 3000, '2024-12': 3000, '2025-01': 3000, '2025-02': 3000, '2025-03': 3000, '2025-04': 3000, '2025-05': 3000, '2025-06': 3000 }, notes: 'Taxes, deposits', committed: true },
        { id: 'bs_l_5', name: 'Long-term Debt', monthlyValues: { '2024-07': 0, '2024-08': 0, '2024-09': 0, '2024-10': 0, '2024-11': 0, '2024-12': 0, '2025-01': 0, '2025-02': 0, '2025-03': 0, '2025-04': 0, '2025-05': 0, '2025-06': 0 }, notes: 'Currently debt-free', committed: true },
      ],
      equity: [
        { id: 'bs_e_1', name: 'Paid-in Capital', monthlyValues: { '2024-07': 1500000, '2024-08': 1500000, '2024-09': 1500000, '2024-10': 1500000, '2024-11': 1500000, '2024-12': 1500000, '2025-01': 1500000, '2025-02': 1500000, '2025-03': 1500000, '2025-04': 1500000, '2025-05': 1500000, '2025-06': 1500000 }, notes: 'Founder + seed investment', committed: true },
        { id: 'bs_e_2', name: 'Retained Earnings', monthlyValues: { '2024-07': 500000, '2024-08': 518000, '2024-09': 525000, '2024-10': 551000, '2024-11': 577000, '2024-12': 627000, '2025-01': 637000, '2025-02': 652000, '2025-03': 662000, '2025-04': 687000, '2025-05': 717000, '2025-06': 747000 }, notes: 'Accumulated net income', committed: true },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // XP&A MODEL — Driver-based forecasting inspired by Lucanet/Causal
  // ════════════════════════════════════════════════════════════════
  forecastModel: {
    // Active scenario — all calculations use this scenario's overrides
    activeScenario: 'base',

    // Period configuration
    periods: ['2024-11', '2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'],

    // ─────────────────────────────────────────────────────────────
    // DRIVERS — Raw inputs organized into logical groups
    // Each driver has monthly values; can be constants or varying
    // ─────────────────────────────────────────────────────────────
    drivers: [
      // MEMBERSHIP DRIVERS
      { id: 'd_members_start', name: 'Starting Members', group: 'Membership', unit: 'count', values: { '2024-11': 1842, '2024-12': 0, '2025-01': 0, '2025-02': 0, '2025-03': 0, '2025-04': 0, '2025-05': 0, '2025-06': 0 }, description: 'Carries from previous month for 2024-12 onward — formula-driven' },
      { id: 'd_new_members', name: 'New Members Added', group: 'Membership', unit: 'count', values: { '2024-11': 52, '2024-12': 68, '2025-01': 42, '2025-02': 45, '2025-03': 48, '2025-04': 50, '2025-05': 52, '2025-06': 55 }, description: 'New signups per month' },
      { id: 'd_churn_rate', name: 'Monthly Churn Rate', group: 'Membership', unit: '%', values: { '2024-11': 2.5, '2024-12': 2.2, '2025-01': 2.8, '2025-02': 2.6, '2025-03': 2.4, '2025-04': 2.3, '2025-05': 2.2, '2025-06': 2.1 }, description: 'Percentage of members churning per month' },
      { id: 'd_arpu', name: 'Average Revenue Per Member', group: 'Membership', unit: '$', values: { '2024-11': 135, '2024-12': 135, '2025-01': 137, '2025-02': 137, '2025-03': 137, '2025-04': 140, '2025-05': 140, '2025-06': 140 }, description: 'Monthly recurring revenue per member' },

      // EVENT DRIVERS
      { id: 'd_event_attendees', name: 'Event Attendees', group: 'Events', unit: 'count', values: { '2024-11': 180, '2024-12': 380, '2025-01': 0, '2025-02': 120, '2025-03': 0, '2025-04': 200, '2025-05': 0, '2025-06': 150 }, description: 'Paying attendees per month (0 = no event)' },
      { id: 'd_event_price', name: 'Average Event Ticket', group: 'Events', unit: '$', values: { '2024-11': 320, '2024-12': 480, '2025-01': 0, '2025-02': 280, '2025-03': 0, '2025-04': 350, '2025-05': 0, '2025-06': 310 }, description: 'Average ticket price per event' },
      { id: 'd_event_sponsor', name: 'Event Sponsorship', group: 'Events', unit: '$', values: { '2024-11': 14000, '2024-12': 38000, '2025-01': 0, '2025-02': 12000, '2025-03': 0, '2025-04': 18000, '2025-05': 0, '2025-06': 10000 }, description: 'Sponsorship revenue tied to events' },

      // ONGOING SPONSORSHIP
      { id: 'd_sponsors_count', name: 'Active Sponsors', group: 'Sponsorship', unit: 'count', values: { '2024-11': 14, '2024-12': 15, '2025-01': 15, '2025-02': 16, '2025-03': 16, '2025-04': 17, '2025-05': 17, '2025-06': 18 }, description: 'Number of ongoing monthly sponsors' },
      { id: 'd_sponsor_fee', name: 'Avg Sponsor Fee', group: 'Sponsorship', unit: '$', values: { '2024-11': 2300, '2024-12': 2300, '2025-01': 2400, '2025-02': 2400, '2025-03': 2400, '2025-04': 2400, '2025-05': 2500, '2025-06': 2500 }, description: 'Monthly fee per sponsor' },

      // OTHER REVENUE
      { id: 'd_other_rev', name: 'Other Revenue', group: 'Other', unit: '$', values: { '2024-11': 14000, '2024-12': 16000, '2025-01': 12000, '2025-02': 13000, '2025-03': 14000, '2025-04': 14000, '2025-05': 15000, '2025-06': 15000 }, description: 'Publications, consulting, misc' },

      // COST DRIVERS
      { id: 'd_headcount', name: 'Headcount (FTE)', group: 'Costs', unit: 'count', values: { '2024-11': 22, '2024-12': 23, '2025-01': 24, '2025-02': 24, '2025-03': 24, '2025-04': 24, '2025-05': 25, '2025-06': 25 }, description: 'Full-time employees' },
      { id: 'd_avg_salary', name: 'Avg Fully Loaded Salary', group: 'Costs', unit: '$', values: { '2024-11': 10800, '2024-12': 10800, '2025-01': 11100, '2025-02': 11100, '2025-03': 11100, '2025-04': 11100, '2025-05': 11100, '2025-06': 11100 }, description: 'Monthly including benefits & taxes' },
      { id: 'd_program_cost', name: 'Program Costs', group: 'Costs', unit: '$', values: { '2024-11': 78000, '2024-12': 95000, '2025-01': 72000, '2025-02': 80000, '2025-03': 74000, '2025-04': 82000, '2025-05': 76000, '2025-06': 84000 }, description: 'Program delivery and events' },
      { id: 'd_marketing_cost', name: 'Marketing Spend', group: 'Costs', unit: '$', values: { '2024-11': 40000, '2024-12': 42000, '2025-01': 38000, '2025-02': 40000, '2025-03': 42000, '2025-04': 45000, '2025-05': 45000, '2025-06': 48000 }, description: 'All marketing and sales costs' },
      { id: 'd_tech_cost', name: 'Technology Spend', group: 'Costs', unit: '$', values: { '2024-11': 22000, '2024-12': 22000, '2025-01': 24500, '2025-02': 24500, '2025-03': 24500, '2025-04': 24500, '2025-05': 24500, '2025-06': 24500 }, description: 'Tech & ops — CRM renewal hits Jan' },
      { id: 'd_ga_cost', name: 'General & Admin', group: 'Costs', unit: '$', values: { '2024-11': 4000, '2024-12': 4000, '2025-01': 5000, '2025-02': 5000, '2025-03': 5000, '2025-04': 5000, '2025-05': 5000, '2025-06': 5000 }, description: 'Legal, office, admin' },

      // WORKING CAPITAL DRIVERS
      { id: 'd_dso', name: 'Days Sales Outstanding', group: 'Working Capital', unit: 'days', values: { '2024-11': 31, '2024-12': 31, '2025-01': 31, '2025-02': 31, '2025-03': 31, '2025-04': 31, '2025-05': 31, '2025-06': 31 }, description: 'Average collection period' },
      { id: 'd_dpo', name: 'Days Payable Outstanding', group: 'Working Capital', unit: 'days', values: { '2024-11': 30, '2024-12': 30, '2025-01': 30, '2025-02': 30, '2025-03': 30, '2025-04': 30, '2025-05': 30, '2025-06': 30 }, description: 'Average payment period' },
    ],

    // ─────────────────────────────────────────────────────────────
    // METRICS — Calculated formulas (human-readable, Causal-style)
    // Can reference drivers by name or id, and other metrics
    // Special: [prev] = previous month value
    // ─────────────────────────────────────────────────────────────
    metrics: [
      // MEMBERSHIP — rolling calculations
      { id: 'm_members', name: 'Active Members', group: 'Membership', unit: 'count', formula: '[prev:m_members] + d_new_members - ([prev:m_members] * d_churn_rate / 100)', initialValue: 1842, description: 'Ending members = prior + new - churned' },
      { id: 'm_membership_rev', name: 'Membership Revenue', group: 'Revenue', unit: '$', formula: 'm_members * d_arpu', description: 'Members × ARPU' },

      // EVENT REVENUE
      { id: 'm_event_ticket_rev', name: 'Event Ticket Revenue', group: 'Revenue', unit: '$', formula: 'd_event_attendees * d_event_price', description: 'Attendees × ticket price' },
      { id: 'm_event_rev_total', name: 'Total Event Revenue', group: 'Revenue', unit: '$', formula: 'm_event_ticket_rev + d_event_sponsor', description: 'Tickets + event sponsorships' },

      // ONGOING SPONSORSHIP
      { id: 'm_sponsor_rev', name: 'Ongoing Sponsorship Revenue', group: 'Revenue', unit: '$', formula: 'd_sponsors_count * d_sponsor_fee', description: 'Sponsors × avg fee' },

      // TOTAL REVENUE
      { id: 'm_total_revenue', name: 'Total Revenue', group: 'Revenue', unit: '$', formula: 'm_membership_rev + m_event_rev_total + m_sponsor_rev + d_other_rev', description: 'Sum of all revenue streams', isPinned: true },

      // COSTS
      { id: 'm_personnel', name: 'Personnel Costs', group: 'Costs', unit: '$', formula: 'd_headcount * d_avg_salary', description: 'Headcount × loaded salary' },
      { id: 'm_total_costs', name: 'Total Costs', group: 'Costs', unit: '$', formula: 'm_personnel + d_program_cost + d_marketing_cost + d_tech_cost + d_ga_cost', description: 'Sum of all expense categories', isPinned: true },

      // P&L
      { id: 'm_gross_margin', name: 'Gross Margin %', group: 'P&L', unit: '%', formula: '((m_total_revenue - d_program_cost) / m_total_revenue) * 100', description: 'Revenue less direct program costs' },
      { id: 'm_net_income', name: 'Net Income', group: 'P&L', unit: '$', formula: 'm_total_revenue - m_total_costs', description: 'Revenue minus all costs', isPinned: true },

      // WORKING CAPITAL (Balance Sheet linkage)
      { id: 'm_ar', name: 'Accounts Receivable', group: 'Balance Sheet', unit: '$', formula: '(m_total_revenue * d_dso) / 30', description: 'Revenue × DSO / 30' },
      { id: 'm_ap', name: 'Accounts Payable', group: 'Balance Sheet', unit: '$', formula: '(m_total_costs * d_dpo) / 30', description: 'Costs × DPO / 30' },

      // CASH FLOW (Three-way linkage)
      { id: 'm_change_ar', name: 'Δ Accounts Receivable', group: 'Cash Flow', unit: '$', formula: 'm_ar - [prev:m_ar]', initialValue: 420000, description: 'Change in AR (uses cash)' },
      { id: 'm_change_ap', name: 'Δ Accounts Payable', group: 'Cash Flow', unit: '$', formula: 'm_ap - [prev:m_ap]', initialValue: 148000, description: 'Change in AP (provides cash)' },
      { id: 'm_operating_cash', name: 'Operating Cash Flow', group: 'Cash Flow', unit: '$', formula: 'm_net_income - m_change_ar + m_change_ap', description: 'Net income adjusted for working capital' },
      { id: 'm_cash_balance', name: 'Ending Cash Balance', group: 'Cash Flow', unit: '$', formula: '[prev:m_cash_balance] + m_operating_cash', initialValue: 2178000, description: 'Rolling cash balance', isPinned: true },
      { id: 'm_runway', name: 'Cash Runway (months)', group: 'Cash Flow', unit: 'months', formula: 'm_cash_balance / m_total_costs', description: 'Current cash divided by monthly burn' },
    ],

    // ─────────────────────────────────────────────────────────────
    // SCENARIOS — Override driver values per scenario
    // Each scenario stores deltas from the base model
    // ─────────────────────────────────────────────────────────────
    scenarios: [
      {
        id: 'base',
        name: 'Base Case',
        description: 'Most likely forecast based on current pipeline',
        color: C.text2,
        overrides: {}, // No overrides = use default driver values
      },
      {
        id: 'bear',
        name: 'Bear Case',
        description: 'Conservative: softer renewals, lower event turnout',
        color: '#D9D9D9',
        overrides: {
          // Example: globally reduce new members by 30%, increase churn
          d_new_members: { multiplier: 0.7 },
          d_churn_rate: { adder: 0.8 },
          d_event_attendees: { multiplier: 0.75 },
          d_sponsors_count: { multiplier: 0.9 },
        },
      },
      {
        id: 'bull',
        name: 'Bull Case',
        description: 'Aggressive: Q4 campaign works, strong execution',
        color: '#000000',
        overrides: {
          d_new_members: { multiplier: 1.3 },
          d_churn_rate: { multiplier: 0.8 },
          d_event_attendees: { multiplier: 1.15 },
          d_sponsors_count: { adder: 2 },
          d_arpu: { multiplier: 1.03 },
        },
      },
    ],

    // Optional: user-defined custom formulas added via UI
    customFormulas: [],
  },
};

// ──────────────────────────────────────────────────────────────
// HOOKS
// ──────────────────────────────────────────────────────────────

// Viewport detection for responsive layout
function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return { width, isMobile: width < 640, isTablet: width >= 640 && width < 1024, isDesktop: width >= 1024 };
}

function useFinanceData() {
  const [data, setData] = useState(SEED_DATA);
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result?.value) {
          setData(JSON.parse(result.value));
        }
      } catch (e) {
        // Key doesn't exist yet — use seed
      }
      setLoaded(true);
    })();
  }, []);

  const save = async (newData, skipHistory = false) => {
    if (!skipHistory) {
      setHistory((prev) => [...prev.slice(-19), data]); // Keep last 20 states
      setFuture([]); // Clear redo stack on new edit
    }
    setData(newData);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const undo = async () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [data, ...prev]);
    setData(previous);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(previous));
    } catch (e) {}
  };

  const redo = async () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, data]);
    setData(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  const reset = async () => {
    setHistory((prev) => [...prev.slice(-19), data]);
    setFuture([]);
    setData(SEED_DATA);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(SEED_DATA));
    } catch (e) {}
  };

  return { data, save, reset, undo, redo, loaded, canUndo: history.length > 0, canRedo: future.length > 0 };
}

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(decimals + 1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(decimals)}k`;
  return `$${n.toFixed(decimals)}`;
};

const fmtFull = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
};

const fmtNum = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US').format(n);
};

const monthLabel = (m) => {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
};

const variancePct = (actual, budget) => {
  if (!budget) return 0;
  return ((actual - budget) / budget) * 100;
};

// ══════════════════════════════════════════════════════════════
// FORECAST ENGINE — Driver-based formula evaluation (Causal/xP&A inspired)
// ══════════════════════════════════════════════════════════════

/**
 * Apply a scenario override to a driver value.
 * Supports: multiplier, adder, override (set absolute value)
 */
function applyOverride(baseValue, override) {
  if (!override) return baseValue;
  let v = baseValue;
  if (override.override !== undefined) return override.override;
  if (override.multiplier !== undefined) v *= override.multiplier;
  if (override.adder !== undefined) v += override.adder;
  return v;
}

/**
 * Get driver value for a specific month, applying active scenario.
 */
function getDriverValue(driver, month, scenario) {
  const baseValue = driver.values[month] ?? 0;
  const override = scenario?.overrides?.[driver.id];
  return applyOverride(baseValue, override);
}

/**
 * Parse a formula and return list of referenced driver/metric IDs.
 * References can be: driver_id, metric_id, or [prev:metric_id]
 */
function getFormulaDependencies(formula) {
  const deps = new Set();
  const prevDeps = new Set();

  // Match [prev:xxx] patterns first
  const prevMatches = formula.matchAll(/\[prev:([a-z_][a-z0-9_]*)\]/gi);
  for (const m of prevMatches) prevDeps.add(m[1]);

  // Remove [prev:xxx] from formula, then match remaining identifiers
  const cleaned = formula.replace(/\[prev:[a-z_][a-z0-9_]*\]/gi, '');
  const refs = cleaned.matchAll(/\b([dm]_[a-z_][a-z0-9_]*)\b/gi);
  for (const m of refs) deps.add(m[1]);

  return { deps: Array.from(deps), prevDeps: Array.from(prevDeps) };
}

/**
 * Evaluate a formula for a specific month in a context of already-computed values.
 * context = { [id]: { [month]: value } }
 */
function evaluateFormula(formula, month, context, prevMonth) {
  if (!formula || formula.trim() === '') return 0;

  // Replace [prev:xxx] with actual previous-month values (or 0/initialValue)
  let expr = formula.replace(/\[prev:([a-z_][a-z0-9_]*)\]/gi, (match, id) => {
    if (!prevMonth) {
      // No previous month — should have been handled with initialValue before calling
      return '0';
    }
    const val = context[id]?.[prevMonth] ?? 0;
    return `(${val})`;
  });

  // Replace all identifiers with their month-specific values
  expr = expr.replace(/\b([dm]_[a-z_][a-z0-9_]*)\b/gi, (match, id) => {
    const val = context[id]?.[month] ?? 0;
    return `(${val})`;
  });

  // Safely evaluate using Function (sandboxed — no access to outer scope)
  try {
    // Only allow numbers, basic operators, parentheses, and Math functions
    // Strip anything else for safety
    const sanitized = expr.replace(/Math\.(abs|min|max|round|floor|ceil|pow|sqrt)/g, '__MATH_$1__');
    if (!/^[0-9+\-*/().\s,_A-Z]*$/.test(sanitized)) {
      console.warn('Invalid characters in formula:', formula, '→', sanitized);
      return 0;
    }
    const restored = sanitized.replace(/__MATH_(\w+)__/g, 'Math.$1');
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + restored + ')')();
    if (!isFinite(result)) return 0;
    return result;
  } catch (e) {
    console.warn('Formula evaluation error:', formula, e.message);
    return 0;
  }
}

/**
 * Compute all metric values across all periods for a given scenario.
 * Uses topological sort for dependency resolution.
 * Returns: { [id]: { [month]: value } } for all drivers and metrics
 */
function computeForecast(model, scenarioId) {
  const scenario = model.scenarios.find((s) => s.id === scenarioId) || model.scenarios[0];
  const context = {};
  const periods = model.periods;

  // Step 1: Materialize driver values for all periods (applying scenario overrides)
  for (const driver of model.drivers) {
    context[driver.id] = {};
    for (const month of periods) {
      context[driver.id][month] = getDriverValue(driver, month, scenario);
    }
  }

  // Step 2: Topologically sort metrics by non-prev dependencies
  // (prev dependencies are resolved sequentially by month)
  const metricMap = {};
  for (const m of model.metrics) metricMap[m.id] = m;

  // Build dependency graph (only same-month deps, prev deps are handled via ordering by month)
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) return; // cycle, skip
    const metric = metricMap[id];
    if (!metric) return;
    visiting.add(id);

    const { deps } = getFormulaDependencies(metric.formula);
    for (const dep of deps) {
      if (metricMap[dep]) visit(dep); // Only visit metrics, drivers are already materialized
    }

    visiting.delete(id);
    visited.add(id);
    sorted.push(id);
  }

  for (const m of model.metrics) visit(m.id);

  // Step 3: Initialize context for metrics with initialValue
  for (const metric of model.metrics) {
    context[metric.id] = {};
  }

  // Step 4: Evaluate metrics month by month
  for (let i = 0; i < periods.length; i++) {
    const month = periods[i];
    const prevMonth = i > 0 ? periods[i - 1] : null;

    for (const metricId of sorted) {
      const metric = metricMap[metricId];
      const { prevDeps } = getFormulaDependencies(metric.formula);

      // If first month and metric uses [prev:...], use initialValue for those prev refs
      let formula = metric.formula;
      if (i === 0 && prevDeps.length > 0) {
        // Replace [prev:xxx] with initialValue or 0
        formula = formula.replace(/\[prev:([a-z_][a-z0-9_]*)\]/gi, (match, id) => {
          const refMetric = metricMap[id];
          if (refMetric?.initialValue !== undefined) return String(refMetric.initialValue);
          // Fallback: check if the driver has an initial value
          return '0';
        });
      }

      const val = evaluateFormula(formula, month, context, prevMonth);
      context[metricId][month] = val;
    }
  }

  return context;
}

/**
 * Get a flat summary for a single month (useful for P&L rollups)
 */
function getMonthSummary(computed, metricIds, month) {
  const out = {};
  for (const id of metricIds) {
    out[id] = computed[id]?.[month] ?? 0;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────
// ACCOUNT HELPERS — Chart of accounts math
// ──────────────────────────────────────────────────────────────

// Get the monthly value for a single account in a given month
function accountValueForMonth(account, monthStr) {
  if (!account || !monthStr) return 0;
  if (account.monthlyValues && account.monthlyValues[monthStr] != null) {
    return account.monthlyValues[monthStr];
  }
  // Legacy fallback (for old account shape with monthlyRate × count)
  if (account.monthlyRate != null) {
    const startOk = !account.startDate || account.startDate <= monthStr;
    const endOk = !account.endDate || account.endDate >= monthStr;
    if (!startOk || !endOk) return 0;
    const oneTime = account.totalCost || account.totalRevenue || 0;
    if (oneTime > 0) {
      if (!account.endDate || account.endDate === account.startDate) {
        return monthStr === account.startDate ? oneTime : 0;
      }
      const months = monthDiffInclusive(account.startDate, account.endDate);
      return (monthStr >= account.startDate && monthStr <= account.endDate) ? oneTime / Math.max(1, months) : 0;
    }
    const count = account.count != null ? account.count : 1;
    return (account.monthlyRate || 0) * count;
  }
  return 0;
}

function monthDiffInclusive(startStr, endStr) {
  if (!startStr || !endStr) return 1;
  const [sy, sm] = startStr.split('-').map(Number);
  const [ey, em] = endStr.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

// Sum all accounts in an array for a specific month
function accountsTotalForMonth(accounts, monthStr) {
  if (!accounts) return 0;
  return accounts.reduce((sum, a) => sum + accountValueForMonth(a, monthStr), 0);
}

// Sum a header group (e.g. data.chartOfAccounts.expense.employee) for a month
function headerTotalForMonth(header, monthStr) {
  if (!header || !header.accounts) return 0;
  return accountsTotalForMonth(header.accounts, monthStr);
}

// Get all months used across all accounts in the chart of accounts
function getAllMonthsFromCOA(coa) {
  if (!coa) return [];
  const monthSet = new Set();
  const addFromAccounts = (accounts) => {
    (accounts || []).forEach((a) => {
      if (a.monthlyValues) {
        Object.keys(a.monthlyValues).forEach((m) => monthSet.add(m));
      }
    });
  };
  if (coa.expense) Object.values(coa.expense).forEach((h) => addFromAccounts(h.accounts));
  if (coa.revenue) Object.values(coa.revenue).forEach((h) => addFromAccounts(h.accounts));
  if (coa.balanceSheet) {
    addFromAccounts(coa.balanceSheet.assets);
    addFromAccounts(coa.balanceSheet.liabilities);
    addFromAccounts(coa.balanceSheet.equity);
  }
  return Array.from(monthSet).sort();
}

// New header configs — 6 expense headers matching chartOfAccounts.expense
const EXPENSE_HEADERS = [
  { key: 'employee', label: 'Employee Costs', description: 'Salaries, benefits, contractors, recruiting, training' },
  { key: 'technology', label: 'Technology', description: 'Software, infrastructure, hardware, security' },
  { key: 'premises', label: 'Premises Costs', description: 'Rent, utilities, supplies, maintenance' },
  { key: 'professional', label: 'Professional Services', description: 'Legal, accounting, consulting, insurance' },
  { key: 'marketing', label: 'Marketing', description: 'Advertising, content, events, brand' },
  { key: 'other', label: 'Other Costs', description: 'Travel, bank fees, depreciation, misc' },
];

const REVENUE_HEADERS = [
  { key: 'membership', label: 'Membership Revenue', description: 'Recurring subscription revenue by tier' },
  { key: 'events', label: 'Events Revenue', description: 'Tickets, sponsorship, workshops' },
  { key: 'sponsorship', label: 'Sponsorship Revenue', description: 'Ongoing sponsor contracts' },
  { key: 'other', label: 'Other Revenue', description: 'Publications, consulting, certifications' },
];

// Legacy bucket configs — mapped to new chartOfAccounts structure so P&L drilldowns work
const COST_BUCKETS = [
  { id: 'employee', key: 'employee', group: 'expense', name: 'Employee Costs', accountLabel: 'Account', countLabel: null, rateLabel: 'Monthly' },
  { id: 'technology', key: 'technology', group: 'expense', name: 'Technology', accountLabel: 'Account', countLabel: null, rateLabel: 'Monthly' },
  { id: 'premises', key: 'premises', group: 'expense', name: 'Premises Costs', accountLabel: 'Account', countLabel: null, rateLabel: 'Monthly' },
  { id: 'professional', key: 'professional', group: 'expense', name: 'Professional Services', accountLabel: 'Account', countLabel: null, rateLabel: 'Monthly' },
  { id: 'marketing', key: 'marketing', group: 'expense', name: 'Marketing', accountLabel: 'Account', countLabel: null, rateLabel: 'Monthly' },
  { id: 'other', key: 'other', group: 'expense', name: 'Other Costs', accountLabel: 'Account', countLabel: null, rateLabel: 'Monthly' },
];

const REVENUE_BUCKETS = [
  { id: 'rev_membership', key: 'membership', group: 'revenue', name: 'Membership Revenue', accountLabel: 'Tier', countLabel: null, rateLabel: 'Monthly' },
  { id: 'rev_events', key: 'events', group: 'revenue', name: 'Events Revenue', accountLabel: 'Event', countLabel: null, rateLabel: 'Monthly' },
  { id: 'rev_sponsorship', key: 'sponsorship', group: 'revenue', name: 'Sponsorship', accountLabel: 'Tier', countLabel: null, rateLabel: 'Monthly' },
  { id: 'rev_other', key: 'other', group: 'revenue', name: 'Other Revenue', accountLabel: 'Source', countLabel: null, rateLabel: 'Monthly' },
];

function EditableValue({ value, onChange, type = 'number', prefix = '', suffix = '', className = '', isCurrency = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (type === 'number') {
      const num = parseFloat(draft);
      if (!isNaN(num) && num !== value) onChange(num);
      else setDraft(value);
    } else {
      if (draft !== value) onChange(draft);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={`editable-input ${className}`}
        style={{
          background: '#fff',
          border: '1.5px solid #000',
          padding: '2px 6px',
          font: 'inherit',
          color: '#000',
          width: '100%',
          maxWidth: '140px',
          outline: 'none',
        }}
      />
    );
  }

  let displayValue = value;
  if (isCurrency && type === 'number') {
    displayValue = fmtFull(value);
  } else if (type === 'number') {
    displayValue = fmtNum(value);
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`editable-cell ${className}`}
      title="Click to edit"
      style={{
        cursor: 'pointer',
        borderBottom: '1px dotted transparent',
        transition: 'all 0.15s ease',
        padding: '1px 2px',
        display: 'inline-block',
      }}
      onMouseEnter={(e) => { e.target.style.borderBottomColor = '#808080'; e.target.style.background = '#F8F8F8'; }}
      onMouseLeave={(e) => { e.target.style.borderBottomColor = 'transparent'; e.target.style.background = 'transparent'; }}
    >
      {prefix}{displayValue}{suffix}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// AI INTEGRATION
// ──────────────────────────────────────────────────────────────
async function askClaude(question, contextData) {
  const systemPrompt = `You are Meridian AI, a finance co-pilot. You have full context of the current finance data. Be concise, direct, and analytical. Use specific numbers. Format with bold using **asterisks**. Keep responses 3-6 sentences unless detail is requested.

Current data context:
${JSON.stringify(contextData, null, 2)}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      }),
    });
    const data = await response.json();
    if (data.content?.length > 0) {
      const textBlock = data.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "No response generated.";
    }
    return "Sorry, I couldn't generate a response.";
  } catch (err) {
    return "Connection error. Please try again.";
  }
}

function formatAi(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px;">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function FinanceCockpit() {
  const { data, save, reset, undo, redo, loaded, canUndo, canRedo } = useFinanceData();
  const viewport = useViewport();
  const [activeView, setActiveView] = useState('dashboard');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: "Hi — I'm Meridian AI. I have full context of your live finance data. Ask me anything." },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't trigger in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      // Cmd/Ctrl + Z = undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          showToast('↶ Undone');
        }
      }
      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y = redo
      else if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        e.preventDefault();
        if (canRedo) {
          redo();
          showToast('↷ Redone');
        }
      }
      // Cmd/Ctrl + K = open AI
      else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setAiOpen(true);
      }
      // Number keys 1-7 = switch view
      else if (!e.metaKey && !e.ctrlKey && !e.altKey && /^[1-7]$/.test(e.key)) {
        const views = ['dashboard', 'pl', 'balance', 'forecast', 'risk', 'actions', 'data'];
        setActiveView(views[parseInt(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, undo, redo]);

  // Generate insight on first load
  useEffect(() => {
    if (loaded && !insight && !insightLoading) {
      generateInsight();
    }
  }, [loaded]);

  async function generateInsight() {
    setInsightLoading(true);
    const q = "Looking at the current data, what is the single MOST important non-obvious insight that leadership should focus on? Be specific and actionable. Maximum 2 sentences. No preamble.";
    const r = await askClaude(q, data);
    setInsight(r);
    setInsightLoading(false);
  }

  async function sendAiMessage(text) {
    if (!text.trim()) return;
    setAiMessages([...aiMessages, { role: 'user', text }]);
    setAiInput('');
    setAiLoading(true);
    const response = await askClaude(text, data);
    setAiMessages((prev) => [...prev, { role: 'assistant', text: response }]);
    setAiLoading(false);
  }

  // ────────── ALL HOOKS MUST RUN BEFORE ANY EARLY RETURN ──────────
  // xP&A Forecast — single source of truth, linked across app
  // useMemo MUST be called unconditionally on every render (React rules)
  const forecastComputed = useMemo(
    () => loaded ? computeForecast(data.forecastModel, data.forecastModel.activeScenario) : {},
    [data.forecastModel, loaded]
  );

  if (!loaded) {
    return <div style={styles.loading}>Loading Meridian Cockpit...</div>;
  }

  // ────────── Computed values (after loaded check, no hooks) ──────────
  const currentMonth = data.monthly[data.monthly.length - 1];
  const priorMonth = data.monthly[data.monthly.length - 2];
  const totalRevenue = currentMonth.revenue;
  const totalExpenses = currentMonth.expenses;
  const netIncome = totalRevenue - totalExpenses;
  const budgetNet = data.budget.revenue - data.budget.expenses;
  const cashRunway = data.balanceSheet.cash / totalExpenses;
  const workingCapital = (data.balanceSheet.cash + data.balanceSheet.accountsReceivable + data.balanceSheet.otherCurrentAssets) -
    (data.balanceSheet.accountsPayable + data.balanceSheet.deferredRevenue + data.balanceSheet.otherCurrentLiabilities);
  const totalAR = data.arAging.reduce((s, a) => s + a.amount, 0);
  const opEfficiency = (totalExpenses / totalRevenue) * 100;
  const totalAssets = data.balanceSheet.cash + data.balanceSheet.accountsReceivable + data.balanceSheet.otherCurrentAssets;
  const totalLiabilities = data.balanceSheet.accountsPayable + data.balanceSheet.deferredRevenue + data.balanceSheet.otherCurrentLiabilities;
  const activeScenario = data.forecastModel.scenarios.find((s) => s.id === data.forecastModel.activeScenario);

  // ────────── Render ──────────
  const appStyle = viewport.isMobile ? { ...styles.app, flexDirection: 'column' } : styles.app;
  const mainStyle = viewport.isMobile
    ? { ...styles.main, padding: '16px 14px 80px' }
    : styles.main;

  return (
    <div style={appStyle}>
      <Sidebar activeView={activeView} setActiveView={setActiveView} onReset={() => setShowResetConfirm(true)} canUndo={canUndo} canRedo={canRedo} onUndo={() => { undo(); showToast('↶ Undone'); }} onRedo={() => { redo(); showToast('↷ Redone'); }} viewport={viewport} />

      <div style={mainStyle}>
        <Header data={data} save={save} viewport={viewport} />

        <div style={styles.content}>
          {activeView === 'dashboard' && (
            <Dashboard
              data={data}
              save={save}
              insight={insight}
              insightLoading={insightLoading}
              regenerateInsight={generateInsight}
              currentMonth={currentMonth}
              priorMonth={priorMonth}
              netIncome={netIncome}
              cashRunway={cashRunway}
              opEfficiency={opEfficiency}
              setActiveView={setActiveView}
              forecastComputed={forecastComputed}
              activeScenario={activeScenario}
              viewport={viewport}
            />
          )}
          {activeView === 'pl' && (
            <ProfitLoss data={data} save={save} currentMonth={currentMonth} netIncome={netIncome} budgetNet={budgetNet} forecastComputed={forecastComputed} activeScenario={activeScenario} viewport={viewport} />
          )}
          {activeView === 'balance' && (
            <BalanceSheet data={data} save={save} workingCapital={workingCapital} totalAR={totalAR} totalAssets={totalAssets} totalLiabilities={totalLiabilities} cashRunway={cashRunway} totalExpenses={totalExpenses} forecastComputed={forecastComputed} activeScenario={activeScenario} viewport={viewport} />
          )}
          {activeView === 'forecast' && (
            <Forecast data={data} save={save} currentMonth={currentMonth} totalExpenses={totalExpenses} viewport={viewport} />
          )}
          {activeView === 'risk' && (
            <RiskScenarios data={data} save={save} viewport={viewport} />
          )}
          {activeView === 'actions' && (
            <Actions data={data} save={save} viewport={viewport} />
          )}
          {activeView === 'data' && (
            <DataManagement data={data} save={save} viewport={viewport} />
          )}
        </div>
      </div>

      {/* AI ASSISTANT */}
      {!aiOpen && (
        <button onClick={() => setAiOpen(true)} style={styles.aiFab} aria-label="Open AI">
          <span style={{ fontFamily: 'Lora, serif', fontSize: '20pt', fontWeight: 700 }}>M</span>
        </button>
      )}

      {aiOpen && (
        <AiPanel
          messages={aiMessages}
          input={aiInput}
          setInput={setAiInput}
          loading={aiLoading}
          onSend={sendAiMessage}
          onClose={() => setAiOpen(false)}
          dataContext={data}
        />
      )}

      {showResetConfirm && (
        <Modal title="Reset All Data" onClose={() => setShowResetConfirm(false)}>
          <p style={{ marginBottom: 16 }}>This will reset all your finance data back to the initial seed values. Any edits, scenarios, or actions you've added will be lost. This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button style={styles.btnSecondary} onClick={() => setShowResetConfirm(false)}>Cancel</button>
            <button style={styles.btnDanger} onClick={() => { reset(); setShowResetConfirm(false); showToast('✓ Reset to defaults'); }}>Reset Everything</button>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ══════════════════════════════════════════════════════════════
function Sidebar({ activeView, setActiveView, onReset, canUndo, canRedo, onUndo, onRedo, viewport }) {
  const groups = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', shortcut: '1' },
      ],
    },
    {
      label: 'Financials',
      items: [
        { id: 'pl', label: 'Profit & Loss', shortcut: '2' },
        { id: 'balance', label: 'Balance Sheet', shortcut: '3' },
        { id: 'forecast', label: 'Forecast', shortcut: '4' },
      ],
    },
    {
      label: 'Manage',
      items: [
        { id: 'risk', label: 'Risk & Scenarios', shortcut: '5' },
        { id: 'actions', label: 'Actions', shortcut: '6' },
      ],
    },
    {
      label: 'Data',
      items: [
        { id: 'data', label: 'Data Manager', shortcut: '7' },
      ],
    },
  ];

  const allItems = groups.flatMap(g => g.items);

  if (viewport && viewport.isMobile) {
    return (
      <div style={styles.bottomNav}>
        {allItems.map((item) => {
          const isActive = activeView === item.id;
          const itemStyle = isActive ? { ...styles.bottomNavItem, ...styles.bottomNavItemActive } : styles.bottomNavItem;
          const shortLabel = item.label.split(' ')[0].slice(0, 4);
          return (
            <div key={item.id} onClick={() => setActiveView(item.id)} style={itemStyle}>
              <span style={{ fontSize: '9pt', fontFamily: 'Lora, serif', fontWeight: 700, lineHeight: 1, marginBottom: 3 }}>{item.shortcut}</span>
              <span style={{ fontSize: '6pt', fontWeight: 500 }}>{shortLabel}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarLogo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: '13pt', fontWeight: 700, color: '#fff', flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontSize: '9pt', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Meridian</div>
            <div style={{ fontSize: '6.5pt', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Finance Cockpit</div>
          </div>
        </div>
      </div>

      {groups.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && <div style={styles.navDivider} />}
          <div style={styles.navGroupLabel}>{group.label}</div>
          {group.items.map((item) => {
            const isActive = activeView === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}
                title={item.label}
              >
                <span style={styles.navLabel}>{item.label}</span>
                <span style={{ fontSize: '6.5pt', fontFamily: 'monospace', color: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', padding: '1px 4px', flexShrink: 0 }}>{item.shortcut}</span>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <div style={styles.navDivider} />

      <div onClick={canUndo ? onUndo : undefined} style={{ ...styles.navAction, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }} title="Undo">
        <span style={{ fontSize: '12pt' }}>↶</span>
        <span style={{ fontSize: '8pt' }}>Undo</span>
      </div>
      <div onClick={canRedo ? onRedo : undefined} style={{ ...styles.navAction, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }} title="Redo">
        <span style={{ fontSize: '12pt' }}>↷</span>
        <span style={{ fontSize: '8pt' }}>Redo</span>
      </div>
      <div onClick={onReset} style={{ ...styles.navReset, marginBottom: 8 }} title="Reset all data">
        <span style={{ fontSize: '12pt' }}>↺</span>
        <span style={{ fontSize: '8pt' }}>Reset</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════════
function Header({ data, save, viewport }) {
  const updateMeta = (field, value) => {
    save({ ...data, meta: { ...data.meta, [field]: value } });
  };

  if (viewport && viewport.isMobile) {
    return (
      <div style={{ borderBottom: `2px solid ${C.text}`, paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ fontSize: '6pt', textTransform: 'uppercase', letterSpacing: '0.14em', color: C.text2, marginBottom: 2 }}>Finance Cockpit</div>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: '14pt', fontWeight: 700, lineHeight: 1.15, marginBottom: 4 }}>
          <EditableValue type="text" value={data.meta.org} onChange={(v) => updateMeta('org', v)} />
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '9pt', fontWeight: 600 }}>
            <EditableValue type="text" value={data.meta.period} onChange={(v) => updateMeta('period', v)} />
          </div>
          <div style={{ fontSize: '6.5pt', color: C.text2, fontStyle: 'italic' }}>Live</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: '18pt', fontWeight: 700, lineHeight: 1.1, color: C.text, letterSpacing: '-0.02em' }}>
            <EditableValue type="text" value={data.meta.org} onChange={(v) => updateMeta('org', v)} />
          </h1>
          <div style={{ fontSize: '7.5pt', color: C.text2, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
              Live · Auto-saved
            </span>
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '13pt', fontWeight: 600, color: C.text, lineHeight: 1.1 }}>
          <EditableValue type="text" value={data.meta.period} onChange={(v) => updateMeta('period', v)} />
        </div>
        <div style={{ fontSize: '7pt', color: C.text3, marginTop: 4 }}>Reporting period</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ══════════════════════════════════════════════════════════════
function Dashboard({ data, save, insight, insightLoading, regenerateInsight, currentMonth, priorMonth, netIncome, cashRunway, opEfficiency, setActiveView, forecastComputed, activeScenario, viewport }) {
  const isMobile = viewport && viewport.isMobile;

  // Month selector state — which historical month to view
  const [viewMonthIdx, setViewMonthIdx] = useState(data.monthly.length - 1);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  // Variance explain modal state
  const [explainItem, setExplainItem] = useState(null);
  const [explainText, setExplainText] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);

  // Weekly digest modal state
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestText, setDigestText] = useState('');
  const [digestLoading, setDigestLoading] = useState(false);

  // What-if slider state — temporary driver overrides for live simulation
  // Values are multipliers relative to baseline (1.0 = no change)
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfOverrides, setWhatIfOverrides] = useState({
    d_new_members: 1.0,
    d_churn_rate: 1.0,
    d_arpu: 1.0,
    d_headcount: 1.0,
    d_marketing_cost: 1.0,
  });

  // Goal editing state
  const [editingGoal, setEditingGoal] = useState(null);
  const [editGoalValue, setEditGoalValue] = useState('');

  // Month being viewed (may be historical)
  const viewMonth = data.monthly[viewMonthIdx] || currentMonth;
  const viewPrior = data.monthly[viewMonthIdx - 1] || priorMonth;
  const viewNet = viewMonth.revenue - viewMonth.expenses;
  const viewRunway = data.balanceSheet.cash / viewMonth.expenses;
  const isLatest = viewMonthIdx === data.monthly.length - 1;

  // Trend arrays — up to 6 months ending at viewMonthIdx
  const trendStart = Math.max(0, viewMonthIdx - 5);
  const trendSlice = data.monthly.slice(trendStart, viewMonthIdx + 1);
  const revTrend = trendSlice.map((m) => m.revenue);
  const expTrend = trendSlice.map((m) => m.expenses);
  const netTrend = trendSlice.map((m) => m.revenue - m.expenses);
  // Approximate cash trend by working backward from current cash using net income
  const cashTrend = (() => {
    const path = [data.balanceSheet.cash];
    for (let i = trendSlice.length - 1; i >= 1; i--) {
      path.unshift(path[0] - (trendSlice[i].revenue - trendSlice[i].expenses));
    }
    return path;
  })();

  // Forecast outlook — next 3 months from xP&A model
  const forecastPeriods = data.forecastModel.periods.slice(0, 3);
  const forecastSummary = useMemo(() => {
    const periods = forecastPeriods;
    const revenue = periods.map((p) => forecastComputed.m_total_revenue?.[p] ?? 0);
    const costs = periods.map((p) => forecastComputed.m_total_costs?.[p] ?? 0);
    const cash = periods.map((p) => forecastComputed.m_cash_balance?.[p] ?? 0);
    const totalRev = revenue.reduce((s, v) => s + v, 0);
    const totalCost = costs.reduce((s, v) => s + v, 0);
    const endCash = cash[cash.length - 1] ?? 0;
    return { periods, revenue, costs, cash, totalRev, totalCost, endCash };
  }, [forecastComputed, data.forecastModel.periods]);

  // Determine forecast health based on xP&A projection
  const forecastHealth = forecastSummary.endCash > data.balanceSheet.cash ? 'g' : forecastSummary.endCash > data.balanceSheet.cash * 0.85 ? 'a' : 'r';

  // ────────── WHAT-IF SIMULATION ──────────
  // Check if any slider has been touched
  const hasWhatIfChanges = Object.values(whatIfOverrides).some((v) => v !== 1.0);

  // Compute what-if forecast by applying slider multipliers on top of active scenario
  const whatIfForecast = useMemo(() => {
    if (!hasWhatIfChanges) return forecastComputed;
    // Build a modified model with whatIf overrides merged into active scenario
    const modified = {
      ...data.forecastModel,
      scenarios: data.forecastModel.scenarios.map((s) => {
        if (s.id !== data.forecastModel.activeScenario) return s;
        const mergedOverrides = { ...s.overrides };
        Object.keys(whatIfOverrides).forEach((driverId) => {
          const multiplier = whatIfOverrides[driverId];
          if (multiplier === 1.0) return;
          const existing = mergedOverrides[driverId] || {};
          const baseMultiplier = existing.multiplier || 1.0;
          mergedOverrides[driverId] = { ...existing, multiplier: baseMultiplier * multiplier };
        });
        return { ...s, overrides: mergedOverrides };
      }),
    };
    return computeForecast(modified, data.forecastModel.activeScenario);
  }, [whatIfOverrides, forecastComputed, data.forecastModel, hasWhatIfChanges]);

  // What-if summary — compare baseline vs whatIf for first forecast month
  const whatIfImpact = useMemo(() => {
    const firstPeriod = data.forecastModel.periods[0];
    const baseline = {
      revenue: forecastComputed.m_total_revenue?.[firstPeriod] ?? 0,
      costs: forecastComputed.m_total_costs?.[firstPeriod] ?? 0,
      netIncome: (forecastComputed.m_total_revenue?.[firstPeriod] ?? 0) - (forecastComputed.m_total_costs?.[firstPeriod] ?? 0),
      cash: forecastComputed.m_cash_balance?.[firstPeriod] ?? 0,
    };
    const modified = {
      revenue: whatIfForecast.m_total_revenue?.[firstPeriod] ?? 0,
      costs: whatIfForecast.m_total_costs?.[firstPeriod] ?? 0,
      netIncome: (whatIfForecast.m_total_revenue?.[firstPeriod] ?? 0) - (whatIfForecast.m_total_costs?.[firstPeriod] ?? 0),
      cash: whatIfForecast.m_cash_balance?.[firstPeriod] ?? 0,
    };
    return { baseline, modified };
  }, [whatIfForecast, forecastComputed, data.forecastModel.periods]);

  // ────────── GOAL TRACKING ──────────
  const goals = data.goals || { year: 2024, fiscalStartMonth: 1, targets: [] };
  // Calculate time-based pacing: what fraction of the fiscal year is done at the current month
  const currentMonthIdx = data.monthly.length > 0 ? (parseInt(data.monthly[data.monthly.length - 1].month.split('-')[1], 10)) : new Date().getMonth() + 1;
  const paceRatio = Math.max(0.01, Math.min(1, currentMonthIdx / 12));

  // Compute actuals for each goal
  const goalActuals = useMemo(() => {
    const revYtd = data.monthly.reduce((s, m) => s + m.revenue, 0);
    const netYtd = data.monthly.reduce((s, m) => s + (m.revenue - m.expenses), 0);
    const lastMo = data.monthly[data.monthly.length - 1];
    return {
      revenue_ytd: revYtd,
      net_income_ytd: netYtd,
      cash_current: data.balanceSheet.cash,
      members_current: lastMo ? lastMo.members : 0,
      runway_current: data.balanceSheet.cash / (lastMo ? lastMo.expenses : 1),
    };
  }, [data.monthly, data.balanceSheet.cash]);

  const saveGoalTarget = (goalId, newTarget) => {
    const updatedGoals = {
      ...goals,
      targets: goals.targets.map((g) => g.id === goalId ? { ...g, target: newTarget } : g),
    };
    save({ ...data, goals: updatedGoals });
    setEditingGoal(null);
  };

  const resetWhatIf = () => {
    setWhatIfOverrides({
      d_new_members: 1.0,
      d_churn_rate: 1.0,
      d_arpu: 1.0,
      d_headcount: 1.0,
      d_marketing_cost: 1.0,
    });
  };

  const saveWhatIfAsScenario = () => {
    const scenarioName = prompt('Name this scenario:', 'What-If ' + new Date().toLocaleDateString());
    if (!scenarioName) return;
    const newScenarioId = 'whatif_' + Date.now();
    const activeBase = data.forecastModel.scenarios.find((s) => s.id === data.forecastModel.activeScenario);
    const newOverrides = { ...(activeBase ? activeBase.overrides : {}) };
    Object.keys(whatIfOverrides).forEach((driverId) => {
      const multiplier = whatIfOverrides[driverId];
      if (multiplier === 1.0) return;
      const existing = newOverrides[driverId] || {};
      const baseMultiplier = existing.multiplier || 1.0;
      newOverrides[driverId] = { ...existing, multiplier: baseMultiplier * multiplier };
    });
    const updated = {
      ...data,
      forecastModel: {
        ...data.forecastModel,
        scenarios: [
          ...data.forecastModel.scenarios,
          {
            id: newScenarioId,
            name: scenarioName,
            description: 'Saved from dashboard what-if sliders',
            color: C.text2,
            overrides: newOverrides,
          },
        ],
        activeScenario: newScenarioId,
      },
    };
    save(updated);
    resetWhatIf();
    alert('Scenario "' + scenarioName + '" saved and set as active. View Forecast tab to edit it.');
  };

  // Individual KPI statuses (used for stripes and Why? buttons)
  const cashStatus = viewRunway >= 5 ? 'g' : viewRunway >= 3 ? 'a' : 'r';
  const revStatus = viewMonth.revenue >= data.budget.revenue ? 'g' : viewMonth.revenue >= data.budget.revenue * 0.95 ? 'a' : 'r';
  const costStatus = viewMonth.expenses <= data.budget.expenses ? 'g' : viewMonth.expenses <= data.budget.expenses * 1.05 ? 'a' : 'r';
  const netStatus = viewNet >= 0 ? 'g' : 'r';

  const ragItems = [
    { label: 'Cash Position', status: cashStatus, detail: fmt(data.balanceSheet.cash, 1) + ' · ' + viewRunway.toFixed(1) + ' mo' },
    { label: 'Revenue', status: revStatus, detail: ((viewMonth.revenue / data.budget.revenue) * 100).toFixed(0) + '% of target' },
    { label: 'Cost Control', status: costStatus, detail: ((viewMonth.expenses / data.budget.expenses) * 100).toFixed(0) + '% of budget' },
    { label: 'Forecast', status: forecastHealth, detail: (activeScenario ? activeScenario.name : 'Base') + ' · ' + fmt(forecastSummary.endCash, 1) + ' EOP cash' },
  ];

  const explainKpi = async (kpiName, value, status, trend, context) => {
    setExplainItem({ name: kpiName, status });
    setExplainText('');
    setExplainLoading(true);
    const prompt = 'You are a financial analyst. Explain in 2 concise sentences why ' + kpiName + ' is currently ' + (status === 'r' ? 'RED (concerning)' : 'AMBER (watch)') + '. Value: ' + value + '. Trend (' + trend.length + ' months): ' + trend.join(', ') + '. Context: ' + context + '. Use specific numbers. End with one concrete action. No preamble.';
    const reply = await askClaude(prompt, data);
    setExplainText(reply);
    setExplainLoading(false);
  };

  const generateDigest = async () => {
    setDigestOpen(true);
    setDigestText('');
    setDigestLoading(true);
    const prompt = 'Write a concise weekly finance update for the board. Use bold text (not headers) for section labels. Include: Headlines (2-3 bullets of most important items), Financials (revenue vs target, expenses vs budget, cash & runway, net income with exact numbers), Operational metrics, Forecast Outlook under ' + (activeScenario ? activeScenario.name : 'Base') + ' scenario for next 3 months, Risks & Watch Items, and Actions in flight. Be specific with numbers. Maximum 250 words. Plain text only.';
    const reply = await askClaude(prompt, data);
    setDigestText(reply);
    setDigestLoading(false);
  };

  const copyDigest = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(digestText).then(() => {
        alert('Digest copied to clipboard');
      }).catch(() => {});
    }
  };

  return (
    <div>
      <SectionHeader num="1" title="Executive Dashboard" subtitle="Live overview · Linked to xP&A forecast model" />

      {/* MONTH SELECTOR + WEEKLY DIGEST */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMonthDropdownOpen(!monthDropdownOpen)} style={styles.monthSelectorBtn}>
            <span style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7 }}>Viewing</span>
            <span>{monthLabel(viewMonth.month)}</span>
            <span style={{ fontSize: '8pt', opacity: 0.7 }}>{monthDropdownOpen ? '\u25B2' : '\u25BC'}</span>
          </button>
          {monthDropdownOpen && (
            <div style={styles.monthDropdown}>
              {data.monthly.map((m, i) => {
                const itemStyle = i === viewMonthIdx
                  ? { ...styles.monthDropdownItem, ...styles.monthDropdownItemActive }
                  : styles.monthDropdownItem;
                return (
                  <div key={m.month} onClick={() => { setViewMonthIdx(i); setMonthDropdownOpen(false); }} style={itemStyle}>
                    <span>{monthLabel(m.month)}</span>
                    <span style={{ fontSize: '7.5pt', color: C.text2 }}>{fmt(m.revenue)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {!isLatest && (
          <div style={{ fontSize: '7.5pt', color: C.text2, fontStyle: 'italic' }}>
            Historical view. <span onClick={() => setViewMonthIdx(data.monthly.length - 1)} style={{ color: '#000', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>Back to latest</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={generateDigest} style={{ ...styles.btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700 }}>M</span>
          <span>Weekly Digest</span>
        </button>
      </div>

      {/* RAG STRIP */}
      <div style={styles.ragStrip}>
        {ragItems.map((item, i) => {
          const dotColor = item.status === 'g' ? C.green : item.status === 'a' ? C.amber : C.red;
          const bg = item.status === 'g' ? C.greenBg : item.status === 'a' ? C.amberBg : C.redBg;
          const borderAccent = item.status === 'g' ? C.green : item.status === 'a' ? C.amber : C.red;
          return (
            <div key={i} style={{ ...styles.ragItem, background: bg, borderLeft: `3px solid ${borderAccent}` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '7.5pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.text }}>{item.label}</div>
                <div style={{ fontSize: '7pt', color: C.text2, marginTop: 2 }}>{item.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI INSIGHT */}
      <div style={styles.aiInsight}>
        <div style={styles.aiInsightIcon}>M</div>
        <div style={{ flex: 1 }}>
          <div style={styles.aiInsightLabel}>AI Insight · Auto-generated from live data</div>
          {insightLoading ? (
            <div style={{ color: C.text2, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner /> Analyzing your data...
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: formatAi(insight || 'Click refresh to generate insight') }} />
          )}
        </div>
        <button onClick={regenerateInsight} style={styles.btnGhost} disabled={insightLoading}>\u21BB Refresh</button>
      </div>

      {/* KPI GRID with sparklines + variance Why? */}
      <div style={{ ...styles.kpiGrid, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        <KpiCard
          label="Cash Position"
          value={fmt(data.balanceSheet.cash, 1)}
          sub={viewRunway.toFixed(1) + ' months runway'}
          onClick={() => setActiveView('balance')}
          trend={cashTrend}
          status={cashStatus}
          onExplain={() => explainKpi('Cash Position', fmt(data.balanceSheet.cash, 1), cashStatus, cashTrend, 'Monthly burn ' + fmt(viewMonth.expenses) + ', runway ' + viewRunway.toFixed(1) + ' months, min threshold 2x burn')}
        />
        <KpiCard
          label="Revenue (Month)"
          value={fmt(viewMonth.revenue)}
          sub={((viewMonth.revenue / data.budget.revenue) * 100).toFixed(0) + '% of target'}
          onClick={() => setActiveView('pl')}
          trend={revTrend}
          status={revStatus}
          onExplain={() => explainKpi('Revenue', fmt(viewMonth.revenue), revStatus, revTrend, 'Budget ' + fmt(data.budget.revenue) + '. Membership: ' + fmt(viewMonth.membershipRevenue) + ', Events: ' + fmt(viewMonth.eventRevenue) + ', Sponsorship: ' + fmt(viewMonth.sponsorshipRevenue))}
        />
        <KpiCard
          label="Expenses (Month)"
          value={fmt(viewMonth.expenses)}
          sub={((viewMonth.expenses / data.budget.expenses) * 100).toFixed(0) + '% of budget'}
          onClick={() => setActiveView('pl')}
          trend={expTrend}
          status={costStatus}
          onExplain={() => explainKpi('Expenses', fmt(viewMonth.expenses), costStatus, expTrend, 'Budget ' + fmt(data.budget.expenses) + '. Top categories: ' + data.costCategories.map((c) => c.name + ' ' + fmt(c.actual)).join(', '))}
        />
        <KpiCard
          label="Net Income"
          value={fmt(viewNet)}
          sub={viewNet >= 0 ? 'Positive' : 'Loss'}
          onClick={() => setActiveView('pl')}
          trend={netTrend}
          status={netStatus}
          onExplain={() => explainKpi('Net Income', fmt(viewNet), netStatus, netTrend, 'Revenue ' + fmt(viewMonth.revenue) + ' minus expenses ' + fmt(viewMonth.expenses))}
        />
      </div>

      {/* QUICK STATS */}
      <div style={{ marginTop: 24 }}>
        <h3 style={styles.subHeader}>Operational Snapshot</h3>
        <div style={{ ...styles.quickGrid, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)' }}>
          <QuickStat label="Active Members" value={fmtNum(viewMonth.members)} delta={viewMonth.members - viewPrior.members} />
          <QuickStat label="New Signups" value={fmtNum(viewMonth.newMembers)} />
          <QuickStat label="Renewal Rate" value={viewMonth.renewals + '%'} delta={viewMonth.renewals - viewPrior.renewals} suffix="pp" />
          <QuickStat label="Demo Requests" value={fmtNum(viewMonth.demoRequests)} delta={viewMonth.demoRequests - viewPrior.demoRequests} />
          <QuickStat label="Qualified Leads" value={fmtNum(viewMonth.qualLeads)} delta={viewMonth.qualLeads - viewPrior.qualLeads} />
          <QuickStat label="Member NPS" value={viewMonth.nps} delta={viewMonth.nps - viewPrior.nps} suffix="pts" />
        </div>
      </div>

      {/* GOALS TRACKER */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '10.5pt', fontWeight: 700, margin: 0, color: C.text }}>Annual Goals</h3>
            <span style={{ fontSize: '7.5pt', color: C.text2 }}>FY {goals.year}</span>
          </div>
          <div style={{ fontSize: '7pt', color: C.text3, background: '#ece9e3', padding: '3px 8px', borderRadius: '4px' }}>
            {(paceRatio * 100).toFixed(0)}% of year elapsed
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
          {goals.targets.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              actual={goalActuals[g.metric] || 0}
              target={g.target}
              paceRatio={paceRatio}
              isMaintain={g.direction === 'maintain'}
              onEdit={() => { setEditingGoal(g); setEditGoalValue(String(g.target)); }}
            />
          ))}
        </div>
      </div>

      {/* WHAT-IF SIMULATOR */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: '10pt', fontWeight: 600, margin: 0 }}>
            What-If Simulator
            {hasWhatIfChanges && <span style={{ marginLeft: 10, fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', background: '#000', padding: '2px 8px', fontWeight: 700 }}>Live</span>}
          </h3>
          <button onClick={() => setWhatIfOpen(!whatIfOpen)} style={styles.btnGhost}>
            {whatIfOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {whatIfOpen && (
          <div style={styles.whatIfPanel}>
            <div style={{ fontSize: '7.5pt', color: C.text2, marginBottom: 12, fontStyle: 'italic' }}>
              Drag sliders to test how changes to key drivers would affect next month's forecast. Overrides merge with the active <strong>{activeScenario ? activeScenario.name : 'Base'}</strong> scenario. Reset or save as a new scenario.
            </div>

            {/* Sliders */}
            {[
              { id: 'd_new_members', label: 'New Members', min: 0.5, max: 1.5, step: 0.05, fmt: (v) => (v * 100).toFixed(0) + '%' },
              { id: 'd_churn_rate', label: 'Churn Rate', min: 0.5, max: 2.0, step: 0.05, fmt: (v) => (v * 100).toFixed(0) + '%' },
              { id: 'd_arpu', label: 'ARPU', min: 0.8, max: 1.3, step: 0.05, fmt: (v) => (v * 100).toFixed(0) + '%' },
              { id: 'd_headcount', label: 'Headcount', min: 0.7, max: 1.3, step: 0.05, fmt: (v) => (v * 100).toFixed(0) + '%' },
              { id: 'd_marketing_cost', label: 'Marketing Spend', min: 0.5, max: 2.0, step: 0.05, fmt: (v) => (v * 100).toFixed(0) + '%' },
            ].map((slider) => {
              const value = whatIfOverrides[slider.id];
              const changed = value !== 1.0;
              const delta = ((value - 1.0) * 100).toFixed(0);
              return (
                <div key={slider.id} style={styles.whatIfSliderRow}>
                  <div style={styles.whatIfLabel}>
                    {slider.label}
                    {changed && <span style={{ marginLeft: 6, fontSize: '6.5pt', color: '#fff', background: '#000', padding: '1px 5px', fontWeight: 700 }}>CHANGED</span>}
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={value}
                    onChange={(e) => setWhatIfOverrides({ ...whatIfOverrides, [slider.id]: parseFloat(e.target.value) })}
                    style={styles.whatIfSlider}
                  />
                  <div>
                    <div style={styles.whatIfValue}>{slider.fmt(value)}</div>
                    {changed && <div style={styles.whatIfDelta}>{delta > 0 ? '+' : ''}{delta}% vs base</div>}
                  </div>
                </div>
              );
            })}

            {/* Impact preview */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, fontWeight: 600, marginBottom: 6 }}>
                Impact on {monthLabel(data.forecastModel.periods[0])} Forecast
              </div>
              <div style={styles.whatIfImpactRow}>
                {[
                  { label: 'Revenue', base: whatIfImpact.baseline.revenue, mod: whatIfImpact.modified.revenue },
                  { label: 'Costs', base: whatIfImpact.baseline.costs, mod: whatIfImpact.modified.costs },
                  { label: 'Net Income', base: whatIfImpact.baseline.netIncome, mod: whatIfImpact.modified.netIncome },
                  { label: 'Cash EOP', base: whatIfImpact.baseline.cash, mod: whatIfImpact.modified.cash },
                ].map((imp) => {
                  const diff = imp.mod - imp.base;
                  const pctChange = imp.base !== 0 ? (diff / Math.abs(imp.base)) * 100 : 0;
                  return (
                    <div key={imp.label} style={styles.whatIfImpactCell}>
                      <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: C.text2, letterSpacing: '0.06em' }}>{imp.label}</div>
                      <div style={{ fontFamily: 'Lora, serif', fontSize: '12pt', fontWeight: 700, marginTop: 2 }}>{fmt(imp.mod, 1)}</div>
                      {hasWhatIfChanges && diff !== 0 && (
                        <div style={{ fontSize: '7pt', color: diff >= 0 ? '#000' : '#404040', fontWeight: 600, marginTop: 2 }}>
                          {diff >= 0 ? '↑' : '↓'} {fmt(Math.abs(diff), 1)} ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(0)}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button onClick={resetWhatIf} disabled={!hasWhatIfChanges} style={{ ...styles.btnSecondary, opacity: hasWhatIfChanges ? 1 : 0.4 }}>Reset</button>
              <button onClick={saveWhatIfAsScenario} disabled={!hasWhatIfChanges} style={{ ...styles.btnPrimary, opacity: hasWhatIfChanges ? 1 : 0.4 }}>Save as Scenario</button>
            </div>
          </div>
        )}
      </div>

      {/* xP&A FORECAST OUTLOOK — Linked live from forecast model */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: '10pt', fontWeight: 600, margin: 0 }}>
            Forecast Outlook — Next 3 Months
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2 }}>
            <span>Scenario:</span>
            <span style={{
              padding: '3px 8px',
              background: activeScenario?.color === '#FFFFFF' ? '#fff' : activeScenario?.color,
              color: activeScenario?.color === '#000000' ? '#fff' : '#000',
              border: '1px solid ' + (activeScenario?.color === '#FFFFFF' ? '#000' : 'transparent'),
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}>{activeScenario?.name}</span>
            <button onClick={() => setActiveView('forecast')} style={{ ...styles.btnGhost, fontSize: '7pt' }}>Edit xP&A Model →</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr', gap: 0, border: '1.5px solid #000' }}>
          {/* Header row */}
          <div style={{ padding: '10px 12px', background: '#000', color: '#fff', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Metric
          </div>
          {forecastSummary.periods.map((p) => (
            <div key={p} style={{ padding: '10px 12px', background: '#000', color: '#fff', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, textAlign: 'right', borderLeft: '1px solid #404040' }}>
              {monthLabel(p)}
            </div>
          ))}
          <div style={{ padding: '10px 12px', background: '#404040', color: '#fff', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, textAlign: 'right' }}>
            3-Mo Total
          </div>

          {/* Revenue */}
          <div style={{ padding: '10px 12px', fontSize: '8.5pt', fontWeight: 600, borderTop: `1px solid ${C.border}` }}>Total Revenue</div>
          {forecastSummary.revenue.map((v, i) => (
            <div key={i} style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', borderTop: `1px solid ${C.border}`, borderLeft: '1px solid #E8E8E8' }}>
              {fmt(v)}
            </div>
          ))}
          <div style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', background: '#F2F2F2', borderTop: `1px solid ${C.border}` }}>
            {fmt(forecastSummary.totalRev)}
          </div>

          {/* Costs */}
          <div style={{ padding: '10px 12px', fontSize: '8.5pt', fontWeight: 600, borderTop: '1px solid #E8E8E8' }}>Total Costs</div>
          {forecastSummary.costs.map((v, i) => (
            <div key={i} style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', borderTop: '1px solid #E8E8E8', borderLeft: '1px solid #E8E8E8' }}>
              {fmt(v)}
            </div>
          ))}
          <div style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', background: '#F2F2F2', borderTop: '1px solid #E8E8E8' }}>
            {fmt(forecastSummary.totalCost)}
          </div>

          {/* Net */}
          <div style={{ padding: '10px 12px', fontSize: '8.5pt', fontWeight: 700, borderTop: '1px solid #000', background: '#F2F2F2' }}>Net Income</div>
          {forecastSummary.revenue.map((v, i) => {
            const net = v - forecastSummary.costs[i];
            return (
              <div key={i} style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', borderTop: '1px solid #000', borderLeft: '1px solid #E8E8E8', background: '#F2F2F2' }}>
                {fmt(net)}
              </div>
            );
          })}
          <div style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', background: '#D9D9D9', borderTop: '1px solid #000' }}>
            {fmt(forecastSummary.totalRev - forecastSummary.totalCost)}
          </div>

          {/* Cash */}
          <div style={{ padding: '10px 12px', fontSize: '8.5pt', fontWeight: 600, borderTop: '1px solid #E8E8E8' }}>Ending Cash</div>
          {forecastSummary.cash.map((v, i) => (
            <div key={i} style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', borderTop: '1px solid #E8E8E8', borderLeft: '1px solid #E8E8E8' }}>
              {fmt(v, 1)}
            </div>
          ))}
          <div style={{ padding: '10px 12px', fontSize: '10pt', fontFamily: 'Lora, serif', fontWeight: 700, textAlign: 'right', background: '#F2F2F2', borderTop: '1px solid #E8E8E8' }}>
            EOP
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: '7.5pt', color: C.text2, fontStyle: 'italic', textAlign: 'right' }}>
          Live from your xP&A model · Any change to drivers flows here automatically
        </div>
      </div>

      {/* MINI CHART */}
      <div style={{ marginTop: 28 }}>
        <h3 style={styles.subHeader}>Revenue Trend — Actuals + xP&A Forecast</h3>
        <RevenueTrendChart
          historical={data.monthly}
          forecast={data.forecastModel.periods.map((p) => ({ month: p, revenue: forecastComputed.m_total_revenue?.[p] ?? 0 })).slice(0, 3)}
        />
      </div>

      {/* EXPLAIN MODAL */}
      {explainItem && (
        <Modal title={'Why is ' + explainItem.name + ' ' + (explainItem.status === 'r' ? 'red' : 'amber') + '?'} onClose={() => setExplainItem(null)}>
          {explainLoading ? (
            <div style={{ color: C.text2, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8, padding: 10 }}>
              <Spinner /> Analyzing variance...
            </div>
          ) : (
            <div style={{ fontSize: '9pt', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: formatAi(explainText) }} />
          )}
        </Modal>
      )}

      {/* WEEKLY DIGEST MODAL */}
      {digestOpen && (
        <Modal title="Weekly Digest" onClose={() => setDigestOpen(false)}>
          {digestLoading ? (
            <div style={{ color: C.text2, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8, padding: 20 }}>
              <Spinner /> Composing digest from your data...
            </div>
          ) : (
            <div>
              <div style={styles.digestBox} dangerouslySetInnerHTML={{ __html: formatAi(digestText) }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => setDigestOpen(false)} style={styles.btnSecondary}>Close</button>
                <button onClick={copyDigest} style={styles.btnPrimary}>Copy to Clipboard</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* GOAL EDIT MODAL */}
      {editingGoal && (
        <Modal title={'Edit Target: ' + editingGoal.label} onClose={() => setEditingGoal(null)}>
          <div style={{ fontSize: '8.5pt', color: C.text2, marginBottom: 10 }}>{editingGoal.description}</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Target ({editingGoal.unit === '$' ? 'USD' : editingGoal.unit})
            </label>
            <input
              type="number"
              value={editGoalValue}
              onChange={(e) => setEditGoalValue(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #000', fontSize: '11pt', fontFamily: 'Lora, serif', fontWeight: 700 }}
            />
          </div>
          <div style={{ fontSize: '7.5pt', color: C.text2, fontStyle: 'italic', marginBottom: 14 }}>
            Current actual: {editingGoal.unit === '$' ? fmt(goalActuals[editingGoal.metric] || 0, 1) : editingGoal.unit === 'months' ? (goalActuals[editingGoal.metric] || 0).toFixed(1) + ' mo' : fmtNum(goalActuals[editingGoal.metric] || 0)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setEditingGoal(null)} style={styles.btnSecondary}>Cancel</button>
            <button onClick={() => saveGoalTarget(editingGoal.id, parseFloat(editGoalValue) || 0)} style={styles.btnPrimary}>Save Target</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, onClick, trend, status, onExplain }) {
  const borderColor = status === 'r' ? C.red : status === 'a' ? C.amber : status === 'g' ? C.green : 'transparent';
  const dotColor = status === 'r' ? C.red : status === 'a' ? C.amber : status === 'g' ? C.green : null;
  return (
    <div style={{ ...styles.kpiCard, borderTop: `3px solid ${borderColor}`, position: 'relative' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
        <div style={styles.kpiLabel}>{label}</div>
        {dotColor && <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 2 }} />}
      </div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiSub}>{sub}</div>
      {trend && trend.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <Sparkline values={trend} />
        </div>
      )}
      {(status === 'r' || status === 'a') && onExplain && (
        <button
          onClick={(e) => { e.stopPropagation(); onExplain(); }}
          style={{ ...styles.explainBtn, background: status === 'r' ? C.redBg : C.amberBg, color: status === 'r' ? C.red : C.amber, borderColor: status === 'r' ? C.redBorder : C.amberBorder }}
        >
          Why?
        </button>
      )}
    </div>
  );
}

function QuickStat({ label, value, delta, suffix = '' }) {
  return (
    <div style={styles.quickStat}>
      <div style={styles.qsLabel}>{label}</div>
      <div style={styles.qsValue}>{value}</div>
      {delta !== undefined && (
        <div style={{ fontSize: '7pt', color: delta >= 0 ? C.green : C.red, marginTop: 2 }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}{suffix} vs prior
        </div>
      )}
    </div>
  );
}

function Sparkline({ values, width, height }) {
  const w = width || 120;
  const h = height || 28;
  if (!values || values.length < 2) return null;
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const pts = values.map(function (v, i) {
    const x = (i * stepX).toFixed(1);
    const y = (h - ((v - min) / range) * h).toFixed(1);
    return x + ',' + y;
  }).join(' ');
  const parts = pts.split(' ');
  const lastPart = parts[parts.length - 1].split(',');
  const first = values[0];
  const last = values[values.length - 1];
  const pct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const trendColor = pct >= 0 ? C.green : C.red;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        <polyline fill="none" stroke={trendColor} strokeWidth="1.5" points={pts} strokeOpacity="0.7" />
        <circle cx={lastPart[0]} cy={lastPart[1]} r="2.5" fill={trendColor} />
      </svg>
      <div style={{ fontSize: '7pt', color: trendColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {pct >= 0 ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GOAL TRACKING COMPONENTS
// ══════════════════════════════════════════════════════════════
function GoalRing({ progress, size, strokeWidth, strokeColor }) {
  const s = size || 60;
  const sw = strokeWidth || 6;
  const radius = (s - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);
  const color = strokeColor || C.text;
  return (
    <svg width={s} height={s} style={{ display: 'block' }}>
      <circle cx={s / 2} cy={s / 2} r={radius} fill="none" stroke={C.border} strokeWidth={sw} />
      <circle
        cx={s / 2}
        cy={s / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={'rotate(-90 ' + (s / 2) + ' ' + (s / 2) + ')'}
      />
      <text x={s / 2} y={s / 2} textAnchor="middle" dominantBaseline="central" fontFamily="Lora, serif" fontSize={s * 0.24} fontWeight="700" fill={color}>
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}

function GoalCard({ goal, actual, target, paceRatio, isMaintain, onEdit }) {
  const progress = target !== 0 ? actual / target : 0;
  const clamped = Math.max(0, Math.min(1, progress));
  // Pacing status — is the actual on pace given the time elapsed in the year?
  let paceStatus;
  let paceLabel;
  if (isMaintain) {
    paceStatus = progress >= 1 ? 'on' : progress >= 0.9 ? 'watch' : 'off';
    paceLabel = progress >= 1 ? 'Meeting floor' : progress >= 0.9 ? 'Close to floor' : 'Below floor';
  } else {
    const onPaceRatio = progress / paceRatio;
    paceStatus = onPaceRatio >= 1 ? 'on' : onPaceRatio >= 0.9 ? 'watch' : 'off';
    paceLabel = onPaceRatio >= 1 ? 'On pace' : onPaceRatio >= 0.9 ? 'Slightly behind' : 'Behind pace';
  }
  const paceColor = paceStatus === 'on' ? C.green : paceStatus === 'watch' ? C.amber : C.red;
  const ringColor = paceStatus === 'on' ? C.green : paceStatus === 'watch' ? C.amber : C.red;
  return (
    <div style={styles.goalCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3, fontWeight: 600 }}>{goal.label}</div>
          <div style={{ fontSize: '7pt', color: C.text3, fontStyle: 'italic', marginTop: 2 }}>{goal.description}</div>
        </div>
        {onEdit && (
          <button onClick={onEdit} style={styles.goalEditBtn} title="Edit target">edit</button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <GoalRing progress={clamped} size={64} strokeWidth={7} strokeColor={ringColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14pt', fontWeight: 700, lineHeight: 1 }}>
              {goal.unit === '$' ? fmt(actual, 1) : goal.unit === 'months' ? actual.toFixed(1) + ' mo' : fmtNum(actual)}
            </div>
            <div style={{ fontSize: '7pt', color: C.text2 }}>
              / {goal.unit === '$' ? fmt(target, 1) : goal.unit === 'months' ? target + ' mo' : fmtNum(target)}
            </div>
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: paceColor, flexShrink: 0 }} />
            <div style={{ fontSize: '7pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: paceColor }}>{paceLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CATEGORY ACCOUNTS DRILLDOWN — Chart of accounts per bucket
// ══════════════════════════════════════════════════════════════
function CategoryAccountsDrilldown({ bucket, accounts, data, save, currentMonthStr, forecastPeriods, isRevenue }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'forecast'
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const updateAccount = (accountId, field, value) => {
    const group = bucket.group || (isRevenue ? 'revenue' : 'expense');
    const updated = { ...data };
    const coa = updated.chartOfAccounts || { expense: {}, revenue: {}, balanceSheet: {} };
    if (!coa[group]) coa[group] = {};
    if (!coa[group][bucket.key]) coa[group][bucket.key] = { name: bucket.name, accounts: [] };
    updated.chartOfAccounts = {
      ...coa,
      [group]: {
        ...coa[group],
        [bucket.key]: {
          ...coa[group][bucket.key],
          accounts: (accounts || []).map((a) => a.id === accountId ? { ...a, [field]: value } : a),
        },
      },
    };
    save(updated);
  };

  const addAccount = () => {
    const group = bucket.group || (isRevenue ? 'revenue' : 'expense');
    const updated = { ...data };
    const coa = updated.chartOfAccounts || { expense: {}, revenue: {}, balanceSheet: {} };
    const newId = bucket.key + '_' + Date.now();
    const template = {
      id: newId,
      name: 'New ' + bucket.accountLabel,
      monthlyValues: {},
      drivers: {},
      notes: '',
      committed: false,
    };
    const existingAccounts = (coa[group] && coa[group][bucket.key]) ? coa[group][bucket.key].accounts : [];
    updated.chartOfAccounts = {
      ...coa,
      [group]: {
        ...coa[group],
        [bucket.key]: {
          name: (coa[group] && coa[group][bucket.key]) ? coa[group][bucket.key].name : bucket.name,
          accounts: [...existingAccounts, template],
        },
      },
    };
    save(updated);
  };

  const deleteAccount = (accountId) => {
    if (!confirm('Delete this account line? This cannot be undone.')) return;
    const group = bucket.group || (isRevenue ? 'revenue' : 'expense');
    const updated = { ...data };
    const coa = updated.chartOfAccounts || { expense: {}, revenue: {}, balanceSheet: {} };
    if (coa[group] && coa[group][bucket.key]) {
      updated.chartOfAccounts = {
        ...coa,
        [group]: {
          ...coa[group],
          [bucket.key]: {
            ...coa[group][bucket.key],
            accounts: (accounts || []).filter((a) => a.id !== accountId),
          },
        },
      };
      save(updated);
    }
  };

  const currentTotal = accountsTotalForMonth(accounts, currentMonthStr);
  const committedTotal = accountsTotalForMonth((accounts || []).filter((a) => a.committed), currentMonthStr);
  const plannedTotal = accountsTotalForMonth((accounts || []).filter((a) => !a.committed), currentMonthStr);

  // AI assistant for adding accounts via natural language
  const handleAiAdd = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    const systemPrompt = 'You parse natural language descriptions into a monthly account plan. Respond ONLY with valid JSON (no markdown, no backticks), in this format: {"name": "...", "monthlyAmount": number (the recurring monthly $ amount, or the one-time amount), "startMonth": "YYYY-MM", "endMonth": "YYYY-MM" or null, "oneTime": boolean, "notes": "...", "committed": boolean, "drivers": {}}. Today is ' + currentMonthStr + '. Header is: ' + bucket.name + ' (' + bucket.group + '). For employee costs, monthlyAmount is loaded monthly salary × headcount. For one-time expenses, set oneTime true and monthlyAmount is the total amount.';
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: 'user', content: aiInput }],
        }),
      });
      const result = await response.json();
      const text = result.content?.find((b) => b.type === 'text')?.text || '';
      const cleaned = text.trim().replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleaned);

      // Build monthlyValues across the visible forecast periods
      const monthlyValues = {};
      const startM = parsed.startMonth || currentMonthStr;
      const endM = parsed.endMonth;
      (forecastPeriods || []).forEach((m) => {
        if (m < startM) { monthlyValues[m] = 0; return; }
        if (endM && m > endM) { monthlyValues[m] = 0; return; }
        if (parsed.oneTime) {
          monthlyValues[m] = m === startM ? (parsed.monthlyAmount || 0) : 0;
        } else {
          monthlyValues[m] = parsed.monthlyAmount || 0;
        }
      });

      const group = bucket.group || (isRevenue ? 'revenue' : 'expense');
      const updated = { ...data };
      const coa = updated.chartOfAccounts || { expense: {}, revenue: {}, balanceSheet: {} };
      const existingAccounts = (coa[group] && coa[group][bucket.key]) ? coa[group][bucket.key].accounts : [];
      const newId = bucket.key + '_' + Date.now();
      const newAccount = {
        id: newId,
        name: parsed.name || 'New Account',
        monthlyValues,
        drivers: parsed.drivers || {},
        notes: parsed.notes || '',
        committed: !!parsed.committed,
      };
      updated.chartOfAccounts = {
        ...coa,
        [group]: {
          ...coa[group],
          [bucket.key]: {
            name: (coa[group] && coa[group][bucket.key]) ? coa[group][bucket.key].name : bucket.name,
            accounts: [...existingAccounts, newAccount],
          },
        },
      };
      save(updated);
      setAiInput('');
      setAiOpen(false);
    } catch (e) {
      alert('Could not parse. Try: "Senior engineer starting March, $14k/month"');
    }
    setAiLoading(false);
  };

  return (
    <div style={styles.accountsDrilldown}>
      {/* Summary header */}
      <div style={styles.accountsSummaryRow}>
        <div>
          <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2, fontWeight: 700 }}>This Month Total</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16pt', fontWeight: 700, lineHeight: 1, marginTop: 2 }}>{fmt(currentTotal)}</div>
        </div>
        <div>
          <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2 }}>Committed</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700, marginTop: 2 }}>{fmt(committedTotal)}</div>
        </div>
        <div>
          <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2 }}>Planned</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700, marginTop: 2 }}>{fmt(plannedTotal)}</div>
        </div>
        <div>
          <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2 }}>Lines</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700, marginTop: 2 }}>{(accounts || []).length}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setViewMode(viewMode === 'list' ? 'forecast' : 'list')} style={styles.btnSecondary}>
            {viewMode === 'list' ? 'Forecast view →' : '← Detail view'}
          </button>
          <button onClick={() => setAiOpen(!aiOpen)} style={styles.btnSecondary}>
            <span style={{ fontFamily: 'Lora, serif', fontWeight: 700, marginRight: 4 }}>M</span>AI Add
          </button>
          <button onClick={addAccount} style={styles.btnPrimary}>+ Manual</button>
        </div>
      </div>

      {/* AI quick add */}
      {aiOpen && (
        <div style={styles.accountsAiBox}>
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiAdd()}
            placeholder={bucket.key === 'personnel' ? 'e.g. "Senior engineer starting March, $14k loaded monthly"' : 'e.g. "New CRM tool, $2,500/month starting Feb"'}
            style={{ ...styles.formInput, flex: 1 }}
          />
          <button onClick={handleAiAdd} disabled={aiLoading} style={styles.btnPrimary}>
            {aiLoading ? 'Parsing…' : 'Add'}
          </button>
          <button onClick={() => { setAiOpen(false); setAiInput(''); }} style={styles.btnSecondary}>Cancel</button>
        </div>
      )}

      {/* List view: account-by-account editable */}
      {viewMode === 'list' && (
        <div style={{ marginTop: 12 }}>
          {(accounts || []).length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', background: '#f5f4ef', border: '1px dashed #D9D9D9', color: C.text2, fontSize: '8.5pt' }}>
              No accounts yet. Add your first line to start tracking at this level.
            </div>
          ) : (
            <div style={styles.accountsTable}>
              <div style={styles.accountsTableHead}>
                <div>Account</div>
                <div style={{ textAlign: 'center' }}>{bucket.countLabel || 'Type'}</div>
                <div style={{ textAlign: 'right' }}>{bucket.rateLabel}</div>
                <div style={{ textAlign: 'right' }}>Monthly Impact</div>
                <div style={{ textAlign: 'center' }}>Period</div>
                <div style={{ textAlign: 'center' }}>Status</div>
                <div></div>
              </div>
              {(accounts || []).map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  bucket={bucket}
                  currentMonthStr={currentMonthStr}
                  onUpdate={(field, value) => updateAccount(a.id, field, value)}
                  onDelete={() => deleteAccount(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Forecast view: per-account monthly projection */}
      {viewMode === 'forecast' && (
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ ...styles.table, fontSize: '8pt', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, minWidth: 180, textAlign: 'left', position: 'sticky', left: 0, background: '#000', zIndex: 2 }}>Account</th>
                {forecastPeriods.map((p) => (
                  <th key={p} style={{ ...styles.th, textAlign: 'right', minWidth: 75 }}>{monthLabel(p)}</th>
                ))}
                <th style={{ ...styles.th, textAlign: 'right', minWidth: 80, background: '#404040' }}>Period Total</th>
              </tr>
            </thead>
            <tbody>
              {(accounts || []).map((a) => {
                const values = forecastPeriods.map((p) => accountValueForMonth(a, p));
                const total = values.reduce((s, v) => s + v, 0);
                return (
                  <tr key={a.id}>
                    <td style={{ ...styles.td, position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: '6.5pt', color: C.text2, marginTop: 2 }}>
                        {a.committed ? 'Committed' : 'Planned'} · {a.notes ? a.notes.slice(0, 40) : ''}
                      </div>
                    </td>
                    {values.map((v, i) => (
                      <td key={i} style={styles.tdR}>{v > 0 ? fmt(v, 1) : <span style={{ color: '#D9D9D9' }}>—</span>}</td>
                    ))}
                    <td style={{ ...styles.tdR, background: '#F2F2F2', fontWeight: 700 }}>{fmt(total, 1)}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ ...styles.td, position: 'sticky', left: 0, background: '#000', color: '#fff', fontWeight: 700 }}>CATEGORY TOTAL</td>
                {forecastPeriods.map((p) => {
                  const t = accountsTotalForMonth(accounts, p);
                  return <td key={p} style={{ ...styles.tdR, background: '#000', color: '#fff', fontWeight: 700 }}>{fmt(t, 1)}</td>;
                })}
                <td style={{ ...styles.tdR, background: '#404040', color: '#fff', fontWeight: 700 }}>
                  {fmt(forecastPeriods.reduce((s, p) => s + accountsTotalForMonth(accounts, p), 0), 1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Individual account row — editable inline
function AccountRow({ account, bucket, currentMonthStr, onUpdate, onDelete }) {
  const monthlyImpact = accountValueForMonth(account, currentMonthStr);

  return (
    <div style={{ ...styles.accountRow }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '9pt' }}>
          <EditableValue type="text" value={account.name} onChange={(v) => onUpdate('name', v)} />
        </div>
        {account.notes !== undefined && (
          <div style={{ fontSize: '6.5pt', color: C.text2, fontStyle: 'italic', marginTop: 2 }}>
            <EditableValue type="text" value={account.notes || ''} onChange={(v) => onUpdate('notes', v)} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: '7pt', color: C.text2 }}>—</div>
      <div style={{ textAlign: 'right' }}>
        <EditableValue
          value={account.monthlyValues ? (account.monthlyValues[currentMonthStr] || 0) : 0}
          onChange={(v) => {
            const newMV = { ...(account.monthlyValues || {}), [currentMonthStr]: parseFloat(v) || 0 };
            onUpdate('monthlyValues', newMV);
          }}
          isCurrency
        />
      </div>
      <div style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'Lora, serif' }}>
        {fmt(monthlyImpact, 1)}
      </div>
      <div style={{ textAlign: 'center', fontSize: '7pt', color: C.text2 }}>
        <div style={{ fontStyle: 'italic', color: C.text2 }}>Edit in Data tab</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => onUpdate('committed', !account.committed)}
          style={account.committed ? styles.committedBadge : styles.plannedBadge}
          title={account.committed ? 'Committed — click to mark planned' : 'Planned — click to commit'}
        >
          {account.committed ? 'COMMITTED' : 'PLANNED'}
        </button>
      </div>
      <div>
        <button onClick={onDelete} style={styles.miniBtn}>×</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROFIT & LOSS VIEW
// ══════════════════════════════════════════════════════════════
function ProfitLoss({ data, save, currentMonth, netIncome, budgetNet, forecastComputed, activeScenario, viewport }) {
  const isMobile = viewport && viewport.isMobile;
  const updateMonth = (field, value) => {
    const monthly = [...data.monthly];
    const idx = monthly.length - 1;
    monthly[idx] = { ...monthly[idx], [field]: value };
    // Recalculate revenue from sub-categories
    if (['membershipRevenue', 'eventRevenue', 'sponsorshipRevenue', 'otherRevenue'].includes(field)) {
      monthly[idx].revenue = monthly[idx].membershipRevenue + monthly[idx].eventRevenue + monthly[idx].sponsorshipRevenue + monthly[idx].otherRevenue;
    }
    save({ ...data, monthly });
  };

  const updateBudget = (field, value) => {
    save({ ...data, budget: { ...data.budget, [field]: value } });
  };

  const updateCost = (id, field, value) => {
    const costCategories = data.costCategories.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    // Recalculate total expenses for current month
    const totalExpenses = costCategories.reduce((s, c) => s + c.actual, 0);
    const monthly = [...data.monthly];
    monthly[monthly.length - 1] = { ...monthly[monthly.length - 1], expenses: totalExpenses };
    save({ ...data, costCategories, monthly });
  };

  const totalRevenueByCategory = currentMonth.membershipRevenue + currentMonth.eventRevenue + currentMonth.sponsorshipRevenue + currentMonth.otherRevenue;
  const totalCosts = data.costCategories.reduce((s, c) => s + c.actual, 0);
  const totalCostBudget = data.costCategories.reduce((s, c) => s + c.budget, 0);

  return (
    <div>
      <SectionHeader num="2" title="Profit & Loss" subtitle="Edit any value · Links to xP&A forecast" />

      {/* Forecast linkage banner */}
      {forecastComputed && (() => {
        const nextPeriod = data.forecastModel.periods[0];
        const projRev = forecastComputed.m_total_revenue?.[nextPeriod] ?? 0;
        const projCost = forecastComputed.m_total_costs?.[nextPeriod] ?? 0;
        const projNet = projRev - projCost;
        const revChange = projRev - currentMonth.revenue;
        return (
          <div style={{ background: '#F2F2F2', border: `1px solid ${C.border}`, borderLeft: '3px solid #000', padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 20, alignItems: 'center' }}>
            <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2, fontWeight: 700 }}>Next Month Forecast</div>
            <div style={{ fontSize: '8pt', color: C.text2 }}>
              {monthLabel(nextPeriod)} · <strong>{activeScenario?.name || 'Base'}</strong> scenario · Computed from driver model
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: C.text2, letterSpacing: '0.06em' }}>Revenue</div>
              <div style={{ fontFamily: 'Lora, serif', fontSize: '12pt', fontWeight: 700 }}>{fmt(projRev)}</div>
              <div style={{ fontSize: '6.5pt', color: revChange >= 0 ? '#000' : '#808080' }}>{revChange >= 0 ? '↑' : '↓'} {fmt(Math.abs(revChange))} vs actual</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: C.text2, letterSpacing: '0.06em' }}>Costs</div>
              <div style={{ fontFamily: 'Lora, serif', fontSize: '12pt', fontWeight: 700 }}>{fmt(projCost)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: C.text2, letterSpacing: '0.06em' }}>Net Income</div>
              <div style={{ fontFamily: 'Lora, serif', fontSize: '12pt', fontWeight: 700, color: projNet >= 0 ? '#000' : '#404040' }}>{fmt(projNet)}</div>
            </div>
          </div>
        );
      })()}

      {/* SUMMARY TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Line Item</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Actual</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Budget</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Variance</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>%</th>
          </tr>
        </thead>
        <tbody>
          <tr style={styles.subRow}>
            <td style={styles.tdBold}>Total Revenue</td>
            <td style={styles.tdR}>{fmtFull(totalRevenueByCategory)}</td>
            <td style={styles.tdR}><EditableValue value={data.budget.revenue} onChange={(v) => updateBudget('revenue', v)} isCurrency /></td>
            <td style={{ ...styles.tdR, fontWeight: 600 }}>{fmtFull(totalRevenueByCategory - data.budget.revenue)}</td>
            <td style={styles.tdR}>{variancePct(totalRevenueByCategory, data.budget.revenue).toFixed(1)}%</td>
          </tr>
          <tr style={styles.subRow}>
            <td style={styles.tdBold}>Total Expenses</td>
            <td style={styles.tdR}>{fmtFull(totalCosts)}</td>
            <td style={styles.tdR}><EditableValue value={data.budget.expenses} onChange={(v) => updateBudget('expenses', v)} isCurrency /></td>
            <td style={{ ...styles.tdR, fontWeight: 600 }}>{fmtFull(totalCosts - data.budget.expenses)}</td>
            <td style={styles.tdR}>{variancePct(totalCosts, data.budget.expenses).toFixed(1)}%</td>
          </tr>
          <tr style={styles.totRow}>
            <td style={styles.tdBold}>Net Income</td>
            <td style={styles.tdR}>{fmtFull(totalRevenueByCategory - totalCosts)}</td>
            <td style={styles.tdR}>{fmtFull(data.budget.revenue - data.budget.expenses)}</td>
            <td style={{ ...styles.tdR, fontWeight: 700 }}>{fmtFull((totalRevenueByCategory - totalCosts) - (data.budget.revenue - data.budget.expenses))}</td>
            <td style={styles.tdR}>—</td>
          </tr>
        </tbody>
      </table>

      {/* REVENUE BREAKDOWN */}
      <SubsectionHeader num="2A" title="Revenue Breakdown · Editable" />

      <div style={{ ...styles.revGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
        <RevenueCard
          title="Membership Revenue"
          actual={currentMonth.membershipRevenue}
          budget={data.budget.membershipRevenue}
          onActualChange={(v) => updateMonth('membershipRevenue', v)}
          onBudgetChange={(v) => updateBudget('membershipRevenue', v)}
          bucketKey="membership"
          data={data}
          save={save}
          currentMonthStr={currentMonth.month}
          forecastPeriods={(data.forecastModel && data.forecastModel.periods) ? data.forecastModel.periods.slice(0, 6) : []}
          extras={[
            { label: 'Active Members', value: currentMonth.members, onChange: (v) => updateMonth('members', v), type: 'number' },
            { label: 'Renewal Rate %', value: currentMonth.renewals, onChange: (v) => updateMonth('renewals', v), type: 'number' },
            { label: 'New Signups', value: currentMonth.newMembers, onChange: (v) => updateMonth('newMembers', v), type: 'number' },
          ]}
        />
        <RevenueCard
          title="Event & Conference Revenue"
          actual={currentMonth.eventRevenue}
          budget={data.budget.eventRevenue}
          onActualChange={(v) => updateMonth('eventRevenue', v)}
          onBudgetChange={(v) => updateBudget('eventRevenue', v)}
          bucketKey="events"
          data={data}
          save={save}
          currentMonthStr={currentMonth.month}
          forecastPeriods={(data.forecastModel && data.forecastModel.periods) ? data.forecastModel.periods.slice(0, 6) : []}
        />
        <RevenueCard
          title="Sponsorship Revenue"
          actual={currentMonth.sponsorshipRevenue}
          budget={data.budget.sponsorshipRevenue}
          onActualChange={(v) => updateMonth('sponsorshipRevenue', v)}
          onBudgetChange={(v) => updateBudget('sponsorshipRevenue', v)}
          bucketKey="sponsorship"
          data={data}
          save={save}
          currentMonthStr={currentMonth.month}
          forecastPeriods={(data.forecastModel && data.forecastModel.periods) ? data.forecastModel.periods.slice(0, 6) : []}
        />
        <RevenueCard
          title="Other Revenue"
          actual={currentMonth.otherRevenue}
          budget={data.budget.otherRevenue}
          onActualChange={(v) => updateMonth('otherRevenue', v)}
          onBudgetChange={(v) => updateBudget('otherRevenue', v)}
          bucketKey="other"
          data={data}
          save={save}
          currentMonthStr={currentMonth.month}
          forecastPeriods={(data.forecastModel && data.forecastModel.periods) ? data.forecastModel.periods.slice(0, 6) : []}
        />
      </div>

      {/* COST CONTROL */}
      <SubsectionHeader num="2B" title="Cost Control · Editable Categories" />

      <div style={{ ...styles.costSummary, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        <div style={styles.csCellHighlight}>
          <div style={styles.csLabel}>Total Spend</div>
          <div style={styles.csValue}>{fmt(totalCosts)}</div>
          <div style={{ ...styles.csDetail, color: '#D9D9D9' }}>{((totalCosts / totalCostBudget) * 100).toFixed(0)}% of budget</div>
        </div>
        <div style={styles.csCell}>
          <div style={styles.csLabel}>Variance</div>
          <div style={styles.csValue}>{fmt(totalCosts - totalCostBudget)}</div>
          <div style={styles.csDetail}>vs {fmt(totalCostBudget)}</div>
        </div>
        <div style={styles.csCell}>
          <div style={styles.csLabel}>Op. Efficiency</div>
          <div style={styles.csValue}>{((totalCosts / totalRevenueByCategory) * 100).toFixed(1)}%</div>
          <div style={styles.csDetail}>Target ≤95%</div>
        </div>
        <div style={styles.csCell}>
          <div style={styles.csLabel}>Cost / Member</div>
          <div style={styles.csValue}>${(totalCosts / currentMonth.members).toFixed(0)}</div>
          <div style={styles.csDetail}>Per active member</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {data.costCategories.map((cat) => (
          <CostBar
            key={cat.id}
            cat={cat}
            data={data}
            save={save}
            currentMonthStr={currentMonth.month}
            forecastPeriods={(data.forecastModel && data.forecastModel.periods) ? data.forecastModel.periods.slice(0, 6) : []}
            onUpdate={(field, value) => updateCost(cat.id, field, value)}
            onDelete={() => {
              if (confirm(`Delete category "${cat.name}"?`)) {
                save({ ...data, costCategories: data.costCategories.filter((c) => c.id !== cat.id) });
              }
            }}
          />
        ))}
      </div>

      <button
        style={{ ...styles.btnSecondary, marginTop: 12 }}
        onClick={() => {
          const newId = Math.max(...data.costCategories.map((c) => c.id)) + 1;
          save({
            ...data,
            costCategories: [...data.costCategories, { id: newId, name: 'New Category', actual: 0, budget: 0, weight: 0, driver: 'Click to edit', action: 'Click to edit' }],
          });
        }}
      >
        + Add Cost Category
      </button>
    </div>
  );
}

function RevenueCard({ title, actual, budget, onActualChange, onBudgetChange, extras = [], bucketKey, data, save, currentMonthStr, forecastPeriods }) {
  const [expanded, setExpanded] = useState(false);
  const variance = actual - budget;
  const pct = budget ? (actual / budget) * 100 : 0;

  // Find revenue bucket and accounts
  const bucket = bucketKey ? REVENUE_BUCKETS.find((b) => b.key === bucketKey) : null;
  const accounts = (bucket && data && data.chartOfAccounts && data.chartOfAccounts.revenue && data.chartOfAccounts.revenue[bucket.key])
    ? (data.chartOfAccounts.revenue[bucket.key].accounts || [])
    : [];
  const accountsTotal = bucket ? accountsTotalForMonth(accounts, currentMonthStr) : 0;
  const hasAccounts = bucket && accounts.length > 0;

  return (
    <div style={styles.revCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {bucket && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={styles.bucketExpandBtn}
            title={expanded ? 'Collapse accounts' : 'Expand to show chart of accounts'}
          >
            {expanded ? '▼' : '▶'} {accounts.length}
          </button>
        )}
        <div style={styles.revCardTitle}>{title}</div>
      </div>
      <div style={styles.revMetric}>
        <div style={styles.revLabel}>Actual</div>
        <div style={styles.revValue}><EditableValue value={actual} onChange={onActualChange} isCurrency /></div>
        <div style={styles.revDetail}>{pct.toFixed(0)}% of target</div>
      </div>
      <div style={styles.revMetric}>
        <div style={styles.revLabel}>Budget</div>
        <div style={{ ...styles.revValue, fontSize: '11pt' }}><EditableValue value={budget} onChange={onBudgetChange} isCurrency /></div>
        <div style={styles.revDetail}>Variance: {fmt(variance)}</div>
      </div>
      {extras.map((e, i) => (
        <div key={i} style={styles.revMetric}>
          <div style={styles.revLabel}>{e.label}</div>
          <div style={{ ...styles.revValue, fontSize: '11pt' }}>
            <EditableValue value={e.value} onChange={e.onChange} type={e.type || 'number'} />
          </div>
        </div>
      ))}
      {hasAccounts && !expanded && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #D9D9D9', fontSize: '7pt', color: C.text2, fontStyle: 'italic' }}>
          From accounts: {fmt(accountsTotal)} this month · {accounts.length} line{accounts.length === 1 ? '' : 's'}
          {' '}<button
            onClick={() => onActualChange(Math.round(accountsTotal))}
            style={{ background: 'transparent', border: '1px solid #000', padding: '1px 6px', fontSize: '6pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', marginLeft: 4 }}
          >Sync</button>
        </div>
      )}
      {expanded && bucket && (
        <div style={{ marginTop: 10 }}>
          <CategoryAccountsDrilldown
            bucket={bucket}
            accounts={accounts}
            data={data}
            save={save}
            currentMonthStr={currentMonthStr}
            forecastPeriods={forecastPeriods}
            isRevenue={true}
          />
        </div>
      )}
    </div>
  );
}

function CostBar({ cat, data, save, currentMonthStr, forecastPeriods, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const variance = cat.actual - cat.budget;
  const pct = cat.budget ? (cat.actual / cat.budget) * 100 : 0;
  const isOver = pct > 100;
  const status = pct < 95 ? 'under' : pct > 105 ? 'over' : 'ontrack';

  // Find the bucket config for this category
  const bucket = COST_BUCKETS.find((b) => b.id === cat.id);
  const accounts = (bucket && data && data.chartOfAccounts && data.chartOfAccounts.expense && data.chartOfAccounts.expense[bucket.key])
    ? (data.chartOfAccounts.expense[bucket.key].accounts || [])
    : [];
  const accountsTotal = bucket ? accountsTotalForMonth(accounts, currentMonthStr) : 0;
  const hasAccounts = bucket && accounts.length > 0;

  return (
    <div style={{ ...styles.costBar, ...(isOver ? styles.costBarOver : {}) }}>
      <div style={styles.costBarHeader}>
        <div style={styles.costBarLabel}>
          {bucket && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={styles.bucketExpandBtn}
              title={expanded ? 'Collapse accounts' : 'Expand to show chart of accounts'}
            >
              {expanded ? '▼' : '▶'} {accounts.length}
            </button>
          )}
          <EditableValue type="text" value={cat.name} onChange={(v) => onUpdate('name', v)} />
          <span style={{ ...styles.statusTag, ...(status === 'under' ? styles.statusUnder : status === 'over' ? styles.statusOver : styles.statusOnTrack) }}>
            {status === 'under' ? `Under ${Math.abs(100 - pct).toFixed(0)}%` : status === 'over' ? `Over ${(pct - 100).toFixed(0)}%` : 'On Track'}
          </span>
        </div>
        <div style={styles.costBarSpend}>
          <EditableValue value={cat.actual} onChange={(v) => onUpdate('actual', v)} isCurrency /> of <EditableValue value={cat.budget} onChange={(v) => onUpdate('budget', v)} isCurrency />
        </div>
        <div style={{ ...styles.costBarVariance, color: variance < 0 ? '#000' : '#000' }}>
          {variance < 0 ? '−' : '+'}{fmt(Math.abs(variance))}
        </div>
        <button onClick={onDelete} style={styles.miniBtn} title="Delete">×</button>
      </div>

      <div style={styles.costBarTrack}>
        <div style={{
          ...styles.costBarFill,
          width: `${Math.min(pct, 150)}%`,
          background: isOver ? 'repeating-linear-gradient(45deg,#000,#000 4px,#404040 4px,#404040 8px)' : '#000',
        }} />
        <div style={{ ...styles.costBarMark, left: '100%' }} />
      </div>

      <div style={styles.costBarDriver}>
        <strong>Driver:</strong> <EditableValue type="text" value={cat.driver} onChange={(v) => onUpdate('driver', v)} />
        <br />
        <strong>Action:</strong> <EditableValue type="text" value={cat.action} onChange={(v) => onUpdate('action', v)} />
        {hasAccounts && (
          <div style={{ marginTop: 6, fontSize: '7pt', color: C.text2, fontStyle: 'italic' }}>
            From accounts: {fmt(accountsTotal)} this month {Math.abs(accountsTotal - cat.actual) > cat.actual * 0.05 && <span style={{ color: '#000', fontWeight: 700 }}> · {Math.abs(accountsTotal - cat.actual) > 0 ? ((accountsTotal - cat.actual >= 0 ? '+' : '−') + fmt(Math.abs(accountsTotal - cat.actual))) : ''} vs manual entry</span>}
            {' '}<button
              onClick={() => onUpdate('actual', Math.round(accountsTotal))}
              style={{ background: 'transparent', border: '1px solid #000', padding: '1px 6px', fontSize: '6pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', marginLeft: 6 }}
            >Sync</button>
          </div>
        )}
      </div>

      {/* EXPANDABLE CHART OF ACCOUNTS */}
      {expanded && bucket && (
        <CategoryAccountsDrilldown
          bucket={bucket}
          accounts={accounts}
          data={data}
          save={save}
          currentMonthStr={currentMonthStr}
          forecastPeriods={forecastPeriods}
          isRevenue={false}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BALANCE SHEET VIEW
// ══════════════════════════════════════════════════════════════
function BalanceSheet({ data, save, workingCapital, totalAR, totalAssets, totalLiabilities, cashRunway, totalExpenses, forecastComputed, activeScenario }) {
  const updateBS = (field, value) => {
    save({ ...data, balanceSheet: { ...data.balanceSheet, [field]: value } });
  };

  const updateAR = (id, field, value) => {
    const arAging = data.arAging.map((a) => (a.id === id ? { ...a, [field]: value } : a));
    const totalARNew = arAging.reduce((s, a) => s + a.amount, 0);
    save({ ...data, arAging, balanceSheet: { ...data.balanceSheet, accountsReceivable: totalARNew } });
  };

  return (
    <div>
      <SectionHeader num="3" title="Balance Sheet" subtitle="All values editable · Live calculations" />

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Category</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Current</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Prior Month</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Change</th>
          </tr>
        </thead>
        <tbody>
          <tr style={styles.subRow}>
            <td style={styles.tdBold}>Total Current Assets</td>
            <td style={styles.tdR}>{fmtFull(totalAssets)}</td>
            <td style={styles.tdR}>{fmtFull(data.balanceSheet.priorCash + data.balanceSheet.priorAR + data.balanceSheet.otherCurrentAssets)}</td>
            <td style={{ ...styles.tdR, fontWeight: 600 }}>{fmtFull(totalAssets - (data.balanceSheet.priorCash + data.balanceSheet.priorAR + data.balanceSheet.otherCurrentAssets))}</td>
          </tr>
          <tr>
            <td style={styles.tdDim}>&nbsp;&nbsp;Cash & Equivalents</td>
            <td style={styles.tdR}><EditableValue value={data.balanceSheet.cash} onChange={(v) => updateBS('cash', v)} isCurrency /></td>
            <td style={styles.tdR}><EditableValue value={data.balanceSheet.priorCash} onChange={(v) => updateBS('priorCash', v)} isCurrency /></td>
            <td style={styles.tdR}>{fmtFull(data.balanceSheet.cash - data.balanceSheet.priorCash)}</td>
          </tr>
          <tr>
            <td style={styles.tdDim}>&nbsp;&nbsp;Accounts Receivable</td>
            <td style={styles.tdR}>{fmtFull(totalAR)}</td>
            <td style={styles.tdR}><EditableValue value={data.balanceSheet.priorAR} onChange={(v) => updateBS('priorAR', v)} isCurrency /></td>
            <td style={styles.tdR}>{fmtFull(totalAR - data.balanceSheet.priorAR)}</td>
          </tr>
          <tr>
            <td style={styles.tdDim}>&nbsp;&nbsp;Other Current Assets</td>
            <td style={styles.tdR}><EditableValue value={data.balanceSheet.otherCurrentAssets} onChange={(v) => updateBS('otherCurrentAssets', v)} isCurrency /></td>
            <td style={styles.tdR}>{fmtFull(data.balanceSheet.otherCurrentAssets)}</td>
            <td style={styles.tdR}>—</td>
          </tr>
          <tr style={styles.subRow}>
            <td style={styles.tdBold}>Total Current Liabilities</td>
            <td style={styles.tdR}>{fmtFull(totalLiabilities)}</td>
            <td style={styles.tdR}>—</td>
            <td style={styles.tdR}>—</td>
          </tr>
          <tr>
            <td style={styles.tdDim}>&nbsp;&nbsp;Accounts Payable</td>
            <td style={styles.tdR}><EditableValue value={data.balanceSheet.accountsPayable} onChange={(v) => updateBS('accountsPayable', v)} isCurrency /></td>
            <td style={styles.tdR}>—</td><td style={styles.tdR}>—</td>
          </tr>
          <tr>
            <td style={styles.tdDim}>&nbsp;&nbsp;Deferred Revenue</td>
            <td style={styles.tdR}><EditableValue value={data.balanceSheet.deferredRevenue} onChange={(v) => updateBS('deferredRevenue', v)} isCurrency /></td>
            <td style={styles.tdR}>—</td><td style={styles.tdR}>—</td>
          </tr>
          <tr>
            <td style={styles.tdDim}>&nbsp;&nbsp;Other Current Liabilities</td>
            <td style={styles.tdR}><EditableValue value={data.balanceSheet.otherCurrentLiabilities} onChange={(v) => updateBS('otherCurrentLiabilities', v)} isCurrency /></td>
            <td style={styles.tdR}>—</td><td style={styles.tdR}>—</td>
          </tr>
          <tr style={styles.totRow}>
            <td style={styles.tdBold}>Working Capital</td>
            <td style={styles.tdR}>{fmtFull(workingCapital)}</td>
            <td style={styles.tdR}>—</td>
            <td style={styles.tdR}>—</td>
          </tr>
        </tbody>
      </table>

      {/* CASH BREAKDOWN */}
      <SubsectionHeader num="3A" title="Cash Position & Runway" />

      <div style={styles.miniGrid}>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>Cash Balance</div>
          <div style={styles.mmValue}>{fmt(data.balanceSheet.cash, 1)}</div>
        </div>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>Monthly Burn</div>
          <div style={styles.mmValue}>{fmt(totalExpenses)}</div>
        </div>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>Runway</div>
          <div style={styles.mmValue}>{cashRunway.toFixed(1)} mo</div>
        </div>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>Min Threshold</div>
          <div style={styles.mmValue}>{fmt(totalExpenses * 2)}</div>
        </div>
      </div>

      {/* xP&A Cash Trajectory */}
      {forecastComputed && (() => {
        const periods = data.forecastModel.periods.slice(0, 6);
        const cashPath = periods.map((p) => forecastComputed.m_cash_balance?.[p] ?? 0);
        const runwayPath = periods.map((p) => forecastComputed.m_runway?.[p] ?? 0);
        const minCash = Math.min(...cashPath, data.balanceSheet.cash);
        const maxCash = Math.max(...cashPath, data.balanceSheet.cash);
        const minMonth = periods[cashPath.indexOf(minCash)] || periods[0];
        return (
          <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2, fontWeight: 700 }}>xP&A Cash Trajectory</div>
                <div style={{ fontSize: '8pt', color: C.text2, marginTop: 2 }}>Scenario: <strong>{activeScenario?.name}</strong> · Min cash {fmt(minCash, 1)} in {monthLabel(minMonth)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${periods.length}, 1fr)`, gap: 1, background: '#D9D9D9', border: '1px solid #808080' }}>
              {periods.map((p, i) => (
                <div key={p} style={{ background: '#fff', padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: C.text2, letterSpacing: '0.06em' }}>{monthLabel(p)}</div>
                  <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700, marginTop: 3 }}>{fmt(cashPath[i], 1)}</div>
                  <div style={{ fontSize: '6.5pt', color: runwayPath[i] < 2 ? '#000' : '#404040', marginTop: 2, fontWeight: runwayPath[i] < 2 ? 700 : 400 }}>
                    {runwayPath[i].toFixed(1)} mo runway
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* AR AGING */}
      <SubsectionHeader num="3B" title="Accounts Receivable Aging · Click to edit" />

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Aging Period</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>% of Total</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {data.arAging.map((a) => (
            <tr key={a.id}>
              <td style={styles.td}><EditableValue type="text" value={a.period} onChange={(v) => updateAR(a.id, 'period', v)} /></td>
              <td style={styles.tdR}><EditableValue value={a.amount} onChange={(v) => updateAR(a.id, 'amount', v)} isCurrency /></td>
              <td style={styles.tdR}>{((a.amount / totalAR) * 100).toFixed(0)}%</td>
              <td style={styles.td}><EditableValue type="text" value={a.status} onChange={(v) => updateAR(a.id, 'status', v)} /></td>
              <td style={styles.td}>
                <button onClick={() => save({ ...data, arAging: data.arAging.filter((x) => x.id !== a.id) })} style={styles.miniBtn}>×</button>
              </td>
            </tr>
          ))}
          <tr style={styles.totRow}>
            <td style={styles.tdBold}>Total AR</td>
            <td style={styles.tdR}>{fmtFull(totalAR)}</td>
            <td style={styles.tdR}>100%</td>
            <td style={styles.td}>—</td>
            <td style={styles.td}></td>
          </tr>
        </tbody>
      </table>

      <button
        style={{ ...styles.btnSecondary, marginTop: 8 }}
        onClick={() => {
          const newId = Math.max(0, ...data.arAging.map((a) => a.id)) + 1;
          save({ ...data, arAging: [...data.arAging, { id: newId, period: 'New aging bucket', amount: 0, status: 'Pending' }] });
        }}
      >
        + Add Aging Bucket
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FORECAST VIEW — Driver-based xP&A modeling (Causal/Lucanet inspired)
// ══════════════════════════════════════════════════════════════
function PnlForecastTab({ data, save }) {
  const coa = data.chartOfAccounts || { expense: {}, revenue: {}, balanceSheet: { assets: [], liabilities: [], equity: [] } };
  const allMonths = getAllMonthsFromCOA(coa);
  const [startIdx, setStartIdx] = useState(Math.max(0, allMonths.length - 6));
  const [expandedHeaders, setExpandedHeaders] = useState({}); // header key → bool
  const [expandedAccounts, setExpandedAccounts] = useState({}); // account id → bool (driver editor open)
  const [viewCount, setViewCount] = useState(6);

  const visibleMonths = allMonths.slice(startIdx, startIdx + viewCount);

  const toggleHeader = (key) => {
    setExpandedHeaders({ ...expandedHeaders, [key]: !expandedHeaders[key] });
  };

  const toggleAccount = (id) => {
    setExpandedAccounts({ ...expandedAccounts, [id]: !expandedAccounts[id] });
  };

  const updateAccountValue = (groupKey, headerKey, accountId, month, value) => {
    const updated = { ...data };
    const numValue = parseFloat(value) || 0;
    updated.chartOfAccounts = {
      ...updated.chartOfAccounts,
      [groupKey]: {
        ...updated.chartOfAccounts[groupKey],
        [headerKey]: {
          ...updated.chartOfAccounts[groupKey][headerKey],
          accounts: updated.chartOfAccounts[groupKey][headerKey].accounts.map((a) =>
            a.id === accountId ? { ...a, monthlyValues: { ...a.monthlyValues, [month]: numValue } } : a
          ),
        },
      },
    };
    save(updated);
  };

  const updateAccountField = (groupKey, headerKey, accountId, field, value) => {
    const updated = { ...data };
    updated.chartOfAccounts = {
      ...updated.chartOfAccounts,
      [groupKey]: {
        ...updated.chartOfAccounts[groupKey],
        [headerKey]: {
          ...updated.chartOfAccounts[groupKey][headerKey],
          accounts: updated.chartOfAccounts[groupKey][headerKey].accounts.map((a) =>
            a.id === accountId ? { ...a, [field]: value } : a
          ),
        },
      },
    };
    save(updated);
  };

  const updateAccountDriver = (groupKey, headerKey, accountId, driverKey, value) => {
    const updated = { ...data };
    const numValue = parseFloat(value) || 0;
    updated.chartOfAccounts = {
      ...updated.chartOfAccounts,
      [groupKey]: {
        ...updated.chartOfAccounts[groupKey],
        [headerKey]: {
          ...updated.chartOfAccounts[groupKey][headerKey],
          accounts: updated.chartOfAccounts[groupKey][headerKey].accounts.map((a) =>
            a.id === accountId ? { ...a, drivers: { ...(a.drivers || {}), [driverKey]: numValue } } : a
          ),
        },
      },
    };
    save(updated);
  };

  // Apply driver recalculation: compute monthlyValues from driver formula for all future months
  // E.g. for headcount × avgSalary, or count × ARPU, or count × fee
  const applyDriversToFuture = (groupKey, headerKey, accountId) => {
    const account = coa[groupKey][headerKey].accounts.find((a) => a.id === accountId);
    if (!account || !account.drivers) return;
    const d = account.drivers;

    // Determine the computation based on what drivers are set
    let computedValue = null;
    if (d.headcount != null && d.avgSalary != null) {
      computedValue = d.headcount * d.avgSalary;
    } else if (d.count != null && d.arpu != null) {
      computedValue = d.count * d.arpu;
    } else if (d.count != null && d.fee != null) {
      computedValue = d.count * d.fee;
    } else if (d.attendees != null && d.avgTicket != null) {
      computedValue = d.attendees * d.avgTicket;
    } else if (d.headcount != null) {
      // Apply taxRate % of salary total from linked employee account?
      computedValue = null; // Needs more context
    }
    if (computedValue == null) {
      alert('No driver formula detected. Set paired drivers like (headcount + avgSalary) or (count + arpu) first.');
      return;
    }

    // Apply to all future months starting from next month after today
    const todayStr = new Date().toISOString().slice(0, 7);
    const nextMonthIdx = allMonths.findIndex((m) => m > todayStr);
    const futureMonths = nextMonthIdx >= 0 ? allMonths.slice(nextMonthIdx) : [];
    const updated = { ...data };
    const newMonthlyValues = { ...(account.monthlyValues || {}) };
    futureMonths.forEach((m) => { newMonthlyValues[m] = computedValue; });
    updated.chartOfAccounts = {
      ...updated.chartOfAccounts,
      [groupKey]: {
        ...updated.chartOfAccounts[groupKey],
        [headerKey]: {
          ...updated.chartOfAccounts[groupKey][headerKey],
          accounts: updated.chartOfAccounts[groupKey][headerKey].accounts.map((a) =>
            a.id === accountId ? { ...a, monthlyValues: newMonthlyValues } : a
          ),
        },
      },
    };
    save(updated);
    alert('Applied driver-based forecast to ' + futureMonths.length + ' future months at ' + fmt(computedValue));
  };

  const renderDriverEditor = (groupKey, headerKey, account) => {
    const d = account.drivers || {};
    // Determine available driver fields for this account header
    const driverOptions = headerKey === 'employee' ? [
      { key: 'headcount', label: 'Headcount (FTE)', type: 'number' },
      { key: 'avgSalary', label: 'Avg Monthly Salary', type: 'currency' },
      { key: 'taxRate', label: 'Tax/Benefit Rate %', type: 'number' },
    ] : headerKey === 'membership' ? [
      { key: 'count', label: 'Member Count', type: 'number' },
      { key: 'arpu', label: 'ARPU (monthly)', type: 'currency' },
    ] : headerKey === 'sponsorship' ? [
      { key: 'count', label: 'Sponsor Count', type: 'number' },
      { key: 'fee', label: 'Monthly Fee', type: 'currency' },
    ] : headerKey === 'events' ? [
      { key: 'attendees', label: 'Attendees', type: 'number' },
      { key: 'avgTicket', label: 'Avg Ticket Price', type: 'currency' },
    ] : headerKey === 'marketing' ? [
      { key: 'CAC', label: 'CAC Target ($)', type: 'currency' },
    ] : [
      { key: 'rate', label: 'Monthly Rate', type: 'currency' },
    ];

    return (
      <tr style={{ background: '#f5f4ef' }}>
        <td colSpan={2 + visibleMonths.length + 1} style={{ ...styles.td, padding: 14 }}>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, fontWeight: 700, marginBottom: 8 }}>
            Driver-Based Planning — {account.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
            {driverOptions.map((opt) => (
              <div key={opt.key}>
                <label style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.text2, fontWeight: 600, display: 'block', marginBottom: 2 }}>
                  {opt.label}
                </label>
                <input
                  type="number"
                  value={d[opt.key] || ''}
                  onChange={(e) => updateAccountDriver(groupKey, headerKey, account.id, opt.key, e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #808080', fontFamily: 'Lora, serif', fontSize: '10pt', fontWeight: 600 }}
                  placeholder="0"
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.text2, fontWeight: 600, display: 'block', marginBottom: 2 }}>Notes</label>
              <input
                type="text"
                value={account.notes || ''}
                onChange={(e) => updateAccountField(groupKey, headerKey, account.id, 'notes', e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: `1px solid ${C.border}`, fontSize: '8.5pt' }}
                placeholder="e.g. backfill from Dec 1"
              />
            </div>
            <div>
              <button
                onClick={() => applyDriversToFuture(groupKey, headerKey, account.id)}
                style={{ ...styles.btnPrimary, width: '100%', fontSize: '8pt' }}
                title="Recalculate future months using driver values"
              >
                Apply to future months →
              </button>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: '7pt', color: C.text2, fontStyle: 'italic' }}>
            Formulas: {headerKey === 'employee' && 'headcount × avgSalary = monthly cost'}{headerKey === 'membership' && 'count × ARPU = monthly revenue'}{headerKey === 'sponsorship' && 'count × fee = monthly revenue'}{headerKey === 'events' && 'attendees × avgTicket = monthly revenue'}
          </div>
        </td>
      </tr>
    );
  };

  const renderSection = (groupKey, sectionLabel, headers) => {
    const sectionTotal = (month) => headers.reduce((s, h) => {
      const header = coa[groupKey][h.key];
      return s + accountsTotalForMonth(header ? header.accounts : [], month);
    }, 0);

    return (
      <React.Fragment>
        {/* Section header row */}
        <tr style={{ background: '#000', color: '#fff' }}>
          <td style={{ ...styles.td, color: '#fff', fontWeight: 700, fontFamily: 'Lora, serif', fontSize: '10pt' }} colSpan={2}>
            {sectionLabel}
          </td>
          {visibleMonths.map((m) => (
            <td key={m} style={{ ...styles.tdR, color: '#fff', fontWeight: 700, background: '#000' }}>{fmt(sectionTotal(m), 0)}</td>
          ))}
          <td style={{ ...styles.td, background: '#000' }}></td>
        </tr>
        {headers.map((h) => {
          const header = coa[groupKey][h.key];
          if (!header) return null;
          const isHdrExpanded = expandedHeaders[groupKey + ':' + h.key];
          return (
            <React.Fragment key={groupKey + ':' + h.key}>
              {/* Header row (clickable to expand/collapse) */}
              <tr style={{ background: '#F2F2F2', cursor: 'pointer' }} onClick={() => toggleHeader(groupKey + ':' + h.key)}>
                <td style={{ ...styles.td, fontWeight: 700 }} colSpan={2}>
                  <span style={{ marginRight: 6, fontFamily: 'Lora, serif', display: 'inline-block', width: 12 }}>{isHdrExpanded ? '▼' : '▶'}</span>
                  {h.label} <span style={{ fontWeight: 400, color: C.text2, fontSize: '7.5pt' }}>({header.accounts.length} accounts)</span>
                </td>
                {visibleMonths.map((m) => {
                  const total = accountsTotalForMonth(header.accounts, m);
                  return <td key={m} style={{ ...styles.tdR, fontWeight: 700 }}>{fmt(total, 0)}</td>;
                })}
                <td style={styles.td}></td>
              </tr>
              {/* Account rows when header expanded */}
              {isHdrExpanded && header.accounts.map((a) => {
                const isAcctExpanded = expandedAccounts[a.id];
                return (
                  <React.Fragment key={a.id}>
                    <tr>
                      <td style={{ ...styles.td, paddingLeft: 28, fontSize: '8.5pt' }}>
                        <button
                          onClick={() => toggleAccount(a.id)}
                          style={{ background: 'transparent', border: 'none', marginRight: 6, cursor: 'pointer', fontFamily: 'Lora, serif', fontSize: '8pt' }}
                          title={isAcctExpanded ? 'Close driver editor' : 'Open driver editor'}
                        >
                          {isAcctExpanded ? '▾' : '▸'}
                        </button>
                        <EditableValue type="text" value={a.name} onChange={(v) => updateAccountField(groupKey, h.key, a.id, 'name', v)} />
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => updateAccountField(groupKey, h.key, a.id, 'committed', !a.committed)}
                          style={a.committed ? styles.committedBadge : styles.plannedBadge}
                        >
                          {a.committed ? 'COMMITTED' : 'PLANNED'}
                        </button>
                      </td>
                      {visibleMonths.map((m) => (
                        <td key={m} style={styles.tdR}>
                          <EditableValue
                            value={a.monthlyValues ? (a.monthlyValues[m] || 0) : 0}
                            onChange={(v) => updateAccountValue(groupKey, h.key, a.id, m, v)}
                            isCurrency
                          />
                        </td>
                      ))}
                      <td style={styles.td}></td>
                    </tr>
                    {isAcctExpanded && renderDriverEditor(groupKey, h.key, a)}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  };

  // Compute net income per month
  const netIncomeFor = (month) => {
    const revenue = REVENUE_HEADERS.reduce((s, h) => s + accountsTotalForMonth(coa.revenue[h.key]?.accounts, month), 0);
    const expenses = EXPENSE_HEADERS.reduce((s, h) => s + accountsTotalForMonth(coa.expense[h.key]?.accounts, month), 0);
    return revenue - expenses;
  };

  return (
    <div>
      <div style={{ marginBottom: 12, padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderLeft: '3px solid #000', fontSize: '8.5pt', color: C.text2 }}>
        <strong>Driver-based P&L forecast</strong> — Click any header ▶ to expand its accounts. Click ▸ next to an account to open driver-based planning (e.g. headcount × salary, count × ARPU). Edit monthly cells directly, or set drivers and "Apply to future months" to bulk-update.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: '8pt', color: C.text2 }}>
          Showing {viewCount} of {allMonths.length} months · Starting {monthLabel(visibleMonths[0])}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setStartIdx(Math.max(0, startIdx - 3))} style={{ ...styles.btnSecondary, fontSize: '7pt' }} disabled={startIdx === 0}>◀ 3 mo</button>
          <button onClick={() => setStartIdx(Math.min(allMonths.length - viewCount, startIdx + 3))} style={{ ...styles.btnSecondary, fontSize: '7pt' }} disabled={startIdx + viewCount >= allMonths.length}>3 mo ▶</button>
          <button onClick={() => setViewCount(viewCount === 6 ? 12 : 6)} style={{ ...styles.btnSecondary, fontSize: '7pt' }}>
            {viewCount === 6 ? 'Show 12 mo' : 'Show 6 mo'}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...styles.table, fontSize: '8pt', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, minWidth: 220, textAlign: 'left' }}>Line Item</th>
              <th style={{ ...styles.th, minWidth: 95 }}>Status</th>
              {visibleMonths.map((m) => (
                <th key={m} style={{ ...styles.th, textAlign: 'right', minWidth: 80 }}>{monthLabel(m)}</th>
              ))}
              <th style={{ ...styles.th, minWidth: 20 }}></th>
            </tr>
          </thead>
          <tbody>
            {renderSection('revenue', 'REVENUE', REVENUE_HEADERS)}
            {renderSection('expense', 'OPERATING EXPENSES', EXPENSE_HEADERS)}
            {/* Net income row */}
            <tr style={{ background: '#000', color: '#fff' }}>
              <td style={{ ...styles.td, color: '#fff', fontWeight: 700, fontFamily: 'Lora, serif', fontSize: '10pt' }} colSpan={2}>
                NET INCOME
              </td>
              {visibleMonths.map((m) => {
                const ni = netIncomeFor(m);
                return <td key={m} style={{ ...styles.tdR, color: '#fff', fontWeight: 700, background: '#000', borderTop: '2px solid #fff' }}>{fmt(ni, 0)}</td>;
              })}
              <td style={{ ...styles.td, background: '#000' }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Forecast({ data, save, currentMonth, totalExpenses }) {
  const model = data.forecastModel;
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl' | 'drivers' | 'metrics' | 'threeway' | 'scenarios' | 'runway'
  const [comparisonScenarios, setComparisonScenarios] = useState([model.activeScenario]);
  const [editingFormula, setEditingFormula] = useState(null); // metric id being edited
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);
  const [formulaHelperContext, setFormulaHelperContext] = useState(null);

  // Compute forecast for the active scenario
  const computed = useMemo(() => computeForecast(model, model.activeScenario), [model]);

  // Compute for all scenarios (for comparison view)
  const allScenarios = useMemo(() => {
    const out = {};
    for (const s of model.scenarios) {
      out[s.id] = computeForecast(model, s.id);
    }
    return out;
  }, [model]);

  // Helpers to update the model
  const updateModel = (updater) => {
    save({ ...data, forecastModel: updater(data.forecastModel) });
  };

  const updateDriverValue = (driverId, month, value) => {
    updateModel((m) => ({
      ...m,
      drivers: m.drivers.map((d) =>
        d.id === driverId ? { ...d, values: { ...d.values, [month]: value } } : d
      ),
    }));
  };

  const updateDriverField = (driverId, field, value) => {
    updateModel((m) => ({
      ...m,
      drivers: m.drivers.map((d) => (d.id === driverId ? { ...d, [field]: value } : d)),
    }));
  };

  const updateMetric = (metricId, field, value) => {
    updateModel((m) => ({
      ...m,
      metrics: m.metrics.map((met) => (met.id === metricId ? { ...met, [field]: value } : met)),
    }));
  };

  const deleteDriver = (driverId) => {
    if (!confirm('Delete this driver? Formulas referencing it may break.')) return;
    updateModel((m) => ({ ...m, drivers: m.drivers.filter((d) => d.id !== driverId) }));
  };

  const deleteMetric = (metricId) => {
    if (!confirm('Delete this metric? Other formulas referencing it may break.')) return;
    updateModel((m) => ({ ...m, metrics: m.metrics.filter((met) => met.id !== metricId) }));
  };

  const setActiveScenario = (id) => updateModel((m) => ({ ...m, activeScenario: id }));

  const addMonth = () => {
    const last = model.periods[model.periods.length - 1];
    const [y, mo] = last.split('-');
    const next = new Date(parseInt(y), parseInt(mo), 1);
    const newMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    updateModel((m) => ({
      ...m,
      periods: [...m.periods, newMonth],
      drivers: m.drivers.map((d) => ({
        ...d,
        values: { ...d.values, [newMonth]: d.values[last] || 0 },
      })),
    }));
  };

  const removeMonth = (month) => {
    if (!confirm(`Remove ${monthLabel(month)} from forecast?`)) return;
    updateModel((m) => ({
      ...m,
      periods: m.periods.filter((p) => p !== month),
      drivers: m.drivers.map((d) => {
        const { [month]: _, ...rest } = d.values;
        return { ...d, values: rest };
      }),
    }));
  };

  const activeScenarioObj = model.scenarios.find((s) => s.id === model.activeScenario);

  return (
    <div>
      <SectionHeader num="4" title="xP&A Forecast Model" subtitle="Driver-based planning · Formulas · Three-way linked" />

      {/* SCENARIO BAR */}
      <div style={styles.scenarioBar}>
        <div style={styles.scenarioBarLabel}>Active Scenario</div>
        <div style={styles.scenarioPills}>
          {model.scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveScenario(s.id)}
              style={{
                ...styles.scenarioPill,
                ...(model.activeScenario === s.id ? styles.scenarioPillActive : {}),
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', marginRight: 6 }} />
              {s.name}
            </button>
          ))}
          <button
            onClick={() => {
              const newId = 'custom_' + Date.now();
              updateModel((m) => ({
                ...m,
                scenarios: [...m.scenarios, { id: newId, name: 'Custom Scenario', description: 'Click to edit', color: C.text2, overrides: {} }],
                activeScenario: newId,
              }));
            }}
            style={styles.scenarioAddBtn}
          >
            + New
          </button>
        </div>
        <div style={styles.scenarioDescription}>
          {activeScenarioObj?.description}
        </div>
      </div>

      {/* TABS */}
      <div style={styles.forecastTabs}>
        <button onClick={() => setActiveTab('pnl')} style={{ ...styles.forecastTab, ...(activeTab === 'pnl' ? styles.forecastTabActive : {}) }}>
          <span style={styles.tabNum}>0</span>
          P&L Forecast
        </button>
        <button onClick={() => setActiveTab('drivers')} style={{ ...styles.forecastTab, ...(activeTab === 'drivers' ? styles.forecastTabActive : {}) }}>
          <span style={styles.tabNum}>1</span>
          Drivers <span style={styles.tabBadge}>{model.drivers.length}</span>
        </button>
        <button onClick={() => setActiveTab('metrics')} style={{ ...styles.forecastTab, ...(activeTab === 'metrics' ? styles.forecastTabActive : {}) }}>
          <span style={styles.tabNum}>2</span>
          Formulas <span style={styles.tabBadge}>{model.metrics.length}</span>
        </button>
        <button onClick={() => setActiveTab('threeway')} style={{ ...styles.forecastTab, ...(activeTab === 'threeway' ? styles.forecastTabActive : {}) }}>
          <span style={styles.tabNum}>3</span>
          Three-Way Model
        </button>
        <button onClick={() => setActiveTab('scenarios')} style={{ ...styles.forecastTab, ...(activeTab === 'scenarios' ? styles.forecastTabActive : {}) }}>
          <span style={styles.tabNum}>4</span>
          Compare Scenarios
        </button>
        <button onClick={() => setActiveTab('runway')} style={{ ...styles.forecastTab, ...(activeTab === 'runway' ? styles.forecastTabActive : {}) }}>
          <span style={styles.tabNum}>5</span>
          Cash Runway
        </button>
      </div>

      {/* ═══════════ P&L FORECAST TAB (chart of accounts driven) ═══════════ */}
      {activeTab === 'pnl' && (
        <PnlForecastTab data={data} save={save} />
      )}

      {/* ═══════════ DRIVERS TAB ═══════════ */}
      {activeTab === 'drivers' && (
        <DriversTab
          model={model}
          computed={computed}
          activeScenario={activeScenarioObj}
          onUpdateValue={updateDriverValue}
          onUpdateField={updateDriverField}
          onDelete={deleteDriver}
          onAddMonth={addMonth}
          onRemoveMonth={removeMonth}
          onAddDriver={() => setShowAddDriver(true)}
        />
      )}

      {/* ═══════════ METRICS (FORMULAS) TAB ═══════════ */}
      {activeTab === 'metrics' && (
        <MetricsTab
          model={model}
          computed={computed}
          onUpdateMetric={updateMetric}
          onDeleteMetric={deleteMetric}
          onAddMetric={() => setShowAddMetric(true)}
          onEditFormula={(id) => {
            setFormulaHelperContext({ metricId: id, type: 'edit' });
            setShowFormulaHelper(true);
          }}
        />
      )}

      {/* ═══════════ THREE-WAY MODEL TAB ═══════════ */}
      {activeTab === 'threeway' && (
        <ThreeWayTab model={model} computed={computed} data={data} />
      )}

      {/* ═══════════ SCENARIO COMPARISON TAB ═══════════ */}
      {activeTab === 'scenarios' && (
        <ScenarioCompareTab
          model={model}
          allScenarios={allScenarios}
          updateModel={updateModel}
          data={data}
        />
      )}

      {/* ═══════════ CASH RUNWAY TAB ═══════════ */}
      {activeTab === 'runway' && (
        <RunwayTab model={model} computed={computed} data={data} />
      )}

      {/* MODALS */}
      {showAddMetric && (
        <AddMetricModal
          model={model}
          onClose={() => setShowAddMetric(false)}
          onSave={(newMetric) => {
            updateModel((m) => ({ ...m, metrics: [...m.metrics, newMetric] }));
            setShowAddMetric(false);
          }}
          onOpenFormulaHelper={(metricSkel) => {
            setFormulaHelperContext({ type: 'new', metric: metricSkel });
            setShowFormulaHelper(true);
            setShowAddMetric(false);
          }}
        />
      )}

      {showAddDriver && (
        <AddDriverModal
          model={model}
          onClose={() => setShowAddDriver(false)}
          onSave={(newDriver) => {
            updateModel((m) => ({ ...m, drivers: [...m.drivers, newDriver] }));
            setShowAddDriver(false);
          }}
        />
      )}

      {showFormulaHelper && formulaHelperContext && (
        <FormulaHelperModal
          model={model}
          computed={computed}
          context={formulaHelperContext}
          onClose={() => { setShowFormulaHelper(false); setFormulaHelperContext(null); }}
          onSave={(formula, metricId) => {
            if (formulaHelperContext.type === 'edit') {
              updateMetric(metricId, 'formula', formula);
            } else {
              updateModel((m) => ({ ...m, metrics: [...m.metrics, { ...formulaHelperContext.metric, formula }] }));
            }
            setShowFormulaHelper(false);
            setFormulaHelperContext(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DRIVERS TAB — Spreadsheet-style driver editor
// ═══════════════════════════════════════════════════════════════
function DriversTab({ model, computed, activeScenario, onUpdateValue, onUpdateField, onDelete, onAddMonth, onRemoveMonth, onAddDriver }) {
  const [filterGroup, setFilterGroup] = useState('all');
  const groups = ['all', ...Array.from(new Set(model.drivers.map((d) => d.group)))];
  const filtered = filterGroup === 'all' ? model.drivers : model.drivers.filter((d) => d.group === filterGroup);

  const grouped = useMemo(() => {
    const g = {};
    for (const d of filtered) {
      if (!g[d.group]) g[d.group] = [];
      g[d.group].push(d);
    }
    return g;
  }, [filtered]);

  return (
    <div>
      <div style={styles.tabIntro}>
        <div>
          <div style={styles.tabIntroTitle}>Operational Drivers</div>
          <div style={styles.tabIntroText}>
            Drivers are the raw inputs that power your forecast — headcount, churn rate, average pricing. Edit any value per month. All metrics automatically recalculate. The active scenario may override values.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onAddMonth} style={styles.btnSecondary}>+ Add Month</button>
          <button onClick={onAddDriver} style={styles.btnPrimary}>+ Add Driver</button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={styles.filterLabel}>Group:</span>
        {groups.map((g) => (
          <button key={g} onClick={() => setFilterGroup(g)} style={{
            ...styles.filterBtn,
            ...(filterGroup === g ? styles.filterBtnActive : {}),
          }}>{g === 'all' ? 'All' : g}</button>
        ))}
      </div>

      {/* Drivers grid — one table per group */}
      {Object.entries(grouped).map(([groupName, drivers]) => (
        <div key={groupName} style={{ marginBottom: 18 }}>
          <div style={styles.driverGroupHeader}>
            <span style={{ fontFamily: 'Lora, serif', fontWeight: 700 }}>{groupName}</span>
            <span style={{ fontSize: '7pt', color: C.text2 }}>{drivers.length} driver{drivers.length > 1 ? 's' : ''}</span>
          </div>
          <div style={styles.scrollTable}>
            <table style={{ ...styles.table, fontSize: '7.5pt' }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, minWidth: 200, position: 'sticky', left: 0, zIndex: 2 }}>Driver</th>
                  <th style={{ ...styles.th, textAlign: 'center', minWidth: 50 }}>Unit</th>
                  {model.periods.map((p) => (
                    <th key={p} style={{ ...styles.th, textAlign: 'right', minWidth: 70 }}>
                      {monthLabel(p)}
                    </th>
                  ))}
                  <th style={{ ...styles.th, width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => {
                  const override = activeScenario?.overrides?.[d.id];
                  return (
                    <tr key={d.id}>
                      <td style={{ ...styles.td, position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                        <div style={{ fontWeight: 600 }}>
                          <EditableValue type="text" value={d.name} onChange={(v) => onUpdateField(d.id, 'name', v)} />
                        </div>
                        <div style={{ fontSize: '6.5pt', color: C.text2, marginTop: 2, fontStyle: 'italic' }}>
                          {d.description}
                        </div>
                        {override && (
                          <div style={styles.overrideBadge}>
                            Scenario override: {override.multiplier !== undefined ? `×${override.multiplier}` : ''}{override.adder !== undefined ? ` +${override.adder}` : ''}{override.override !== undefined ? ` =${override.override}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontSize: '6.5pt', color: C.text2 }}>{d.unit}</td>
                      {model.periods.map((p) => {
                        const rawVal = d.values[p] ?? 0;
                        const displayVal = computed[d.id]?.[p] ?? rawVal; // scenario-adjusted
                        const isOverridden = rawVal !== displayVal;
                        return (
                          <td key={p} style={{ ...styles.tdR, background: isOverridden ? '#F8F8F8' : '#fff' }}>
                            <div style={{ fontSize: '8pt' }}>
                              <EditableValue
                                value={rawVal}
                                onChange={(v) => onUpdateValue(d.id, p, v)}
                                type="number"
                              />
                            </div>
                            {isOverridden && (
                              <div style={{ fontSize: '6pt', color: C.text2, fontStyle: 'italic' }}>
                                → {d.unit === '$' ? fmt(displayVal) : displayVal.toFixed(1)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td style={styles.td}>
                        <button onClick={() => onDelete(d.id)} style={styles.miniBtn}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// METRICS TAB — Formula editor and output view
// ═══════════════════════════════════════════════════════════════
function MetricsTab({ model, computed, onUpdateMetric, onDeleteMetric, onAddMetric, onEditFormula }) {
  const [filterGroup, setFilterGroup] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const groups = ['all', ...Array.from(new Set(model.metrics.map((m) => m.group)))];
  const filtered = filterGroup === 'all' ? model.metrics : model.metrics.filter((m) => m.group === filterGroup);

  return (
    <div>
      <div style={styles.tabIntro}>
        <div>
          <div style={styles.tabIntroTitle}>Formulas & Calculated Metrics</div>
          <div style={styles.tabIntroText}>
            Formulas compute financial outputs from drivers. Use driver IDs (like <code>d_new_members</code>) and reference other metrics. Use <code>[prev:metric_id]</code> for rolling calculations.
          </div>
        </div>
        <button onClick={onAddMetric} style={styles.btnPrimary}>+ Add Formula</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={styles.filterLabel}>Group:</span>
        {groups.map((g) => (
          <button key={g} onClick={() => setFilterGroup(g)} style={{
            ...styles.filterBtn,
            ...(filterGroup === g ? styles.filterBtnActive : {}),
          }}>{g === 'all' ? 'All' : g}</button>
        ))}
      </div>

      {filtered.map((metric) => {
        const isExpanded = expandedId === metric.id;
        return (
          <div key={metric.id} style={styles.metricCard}>
            <div style={styles.metricHeader} onClick={() => setExpandedId(isExpanded ? null : metric.id)}>
              <div style={{ flex: 1 }}>
                <div style={styles.metricTitle}>
                  {metric.isPinned && <span style={styles.pinBadge}>PINNED</span>}
                  {metric.name}
                  <span style={styles.metricGroupTag}>{metric.group}</span>
                </div>
                <div style={styles.metricFormula}>
                  <span style={{ color: C.text2 }}>=</span> <code>{metric.formula}</code>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '6.5pt', color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Last Month ({monthLabel(model.periods[model.periods.length - 1])})
                </div>
                <div style={{ fontFamily: 'Lora, serif', fontSize: '13pt', fontWeight: 700, lineHeight: 1 }}>
                  {metric.unit === '$' ? fmt(computed[metric.id]?.[model.periods[model.periods.length - 1]] ?? 0) :
                   metric.unit === '%' ? `${(computed[metric.id]?.[model.periods[model.periods.length - 1]] ?? 0).toFixed(1)}%` :
                   metric.unit === 'months' ? `${(computed[metric.id]?.[model.periods[model.periods.length - 1]] ?? 0).toFixed(1)} mo` :
                   Math.round(computed[metric.id]?.[model.periods[model.periods.length - 1]] ?? 0).toLocaleString()}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onEditFormula(metric.id); }} style={styles.miniBtnLabel}>EDIT</button>
              <button onClick={(e) => { e.stopPropagation(); onDeleteMetric(metric.id); }} style={styles.miniBtn}>×</button>
            </div>

            {isExpanded && (
              <div style={styles.metricExpand}>
                <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, marginBottom: 6 }}>
                  Monthly Projection
                </div>
                <div style={styles.scrollTable}>
                  <table style={{ ...styles.table, fontSize: '7.5pt' }}>
                    <thead>
                      <tr>
                        {model.periods.map((p) => (
                          <th key={p} style={{ ...styles.th, textAlign: 'right' }}>{monthLabel(p)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {model.periods.map((p) => (
                          <td key={p} style={styles.tdR}>
                            {metric.unit === '$' ? fmt(computed[metric.id]?.[p] ?? 0) :
                             metric.unit === '%' ? `${(computed[metric.id]?.[p] ?? 0).toFixed(1)}%` :
                             metric.unit === 'months' ? `${(computed[metric.id]?.[p] ?? 0).toFixed(1)}` :
                             Math.round(computed[metric.id]?.[p] ?? 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 12, fontSize: '7.5pt', color: C.text2 }}>
                  <strong>Description:</strong> <EditableValue type="text" value={metric.description || ''} onChange={(v) => onUpdateMetric(metric.id, 'description', v)} />
                </div>

                <div style={{ marginTop: 8, fontSize: '7.5pt', color: C.text2 }}>
                  <strong>Dependencies:</strong>{' '}
                  {(() => {
                    const { deps, prevDeps } = getFormulaDependencies(metric.formula);
                    const all = [...deps, ...prevDeps.map((d) => `${d} (prev)`)];
                    return all.length > 0 ? all.map((d) => (
                      <span key={d} style={styles.depChip}>{d}</span>
                    )) : <em style={{ color: C.text2 }}>no dependencies</em>;
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// THREE-WAY MODEL TAB — P&L, Balance Sheet, Cash Flow linked
// ═══════════════════════════════════════════════════════════════
function ThreeWayTab({ model, computed, data }) {
  const [view, setView] = useState('pl'); // 'pl' | 'bs' | 'cf'

  const plMetrics = [
    { id: 'm_membership_rev', label: 'Membership Revenue', indent: 1 },
    { id: 'm_event_rev_total', label: 'Event Revenue', indent: 1 },
    { id: 'm_sponsor_rev', label: 'Sponsorship Revenue', indent: 1 },
    { id: 'd_other_rev', label: 'Other Revenue', indent: 1 },
    { id: 'm_total_revenue', label: 'Total Revenue', bold: true, underline: true },
    { spacer: true },
    { id: 'm_personnel', label: 'Personnel Costs', indent: 1 },
    { id: 'd_program_cost', label: 'Program Delivery', indent: 1 },
    { id: 'd_marketing_cost', label: 'Marketing & Sales', indent: 1 },
    { id: 'd_tech_cost', label: 'Technology & Operations', indent: 1 },
    { id: 'd_ga_cost', label: 'General & Administrative', indent: 1 },
    { id: 'm_total_costs', label: 'Total Costs', bold: true, underline: true },
    { spacer: true },
    { id: 'm_gross_margin', label: 'Gross Margin %', unit: '%' },
    { id: 'm_net_income', label: 'Net Income', bold: true, highlight: true },
  ];

  const bsMetrics = [
    { heading: 'Current Assets' },
    { id: 'm_cash_balance', label: 'Cash & Equivalents', indent: 1 },
    { id: 'm_ar', label: 'Accounts Receivable', indent: 1 },
    { spacer: true },
    { heading: 'Current Liabilities' },
    { id: 'm_ap', label: 'Accounts Payable', indent: 1 },
  ];

  const cfMetrics = [
    { heading: 'Operating Activities' },
    { id: 'm_net_income', label: 'Net Income', indent: 1 },
    { id: 'm_change_ar', label: 'Δ Accounts Receivable', indent: 1, invert: true },
    { id: 'm_change_ap', label: 'Δ Accounts Payable', indent: 1 },
    { id: 'm_operating_cash', label: 'Operating Cash Flow', bold: true, highlight: true },
    { spacer: true },
    { heading: 'Cash Position' },
    { id: 'm_cash_balance', label: 'Ending Cash Balance', indent: 1, bold: true },
    { id: 'm_runway', label: 'Runway (months)', indent: 1, unit: 'months' },
  ];

  const rows = view === 'pl' ? plMetrics : view === 'bs' ? bsMetrics : cfMetrics;
  const title = view === 'pl' ? 'Profit & Loss' : view === 'bs' ? 'Balance Sheet' : 'Cash Flow';

  return (
    <div>
      <div style={styles.tabIntro}>
        <div>
          <div style={styles.tabIntroTitle}>Three-Way Financial Model</div>
          <div style={styles.tabIntroText}>
            The P&L, Balance Sheet, and Cash Flow statement all compute from the same drivers. Edit any driver and watch all three statements recalculate instantly. This is true three-way linkage.
          </div>
        </div>
      </div>

      {/* Three-way tabs */}
      <div style={{ display: 'flex', gap: 1, background: '#D9D9D9', border: '1px solid #808080', marginBottom: 14 }}>
        {[
          { id: 'pl', label: 'Profit & Loss' },
          { id: 'bs', label: 'Balance Sheet' },
          { id: 'cf', label: 'Cash Flow' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: view === t.id ? '#000' : '#fff',
              color: view === t.id ? '#fff' : '#000',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Lora, serif',
              fontSize: '10pt',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.scrollTable}>
        <table style={{ ...styles.table, fontSize: '8.5pt' }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, minWidth: 220, position: 'sticky', left: 0, zIndex: 2 }}>{title}</th>
              {model.periods.map((p) => (
                <th key={p} style={{ ...styles.th, textAlign: 'right', minWidth: 75 }}>{monthLabel(p)}</th>
              ))}
              <th style={{ ...styles.th, textAlign: 'right', minWidth: 85, background: '#404040' }}>Total / Avg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              if (row.spacer) return <tr key={`s${idx}`} style={{ height: 6 }}><td colSpan={model.periods.length + 2} style={{ background: '#fff', border: 'none' }}></td></tr>;
              if (row.heading) return (
                <tr key={`h${idx}`}>
                  <td colSpan={model.periods.length + 2} style={{
                    ...styles.td, background: '#F2F2F2', fontSize: '7.5pt', textTransform: 'uppercase',
                    letterSpacing: '0.08em', fontWeight: 700, padding: '6px 10px', borderTop: '1px solid #808080',
                  }}>{row.heading}</td>
                </tr>
              );

              const values = model.periods.map((p) => computed[row.id]?.[p] ?? 0);
              const total = row.unit === '%' || row.unit === 'months'
                ? values.reduce((s, v) => s + v, 0) / values.length
                : values.reduce((s, v) => s + v, 0);

              const rowStyle = {
                ...(row.highlight ? { background: '#F2F2F2' } : {}),
                ...(row.bold ? { fontWeight: 700 } : {}),
                ...(row.underline ? { borderTop: '1px solid #808080' } : {}),
              };

              const formatVal = (v) => {
                if (row.unit === '%') return `${v.toFixed(1)}%`;
                if (row.unit === 'months') return `${v.toFixed(1)} mo`;
                return fmt(v);
              };

              return (
                <tr key={row.id} style={rowStyle}>
                  <td style={{
                    ...styles.td,
                    paddingLeft: row.indent ? 20 : 10,
                    fontWeight: row.bold ? 700 : 400,
                    position: 'sticky', left: 0, zIndex: 1,
                    background: row.highlight ? '#F2F2F2' : '#fff',
                  }}>{row.label}</td>
                  {values.map((v, i) => (
                    <td key={i} style={{ ...styles.tdR, background: row.highlight ? '#F2F2F2' : '#fff' }}>
                      {formatVal(v)}
                    </td>
                  ))}
                  <td style={{ ...styles.tdR, background: '#F2F2F2', fontWeight: 700 }}>
                    {formatVal(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO COMPARISON TAB
// ═══════════════════════════════════════════════════════════════
function ScenarioCompareTab({ model, allScenarios, updateModel, data }) {
  const [selectedMetric, setSelectedMetric] = useState('m_total_revenue');
  const [editingScenario, setEditingScenario] = useState(null);

  const selectedMetricObj = model.metrics.find((m) => m.id === selectedMetric) ||
    { id: selectedMetric, name: model.drivers.find((d) => d.id === selectedMetric)?.name || selectedMetric, unit: '$' };

  // All things we can chart
  const chartableItems = [...model.metrics.filter((m) => m.isPinned || ['m_total_revenue', 'm_total_costs', 'm_net_income', 'm_cash_balance', 'm_members'].includes(m.id))];

  const updateScenario = (id, field, value) => {
    updateModel((m) => ({
      ...m,
      scenarios: m.scenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const updateScenarioOverride = (scenarioId, driverId, override) => {
    updateModel((m) => ({
      ...m,
      scenarios: m.scenarios.map((s) => {
        if (s.id !== scenarioId) return s;
        const overrides = { ...s.overrides };
        if (!override || (override.multiplier === undefined && override.adder === undefined && override.override === undefined)) {
          delete overrides[driverId];
        } else {
          overrides[driverId] = override;
        }
        return { ...s, overrides };
      }),
    }));
  };

  const deleteScenario = (id) => {
    if (model.scenarios.length <= 1) { alert('Must keep at least one scenario'); return; }
    if (!confirm('Delete this scenario?')) return;
    updateModel((m) => ({
      ...m,
      scenarios: m.scenarios.filter((s) => s.id !== id),
      activeScenario: m.activeScenario === id ? m.scenarios.find((s) => s.id !== id)?.id : m.activeScenario,
    }));
    if (editingScenario === id) setEditingScenario(null);
  };

  return (
    <div>
      <div style={styles.tabIntro}>
        <div>
          <div style={styles.tabIntroTitle}>Compare Scenarios Side-by-Side</div>
          <div style={styles.tabIntroText}>
            Each scenario applies overrides to the base drivers. Compare revenue, costs, cash runway across scenarios to stress-test your plan.
          </div>
        </div>
      </div>

      {/* Metric selector */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={styles.filterLabel}>Chart metric:</span>
        {chartableItems.map((m) => (
          <button key={m.id} onClick={() => setSelectedMetric(m.id)} style={{
            ...styles.filterBtn,
            ...(selectedMetric === m.id ? styles.filterBtnActive : {}),
          }}>{m.name}</button>
        ))}
      </div>

      {/* Comparison chart */}
      <ScenarioCompareChart
        model={model}
        allScenarios={allScenarios}
        metricId={selectedMetric}
        metric={selectedMetricObj}
      />

      {/* Comparison table */}
      <div style={styles.scrollTable}>
        <table style={{ ...styles.table, fontSize: '8.5pt', marginTop: 14 }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, minWidth: 140, position: 'sticky', left: 0, zIndex: 2 }}>Scenario · {selectedMetricObj.name}</th>
              {model.periods.map((p) => (
                <th key={p} style={{ ...styles.th, textAlign: 'right' }}>{monthLabel(p)}</th>
              ))}
              <th style={{ ...styles.th, textAlign: 'right', background: '#404040' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {model.scenarios.map((s) => {
              const values = model.periods.map((p) => allScenarios[s.id]?.[selectedMetric]?.[p] ?? 0);
              const total = selectedMetricObj.unit === '%' || selectedMetricObj.unit === 'months'
                ? values.reduce((sum, v) => sum + v, 0) / values.length
                : values.reduce((sum, v) => sum + v, 0);

              const formatVal = (v) =>
                selectedMetricObj.unit === '%' ? `${v.toFixed(1)}%` :
                selectedMetricObj.unit === 'months' ? `${v.toFixed(1)} mo` :
                fmt(v);

              return (
                <tr key={s.id} style={s.id === model.activeScenario ? { background: '#F2F2F2' } : {}}>
                  <td style={{ ...styles.td, position: 'sticky', left: 0, background: s.id === model.activeScenario ? '#F2F2F2' : '#fff', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}></span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '6.5pt', color: C.text2 }}>{Object.keys(s.overrides).length} overrides</div>
                      </div>
                    </div>
                  </td>
                  {values.map((v, i) => (
                    <td key={i} style={styles.tdR}>{formatVal(v)}</td>
                  ))}
                  <td style={{ ...styles.tdR, background: '#F2F2F2', fontWeight: 700 }}>{formatVal(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Scenario editor */}
      <div style={{ marginTop: 20 }}>
        <SubsectionHeader num="4D" title="Manage Scenarios" />
        <div style={styles.scenarioGrid}>
          {model.scenarios.map((s) => (
            <div key={s.id} style={{ ...styles.scenarioCardV2, ...(s.id === model.activeScenario ? { borderWidth: 1.5, borderColor: '#000' } : {}) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700 }}>
                    <EditableValue type="text" value={s.name} onChange={(v) => updateScenario(s.id, 'name', v)} />
                  </div>
                </div>
                {model.scenarios.length > 1 && (
                  <button onClick={() => deleteScenario(s.id)} style={styles.miniBtn}>×</button>
                )}
              </div>
              <div style={{ fontSize: '7.5pt', color: C.text2, fontStyle: 'italic', marginBottom: 8 }}>
                <EditableValue type="text" value={s.description} onChange={(v) => updateScenario(s.id, 'description', v)} />
              </div>

              {/* Overrides list */}
              <div style={{ fontSize: '7.5pt' }}>
                <div style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '6.5pt', color: C.text2, marginBottom: 4 }}>
                  Driver Overrides ({Object.keys(s.overrides).length})
                </div>
                {Object.keys(s.overrides).length === 0 ? (
                  <div style={{ color: C.text2, fontStyle: 'italic', fontSize: '7pt' }}>No overrides — uses base drivers</div>
                ) : (
                  Object.entries(s.overrides).map(([driverId, override]) => {
                    const driver = model.drivers.find((d) => d.id === driverId);
                    return (
                      <div key={driverId} style={styles.overrideRow}>
                        <span style={{ flex: 1, fontSize: '7pt' }}>{driver?.name || driverId}</span>
                        <span style={{ fontSize: '7pt', color: '#000', fontWeight: 600 }}>
                          {override.multiplier !== undefined && `×${override.multiplier}`}
                          {override.adder !== undefined && ` +${override.adder}`}
                          {override.override !== undefined && ` =${override.override}`}
                        </span>
                        <button onClick={() => updateScenarioOverride(s.id, driverId, null)} style={styles.miniBtn}>×</button>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => setEditingScenario(editingScenario === s.id ? null : s.id)}
                style={{ ...styles.btnGhost, marginTop: 8, width: '100%' }}
              >
                {editingScenario === s.id ? 'Done' : '+ Add / Edit Override'}
              </button>

              {editingScenario === s.id && (
                <ScenarioOverrideEditor
                  scenario={s}
                  drivers={model.drivers}
                  onAdd={(driverId, override) => updateScenarioOverride(s.id, driverId, override)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScenarioOverrideEditor({ scenario, drivers, onAdd }) {
  const [selectedDriver, setSelectedDriver] = useState(drivers[0]?.id);
  const [type, setType] = useState('multiplier');
  const [value, setValue] = useState(1);

  return (
    <div style={{ marginTop: 8, padding: 10, background: '#F2F2F2', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, marginBottom: 6 }}>
        Add Override
      </div>
      <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} style={{ ...styles.select, width: '100%', marginBottom: 6 }}>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name} ({d.unit})</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...styles.select, flex: 1 }}>
          <option value="multiplier">Multiply by</option>
          <option value="adder">Add to</option>
          <option value="override">Set equal to</option>
        </select>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
          style={{ width: 70, border: `1px solid ${C.border}`, padding: '4px 6px', fontFamily: 'inherit', fontSize: '8pt' }}
          step="0.1"
        />
      </div>
      <button
        onClick={() => {
          onAdd(selectedDriver, { [type]: value });
          setValue(type === 'multiplier' ? 1 : 0);
        }}
        style={{ ...styles.btnPrimary, width: '100%', padding: '6px 12px', fontSize: '7.5pt' }}
      >
        Apply Override
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CASH RUNWAY TAB — Live chart from computed model
// ═══════════════════════════════════════════════════════════════
function RunwayTab({ model, computed, data }) {
  const historicalBalances = useMemo(() => {
    const balances = [];
    let cash = data.balanceSheet.cash;
    for (let i = data.monthly.length - 1; i >= 0; i--) {
      balances.unshift({ month: data.monthly[i].month, balance: cash, isActual: true });
      cash = cash - (data.monthly[i].revenue - data.monthly[i].expenses);
    }
    return balances;
  }, [data]);

  const runwayData = useMemo(() => {
    return [
      ...historicalBalances,
      ...model.periods.map((p) => ({
        month: p,
        balance: computed['m_cash_balance']?.[p] ?? 0,
        isActual: false,
      })),
    ];
  }, [historicalBalances, computed, model.periods]);

  const minThreshold = (computed['m_total_costs']?.[model.periods[0]] ?? 0) * 2;
  const lastRunway = computed['m_runway']?.[model.periods[model.periods.length - 1]] ?? 0;
  const minRunway = Math.min(...model.periods.map((p) => computed['m_runway']?.[p] ?? Infinity));
  const endCash = computed['m_cash_balance']?.[model.periods[model.periods.length - 1]] ?? 0;

  return (
    <div>
      <div style={styles.tabIntro}>
        <div>
          <div style={styles.tabIntroTitle}>Cash Runway · Live from Model</div>
          <div style={styles.tabIntroText}>
            Cash balance is computed from your drivers and formulas. Historical actuals + projected ending cash using the active scenario.
          </div>
        </div>
      </div>

      <div style={styles.miniGrid}>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>End Cash (Forecast)</div>
          <div style={styles.mmValue}>{fmt(endCash, 1)}</div>
        </div>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>End Runway</div>
          <div style={styles.mmValue}>{lastRunway.toFixed(1)} mo</div>
        </div>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>Min Runway in Period</div>
          <div style={styles.mmValue}>{minRunway.toFixed(1)} mo</div>
        </div>
        <div style={styles.miniMetric}>
          <div style={styles.mmLabel}>Min Threshold</div>
          <div style={styles.mmValue}>{fmt(minThreshold)}</div>
        </div>
      </div>

      <CashRunwayChart data={runwayData} actualCount={data.monthly.length} minThreshold={minThreshold} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO COMPARISON CHART
// ═══════════════════════════════════════════════════════════════
function ScenarioCompareChart({ model, allScenarios, metricId, metric }) {
  const W = 800, H = 240, P = { top: 28, right: 120, bottom: 32, left: 60 };
  const cW = W - P.left - P.right;
  const cH = H - P.top - P.bottom;

  // Get all values across all scenarios
  const scenarioData = model.scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    values: model.periods.map((p) => allScenarios[s.id]?.[metricId]?.[p] ?? 0),
  }));

  const allVals = scenarioData.flatMap((s) => s.values);
  const maxVal = Math.max(...allVals, 0) * 1.1 || 1;
  const minVal = Math.min(...allVals, 0);

  const xStep = cW / (model.periods.length - 1 || 1);
  const yScale = (v) => P.top + cH * (1 - (v - minVal) / (maxVal - minVal));

  const buildPath = (values) => {
    if (values.length === 0) return '';
    let path = `M ${P.left} ${yScale(values[0])}`;
    for (let i = 1; i < values.length; i++) {
      const x = P.left + xStep * i;
      const y = yScale(values[i]);
      const prevX = P.left + xStep * (i - 1);
      const prevY = yScale(values[i - 1]);
      const cp1x = prevX + (x - prevX) * 0.5;
      const cp2x = x - (x - prevX) * 0.5;
      path += ` C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
    }
    return path;
  };

  const formatVal = (v) =>
    metric.unit === '%' ? `${v.toFixed(0)}%` :
    metric.unit === 'months' ? `${v.toFixed(1)}` :
    fmt(v);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 16 }}>
      <div style={{ fontFamily: 'Lora, serif', fontSize: '10pt', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {metric.name} · Scenario Comparison
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const v = minVal + (maxVal - minVal) * p;
          const y = yScale(v);
          return (
            <g key={p}>
              <line x1={P.left} y1={y} x2={P.left + cW} y2={y} stroke="#E8E8E8" strokeWidth="0.8" />
              <text x={P.left - 5} y={y + 3} fontSize="7" fill="#B0B0B0" textAnchor="end">{formatVal(v)}</text>
            </g>
          );
        })}

        {/* Scenario lines */}
        {scenarioData.map((s, sIdx) => (
          <g key={s.id}>
            <path d={buildPath(s.values)} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            {s.values.map((v, i) => (
              <circle
                key={i}
                cx={P.left + xStep * i}
                cy={yScale(v)}
                r="3.5"
                fill="#fff"
                stroke={s.color}
                strokeWidth="1.8"
              />
            ))}
            {/* Label at end */}
            <text
              x={P.left + cW + 6}
              y={yScale(s.values[s.values.length - 1]) + 3}
              fontSize="8"
              fill={s.color === '#D9D9D9' ? '#404040' : s.color}
              fontWeight="600"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {model.periods.map((p, i) => (
          <text
            key={p}
            x={P.left + xStep * i}
            y={H - 10}
            fontSize="7"
            textAnchor="middle"
            fill="#808080"
          >
            {monthLabel(p)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD METRIC / DRIVER / FORMULA HELPER MODALS
// ═══════════════════════════════════════════════════════════════
function AddMetricModal({ model, onClose, onSave, onOpenFormulaHelper }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Revenue');
  const [unit, setUnit] = useState('$');
  const [formula, setFormula] = useState('');
  const [description, setDescription] = useState('');

  const groups = Array.from(new Set(model.metrics.map((m) => m.group)));

  const handleSave = () => {
    if (!name.trim() || !formula.trim()) {
      alert('Name and formula are required');
      return;
    }
    const id = 'm_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    onSave({ id, name, group, unit, formula, description });
  };

  return (
    <Modal title="New Formula / Metric" onClose={onClose}>
      <div style={{ display: 'grid', gap: 10 }}>
        <label style={styles.formLabel}>
          Metric Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Total Revenue" style={styles.formInput} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={styles.formLabel}>
            Group
            <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Revenue, Costs, P&L..." style={styles.formInput} list="metric-groups" />
            <datalist id="metric-groups">
              {groups.map((g) => <option key={g} value={g} />)}
            </datalist>
          </label>
          <label style={styles.formLabel}>
            Unit
            <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...styles.formInput, appearance: 'auto' }}>
              <option value="$">$ (Currency)</option>
              <option value="%">% (Percentage)</option>
              <option value="count">Count</option>
              <option value="months">Months</option>
              <option value="days">Days</option>
            </select>
          </label>
        </div>
        <label style={styles.formLabel}>
          Formula
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="e.g., d_members * d_arpu" style={{ ...styles.formInput, fontFamily: 'monospace', flex: 1 }} />
            <button
              type="button"
              onClick={() => onOpenFormulaHelper({ id: 'm_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name, group, unit, description })}
              style={styles.btnSecondary}
            >
              Formula Builder
            </button>
          </div>
          <div style={{ fontSize: '7pt', color: C.text2, marginTop: 4 }}>
            Reference drivers with <code>d_xxx</code>, metrics with <code>m_xxx</code>, previous month with <code>[prev:m_xxx]</code>
          </div>
        </label>
        <label style={styles.formLabel}>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this metric represents" style={styles.formInput} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
          <button onClick={handleSave} style={styles.btnPrimary}>Create Formula</button>
        </div>
      </div>
    </Modal>
  );
}

function AddDriverModal({ model, onClose, onSave }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Membership');
  const [unit, setUnit] = useState('$');
  const [defaultValue, setDefaultValue] = useState(0);
  const [description, setDescription] = useState('');

  const groups = Array.from(new Set(model.drivers.map((d) => d.group)));

  const handleSave = () => {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    const id = 'd_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const values = {};
    model.periods.forEach((p) => { values[p] = parseFloat(defaultValue) || 0; });
    onSave({ id, name, group, unit, values, description });
  };

  return (
    <Modal title="New Driver" onClose={onClose}>
      <div style={{ display: 'grid', gap: 10 }}>
        <label style={styles.formLabel}>
          Driver Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Marketing Conversion Rate" style={styles.formInput} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={styles.formLabel}>
            Group
            <input value={group} onChange={(e) => setGroup(e.target.value)} style={styles.formInput} list="driver-groups" />
            <datalist id="driver-groups">
              {groups.map((g) => <option key={g} value={g} />)}
            </datalist>
          </label>
          <label style={styles.formLabel}>
            Unit
            <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...styles.formInput, appearance: 'auto' }}>
              <option value="$">$ (Currency)</option>
              <option value="%">% (Percentage)</option>
              <option value="count">Count</option>
              <option value="days">Days</option>
            </select>
          </label>
        </div>
        <label style={styles.formLabel}>
          Initial Value (copied to all months — you can edit each later)
          <input type="number" value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} style={styles.formInput} />
        </label>
        <label style={styles.formLabel}>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this driver represents" style={styles.formInput} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
          <button onClick={handleSave} style={styles.btnPrimary}>Create Driver</button>
        </div>
      </div>
    </Modal>
  );
}

function FormulaHelperModal({ model, computed, context, onClose, onSave }) {
  const existing = context.type === 'edit' ? model.metrics.find((m) => m.id === context.metricId) : context.metric;
  const [formula, setFormula] = useState(existing?.formula || '');
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [testMonth] = useState(model.periods[0]);
  const [testResult, setTestResult] = useState(null);

  const insertAtCursor = (text) => {
    setFormula((f) => f + text);
  };

  const testFormula = () => {
    try {
      const val = evaluateFormula(formula, testMonth, computed, null);
      setTestResult(val);
    } catch (e) {
      setTestResult('ERROR: ' + e.message);
    }
  };

  const askAiForFormula = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    const systemPrompt = `You convert natural language descriptions into forecasting formulas.

Available drivers (prefix d_):
${model.drivers.map((d) => `- ${d.id}: ${d.name} (${d.unit}) — ${d.description}`).join('\n')}

Available metrics (prefix m_):
${model.metrics.map((m) => `- ${m.id}: ${m.name} (${m.unit}) — ${m.description}`).join('\n')}

Syntax rules:
- Use driver/metric IDs directly: d_new_members, m_total_revenue
- For previous month values use: [prev:m_cash_balance]
- Supports + - * / ( ) and Math.max, Math.min, Math.round
- Return ONLY the formula expression, no explanation, no markdown

Example request: "Revenue per employee"
Example response: m_total_revenue / d_headcount

Example request: "Cash balance minus two months burn"
Example response: m_cash_balance - (m_total_costs * 2)`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: "user", content: aiQuery }],
        }),
      });
      const data = await response.json();
      const text = data.content?.find((b) => b.type === 'text')?.text || '';
      // Clean up common AI formatting
      const cleaned = text.trim().replace(/^```\w*\s*/, '').replace(/\s*```$/, '').replace(/^formula:\s*/i, '').trim();
      setAiSuggestion(cleaned);
    } catch (e) {
      setAiSuggestion('Error: could not reach AI');
    }
    setAiLoading(false);
  };

  return (
    <Modal title={context.type === 'edit' ? `Edit: ${existing.name}` : `New Formula: ${existing.name}`} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* LEFT: Formula editor */}
        <div>
          <div style={styles.formLabel}>Formula</div>
          <textarea
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            style={{
              width: '100%',
              minHeight: 80,
              padding: 10,
              border: '1.5px solid #000',
              fontFamily: 'monospace',
              fontSize: '10pt',
              resize: 'vertical',
            }}
            placeholder="e.g., m_total_revenue - m_total_costs"
          />

          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={testFormula} style={styles.btnSecondary}>Test Formula</button>
            {testResult !== null && (
              <span style={{ fontSize: '9pt' }}>
                = <strong>{typeof testResult === 'number' ? (Math.abs(testResult) > 1000 ? fmt(testResult) : testResult.toFixed(2)) : testResult}</strong>
                <span style={{ color: C.text2, marginLeft: 8, fontSize: '7.5pt' }}>for {monthLabel(testMonth)}</span>
              </span>
            )}
          </div>

          {/* AI Formula generator */}
          <div style={{ marginTop: 16, padding: 12, background: '#F2F2F2', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 20, height: 20, background: '#000', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', fontSize: '9pt', fontWeight: 700 }}>M</span>
              <span style={{ fontSize: '8pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Formula Builder</span>
            </div>
            <div style={{ fontSize: '7.5pt', color: C.text2, marginBottom: 6 }}>
              Describe what you want to calculate in plain English. AI will generate the formula.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askAiForFormula()}
                placeholder="e.g., revenue minus cost of goods times 0.3 for tax"
                style={{ ...styles.formInput, flex: 1 }}
              />
              <button onClick={askAiForFormula} disabled={aiLoading} style={styles.btnPrimary}>
                {aiLoading ? '...' : 'Generate'}
              </button>
            </div>
            {aiSuggestion && (
              <div style={{ marginTop: 8, padding: 8, background: '#fff', border: '1px solid #000', fontFamily: 'monospace', fontSize: '9pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <code style={{ flex: 1 }}>{aiSuggestion}</code>
                <button onClick={() => setFormula(aiSuggestion)} style={{ ...styles.btnPrimary, padding: '4px 10px', fontSize: '7pt' }}>Use This</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Insert panel */}
        <div>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, marginBottom: 6 }}>
            Click to Insert
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '8pt', fontWeight: 600, marginBottom: 4 }}>Operators</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['+', '-', '*', '/', '(', ')'].map((op) => (
                <button key={op} onClick={() => insertAtCursor(' ' + op + ' ')} style={styles.chipBtn}>{op}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '8pt', fontWeight: 600, marginBottom: 4 }}>Drivers</div>
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #E8E8E8', padding: 4 }}>
              {model.drivers.map((d) => (
                <div key={d.id} onClick={() => insertAtCursor(d.id)} style={styles.pickerRow}>
                  <span style={{ fontSize: '7pt', color: C.text2 }}>d_</span>
                  <span style={{ fontSize: '8pt' }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '8pt', fontWeight: 600, marginBottom: 4 }}>Metrics</div>
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #E8E8E8', padding: 4 }}>
              {model.metrics.map((m) => (
                <div key={m.id} style={styles.pickerRow}>
                  <span onClick={() => insertAtCursor(m.id)} style={{ flex: 1, display: 'flex', gap: 4 }}>
                    <span style={{ fontSize: '7pt', color: C.text2 }}>m_</span>
                    <span style={{ fontSize: '8pt' }}>{m.name}</span>
                  </span>
                  <button onClick={() => insertAtCursor(`[prev:${m.id}]`)} style={{ ...styles.chipBtn, padding: '1px 4px', fontSize: '6.5pt' }}>prev</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
        <button onClick={() => onSave(formula, context.metricId || existing?.id)} style={styles.btnPrimary}>Save Formula</button>
      </div>
    </Modal>
  );
}


// ══════════════════════════════════════════════════════════════
// RISK & SCENARIOS VIEW
// ══════════════════════════════════════════════════════════════
function RiskScenarios({ data, save }) {
  const [editingScenario, setEditingScenario] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);

  const updateRisk = (id, field, value) => {
    save({ ...data, risks: data.risks.map((r) => (r.id === id ? { ...r, [field]: value } : r)) });
  };

  const updateScenario = (id, field, value) => {
    save({ ...data, scenarios: data.scenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s)) });
  };

  const addRisk = () => {
    const newId = Math.max(0, ...data.risks.map((r) => r.id)) + 1;
    save({
      ...data,
      risks: [...data.risks, { id: newId, name: 'New Risk', probability: 'Medium', impact: 'Medium', dollarImpact: 0, mitigation: 'Click to define', owner: 'Unassigned', status: 'Active' }],
    });
  };

  const addScenario = () => {
    const newId = Math.max(0, ...data.scenarios.map((s) => s.id)) + 1;
    save({
      ...data,
      scenarios: [...data.scenarios, { id: newId, name: 'New Scenario', type: 'custom', revenueGrowth: 0, costGrowth: 0, churnRate: 12, conversionRate: 18, q1Revenue: 0, marCash: 0, runway: 0, assumptions: 'Click to define' }],
    });
  };

  // Calculate scenario projections based on inputs
  const calcScenario = (s) => {
    const baseRevenue = data.monthly.reduce((sum, m) => sum + m.revenue, 0) / data.monthly.length;
    const baseExpenses = data.monthly.reduce((sum, m) => sum + m.expenses, 0) / data.monthly.length;
    const projectedMonthlyRevenue = baseRevenue * (1 + s.revenueGrowth / 100);
    const projectedMonthlyExpenses = baseExpenses * (1 + s.costGrowth / 100);
    const q1Total = projectedMonthlyRevenue * 3;
    const q1Net = (projectedMonthlyRevenue - projectedMonthlyExpenses) * 3;
    const projectedCash = data.balanceSheet.cash + q1Net;
    const projectedRunway = projectedCash / projectedMonthlyExpenses;
    return { q1Total, projectedCash, projectedRunway };
  };

  return (
    <div>
      <SectionHeader num="5" title="Risk & Scenario Planning" subtitle="Build custom scenarios · Manage risks" />

      {/* RISK HEATMAP */}
      <SubsectionHeader num="5A" title="Risk Register" />

      <RiskHeatmap risks={data.risks} />

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Risk</th>
            <th style={styles.th}>Probability</th>
            <th style={styles.th}>Impact</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>$ Impact</th>
            <th style={styles.th}>Mitigation</th>
            <th style={styles.th}>Owner</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {data.risks.map((r) => (
            <tr key={r.id}>
              <td style={styles.td}><EditableValue type="text" value={r.name} onChange={(v) => updateRisk(r.id, 'name', v)} /></td>
              <td style={styles.td}>
                <select value={r.probability} onChange={(e) => updateRisk(r.id, 'probability', e.target.value)} style={styles.select}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </td>
              <td style={styles.td}>
                <select value={r.impact} onChange={(e) => updateRisk(r.id, 'impact', e.target.value)} style={styles.select}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </td>
              <td style={styles.tdR}><EditableValue value={r.dollarImpact} onChange={(v) => updateRisk(r.id, 'dollarImpact', v)} isCurrency /></td>
              <td style={styles.td}><EditableValue type="text" value={r.mitigation} onChange={(v) => updateRisk(r.id, 'mitigation', v)} /></td>
              <td style={styles.td}><EditableValue type="text" value={r.owner} onChange={(v) => updateRisk(r.id, 'owner', v)} /></td>
              <td style={styles.td}>
                <select value={r.status} onChange={(e) => updateRisk(r.id, 'status', e.target.value)} style={styles.select}>
                  <option>Active</option><option>Monitoring</option><option>Resolved</option>
                </select>
              </td>
              <td style={styles.td}>
                <button onClick={() => save({ ...data, risks: data.risks.filter((x) => x.id !== r.id) })} style={styles.miniBtn}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addRisk} style={{ ...styles.btnSecondary, marginTop: 8 }}>+ Add Risk</button>

      {/* SCENARIOS */}
      <SubsectionHeader num="5B" title="Scenario Builder" />

      <div style={styles.scenarioGrid}>
        {data.scenarios.map((s) => {
          const calc = calcScenario(s);
          return (
            <div key={s.id} style={{ ...styles.scenarioCard, ...(s.type === 'base' ? styles.scenarioBase : {}) }}>
              <div style={styles.scenarioHeader}>
                <div style={{ ...styles.scenarioIcon, background: s.type === 'bear' ? '#D9D9D9' : s.type === 'bull' ? '#000' : '#808080' }} />
                <div style={styles.scenarioTitle}>
                  <EditableValue type="text" value={s.name} onChange={(v) => updateScenario(s.id, 'name', v)} />
                </div>
                <button onClick={() => save({ ...data, scenarios: data.scenarios.filter((x) => x.id !== s.id) })} style={styles.miniBtn}>×</button>
              </div>

              <div style={styles.scenarioInputs}>
                <div style={styles.scenarioInput}>
                  <label style={styles.scLabel}>Revenue Growth %</label>
                  <EditableValue value={s.revenueGrowth} onChange={(v) => updateScenario(s.id, 'revenueGrowth', v)} suffix="%" />
                </div>
                <div style={styles.scenarioInput}>
                  <label style={styles.scLabel}>Cost Growth %</label>
                  <EditableValue value={s.costGrowth} onChange={(v) => updateScenario(s.id, 'costGrowth', v)} suffix="%" />
                </div>
                <div style={styles.scenarioInput}>
                  <label style={styles.scLabel}>Churn Rate %</label>
                  <EditableValue value={s.churnRate} onChange={(v) => updateScenario(s.id, 'churnRate', v)} suffix="%" />
                </div>
                <div style={styles.scenarioInput}>
                  <label style={styles.scLabel}>Conversion %</label>
                  <EditableValue value={s.conversionRate} onChange={(v) => updateScenario(s.id, 'conversionRate', v)} suffix="%" />
                </div>
              </div>

              <div style={{ marginTop: 12, padding: 10, background: '#F2F2F2', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, marginBottom: 4 }}>Calculated Outputs</div>
                <div style={{ fontSize: '8pt', display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>Q1 Revenue:</span>
                  <strong>{fmt(calc.q1Total)}</strong>
                </div>
                <div style={{ fontSize: '8pt', display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>Mar Cash:</span>
                  <strong>{fmt(calc.projectedCash, 1)}</strong>
                </div>
                <div style={{ fontSize: '8pt', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Runway:</span>
                  <strong>{calc.projectedRunway.toFixed(1)} mo</strong>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: '7.5pt', color: C.text2, fontStyle: 'italic' }}>
                <EditableValue type="text" value={s.assumptions} onChange={(v) => updateScenario(s.id, 'assumptions', v)} />
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={addScenario} style={{ ...styles.btnSecondary, marginTop: 12 }}>+ Add Custom Scenario</button>
    </div>
  );
}

function RiskHeatmap({ risks }) {
  // Place risks in 3x3 grid based on prob/impact
  const cells = {};
  risks.forEach((r) => {
    const key = `${r.probability}-${r.impact}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(r);
  });

  const probs = ['High', 'Medium', 'Low'];
  const impacts = ['Low', 'Medium', 'High'];

  return (
    <div style={styles.heatmap}>
      <div style={{ ...styles.hmLabel, gridColumn: 1, gridRow: 1, background: 'transparent' }}></div>
      {impacts.map((imp, i) => (
        <div key={imp} style={{ ...styles.hmLabel, gridColumn: i + 2, gridRow: 1 }}>{imp}</div>
      ))}
      {probs.map((prob, pi) => (
        <React.Fragment key={prob}>
          <div style={{ ...styles.hmLabel, gridColumn: 1, gridRow: pi + 2 }}>{prob}</div>
          {impacts.map((imp, ii) => {
            const score = (probs.indexOf(prob) + impacts.indexOf(imp));
            const bg = score >= 3 ? '#D9D9D9' : score >= 1 ? '#E8E8E8' : '#F2F2F2';
            const items = cells[`${prob}-${imp}`] || [];
            return (
              <div key={`${prob}-${imp}`} style={{ ...styles.hmCell, background: bg, gridColumn: ii + 2, gridRow: pi + 2 }}>
                {items.map((r) => (
                  <div key={r.id} style={{ fontSize: '7pt', fontWeight: 600, padding: '2px 4px', textAlign: 'center', lineHeight: 1.2 }}>
                    {r.name}
                  </div>
                ))}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ACTIONS VIEW
// ══════════════════════════════════════════════════════════════
function Actions({ data, save, viewport }) {
  const isMobile = viewport && viewport.isMobile;
  const [view, setView] = useState('today'); // today | week | timeline | strategic | all
  const [selectedAction, setSelectedAction] = useState(null);
  const [quickInput, setQuickInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updateAction = (id, field, value) => {
    save({ ...data, actions: data.actions.map((a) => (a.id === id ? { ...a, [field]: value } : a)) });
  };

  const updateActionFull = (id, updates) => {
    save({ ...data, actions: data.actions.map((a) => (a.id === id ? { ...a, ...updates } : a)) });
  };

  const deleteAction = (id) => {
    if (confirm('Delete this action?')) {
      save({ ...data, actions: data.actions.filter((a) => a.id !== id) });
      if (selectedAction === id) setSelectedAction(null);
    }
  };

  const addAction = (template = {}) => {
    const newId = Math.max(0, ...data.actions.map((a) => a.id)) + 1;
    const newAction = {
      id: newId,
      title: 'New Action',
      description: '',
      owner: 'Unassigned',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      startDate: new Date().toISOString().slice(0, 10),
      impact: 5,
      urgency: 5,
      effort: 'M',
      status: 'Planned',
      category: 'General',
      linkedMetric: null,
      notes: '',
      subtasks: [],
      blockers: [],
      created: new Date().toISOString().slice(0, 10),
      ...template,
    };
    save({ ...data, actions: [...data.actions, newAction] });
    setSelectedAction(newId);
  };

  const toggleSubtask = (actionId, subtaskId) => {
    const action = data.actions.find((a) => a.id === actionId);
    if (!action) return;
    const subtasks = action.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
    updateAction(actionId, 'subtasks', subtasks);
  };

  const addSubtask = (actionId, text) => {
    const action = data.actions.find((a) => a.id === actionId);
    if (!action) return;
    const subId = Math.max(0, ...action.subtasks.map((s) => s.id), actionId * 100) + 1;
    updateAction(actionId, 'subtasks', [...action.subtasks, { id: subId, text, done: false }]);
  };

  const deleteSubtask = (actionId, subtaskId) => {
    const action = data.actions.find((a) => a.id === actionId);
    if (!action) return;
    updateAction(actionId, 'subtasks', action.subtasks.filter((s) => s.id !== subtaskId));
  };

  // Quick add via AI
  const quickAddViaAi = async () => {
    if (!quickInput.trim()) return;
    setAiParsing(true);
    const systemPrompt = `Parse a natural language task into structured action data. Today is ${new Date().toISOString().slice(0, 10)}. Available categories: Revenue, Costs, People, Strategy, Operations, Compliance, General. Available owners (samples): CFO, CEO, CMO, Sales, Sales / Ops, Events, HR, Member Svcs. Available linkable metrics: m_total_revenue, m_membership_rev, m_event_rev_total, m_total_costs, m_cash_balance, d_churn_rate, d_headcount, d_tech_cost. Return ONLY valid JSON, no markdown:
{
  "title": "concise action title",
  "description": "1-2 sentence description",
  "owner": "appropriate owner",
  "dueDate": "YYYY-MM-DD (parse natural dates)",
  "startDate": "YYYY-MM-DD",
  "impact": number 1-10 (business impact),
  "urgency": number 1-10 (time pressure),
  "effort": "S" | "M" | "L" (S=under day, M=few days, L=week+),
  "category": "appropriate category",
  "linkedMetric": "metric_id or null",
  "subtasks": [{"text": "step"}]
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: quickInput }],
        }),
      });
      const result = await response.json();
      const text = result.content?.find((b) => b.type === 'text')?.text || '';
      const cleaned = text.trim().replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleaned);

      const newId = Math.max(0, ...data.actions.map((a) => a.id)) + 1;
      const subtasks = (parsed.subtasks || []).map((s, i) => ({ id: newId * 100 + i, text: s.text, done: false }));
      const newAction = {
        id: newId,
        title: parsed.title,
        description: parsed.description || '',
        owner: parsed.owner || 'Unassigned',
        dueDate: parsed.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        startDate: parsed.startDate || new Date().toISOString().slice(0, 10),
        impact: parsed.impact || 5,
        urgency: parsed.urgency || 5,
        effort: parsed.effort || 'M',
        status: 'Planned',
        category: parsed.category || 'General',
        linkedMetric: parsed.linkedMetric || null,
        notes: '',
        subtasks,
        blockers: [],
        created: new Date().toISOString().slice(0, 10),
      };
      save({ ...data, actions: [...data.actions, newAction] });
      setQuickInput('');
    } catch (e) {
      alert('Could not parse. Try: "Schedule board prep meeting next Tuesday for budget review"');
    }
    setAiParsing(false);
  };

  // Compute derived state
  const enriched = useMemo(() => {
    return data.actions.map((a) => {
      const due = new Date(a.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((due - today) / 86400000);
      const subtaskTotal = a.subtasks?.length || 0;
      const subtaskDone = a.subtasks?.filter((s) => s.done).length || 0;
      const progress = subtaskTotal > 0 ? subtaskDone / subtaskTotal : (a.status === 'Complete' ? 1 : a.status === 'In Progress' ? 0.4 : 0);
      const isOverdue = daysUntil < 0 && a.status !== 'Complete';
      const isToday = daysUntil === 0;
      const isThisWeek = daysUntil >= 0 && daysUntil <= 7;
      // Priority score: weighted blend of impact, urgency, time pressure
      const timePressure = isOverdue ? 12 : daysUntil <= 1 ? 10 : daysUntil <= 3 ? 8 : daysUntil <= 7 ? 6 : daysUntil <= 14 ? 4 : 2;
      const priorityScore = (a.impact * 0.4) + (a.urgency * 0.3) + (timePressure * 0.3);
      return { ...a, daysUntil, subtaskTotal, subtaskDone, progress, isOverdue, isToday, isThisWeek, priorityScore };
    });
  }, [data.actions, today.getTime()]);

  // Apply filters
  const filtered = enriched.filter((a) => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (filterOwner !== 'all' && a.owner !== filterOwner) return false;
    return true;
  });

  const owners = ['all', ...Array.from(new Set(data.actions.map((a) => a.owner)))];
  const categories = ['all', ...Array.from(new Set(data.actions.map((a) => a.category || 'General')))];

  // ─── METRICS for header strip ───
  const metrics = useMemo(() => {
    const incomplete = enriched.filter((a) => a.status !== 'Complete');
    return {
      overdue: incomplete.filter((a) => a.isOverdue).length,
      today: incomplete.filter((a) => a.isToday).length,
      thisWeek: incomplete.filter((a) => a.isThisWeek && !a.isOverdue).length,
      total: incomplete.length,
      inProgress: enriched.filter((a) => a.status === 'In Progress').length,
      completed: enriched.filter((a) => a.status === 'Complete').length,
    };
  }, [enriched]);

  // ─── TODAY VIEW data ───
  const overdue = filtered.filter((a) => a.isOverdue && a.status !== 'Complete').sort((b, a) => a.priorityScore - b.priorityScore);
  const dueToday = filtered.filter((a) => a.isToday && a.status !== 'Complete').sort((b, a) => a.priorityScore - b.priorityScore);
  const inProgress = filtered.filter((a) => a.status === 'In Progress' && !a.isOverdue && !a.isToday).sort((b, a) => a.priorityScore - b.priorityScore);
  const upNext = filtered.filter((a) => a.status === 'Planned' && a.daysUntil > 0 && a.daysUntil <= 7).sort((b, a) => a.priorityScore - b.priorityScore).slice(0, 5);

  return (
    <div>
      <SectionHeader num="6" title="Action Center" subtitle="Your executive command center · Stay on top of what matters now" />

      {/* TOP METRICS STRIP */}
      <div style={{ ...styles.actionMetrics, gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(6, 1fr)' }}>
        <div style={{ ...styles.actionMetric, background: metrics.overdue > 0 ? '#000' : '#fff', color: metrics.overdue > 0 ? '#fff' : '#000', cursor: 'pointer' }} onClick={() => setView('today')}>
          <div style={{ ...styles.actionMetricLabel, color: metrics.overdue > 0 ? '#D9D9D9' : '#808080' }}>Overdue</div>
          <div style={styles.actionMetricValue}>{metrics.overdue}</div>
        </div>
        <div style={styles.actionMetric} onClick={() => setView('today')}>
          <div style={styles.actionMetricLabel}>Due Today</div>
          <div style={styles.actionMetricValue}>{metrics.today}</div>
        </div>
        <div style={styles.actionMetric} onClick={() => setView('week')}>
          <div style={styles.actionMetricLabel}>This Week</div>
          <div style={styles.actionMetricValue}>{metrics.thisWeek}</div>
        </div>
        <div style={styles.actionMetric}>
          <div style={styles.actionMetricLabel}>In Progress</div>
          <div style={styles.actionMetricValue}>{metrics.inProgress}</div>
        </div>
        <div style={styles.actionMetric}>
          <div style={styles.actionMetricLabel}>Total Open</div>
          <div style={styles.actionMetricValue}>{metrics.total}</div>
        </div>
        <div style={{ ...styles.actionMetric, background: '#F2F2F2' }}>
          <div style={styles.actionMetricLabel}>Done (lifetime)</div>
          <div style={styles.actionMetricValue}>{metrics.completed}</div>
        </div>
      </div>

      {/* QUICK CAPTURE */}
      <div style={styles.quickCapture}>
        <div style={styles.aiInsightIcon}>M</div>
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && quickAddViaAi()}
          placeholder='Quick add — try "Review Q1 budget with finance team next Friday, high priority"'
          style={styles.quickCaptureInput}
        />
        <button onClick={quickAddViaAi} disabled={aiParsing || !quickInput.trim()} style={styles.btnPrimary}>
          {aiParsing ? 'Parsing…' : 'AI Add'}
        </button>
        <button onClick={() => addAction()} style={styles.btnSecondary}>+ Manual</button>
      </div>

      {/* VIEW TABS */}
      <div style={styles.actionViewTabs}>
        {[
          { id: 'today', label: 'Today', sub: 'Focus now' },
          { id: 'week', label: 'This Week', sub: '7 days' },
          { id: 'timeline', label: 'Timeline', sub: 'Calendar view' },
          { id: 'strategic', label: 'Strategic', sub: 'Big rocks' },
          { id: 'all', label: 'All Actions', sub: data.actions.length + ' total' },
        ].map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            ...styles.actionViewTab,
            ...(view === t.id ? styles.actionViewTabActive : {}),
          }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700 }}>{t.label}</div>
            <div style={{ fontSize: '6.5pt', opacity: 0.7, marginTop: 2 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap', fontSize: '7.5pt' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, fontWeight: 600 }}>Filter:</span>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={styles.select}>
          {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
        </select>
        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} style={styles.select}>
          {owners.map((o) => <option key={o} value={o}>{o === 'all' ? 'All owners' : o}</option>)}
        </select>
      </div>

      {/* MAIN CONTENT — split with detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: !isMobile && selectedAction ? '1.6fr 1fr' : '1fr', gap: 20 }}>
        <div>
          {view === 'today' && (
            <TodayView
              overdue={overdue}
              dueToday={dueToday}
              inProgress={inProgress}
              upNext={upNext}
              onSelect={setSelectedAction}
              onUpdate={updateAction}
              selectedId={selectedAction}
            />
          )}
          {view === 'week' && (
            <WeekView actions={filtered} onSelect={setSelectedAction} selectedId={selectedAction} onUpdate={updateAction} today={today} />
          )}
          {view === 'timeline' && (
            <TimelineView actions={filtered} onSelect={setSelectedAction} selectedId={selectedAction} today={today} />
          )}
          {view === 'strategic' && (
            <StrategicView actions={filtered} onSelect={setSelectedAction} selectedId={selectedAction} onUpdate={updateAction} />
          )}
          {view === 'all' && (
            <AllView actions={filtered} onSelect={setSelectedAction} selectedId={selectedAction} onUpdate={updateAction} />
          )}
        </div>

        {selectedAction && (() => {
          const action = enriched.find((a) => a.id === selectedAction);
          if (!action) return null;
          return (
            <ActionDetail
              action={action}
              data={data}
              isMobile={isMobile}
              onUpdate={(field, value) => updateAction(action.id, field, value)}
              onUpdateFull={(updates) => updateActionFull(action.id, updates)}
              onDelete={() => deleteAction(action.id)}
              onClose={() => setSelectedAction(null)}
              onToggleSubtask={(sid) => toggleSubtask(action.id, sid)}
              onAddSubtask={(text) => addSubtask(action.id, text)}
              onDeleteSubtask={(sid) => deleteSubtask(action.id, sid)}
            />
          );
        })()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTION SUB-VIEWS
// ═══════════════════════════════════════════════════════════════

// ─── TODAY VIEW ─────────────────────────────────────────────────
function TodayView({ overdue, dueToday, inProgress, upNext, onSelect, onUpdate, selectedId }) {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div>
      <div style={styles.todayHeader}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '20pt', fontWeight: 700, lineHeight: 1 }}>{dayName}</div>
          <div style={{ fontSize: '9pt', color: C.text2, marginTop: 2 }}>{dateStr}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2 }}>Focus</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '14pt', fontWeight: 700 }}>{overdue.length + dueToday.length} need attention</div>
        </div>
      </div>

      {overdue.length > 0 && (
        <FocusBlock title="Overdue" subtitle="Address immediately" tone="urgent" actions={overdue} onSelect={onSelect} onUpdate={onUpdate} selectedId={selectedId} />
      )}

      {dueToday.length > 0 && (
        <FocusBlock title="Due Today" subtitle="Complete by end of day" tone="primary" actions={dueToday} onSelect={onSelect} onUpdate={onUpdate} selectedId={selectedId} />
      )}

      {inProgress.length > 0 && (
        <FocusBlock title="In Flight" subtitle="Currently in progress" tone="active" actions={inProgress} onSelect={onSelect} onUpdate={onUpdate} selectedId={selectedId} />
      )}

      {upNext.length > 0 && (
        <FocusBlock title="Up Next" subtitle="Coming this week" tone="future" actions={upNext} onSelect={onSelect} onUpdate={onUpdate} selectedId={selectedId} />
      )}

      {overdue.length === 0 && dueToday.length === 0 && inProgress.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', background: '#F2F2F2', border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16pt', fontWeight: 700, marginBottom: 6 }}>You're clear</div>
          <div style={{ fontSize: '9pt', color: C.text2 }}>Nothing overdue or urgent. Use this time for strategic work.</div>
        </div>
      )}
    </div>
  );
}

function FocusBlock({ title, subtitle, tone, actions, onSelect, onUpdate, selectedId }) {
  const toneStyles = {
    urgent: { borderLeft: '4px solid #000', background: C.surface },
    primary: { borderLeft: '4px solid #000', background: '#fff' },
    active: { borderLeft: '4px solid #808080', background: '#fff' },
    future: { borderLeft: '4px solid #D9D9D9', background: '#fff' },
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, ...toneStyles[tone], padding: '8px 12px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
        <div style={{ fontSize: '8pt', color: C.text2, fontStyle: 'italic' }}>{subtitle}</div>
        <div style={{ marginLeft: 'auto', fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, fontWeight: 600 }}>{actions.length}</div>
      </div>
      {actions.map((a) => (
        <ActionRow key={a.id} action={a} onSelect={onSelect} onUpdate={onUpdate} selectedId={selectedId} />
      ))}
    </div>
  );
}

function ActionRow({ action, onSelect, onUpdate, selectedId }) {
  const a = action;
  const isSelected = selectedId === a.id;
  const isDone = a.status === 'Complete';
  const dueText =
    a.daysUntil < 0 ? `${Math.abs(a.daysUntil)}d overdue` :
    a.daysUntil === 0 ? 'Today' :
    a.daysUntil === 1 ? 'Tomorrow' :
    a.daysUntil <= 7 ? `In ${a.daysUntil} days` :
    new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      style={{
        ...styles.actionRow,
        ...(isSelected ? { borderColor: '#000', boxShadow: '0 0 0 1px #000' } : {}),
        ...(isDone ? { opacity: 0.55 } : {}),
      }}
      onClick={() => onSelect(a.id)}
    >
      {/* Checkbox */}
      <div
        style={{ ...styles.actionCheckbox, ...(isDone ? styles.actionCheckboxDone : {}) }}
        onClick={(e) => { e.stopPropagation(); onUpdate(a.id, 'status', isDone ? 'In Progress' : 'Complete'); }}
      >
        {isDone && '✓'}
      </div>

      {/* Title and meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...styles.actionRowTitle, textDecoration: isDone ? 'line-through' : 'none' }}>{a.title}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...styles.actionMeta, fontWeight: 600, color: a.isOverdue ? '#000' : '#404040' }}>
            {dueText}
          </span>
          <span style={styles.actionMeta}>{a.owner}</span>
          {a.category && <span style={styles.actionCategoryTag}>{a.category}</span>}
          {a.subtaskTotal > 0 && (
            <span style={styles.actionMeta}>
              {a.subtaskDone}/{a.subtaskTotal} subtasks
            </span>
          )}
          {a.linkedMetric && (
            <span style={{ ...styles.actionMeta, color: '#000', fontWeight: 600 }}>↔ Linked</span>
          )}
        </div>
        {a.subtaskTotal > 0 && (
          <div style={styles.actionProgressTrack}>
            <div style={{ ...styles.actionProgressFill, width: `${a.progress * 100}%` }} />
          </div>
        )}
      </div>

      {/* Right: priority and impact */}
      <div style={styles.actionPriority}>
        <div style={styles.actionEffortBadge}>{a.effort}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '6pt', textTransform: 'uppercase', color: C.text2, letterSpacing: '0.06em' }}>Score</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '13pt', fontWeight: 700, lineHeight: 1, color: a.priorityScore >= 8 ? '#000' : '#404040' }}>
            {a.priorityScore.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WEEK VIEW (kanban by day) ──────────────────────────────────
function WeekView({ actions, onSelect, selectedId, onUpdate, today }) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [today.getTime()]);

  const overdueAll = actions.filter((a) => a.isOverdue && a.status !== 'Complete');

  const byDay = days.map((d) => {
    const ds = d.toISOString().slice(0, 10);
    return actions.filter((a) => a.dueDate === ds && a.status !== 'Complete');
  });

  return (
    <div>
      {overdueAll.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 12px', border: '1.5px solid #000', background: C.surface }}>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>Overdue ({overdueAll.length}) — handle first</div>
          {overdueAll.slice(0, 3).map((a) => (
            <ActionRow key={a.id} action={a} onSelect={onSelect} onUpdate={onUpdate} selectedId={selectedId} />
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#D9D9D9', border: '1px solid #808080' }}>
        {days.map((d, i) => {
          const isToday = i === 0;
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = d.getDate();
          const items = byDay[i];
          return (
            <div key={i} style={{ background: isToday ? '#F2F2F2' : '#fff', minHeight: 200, padding: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingBottom: 4, borderBottom: isToday ? '2px solid #000' : '1px solid #E8E8E8' }}>
                <div>
                  <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: C.text2, letterSpacing: '0.08em', fontWeight: isToday ? 700 : 500 }}>{dayName}</div>
                  <div style={{ fontFamily: 'Lora, serif', fontSize: '14pt', fontWeight: 700, lineHeight: 1 }}>{dayNum}</div>
                </div>
                {items.length > 0 && (
                  <div style={{ fontSize: '7pt', color: C.text2 }}>{items.length}</div>
                )}
              </div>
              {items.map((a) => (
                <div
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  style={{
                    fontSize: '7.5pt',
                    padding: '5px 7px',
                    background: selectedId === a.id ? '#000' : '#fff',
                    color: selectedId === a.id ? '#fff' : '#000',
                    border: '1px solid ' + (selectedId === a.id ? '#000' : '#D9D9D9'),
                    marginBottom: 4,
                    cursor: 'pointer',
                    lineHeight: 1.3,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
                  <div style={{ fontSize: '6.5pt', opacity: 0.75 }}>{a.owner} · {a.effort}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TIMELINE VIEW (Gantt-style) ────────────────────────────────
function TimelineView({ actions, onSelect, selectedId, today }) {
  // Show 30 days ahead
  const days = 30;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days + 14);

  const totalDays = Math.round((endDate - startDate) / 86400000);
  const todayOffset = Math.round((today - startDate) / 86400000);

  // Filter actions that are visible in window
  const visible = actions.filter((a) => {
    const due = new Date(a.dueDate);
    const start = a.startDate ? new Date(a.startDate) : new Date(due.getTime() - 7 * 86400000);
    return due >= startDate && start <= endDate;
  }).sort((a, b) => new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate));

  const getBarPos = (a) => {
    const start = a.startDate ? new Date(a.startDate) : new Date(new Date(a.dueDate).getTime() - 7 * 86400000);
    const due = new Date(a.dueDate);
    const startOffset = Math.max(0, Math.round((start - startDate) / 86400000));
    const duration = Math.max(1, Math.round((due - start) / 86400000) + 1);
    return { left: (startOffset / totalDays) * 100, width: (duration / totalDays) * 100 };
  };

  // Generate week markers
  const weekMarkers = [];
  for (let i = 0; i <= totalDays; i += 7) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    weekMarkers.push({ offset: (i / totalDays) * 100, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: '7.5pt', color: C.text2 }}>
          Showing {visible.length} actions across the next {days} days
        </div>
      </div>

      {/* Week ruler */}
      <div style={{ position: 'relative', height: 24, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
        {weekMarkers.map((m, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${m.offset}%`,
            top: 0,
            bottom: 0,
            borderLeft: '1px dotted #D9D9D9',
            paddingLeft: 4,
            fontSize: '6.5pt',
            color: C.text2,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>{m.label}</div>
        ))}
        {/* Today line */}
        <div style={{
          position: 'absolute',
          left: `${(todayOffset / totalDays) * 100}%`,
          top: 0,
          bottom: 0,
          borderLeft: '2px solid #000',
        }}>
          <div style={{ position: 'absolute', top: -2, left: 4, fontSize: '6.5pt', fontWeight: 700, color: '#000' }}>NOW</div>
        </div>
      </div>

      {/* Bars */}
      <div style={{ position: 'relative' }}>
        {visible.map((a) => {
          const pos = getBarPos(a);
          const isSelected = selectedId === a.id;
          const isDone = a.status === 'Complete';
          return (
            <div key={a.id} style={{ position: 'relative', height: 32, marginBottom: 4 }}>
              {/* Today line in row */}
              <div style={{
                position: 'absolute',
                left: `${(todayOffset / totalDays) * 100}%`,
                top: 0,
                bottom: 0,
                width: 2,
                background: '#000',
                opacity: 0.15,
              }} />

              {/* Bar */}
              <div
                onClick={() => onSelect(a.id)}
                style={{
                  position: 'absolute',
                  left: `${pos.left}%`,
                  width: `${pos.width}%`,
                  top: 4,
                  height: 24,
                  background: isDone ? '#D9D9D9' : a.isOverdue ? '#000' : a.priorityScore >= 8 ? '#404040' : '#808080',
                  color: '#fff',
                  fontSize: '7.5pt',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #000' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}
                title={a.title}
              >
                <span style={{ fontWeight: 600, flexShrink: 0 }}>{a.title}</span>
                <span style={{ opacity: 0.75, fontSize: '6.5pt' }}>· {a.owner}</span>
                {a.subtaskTotal > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '6.5pt', opacity: 0.75 }}>{a.subtaskDone}/{a.subtaskTotal}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', background: '#F2F2F2', border: `1px solid ${C.border}`, fontSize: '8.5pt', color: C.text2 }}>
          No actions in this window
        </div>
      )}
    </div>
  );
}

// ─── STRATEGIC VIEW (impact × effort matrix) ─────────────────────
function StrategicView({ actions, onSelect, selectedId, onUpdate }) {
  const open = actions.filter((a) => a.status !== 'Complete');

  // Group by impact (high vs low) and effort
  const buckets = {
    quickWins: open.filter((a) => a.impact >= 7 && (a.effort === 'S' || a.effort === 'M')),
    bigBets: open.filter((a) => a.impact >= 7 && a.effort === 'L'),
    fillIns: open.filter((a) => a.impact < 7 && a.effort === 'S'),
    questionable: open.filter((a) => a.impact < 7 && (a.effort === 'M' || a.effort === 'L')),
  };

  const Quadrant = ({ title, subtitle, items, accent, recommendation }) => (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderTop: `3px solid ${accent}`, padding: 14 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: '7.5pt', color: C.text2, fontStyle: 'italic', marginTop: 2 }}>{subtitle}</div>
        <div style={{ fontSize: '7.5pt', color: C.text2, marginTop: 4, padding: '4px 8px', background: '#F2F2F2', borderLeft: '2px solid ' + accent }}>
          {recommendation}
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '8pt', color: C.text2, fontStyle: 'italic', padding: 8 }}>None in this quadrant</div>
      ) : (
        items.slice(0, 5).map((a) => (
          <div key={a.id} onClick={() => onSelect(a.id)} style={{
            padding: '6px 10px',
            background: selectedId === a.id ? '#000' : '#FAFAFA',
            color: selectedId === a.id ? '#fff' : '#000',
            border: '1px solid ' + (selectedId === a.id ? '#000' : '#E8E8E8'),
            marginBottom: 4,
            fontSize: '8pt',
            cursor: 'pointer',
          }}>
            <div style={{ fontWeight: 600 }}>{a.title}</div>
            <div style={{ fontSize: '6.5pt', opacity: 0.75, marginTop: 2 }}>{a.owner} · Impact {a.impact} · Effort {a.effort}</div>
          </div>
        ))
      )}
      {items.length > 5 && <div style={{ fontSize: '7pt', color: C.text2, marginTop: 4 }}>+ {items.length - 5} more</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 14, fontSize: '8.5pt', color: C.text2 }}>
        Prioritize where to spend energy. <strong>Quick wins</strong> first, then plan <strong>big bets</strong>, fit in <strong>fill-ins</strong>, and challenge <strong>questionable</strong> work.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Quadrant
          title="Quick Wins"
          subtitle="High impact · Low effort"
          items={buckets.quickWins}
          accent="#000"
          recommendation="Do these first. Maximum leverage for time invested."
        />
        <Quadrant
          title="Big Bets"
          subtitle="High impact · High effort"
          items={buckets.bigBets}
          accent="#404040"
          recommendation="Plan carefully. Break into smaller subtasks. Get help."
        />
        <Quadrant
          title="Fill-Ins"
          subtitle="Low impact · Low effort"
          items={buckets.fillIns}
          accent="#808080"
          recommendation="Knock out between bigger work. Delegate when possible."
        />
        <Quadrant
          title="Questionable"
          subtitle="Low impact · Higher effort"
          items={buckets.questionable}
          accent="#D9D9D9"
          recommendation="Should you do these at all? Consider dropping or rescoping."
        />
      </div>
    </div>
  );
}

// ─── ALL VIEW (sortable list) ───────────────────────────────────
function AllView({ actions, onSelect, selectedId, onUpdate }) {
  const [sortBy, setSortBy] = useState('priority'); // priority | due | created | impact

  const sorted = useMemo(() => {
    const a = [...actions];
    if (sortBy === 'priority') return a.sort((x, y) => y.priorityScore - x.priorityScore);
    if (sortBy === 'due') return a.sort((x, y) => new Date(x.dueDate) - new Date(y.dueDate));
    if (sortBy === 'impact') return a.sort((x, y) => y.impact - x.impact);
    if (sortBy === 'created') return a.sort((x, y) => new Date(y.created || '2024-01-01') - new Date(x.created || '2024-01-01'));
    return a;
  }, [actions, sortBy]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: '7.5pt' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text2, fontWeight: 600 }}>Sort:</span>
        {['priority', 'due', 'impact', 'created'].map((s) => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            ...styles.filterBtn,
            ...(sortBy === s ? styles.filterBtnActive : {}),
          }}>{s}</button>
        ))}
        <div style={{ marginLeft: 'auto', color: C.text2 }}>{sorted.length} actions</div>
      </div>
      {sorted.map((a) => (
        <ActionRow key={a.id} action={a} onSelect={onSelect} onUpdate={onUpdate} selectedId={selectedId} />
      ))}
    </div>
  );
}

// ─── DETAIL PANEL ───────────────────────────────────────────────
function ActionDetail({ action, data, isMobile, onUpdate, onUpdateFull, onDelete, onClose, onToggleSubtask, onAddSubtask, onDeleteSubtask }) {
  const [newSubtask, setNewSubtask] = useState('');
  const a = action;

  const linkedMetrics = [
    { id: '', name: 'No link' },
    { id: 'm_total_revenue', name: 'Total Revenue' },
    { id: 'm_membership_rev', name: 'Membership Revenue' },
    { id: 'm_event_rev_total', name: 'Event Revenue' },
    { id: 'm_total_costs', name: 'Total Costs' },
    { id: 'm_cash_balance', name: 'Cash Balance' },
    { id: 'd_churn_rate', name: 'Churn Rate' },
    { id: 'd_headcount', name: 'Headcount' },
    { id: 'd_tech_cost', name: 'Tech Cost' },
  ];

  const containerStyle = isMobile
    ? { position: 'fixed', inset: 0, background: '#fff', zIndex: 200, overflowY: 'auto', paddingBottom: 90 }
    : styles.actionDetail;

  return (
    <div style={containerStyle}>
      <div style={styles.actionDetailHeader}>
        <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D9D9D9', marginBottom: 4 }}>Action Detail</div>
        <button onClick={onClose} style={{ ...styles.modalClose, color: '#fff' }}>×</button>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Title */}
        <div style={{ fontFamily: 'Lora, serif', fontSize: '14pt', fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
          <EditableValue type="text" value={a.title} onChange={(v) => onUpdate('title', v)} />
        </div>

        {/* Description */}
        <div style={{ fontSize: '8.5pt', color: C.text2, lineHeight: 1.5, marginBottom: 12, padding: 8, background: '#f5f4ef', border: '1px solid #E8E8E8' }}>
          <EditableValue type="text" value={a.description} onChange={(v) => onUpdate('description', v)} />
        </div>

        {/* Status & quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <select value={a.status} onChange={(e) => onUpdate('status', e.target.value)} style={{ ...styles.select, padding: '6px 10px', fontSize: '8pt', fontWeight: 600 }}>
            <option>Planned</option><option>In Progress</option><option>Complete</option><option>Blocked</option>
          </select>
          <select value={a.category || 'General'} onChange={(e) => onUpdate('category', e.target.value)} style={{ ...styles.select, padding: '6px 10px', fontSize: '8pt' }}>
            <option>General</option><option>Revenue</option><option>Costs</option><option>People</option><option>Strategy</option><option>Operations</option><option>Compliance</option>
          </select>
        </div>

        {/* Properties grid */}
        <div style={styles.detailPropsGrid}>
          <div style={styles.detailProp}>
            <div style={styles.detailPropLabel}>Owner</div>
            <div style={styles.detailPropValue}><EditableValue type="text" value={a.owner} onChange={(v) => onUpdate('owner', v)} /></div>
          </div>
          <div style={styles.detailProp}>
            <div style={styles.detailPropLabel}>Due Date</div>
            <div style={styles.detailPropValue}><EditableValue type="text" value={a.dueDate} onChange={(v) => onUpdate('dueDate', v)} /></div>
          </div>
          <div style={styles.detailProp}>
            <div style={styles.detailPropLabel}>Start Date</div>
            <div style={styles.detailPropValue}><EditableValue type="text" value={a.startDate || a.dueDate} onChange={(v) => onUpdate('startDate', v)} /></div>
          </div>
          <div style={styles.detailProp}>
            <div style={styles.detailPropLabel}>Effort</div>
            <select value={a.effort || 'M'} onChange={(e) => onUpdate('effort', e.target.value)} style={{ ...styles.select, fontSize: '9pt' }}>
              <option value="S">S — Under a day</option>
              <option value="M">M — Few days</option>
              <option value="L">L — Week+</option>
            </select>
          </div>
          <div style={styles.detailProp}>
            <div style={styles.detailPropLabel}>Impact (1-10)</div>
            <div style={styles.detailPropValue}><EditableValue value={a.impact} onChange={(v) => onUpdate('impact', v)} /></div>
          </div>
          <div style={styles.detailProp}>
            <div style={styles.detailPropLabel}>Urgency (1-10)</div>
            <div style={styles.detailPropValue}><EditableValue value={a.urgency || 5} onChange={(v) => onUpdate('urgency', v)} /></div>
          </div>
        </div>

        {/* Linked metric */}
        <div style={{ marginBottom: 14 }}>
          <div style={styles.detailPropLabel}>Linked Metric (xP&A model)</div>
          <select
            value={a.linkedMetric || ''}
            onChange={(e) => onUpdate('linkedMetric', e.target.value || null)}
            style={{ ...styles.select, width: '100%', padding: '6px 10px', fontSize: '8pt', marginTop: 4 }}
          >
            {linkedMetrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {a.linkedMetric && (
            <div style={{ fontSize: '7pt', color: C.text2, marginTop: 4, fontStyle: 'italic' }}>
              This action drives {linkedMetrics.find((m) => m.id === a.linkedMetric)?.name} in your forecast model.
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div style={styles.detailPropLabel}>Subtasks ({a.subtaskDone}/{a.subtaskTotal})</div>
            {a.subtaskTotal > 0 && (
              <div style={{ fontSize: '7pt', color: C.text2 }}>{Math.round(a.progress * 100)}% done</div>
            )}
          </div>
          {a.subtaskTotal > 0 && (
            <div style={styles.actionProgressTrack}>
              <div style={{ ...styles.actionProgressFill, width: `${a.progress * 100}%` }} />
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            {(a.subtasks || []).map((s) => (
              <div key={s.id} style={styles.subtaskRow}>
                <div
                  style={{ ...styles.actionCheckbox, ...(s.done ? styles.actionCheckboxDone : {}), width: 16, height: 16, fontSize: '8pt' }}
                  onClick={() => onToggleSubtask(s.id)}
                >
                  {s.done && '✓'}
                </div>
                <div style={{ flex: 1, fontSize: '8.5pt', textDecoration: s.done ? 'line-through' : 'none', color: s.done ? '#808080' : '#000' }}>
                  {s.text}
                </div>
                <button onClick={() => onDeleteSubtask(s.id)} style={styles.miniBtn}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSubtask.trim()) {
                    onAddSubtask(newSubtask.trim());
                    setNewSubtask('');
                  }
                }}
                placeholder="+ Add subtask"
                style={{ ...styles.formInput, flex: 1, fontSize: '8pt', padding: '5px 8px' }}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <div style={styles.detailPropLabel}>Notes</div>
          <textarea
            value={a.notes || ''}
            onChange={(e) => onUpdate('notes', e.target.value)}
            placeholder="Add context, decisions, references..."
            style={{ width: '100%', minHeight: 60, padding: 8, marginTop: 4, border: `1px solid ${C.border}`, fontSize: '8pt', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        {/* Action footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '6.5pt', color: C.text2 }}>
            Created {a.created || '—'} · ID #{a.id}
          </div>
          <button onClick={onDelete} style={{ ...styles.btnGhost, color: '#000', borderColor: '#000' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DATA MANAGEMENT VIEW
// ══════════════════════════════════════════════════════════════
function MasterChartOfAccountsEditor({ data, save }) {
  const coa = data.chartOfAccounts || { expense: {}, revenue: {}, balanceSheet: { assets: [], liabilities: [], equity: [] } };
  const allMonths = getAllMonthsFromCOA(coa);
  const [viewMonths, setViewMonths] = useState(6); // how many months to show at once
  const [startIdx, setStartIdx] = useState(Math.max(0, allMonths.length - 6));
  const [expandedSection, setExpandedSection] = useState('expense');
  const [expandedHeaders, setExpandedHeaders] = useState({}); // key: true if expanded

  const visibleMonths = allMonths.slice(startIdx, startIdx + viewMonths);

  const toggleHeader = (groupKey, headerKey) => {
    const k = groupKey + ':' + headerKey;
    setExpandedHeaders({ ...expandedHeaders, [k]: !expandedHeaders[k] });
  };

  const updateAccountValue = (groupKey, headerKey, accountId, month, value) => {
    const updated = { ...data };
    const numValue = parseFloat(value) || 0;
    if (groupKey === 'expense' || groupKey === 'revenue') {
      updated.chartOfAccounts = {
        ...updated.chartOfAccounts,
        [groupKey]: {
          ...updated.chartOfAccounts[groupKey],
          [headerKey]: {
            ...updated.chartOfAccounts[groupKey][headerKey],
            accounts: updated.chartOfAccounts[groupKey][headerKey].accounts.map((a) =>
              a.id === accountId ? { ...a, monthlyValues: { ...a.monthlyValues, [month]: numValue } } : a
            ),
          },
        },
      };
    } else {
      // balance sheet
      const section = headerKey; // 'assets' | 'liabilities' | 'equity'
      updated.chartOfAccounts = {
        ...updated.chartOfAccounts,
        balanceSheet: {
          ...updated.chartOfAccounts.balanceSheet,
          [section]: updated.chartOfAccounts.balanceSheet[section].map((a) =>
            a.id === accountId ? { ...a, monthlyValues: { ...a.monthlyValues, [month]: numValue } } : a
          ),
        },
      };
    }
    save(updated);
  };

  const updateAccountField = (groupKey, headerKey, accountId, field, value) => {
    const updated = { ...data };
    if (groupKey === 'expense' || groupKey === 'revenue') {
      updated.chartOfAccounts = {
        ...updated.chartOfAccounts,
        [groupKey]: {
          ...updated.chartOfAccounts[groupKey],
          [headerKey]: {
            ...updated.chartOfAccounts[groupKey][headerKey],
            accounts: updated.chartOfAccounts[groupKey][headerKey].accounts.map((a) =>
              a.id === accountId ? { ...a, [field]: value } : a
            ),
          },
        },
      };
    } else {
      const section = headerKey;
      updated.chartOfAccounts = {
        ...updated.chartOfAccounts,
        balanceSheet: {
          ...updated.chartOfAccounts.balanceSheet,
          [section]: updated.chartOfAccounts.balanceSheet[section].map((a) =>
            a.id === accountId ? { ...a, [field]: value } : a
          ),
        },
      };
    }
    save(updated);
  };

  const addAccount = (groupKey, headerKey) => {
    const updated = { ...data };
    const newId = groupKey + '_' + headerKey + '_' + Date.now();
    const newAccount = {
      id: newId,
      name: 'New Account',
      monthlyValues: {},
      drivers: {},
      notes: '',
      committed: false,
    };
    // Seed with zeros for all visible months
    allMonths.forEach((m) => { newAccount.monthlyValues[m] = 0; });

    if (groupKey === 'expense' || groupKey === 'revenue') {
      updated.chartOfAccounts[groupKey][headerKey].accounts.push(newAccount);
    } else {
      updated.chartOfAccounts.balanceSheet[headerKey].push(newAccount);
    }
    save(updated);
  };

  const deleteAccount = (groupKey, headerKey, accountId) => {
    if (!confirm('Delete this account? All monthly values will be lost.')) return;
    const updated = { ...data };
    if (groupKey === 'expense' || groupKey === 'revenue') {
      updated.chartOfAccounts[groupKey][headerKey].accounts =
        updated.chartOfAccounts[groupKey][headerKey].accounts.filter((a) => a.id !== accountId);
    } else {
      updated.chartOfAccounts.balanceSheet[headerKey] =
        updated.chartOfAccounts.balanceSheet[headerKey].filter((a) => a.id !== accountId);
    }
    save(updated);
  };

  const renderHeaderRow = (groupKey, headerKey, label, accounts) => {
    const k = groupKey + ':' + headerKey;
    const isExpanded = expandedHeaders[k];
    return (
      <React.Fragment key={k}>
        <tr style={{ background: '#F2F2F2', fontWeight: 700, cursor: 'pointer' }} onClick={() => toggleHeader(groupKey, headerKey)}>
          <td style={{ ...styles.td, fontWeight: 700 }} colSpan={2}>
            <span style={{ marginRight: 6, fontFamily: 'Lora, serif' }}>{isExpanded ? '▼' : '▶'}</span>
            {label} <span style={{ fontWeight: 400, color: C.text2, fontSize: '7.5pt' }}>({(accounts || []).length})</span>
          </td>
          {visibleMonths.map((m) => {
            const total = accountsTotalForMonth(accounts, m);
            return <td key={m} style={{ ...styles.tdR, fontWeight: 700, background: '#E8E8E8' }}>{fmt(total, 0)}</td>;
          })}
          <td style={styles.td}></td>
        </tr>
        {isExpanded && (accounts || []).map((a) => (
          <tr key={a.id}>
            <td style={{ ...styles.td, paddingLeft: 28, fontSize: '8.5pt' }}>
              <EditableValue type="text" value={a.name} onChange={(v) => updateAccountField(groupKey, headerKey, a.id, 'name', v)} />
              {a.notes && <div style={{ fontSize: '6.5pt', color: C.text2, fontStyle: 'italic', marginTop: 2 }}>{a.notes}</div>}
            </td>
            <td style={{ ...styles.td, fontSize: '7.5pt', color: C.text2 }}>
              <button
                onClick={() => updateAccountField(groupKey, headerKey, a.id, 'committed', !a.committed)}
                style={a.committed ? styles.committedBadge : styles.plannedBadge}
              >
                {a.committed ? 'COMMITTED' : 'PLANNED'}
              </button>
            </td>
            {visibleMonths.map((m) => (
              <td key={m} style={styles.tdR}>
                <EditableValue
                  value={a.monthlyValues ? (a.monthlyValues[m] || 0) : 0}
                  onChange={(v) => updateAccountValue(groupKey, headerKey, a.id, m, v)}
                  isCurrency
                />
              </td>
            ))}
            <td style={{ ...styles.td, textAlign: 'center' }}>
              <button onClick={() => deleteAccount(groupKey, headerKey, a.id)} style={styles.miniBtn}>×</button>
            </td>
          </tr>
        ))}
        {isExpanded && (
          <tr>
            <td colSpan={3 + visibleMonths.length} style={{ ...styles.td, paddingLeft: 28 }}>
              <button onClick={() => addAccount(groupKey, headerKey)} style={{ ...styles.btnSecondary, fontSize: '7pt' }}>+ Add account under {label}</button>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderTable = (groupKey, title, headersList, monthOfTotal) => {
    return (
      <div style={{ marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <h4 style={{ fontFamily: 'Lora, serif', fontSize: '11pt', margin: 0, fontWeight: 700 }}>{title}</h4>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setStartIdx(Math.max(0, startIdx - 3))} style={{ ...styles.btnSecondary, fontSize: '7pt' }} disabled={startIdx === 0}>◀</button>
            <div style={{ fontSize: '7.5pt', color: C.text2 }}>{visibleMonths[0]} – {visibleMonths[visibleMonths.length - 1]}</div>
            <button onClick={() => setStartIdx(Math.min(allMonths.length - viewMonths, startIdx + 3))} style={{ ...styles.btnSecondary, fontSize: '7pt' }} disabled={startIdx + viewMonths >= allMonths.length}>▶</button>
          </div>
        </div>
        <table style={{ ...styles.table, fontSize: '8pt', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, minWidth: 180, textAlign: 'left' }}>Account</th>
              <th style={{ ...styles.th, minWidth: 95, textAlign: 'left' }}>Status</th>
              {visibleMonths.map((m) => (
                <th key={m} style={{ ...styles.th, textAlign: 'right', minWidth: 85 }}>{monthLabel(m)}</th>
              ))}
              <th style={{ ...styles.th, minWidth: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {headersList}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      {/* TABS for section switch */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: `2px solid ${C.text}` }}>
        {[
          { key: 'expense', label: 'Expenses (6 headers × 5 accounts)' },
          { key: 'revenue', label: 'Revenue (4 headers × 5 accounts)' },
          { key: 'balance', label: 'Balance Sheet' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setExpandedSection(tab.key)}
            style={{
              padding: '8px 14px',
              background: expandedSection === tab.key ? '#000' : '#fff',
              color: expandedSection === tab.key ? '#fff' : '#000',
              border: '1.5px solid #000',
              borderBottom: 'none',
              cursor: 'pointer',
              fontFamily: 'Lora, serif',
              fontSize: '9pt',
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {expandedSection === 'expense' && renderTable('expense', 'Operating Expenses', EXPENSE_HEADERS.map((h) => {
        const header = coa.expense[h.key] || { accounts: [] };
        return renderHeaderRow('expense', h.key, h.label, header.accounts);
      }))}

      {expandedSection === 'revenue' && renderTable('revenue', 'Revenue', REVENUE_HEADERS.map((h) => {
        const header = coa.revenue[h.key] || { accounts: [] };
        return renderHeaderRow('revenue', h.key, h.label, header.accounts);
      }))}

      {expandedSection === 'balance' && renderTable('balance', 'Balance Sheet', [
        renderHeaderRow('balance', 'assets', 'Assets', coa.balanceSheet?.assets || []),
        renderHeaderRow('balance', 'liabilities', 'Liabilities', coa.balanceSheet?.liabilities || []),
        renderHeaderRow('balance', 'equity', 'Equity', coa.balanceSheet?.equity || []),
      ])}
    </div>
  );
}

function DataManagement({ data, save }) {
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const exportData = () => {
    setExportText(JSON.stringify(data, null, 2));
  };

  const importData = () => {
    try {
      const parsed = JSON.parse(importText);
      save(parsed);
      setImportError('');
      setImportText('');
      alert('Data imported successfully!');
    } catch (e) {
      setImportError('Invalid JSON. Please check the format.');
    }
  };

  const updateMonthly = (idx, field, value) => {
    const monthly = [...data.monthly];
    monthly[idx] = { ...monthly[idx], [field]: value };
    save({ ...data, monthly });
  };

  const addMonth = () => {
    const last = data.monthly[data.monthly.length - 1];
    const [y, m] = last.month.split('-');
    const nextDate = new Date(parseInt(y), parseInt(m), 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    save({
      ...data,
      monthly: [...data.monthly, {
        month: newMonth,
        revenue: last.revenue,
        expenses: last.expenses,
        members: last.members,
        newMembers: last.newMembers,
        renewals: last.renewals,
        demoRequests: last.demoRequests,
        qualLeads: last.qualLeads,
        nps: last.nps,
        eventRevenue: last.eventRevenue,
        membershipRevenue: last.membershipRevenue,
        sponsorshipRevenue: last.sponsorshipRevenue,
        otherRevenue: last.otherRevenue,
      }],
    });
  };

  return (
    <div>
      <SectionHeader num="7" title="Data Manager" subtitle="Master chart of accounts · Historical data · Import / Export" />

      <SubsectionHeader num="7A" title="Master Chart of Accounts" />
      <div style={{ fontSize: '8.5pt', color: C.text2, marginBottom: 14, fontStyle: 'italic' }}>
        This is the single source of truth for all P&L and Balance Sheet line items. Edit here and changes flow through to the Forecast tab. Every account has monthly values for history and forecast periods — edit any cell to update.
      </div>
      <MasterChartOfAccountsEditor data={data} save={save} />

      <div style={{ marginTop: 36 }}>
      <SubsectionHeader num="7B" title="Historical Monthly Data" />
      </div>

      <table style={{ ...styles.table, fontSize: '7.5pt' }}>
        <thead>
          <tr>
            <th style={styles.th}>Month</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Expenses</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Members</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>New</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Renew %</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Demos</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Leads</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>NPS</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {data.monthly.map((m, idx) => (
            <tr key={idx}>
              <td style={styles.td}>
                <EditableValue type="text" value={m.month} onChange={(v) => updateMonthly(idx, 'month', v)} />
              </td>
              <td style={styles.tdR}><EditableValue value={m.revenue} onChange={(v) => updateMonthly(idx, 'revenue', v)} isCurrency /></td>
              <td style={styles.tdR}><EditableValue value={m.expenses} onChange={(v) => updateMonthly(idx, 'expenses', v)} isCurrency /></td>
              <td style={styles.tdR}><EditableValue value={m.members} onChange={(v) => updateMonthly(idx, 'members', v)} /></td>
              <td style={styles.tdR}><EditableValue value={m.newMembers} onChange={(v) => updateMonthly(idx, 'newMembers', v)} /></td>
              <td style={styles.tdR}><EditableValue value={m.renewals} onChange={(v) => updateMonthly(idx, 'renewals', v)} /></td>
              <td style={styles.tdR}><EditableValue value={m.demoRequests} onChange={(v) => updateMonthly(idx, 'demoRequests', v)} /></td>
              <td style={styles.tdR}><EditableValue value={m.qualLeads} onChange={(v) => updateMonthly(idx, 'qualLeads', v)} /></td>
              <td style={styles.tdR}><EditableValue value={m.nps} onChange={(v) => updateMonthly(idx, 'nps', v)} /></td>
              <td style={styles.td}>
                <button onClick={() => save({ ...data, monthly: data.monthly.filter((_, i) => i !== idx) })} style={styles.miniBtn}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addMonth} style={{ ...styles.btnSecondary, marginTop: 8 }}>+ Add New Month</button>

      <SubsectionHeader num="7B" title="Import / Export" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: '8pt', fontWeight: 600, marginBottom: 8 }}>Export Current Data</div>
          <button onClick={exportData} style={styles.btnPrimary}>Generate Export</button>
          {exportText && (
            <textarea
              value={exportText}
              readOnly
              style={{ width: '100%', height: 200, marginTop: 8, fontSize: '7pt', fontFamily: 'monospace', padding: 8, border: `1px solid ${C.border}` }}
            />
          )}
        </div>
        <div>
          <div style={{ fontSize: '8pt', fontWeight: 600, marginBottom: 8 }}>Import Data (paste JSON)</div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='Paste exported JSON here...'
            style={{ width: '100%', height: 200, fontSize: '7pt', fontFamily: 'monospace', padding: 8, border: `1px solid ${C.border}` }}
          />
          <button onClick={importData} style={{ ...styles.btnPrimary, marginTop: 8 }} disabled={!importText.trim()}>Import Data</button>
          {importError && <div style={{ color: '#000', fontSize: '8pt', marginTop: 6 }}>⚠ {importError}</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════════════════════════
function RevenueTrendChart({ historical, forecast }) {
  const all = [...historical.map((h) => ({ month: h.month, value: h.revenue, isActual: true })),
                ...forecast.map((f) => ({ month: f.month, value: f.revenue, isActual: false }))];
  const max = Math.max(...all.map((d) => d.value)) * 1.1;
  const W = 800, H = 160, P = { top: 20, right: 20, bottom: 28, left: 50 };
  const cW = W - P.left - P.right;
  const cH = H - P.top - P.bottom;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 16 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {[0.25, 0.5, 0.75, 1].map((p) => {
          const y = P.top + cH * (1 - p);
          return (
            <g key={p}>
              <line x1={P.left} y1={y} x2={P.left + cW} y2={y} stroke="#E8E8E8" strokeWidth="0.8" />
              <text x={P.left - 5} y={y + 3} fontSize="7" fill="#B0B0B0" textAnchor="end">{fmt(max * p)}</text>
            </g>
          );
        })}
        {all.map((d, i) => {
          const x = P.left + (cW / (all.length - 1)) * i;
          const y = P.top + cH * (1 - d.value / max);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3.5" fill={d.isActual ? '#000' : '#fff'} stroke="#000" strokeWidth="1.5" />
              <text x={x} y={H - 8} fontSize="7" textAnchor="middle" fill={d.isActual ? '#000' : '#808080'}>{monthLabel(d.month)}</text>
              <text x={x} y={y - 8} fontSize="6.5" textAnchor="middle" fill="#404040" fontWeight="600">{fmt(d.value)}</text>
            </g>
          );
        })}
        {/* Path */}
        <path
          d={all.map((d, i) => {
            const x = P.left + (cW / (all.length - 1)) * i;
            const y = P.top + cH * (1 - d.value / max);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function CashRunwayChart({ data, actualCount, minThreshold }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.balance)) * 1.15;
  const W = 800, H = 220, P = { top: 30, right: 20, bottom: 36, left: 60 };
  const cW = W - P.left - P.right;
  const cH = H - P.top - P.bottom;

  // Smooth path with bezier
  const buildSmoothPath = (points) => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = curr.x - (next ? (next.x - curr.x) : (curr.x - prev.x)) * 0.5;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  const points = data.map((d, i) => ({
    x: P.left + (cW / (data.length - 1)) * i,
    y: P.top + cH * (1 - d.balance / max),
    balance: d.balance,
    month: d.month,
    isActual: d.isActual,
  }));

  const actualPoints = points.filter((p) => p.isActual);
  const forecastPoints = points.filter((p, i) => !p.isActual || i === actualCount - 1);
  const forecastStartIdx = actualCount - 1;
  const forecastSlice = points.slice(forecastStartIdx);

  const todayX = points[actualCount - 1]?.x;
  const threshY = P.top + cH * (1 - minThreshold / max);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
      <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2, textAlign: 'center', marginBottom: 4 }}>
        Cash Balance Trend & Forecast
      </div>
      <div style={{ fontSize: '8pt', color: C.text2, textAlign: 'center', marginBottom: 12 }}>
        Auto-calculated from your historical data + forecast
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* Forecast region */}
        <rect x={todayX} y={P.top} width={W - P.right - todayX} height={cH} fill="rgba(0,0,0,0.03)" />

        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map((p) => {
          const y = P.top + cH * (1 - p);
          return (
            <g key={p}>
              <line x1={P.left} y1={y} x2={P.left + cW} y2={y} stroke="#E8E8E8" strokeWidth="0.8" />
              <text x={P.left - 5} y={y + 3} fontSize="7" fill="#B0B0B0" textAnchor="end">{fmt(max * p, 1)}</text>
            </g>
          );
        })}

        {/* Min threshold */}
        <line x1={P.left} y1={threshY} x2={P.left + cW} y2={threshY} stroke="#909090" strokeWidth="1" strokeDasharray="4,3" />
        <text x={P.left + 4} y={threshY - 3} fontSize="6.5" fill="#909090">Min Threshold {fmt(minThreshold)}</text>

        {/* Today line */}
        {todayX && (
          <>
            <line x1={todayX} y1={P.top} x2={todayX} y2={P.top + cH} stroke="#000" strokeWidth="1.4" />
            <text x={todayX} y={P.top - 6} fontSize="6.5" fontWeight="700" textAnchor="middle">NOW</text>
          </>
        )}

        {/* Actual line (smooth) */}
        <path d={buildSmoothPath(actualPoints)} fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Forecast line (smooth, dashed) */}
        <path d={buildSmoothPath(forecastSlice)} fill="none" stroke="#808080" strokeWidth="2" strokeDasharray="6,3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.isActual ? 5 : 4} fill="#fff" stroke={p.isActual ? '#000' : '#808080'} strokeWidth={p.isActual ? 2 : 1.5} />
            <circle cx={p.x} cy={p.y} r={p.isActual ? 2.5 : 2} fill={p.isActual ? '#000' : '#808080'} />
            <text x={p.x} y={p.y - 8} fontSize="7" textAnchor="middle" fill={p.isActual ? '#000' : '#707070'} fontWeight={i === actualCount - 1 ? '700' : '400'}>
              {fmt(p.balance, 1)}
            </text>
            <text x={p.x} y={H - 14} fontSize="7" textAnchor="middle" fill={p.isActual ? '#000' : '#808080'} fontWeight={i === actualCount - 1 ? '700' : '400'}>
              {monthLabel(p.month)}
            </text>
          </g>
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: '7.5pt' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 2, background: '#000' }} />
          <span>Actual</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 2, background: 'repeating-linear-gradient(90deg,#808080 0,#808080 4px,transparent 4px,transparent 8px)' }} />
          <span>Forecast</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AI PANEL
// ══════════════════════════════════════════════════════════════
function AiPanel({ messages, input, setInput, loading, onSend, onClose, dataContext }) {
  const messagesEnd = useRef(null);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const suggestions = [
    "What's our biggest concern right now?",
    "Forecast next quarter",
    "Draft a board update",
    "Where can we cut costs?",
  ];

  return (
    <div style={styles.aiPanel}>
      <div style={styles.aiHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.aiIconHeader}>M</div>
          <div>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '11pt', fontWeight: 600 }}>Meridian AI</div>
            <div style={{ fontSize: '7pt', color: '#D9D9D9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Data Context</div>
          </div>
        </div>
        <button onClick={onClose} style={styles.aiClose}>×</button>
      </div>

      <div style={styles.aiMessages}>
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'user' ? styles.aiMsgUser : styles.aiMsgAssistant}>
            <div dangerouslySetInnerHTML={{ __html: formatAi(m.text) }} />
          </div>
        ))}
        {loading && (
          <div style={styles.aiLoadingRow}>
            <Spinner /> <span style={{ marginLeft: 8, fontSize: '8pt', color: C.text2 }}>Thinking...</span>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {messages.length <= 2 && (
        <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid #E8E8E8' }}>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => onSend(s)} style={styles.aiSuggestion}>{s}</div>
          ))}
        </div>
      )}

      <div style={styles.aiInputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend(input)}
          placeholder="Ask about your finances..."
          style={styles.aiInput}
        />
        <button onClick={() => onSend(input)} style={styles.aiSend} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ══════════════════════════════════════════════════════════════
function SectionHeader({ num, title, subtitle }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: '7pt', fontWeight: 700, color: C.text3, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{num}</span>
          <span style={{ fontFamily: 'Lora, serif', fontSize: '14pt', fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{title}</span>
        </div>
        {subtitle && <div style={{ fontSize: '7.5pt', color: C.text2, marginTop: 3 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function SubsectionHeader({ num, title }) {
  return (
    <div style={styles.subsectionHeader}>
      <span style={{ fontSize: '6.5pt', fontWeight: 700, color: C.text3, fontFamily: 'monospace' }}>{num}</span>
      <div style={{ fontFamily: 'Lora, serif', fontSize: '10pt', fontWeight: 600, color: C.text }}>{title}</div>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 12,
      height: 12,
      border: '2px solid #D9D9D9',
      borderTopColor: '#000',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modal, maxWidth: wide ? 900 : 520 }}>
        <div style={styles.modalHeader}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '13pt', fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={styles.modalClose}>×</button>
        </div>
        <div style={{ padding: '20px 24px', maxHeight: '80vh', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const C = {
  bg: '#f0efea', surface: '#ffffff', border: '#e5e3de', borderStrong: '#c8c6c1',
  text: '#1a1a18', text2: '#696760', text3: '#a8a69e',
  sidebar: '#141412',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a',
  red: '#dc2626',   redBg: '#fef2f2',   redBorder: '#fecaca',
};

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    fontSize: '9.5pt',
    color: C.text,
    background: C.bg,
    lineHeight: 1.55,
  },
  loading: {
    padding: 80,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: '14pt',
    color: C.text2,
    textAlign: 'center',
  },

  // ── Sidebar ────────────────────────────────────────────────────
  sidebar: {
    width: 216,
    background: C.sidebar,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflowY: 'auto',
  },
  sidebarLogo: {
    padding: '22px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    marginBottom: 6,
  },
  navGroupLabel: {
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 700,
    padding: '10px 20px 4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 20px',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.55)',
    transition: 'all 0.15s ease',
    fontSize: '9pt',
    fontWeight: 500,
    borderLeft: '2px solid transparent',
    userSelect: 'none',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    borderLeftColor: '#ffffff',
    fontWeight: 600,
  },
  navNum: {
    width: 18,
    fontSize: '7.5pt',
    color: 'rgba(255,255,255,0.22)',
    fontFamily: 'monospace',
    flexShrink: 0,
    textAlign: 'right',
  },
  navLabel: {
    fontSize: '9pt',
    fontWeight: 'inherit',
    flex: 1,
  },
  navDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '8px 16px',
  },
  navReset: {
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.3)',
    padding: '9px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '8.5pt',
    transition: 'color 0.15s ease',
  },
  navAction: {
    padding: '9px 20px',
    color: 'rgba(255,255,255,0.45)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '8.5pt',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: C.sidebar,
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    zIndex: 100,
    boxShadow: '0 -2px 12px rgba(0,0,0,0.2)',
  },
  bottomNavItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 4px 12px',
    color: 'rgba(255,255,255,0.45)',
    cursor: 'pointer',
    minHeight: 56,
    textAlign: 'center',
    borderTop: '2px solid transparent',
    transition: 'all 0.15s ease',
  },
  bottomNavItemActive: {
    color: '#fff',
    borderTopColor: '#fff',
    background: 'rgba(255,255,255,0.08)',
  },
  toast: {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    background: C.text,
    color: '#fff',
    padding: '10px 20px',
    fontSize: '9pt',
    fontWeight: 500,
    borderRadius: '6px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    zIndex: 300,
    animation: 'toastIn 0.25s ease',
    whiteSpace: 'nowrap',
  },

  // ── Main layout ────────────────────────────────────────────────
  main: {
    flex: 1,
    background: C.bg,
    minHeight: '100vh',
    padding: '28px 36px 80px',
    overflow: 'auto',
  },
  header: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '16px 24px',
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  content: { paddingTop: 0 },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingBottom: 12,
    borderBottom: `1px solid ${C.border}`,
  },
  sectionNum: {
    fontFamily: 'Lora, serif',
    fontSize: '11pt',
    fontWeight: 700,
    background: C.text,
    color: '#fff',
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    flexShrink: 0,
  },
  subsectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: `1px solid ${C.border}`,
    paddingBottom: 6,
    marginTop: 28,
    marginBottom: 14,
  },
  subsectionNum: {
    fontSize: '7.5pt',
    fontWeight: 700,
    background: '#ece9e3',
    color: C.text2,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    flexShrink: 0,
  },
  subHeader: {
    fontFamily: 'Lora, serif',
    fontSize: '10.5pt',
    fontWeight: 600,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: `1px solid ${C.border}`,
    color: C.text,
  },

  // ── Status Strip ───────────────────────────────────────────────
  ragStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 18,
  },
  ragItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '10px 14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },

  // ── AI Insight ─────────────────────────────────────────────────
  aiInsight: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 6px 6px 0',
    padding: '14px 18px',
    marginBottom: 18,
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  aiInsightIcon: {
    width: 28,
    height: 28,
    background: C.text,
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Lora, serif',
    fontWeight: 700,
    fontSize: '11pt',
    flexShrink: 0,
  },
  aiInsightLabel: {
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: C.text3,
    fontWeight: 700,
    marginBottom: 5,
  },

  // ── KPI Grid ────────────────────────────────────────────────────
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    padding: '18px 20px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  kpiLabel: {
    fontSize: '7.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: C.text3,
    marginBottom: 6,
    fontWeight: 600,
  },
  kpiValue: {
    fontFamily: 'Lora, serif',
    fontSize: '22pt',
    fontWeight: 700,
    lineHeight: 1.05,
    color: C.text,
  },
  kpiSub: {
    fontSize: '8pt',
    color: C.text2,
    marginTop: 5,
  },
  explainBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'transparent',
    color: C.text3,
    border: `1px solid ${C.border}`,
    borderRadius: '3px',
    padding: '2px 7px',
    fontSize: '6.5pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
  },
  monthSelectorBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    background: C.text,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Lora, serif',
    fontWeight: 600,
    fontSize: '10pt',
    borderRadius: '4px',
  },
  monthDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    background: '#fff',
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    zIndex: 50,
    minWidth: 230,
    boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
    animation: 'slideDown 0.18s ease',
    overflow: 'hidden',
  },
  monthDropdownItem: {
    padding: '9px 16px',
    cursor: 'pointer',
    fontSize: '9pt',
    borderBottom: `1px solid ${C.bg}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthDropdownItemActive: {
    background: C.bg,
    fontWeight: 600,
  },
  digestBox: {
    padding: 16,
    background: '#f5f4ef',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    fontSize: '9pt',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    maxHeight: '60vh',
    overflowY: 'auto',
  },

  // ── Quick Stats ────────────────────────────────────────────────
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
  },
  quickStat: {
    padding: '12px 14px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  qsLabel: {
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    marginBottom: 4,
    fontWeight: 600,
  },
  qsValue: {
    fontFamily: 'Lora, serif',
    fontSize: '15pt',
    fontWeight: 700,
    lineHeight: 1,
    color: C.text,
  },

  // ── Goal Cards ─────────────────────────────────────────────────
  goalCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  goalEditBtn: {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    color: C.text3,
    fontSize: '7pt',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '3px 8px',
    cursor: 'pointer',
    borderRadius: '3px',
  },

  // ── What-If Panel ──────────────────────────────────────────────
  whatIfPanel: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 6px 6px 0',
    padding: '16px 18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  whatIfHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '1px solid #ece9e3',
  },
  whatIfSliderRow: {
    display: 'grid',
    gridTemplateColumns: '150px 1fr 90px',
    alignItems: 'center',
    gap: 14,
    padding: '9px 0',
    borderBottom: '1px solid #ece9e3',
  },
  whatIfLabel: {
    fontSize: '8.5pt',
    fontWeight: 600,
    color: C.text,
  },
  whatIfSlider: {
    width: '100%',
    WebkitAppearance: 'none',
    appearance: 'none',
    height: 4,
    background: '#dddbd6',
    outline: 'none',
    cursor: 'pointer',
    borderRadius: '2px',
  },
  whatIfValue: {
    fontFamily: 'Lora, serif',
    fontSize: '11pt',
    fontWeight: 700,
    textAlign: 'right',
  },
  whatIfDelta: {
    fontSize: '7pt',
    color: C.text2,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'right',
    marginTop: 2,
  },
  whatIfImpactRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 12,
  },
  whatIfImpactCell: {
    background: '#f5f4ef',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    padding: '10px 12px',
  },

  // ── xP&A Forecast Styles ───────────────────────────────────────
  scenarioBar: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: 16,
    alignItems: 'center',
    padding: '12px 16px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    marginBottom: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  scenarioBarLabel: {
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: C.text3,
    fontWeight: 700,
  },
  scenarioPills: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  scenarioPill: {
    padding: '6px 12px',
    background: '#fff',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '8pt',
    fontWeight: 500,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    letterSpacing: '0.02em',
    transition: 'all 0.12s ease',
  },
  scenarioPillActive: {
    background: C.text,
    color: '#fff',
    borderColor: C.text,
    fontWeight: 600,
  },
  scenarioAddBtn: {
    padding: '6px 12px',
    background: 'transparent',
    border: `1px dashed ${C.borderStrong}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '8pt',
    fontFamily: 'inherit',
    color: C.text2,
  },
  scenarioDescription: {
    fontSize: '8pt',
    color: C.text2,
    fontStyle: 'italic',
    textAlign: 'right',
    maxWidth: 280,
  },
  forecastTabs: {
    display: 'flex',
    gap: 2,
    background: '#ece9e3',
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '3px',
    marginBottom: 14,
  },
  forecastTab: {
    flex: 1,
    padding: '8px 12px',
    background: 'transparent',
    color: C.text2,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '8pt',
    fontWeight: 500,
    letterSpacing: '0.03em',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: '4px',
    transition: 'all 0.12s ease',
  },
  forecastTabActive: {
    background: '#fff',
    color: C.text,
    fontWeight: 600,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  tabNum: {
    fontFamily: 'Lora, serif',
    fontWeight: 700,
    opacity: 0.5,
    fontSize: '10pt',
  },
  tabBadge: {
    fontSize: '6.5pt',
    background: 'rgba(0,0,0,0.1)',
    padding: '1px 5px',
    borderRadius: 6,
  },

  tabIntro: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 16,
    alignItems: 'start',
    padding: '14px 18px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 6px 6px 0',
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  tabIntroTitle: {
    fontFamily: 'Lora, serif',
    fontSize: '11pt',
    fontWeight: 700,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tabIntroText: {
    fontSize: '8.5pt',
    color: C.text2,
    lineHeight: 1.5,
    maxWidth: 640,
  },
  filterLabel: {
    fontSize: '7.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    fontWeight: 600,
    marginRight: 4,
  },

  // ── Action Center ──────────────────────────────────────────────
  actionMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
    marginBottom: 14,
  },
  actionMetric: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  actionMetricLabel: {
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    marginBottom: 4,
    fontWeight: 600,
  },
  actionMetricValue: {
    fontFamily: 'Lora, serif',
    fontSize: '20pt',
    fontWeight: 700,
    lineHeight: 1,
    color: C.text,
  },
  quickCapture: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: '10px 14px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 6px 6px 0',
    marginBottom: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  quickCaptureInput: {
    flex: 1,
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '9pt',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#fafaf8',
    color: C.text,
  },
  actionViewTabs: {
    display: 'flex',
    gap: 2,
    background: '#ece9e3',
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '3px',
    marginBottom: 14,
    overflow: 'hidden',
  },
  actionViewTab: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 12px',
    textAlign: 'center',
    fontFamily: 'inherit',
    color: C.text2,
    borderRadius: '4px',
    transition: 'all 0.12s ease',
  },
  actionViewTabActive: {
    background: '#fff',
    color: C.text,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  todayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottom: `1.5px solid ${C.border}`,
  },
  actionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 14px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    marginBottom: 5,
    cursor: 'pointer',
    transition: 'box-shadow 0.12s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  actionCheckbox: {
    width: 20,
    height: 20,
    border: `1.5px solid ${C.borderStrong}`,
    borderRadius: '4px',
    flexShrink: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11pt',
    fontWeight: 700,
    background: '#fff',
    color: C.text,
    marginTop: 2,
  },
  actionCheckboxDone: {
    background: C.text,
    color: '#fff',
    borderColor: C.text,
  },
  actionRowTitle: {
    fontSize: '9.5pt',
    fontWeight: 600,
    lineHeight: 1.3,
    color: C.text,
  },
  actionMeta: {
    fontSize: '7pt',
    color: C.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 500,
  },
  actionCategoryTag: {
    fontSize: '6.5pt',
    padding: '1px 6px',
    background: '#ece9e3',
    border: `1px solid ${C.border}`,
    borderRadius: '3px',
    color: C.text2,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  actionPriority: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  actionEffortBadge: {
    width: 22,
    height: 22,
    border: `1px solid ${C.border}`,
    background: '#f5f4ef',
    color: C.text,
    fontFamily: 'Lora, serif',
    fontSize: '10pt',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
  },
  actionProgressTrack: {
    background: '#ece9e3',
    height: 4,
    borderRadius: '2px',
    marginTop: 6,
    width: '100%',
    overflow: 'hidden',
  },
  actionProgressFill: {
    background: C.text,
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  actionDetail: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    position: 'sticky',
    top: 16,
    maxHeight: 'calc(100vh - 80px)',
    overflowY: 'auto',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  actionDetailHeader: {
    background: C.text,
    color: '#fff',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '8px 8px 0 0',
  },
  detailPropsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14,
  },
  detailProp: {
    background: '#f5f4ef',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    padding: '7px 10px',
  },
  detailPropLabel: {
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    marginBottom: 3,
    fontWeight: 600,
  },
  detailPropValue: {
    fontSize: '9pt',
    fontWeight: 500,
    color: C.text,
  },
  subtaskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 6px',
    borderBottom: `1px solid ${C.bg}`,
  },
  driverGroupHeader: {
    background: '#f5f4ef',
    padding: '6px 12px',
    border: `1px solid ${C.border}`,
    borderBottom: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '9pt',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderRadius: '4px 4px 0 0',
  },
  scrollTable: {
    overflowX: 'auto',
    maxWidth: '100%',
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
  },
  overrideBadge: {
    display: 'inline-block',
    marginTop: 4,
    padding: '2px 6px',
    background: C.text,
    color: '#fff',
    fontSize: '6pt',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
    borderRadius: '3px',
  },
  metricCard: {
    marginBottom: 8,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 6px 6px 0',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  metricTitle: {
    fontSize: '9.5pt',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metricGroupTag: {
    fontSize: '6pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    background: '#ece9e3',
    color: C.text2,
    padding: '1px 6px',
    borderRadius: '3px',
    fontWeight: 600,
  },
  pinBadge: {
    fontSize: '6pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    background: C.text,
    color: '#fff',
    padding: '1px 5px',
    borderRadius: '3px',
    fontWeight: 700,
  },
  metricFormula: {
    fontSize: '8pt',
    fontFamily: 'monospace',
    color: C.text2,
  },
  metricExpand: {
    padding: '12px 14px',
    background: '#f5f4ef',
    borderTop: `1px solid ${C.border}`,
  },
  depChip: {
    display: 'inline-block',
    padding: '1px 6px',
    background: '#ece9e3',
    border: `1px solid ${C.border}`,
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '7pt',
    marginRight: 4,
    marginBottom: 2,
  },
  miniBtnLabel: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '3px',
    padding: '3px 8px',
    fontSize: '6.5pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: C.text,
  },
  scenarioCardV2: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  overrideRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 0',
    borderBottom: '1px dotted #ece9e3',
  },
  formLabel: {
    display: 'block',
    fontSize: '7.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text2,
    fontWeight: 600,
    marginBottom: 4,
  },
  formInput: {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    fontFamily: 'inherit',
    fontSize: '9pt',
    outline: 'none',
    marginTop: 4,
    background: C.surface,
    color: C.text,
  },
  chipBtn: {
    padding: '3px 8px',
    background: '#ece9e3',
    border: `1px solid ${C.border}`,
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '8pt',
    fontWeight: 600,
    color: C.text,
  },
  pickerRow: {
    padding: '5px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    borderBottom: '1px dotted #ece9e3',
    transition: 'background 0.1s',
  },
  digestBox2: {
    padding: 16,
    background: '#f5f4ef',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    fontSize: '9pt',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  // ── Account Drilldown ──────────────────────────────────────────
  accountsDrilldown: {
    background: '#f5f4ef',
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 4px 4px 0',
    padding: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  accountsSummaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 12,
    borderBottom: `1px solid #ece9e3`,
    flexWrap: 'wrap',
  },
  accountsAiBox: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    padding: 10,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    marginTop: 10,
  },
  accountsTable: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  accountsTableHead: {
    display: 'grid',
    gridTemplateColumns: '2fr 80px 110px 110px 120px 100px 30px',
    gap: 10,
    padding: '8px 12px',
    background: '#f0efea',
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    fontWeight: 700,
    borderBottom: `1px solid ${C.border}`,
  },
  accountRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 80px 110px 110px 120px 100px 30px',
    gap: 10,
    padding: '10px 12px',
    borderBottom: `1px solid ${C.bg}`,
    alignItems: 'center',
    fontSize: '8.5pt',
  },
  committedBadge: {
    background: C.text,
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 8px',
    fontSize: '6pt',
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
  },
  plannedBadge: {
    background: C.surface,
    color: C.text2,
    border: `1px solid ${C.borderStrong}`,
    borderRadius: '3px',
    padding: '3px 8px',
    fontSize: '6pt',
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
  },
  bucketExpandBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: C.text2,
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
    padding: '2px 6px',
  },

  // ── Tables ──────────────────────────────────────────────────────
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '9pt',
    marginBottom: 4,
    background: C.surface,
    border: `1px solid ${C.border}`,
  },
  th: {
    background: C.text,
    color: '#fff',
    padding: '8px 12px',
    fontSize: '7.5pt',
    fontWeight: 600,
    textAlign: 'left',
    letterSpacing: '0.03em',
  },
  td: {
    padding: '7px 12px',
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.text,
  },
  tdBold: {
    padding: '7px 12px',
    border: `1px solid ${C.border}`,
    fontWeight: 600,
    color: C.text,
  },
  tdR: {
    padding: '7px 12px',
    border: `1px solid ${C.border}`,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    background: C.surface,
    color: C.text,
  },
  tdDim: {
    padding: '7px 12px',
    border: `1px solid ${C.border}`,
    color: C.text2,
    fontSize: '8.5pt',
  },
  subRow: { background: '#f0efea' },
  totRow: { background: '#ece9e3', fontWeight: 700 },

  // ── P&L Revenue Cards ──────────────────────────────────────────
  revGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 18,
  },
  revCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '16px 18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  revCardTitle: {
    fontSize: '7.5pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text,
    marginBottom: 10,
    paddingBottom: 7,
    borderBottom: `1px solid ${C.border}`,
  },
  revMetric: { marginBottom: 10 },
  revLabel: {
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: C.text3,
    marginBottom: 2,
  },
  revValue: {
    fontFamily: 'Lora, serif',
    fontSize: '14pt',
    fontWeight: 700,
    lineHeight: 1,
    color: C.text,
  },
  revDetail: { fontSize: '7.5pt', color: C.text2, marginTop: 2 },
  costSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
  },
  csCell: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '12px 14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  csCellHighlight: {
    background: C.text,
    color: '#fff',
    border: `1px solid ${C.text}`,
    borderRadius: '6px',
    padding: '12px 14px',
  },
  csLabel: {
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    marginBottom: 4,
  },
  csValue: {
    fontFamily: 'Lora, serif',
    fontSize: '15pt',
    fontWeight: 700,
    lineHeight: 1,
  },
  csDetail: { fontSize: '7pt', color: C.text2, marginTop: 3, fontStyle: 'italic' },
  costBar: {
    marginBottom: 10,
    padding: '12px 14px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 6px 6px 0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  costBarOver: { borderLeftColor: C.red },
  costBarHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 7,
  },
  costBarLabel: {
    fontSize: '9pt',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: C.text,
  },
  statusTag: {
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '2px 7px',
    borderRadius: '3px',
    fontWeight: 700,
  },
  statusUnder: {
    background: C.greenBg,
    color: C.green,
    border: `1px solid ${C.greenBorder}`,
  },
  statusOver: {
    background: C.redBg,
    color: C.red,
    border: `1px solid ${C.redBorder}`,
  },
  statusOnTrack: {
    background: '#ece9e3',
    color: C.text2,
    border: `1px solid ${C.border}`,
  },
  costBarSpend: { fontSize: '8pt', color: C.text2 },
  costBarVariance: {
    fontFamily: 'Lora, serif',
    fontSize: '11pt',
    fontWeight: 700,
    color: C.text,
  },
  costBarTrack: {
    background: '#ece9e3',
    height: 8,
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  costBarFill: {
    background: C.text,
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.6s ease',
  },
  costBarMark: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    background: C.text2,
    borderRadius: '1px',
  },
  costBarDriver: {
    fontSize: '8pt',
    color: C.text2,
    lineHeight: 1.5,
    paddingTop: 6,
    borderTop: '1px solid #ece9e3',
  },

  // ── Balance Sheet Grid ─────────────────────────────────────────
  miniGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginBottom: 16,
  },
  miniMetric: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '12px 14px',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  mmLabel: {
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    marginBottom: 4,
  },
  mmValue: {
    fontFamily: 'Lora, serif',
    fontSize: '15pt',
    fontWeight: 700,
    lineHeight: 1,
    color: C.text,
  },
  leadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginBottom: 16,
  },
  leadCell: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '14px 16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  llStyle: {
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: C.text3,
    marginBottom: 4,
  },
  lvStyle: {
    fontFamily: 'Lora, serif',
    fontSize: '17pt',
    fontWeight: 700,
    lineHeight: 1.05,
    color: C.text,
  },

  // ── Risk & Scenarios ───────────────────────────────────────────
  scenarioGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  scenarioCard: {
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '16px',
    background: C.surface,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  scenarioBase: { background: '#f5f4ef', borderColor: C.borderStrong },
  scenarioHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid #ece9e3',
  },
  scenarioIcon: { width: 16, height: 16, borderRadius: '50%', flexShrink: 0 },
  scenarioTitle: {
    fontSize: '8.5pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    flex: 1,
    color: C.text,
  },
  scenarioInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
  scenarioInput: {
    background: '#f5f4ef',
    borderRadius: '4px',
    padding: '7px 9px',
    border: `1px solid ${C.border}`,
  },
  scLabel: {
    display: 'block',
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: C.text3,
    marginBottom: 2,
  },
  heatmap: {
    display: 'grid',
    gridTemplateColumns: '60px repeat(3, 1fr)',
    gridTemplateRows: 'repeat(4, 50px)',
    gap: 2,
    background: C.border,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: 16,
  },
  hmLabel: {
    background: '#f0efea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '7pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
    fontWeight: 600,
  },
  hmCell: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 4 },

  // ── Action items (risk view) ───────────────────────────────────
  actionItem: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.text}`,
    borderRadius: '0 6px 6px 0',
    padding: '10px 14px',
    marginBottom: 8,
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  aiNumStyle: {
    fontSize: '8.5pt',
    fontWeight: 700,
    background: C.text,
    color: '#fff',
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    flexShrink: 0,
  },
  aiTitle: { fontSize: '9pt', fontWeight: 600, marginBottom: 4, color: C.text },
  aiDesc: { fontSize: '8.5pt', color: C.text2, lineHeight: 1.5 },
  aiTag: { fontSize: '7pt' },
  aiPriorityLabel: {
    fontSize: '6.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.text3,
  },
  aiPriorityScore: {
    fontFamily: 'Lora, serif',
    fontSize: '14pt',
    fontWeight: 700,
    color: C.text,
  },
  filterBtn: {
    fontSize: '7.5pt',
    padding: '5px 10px',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    background: C.surface,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
    color: C.text2,
    transition: 'all 0.12s ease',
  },
  filterBtnActive: { background: C.text, color: '#fff', borderColor: C.text },
  select: {
    fontFamily: 'inherit',
    fontSize: '9pt',
    padding: '5px 8px',
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    background: C.surface,
    cursor: 'pointer',
    outline: 'none',
    color: C.text,
  },
  miniBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: C.text3,
    fontSize: '14pt',
    padding: '0 4px',
    lineHeight: 1,
  },

  // ── Buttons ────────────────────────────────────────────────────
  btnPrimary: {
    background: C.text,
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '8.5pt',
    fontWeight: 600,
    borderRadius: '4px',
    letterSpacing: '0.02em',
    transition: 'opacity 0.15s ease',
  },
  btnSecondary: {
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.borderStrong}`,
    padding: '7px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '8.5pt',
    fontWeight: 500,
    borderRadius: '4px',
    transition: 'all 0.12s ease',
  },
  btnDanger: {
    background: C.red,
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '8.5pt',
    fontWeight: 600,
    borderRadius: '4px',
  },
  btnGhost: {
    background: 'transparent',
    color: C.text2,
    border: `1px solid ${C.border}`,
    padding: '5px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '8pt',
    borderRadius: '4px',
    transition: 'all 0.12s ease',
  },
  aiFab: {
    position: 'fixed',
    right: 24,
    bottom: 24,
    width: 52,
    height: 52,
    background: C.text,
    color: '#fff',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    zIndex: 90,
    transition: 'transform 0.15s ease',
  },

  // ── AI Panel ───────────────────────────────────────────────────
  aiPanel: {
    position: 'fixed',
    right: 24,
    bottom: 24,
    width: 400,
    height: 580,
    maxHeight: 'calc(100vh - 48px)',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideDown 0.2s ease',
  },
  aiHeader: {
    background: C.text,
    color: '#fff',
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '12px 12px 0 0',
  },
  aiIconHeader: {
    width: 30,
    height: 30,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Lora, serif',
    fontWeight: 700,
    fontSize: '13pt',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  aiClose: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '20pt',
    lineHeight: 1,
    padding: '0 4px',
  },
  aiMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: '#fafaf8',
  },
  aiMsgUser: {
    alignSelf: 'flex-end',
    background: C.text,
    color: '#fff',
    padding: '9px 14px',
    borderRadius: '12px 12px 2px 12px',
    fontSize: '9pt',
    maxWidth: '85%',
    lineHeight: 1.5,
  },
  aiMsgAssistant: {
    alignSelf: 'flex-start',
    background: C.surface,
    border: `1px solid ${C.border}`,
    padding: '10px 14px',
    borderRadius: '2px 12px 12px 12px',
    fontSize: '9pt',
    maxWidth: '90%',
    lineHeight: 1.55,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  aiLoadingRow: { display: 'flex', alignItems: 'center', padding: '6px 0' },
  aiSuggestion: {
    display: 'inline-block',
    padding: '5px 10px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    fontSize: '8pt',
    cursor: 'pointer',
    color: C.text2,
    transition: 'all 0.12s ease',
  },
  aiInputRow: {
    padding: '12px 14px',
    background: C.surface,
    borderTop: `1px solid ${C.border}`,
    display: 'flex',
    gap: 8,
  },
  aiInput: {
    flex: 1,
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    padding: '8px 12px',
    fontFamily: 'inherit',
    fontSize: '9pt',
    outline: 'none',
    background: '#fafaf8',
    color: C.text,
  },
  aiSend: {
    background: C.text,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 14px',
    fontFamily: 'inherit',
    fontSize: '8.5pt',
    fontWeight: 600,
    borderRadius: '4px',
  },

  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    animation: 'fadeIn 0.18s ease',
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: C.surface,
    width: '100%',
    maxWidth: 520,
    borderRadius: '10px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
    animation: 'slideDown 0.2s ease',
    overflow: 'hidden',
  },
  modalHeader: {
    background: C.text,
    color: '#fff',
    padding: '15px 22px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '20pt',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
  },
};

// Keyframes and base styles are now handled in index.css
