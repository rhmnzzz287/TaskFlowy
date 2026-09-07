'use client'

import React, { useMemo } from 'react'
import {
  Grid,
  AlertTriangle,
  Link2,
  Trash2,
  CheckCircle2,
  Plus,
  HelpCircle,
  Scissors,
} from 'lucide-react'
import { TimelineTask, TimelineDependency, findCyclicEdgeIds } from '@/lib/schema'
import { useTranslation } from '@/lib/i18n/context'

interface DependencyMatrixViewProps {
  tasks: TimelineTask[]
  dependencies: TimelineDependency[]
  onToggleDependency: (sourceTaskId: string, targetTaskId: string) => void
  onBreakCycle?: (sourceTaskId: string, targetTaskId: string) => void
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

export function DependencyMatrixView({
  tasks,
  dependencies,
  onToggleDependency,
  onBreakCycle,
  onSelectTask,
  selectedTaskId,
}: DependencyMatrixViewProps) {
  const { locale } = useTranslation()
  const isId = locale === 'id'

  // Map of existing dependencies: "sourceId->targetId" -> TimelineDependency
  const depMap = useMemo(() => {
    const map = new Map<string, TimelineDependency>()
    dependencies.forEach(d => {
      map.set(`${d.sourceId}->${d.targetId}`, d)
    })
    return map
  }, [dependencies])

  // Set of dependency IDs that form loops
  const cyclicEdgeIds = useMemo(() => {
    return findCyclicEdgeIds(tasks, dependencies)
  }, [tasks, dependencies])

  // Find first cyclic dependency for quick 1-click break
  const firstCyclicDep = useMemo(() => {
    return dependencies.find(d => cyclicEdgeIds.has(d.id)) || null
  }, [dependencies, cyclicEdgeIds])

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-dim">
        <Grid className="w-10 h-10 text-on-surface-variant/40 mb-3" />
        <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
          {isId ? 'Matriks Ketergantungan Kosong' : 'No Dependency Matrix Data'}
        </h3>
        <p className="text-xs text-on-surface-variant max-w-sm mt-1">
          {isId
            ? 'Tambahkan tugas di editor untuk mulai memetakan dan mengelola relasi antar tugas.'
            : 'Add tasks in the editor to inspect and configure task couplings.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface text-on-surface overflow-hidden">
      {/* Top Analytical Bar: Matrix Stats & Cycle Alert */}
      <div className="w-full bg-surface-container-low border-b border-border-dark px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Total Coupling Links */}
          <div className="flex items-center gap-2 bg-surface-container px-2.5 py-1 rounded border border-border-dark text-xs">
            <Link2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-on-surface-variant">{isId ? 'Total Relasi:' : 'Total Dependencies:'}</span>
            <strong className="font-mono font-semibold text-on-surface">{dependencies.length}</strong>
          </div>

          {/* Cycle / Loop Warning */}
          {cyclicEdgeIds.size > 0 ? (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-400 px-2.5 py-1 rounded text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {cyclicEdgeIds.size} {isId ? 'siklus sirkular (loop) terdeteksi!' : 'cyclic feedback loops detected!'}
              </span>
              {firstCyclicDep && onBreakCycle && (
                <button
                  type="button"
                  onClick={() => onBreakCycle(firstCyclicDep.sourceId, firstCyclicDep.targetId)}
                  className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px] font-semibold transition-colors"
                  title="Sever the loop-causing dependency"
                >
                  <Scissors className="w-3 h-3" />
                  <span>{isId ? 'Putus Siklus' : 'Break Loop'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isId ? 'Struktur DAG Valid (Bebas Siklus)' : 'Acyclic DAG Validated'}</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-semibold">
              FS
            </span>
            <span>Finish-to-Start</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-semibold">
              Loop
            </span>
            <span>{isId ? 'Sirkular' : 'Cycle Conflict'}</span>
          </div>
        </div>
      </div>

      {/* Main N x N Matrix Grid */}
      <div className="flex-1 overflow-auto relative">
        <table className="border-collapse text-left select-none">
          <thead>
            <tr className="bg-surface-container-low border-b border-border-dark sticky top-0 z-20">
              {/* Top-Left Corner: Explanatory Label */}
              <th className="sticky left-0 z-30 bg-surface-container-low p-2 text-xs font-semibold text-on-surface border-r border-border-dark min-w-[200px] w-[240px]">
                <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
                  <span>Predecessor (Baris ↓)</span>
                  <span>Successor (Kolom →)</span>
                </div>
              </th>

              {/* Column Headers (Successors) */}
              {tasks.map((task, j) => (
                <th
                  key={task.id}
                  title={`${task.name} (${task.durationDays}d)`}
                  className={`p-1 text-center text-[11px] font-mono border-r border-border-dark/60 min-w-[40px] max-w-[40px] ${
                    selectedTaskId === task.id ? 'bg-primary/20 text-primary font-semibold' : 'text-on-surface'
                  }`}
                >
                  <div className="w-8 mx-auto truncate font-bold" title={task.name}>
                    {j + 1}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {tasks.map((rowTask, i) => (
              <tr
                key={rowTask.id}
                className="border-b border-border-dark/60 hover:bg-surface-container-high/30 transition-colors"
              >
                {/* Sticky Row Header (Predecessors) */}
                <td
                  onClick={() => onSelectTask?.(rowTask.id)}
                  className={`sticky left-0 z-10 bg-surface px-3 py-1.5 border-r border-border-dark cursor-pointer transition-colors ${
                    selectedTaskId === rowTask.id ? 'bg-primary/10 text-primary font-semibold' : 'text-on-surface'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] text-on-surface-variant w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs truncate" title={rowTask.name}>
                        {rowTask.name}
                      </span>
                    </div>
                    {rowTask.isMilestone && (
                      <span className="text-[10px] text-primary px-1 bg-primary/10 rounded font-mono shrink-0">
                        ◆
                      </span>
                    )}
                  </div>
                </td>

                {/* Matrix Cells */}
                {tasks.map((colTask, j) => {
                  const isDiagonal = i === j
                  const dep = depMap.get(`${rowTask.id}->${colTask.id}`)
                  const isCyclic = dep && cyclicEdgeIds.has(dep.id)

                  if (isDiagonal) {
                    return (
                      <td
                        key={colTask.id}
                        className="bg-surface-container-highest/40 border-r border-border-dark/40 text-center cursor-not-allowed"
                        title="Self-dependency not permitted"
                      >
                        <span className="text-on-surface-variant/30 text-[10px] select-none">•</span>
                      </td>
                    )
                  }

                  return (
                    <td
                      key={colTask.id}
                      onClick={() => onToggleDependency(rowTask.id, colTask.id)}
                      className={`h-8 border-r border-border-dark/40 text-center cursor-pointer transition-colors group ${
                        isCyclic
                          ? 'bg-red-500/25 hover:bg-red-500/40 text-red-300 font-bold'
                          : dep
                          ? 'bg-primary/20 hover:bg-primary/30 text-primary font-semibold'
                          : 'hover:bg-surface-container-high/60 text-transparent hover:text-on-surface-variant'
                      }`}
                      title={
                        isCyclic
                          ? `Dependency loop! Click to sever link between "${rowTask.name}" and "${colTask.name}"`
                          : dep
                          ? `Click to sever dependency: "${rowTask.name}" → "${colTask.name}"`
                          : `Click to add dependency: "${rowTask.name}" → "${colTask.name}"`
                      }
                    >
                      {dep ? (
                        <span className="font-mono text-[11px] select-none">
                          {dep.type || 'FS'}
                        </span>
                      ) : (
                        <Plus className="w-3 h-3 mx-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
