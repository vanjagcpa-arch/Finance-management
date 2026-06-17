'use client'
import { useState, useRef, useMemo } from 'react'
import { Zap, Upload, Download, Check, AlertCircle, X, Pencil, Save } from 'lucide-react'
import Papa from 'papaparse'
import { useElectricity } from '@/lib/ElectricityContext'
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

interface EditForm {
  previousReading: string
  currentReading: string
  readingDate: string
  notes: string
}

export default function UsagePage() {
  const { readings, updateReading, upsertReadings, updateInvoice, invoices, settings, buildings, apartments, isLoaded } = useElectricity()
  const [month, setMonth] = useState(5)
  const [year, setYear] = useState(2026)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ previousReading: '', currentReading: '', readingDate: '', notes: '' })
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const aptMap = useMemo(() => new Map(apartments.map(a => [a.id, a])), [apartments])
  const aptByMeter = useMemo(() => new Map(apartments.map(a => [a.meterNumber.toUpperCase(), a])), [apartments])
  const aptByUnit = useMemo(() => {
    const m = new Map<string, typeof apartments[0]>()
    apartments.forEach(a => {
      const bld = buildings.find(b => b.id === a.buildingId)
      const key = `${bld?.name?.toLowerCase()}-${a.unitNumber}`
      m.set(key, a)
    })
    return m
  }, [apartments, buildings])
  const bldMap = useMemo(() => new Map(buildings.map(b => [b.id, b])), [buildings])

  const monthReadings = useMemo(() =>
    readings.filter(r => r.month === month && r.year === year),
    [readings, month, year]
  )

  const lastReadingMap = useMemo(() => {
    const m = new Map<string, number>()
    const sorted = [...readings].sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
    for (const r of sorted) {
      if (!m.has(r.apartmentId)) m.set(r.apartmentId, r.currentReading)
    }
    return m
  }, [readings])

  function downloadTemplate() {
    const csv = generateUsageCSVTemplate(apartments, buildings, readings)
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

          const rawPrev = parseFloat(row['Previous Reading (kWh)'] || row['Previous Reading'] || '')
          const autoPrev = apt ? (lastReadingMap.get(apt.id) ?? 0) : 0
          const prev = (!isNaN(rawPrev) && rawPrev > 0) ? rawPrev : autoPrev
          const curr = parseFloat(row['Current Reading (kWh)'] || row['Current Reading'] || '')
          const date = row['Reading Date (YYYY-MM-DD)'] || row['Reading Date'] || `${year}-${String(month).padStart(2, '0')}-30`
          const bld = apt ? bldMap.get(apt.buildingId) : undefined

          const valid = !!apt && !isNaN(prev) && !isNaN(curr) && curr >= prev
          const error = !apt ? 'Apartment not found' : isNaN(curr) ? 'Missing current reading' : curr < prev ? 'Current < previous' : undefined

          return {
            apartmentId: apt?.id ?? '',
            unitNumber: apt?.unitNumber ?? unitNum ?? '',
            building: bld?.name ?? buildingName ?? '',
            meterNumber: apt?.meterNumber ?? meterNum ?? '',
            readingDate: date,
            previousReading: isNaN(prev) ? 0 : prev,
            currentReading: isNaN(curr) ? 0 : curr,
            usage: isNaN(curr) || isNaN(prev) ? 0 : Math.max(0, curr - prev),
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

  function startEdit(r: MeterReading) {
    setEditingId(r.id)
    setEditForm({
      previousReading: String(r.previousReading),
      currentReading: String(r.currentReading),
      readingDate: r.readingDate,
      notes: r.notes ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit(original: MeterReading) {
    const prev = parseFloat(editForm.previousReading)
    const curr = parseFloat(editForm.currentReading)
    if (isNaN(prev) || isNaN(curr) || curr < prev) return

    const usage = curr - prev
    const corrected: MeterReading = {
      ...original,
      previousReading: prev,
      currentReading: curr,
      usage,
      readingDate: editForm.readingDate || original.readingDate,
      notes: editForm.notes || undefined,
    }
    updateReading(corrected)

    // Recalculate the associated invoice if it exists
    const invId = `inv-${original.apartmentId}-${original.year}${String(original.month).padStart(2, '0')}`
    const inv = invoices.find(i => i.id === invId)
    if (inv) {
      const { ratePerKwh, dailySupplyCharge, gstRate } = settings.tariff
      const usageCharge = Math.round(usage * ratePerKwh * 100) / 100
      const supplyCharge = Math.round(inv.daysInPeriod * dailySupplyCharge * 100) / 100
      const subtotal = Math.round((usageCharge + supplyCharge) * 100) / 100
      const gst = Math.round(subtotal * gstRate * 100) / 100
      const total = Math.round((subtotal + gst) * 100) / 100
      updateInvoice({ ...inv, previousReading: prev, currentReading: curr, usage, usageCharge, supplyCharge, subtotal, gst, total })
      setSaveMsg('Reading corrected and invoice recalculated')
    } else {
      setSaveMsg('Reading corrected')
    }
    setEditingId(null)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const validCount = preview.filter(r => r.valid).length
  const errorCount = preview.filter(r => !r.valid).length

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {saveMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />{saveMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Zap size={22} className="text-indigo-600" />Meter Readings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Upload monthly readings or enter manually. Click the pencil to correct a reading.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={`${year}-${month}`} onChange={e => { const [y, m] = e.target.value.split('-'); setYear(+y); setMonth(+m); setPreview([]); setImported(false); setEditingId(null) }}
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
          <p className="kpi-value mt-1">{apartments.length}</p>
          <p className="text-xs text-slate-400 mt-1">Across {buildings.length} buildings</p>
        </div>
        <div className="card p-4">
          <p className="kpi-label">Readings Uploaded</p>
          <p className="kpi-value mt-1">{monthReadings.length}</p>
          <p className="text-xs text-slate-400 mt-1">{monthName(month, year)}</p>
        </div>
        <div className="card p-4">
          <p className="kpi-label">Missing Readings</p>
          <p className={`kpi-value mt-1 ${apartments.length - monthReadings.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {apartments.length - monthReadings.length}
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
            <span className="ml-2 text-sm font-normal text-slate-400">({monthReadings.length} of {apartments.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Click the pencil icon to correct a reading. If an invoice exists for this month it will be automatically recalculated.</p>
        </div>
        <div className="max-h-[32rem] overflow-y-auto">
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
                <th className="table-header text-left px-4 py-3">Notes</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {monthReadings.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">No readings for {monthName(month, year)}</td></tr>
              ) : monthReadings.map(r => {
                const apt = aptMap.get(r.apartmentId)
                const bld = apt ? bldMap.get(apt.buildingId) : undefined
                const isEditing = editingId === r.id
                const hasInvoice = invoices.some(i => i.id === `inv-${r.apartmentId}-${r.year}${String(r.month).padStart(2, '0')}`)

                if (isEditing) {
                  const prev = parseFloat(editForm.previousReading)
                  const curr = parseFloat(editForm.currentReading)
                  const valid = !isNaN(prev) && !isNaN(curr) && curr >= prev
                  const usage = valid ? curr - prev : 0
                  return (
                    <tr key={r.id} className="bg-amber-50 border-b border-amber-100">
                      <td className="px-4 py-2 font-mono text-slate-700">{apt?.unitNumber}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs">{bld?.name}</td>
                      <td className="px-4 py-2 font-mono text-slate-500 text-xs">{apt?.meterNumber}</td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" value={editForm.previousReading}
                          onChange={e => setEditForm(f => ({ ...f, previousReading: e.target.value }))}
                          className="w-24 text-right border border-amber-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" value={editForm.currentReading}
                          onChange={e => setEditForm(f => ({ ...f, currentReading: e.target.value }))}
                          className="w-24 text-right border border-amber-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium">
                        <span className={valid ? 'text-indigo-700' : 'text-red-500'}>
                          {valid ? usage.toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <input type="date" value={editForm.readingDate}
                          onChange={e => setEditForm(f => ({ ...f, readingDate: e.target.value }))}
                          className="border border-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="text" value={editForm.notes} placeholder="Reason for correction"
                          onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          className="w-36 border border-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(r)} disabled={!valid}
                            className="p-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-40 transition-colors" title="Save correction">
                            <Save size={13} />
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1.5 border border-slate-200 text-slate-500 rounded hover:bg-slate-100 transition-colors" title="Cancel">
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={r.id} className="data-row">
                    <td className="px-4 py-2.5 font-mono text-slate-700">{apt?.unitNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{bld?.name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">{apt?.meterNumber}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.previousReading.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.currentReading.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-indigo-700">{r.usage.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{r.readingDate}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{r.notes ?? ''}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => startEdit(r)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title={hasInvoice ? 'Edit reading (invoice will be recalculated)' : 'Edit reading'}>
                        <Pencil size={13} />
                      </button>
                    </td>
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
