'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Play, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  BarChart3, Table2, GitBranch, Loader2, Check, Upload, WifiOff, Undo2,
  SlidersHorizontal, Users, Grid, Columns2, Search,
} from 'lucide-react'
import { RowEditor } from '@/components/task-input/row-editor'
import { parseSpreadsheetText } from '@/lib/format/spreadsheet-parser'
import { ReviewTable } from '@/components/parse-review/review-table'
import { AssigneeFilter } from '@/components/assignee-filter/filter-bar'
import { GanttBoard } from '@/components/gantt-board/gantt-board'
import { LegendBar } from '@/components/ui/legend-bar'
import { ProjectMetricsStrip } from '@/components/ui/project-metrics-strip'
import { AmbiguityAlert } from '@/components/ui/ambiguity-alert'
import { ParseStatusBanner, type ParseStatus } from '@/components/ui/parse-status-banner'
import { ParseTelemetryBar } from '@/components/ui/parse-telemetry-bar'
import { TableView } from '@/components/table-view/table-view'
import { DependencyView } from '@/components/dependency-view/dependency-view'
import { ResourceWorkloadView } from '@/components/resource-workload/resource-workload-view'
import { DependencyMatrixView } from '@/components/dependency-matrix/dependency-matrix'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { SlippageSimulationBar } from '@/components/simulation/slippage-simulation-bar'
import { computeDownstreamSlippage } from '@/lib/simulation/slippage-engine'
import { calculateScheduleRisk } from '@/lib/simulation/monte-carlo'
import { tasksToCSV, downloadCSV } from '@/lib/csv-export'
import { exportGanttPNG } from '@/lib/visual-exporter'
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
import { parseRows } from '@/lib/parser/row-parser'
import { parseDate, formatDateISO } from '@/lib/parser/date-grammar'
import { decodeHashToRows } from '@/lib/url-state'
import { useDrafts } from '@/hooks/use-drafts'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useUndoHistory } from '@/hooks/use-undo-history'
import { onApiNotice } from '@/lib/api-client'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { ProfileDashboardModal } from '@/components/profile/profile-dashboard-modal'
import { AvatarIcon } from '@/components/profile/avatar-icon'
import { UserButton } from '@/components/auth/user-button'
import { loadUserProfile } from '@/lib/profile-store'

