# Meridian Finance Cockpit v8

Driver-based financial planning and forecasting for membership organizations.

## What's new in v8

- **Master Chart of Accounts** — unified data structure with 6 expense headers (30 accounts), 4 revenue headers (20 accounts), and balance sheet lines
- **P&L Forecast Tab** — expandable P&L with driver-based planning (headcount × salary, count × ARPU, etc.)
- **Driver Planning** — set operational drivers and "Apply to future months" to bulk-update forecasts
- **Data Tab COA Editor** — tabbed interface to manage all accounts, monthly values, and committed/planned status

## Getting started

### Option 1: Run locally (recommended for Claude Code)

```bash
npm install
npm run dev
```

Opens http://localhost:5173 in your browser. The app is ready to use immediately.

### Option 2: Open in Claude Code

```bash
npm run claude
```

This opens Claude Code in your terminal, giving you full editing access to the app while you work on it with Claude.

## Project structure

```
src/
├── main.jsx              # React entry point
├── FinanceCockpit.jsx    # Main app (8,000+ lines, all components in one file)
└── index.css             # Base styles
```

## Key features

### Data Tab (Section 7A) — Master Chart of Accounts
- **Three tabs**: Expenses (6 headers × 5 accounts), Revenue (4 headers × 5 accounts), Balance Sheet (15 lines)
- **Inline editing**: Click any monthly cell to edit
- **Month navigation**: ◀ ▶ to scroll through 12 months
- **Account management**: Add, delete, toggle COMMITTED/PLANNED

### Forecast Tab → P&L Forecast (new default)
- **Revenue section**: 4 streams (Membership, Events, Sponsorship, Other)
- **Operating Expenses**: 6 categories (Employee, Technology, Premises, Professional Services, Marketing, Other)
- **Expandable accounts**: Click ▶ on header, then ▸ on account to open driver editor
- **Driver formulas**:
  - Employee: headcount × avgSalary
  - Membership: count × ARPU
  - Sponsorship: count × fee
  - Events: attendees × avgTicket
- **Bulk apply**: Set drivers, click "Apply to future months →" to recalculate forward periods
- **Net Income**: Calculated automatically at the bottom

## How to use

### Plan a headcount change
1. Go to Forecast tab (default)
2. Click ▶ on "Employee Costs"
3. Click ▸ on "Salaries & Wages"
4. Set Headcount: 25, Avg Monthly Salary: 9500
5. Click "Apply to future months →"
6. All future months recalculate to 25 × $9,500 = $237,500

### Edit the master COA
1. Go to Data tab → Master Chart of Accounts
2. Click ▶ on "Employee Costs" to expand
3. Edit any monthly cell (e.g., change November from $198k to $205k)
4. Add a new account: "Signing Bonuses" with $15k in December
5. Toggle accounts between COMMITTED and PLANNED
6. Changes flow through to Forecast tab immediately

### View variance
1. P&L tab (section 2) shows actual vs budget with color indicators
2. CostBar components show red/amber/green based on % over/under budget
3. Click ▶ on any bar to see the accounts behind it (now powered by chartOfAccounts)

## Next steps (v9 roadmap)

- [ ] Balance Sheet Forecast view (assets = liabilities + equity check)
- [ ] Variance columns in P&L Forecast (vs prior month, vs budget)
- [ ] Account-level notes with effective dates
- [ ] Bulk operations (select multiple, apply % change)
- [ ] "Copy month forward N times" for rapid forecasting
- [ ] **Unify xP&A drivers with COA**: auto-sync global headcount driver from Employee total, derive churn from membership count changes

## Development

### Edit in Claude Code
```bash
npm run claude
```

Claude Code gives you a terminal-based editor where you can:
- View and edit FinanceCockpit.jsx directly
- Run bash commands to check syntax
- See real-time feedback

### Build for production
```bash
npm run build
```

Outputs to `dist/` folder.

## File sizes

- `FinanceCockpit.jsx`: 366 KB (8,040 lines) — single-file React app
- All state and styling inline for portability
- Uses window.storage API for persistence (in Claude.ai)

## Notes

- The app uses `window.storage` for persistence (Claude.ai only). In local development, you may want to add localStorage or a backend.
- All 20 expense/revenue accounts are pre-populated with 12 months of data (Jul 2024 – Jun 2025)
- Driver formulas can be extended per account type — see `PnlForecastTab.applyDriversToFuture()` for examples
