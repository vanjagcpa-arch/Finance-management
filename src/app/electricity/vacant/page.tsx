'use client'
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Home, Send, Check, Building2, AlertTriangle, Search, ChevronRight, Mail, Phone, Zap, Edit2, X, Save } from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { monthName } from '@/lib/electricityUtils'
import type { Apartment } from '@/lib/electricityTypes'

interface VacantUnit {
  apartment: Apartment
  building: { id: string; name: string; address: string; suburb: string; state: string; postcode: string; lowUsageThreshold: number; highUsageThreshold: number }
  latestReading: { usage: number; month: number; year: number; readingDate: string } | null
  hasUsage: boolean
}

interface AgentForm { agencyName: string; agentName: string; agentEmail: string; agentPhone: string }

export default function VacantUnitsPage() {
  const { customers, apartments, buildings, readings, settings, updateApartment, isLoaded } = useElectricity()
  const [filter, setFilter] = useState<'usage' | 'all'>('usage')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<string[]>([])
  const [filterBld, setFilterBld] = useState('')
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [agentForm, setAgentForm] = useState<AgentForm>({ agencyName: '', agentName: '', agentEmail: '', agentPhone: '' })

  const recentMonths = useMemo(() => {
    const seen: Record<string, boolean> = {}
    return readings
      .map(r => `${r.year}-${r.month}`)
      .filter(k => { if (seen[k]) return false; seen[k] = true; return true })
      .map(k => { const [y, m] = k.split('-'); return { year: parseInt(y), month: parseInt(m) } })
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
      .slice(0, 2)
  }, [readings])

  const vacantUnits = useMemo<VacantUnit[]>(() => {
    return apartments
      .map(apt => {
        const activeCustomers = customers.filter(c => c.apartmentId === apt.id && !c.moveOutDate)
        if (activeCustomers.length > 0) return null

        const building = buildings.find(b => b.id === apt.buildingId)
        if (!building) return null

        const aptReadings = readings
          .filter(r => r.apartmentId === apt.id && recentMonths.some(m => m.year === r.year && m.month === r.month))
          .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))

        const latestReading = aptReadings[0] ?? null

        return {
          apartment: apt,
          building,
          latestReading: latestReading ? { usage: latestReading.usage, month: latestReading.month, year: latestReading.year, readingDate: latestReading.readingDate } : null,
          hasUsage: latestReading ? latestReading.usage > 0 : false,
        } as VacantUnit
      })
      .filter((u): u is VacantUnit => u !== null)
      .sort((a, b) => {
        if (a.hasUsage !== b.hasUsage) return a.hasUsage ? -1 : 1
        return (b.latestReading?.usage ?? 0) - (a.latestReading?.usage ?? 0)
      })
  }, [apartments, customers, buildings, readings, recentMonths])

  const filtered = useMemo(() => {
    let list = filter === 'usage' ? vacantUnits.filter(u => u.hasUsage) : vacantUnits
    if (filterBld) list = list.filter(u => u.building.id === filterBld)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.apartment.unitNumber.toLowerCase().includes(q) ||
        u.building.name.toLowerCase().includes(q) ||
        (u.apartment.agencyName ?? '').toLowerCase().includes(q) ||
        (u.apartment.agentName ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [vacantUnits, filter, filterBld, search])

  const withUsageCount = vacantUnits.filter(u => u.hasUsage).length
  const totalVacant = vacantUnits.length
  const buildingsAffected = new Set(vacantUnits.filter(u => u.hasUsage).map(u => u.building.id)).size

  function startEditAgent(unit: VacantUnit) {
    setEditingAgent(unit.apartment.id)
    setAgentForm({
      agencyName: unit.apartment.agencyName ?? '',
      agentName: unit.apartment.agentName ?? '',
      agentEmail: unit.apartment.agentEmail ?? '',
      agentPhone: unit.apartment.agentPhone ?? '',
    })
  }

  function saveAgent(unit: VacantUnit) {
    updateApartment({ ...unit.apartment, ...agentForm })
    setEditingAgent(null)
  }

  async function handleEmailAgent(unit: VacantUnit) {
    if (!unit.apartment.agentEmail || !unit.latestReading) return
    setSending(unit.apartment.id)
    try {
      const res = await fetch('/api/send-agent-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: unit.apartment.agentEmail,
          agentName: unit.apartment.agentName ?? '',
          agencyName: unit.apartment.agencyName ?? '',
          buildingName: unit.building.name,
          buildingAddress: `${unit.building.address}, ${unit.building.suburb} ${unit.building.state} ${unit.building.postcode}`,
          unitNumber: unit.apartment.unitNumber,
          floor: unit.apartment.floor,
          meterNumber: unit.apartment.meterNumber,
          usageKwh: unit.latestReading.usage,
          period: monthName(unit.latestReading.month, unit.latestReading.year),
          readingDate: unit.latestReading.readingDate,
          companyName: settings.companyName,
          fromEmail: settings.senderEmail,
          companyEmail: settings.email,
          companyPhone: settings.phone,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        alert(`Failed: ${j.error}`)
        return
      }
      setSent(prev => [...prev, unit.apartment.id])
    } finally {
      setSending(null)
    }
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading…</div></div>

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vacant Units</h1>
            <p className="text-sm text-slate-500 mt-0.5">Apartments with no active tenant — flag usage and contact managing agents</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Vacant Units</p>
            <p className="text-3xl font-bold text-slate-900">{totalVacant}</p>
            <p className="text-xs text-slate-400 mt-1">No active tenant registered</p>
          </div>
          <div className="card p-5 border-l-4 border-amber-400">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">With Recent Usage</p>
            <p className="text-3xl font-bold text-amber-600">{withUsageCount}</p>
            <p className="text-xs text-slate-400 mt-1">Usage detected in last 2 months</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Buildings Affected</p>
            <p className="text-3xl font-bold text-slate-900">{buildingsAffected}</p>
            <p className="text-xs text-slate-400 mt-1">Across your portfolio</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setFilter('usage')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${filter === 'usage' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <AlertTriangle size={13} />With Usage ({withUsageCount})
            </button>
            <button onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              All Vacant ({totalVacant})
            </button>
          </div>

          <select value={filterBld} onChange={e => setFilterBld(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All buildings</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search unit, building, agent…"
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {/* No results */}
        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <Home size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {filter === 'usage' ? 'No vacant units with recent usage detected.' : 'No vacant units found.'}
            </p>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header text-left px-4 py-3">Unit</th>
                  <th className="table-header text-left px-4 py-3">Building</th>
                  <th className="table-header text-left px-4 py-3">Usage Detected</th>
                  <th className="table-header text-left px-4 py-3">Managing Agent</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(unit => {
                  const isSent = sent.includes(unit.apartment.id)
                  const isSending = sending === unit.apartment.id
                  const isEditing = editingAgent === unit.apartment.id
                  const hasAgent = !!unit.apartment.agentEmail
                  return (
                    <React.Fragment key={unit.apartment.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${unit.hasUsage ? 'bg-amber-50/30' : ''}`}>
                        {/* Unit */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {unit.hasUsage && <Zap size={13} className="text-amber-500 flex-shrink-0" />}
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">Unit {unit.apartment.unitNumber}</p>
                              <p className="text-xs text-slate-400">Level {unit.apartment.floor} · {unit.apartment.meterNumber}</p>
                            </div>
                          </div>
                        </td>
                        {/* Building */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-700">{unit.building.name}</p>
                          <p className="text-xs text-slate-400">{unit.building.address}</p>
                        </td>
                        {/* Usage */}
                        <td className="px-4 py-3">
                          {unit.latestReading && unit.hasUsage ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                <AlertTriangle size={10} />{unit.latestReading.usage.toLocaleString()} kWh
                              </span>
                              <p className="text-xs text-slate-400 mt-1">{monthName(unit.latestReading.month, unit.latestReading.year)} · {unit.latestReading.readingDate}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No recent usage</span>
                          )}
                        </td>
                        {/* Agent */}
                        <td className="px-4 py-3">
                          {unit.apartment.agentName || unit.apartment.agencyName ? (
                            <div>
                              <p className="text-sm font-medium text-slate-700">{unit.apartment.agentName ?? '—'}</p>
                              {unit.apartment.agencyName && <p className="text-xs text-slate-400">{unit.apartment.agencyName}</p>}
                              <div className="flex flex-wrap gap-2 mt-1">
                                {unit.apartment.agentEmail && (
                                  <a href={`mailto:${unit.apartment.agentEmail}`} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                                    <Mail size={10} />{unit.apartment.agentEmail}
                                  </a>
                                )}
                                {unit.apartment.agentPhone && (
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Phone size={10} />{unit.apartment.agentPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No agent assigned</span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => isEditing ? setEditingAgent(null) : startEditAgent(unit)}
                              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                              {isEditing ? <X size={11} /> : <Edit2 size={11} />}
                              {isEditing ? 'Cancel' : 'Edit Agent'}
                            </button>
                            {unit.hasUsage && (
                              isSent ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                  <Check size={13} />Notified
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleEmailAgent(unit)}
                                  disabled={!hasAgent || isSending}
                                  title={!hasAgent ? 'Add agent email first' : 'Email managing agent'}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                    disabled:opacity-40 disabled:cursor-not-allowed
                                    border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100">
                                  <Send size={11} className={isSending ? 'animate-pulse' : ''} />
                                  {isSending ? 'Sending…' : 'Email Agent'}
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="flex items-end gap-3 flex-wrap">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-full mb-1">Managing Agent — Unit {unit.apartment.unitNumber}</div>
                              {([
                                ['agencyName', 'Agency Name'],
                                ['agentName', 'Agent Name'],
                                ['agentEmail', 'Agent Email'],
                                ['agentPhone', 'Agent Phone'],
                              ] as const).map(([field, label]) => (
                                <div key={field} className="flex-1 min-w-[160px]">
                                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                                  <input
                                    type={field === 'agentEmail' ? 'email' : 'text'}
                                    value={agentForm[field]}
                                    onChange={e => setAgentForm(f => ({ ...f, [field]: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={label}
                                  />
                                </div>
                              ))}
                              <button onClick={() => saveAgent(unit)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                                <Save size={13} />Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