export default function Home() {
  const { t, locale } = useTranslation()
  const { saveDraft, loadDraft, listDrafts, deleteDraft, currentDraftId } = useDrafts()
  const [activeTemplate, setActiveTemplate] = useState<string | null>('software-sprint')
  // rawText mirror removed 2026-09: the pipe-text editor was deleted; rows are
  // the single source of truth.
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
  const [toastAction, setToastAction] = useState<{ label: string; run: () => void } | null>(null)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const online = useOnlineStatus()
  const { push, pushCoalesced, undo, canUndo, peekLabel } = useUndoHistory()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  // Name of the task the chart should reveal on the next task-set change
  // (new/renamed task). Identity tracks by NAME because task ids regenerate
  // on every parse.
  const [focusTaskName, setFocusTaskName] = useState<string | null>(null)
  const prevTaskNamesRef = useRef<Set<string>>(new Set())
  const [view, setView] = useState<'gantt' | 'table' | 'dependency' | 'workload' | 'matrix' | 'split'>('gantt')
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week')
  const [showCritical, setShowCritical] = useState(true)
  const [zoom, setZoom] = useState(3)
  const [drafts, setDrafts] = useState<ReturnType<typeof listDrafts>>([])
  const ganttRef = useRef<GanttBoardHandle>(null)
  const restoredRef = useRef(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [headerProfile, setHeaderProfile] = useState({ name: 'Pengguna', avatarIcon: 'user' })

  // Command Palette State & Shortcut Listener (Cmd+K / Ctrl+K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // What-If Schedule Slippage & Risk Simulation State
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationTargetId, setSimulationTargetId] = useState<string | null>(null)
  const [simulationDeltaDays, setSimulationDeltaDays] = useState(0)

  // Memoized simulation calculations
  const simulationResult = useMemo(() => {
    if (!isSimulating || !simulationTargetId || simulationDeltaDays === 0) {
      return computeDownstreamSlippage([], [], '', 0)
    }
    return computeDownstreamSlippage(tasks, dependencies, simulationTargetId, simulationDeltaDays)
  }, [isSimulating, simulationTargetId, simulationDeltaDays, tasks, dependencies])

  const riskAssessment = useMemo(() => {
    return calculateScheduleRisk(tasks, dependencies)
  }, [tasks, dependencies])

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
      runParse(rows, true)
    } else {
      // First-time use (penggunaan pertama): auto-assign default template with pre-assigned dates and durations
      // so the Gantt chart is immediately generated and visible on first load!
      const defaultTpl = getDefaultTemplate()
      setInputRows(defaultTpl.rows)
      setActiveTemplate(defaultTpl.name)
      runParse(defaultTpl.rows, false)
    }
  }, [listDrafts, loadDraft, runParse])

  // Toast helper with optional action (Undo) — auto-dismisses; a new toast
  // replaces the previous one so stacked mutations never pile up.
  // Declared BEFORE the mutation handlers below (TDZ: const callbacks
  // cannot reference later declarations).
  const showToast = useCallback((message: string, action?: { label: string; run: () => void }, ms = 5000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastMessage(message)
    setToastAction(action ?? null)
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
      setToastAction(null)
    }, ms)
  }, [])

  // Route api-client notices (403/429/5xx/offline) into the same toast.
  useEffect(() => {
    onApiNotice(n => showToast(n.message))
    return () => onApiNotice(null)
  }, [showToast])

  const handleUndo = useCallback(() => {
    const snap = undo()
    if (!snap) return
    setTasks(snap.tasks)
    setInputRows(snap.inputRows)
    setParseErrors([])
    setErrors({})
    setSelectedTaskId(null)
    runParse(snap.inputRows, true)
    showToast(`Undid: ${snap.label}`)
  }, [undo, runParse, showToast])

  const handleCommitSimulation = useCallback(() => {
    if (!simulationTargetId || simulationDeltaDays === 0 || simulationResult.diffs.size === 0) return

    push(locale === 'id' ? 'Terapkan simulasi what-if' : 'Commit what-if simulation', tasks, inputRows)

    const updatedRows = inputRows.map(row => {
      const matchingTask = tasks.find(t => t.name.trim().toLowerCase() === row.name.trim().toLowerCase())
      if (matchingTask && simulationResult.diffs.has(matchingTask.id)) {
        const diff = simulationResult.diffs.get(matchingTask.id)!
        return {
          ...row,
          start: diff.simulatedStart,
          end: diff.simulatedEnd,
        }
      }
      return row
    })

    setInputRows(updatedRows)
    runParse(updatedRows)
    setSimulationDeltaDays(0)
    setIsSimulating(false)

    showToast(
      locale === 'id'
        ? 'Simulasi berhasil diterapkan ke timeline.'
        : 'Simulation committed to timeline.',
      { label: locale === 'id' ? 'Urungkan' : 'Undo', run: handleUndo }
    )
  }, [simulationTargetId, simulationDeltaDays, simulationResult.diffs, push, locale, tasks, inputRows, runParse, showToast, handleUndo])

  const handleDiscardSimulation = useCallback(() => {
    setSimulationDeltaDays(0)
  }, [])

  const handleCloseSimulation = useCallback(() => {
    setIsSimulating(false)
    setSimulationDeltaDays(0)
  }, [])

  const handleToggleDependency = useCallback((sourceTaskId: string, targetTaskId: string) => {
    const sourceTask = tasks.find(t => t.id === sourceTaskId)
    const targetTask = tasks.find(t => t.id === targetTaskId)
    if (!sourceTask || !targetTask) return

    push(locale === 'id' ? 'Ubah ketergantungan matriks' : 'Toggle matrix dependency', tasks, inputRows)

    const updatedRows = inputRows.map(row => {
      if (row.name.trim().toLowerCase() === targetTask.name.trim().toLowerCase()) {
        const currentDeps = (row.dependsOn || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)

        const alreadyDepends = currentDeps.some(d => d.toLowerCase() === sourceTask.name.trim().toLowerCase())
        let nextDeps: string[]
        if (alreadyDepends) {
          nextDeps = currentDeps.filter(d => d.toLowerCase() !== sourceTask.name.trim().toLowerCase())
        } else {
          nextDeps = [...currentDeps, sourceTask.name.trim()]
        }

        return {
          ...row,
          dependsOn: nextDeps.join(', '),
        }
      }
      return row
    })

    setInputRows(updatedRows)
    runParse(updatedRows)
    showToast(
      locale === 'id'
        ? `Relasi "${sourceTask.name}" → "${targetTask.name}" diperbarui`
        : `Dependency "${sourceTask.name}" → "${targetTask.name}" updated`,
      { label: locale === 'id' ? 'Urungkan' : 'Undo', run: handleUndo }
    )
  }, [tasks, inputRows, push, locale, runParse, showToast, handleUndo])

  const handleBreakCycle = useCallback((sourceTaskId: string, targetTaskId: string) => {
    handleToggleDependency(sourceTaskId, targetTaskId)
  }, [handleToggleDependency])

  const handleExportCSV = useCallback(() => {
    if (tasks.length === 0) {
      showToast(locale === 'id' ? 'Tidak ada tugas untuk diekspor' : 'No tasks to export')
      return
    }
    const csv = tasksToCSV(tasks)
    downloadCSV(`taskflowy-schedule-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    showToast(locale === 'id' ? 'CSV berhasil diekspor' : 'CSV exported successfully')
  }, [tasks, locale, showToast])

  const handleExportPNG = useCallback(async () => {
    try {
      await exportGanttPNG()
      showToast(locale === 'id' ? 'PNG timeline berhasil diunduh' : 'Timeline PNG downloaded successfully')
    } catch {
      showToast(locale === 'id' ? 'Buka tampilan Gantt terlebih dahulu untuk ekspor PNG' : 'Switch to Gantt view first to export PNG')
    }
  }, [locale, showToast])

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
    // Template swap replaces the whole workspace — push rollback first.
    push(`Template "${templateName ?? 'change'}"`, tasks, inputRows)
    setActiveTemplate(templateName || null)
    setInputRows(rows)
    setParseErrors([])
    setErrors({})
    runParse(rows, false)
    showToast('Template applied', { label: 'Undo', run: handleUndo })
  }, [runParse, push, tasks, inputRows, showToast, handleUndo])

  // Draft management: restore previously autosaved rows
  const refreshDrafts = useCallback(() => setDrafts(listDrafts()), [listDrafts])

  const handleRowsChange = useCallback((next: ParseRowState[]) => {
    setActiveTemplate(null)
    setInputRows(next)
  }, [])

  const restoreDraft = useCallback((id: string) => {
    const rows = loadDraft(id)
    if (!rows) return
    push('Restore draft', tasks, inputRows)
    setActiveTemplate(null)
    setInputRows(rows)
    setHasGenerated(false)
    setTasks([])
    // (legacy draft-panel flag removed with the header-menu migration)
    runParse(rows)
  }, [loadDraft, runParse, push, tasks, inputRows])

  const handleBlankStart = useCallback(() => {
    // Explicit opt-in replaces workspace content — push rollback first and
    // confirm, so sample data is never destroyed by accident.
    if (tasks.length > 0 && !window.confirm('Start with a blank project? Your current tasks will be replaced (undoable).')) return
    push('Blank project', tasks, inputRows)
    const blank: ParseRowState[] = [{ id: createRowId(), name: '', assignee: '', start: todayRef(), duration: '1 hari', end: '', dependsOn: '', progress: '0' }]
    setActiveTemplate(null)
    setInputRows(blank)
    setParseErrors([])
    setErrors({})
    setTasks([])
    setDependencies([])
    setWarnings([])
    setHasGenerated(false)
    setSelectedTaskId(null)
    showToast('Started a blank project', { label: 'Undo', run: handleUndo })
  }, [tasks, inputRows, push, showToast, handleUndo])

  const handleShiftDates = useCallback((delta: number) => {
    // Bulk shift touches every date — push rollback, then offer Undo.
    push(`Shift ${delta > 0 ? '+' : ''}${delta}d`, tasks, inputRows)
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
    runParse(shifted)
    showToast(`Shifted ${shifted.length} tasks ${delta > 0 ? '+' : ''}${delta}d`, { label: 'Undo', run: handleUndo })
  }, [inputRows, runParse, push, tasks, showToast, handleUndo])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const text = event.target?.result as string
      if (!text) return

      const importedRows = parseSpreadsheetText(text, todayRef())
      if (importedRows.length > 0) {
        // Import replaces the workspace — push rollback so it never silently
        // destroys existing work; the toast offers one-click Undo.
        push(`Import ${importedRows.length} rows`, tasks, inputRows)
        setActiveTemplate(null)
        setInputRows(importedRows)
        runParse(importedRows, false)
        showToast(locale === 'en'
          ? `Imported ${importedRows.length} tasks from spreadsheet!`
          : `Berhasil mengimpor ${importedRows.length} tugas dari spreadsheet!`,
          { label: 'Undo', run: handleUndo })
      } else {
        showToast(locale === 'en'
          ? 'No importable rows found — check the file has task names.'
          : 'Tidak ada baris yang bisa diimpor — pastikan file berisi nama tugas.')
      }
    }
    reader.onerror = () => {
      showToast(locale === 'en' ? 'Could not read that file. Try again.' : 'File tidak bisa dibaca. Coba lagi.')
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [locale, runParse, push, tasks, inputRows, showToast, handleUndo])

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
  }, [])

  const handleTasksChange = useCallback((updated: TimelineTask[]) => {
    // Push the PRE-drag snapshot once per gesture (coalesced) so a single
    // Undo reverts the whole drag; rollback restores it on failure.
    pushCoalesced('Gantt drag', tasks, inputRows)
    // Keep chronological order live: a dragged date re-slots its bar at once.
    const sorted = [...updated].sort(compareTasksByDate)
    setTasks(sorted)
    // Two-way bridge: Gantt drag / inspector edits sync back to editable rows + raw text.
    // IMPORTANT: row serialisation must stay in the parseable pipe order
    // (name | assignee | start | duration | end). A display-order serialiser
    // (start | end | durasi | status) would map to the wrong columns on
    // re-parse — see lib/format/raw-text.ts rowsToRawText().
    syncRowsFromTasks(sorted)
  }, [syncRowsFromTasks, pushCoalesced, tasks, inputRows])

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
  }, [])

  const handleCloseInspector = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  const handleDeleteTask = useCallback((taskId: string) => {
    const doomed = tasks.find(t => t.id === taskId)
    push(`Delete "${doomed?.name ?? 'task'}"`, tasks, inputRows)
    const next = tasks.filter(t => t.id !== taskId)
    setTasks(next)
    syncRowsFromTasks(next)
    if (selectedTaskId === taskId) setSelectedTaskId(null)
    showToast(`Deleted "${doomed?.name ?? 'task'}"`, { label: 'Undo', run: handleUndo })
  }, [selectedTaskId, tasks, inputRows, syncRowsFromTasks, push, showToast, handleUndo])

  const handleUpdateTaskFromInspector = useCallback((updated: TimelineTask) => {
    push(`Edit "${updated.name}"`, tasks, inputRows)
    const next = tasks.map(t => t.id === updated.id ? updated : t).sort(compareTasksByDate)
    setTasks(next)
    syncRowsFromTasks(next)
    showToast(`Saved "${updated.name}"`, { label: 'Undo', run: handleUndo })
  }, [tasks, inputRows, syncRowsFromTasks, push, showToast, handleUndo])

  const canGenerate = inputRows.some(r => r.name.trim().length > 0)
  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId])

  // --- Parse lifecycle state (Phase 1.3): one explicit status drives the
  // --- feedback banner, icons + text (never color alone), and ARIA roles.
  const parseStatus: ParseStatus = isParsing
    ? 'parsing'
    : !hasGenerated
      ? (canGenerate ? 'idle' : 'empty')
      : tasks.length === 0
        ? (parseErrors.length > 0 ? 'error' : 'empty')
        : parseErrors.length > 0
          ? 'partial'
          : 'success'
  const acceptedCount = !hasGenerated
    ? inputRows.filter(r => r.name.trim().length > 0).length
    : tasks.length
  const rejectedCount = parseErrors.length

  // Jump from a parse-error entry to the offending input row.
  const focusInputRow = useCallback((index: number) => {
    const row = inputRows[index]
    if (!row) return
    requestAnimationFrame(() => {
      const input = document.querySelector<HTMLElement>(`[data-row-id="${row.id}"] input`)
      input?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      input?.focus({ preventScroll: true })
    })
  }, [inputRows])

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
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 text-[11px] rounded bg-surface-dim border border-border text-muted hover:text-text-primary hover:border-primary/40 transition-colors shadow-2xs"
            title={locale === 'id' ? 'Cari tugas atau tindakan (⌘K)' : 'Search tasks or actions (⌘K)'}
          >
            <Search size={12} className="text-muted" />
            <span>{locale === 'id' ? 'Cari...' : 'Search...'}</span>
            <kbd className="text-[10px] font-mono bg-surface-hi/40 px-1 py-0.5 rounded border border-border/80 text-muted">⌘K</kbd>
          </button>
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
            onNotify={(msg) => showToast(msg)}
          />
          <button
            className={`btn-primary transition-all duration-200 ${generateSuccess ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            onClick={handleParse}
            disabled={!canGenerate || isParsing}
            aria-busy={isParsing}
            aria-live="polite"
          >
            {isParsing ? <Loader2 size={14} className="animate-spin" /> : generateSuccess ? <Check size={14} /> : <Play size={14} />}
            <span>{isParsing ? t.workbench.generating : generateSuccess ? t.workbench.generatedSuccess : t.workbench.generateTimeline}</span>
          </button>
          {canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              className="btn-secondary text-[11px] h-7 gap-1 px-2"
              title={peekLabel ? `Undo: ${peekLabel}` : 'Undo last change'}
            >
              <Undo2 size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}
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
          <UserButton />
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
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'split' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
            title={locale === 'id' ? 'Tampilan Terpisah (Tabel + Gantt)' : 'Split View (Table + Gantt)'} onClick={() => setView('split')}><Columns2 size={16} /></button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'dependency' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
            title="Dependency" onClick={() => setView('dependency')}><GitBranch size={16} /></button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'workload' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
            title={locale === 'id' ? 'Kapasitas Tim' : 'Resource Workload'} onClick={() => setView('workload')}><Users size={16} /></button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'matrix' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
            title={locale === 'id' ? 'Matriks Ketergantungan (DSM)' : 'Dependency Structure Matrix (DSM)'} onClick={() => setView('matrix')}><Grid size={16} /></button>
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

          {/* --- Offline banner: local-first app keeps working; drafts still autosave --- */}
          {!online && (
            <div role="alert" className="bg-warning/10 border-b border-warning/30 px-3 py-1.5 flex items-center gap-2">
              <WifiOff size={13} className="text-warning shrink-0" aria-hidden="true" />
              <p className="text-[12px] text-text-primary">
                <span className="font-semibold">You are offline.</span>{' '}
                <span className="text-muted">Editing still works — drafts autosave locally and sharing/export will retry once reconnected.</span>
              </p>
            </div>
          )}

          {/* --- Parse lifecycle feedback: ready / parsing / success / partial / failed / empty --- */}
          <ParseStatusBanner status={parseStatus} accepted={acceptedCount} rejected={rejectedCount} />

          {/* --- Parse error feedback (visible in raw + table modes) --- */}
          {parseErrors.length > 0 && (
            <div className="bg-error/10 border-b border-error/30 px-3 py-2" role="alert" aria-label={`${parseErrors.length} rows failed to parse`}>
              <p className="text-error text-[12px] font-semibold mb-1">
                {parseErrors.length} error parsing: perbaiki baris berikut:
              </p>
              <ul className="text-error text-[11px] space-y-0.5">
                {parseErrors.map((e, i) => {
                  const m = /^Baris\s+(\d+)\s*:/.exec(e)
                  const rowIdx = m ? parseInt(m[1], 10) - 1 : -1
                  return (
                    <li key={i}>
                      {rowIdx >= 0 ? (
                        <button
                          type="button"
                          onClick={() => focusInputRow(rowIdx)}
                          className="hover:underline text-left focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none rounded"
                          title={`Go to row ${rowIdx + 1} in the task table`}
                        >
                          • {e} →
                        </button>
                      ) : (
                        <span>• {e}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* --- Ambiguity/validation alert --- */}
          {hasGenerated && warnings.length > 0 && (
            <AmbiguityAlert warnings={warnings} tasks={tasks} inputRows={inputRows} onSelectTask={handleSelectTask} />
          )}

          {/* --- Timeline controls toolbar (Gantt-only: every control here
              drives the chart: view mode, scroll, assignee filter, critical
              highlight, zoom. Hidden in Table/Dependency views where they
              would look broken doing nothing.) --- */}
          {(view === 'gantt' || view === 'split') && (
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
              {hasGenerated && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulating(prev => {
                      const next = !prev
                      if (next && !simulationTargetId && tasks.length > 0) {
                        const firstNonMilestone = tasks.find(t => !t.isMilestone)
                        if (firstNonMilestone) setSimulationTargetId(firstNonMilestone.id)
                      }
                      return next
                    })
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                    isSimulating
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                      : 'bg-surface-hi/20 text-muted hover:text-text-primary border-border hover:bg-surface-hi/40'
                  }`}
                  title={isSimulating ? (locale === 'id' ? 'Tutup simulasi What-If' : 'Close What-If simulation') : (locale === 'id' ? 'Buka simulasi What-If risiko jadwal' : 'Open What-If schedule risk simulation')}
                >
                  <SlidersHorizontal size={13} className={isSimulating ? 'text-amber-400' : ''} />
                  <span>What-If</span>
                </button>
              )}
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

          {/* --- What-if schedule slippage simulation workspace --- */}
          {hasGenerated && (view === 'gantt' || view === 'split') && isSimulating && (
            <SlippageSimulationBar
              tasks={tasks}
              dependencies={dependencies}
              targetTaskId={simulationTargetId}
              deltaDays={simulationDeltaDays}
              onSelectTargetTask={setSimulationTargetId}
              onChangeDeltaDays={setSimulationDeltaDays}
              onCommit={handleCommitSimulation}
              onDiscard={handleDiscardSimulation}
              onClose={handleCloseSimulation}
              simulationResult={simulationResult}
              riskAssessment={riskAssessment}
            />
          )}

          {/* --- Master-detail workspace --- */}
          {view === 'gantt' ? (
          <div className="flex-1 flex min-h-0">
            {hasGenerated && (
              <div className="w-[390px] xl:w-[420px] shrink-0 border-r border-border bg-surface/30 flex flex-col no-print">
                <WidgetErrorBoundary name="Review list">
                  <ReviewTable tasks={tasks} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
                </WidgetErrorBoundary>
              </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
              {!hasGenerated ? (
                <EmptyState
                  icon={BarChart3}
                  title="Turn your schedule into a timeline"
                  description="Write tasks in the table above, pick a template, or import a spreadsheet. TaskFlowy extracts dates and owners, then renders an editable Gantt chart you can adjust and export."
                  actions={[
                    { label: 'Use sample template', onClick: () => handleTemplateSelect(getDefaultTemplate().rows, getDefaultTemplate().name), primary: true },
                    { label: 'Start blank', onClick: handleBlankStart },
                  ]}
                />
              ) : (
                <>
                  {tasks.length > 0 && <ParseTelemetryBar tasks={tasks} timezone={DEFAULT_TIMEZONE} />}
                  <div className={`flex-1 flex flex-col min-h-0 rounded-lg transition-shadow ${generateSuccess ? 'animate-canvas-pulse ring-1 ring-emerald-500/40' : ''}`}>
                    <WidgetErrorBoundary name="Gantt chart">
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
                        simulatedDiffs={isSimulating ? simulationResult.diffs : null}
                      />
                    </WidgetErrorBoundary>
                    <LegendBar tasks={tasks} warnings={warnings} />
                  </div>
                </>
              )}
            </div>
          </div>
          ) : view === 'split' ? (
            <div className="flex-1 flex min-h-0">
              <div className="w-1/2 min-w-0 border-r border-border flex flex-col overflow-hidden">
                <WidgetErrorBoundary name="Table view">
                  <TableView tasks={tasks} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
                </WidgetErrorBoundary>
              </div>
              <div className="w-1/2 min-w-0 flex flex-col overflow-hidden">
                {!hasGenerated ? (
                  <EmptyState
                    icon={BarChart3}
                    title="Gantt chart preview"
                    description="Tasks entered in the table will render on the Gantt chart here."
                    actions={[
                      { label: 'Use sample template', onClick: () => handleTemplateSelect(getDefaultTemplate().rows, getDefaultTemplate().name), primary: true },
                      { label: 'Start blank', onClick: handleBlankStart },
                    ]}
                  />
                ) : (
                  <>
                    {tasks.length > 0 && <ParseTelemetryBar tasks={tasks} timezone={DEFAULT_TIMEZONE} />}
                    <div className={`flex-1 flex flex-col min-h-0 rounded-lg transition-shadow ${generateSuccess ? 'animate-canvas-pulse ring-1 ring-emerald-500/40' : ''}`}>
                      <WidgetErrorBoundary name="Gantt chart">
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
                          simulatedDiffs={isSimulating ? simulationResult.diffs : null}
                        />
                      </WidgetErrorBoundary>
                      <LegendBar tasks={tasks} warnings={warnings} />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : view === 'table' ? (
            <div className="flex-1 flex min-h-0">
              <WidgetErrorBoundary name="Table view">
                <TableView tasks={tasks} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
              </WidgetErrorBoundary>
            </div>
          ) : view === 'dependency' ? (
            <div className="flex-1 flex min-h-0">
              <WidgetErrorBoundary name="Dependency graph">
                <DependencyView tasks={tasks} dependencies={dependencies} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
              </WidgetErrorBoundary>
            </div>
          ) : view === 'workload' ? (
            <div className="flex-1 flex min-h-0">
              <WidgetErrorBoundary name="Resource workload">
                <ResourceWorkloadView tasks={tasks} onSelectTask={handleSelectTask} selectedTaskId={selectedTaskId} />
              </WidgetErrorBoundary>
            </div>
          ) : (
            <div className="flex-1 flex min-h-0">
              <WidgetErrorBoundary name="Dependency matrix">
                <DependencyMatrixView
                  tasks={tasks}
                  dependencies={dependencies}
                  onToggleDependency={handleToggleDependency}
                  onBreakCycle={handleBreakCycle}
                  onSelectTask={handleSelectTask}
                  selectedTaskId={selectedTaskId}
                />
              </WidgetErrorBoundary>
            </div>
          )}
        </div>

        {/* === INSPECTOR DRAWER === */}
        {selectedTask && (
          <WidgetErrorBoundary name="Task inspector" className="w-[330px] shrink-0">
            <InspectorDrawer
              key={selectedTask.id}
              task={selectedTask}
              onClose={handleCloseInspector}
              onUpdate={handleUpdateTaskFromInspector}
              onDelete={handleDeleteTask}
            />
          </WidgetErrorBoundary>
        )}
      </div>

      {/* === FLOATING TOAST (single slot — replacements, never stacked) === */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-surface/95 border border-border shadow-xl backdrop-blur text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>{toastMessage}</span>
          {toastAction && (
            <button
              type="button"
              onClick={() => { toastAction.run(); setToastMessage(null); setToastAction(null) }}
              className="ml-1 px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold hover:bg-primary/25 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {toastAction.label}
            </button>
          )}
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

      {/* === COMMAND PALETTE (CMD+K / CTRL+K) === */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={tasks}
        onSelectTask={handleSelectTask}
        onSelectView={setView}
        onToggleCriticalPath={() => setShowCritical(prev => !prev)}
        onToggleSimulation={() => {
          setIsSimulating(prev => {
            const next = !prev
            if (next && !simulationTargetId && tasks.length > 0) {
              const firstNonMilestone = tasks.find(t => !t.isMilestone)
              if (firstNonMilestone) setSimulationTargetId(firstNonMilestone.id)
            }
            return next
          })
        }}
        onShiftDates={handleShiftDates}
        onExportCSV={handleExportCSV}
        onExportPNG={handleExportPNG}
      />
    </div>
  )
}