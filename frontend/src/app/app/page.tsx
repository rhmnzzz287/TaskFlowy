'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Play, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  BarChart3, Table2, GitBranch, Loader2, Check, Upload,
} from 'lucide-react'
import { RowEditor } from '@/components/task-input/row-editor'
import { parseSpreadsheetText } from '@/lib/format/spreadsheet-parser'
import { ReviewTable } from '@/components/parse-review/review-table'
import { AssigneeFilter } from '@/components/assignee-filter/filter-bar'
import { GanttBoard } from '@/components/gantt-board/gantt-board'
import { LegendBar } from '@/components/ui/legend-bar'
import { ProjectMetricsStrip } from '@/components/ui/project-metrics-strip'
import { AmbiguityAlert } from '@/components/ui/ambiguity-alert'
import { ParseTelemetryBar } from '@/components/ui/parse-telemetry-bar'
import { TableView } from '@/components/table-view/table-view'
import { DependencyView } from '@/components/dependency-view/dependency-view'
import { TemplatePicker, getDefaultTemplate } from '@/components/task-input/template-picker'
import { InspectorDrawer } from '@/components/inspector/inspector-drawer'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { HeaderActionsMenu } from '@/components/ui/header-actions-menu'
import { LogoMark } from '@/components/ui/logo'
import { useTranslation } from '@/lib/i18n/context'
import type { GanttBoardHandle } from '@/components/gantt-board/gantt-board'
import {
  ParseRowState, TimelineTask, TimelineDependency,
  createRowId, createDepId, todayRef, DEFAULT_TIMEZONE,
  computeCriticalPath, detectCycles, compareTasksByDate,
} from '@/lib/schema'
import { parseRawText, rowsToRawText } from '@/lib/format/raw-text'
import { parseRows } from '@/lib/parser/row-parser'
import { parseDate, formatDateISO } from '@/lib/parser/date-grammar'
import { decodeHashToRows } from '@/lib/url-state'
import { useDrafts } from '@/hooks/use-drafts'
import { ProfileDashboardModal } from '@/components/profile/profile-dashboard-modal'
import { AvatarIcon } from '@/components/profile/avatar-icon'
import { loadUserProfile } from '@/lib/profile-store'

