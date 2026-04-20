'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import { CheckCircle2, Circle, Clock, AlertOctagon, ChevronDown, ChevronRight, MessageSquare, User, Calendar } from 'lucide-react'
import { eomTasks } from '@/lib/demoData'
import type { EOMTask } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  'complete':    { label: 'Complete',    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  'in-progress': { label: 'In Progress', icon: Clock,        color: 'text-blue-600',    bg: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500'   },
  'not-started': { label: 'Not Started', icon: Circle,       color: 'text-slate-400',   bg: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-300'  },
  'blocked':     { label: 'Blocked',     icon: AlertOctagon, color: 'text-red-500',     bg: 'bg-red-50 text-red-700',         dot: 'bg-red-500'    },
}

const PRIORITY_COLOR = { high: 'text-red-500', medium: 'text-amber-500', low: 'text-slate-400' }
const CATEGORIES = ['Accounts Receivable', 'Accounts Payable', 'General Ledger', 'Revenue', 'Fixed Assets', 'Reporting']

function TaskRow({ task, onStatusChange, onNotesChange }: {
  task: EOMTask
  onStatusChange: (id: string, s: EOMTask['status']) => void
  onNotesChange: (id: string, n: string) => void
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const cfg = STATUS_CONFIG[task.status]
  const Icon = cfg.icon

  return (
    <div className={cn('border-b border-slate-100 last:border-0', task.status === 'complete' && 'opacity-60')}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
        {/* Status icon */}
        <button
          onClick={() => {
            const cycle: EOMTask['status'][] = ['not-started', 'in-progress', 'complete', 'blocked']
            const next = cycle[(cycle.indexOf(task.status) + 1) % cycle.length]
            onStatusChange(task.id, next)
          }}
          className="flex-shrink-0"
        >
          <Icon size={18} className={cfg.color} />
        </button>

        {/* Task name */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', task.status === 'complete' ? 'line-through text-slate-400' : 'text-slate-800')}>
            {task.name}
          </p>
          {task.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{task.notes}</p>}
        </div>

        {/* Priority */}
        <span className={cn('text-xs font-semibold uppercase tracking-wide flex-shrink-0', PRIORITY_COLOR[task.priority])}>
          {task.priority}
        </span>

        {/* Owner */}
        <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0 w-24">
          <User size={11} />
          <span className="truncate">{task.owner}</span>
        </div>

        {/* Due day */}
        <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0 w-16">
          <Calendar size={11} />
          <span>Day {task.dueDay}</span>
        </div>

        {/* Status badge */}
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value as EOMTask['status'])}
          className={cn('text-xs font-medium px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer flex-shrink-0', cfg.bg)}
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Notes toggle */}
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <MessageSquare size={14} />
        </button>
      </div>
      {notesOpen && (
        <div className="px-4 pb-3 pt-1 ml-9">
          <textarea
            value={task.notes}
            onChange={e => onNotesChange(task.id, e.target.value)}
            placeholder="Add notes…"
            className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            rows={2}
          />
        </div>
      )}
    </div>
  )
}

export default function EOMClosePage() {
  const [tasks, setTasks] = useState<EOMTask[]>(eomTasks)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<EOMTask['status'] | 'all'>('all')

  const updateStatus = (id: string, status: EOMTask['status']) =>
    setTasks(t => t.map(x => x.id === id ? { ...x, status } : x))

  const updateNotes = (id: string, notes: string) =>
    setTasks(t => t.map(x => x.id === id ? { ...x, notes } : x))

  const total = tasks.length
  const complete = tasks.filter(t => t.status === 'complete').length
  const blocked = tasks.filter(t => t.status === 'blocked').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const pct = Math.round((complete / total) * 100)

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Month-End Close" subtitle="Track and manage EOM close tasks" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Progress Header */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{pct}% Complete</p>
              <p className="text-sm text-slate-500">{complete} of {total} tasks done · Close due April 15</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">{complete} Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600">{inProgress} In Progress</span>
              </div>
              {blocked > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-red-600 font-medium">{blocked} Blocked</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-600">{total - complete - inProgress - blocked} Not Started</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {(['all', 'not-started', 'in-progress', 'complete', 'blocked'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize',
                filter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
              )}
            >
              {s === 'all' ? `All (${total})` : `${STATUS_CONFIG[s].label} (${tasks.filter(t => t.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Task Lists by Category */}
        <div className="space-y-3">
          {CATEGORIES.map(cat => {
            const catTasks = filtered.filter(t => t.category === cat)
            if (catTasks.length === 0) return null
            const catComplete = catTasks.filter(t => t.status === 'complete').length
            const isCollapsed = collapsed[cat]
            const catBlocked = catTasks.some(t => t.status === 'blocked')

            return (
              <div key={cat} className="card">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    <span className="text-sm font-semibold text-slate-800">{cat}</span>
                    {catBlocked && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Blocked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-20 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${catTasks.length ? (catComplete / catTasks.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span>{catComplete}/{catTasks.length}</span>
                    </div>
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-slate-100">
                    {catTasks.map(task => (
                      <TaskRow key={task.id} task={task} onStatusChange={updateStatus} onNotesChange={updateNotes} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
