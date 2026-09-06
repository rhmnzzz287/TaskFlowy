'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Play, Download, Image, Share2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  BarChart3, Table2, GitBranch, Loader2, FileText, ImageDown, Copy, Check,
} from 'lucide-react'
import { RowEditor } from '@/components/task-input/row-editor'
import { RawTextEditor } from '@/components/task-input/raw-text-editor'
import { ReviewTable } from '@/components/parse-review/review-table'
import { AssigneeFilter } from '@/components/assignee-filter/filter-bar'
import { GanttBoard } from '@/components/gantt-board/gantt-board'
import { LegendBar } from '@/components/ui/legend-bar'
import { AmbiguityAlert } from '@/components/ui/ambiguity-alert'
import { ParseTelemetryBar } from '@/components/ui/parse-telemetry-bar'
import { TableView } from '@/components/table-view/table-view'
import { DependencyView } from '@/components/dependency-view/dependency-view'
import { TemplatePicker } from '@/components/task-input/template-picker'
import { InspectorDrawer } from '@/components/inspector/inspector-drawer'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import type { GanttBoardHandle } from '@/components/gantt-board/gantt-board'
import {
  ParseRowState, TimelineTask, TimelineDependency,
  createRowId, createDepId, todayRef, DEFAULT_TIMEZONE,
  computeCriticalPath, detectCycles,
} from '@/lib/schema'
import { parseRows } from '@/lib/parser/row-parser'
import { parseRawText, tasksToRawText } from '@/lib/format/raw-text'
import { encodeRowsToHash, decodeHashToRows, pushHash } from '@/lib/url-state'
import { exportGanttPNG, exportGanttSVG } from '@/lib/visual-exporter'
import { useDrafts } from '@/hooks/use-drafts'

type InputMode = 'raw' | 'table'