export default function Home() {
  const { t, locale } = useTranslation()
  const { saveDraft, loadDraft, listDrafts, deleteDraft, currentDraftId } = useDrafts()
  const [activeTemplate, setActiveTemplate] = useState<string | null>('software-sprint')
  const [rawText, setRawText] = useState('')
  const [inputRows, setInputRows] = useState<ParseRowState[]>([])
  const [tasks, setTasks] = useState<TimelineTask[]>([])
  const [dependencies, setDependencies] = useState<TimelineDependency[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [generationTick, setGenerationTick] = useState(0)
  const [generateSuccess, setGenerateSuccess] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  // Name of the task the chart should reveal on the next task-set change
  // (new/renamed task). Identity tracks by NAME because task ids regenerate
  // on every parse.
  const [focusTaskName, setFocusTaskName] = useState<string | null>(null)
  const prevTaskNamesRef = useRef<Set<string>>(new Set())
  const [view, setView] = useState<'gantt' | 'table' | 'dependency'>('gantt')
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week')
  const [showCritical, setShowCritical] = useState(true)
  const [zoom, setZoom] = useState(3)
  const [drafts, setDrafts] = useState<ReturnType<typeof listDrafts>>([])
  const [showDrafts, setShowDrafts] = useState(false)
  const ganttRef = useRef<GanttBoardHandle>(null)
  const restoredRef = useRef(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [headerProfile, setHeaderProfile] = useState({ name: 'Pengguna', avatarIcon: 'user' })

  // Keep the navbar avatar in sync with the saved profile (mount + localStorage
  // writes from other tabs/modals). Also load the saved draft list once so the
  // header actions menu shows the real draft count without being opened first.
  useEffect(() => {
    const sync = () => setHeaderProfile(loadUserProfile())
    sync()
    setDrafts(listDrafts())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [listDrafts])

  // Core parse logic: runs against provided rows.
  // silent = background auto-update: renders on success, never flashes the error banner.
  const runParse = useCallback((rows: ParseRowState[], silent = false) => {
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
    const errList: string[] = []
    for (const [idx, errs] of Object.entries(result.errors)) {
      errList.push(`Baris ${+idx + 1}: ${errs[0]}`)
      const rowId = rows[parseInt(idx)]?.id
      if (rowId) errMap[rowId] = errs[0]
    }
    if (!silent) setParseErrors(errList)
    setErrors(errMap)

    // Partial render: rows that parsed cleanly still build the chart; broken
    // rows are ringed individually. (Previously the first invalid row blocked
    // the ENTIRE chart, which reads as "generate does nothing" while typing.)
    const badIdx = new Set(Object.keys(result.errors).map(Number))
    const goodRows = rows.filter((_, i) => !badIdx.has(i))
    const goodTasks = result.tasks.filter((_, i) => !badIdx.has(i))
    if (goodTasks.length === 0) return false

    const deps: TimelineDependency[] = []
    const nameToId = new Map(goodTasks.map(t => [t.name, t.id]))
    goodRows.forEach((r, i) => {
      const depName = r.dependsOn?.trim()
      if (depName && nameToId.has(depName) && i < goodTasks.length) {
        deps.push({ id: createDepId(), sourceId: nameToId.get(depName)!, targetId: goodTasks[i].id, type: 'FS' })
      }
    })
    const tasksWithMeta = goodTasks.map((t, i) => ({
      ...t,
      progress: parseInt(goodRows[i]?.progress || '0'),
      isMilestone: t.durationDays === 0,
      dependsOn: goodRows[i]?.dependsOn?.trim() || null,
    }))
    const criticalIds = computeCriticalPath(tasksWithMeta, deps)
    const cycles = detectCycles(tasksWithMeta, deps)
    // Bar fill/stroke is owned by the stylesheet (.bar-critical rules) so it
    // stays theme-aware (no inline color here).
    // Display order is chronological: any add/date change re-slots the chart.
    const sorted = tasksWithMeta
      .map(t => ({ ...t, isCritical: criticalIds.has(t.id) }))
      .sort(compareTasksByDate)
    const known = prevTaskNamesRef.current
    const added = sorted.find(t => !known.has(t.name))
    prevTaskNamesRef.current = new Set(sorted.map(t => t.name))
    setFocusTaskName(added ? added.name : null)
    setTasks(sorted)
    setDependencies(deps)
    setWarnings([...result.warnings, ...cycles])
    setHasGenerated(true)
    saveDraft(rows)
    return true
  }, [saveDraft])

  // On mount: restore from URL hash, else from latest autosave draft, else load default template (first use).
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    let rows: ParseRowState[] | null = null
    const hashRows = decodeHashToRows()
    if (hashRows && hashRows.length > 0) {
      rows = hashRows.map(r => ({ id: createRowId(), ...r })) as ParseRowState[]
      setActiveTemplate(null)
    } else {
      const list = listDrafts()
      if (list.length > 0) {
        rows = loadDraft(list[0].id)
        setActiveTemplate(null)
      }
    }
    if (rows && rows.length > 0) {
      setInputRows(rows)
      setRawText(rowsToRawText(rows))
      runParse(rows, true)
    } else {
      // First-time use (penggunaan pertama): auto-assign default template with pre-assigned dates and durations
      // so the Gantt chart is immediately generated and visible on first load!
      const defaultTpl = getDefaultTemplate()
      setInputRows(defaultTpl.rows)
      setRawText(rowsToRawText(defaultTpl.rows))
      setActiveTemplate(defaultTpl.name)
      runParse(defaultTpl.rows, false)
    }
  }, [listDrafts, loadDraft, runParse])

  // --- Live auto-render: any input change updates the Gantt (debounced) ---
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = setTimeout(() => {
      if (inputRows.length === 0) return
      runParse(inputRows, true) // silent best-effort
    }, 350)
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current) }
  }, [inputRows, runParse])

  // --- Explicit user actions show validation feedback + loading ---
  const handleParse = useCallback(() => {
    setIsParsing(true)
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    setGenerateSuccess(false)

    // 280ms gives a smooth, tactile feel confirming that calculation is happening
    window.setTimeout(() => {
      const ok = runParse(inputRows, false)
      setIsParsing(false)
      if (ok) {
        setGenerationTick(t => t + 1)
        setGenerateSuccess(true)
        setToastMessage(`Timeline updated! (${inputRows.length} task${inputRows.length > 1 ? 's' : ''})`)
        successTimeoutRef.current = setTimeout(() => {
          setGenerateSuccess(false)
          setToastMessage(null)
        }, 1800)
        // On mobile, scroll to Gantt chart area
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          const ganttContainer = ganttRef.current?.getContainer()
          ganttContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }, 280)
  }, [inputRows, runParse])

  const handleTemplateSelect = useCallback((rows: ParseRowState[], templateName?: string) => {
    setActiveTemplate(templateName || null)
    setInputRows(rows)
    setRawText(rowsToRawText(rows))
    setParseErrors([])
    setErrors({})
    runParse(rows, false)
  }, [runParse])

  // Draft management: restore previously autosaved rows
  const refreshDrafts = useCallback(() => setDrafts(listDrafts()), [listDrafts])

  const handleRowsChange = useCallback((next: ParseRowState[]) => {
    setActiveTemplate(null)
    setInputRows(next)
    setRawText(rowsToRawText(next))
  }, [])

  const restoreDraft = useCallback((id: string) => {
    const rows = loadDraft(id)
    if (!rows) return
    setActiveTemplate(null)
    setInputRows(rows)
    setRawText(rowsToRawText(rows))
    setHasGenerated(false)
    setTasks([])
    setShowDrafts(false)
    runParse(rows)
  }, [loadDraft, runParse])

  const handleShiftDates = useCallback((delta: number) => {
    const ref = todayRef()
    const move = (v: string) => {
      const res = parseDate(v, ref)
      if (!res.ok) return v
      const d = new Date(res.value)
      d.setDate(d.getDate() + delta)
      return formatDateISO(d)
    }
    const shifted = inputRows.map(r => ({
      ...r,
      start: r.start ? move(r.start) : r.start,
      end: r.end ? move(r.end) : r.end,
    }))
    setInputRows(shifted)
    setRawText(rowsToRawText(shifted))
    runParse(shifted)
  }, [inputRows, runParse])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const text = event.target?.result as string
      if (!text) return

      const importedRows = parseSpreadsheetText(text, todayRef())
      if (importedRows.length > 0) {
        setActiveTemplate(null)
        setInputRows(importedRows)
        setRawText(rowsToRawText(importedRows))
        runParse(importedRows, false)
        setToastMessage(locale === 'en'
          ? `Imported ${importedRows.length} tasks from spreadsheet!`
          : `Berhasil mengimpor ${importedRows.length} tugas dari spreadsheet!`)
        setTimeout(() => setToastMessage(null), 2500)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [locale, runParse])

  // Single bridge: any task mutation (Gantt drag, inspector save/delete)
  // syncs the editable rows + raw text, so a later Generate never reverts it.
  const syncRowsFromTasks = useCallback((updated: TimelineTask[]) => {
    const nextRows: ParseRowState[] = updated.map(t => ({
      id: t.id,
      name: t.name,
      assignee: t.assignee || '',
      start: t.start.slice(0, 10),
      duration: `${t.durationDays} hari`,
      end: t.end.slice(0, 10),
      dependsOn: t.dependsOn || '',
      progress: String(t.progress ?? 0),
    }))
    setInputRows(nextRows)
    setRawText(rowsToRawText(nextRows))
  }, [])

  const handleTasksChange = useCallback((updated: TimelineTask[]) => {
    // Keep chronological order live: a dragged date re-slots its bar at once.
    const sorted = [...updated].sort(compareTasksByDate)
    setTasks(sorted)
    // Two-way bridge: Gantt drag / inspector edits sync back to editable rows + raw text.
    // IMPORTANT: raw text must stay in the parseable pipe order
    // (name | assignee | start | duration | end). A display-order serialiser
    // (start | end | durasi | status) would map to the wrong columns on
    // re-parse, every later Generate then fails on all rows and the button
    // looks dead. So always serialise via rowsToRawText().
    syncRowsFromTasks(sorted)
  }, [syncRowsFromTasks])

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
  }, [])

  const handleCloseInspector = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  const handleDeleteTask = useCallback((taskId: string) => {
    const next = tasks.filter(t => t.id !== taskId)
    setTasks(next)
    syncRowsFromTasks(next)
    if (selectedTaskId === taskId) setSelectedTaskId(null)
  }, [selectedTaskId, tasks, syncRowsFromTasks])

  const handleUpdateTaskFromInspector = useCallback((updated: TimelineTask) => {
    const next = tasks.map(t => t.id === updated.id ? updated : t).sort(compareTasksByDate)
    setTasks(next)
    syncRowsFromTasks(next)
  }, [tasks, syncRowsFromTasks])

  const canGenerate = inputRows.some(r => r.name.trim().length > 0)
  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* === HEADER === */}
      <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Kembali ke Beranda">
            <LogoMark size={28} />
            <h1 className="text-text-primary text-[15px] font-semibold tracking-tight">TaskFlowy Gantt</h1>
          </a>
          <span className="text-muted text-[11px] font-mono tracking-wide">v1.0</span>
          <div className="ml-2"><TemplatePicker onSelect={handleTemplateSelect} activeTemplate={activeTemplate} /></div>
        </div>
        <div className="flex items-center gap-2">
          {hasGenerated && (
            <span className="text-muted text-[12px] font-mono">{tasks.length} {t.workbench.tasksCount}</span>
          )}
          <HeaderActionsMenu
            hasGenerated={hasGenerated}
            view={view}
            tasks={tasks}
            inputRows={inputRows}
            drafts={drafts}
            currentDraftId={currentDraftId}
            onRestoreDraft={restoreDraft}
            onDeleteDraft={(id) => { deleteDraft(id); refreshDrafts() }}
            onShift={handleShiftDates}
            onMenuOpen={refreshDrafts}
          />
          <button
            className={`btn-primary transition-all duration-200 ${generateSuccess ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            onClick={handleParse}
            disabled={!canGenerate || isParsing}
          >
            {isParsing ? <Loader2 size={14} className="animate-spin" /> : generateSuccess ? <Check size={14} /> : <Play size={14} />}
            <span>{isParsing ? t.workbench.generating : generateSuccess ? t.workbench.generatedSuccess : t.workbench.generateTimeline}</span>
          </button>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="btn-secondary text-[11px] h-7 gap-1.5 px-2"
            title={t.workbench.myWorkspace}
          >
            <AvatarIcon iconKey={headerProfile.avatarIcon} size={14} />
            <span className="hidden sm:inline font-medium">{headerProfile.name}</span>
          </button>
          <LanguageSwitcher />
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
          {/* --- Input area: Task Table with Spreadsheet Import --- */}
          <section className="bg-surface-dim border-b border-border max-h-[42vh] overflow-y-auto no-print">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-text-primary flex items-center gap-1.5">
                  <Table2 size={13} className="text-primary" />
                  <span>{locale === 'en' ? 'Task Table Editor' : 'Editor Tabel Tugas'}</span>
                </span>
                <span className="text-[11px] text-muted font-mono">
                  ({inputRows.length} {locale === 'en' ? 'tasks' : 'tugas'})
                </span>
              </div>

              {/* Import Spreadsheet / CSV Button */}
              <label className="cursor-pointer text-[11px] px-2.5 py-1 rounded-md font-medium bg-surface border border-border text-text-primary hover:bg-surface-hi hover:border-primary/50 transition-all inline-flex items-center gap-1.5 shadow-2xs">
                <Upload size={12} className="text-primary" />
                <span>{t.hero.importSpreadsheet}</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="px-3 pb-2 pt-1">
              <RowEditor rows={inputRows} onChange={handleRowsChange} errors={errors} />
            </div>
          </section>

          {/* --- Parse error feedback (visible in raw + table modes) --- */}
          {parseErrors.length > 0 && (
            <div className="bg-error/10 border-b border-error/30 px-3 py-2">
              <p className="text-error text-[12px] font-semibold mb-1">
                {parseErrors.length} error parsing: perbaiki baris berikut:
              </p>
              <ul className="text-error text-[11px] space-y-0.5">
                {parseErrors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          {/* --- Ambiguity/validation alert --- */}
          {hasGenerated && warnings.length > 0 && (
            <AmbiguityAlert warnings={warnings} />
          )}

          {/* --- Timeline controls toolbar (Gantt-only: every control here
              drives the chart: view mode, scroll, assignee filter, critical
              highlight, zoom. Hidden in Table/Dependency views where they
              would look broken doing nothing.) --- */}
          {view === 'gantt' && (
          <div className="h-10 bg-surface border-b border-border flex items-center justify-between px-3 shrink-0 no-print">
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
              <div className="hidden md:flex items-center gap-1" title="Zoom timeline: rapatkan / regangkan skala waktu">
                <button className="p-0.5 rounded text-muted hover:text-text-primary transition-colors"
                  title="Perkecil skala waktu (lihat rentang lebih panjang)"
                  onClick={() => setZoom(z => Math.max(1, z - 1))}><ZoomOut size={14} /></button>
                <input type="range" className="w-16 h-1 accent-primary bg-surface-hi/40 rounded cursor-pointer"
                  title="Zoom skala waktu"
                  min={1} max={5} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
                <button className="p-0.5 rounded text-muted hover:text-text-primary transition-colors"
                  title="Perbesar skala waktu (bar lebih panjang)"
                  onClick={() => setZoom(z => Math.min(5, z + 1))}><ZoomIn size={14} /></button>
              </div>
            </div>
          </div>
          )}

          {/* --- Project health strip (above Gantt, market-facing summary) --- */}
          {hasGenerated && view === 'gantt' && <ProjectMetricsStrip tasks={tasks} />}

          {/* --- Master-detail workspace --- */}
          {view === 'gantt' ? (
          <div className="flex-1 flex min-h-0">
            {hasGenerated && (
              <div className="w-[390px] xl:w-[420px] shrink-0 border-r border-border bg-surface/30 flex flex-col no-print">
                <ReviewTable tasks={tasks} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
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
                  <div className={`flex-1 flex flex-col min-h-0 rounded-lg transition-shadow ${generateSuccess ? 'animate-canvas-pulse ring-1 ring-emerald-500/40' : ''}`}>
                    <GanttBoard
                      ref={ganttRef}
                      tasks={tasks}
                      selectedAssignees={selectedAssignees}
                      onTasksChange={handleTasksChange}
                      onSelectTask={handleSelectTask}
                      viewMode={viewMode}
                      showCritical={showCritical}
                      zoom={zoom}
                      generationTick={generationTick}
                      focusTaskName={focusTaskName}
                    />
                    <LegendBar tasks={tasks} warnings={warnings} />
                  </div>
                </>
              )}
            </div>
          </div>
          ) : view === 'table' ? (
            <div className="flex-1 flex min-h-0">
              <TableView tasks={tasks} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
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
            key={selectedTask.id}
            task={selectedTask}
            onClose={handleCloseInspector}
            onUpdate={handleUpdateTaskFromInspector}
            onDelete={handleDeleteTask}
          />
        )}
      </div>

      {/* === FLOATING TOAST === */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-surface/95 border border-border shadow-xl backdrop-blur text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* === WORKSPACE & PROFILE DASHBOARD MODAL === */}
      <ProfileDashboardModal
        isOpen={isProfileOpen}
        currentDraftId={currentDraftId}
        onClose={() => {
          setIsProfileOpen(false)
          setHeaderProfile(loadUserProfile())
        }}
        onOpenProject={(id) => {
          restoreDraft(id)
        }}
        onSelectTask={(projectId, taskName) => {
          restoreDraft(projectId)
          setFocusTaskName(taskName)
        }}
        onDeleteProject={(id) => {
          deleteDraft(id)
          refreshDrafts()
        }}
      />
    </div>
  )
}