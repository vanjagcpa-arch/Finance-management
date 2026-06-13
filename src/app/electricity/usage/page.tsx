'use client'
import { useState, useRef, useMemo } from 'react'
import { Zap, Upload, Download, Check, AlertCircle, ChevronDown, X } from 'lucide-react'
import Papa from 'papaparse'
import { useElectricity } from '@/lib/ElectricityContext'
import { BUILDINGS, APARTMENTS } from '@/lib/electricityData'
import { downloadFile, generateUsageCSVTemplate, monthName } from '@/lib/electricityUtils'
import type { MeterReading } from '@/lib/electricityTypes'

interface ParsedRow {
  apartmentId: string
  unitNumber: string
  building: string
  meterNumber: string
  readingDate: string
  previousReading: number
  currentReading: number
  usage: number
  valid: boolean
  error?: string
}

export default function UsagePage() {
  const { readings, upsertReadings, settings, isLoaded } = useElectricity()
  const [month, setMonth] = useState(5)
  const [year, setYear] = useState(2026)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const aptMap = useMemo(() => new Map(APARTMENTS.map(a => [a.id, a])), [])
  const aptByMeter = useMemo(() => new Map(APARTMENTS.map(a => [a.meterNumber.toUpperCase(), a])), [])
  const aptByUnit = useMemo(() => {
    const m = new Map<string, typeof APARTMENTS[0]>()
    APARTMENTS.forEach(a => {
      const bld = BUILDINGS.find(b => b.id === a.buildingId)
      const key = `${bld?.name?.toLowerCase()}-${a.unitNumber}`
      m.set(key, a)
    })
    return m
  }, [])
  const bldMap = useMemo(() => new Map(BUILDINGS.map(b => [b.id, b])), [])

  const monthReadings = useMemo(() =>
    readings.filter(r => r.month === month && r.year === year),
    [readings, month, year]
  )

  function downloadTemplate() {
    const csv = generateUsageCSVTemplate(APARTMENTS, BUILDINGS)
    downloadFile(csv, `usage_template_${year}${String(month).padStart(2, '0')}.csv`, 'text/csv')
  }

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows: ParsedRow[] = data.map(row => {
          const aptId = row['Apartment ID']?.trim()
          const meterNum = row['Meter Number']?.trim().toUpperCase()
          const unitNum = row['Unit Number']?.trim()
          const buildingName = row['Building']?.trim().toLowerCase()

          let apt = aptId ? aptMap.get(aptId) : undefined
          if (!apt && meterNum) apt = aptByMeter.get(meterNum)
          if (!apt && unitNum && buildingName) apt = aptByUnit.get(`${buildingName}-${unitNum}`)

          const prev = parseFloat(row['Previous Reading (kWh)'] || row['Previous Reading'] || '0')
          const curr = parseFloat(row['Current Reading (kWh)'] || row['Current Reading'] || '0')
          const date = row['Reading Date (YYYY-MM-DD)'] || row['Reading Date'] || `${year}-${String(month).padStart(2, '0')}-30`
          const bld = apt ? bldMap.get(apt.buildingId) : undefined

          const valid = !!apt && !isNaN(prev) && !isNaN(curr) && curr >= prev
          const error = !apt ? 'Apartment not found' : isNaN(prev) || isNaN(curr) ? 'Invalid readings' : curr < prev ? 'Current < previous' : undefined

          return {
            apartmentId: apt?.id ?? '',
            unitNumber: apt?.unitNumber ?? unitNum ?? '',
            building: bld?.name ?? buildingName ?? '',
            meterNumber: apt?.meterNumber ?? meterNum ?? '',
            readingDate: date,
            previousReading: isNaN(prev) ? 0 : prev,
            currentReading: isNaN(curr) ? 0 : curr,
            usage: isNaN(curr) || isNaN(prev) ? 0 : curr - prev,
            valid,
            error,
          }
        })
        setPreview(rows)
        setImported(false)
      }
    })
  }

  function handleImport() {
    setImporting(true)
    const newReadings: MeterReading[] = preview
      .filter(r => r.valid)
      .map(r => ({
        id: `reading-${r.apartmentId}-${year}${String(month).padStart(2, '0')}`,
        apartmentId: r.apartmentId,
        month, year,
        previousReading: r.previousReading,
        currentReading: r.currentReading,
        usage: r.usage,
        readingDate: r.readingDate,
      }))
    upsertReadings(newReadings)
    setTimeout(() => { setImporting(false); setImported(true) }, 600)
  }

  const validCount = preview.filter(r => r.valid).length
  const errorCount = preview.filter(r => !r.valid).length

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Zap size={22} className="text-indigo-600" />Meter Readings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Upload monthly readings or enter manually</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={`${year}-${month}`} onChange={e => { const [y, m] = e.target.value.split('-'); setYear(+y); setMonth(+m); setPreview([]); setImported(false) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(2026, 5 - i, 1)
              return { m: d.getMonth() + 1, y: d.getFullYear(), label: monthName(d.getMonth() + 1, d.getFullYear()) }
            }).map(opt => (
              <option key={`${opt.y}-${opt.m}`} value={`${opt.y}-${opt.m}`}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="kpi-label">Total Apartments</p>
          <p className="kpi-value mt-1">{APARTMENTS.length}</p>
          <p className="text-xs text-slate-400 mt-1">Across 7 buildings</p>
        </div>
        <div className="card p-4">
          <p className="kpi-label">Readings Uploaded</p>
          <p className="kpi-value mt-1">{monthReadings.length}</p>
          <p className="text-xs text-slate-400 mt-1">{monthName(month, year)}</p>
        </div>
        <div className="card p-4">
          <p className="kpi-label">Missing Readings</p>
          <p className={`kpi-value mt-1 ${APARTMENTS.length - monthReadings.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {APARTMENTS.length - monthReadings.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Still needed</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Upload Readings</h2>
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
            <Download size={14} />Download Template
          </button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
          <Upload size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">Drop CSV file here or click to upload</p>
          <p className="text-xs text-slate-400 mt-1">Use the template above for the correct format</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="badge-success"><Check size={11} />{validCount} valid rows</span>
                {errorCount > 0 && <span className="badge-danger"><AlertCircle size={11} />{errorCount} errors</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPreview([]); setImported(false) }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                  <X size={12} />Clear
                </button>
                {!imported && validCount > 0 && (
                  <button onClick={handleImport} disabled={importing}
                    className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                    {importing ? 'Importing…' : `Import ${validCount} Readings`}
                  </button>
                )}
                {imported && <span className="badge-success"><Check size={11} />Imported successfully</span>}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="table-header text-left px-3 py-2">Unit</th>
                    <th className="table-header text-left px-3 py-2">Building</th>
                    <th className="table-header text-left px-3 py-2">Meter</th>
                    <th className="table-header text-right px-3 py-2">Previous (kWh)</th>
                    <th className="table-header text-right px-3 py-2">Current (kWh)</th>
                    <th className="table-header text-right px-3 py-2">Usage (kWh)</th>
                    <th className="table-header px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${row.valid ? '' : 'bg-red-50'}`}>
                      <td className="px-3 py-2 font-mono">{row.unitNumber}</td>
                      <td className="px-3 py-2 text-slate-600">{row.building}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">{row.meterNumber}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.previousReading.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.currentReading.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{row.usage.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        {row.valid
                          ? <span className="badge-success"><Check size={10} />OK</span>
                          : <span className="badge-danger"><AlertCircle size={10} />{row.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Existing Readings */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            Readings for {monthName(month, year)}
            <span className="ml-2 text-sm font-normal text-slate-400">({monthReadings.length} of {APARTMENTS.length})</span>
          </h2>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="table-header text-left px-4 py-3">Unit</th>
                <th className="table-header text-left px-4 py-3">Building</th>
                <th className="table-header text-left px-4 py-3">Meter</th>
                <th className="table-header text-right px-4 py-3">Previous</th>
                <th className="table-header text-right px-4 py-3">Current</th>
                <th className="table-header text-right px-4 py-3">Usage</th>
                <th className="table-header text-left px-4 py-3">Read Date</th>
              </tr>
            </thead>
            <tbody>
              {monthReadings.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">No readings for {monthName(month, year)}</td></tr>
              ) : monthReadings.map(r => {
                const apt = aptMap.get(r.apartmentId)
                const bld = apt ? bldMap.get(apt.buildingId) : undefined
                return (
                  <tr key={r.id} className="data-row">
                    <td className="px-4 py-2.5 font-mono text-slate-700">{apt?.unitNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{bld?.name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">{apt?.meterNumber}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.previousReading.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.currentReading.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-indigo-700">{r.usage.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{r.readingDate}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tariff info */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Current Tariff</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-xl p-4 text-center">
            <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-1">Usage Rate</p>
            <p className="text-2xl font-bold text-indigo-900">{(settings.tariff.ratePerKwh * 100).toFixed(2)}¢</p>
            <p className="text-xs text-indigo-600 mt-0.5">per kWh</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Daily Supply</p>
            <p className="text-2xl font-bold text-slate-900">${settings.tariff.dailySupplyCharge.toFixed(4)}</p>
            <p className="text-xs text-slate-400 mt-0.5">per day</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">GST</p>
            <p className="text-2xl font-bold text-slate-900">{(settings.tariff.gstRate * 100).toFixed(0)}%</p>
            <p className="text-xs text-slate-400 mt-0.5">applied to total</p>
          </div>
        </div>
      </div>
    </div>
  )
}
