'use client'

import React, { useState, useMemo } from 'react'
import {
  Users,
  AlertTriangle,
  HelpCircle,
  Calendar,
  Layers,
  ChevronRight,
  UserX,
  CheckCircle2,
} from 'lucide-react'
import { TimelineTask } from '@/lib/schema'
import { computeProjectWorkload, DailyAllocation, AssigneeWorkload } from '@/lib/resource/workload-engine'
import { useTranslation } from '@/lib/i18n/context'

interface ResourceWorkloadViewProps {
  tasks: TimelineTask[]
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

export function ResourceWorkloadView({
  tasks,
  onSelectTask,
  selectedTaskId,
}: ResourceWorkloadViewProps) {
  const { locale } = useTranslation()
  const isId = locale === 'id'

  const [capacityLimit, setCapacityLimit] = useState(1)
  const [hoveredCell, setHoveredCell] = useState<{
    assignee: string
    allocation: DailyAllocation
    x: number
    y: number
  } | null>(null)

  const summary = useMemo(() => {
    return computeProjectWorkload(tasks, capacityLimit)
  }, [tasks, capacityLimit])

  const { dateRange, assignees, totalAssignees, overallocatedAssigneesCount, unassignedTasksCount, peakDate } = summary

  if (tasks.length === 0 || dateRange.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-dim">
        <Users className="w-10 h-10 text-on-surface-variant/40 mb-3" />
        <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
          {isId ? 'Belum Ada Data Alokasi Tim' : 'No Resource Allocation Data'}
        </h3>
        <p className="text-xs text-on-surface-variant max-w-sm mt-1">
          {isId
            ? 'Buat beberapa tugas dengan penanggung jawab (assignee) untuk menganalisis kapasitas dan potensi beban berlebih.'
            : 'Add tasks with assignees to analyze capacity distribution and detect over-allocation risks.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface text-on-surface overflow-hidden">
      {/* Top Analytical KPI Strip */}
      <div className="w-full bg-surface-container-low border-b border-border-dark px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Headcount */}
          <div className="flex items-center gap-2 bg-surface-container px-2.5 py-1 rounded border border-border-dark text-xs">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-on-surface-variant">{isId ? 'Anggota Tim:' : 'Team Headcount:'}</span>
            <strong className="font-mono font-semibold text-on-surface">{totalAssignees}</strong>
          </div>

          {/* Over-allocation Alert */}
          {overallocatedAssigneesCount > 0 ? (
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {overallocatedAssigneesCount} {isId ? 'anggota mengalami jadwal bentrok' : 'assignees overbooked'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isId ? 'Semua kapasitas optimal' : 'All workloads balanced'}</span>
            </div>
          )}

          {/* Unassigned Tasks */}
          {unassignedTasksCount > 0 && (
            <div className="flex items-center gap-1.5 bg-surface-container-high border border-border-dark text-on-surface-variant px-2.5 py-1 rounded text-xs">
              <UserX className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {unassignedTasksCount} {isId ? 'tugas tanpa PIC' : 'unassigned tasks'}
              </span>
            </div>
          )}
        </div>

        {/* Capacity Threshold Controls */}
        <div className="flex items-center gap-2">
          <label htmlFor="capacity-select" className="text-xs text-on-surface-variant hidden sm:inline">
            {isId ? 'Batas Kapasitas Harian:' : 'Daily Capacity Limit:'}
          </label>
          <select
            id="capacity-select"
            value={capacityLimit}
            onChange={e => setCapacityLimit(Number(e.target.value))}
            className="bg-surface-container border border-border-dark rounded px-2 py-1 text-xs text-on-surface focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <option value={1}>{isId ? '1 Tugas / Hari (Maks 100%)' : '1 Task / Day (100% max)'}</option>
            <option value={2}>{isId ? '2 Tugas / Hari (Maks 200%)' : '2 Tasks / Day (200% max)'}</option>
            <option value={3}>{isId ? '3 Tugas / Hari (Maks 300%)' : '3 Tasks / Day (300% max)'}</option>
          </select>
        </div>
      </div>

      {/* Main Heatmap Matrix Grid */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse text-left select-none">
          <thead>
            <tr className="bg-surface-container-low border-b border-border-dark sticky top-0 z-20">
              {/* Sticky Assignee Column Header */}
              <th className="sticky left-0 z-30 bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface border-r border-border-dark min-w-[180px] w-[220px]">
                {isId ? 'Penanggung Jawab (PIC)' : 'Team Member / Assignee'}
              </th>

              {/* Date Column Headers */}
              {dateRange.map(d => {
                const parts = d.split('-')
                const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                const dayOfWeek = dateObj.getDay()
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                const isPeak = d === peakDate
                const dayNum = parts[2]
                const monthShort = dateObj.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { month: 'short' })

                return (
                  <th
                    key={d}
                    className={`px-1.5 py-1.5 text-center text-[11px] font-mono border-r border-border-dark/60 min-w-[42px] ${
                      isWeekend
                        ? 'bg-surface-container-lowest/40 text-on-surface-variant/60'
                        : isPeak
                        ? 'bg-amber-500/10 text-amber-400 font-semibold'
                        : 'text-on-surface'
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-wider opacity-70">
                      {dateObj.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { weekday: 'narrow' })}
                    </div>
                    <div>{dayNum}</div>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {assignees.map((person) => {
              const isOverbooked = person.overallocatedDaysCount > 0

              return (
                <tr
                  key={person.assigneeName}
                  className="border-b border-border-dark/60 hover:bg-surface-container-high/30 transition-colors"
                >
                  {/* Sticky Assignee Cell */}
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2 border-r border-border-dark">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold uppercase shrink-0 ${
                            person.isUnassigned
                              ? 'bg-surface-container-highest text-on-surface-variant'
                              : isOverbooked
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-primary/20 text-primary border border-primary/30'
                          }`}
                        >
                          {person.isUnassigned ? '?' : person.assigneeName.slice(0, 2)}
                        </div>
                        <span className="text-xs font-medium text-on-surface truncate">
                          {person.assigneeName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                          {person.totalTasks} {isId ? 'tugas' : 'tasks'}
                        </span>
                        {isOverbooked && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                            title={`${person.overallocatedDaysCount} ${isId ? 'hari bentrok' : 'days overbooked'}`}
                          />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Allocation Heatmap Cells */}
                  {person.allocations.map((alloc) => {
                    const count = alloc.taskCount
                    const isOver = alloc.isOverallocated
                    const isWeekend = alloc.isWeekend

                    // Color assignment based on capacity
                    let cellBg = 'bg-transparent'
                    let textClr = 'text-transparent'
                    let label = ''

                    if (count > 0) {
                      label = `${count}`
                      if (person.isUnassigned) {
                        cellBg = 'bg-surface-container-highest text-on-surface-variant'
                        textClr = 'text-on-surface-variant font-mono font-medium'
                      } else if (isOver) {
                        cellBg = 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-300'
                        textClr = 'text-amber-300 font-mono font-bold'
                      } else {
                        cellBg = 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                        textClr = 'text-emerald-300 font-mono font-medium'
                      }
                    } else if (isWeekend) {
                      cellBg = 'bg-surface-container-lowest/20'
                    }

                    return (
                      <td
                        key={alloc.date}
                        onMouseEnter={(e) => {
                          if (count > 0) {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setHoveredCell({
                              assignee: person.assigneeName,
                              allocation: alloc,
                              x: rect.left,
                              y: rect.bottom,
                            })
                          }
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-9 text-center border-r border-border-dark/40 cursor-default transition-colors ${cellBg}`}
                      >
                        <span className={`text-[11px] ${textClr}`}>
                          {label}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Hover Details Card */}
      {hoveredCell && (
        <div
          role="tooltip"
          className="fixed z-50 bg-surface-container-high/95 backdrop-blur-sm border border-border-dark p-3 rounded-lg shadow-xl text-xs max-w-xs animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
          style={{
            left: Math.min(window.innerWidth - 300, Math.max(10, hoveredCell.x - 40)),
            top: Math.min(window.innerHeight - 200, hoveredCell.y + 8),
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border-dark/60 pb-1.5 mb-2">
            <span className="font-semibold text-on-surface truncate">
              {hoveredCell.assignee}
            </span>
            <span className="font-mono text-[11px] text-on-surface-variant">
              {hoveredCell.allocation.dayLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                hoveredCell.allocation.isOverallocated
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {hoveredCell.allocation.loadFactor * 100}% {isId ? 'Beban' : 'Capacity'}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              ({hoveredCell.allocation.taskCount} {isId ? 'tugas aktif' : 'active tasks'})
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {hoveredCell.allocation.tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTask?.(t.id)}
                className={`flex items-center justify-between gap-2 p-1.5 rounded text-left transition-colors ${
                  selectedTaskId === t.id
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-surface-container hover:bg-surface-container-highest text-on-surface'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {t.isCritical && (
                    <span className="text-status-critical font-bold shrink-0" title="Critical Path Task">
                      ⚡
                    </span>
                  )}
                  <span className="truncate text-xs">{t.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-on-surface-variant">
                  <span className="font-mono text-[10px]">{t.progress}%</span>
                  <ChevronRight className="w-3 h-3 opacity-60" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
