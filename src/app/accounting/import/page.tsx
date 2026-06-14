'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import {
  Upload, CheckCircle, XCircle, AlertTriangle, Clock, FileText,
  ChevronRight, Download, RefreshCw, Eye, Trash2, Plus,
  Database, FileSpreadsheet, Link2, Cloud
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SOURCES = [
  { id: 'csv', label: 'CSV File', icon: FileText, desc: 'Generic comma-separated values', color: 'text-slate-500' },
  { id: 'excel', label: 'Excel File', icon: FileSpreadsheet, desc: '.xlsx / .xls workbooks', color: 'text-emerald-600' },
  { id: 'xero', label: 'Xero', icon: Cloud, desc: 'Connect via API or export', color: 'text-indigo-500' },
  { id: 'myob', label: 'MYOB', icon: Database, desc: 'AccountRight / Essentials', color: 'text-amber-600' },
  { id: 'manual', label: 'Manual Entry', icon: Plus, desc: 'Enter journal lines directly', color: 'text-slate-500' },
]

const IMPORT_HISTORY = [
  { id: 'IMP-006', filename: 'Xero_GL_Export_May2024.csv', source: 'xero', importedAt: '2024-05-31 18:42', rowCount: 1847, validRows: 1844, errorRows: 0, warningRows: 3, status: 'completed', period: 'May 2024' },
  { id: 'IMP-005', filename: 'Payroll_May2024.csv', source: 'csv', importedAt: '2024-05-31 16:15', rowCount: 312, validRows: 312, errorRows: 0, warningRows: 0, status: 'completed', period: 'May 2024' },
  { id: 'IMP-004', filename: 'Bank_Statement_ANZ_May2024.csv', source: 'csv', importedAt: '2024-05-30 09:33', rowCount: 203, validRows: 198, errorRows: 2, warningRows: 3, status: 'completed', period: 'May 2024' },
  { id: 'IMP-003', filename: 'Manual_Journals_May2024.xlsx', source: 'excel', importedAt: '2024-05-28 14:20', rowCount: 48, validRows: 46, errorRows: 1, warningRows: 1, status: 'completed', period: 'May 2024' },
  { id: 'IMP-002', filename: 'MYOB_Export_Apr2024.txt', source: 'myob', importedAt: '2024-04-30 19:01', rowCount: 1622, validRows: 1622, errorRows: 0, warningRows: 0, status: 'completed', period: 'Apr 2024' },
  { id: 'IMP-001', filename: 'Budget_FY2024.xlsx', source: 'excel', importedAt: '2024-04-01 08:00', rowCount: 540, validRows: 532, errorRows: 5, warningRows: 3, status: 'completed', period: 'FY2024 Budget' },
]

const FIELD_MAPPING = [
  { sourceColumn: 'TxnDate', targetField: 'Transaction Date', dataType: 'date', sample: '31/05/2024' },
  { sourceColumn: 'AccountCode', targetField: 'Account Code', dataType: 'text', sample: '4100' },
  { sourceColumn: 'AccountName', targetField: 'Account Name', dataType: 'text', sample: 'Sales Revenue' },
  { sourceColumn: 'Debit', targetField: 'Debit Amount', dataType: 'currency', sample: '125,000.00' },
  { sourceColumn: 'Credit', targetField: 'Credit Amount', dataType: 'currency', sample: '0.00' },
  { sourceColumn: 'Description', targetField: 'Description', dataType: 'text', sample: 'Invoice INV-4821' },
  { sourceColumn: 'Reference', targetField: 'Reference', dataType: 'text', sample: 'INV-4821' },
  { sourceColumn: 'TaxCode', targetField: 'GST Code', dataType: 'text', sample: 'GST' },
]

const VALIDATION_PREVIEW = [
  { row: 1, date: '31/05/2024', account: '4100', description: 'Sales Revenue — May', debit: '', credit: '125,000.00', status: 'valid' },
  { row: 2, date: '31/05/2024', account: '6100', description: 'Rent Expense — May', debit: '18,500.00', credit: '', status: 'valid' },
  { row: 3, date: '31/05/2024', account: '1200', description: 'Trade Debtors Control', debit: '137,500.00', credit: '', status: 'valid' },
  { row: 4, date: '', account: '6200', description: 'Marketing — Google Ads', debit: '4,200.00', credit: '', status: 'error', error: 'Missing transaction date' },
  { row: 5, date: '31/05/2024', account: '9999', description: 'Suspense entry', debit: '1,250.00', credit: '', status: 'warning', error: 'Unknown account code 9999' },
  { row: 6, date: '31/05/2024', account: '2100', description: 'GST Payable', debit: '', credit: '12,500.00', status: 'valid' },
]

const statusIcon = (s: string) => {
  if (s === 'completed') return <CheckCircle size={14} className="text-emerald-500" />
  if (s === 'failed') return <XCircle size={14} className="text-red-500" />
  if (s === 'processing') return <RefreshCw size={14} className="text-indigo-500 animate-spin" />
  return <Clock size={14} className="text-amber-500" />
}

