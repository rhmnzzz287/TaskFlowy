'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Play, Download, Settings, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BarChart3, Table2, GitBranch, BrainCircuit } from 'lucide-react'
import { RowEditor } from '@/components/task-input/row-editor'
import { ReviewTable } from '@/components/parse-review/review-table'
import { AssigneeFilter } from '@/components/assignee-filter/filter-bar'
import { GanttBoard } from '@/components/gantt-board/gantt-board'
import { ExportButton } from '@/components/export-csv/export-button'
import { StatusBanner } from '@/components/ui/status-banner'
import { InspectorDrawer } from '@/components/inspector/inspector-drawer'
import { LegendBar } from '@/components/ui/legend-bar'
import { AmbiguityAlert } from '@/components/ui/ambiguity-alert'
import { ParseTelemetryCard } from '@/components/ui/parse-telemetry-card'
import {
  ParseRowState,
  TimelineTask,
  TimelineDependency,
  createRowId,
  createDepId,
  todayRef,
  DEFAULT_TIMEZONE,
  computeCriticalPath,
  detectCycles,
} from '@/lib/schema'
import { parseRows } from '@/lib/parser/row-parser'

export default function Home() {
  const [inputRows, setInputRows] = useState<ParseRowState[]>([
    { id: createRowId(), name: '', assignee: '', start: '', duration: '', end: '', dependsOn: '' },
  ])
  const [tasks, setTasks] = useState<TimelineTask[]>([])
  const [dependencies, setDependencies] = useState<TimelineDependency[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [compactWorkbench, setCompactWorkbench] = useState(false)

  const handleParse = useCallback(() => {
    const referenceDate = todayRef()
    const parseInputs = inputRows.map(r => ({
      name: r.name,
      assignee: r.assignee || null,
      start: r.start,
      duration: r.duration || null,
      end: r.end || null,
    }))

    const result = parseRows(parseInputs, referenceDate)
    const errMap: Record<string, string> = {}
    for (const [idx, errs] of Object.entries(result.errors)) {
      const rowId = inputRows[parseInt(idx)]?.id
      if (rowId) errMap[rowId] = errs[0]
    }
    setErrors(errMap)

    if (Object.keys(errMap).length === 0) {
      // Build dependencies from row's dependsOn field
      const deps: TimelineDependency[] = []
      const nameToId = new Map(result.tasks.map(t => [t.name, t.id]))
      inputRows.forEach((r, i) => {
        const depName = r.dependsOn?.trim()
        if (depName && nameToId.has(depName) && i < result.tasks.length) {
          deps.push({ id: createDepId(), sourceId: nameToId.get(depName)!, targetId: result.tasks[i].id, type: 'FS' })
        }
      })

      // Compute critical path
      const tasksWithMeta = result.tasks.map(t => ({
        ...t,
        progress: parseInt(inputRows.find(r => r.id === result.tasks.find(rt => rt.id === t.id)?.id)?.progress || '0'),
        isMilestone: t.durationDays === 0,
        status: 'in-progress' as const,
      }))
      const criticalIds = computeCriticalPath(tasksWithMeta, deps)
      const cycles = detectCycles(tasksWithMeta, deps)

      setTasks(tasksWithMeta.map(t => ({
        ...t,
        isCritical: criticalIds.has(t.id),
        color: criticalIds.has(t.id) ? '#EA580C' : undefined,
      })))
      setDependencies(deps)
      setWarnings([...result.warnings, ...cycles])
      setHasGenerated(true)
    }
  }, [inputRows])

  const handleTasksChange = useCallback((updated: TimelineTask[]) => {
    setTasks(updated)
  }, [])

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
  }, [])

  const handleCloseInspector = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  const handleUpdateTaskFromInspector = useCallback((updated: TimelineTask) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }, [])

  const canGenerate = inputRows.some(r => r.name.trim().length > 0)
  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* === HEADER === */}
      <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="#4F46E5" />
            <rect x="8" y="12" width="14" height="4" rx="2" fill="#FFFFFF" />
            <rect x="18" y="19" width="14" height="4" rx="2" fill="#38BDF8" />
            <rect x="12" y="26" width="18" height="4" rx="2" fill="#818CF8" />
            <path d="M22 16L22 19M26 23L26 26" stroke="#C7D2FE" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
          <h1 className="text-text-primary text-[15px] font-semibold tracking-tight">Text-to-Gantt</h1>
          <span className="px-1.5 py-0.5 bg-surface-hi rounded text-primary font-medium text-[11px] uppercase tracking-wide">Scheduler v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          {hasGenerated && (
            <>
              <span className="text-muted text-[12px] font-mono">{tasks.length} tasks</span>
              <span className="text-muted">•</span>
            </>
          )}
          <button className="btn-primary" onClick={handleParse} disabled={!canGenerate}>
            <Play size={14} />
            <span>Generate Timeline</span>
          </button>
          {hasGenerated && <ExportButton tasks={tasks} />}
        </div>
      </header>

      {/* === WORKBENCH: sidebar nav + master-detail + inspector === */}
      <div className="flex-1 flex min-h-0">
        {/* === LEFT SIDEBAR NAV (mockup: waterfall_chart, table_rows, account_tree, psychology, settings) === */}
        <nav className="w-12 bg-surface border-r border-border flex flex-col items-center py-2 gap-2 shrink-0 z-20">
          <button className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${true ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`} title="Gantt"><BarChart3 size={16} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors" title="Table"><Table2 size={16} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors" title="Dependency"><GitBranch size={16} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors" title="Analysis"><BrainCircuit size={16} /></button>
          <div className="flex-1" />
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors" title="Settings"><Settings size={16} /></button>
        </nav>

        {/* === CONTENT: two-column master-detail === */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* --- Workbench header (collapsible prompt/input area) --- */}
          <section className={`bg-surface-dim border-b border-border transition-all ${compactWorkbench ? '' : ''}`}>
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-text-primary text-[13px] font-semibold tracking-tight">Schedule Builder</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary text-[12px]" onClick={() => setCompactWorkbench(!compactWorkbench)}>
                  {compactWorkbench ? 'Expand' : 'Compact'}
                </button>
              </div>
            </div>
            {!compactWorkbench && (
              <div className="px-3 pb-2">
                <RowEditor rows={inputRows} onChange={setInputRows} errors={errors} />
                {hasGenerated && (
                  <div className="mt-2">
                    <AssigneeFilter tasks={tasks} selected={selectedAssignees} onChange={setSelectedAssignees} />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* --- Ambiguity/validation alert tray --- */}
          {hasGenerated && warnings.length > 0 && (
            <AmbiguityAlert warnings={warnings} />
          )}

          {/* --- Timeline controls toolbar --- */}
          <div className="h-10 bg-surface border-b border-border flex items-center justify-between px-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center bg-surface-hi/30 rounded overflow-hidden">
                <button className="px-2.5 py-1 text-[12px] text-muted hover:text-text-primary transition-colors">Day</button>
                <button className="px-2.5 py-1 text-[12px] bg-primary/20 text-primary font-medium">Week</button>
                <button className="px-2.5 py-1 text-[12px] text-muted hover:text-text-primary transition-colors">Month</button>
              </div>
              <div className="flex items-center gap-1 ml-1">
                <button className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors"><ChevronLeft size={14} /></button>
                <button className="px-2 py-0.5 rounded text-[12px] text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors">Today</button>
                <button className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasGenerated && <AssigneeFilter tasks={tasks} selected={selectedAssignees} onChange={setSelectedAssignees} />}
              <label className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-hi/20 text-[11px] text-critical font-medium cursor-pointer select-none">
                <input type="checkbox" className="w-3 h-3 accent-critical rounded cursor-pointer" defaultChecked />
                Critical Path
              </label>
              <div className="hidden md:flex items-center gap-1">
                <ZoomOut size={14} className="text-muted" />
                <input type="range" className="w-16 h-1 accent-primary bg-surface-hi/40 rounded cursor-pointer" min={1} max={5} defaultValue={3} />
                <ZoomIn size={14} className="text-muted" />
              </div>
            </div>
          </div>

          {/* --- Master-detail workspace --- */}
          <div className="flex-1 flex min-h-0">
            {/* LEFT — task grid (390px) */}
            {hasGenerated && (
              <div className="w-[390px] xl:w-[420px] shrink-0 border-r border-border bg-surface/30 flex flex-col">
                <ReviewTable tasks={tasks} warnings={[]} compact onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
              </div>
            )}

            {/* RIGHT — Gantt + legend */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Telemetry card (compact, top-right above Gantt) */}
              {hasGenerated && tasks.length > 0 && (
                <ParseTelemetryCard tasks={tasks} timezone={DEFAULT_TIMEZONE} />
              )}

              <div className="flex-1 flex flex-col min-h-0">
                <GanttBoard
                  tasks={tasks}
                  selectedAssignees={selectedAssignees}
                  onTasksChange={handleTasksChange}
                  onSelectTask={handleSelectTask}
                />
                <LegendBar tasks={tasks} warnings={warnings} />
              </div>
            </div>
          </div>
        </div>

        {/* === RIGHT — INSPECTOR DRAWER (330px slide-over) === */}
        {selectedTask && (
          <InspectorDrawer
            task={selectedTask}
            onClose={handleCloseInspector}
            onUpdate={handleUpdateTaskFromInspector}
          />
        )}
      </div>
    </div>
  )
}