export default function Home() {
  const { saveDraft, listDrafts } = useDrafts()
  const [inputMode, setInputMode] = useState<InputMode>('raw')
  const [rawText, setRawText] = useState('')
  const [inputRows, setInputRows] = useState<ParseRowState[]>([
    { id: createRowId(), name: '', assignee: '', start: '', duration: '', end: '', dependsOn: '' },
  ])
  const [tasks, setTasks] = useState<TimelineTask[]>([])
  const [dependencies, setDependencies] = useState<TimelineDependency[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [view, setView] = useState<'gantt' | 'table' | 'dependency'>('gantt')
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week')
  const [showCritical, setShowCritical] = useState(true)
  const [zoom, setZoom] = useState(3)
  const [copiedLink, setCopiedLink] = useState(false)
  const ganttRef = useRef<GanttBoardHandle>(null)

  // On mount: restore from URL hash or autosave
  useEffect(() => {
    const hashRows = decodeHashToRows()
    if (hashRows && hashRows.length > 0) {
      const restored = hashRows.map(r => ({ id: createRowId(), ...r })) as ParseRowState[]
      setInputRows(restored)
      setRawText(tasksToRawText([]))
    }
  }, [])

  // Build raw text from rows when in table mode
  const syncRawFromRows = useCallback((rows: ParseRowState[]) => {
    if (inputMode === 'table') {
      setRawText(rows.map(r => `${r.name || '-'} | ${r.assignee} | ${r.start} | ${r.duration} | ${r.end}`).join('\n'))
    }
  }, [inputMode])

  // Parse rows — either from raw text or from row editor
  const handleParse = useCallback(() => {
    setIsParsing(true)
    window.setTimeout(() => {
      // If in raw mode, convert raw text to rows first
      let rows = inputRows
      if (inputMode === 'raw' && rawText.trim()) {
        rows = parseRawText(rawText)
        setInputRows(rows)
      }
      const referenceDate = todayRef()
      const parseInputs = rows.map(r => ({
        name: r.name,
        assignee: r.assignee || null,
        start: r.start,
        duration: r.duration || null,
        end: r.end || null,
      }))
      const result = parseRows(parseInputs, referenceDate)
      const errMap: Record<string, string> = {}
      for (const [idx, errs] of Object.entries(result.errors)) {
        const rowId = rows[parseInt(idx)]?.id
        if (rowId) errMap[rowId] = errs[0]
      }
      setErrors(errMap)
      if (Object.keys(errMap).length === 0) {
        const deps: TimelineDependency[] = []
        const nameToId = new Map(result.tasks.map(t => [t.name, t.id]))
        rows.forEach((r, i) => {
          const depName = r.dependsOn?.trim()
          if (depName && nameToId.has(depName) && i < result.tasks.length) {
            deps.push({ id: createDepId(), sourceId: nameToId.get(depName)!, targetId: result.tasks[i].id, type: 'FS' })
          }
        })
        const tasksWithMeta = result.tasks.map((t, i) => ({
          ...t,
          progress: parseInt(rows[i]?.progress || '0'),
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
        // Autosave draft
        saveDraft(rows)
      }
      setIsParsing(false)
    }, 30)
  }, [inputRows, rawText, inputMode, saveDraft])

  const handleTemplateSelect = useCallback((rows: ParseRowState[]) => {
    setInputRows(rows)
    setRawText(rows.map(r => `${r.name} | ${r.assignee} | ${r.start} | ${r.duration} | ${r.end}`).join('\n'))
    setHasGenerated(false)
    setTasks([])
    setWarnings([])
    setErrors({})
  }, [])

  const handleShareLink = useCallback(() => {
    const hash = encodeRowsToHash(inputRows)
    pushHash(hash)
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
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

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selectedTaskId === taskId) setSelectedTaskId(null)
  }, [selectedTaskId])

  const handleUpdateTaskFromInspector = useCallback((updated: TimelineTask) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }, [])

  const canGenerate = inputMode === 'raw' ? rawText.trim().length > 0 : inputRows.some(r => r.name.trim().length > 0)
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
          <h1 className="text-text-primary text-[15px] font-semibold tracking-tight">TaskFlowy Gantt</h1>
          <span className="text-muted text-[11px] font-mono tracking-wide">v1.0</span>
          <div className="ml-2"><TemplatePicker onSelect={handleTemplateSelect} /></div>
        </div>
        <div className="flex items-center gap-2">
          {hasGenerated && (
            <>
              <span className="text-muted text-[12px] font-mono">{tasks.length} tasks</span>
              <button className="btn-secondary text-[11px]" onClick={exportGanttPNG} title="Export PNG">
                <Image size={13} /> PNG
              </button>
              <button className="btn-secondary text-[11px]" onClick={exportGanttSVG} title="Export SVG">
                <ImageDown size={13} /> SVG
              </button>
            </>
          )}
          <button className="btn-secondary text-[11px]" onClick={handleShareLink} title="Copy share link">
            {copiedLink ? <Check size={13} className="text-completed" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copiedLink ? 'Tersalin' : 'Share'}</span>
          </button>
          <button className="btn-primary" onClick={handleParse} disabled={!canGenerate || isParsing}>
            {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{isParsing ? 'Parsing…' : 'Generate Timeline'}</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* === WORKBENCH === */}
      <div className="flex-1 flex min-h-0">
        {/* === LEFT SIDEBAR NAV === */}
        <nav className="w-12 bg-surface border-r border-border flex flex-col items-center py-2 gap-2 shrink-0 z-20">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'gantt' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
            title="Gantt" onClick={() => setView('gantt')}><BarChart3 size={16} /></button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'table' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
            title="Table" onClick={() => setView('table')}><Table2 size={16} /></button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'dependency' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
            title="Dependency" onClick={() => setView('dependency')}><GitBranch size={16} /></button>
        </nav>

        {/* === CONTENT === */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* --- Input area: Raw Text / Table tabs --- */}
          <section className="bg-surface-dim border-b border-border">
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-1 bg-surface-hi/30 rounded overflow-hidden">
                <button
                  className={`px-3 py-1 text-[12px] transition-colors ${inputMode === 'raw' ? 'bg-primary/20 text-primary font-medium' : 'text-muted hover:text-text-primary'}`}
                  onClick={() => setInputMode('raw')}>
                  <FileText size={13} className="inline mr-1" />Raw Text
                </button>
                <button
                  className={`px-3 py-1 text-[12px] transition-colors ${inputMode === 'table' ? 'bg-primary/20 text-primary font-medium' : 'text-muted hover:text-text-primary'}`}
                  onClick={() => setInputMode('table')}>
                  <Table2 size={13} className="inline mr-1" />Table Rows
                </button>
              </div>
            </div>
            <div className="px-3 pb-2">
              {inputMode === 'raw' ? (
                <RawTextEditor
                  value={rawText}
                  onChange={setRawText}
                  onParse={handleParse}
                />
              ) : (
                <RowEditor rows={inputRows} onChange={(r) => { setInputRows(r); syncRawFromRows(r) }} errors={errors} />
              )}
            </div>
          </section>

          {/* --- Ambiguity/validation alert --- */}
          {hasGenerated && warnings.length > 0 && (
            <AmbiguityAlert warnings={warnings} />
          )}

          {/* --- Timeline controls toolbar --- */}
          <div className="h-10 bg-surface border-b border-border flex items-center justify-between px-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center bg-surface-hi/30 rounded overflow-hidden">
                {(['Day', 'Week', 'Month'] as const).map(m => (
                  <button key={m}
                    className={`px-2.5 py-1 text-[12px] transition-colors ${viewMode === m ? 'bg-primary/20 text-primary font-medium' : 'text-muted hover:text-text-primary'}`}
                    onClick={() => setViewMode(m)}>{m}</button>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-1">
                <button className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors"
                  onClick={() => ganttRef.current?.scrollLeft(-200)}><ChevronLeft size={14} /></button>
                <button className="px-2 py-0.5 rounded text-[12px] text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors"
                  onClick={() => ganttRef.current?.scrollToToday()}>Today</button>
                <button className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors"
                  onClick={() => ganttRef.current?.scrollLeft(200)}><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasGenerated && <AssigneeFilter tasks={tasks} selected={selectedAssignees} onChange={setSelectedAssignees} />}
              <label className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-hi/20 text-[11px] text-critical font-medium cursor-pointer select-none">
                <input type="checkbox" className="w-3 h-3 accent-critical rounded cursor-pointer"
                  checked={showCritical} onChange={e => setShowCritical(e.target.checked)} />
                Critical Path
              </label>
              <div className="hidden md:flex items-center gap-1">
                <button className="p-0.5 rounded text-muted hover:text-text-primary transition-colors"
                  onClick={() => setZoom(z => Math.max(1, z - 1))}><ZoomOut size={14} /></button>
                <input type="range" className="w-16 h-1 accent-primary bg-surface-hi/40 rounded cursor-pointer"
                  min={1} max={5} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
                <button className="p-0.5 rounded text-muted hover:text-text-primary transition-colors"
                  onClick={() => setZoom(z => Math.min(5, z + 1))}><ZoomIn size={14} /></button>
              </div>
            </div>
          </div>

          {/* --- Master-detail workspace --- */}
          {view === 'gantt' ? (
          <div className="flex-1 flex min-h-0">
            {hasGenerated && (
              <div className="w-[390px] xl:w-[420px] shrink-0 border-r border-border bg-surface/30 flex flex-col">
                <ReviewTable tasks={tasks} warnings={[]} compact onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
              </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
              {!hasGenerated ? (
                <div className="flex-1 flex items-center justify-center bg-surface-dim">
                  <div className="max-w-md text-center px-6 py-10">
                    <div className="mx-auto w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
                      <BarChart3 size={20} className="text-primary" />
                    </div>
                    <h3 className="text-text-primary text-[15px] font-semibold mb-2">Turn your schedule into a timeline</h3>
                    <p className="text-muted text-[13px] leading-relaxed">
                      Paste a project schedule in plain language. TaskFlowy will extract tasks,
                      dates, and owners, then render an editable Gantt chart you can adjust and export.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {tasks.length > 0 && <ParseTelemetryBar tasks={tasks} timezone={DEFAULT_TIMEZONE} />}
                  <div className="flex-1 flex flex-col min-h-0">
                    <GanttBoard
                      ref={ganttRef}
                      tasks={tasks}
                      selectedAssignees={selectedAssignees}
                      onTasksChange={handleTasksChange}
                      onSelectTask={handleSelectTask}
                      viewMode={viewMode}
                      showCritical={showCritical}
                      zoom={zoom}
                    />
                    <LegendBar tasks={tasks} warnings={warnings} />
                  </div>
                </>
              )}
            </div>
          </div>
          ) : view === 'table' ? (
            <div className="flex-1 flex min-h-0">
              <TableView tasks={tasks} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} onTasksChange={handleTasksChange} />
            </div>
          ) : (
            <div className="flex-1 flex min-h-0">
              <DependencyView tasks={tasks} dependencies={dependencies} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
            </div>
          )}
        </div>

        {/* === INSPECTOR DRAWER === */}
        {selectedTask && (
          <InspectorDrawer
            task={selectedTask}
            onClose={handleCloseInspector}
            onUpdate={handleUpdateTaskFromInspector}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
    </div>
  )
}