const sourceBadge: Record<string, string> = {
  xero: 'bg-indigo-50 text-indigo-700',
  myob: 'bg-amber-50 text-amber-700',
  csv: 'bg-slate-100 text-slate-600',
  excel: 'bg-emerald-50 text-emerald-700',
  manual: 'bg-purple-50 text-purple-700',
}

type Step = 'source' | 'upload' | 'map' | 'validate' | 'import'

export default function ImportPage() {
  const [step, setStep] = useState<Step>('source')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [fileLoaded, setFileLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

  const steps: { id: Step; label: string }[] = [
    { id: 'source', label: 'Source' },
    { id: 'upload', label: 'Upload' },
    { id: 'map', label: 'Map Fields' },
    { id: 'validate', label: 'Validate' },
    { id: 'import', label: 'Import' },
  ]

  const stepIndex = steps.findIndex(s => s.id === step)

  function nextStep() {
    const idx = steps.findIndex(s => s.id === step)
    if (idx < steps.length - 1) setStep(steps[idx + 1].id)
  }

  function prevStep() {
    const idx = steps.findIndex(s => s.id === step)
    if (idx > 0) setStep(steps[idx - 1].id)
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Import Data" subtitle="Import financial data from your accounting system or files" />
      <div className="flex-1 overflow-auto p-6">
        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
          {(['new', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all', activeTab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700')}
            >
              {t === 'new' ? 'New Import' : 'Import History'}
            </button>
          ))}
        </div>

        {activeTab === 'new' && (
          <div className="space-y-6">
            {/* Stepper */}
            <div className="card p-4">
              <div className="flex items-center gap-0">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => i < stepIndex && setStep(s.id)}
                      className={cn('flex flex-col items-center gap-1', i < stepIndex ? 'cursor-pointer' : 'cursor-default')}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                        i < stepIndex ? 'bg-indigo-600 border-indigo-600 text-white' :
                        i === stepIndex ? 'border-indigo-600 text-indigo-600 bg-indigo-50' :
                        'border-slate-200 text-slate-400 bg-white'
                      )}>
                        {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
                      </div>
                      <span className={cn('text-xs font-medium whitespace-nowrap', i === stepIndex ? 'text-indigo-600' : i < stepIndex ? 'text-slate-600' : 'text-slate-400')}>{s.label}</span>
                    </button>
                    {i < steps.length - 1 && (
                      <div className={cn('flex-1 h-0.5 mx-2 mb-4 transition-all', i < stepIndex ? 'bg-indigo-600' : 'bg-slate-200')} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            {step === 'source' && (
              <div className="card p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">Select Data Source</h2>
                <p className="text-xs text-slate-500 mb-5">Choose where your financial data is coming from</p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {SOURCES.map(src => (
                    <button
                      key={src.id}
                      onClick={() => setSelectedSource(src.id)}
                      className={cn(
                        'flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left',
                        selectedSource === src.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <src.icon size={20} className={selectedSource === src.id ? 'text-indigo-600' : src.color} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{src.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{src.desc}</p>
                      </div>
                      {selectedSource === src.id && <CheckCircle size={14} className="text-indigo-600 self-end" />}
                    </button>
                  ))}
                </div>
                {selectedSource && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-5 border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">Import Options</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Reporting Period</label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option>May 2024</option>
                          <option>Apr 2024</option>
                          <option>Mar 2024</option>
                          <option>FY2024 YTD</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Data Type</label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option>General Ledger</option>
                          <option>Trial Balance</option>
                          <option>Bank Statement</option>
                          <option>Payroll</option>
                          <option>Budget</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => selectedSource && nextStep()}
                    disabled={!selectedSource}
                    className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2', selectedSource ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}
                  >
                    Continue <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'upload' && (
              <div className="card p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">Upload File</h2>
                <p className="text-xs text-slate-500 mb-5">Upload your exported file. Supported formats: CSV, XLSX, TXT</p>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); setFileLoaded(true) }}
                  onClick={() => setFileLoaded(true)}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-all',
                    dragging ? 'border-indigo-400 bg-indigo-50' : fileLoaded ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
                  )}
                >
                  {fileLoaded ? (
                    <>
                      <CheckCircle size={32} className="text-emerald-500" />
                      <p className="text-sm font-semibold text-emerald-700">Xero_GL_Export_May2024.csv loaded</p>
                      <p className="text-xs text-emerald-600">1,847 rows detected — ready to map</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className={dragging ? 'text-indigo-500' : 'text-slate-400'} />
                      <p className="text-sm font-semibold text-slate-600">Drop your file here, or click to browse</p>
                      <p className="text-xs text-slate-400">CSV, XLSX, TXT up to 50MB</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700">Ensure your export includes all transaction dates, account codes, and debit/credit amounts. Download our <button className="underline font-medium">CSV template</button> for the correct format.</p>
                </div>
                <div className="flex justify-between mt-5">
                  <button onClick={prevStep} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Back</button>
                  <button onClick={() => fileLoaded && nextStep()} disabled={!fileLoaded} className={cn('px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2', fileLoaded ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
                    Map Fields <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'map' && (
              <div className="card p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">Map Fields</h2>
                <p className="text-xs text-slate-500 mb-5">Match your file columns to the correct data fields. Auto-mapping detected 8 of 8 fields.</p>
                <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 font-medium">Auto-mapping successful — all required fields mapped from Xero GL export</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="table-header text-left py-2 pr-4">Source Column</th>
                      <th className="table-header text-left py-2 pr-4">Maps To</th>
                      <th className="table-header text-left py-2 pr-4">Data Type</th>
                      <th className="table-header text-left py-2">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_MAPPING.map((m, i) => (
                      <tr key={i} className="data-row">
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">{m.sourceColumn}</td>
                        <td className="py-2.5 pr-4">
                          <select className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            <option>{m.targetField}</option>
                          </select>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="badge-neutral text-xs">{m.dataType}</span>
                        </td>
                        <td className="py-2.5 font-mono text-xs text-slate-500">{m.sample}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between mt-5">
                  <button onClick={prevStep} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Back</button>
                  <button onClick={nextStep} className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
                    Validate Data <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'validate' && (
              <div className="card p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">Validate Data</h2>
                <p className="text-xs text-slate-500 mb-4">Review validation results before importing</p>
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Total Rows', value: '1,847', color: 'text-slate-800' },
                    { label: 'Valid', value: '1,844', color: 'text-emerald-600' },
                    { label: 'Errors', value: '0', color: 'text-red-500' },
                    { label: 'Warnings', value: '3', color: 'text-amber-500' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="kpi-label mb-1">{s.label}</p>
                      <p className={cn('text-xl font-bold font-mono', s.color)}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-auto max-h-64 border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Row', 'Date', 'Account', 'Description', 'Debit', 'Credit', 'Status'].map(h => (
                          <th key={h} className="table-header text-left px-3 py-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {VALIDATION_PREVIEW.map(row => (
                        <tr key={row.row} className={cn('data-row', row.status === 'error' ? 'bg-red-50' : row.status === 'warning' ? 'bg-amber-50' : '')}>
                          <td className="px-3 py-2 text-slate-400 font-mono">{row.row}</td>
                          <td className="px-3 py-2 font-mono">{row.date || <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-2 font-mono">{row.account}</td>
                          <td className="px-3 py-2 text-slate-600 max-w-48 truncate">{row.description}</td>
                          <td className="px-3 py-2 font-mono text-right">{row.debit}</td>
                          <td className="px-3 py-2 font-mono text-right">{row.credit}</td>
                          <td className="px-3 py-2">
                            {row.status === 'valid' && <span className="badge-success">Valid</span>}
                            {row.status === 'error' && <span title={row.error}><span className="badge-danger">Error</span></span>}
                            {row.status === 'warning' && <span title={row.error}><span className="badge-warning">Warning</span></span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between mt-5">
                  <button onClick={prevStep} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Back</button>
                  <button onClick={nextStep} className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
                    Import 1,844 Rows <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'import' && (
              <div className="card p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Import Successful</h2>
                <p className="text-sm text-slate-500 mb-6">1,844 rows imported from Xero_GL_Export_May2024.csv</p>
                <div className="grid grid-cols-3 gap-3 mb-6 text-left">
                  {[
                    { label: 'Records Imported', value: '1,844', sub: 'of 1,847 rows' },
                    { label: 'Period Covered', value: 'May 2024', sub: '1 May – 31 May' },
                    { label: 'Import Reference', value: 'IMP-007', sub: 'Completed 14 Jun 2026' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="kpi-label mb-1">{s.label}</p>
                      <p className="text-base font-bold text-slate-800">{s.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => { setStep('source'); setSelectedSource(null); setFileLoaded(false) }} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50">New Import</button>
                  <a href="/accounting/audit" className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">Audit This Import</a>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Import History</h2>
              <div className="flex items-center gap-2">
                <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none">
                  <option>All periods</option>
                  <option>May 2024</option>
                  <option>Apr 2024</option>
                </select>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <Download size={12} /> Export Log
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {IMPORT_HISTORY.map(imp => (
                <div key={imp.id} className="px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {statusIcon(imp.status)}
                    <span className="text-xs font-mono text-slate-400">{imp.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{imp.filename}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{imp.importedAt} · {imp.period}</p>
                  </div>
                  <span className={cn('badge text-xs px-2 py-0.5 rounded-full font-medium', sourceBadge[imp.source] || 'bg-slate-100 text-slate-600')}>
                    {imp.source.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="text-slate-500">{imp.rowCount.toLocaleString()} rows</span>
                    <span className="text-emerald-600 font-medium">{imp.validRows.toLocaleString()} valid</span>
                    {imp.errorRows > 0 && <span className="text-red-500 font-medium">{imp.errorRows} errors</span>}
                    {imp.warningRows > 0 && <span className="text-amber-500 font-medium">{imp.warningRows} warnings</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="View"><Eye size={13} /></button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Download"><Download size={13} /></button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
