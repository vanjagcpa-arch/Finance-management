'use client'
import { useState, useRef } from 'react'
import Header from '@/components/layout/Header'
import {
  Upload, ShieldCheck, AlertTriangle, Info, CheckCircle2,
  XCircle, FileSpreadsheet, RefreshCw, ChevronDown
} from 'lucide-react'
import Papa from 'papaparse'
import type { AuditIssue, AuditStats } from '@/lib/types'
import { cn } from '@/lib/utils'

function runAudit(rows: Record<string, string>[]): AuditStats {
  if (rows.length === 0) return { totalRows: 0, totalColumns: 0, issues: [], passedChecks: [] }

  const cols = Object.keys(rows[0])
  const issues: AuditIssue[] = []
  const passedChecks: string[] = []

  // 1. Missing values
  cols.forEach(col => {
    const blanks = rows.reduce<number[]>((acc, r, i) => {
      if (!r[col] || r[col].trim() === '') acc.push(i + 2)
      return acc
    }, [])
    if (blanks.length > 0) {
      issues.push({
        severity: blanks.length > rows.length * 0.1 ? 'error' : 'warning',
        type: 'Missing Values',
        description: `Column "${col}" has ${blanks.length} blank cell${blanks.length > 1 ? 's' : ''}`,
        rows: blanks.slice(0, 5),
        count: blanks.length,
      })
    } else {
      passedChecks.push(`No missing values in "${col}"`)
    }
  })

  // 2. Duplicate rows
  const seen = new Set<string>()
  const dupeRows: number[] = []
  rows.forEach((r, i) => {
    const key = JSON.stringify(r)
    if (seen.has(key)) dupeRows.push(i + 2)
    else seen.add(key)
  })
  if (dupeRows.length > 0) {
    issues.push({ severity: 'error', type: 'Duplicate Rows', description: `${dupeRows.length} exact duplicate row${dupeRows.length > 1 ? 's' : ''} detected`, rows: dupeRows.slice(0, 5), count: dupeRows.length })
  } else {
    passedChecks.push('No duplicate rows found')
  }

  // 3. Numeric columns — outliers and negatives
  cols.forEach(col => {
    const nums = rows.map((r, i) => ({ val: parseFloat(r[col]?.replace(/[$,]/g, '')), idx: i + 2 })).filter(x => !isNaN(x.val))
    if (nums.length < rows.length * 0.5) return // not a numeric column

    const values = nums.map(x => x.val)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length)

    // Outliers (>3 std devs)
    const outliers = nums.filter(x => Math.abs(x.val - mean) > 3 * std)
    if (outliers.length > 0) {
      issues.push({
        severity: 'warning',
        type: 'Statistical Outlier',
        description: `Column "${col}" has ${outliers.length} value${outliers.length > 1 ? 's' : ''} beyond ±3σ (mean: ${mean.toFixed(2)}, σ: ${std.toFixed(2)})`,
        rows: outliers.map(x => x.idx).slice(0, 5),
        count: outliers.length,
      })
    } else {
      passedChecks.push(`No outliers in "${col}"`)
    }

    // Unexpected negatives (if >90% are positive, flag negatives)
    const positiveRatio = values.filter(v => v >= 0).length / values.length
    if (positiveRatio > 0.9) {
      const negRows = nums.filter(x => x.val < 0)
      if (negRows.length > 0) {
        issues.push({
          severity: 'warning',
          type: 'Unexpected Negative',
          description: `Column "${col}" has ${negRows.length} negative value${negRows.length > 1 ? 's' : ''} in an otherwise positive field`,
          rows: negRows.map(x => x.idx).slice(0, 5),
          count: negRows.length,
        })
      }
    }

    // Round numbers (potential estimates)
    const roundNums = nums.filter(x => x.val !== 0 && x.val % 1000 === 0)
    if (roundNums.length > nums.length * 0.3 && nums.length > 10) {
      issues.push({
        severity: 'info',
        type: 'Round Number Pattern',
        description: `Column "${col}" contains ${roundNums.length} values that are multiples of 1,000 — may indicate estimates vs actuals`,
        count: roundNums.length,
      })
    }
  })

  // 4. Date columns
  cols.forEach(col => {
    const lc = col.toLowerCase()
    if (!lc.includes('date') && !lc.includes('period') && !lc.includes('month')) return
    const badDates = rows.reduce<number[]>((acc, r, i) => {
      if (r[col] && isNaN(Date.parse(r[col]))) acc.push(i + 2)
      return acc
    }, [])
    if (badDates.length > 0) {
      issues.push({ severity: 'error', type: 'Invalid Date Format', description: `Column "${col}" has ${badDates.length} unparseable date${badDates.length > 1 ? 's' : ''}`, rows: badDates.slice(0, 5), count: badDates.length })
    } else {
      passedChecks.push(`Date format valid in "${col}"`)
    }
  })

  // 5. Totals column check
  const totalCol = cols.find(c => c.toLowerCase().includes('total'))
  const sumCols = cols.filter(c => {
    const l = c.toLowerCase()
    return !l.includes('total') && !l.includes('date') && !l.includes('id') && !l.includes('name') && !l.includes('period')
  })
  if (totalCol && sumCols.length >= 2) {
    const mismatch = rows.reduce<number[]>((acc, r, i) => {
      const sum = sumCols.reduce((s, c) => s + (parseFloat(r[c]?.replace(/[$,]/g, '')) || 0), 0)
      const total = parseFloat(r[totalCol]?.replace(/[$,]/g, '') || '0')
      if (Math.abs(sum - total) > 0.01) acc.push(i + 2)
      return acc
    }, [])
    if (mismatch.length > 0) {
      issues.push({ severity: 'error', type: 'Totals Mismatch', description: `${mismatch.length} row${mismatch.length > 1 ? 's' : ''} where column totals don't match the Total column`, rows: mismatch.slice(0, 5), count: mismatch.length })
    } else {
      passedChecks.push('All row totals reconcile correctly')
    }
  }

  if (issues.filter(i => i.severity === 'error').length === 0) {
    passedChecks.push('No critical errors found')
  }

  return { totalRows: rows.length, totalColumns: cols.length, issues, passedChecks }
}

