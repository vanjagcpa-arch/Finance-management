'use client'
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Home, Building2, X, Edit2, Save, Mail, Phone, Users,
  Send, Check, AlertTriangle, Zap, Calendar,
} from 'lucide-react'
import { useElectricity } from '@/lib/ElectricityContext'
import { monthName } from '@/lib/electricityUtils'
import type { Apartment } from '@/lib/electricityTypes'

interface AgentForm { agencyName: string; agentName: string; agentEmail: string; agentPhone: string }

export default function AllUnitsPage() {
  const { customers, apartments, buildings, readings, settings, updateApartment, isLoaded } = useElectricity()

  const [filterBld,    setFilterBld]    = useState('')
  const [filterUnit,   setFilterUnit]   = useState('')
  const [filterFloor,  setFilterFloor]  = useState('')
  const [filterMeter,  setFilterMeter]  = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant' | 'incoming'>('all')
  const [filterTenant, setFilterTenant] = useState('')
  const [filterAgency, setFilterAgency] = useState('')

  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [agentForm,    setAgentForm]    = useState<AgentForm>({ agencyName: '', agentName: '', agentEmail: '', agentPhone: '' })
  const [sending,      setSending]      = useState<string | null>(null)
  const [sent,         setSent]         = useState<string[]>([])

  const today = new Date().toISOString().split('T')[0]

  const activeCustMap = useMemo(
    () => new Map(customers.filter(c => !c.moveOutDate && c.moveInDate <= today).map(c => [c.apartmentId, c])),
    [customers]
  )

  const incomingCustMap = useMemo(
    () => new Map(customers.filter(c => !c.moveOutDate && c.moveInDate > today).map(c => [c.apartmentId, c])),
    [customers]
  )

  const latestReadingMap = useMemo(() => {
    const m = new Map<string, { usage: number; month: number; year: number; readingDate: string }>()
    readings.forEach(r => {
      const ex = m.get(r.apartmentId)
      if (!ex || r.year * 12 + r.month > ex.year * 12 + ex.month) {
        m.set(r.apartmentId, { usage: r.usage, month: r.month, year: r.year, readingDate: r.readingDate })
      }
    })
    return m
  }, [readings])

  const rows = useMemo(() => {
    return apartments
      .map(apt => {
        const building = buildings.find(b => b.id === apt.buildingId)
        if (!building) return null
        const customer         = activeCustMap.get(apt.id) ?? null
        const incomingCustomer = incomingCustMap.get(apt.id) ?? null
        const latestReading    = latestReadingMap.get(apt.id) ?? null
        return { apt, building, customer, incomingCustomer, latestReading }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => {
        const bCmp = a.building.name.localeCompare(b.building.name)
        return bCmp !== 0 ? bCmp : a.apt.unitNumber.localeCompare(b.apt.unitNumber, undefined, { numeric: true })
      })
  }, [apartments, buildings, activeCustMap, latestReadingMap])

  const filtered = useMemo(() => rows.filter(r => {
    if (filterBld    && r.building.id !== filterBld) return false
    if (filterUnit   && !r.apt.unitNumber.toLowerCase().includes(filterUnit.toLowerCase())) return false
    if (filterFloor  && !String(r.apt.floor).includes(filterFloor)) return false
    if (filterMeter  && !r.apt.meterNumber.toLowerCase().includes(filterMeter.toLowerCase())) return false
    if (filterStatus === 'occupied' && !r.customer) return false
    if (filterStatus === 'vacant'   && (r.customer || r.incomingCustomer)) return false
    if (filterStatus === 'incoming' && !r.incomingCustomer) return false
    if (filterTenant) {
      const currName = r.customer ? `${r.customer.firstName} ${r.customer.lastName}`.toLowerCase() : ''
      const incomName = r.incomingCustomer ? `${r.incomingCustomer.firstName} ${r.incomingCustomer.lastName}`.toLowerCase() : ''
      if (!currName.includes(filterTenant.toLowerCase()) && !incomName.includes(filterTenant.toLowerCase())) return false
    }
    if (filterAgency) {
      const ag = `${r.apt.agencyName ?? ''} ${r.apt.agentName ?? ''}`.toLowerCase()
      if (!ag.includes(filterAgency.toLowerCase())) return false
    }
    return true
  }), [rows, filterBld, filterUnit, filterFloor, filterMeter, filterStatus, filterTenant, filterAgency])

  const occupiedCount   = rows.filter(r =>  r.customer).length
  const incomingCount   = rows.filter(r =>  r.incomingCustomer).length
  const vacantCount     = rows.filter(r => !r.customer && !r.incomingCustomer).length
  const vacantWithUsage = rows.filter(r => !r.customer && r.latestReading && r.latestReading.usage > 0).length

  const hasFilters = !!(filterBld || filterUnit || filterFloor || filterMeter || filterStatus !== 'all' || filterTenant || filterAgency)

  function clearFilters() {
    setFilterBld(''); setFilterUnit(''); setFilterFloor(''); setFilterMeter('')
    setFilterStatus('all'); setFilterTenant(''); setFilterAgency('')
  }

  function startEditAgent(apt: Apartment) {
    setEditingAgent(apt.id)
    setAgentForm({
      agencyName: apt.agencyName ?? '', agentName: apt.agentName ?? '',
      agentEmail: apt.agentEmail ?? '', agentPhone: apt.agentPhone ?? '',
    })
  }

  function saveAgent(apt: Apartment) { updateApartment({ ...apt, ...agentForm }); setEditingAgent(null) }

  async function handleEmailAgent(row: typeof rows[0]) {
    const { apt, building, latestReading } = row
    if (!apt.agentEmail || !latestReading) return
    setSending(apt.id)
    try {
      const res = await fetch('/api/send-agent-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: apt.agentEmail,
          agentName: apt.agentName ?? '', agencyName: apt.agencyName ?? '',
          buildingName: building.name,
          buildingAddress: `${building.address}, ${building.suburb} ${building.state} ${building.postcode}`,
          unitNumber: apt.unitNumber, floor: apt.floor, meterNumber: apt.meterNumber,
          usageKwh: latestReading.usage,
          period: monthName(latestReading.month, latestReading.year),
          readingDate: latestReading.readingDate,
          companyName: settings.companyName, fromEmail: settings.senderEmail,
          companyEmail: settings.email, companyPhone: settings.phone,
        }),
      })
      if (res.ok) setSent(prev => [...prev, apt.id])
      else alert('Email failed — check agent email address')
    } finally { setSending(null) }
  }

  if (!isLoaded) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400">Loading…</div></div>

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Home size={22} className="text-indigo-600" />All Units
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {occupiedCount} occupied
              {incomingCount > 0 && <span className="text-sky-600 font-medium"> · {incomingCount} incoming</span>}
              {' · '}{vacantCount} vacant
              {vacantWithUsage > 0 && <span className="text-amber-600 font-medium"> · {vacantWithUsage} with usage</span>}
            </p>
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <X size={13} />Clear filters
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Units', val: rows.length, sub: 'in portfolio', status: 'all' as const, color: 'text-slate-900', accent: '' },
            { label: 'Occupied', val: occupiedCount, sub: 'active tenants', status: 'occupied' as const, color: 'text-indigo-700', accent: '' },
            { label: 'Incoming', val: incomingCount, sub: 'future move-ins', status: 'incoming' as const, color: 'text-sky-600', accent: incomingCount > 0 ? 'border-l-4 border-sky-400' : '' },
            { label: 'Vacant', val: vacantCount, sub: vacantWithUsage > 0 ? `${vacantWithUsage} with usage` : 'no upcoming tenant', status: 'vacant' as const, color: 'text-amber-600', accent: vacantWithUsage > 0 ? 'border-l-4 border-amber-400' : '' },
          ].map(s => (
            <div key={s.status}
              onClick={() => setFilterStatus(filterStatus === s.status ? 'all' : s.status)}
              className={`card p-4 cursor-pointer transition-all ${s.accent} ${filterStatus === s.status ? 'ring-2 ring-indigo-500' : 'hover:border-indigo-200'}`}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              {/* Column labels */}
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="table-header text-left px-4 py-3">Building</th>
                <th className="table-header text-left px-4 py-3">Unit</th>
                <th className="table-header text-left px-4 py-3">Floor</th>
                <th className="table-header text-left px-4 py-3">Meter #</th>
                <th className="table-header text-left px-4 py-3">Status</th>
                <th className="table-header text-left px-4 py-3">Tenant</th>
                <th className="table-header text-left px-4 py-3">Agency / Agent</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
              {/* Column filters */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2">
                  <select value={filterBld} onChange={e => setFilterBld(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                    <option value="">All</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </th>
                <th className="px-3 py-2">
                  <input value={filterUnit} onChange={e => setFilterUnit(e.target.value)} placeholder="Filter…"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </th>
                <th className="px-3 py-2">
                  <input value={filterFloor} onChange={e => setFilterFloor(e.target.value)} placeholder="Filter…"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </th>
                <th className="px-3 py-2">
                  <input value={filterMeter} onChange={e => setFilterMeter(e.target.value)} placeholder="Filter…"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </th>
                <th className="px-3 py-2">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                    <option value="all">All</option>
                    <option value="occupied">Occupied</option>
                    <option value="incoming">Incoming</option>
                    <option value="vacant">Vacant</option>
                  </select>
                </th>
                <th className="px-3 py-2">
                  <input value={filterTenant} onChange={e => setFilterTenant(e.target.value)} placeholder="Filter…"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </th>
                <th className="px-3 py-2">
                  <input value={filterAgency} onChange={e => setFilterAgency(e.target.value)} placeholder="Filter…"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {hasFilters
                      ? 'No units match the current filters'
                      : 'No units found — add buildings and apartments in Settings'}
                  </td>
                </tr>
              )}
              {filtered.map(({ apt, building, customer, incomingCustomer, latestReading }) => {
                const isVacant    = !customer && !incomingCustomer
                const hasUsage    = !customer && !!latestReading && latestReading.usage > 0
                const isEditing   = editingAgent === apt.id
                const isSent      = sent.includes(apt.id)
                const isSending   = sending === apt.id
                return (
                  <React.Fragment key={apt.id}>
                    <tr className={`hover:bg-slate-50 transition-colors ${hasUsage ? 'bg-amber-50/30' : ''}`}>
                      {/* Building */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700">{building.name}</span>
                        </div>
                      </td>
                      {/* Unit */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {hasUsage && <Zap size={11} className="text-amber-500 flex-shrink-0" />}
                          <span className="font-semibold text-slate-900">Unit {apt.unitNumber}</span>
                        </div>
                      </td>
                      {/* Floor */}
                      <td className="px-4 py-3 text-slate-600">L{apt.floor}</td>
                      {/* Meter */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{apt.meterNumber}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        {customer ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                              <Users size={10} />Occupied
                            </span>
                            {incomingCustomer && (
                              <p className="text-xs text-sky-600 mt-0.5 flex items-center gap-0.5">
                                <Calendar size={9} />Incoming from {incomingCustomer.moveInDate}
                              </p>
                            )}
                          </div>
                        ) : incomingCustomer ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                            <Calendar size={10} />Incoming
                          </span>
                        ) : (
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${hasUsage ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                              <Home size={10} />Vacant
                            </span>
                            {hasUsage && latestReading && (
                              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-0.5">
                                <AlertTriangle size={9} />{latestReading.usage.toLocaleString()} kWh · {monthName(latestReading.month, latestReading.year)}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Tenant */}
                      <td className="px-4 py-3">
                        {customer ? (
                          <div>
                            <Link href="/electricity/customers"
                              className="font-medium text-slate-800 hover:text-indigo-600 transition-colors">
                              {customer.firstName} {customer.lastName}
                            </Link>
                            <p className="text-xs text-slate-400">Since {customer.moveInDate}</p>
                            {incomingCustomer && (
                              <p className="text-xs text-sky-600 mt-1 flex items-center gap-0.5">
                                <Calendar size={9} />
                                <Link href="/electricity/customers" className="hover:underline">
                                  {incomingCustomer.firstName} {incomingCustomer.lastName}
                                </Link>
                                {' '}from {incomingCustomer.moveInDate}
                              </p>
                            )}
                          </div>
                        ) : incomingCustomer ? (
                          <div>
                            <Link href="/electricity/customers"
                              className="font-medium text-sky-700 hover:text-sky-800 transition-colors">
                              {incomingCustomer.firstName} {incomingCustomer.lastName}
                            </Link>
                            <p className="text-xs text-sky-500">From {incomingCustomer.moveInDate}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                      {/* Agency / Agent */}
                      <td className="px-4 py-3">
                        {apt.agentName || apt.agencyName ? (
                          <div>
                            {apt.agentName  && <p className="text-sm text-slate-700">{apt.agentName}</p>}
                            {apt.agencyName && <p className="text-xs text-slate-400">{apt.agencyName}</p>}
                            <div className="flex flex-wrap gap-2 mt-0.5">
                              {apt.agentEmail && (
                                <a href={`mailto:${apt.agentEmail}`} className="flex items-center gap-0.5 text-xs text-indigo-600 hover:underline">
                                  <Mail size={9} />{apt.agentEmail}
                                </a>
                              )}
                              {apt.agentPhone && (
                                <span className="flex items-center gap-0.5 text-xs text-slate-500">
                                  <Phone size={9} />{apt.agentPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No agent</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => isEditing ? setEditingAgent(null) : startEditAgent(apt)}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                            {isEditing ? <X size={11} /> : <Edit2 size={11} />}
                            {isEditing ? 'Cancel' : 'Agent'}
                          </button>
                          {hasUsage && (
                            isSent ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                <Check size={11} />Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => handleEmailAgent({ apt, building, customer, incomingCustomer, latestReading })}
                                disabled={!apt.agentEmail || isSending}
                                title={!apt.agentEmail ? 'Add agent email first' : 'Email managing agent about usage'}
                                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                <Send size={10} className={isSending ? 'animate-pulse' : ''} />
                                {isSending ? '…' : 'Alert'}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="flex items-end gap-3 flex-wrap">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-full mb-1">
                              Managing Agent — Unit {apt.unitNumber}, {building.name}
                            </p>
                            {([
                              ['agencyName', 'Agency Name'],
                              ['agentName',  'Agent Name'],
                              ['agentEmail', 'Agent Email'],
                              ['agentPhone', 'Agent Phone'],
                            ] as const).map(([field, label]) => (
                              <div key={field} className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                                <input
                                  type={field === 'agentEmail' ? 'email' : 'text'}
                                  value={agentForm[field]}
                                  onChange={e => setAgentForm(f => ({ ...f, [field]: e.target.value }))}
                                  placeholder={label}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              </div>
                            ))}
                            <button onClick={() => saveAgent(apt)}
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
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
              Showing {filtered.length} of {rows.length} units
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