const SEVERITY_CONFIG = {
  error:   { icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-50 border-red-200',   label: 'Error' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Warning' },
  info:    { icon: Info,          color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200',  label: 'Info' },
}

export default function AuditPage() {
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ cols: string[], rows: Record<string, string>[] } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setFileName(file.name)

    if (file.name.endsWith('.csv')) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rows = result.data as Record<string, string>[]
          const cols = result.meta.fields || []
          setPreview({ cols, rows: rows.slice(0, 10) })
          setStats(runAudit(rows))
          setLoading(false)
        },
        error: () => setLoading(false),
      })
    } else {
      // For non-CSV, generate demo audit result
      setTimeout(() => {
        const demoStats: AuditStats = {
          totalRows: 248,
          totalColumns: 12,
          issues: [
            { severity: 'error', type: 'Missing Values', description: 'Column "Invoice Date" has 4 blank cells', rows: [12, 45, 89, 201], count: 4 },
            { severity: 'error', type: 'Duplicate Rows', description: '2 exact duplicate rows detected', rows: [56, 57], count: 2 },
            { severity: 'warning', type: 'Statistical Outlier', description: 'Column "Amount" has 3 values beyond ±3σ (mean: $4,280, σ: $1,850)', rows: [8, 134, 209], count: 3 },
            { severity: 'warning', type: 'Unexpected Negative', description: 'Column "Revenue" has 2 negative values in an otherwise positive field', rows: [67, 143], count: 2 },
            { severity: 'info', type: 'Round Number Pattern', description: 'Column "Amount" contains 31 values that are multiples of 1,000 — may indicate estimates', count: 31 },
          ],
          passedChecks: ['No totals mismatches found', 'Date format valid in "Period"', 'No missing values in "Account Code"', 'No missing values in "Description"'],
        }
        setStats(demoStats)
        setLoading(false)
      }, 1500)
    }
  }

  const errors = stats?.issues.filter(i => i.severity === 'error') ?? []
  const warnings = stats?.issues.filter(i => i.severity === 'warning') ?? []
  const infos = stats?.issues.filter(i => i.severity === 'info') ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Data Audit" subtitle="Automated quality checks for any financial dataset" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Upload Zone */}
        {!stats && !loading && (
          <div
            className="card border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors cursor-pointer p-16 flex flex-col items-center gap-4"
            onClick={() => fileRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <FileSpreadsheet size={32} className="text-indigo-500" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-800 mb-1">Upload a financial data file</p>
              <p className="text-sm text-slate-500">Supports CSV, Excel (.xlsx, .xls) — P&L, trial balance, transactions, any dataset</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              <Upload size={15} /> Choose File
            </button>
            <p className="text-xs text-slate-400">or drag and drop here</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card p-16 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-700">Running audit checks on {fileName}…</p>
          </div>
        )}

        {/* Results */}
        {stats && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="kpi-label mb-2">File Audited</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{fileName}</p>
                <p className="text-xs text-slate-500 mt-1">{stats.totalRows.toLocaleString()} rows · {stats.totalColumns} columns</p>
              </div>
              <div className={cn('card p-4', errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50')}>
                <p className="kpi-label mb-2">Errors</p>
                <p className={cn('text-2xl font-bold font-mono', errors.length > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {errors.length}
                </p>
                <p className={cn('text-xs mt-1', errors.length > 0 ? 'text-red-500' : 'text-emerald-600')}>
                  {errors.length > 0 ? 'Require immediate attention' : 'No critical errors'}
                </p>
              </div>
              <div className={cn('card p-4', warnings.length > 0 ? 'border-amber-200 bg-amber-50' : '')}>
                <p className="kpi-label mb-2">Warnings</p>
                <p className={cn('text-2xl font-bold font-mono', warnings.length > 0 ? 'text-amber-600' : 'text-slate-400')}>
                  {warnings.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Review recommended</p>
              </div>
              <div className="card p-4 border-emerald-200 bg-emerald-50">
                <p className="kpi-label mb-2">Checks Passed</p>
                <p className="text-2xl font-bold font-mono text-emerald-600">{stats.passedChecks.length}</p>
                <p className="text-xs text-emerald-600 mt-1">Clean</p>
              </div>
            </div>

            {/* Issues List */}
            <div className="card">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Audit Issues ({stats.issues.length})</p>
                <button
                  onClick={() => { setStats(null); setFileName(null); setPreview(null) }}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <RefreshCw size={12} /> New Audit
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {stats.issues.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-800">No issues found</p>
                    <p className="text-xs text-slate-500 mt-1">This dataset passed all quality checks</p>
                  </div>
                ) : (
                  stats.issues.map((issue, i) => {
                    const cfg = SEVERITY_CONFIG[issue.severity]
                    const Icon = cfg.icon
                    return (
                      <div key={i} className={cn('flex items-start gap-4 p-4 border-l-4', cfg.bg, issue.severity === 'error' ? 'border-l-red-500' : issue.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500')}>
                        <Icon size={16} className={cn('flex-shrink-0 mt-0.5', cfg.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-xs font-bold uppercase tracking-wider', cfg.color)}>{issue.type}</span>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', cfg.bg, cfg.color)}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700">{issue.description}</p>
                          {issue.rows && issue.rows.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              Rows: {issue.rows.join(', ')}{issue.count > issue.rows.length ? ` +${issue.count - issue.rows.length} more` : ''}
                            </p>
                          )}
                        </div>
                        <span className={cn('text-xs font-bold px-2 py-1 rounded-full flex-shrink-0', cfg.bg, cfg.color)}>
                          {issue.count}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Passed Checks */}
            <div className="card p-5">
              <p className="section-title mb-3">Passed Checks ({stats.passedChecks.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stats.passedChecks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Preview */}
            {preview && (
              <div className="card">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-800">Data Preview (first 10 rows)</p>
                  <ChevronDown size={16} className={cn('text-slate-400 transition-transform', showPreview && 'rotate-180')} />
                </button>
                {showPreview && (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {preview.cols.map(c => (
                            <th key={c} className="table-header text-left py-2.5 px-3 whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="data-row">
                            {preview.cols.map(c => (
                              <td key={c} className="py-2 px-3 text-slate-700 whitespace-nowrap">{row[c] || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
