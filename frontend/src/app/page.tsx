'use client'

import { useState, useCallback, useMemo } from 'react'
import { Play } from 'lucide-react'
import { RowEditor } from '@/components/task-input/row-editor'
import { ReviewTable } from '@/components/parse-review/review-table'
import { AssigneeFilter } from '@/components/assignee-filter/filter-bar'
import { GanttBoard } from '@/components/gantt-board/gantt-board'
import { ExportButton } from '@/components/export-csv/export-button'
import { StatusBanner } from '@/components/ui/status-banner'
import {
  ParseRowState,
  TimelineTask,
  createRowId,
  todayRef,
  DEFAULT_TIMEZONE,
} from '@/lib/schema'
import { parseRows, validateTaskConsistency } from '@/lib/parser/row-parser'

export default function Home() {
  const [inputRows, setInputRows] = useState<ParseRowState[]>([
    { id: createRowId(), name: '', assignee: '', start: '', duration: '', end: '' },
  ])
  const [tasks, setTasks] = useState<TimelineTask[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)

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
    const validationIssues = validateTaskConsistency(result.tasks)

    // Map row-level errors to user-facing strings
    const errMap: Record<string, string> = {}
    for (const [idx, errs] of Object.entries(result.errors)) {
      const rowId = inputRows[parseInt(idx)]?.id
      if (rowId) {
        errMap[rowId] = errs[0] // show first error per row
      }
    }
    setErrors(errMap)

    // Only update if no fatal errors
    if (Object.keys(errMap).length === 0) {
      setTasks(result.tasks)
      setWarnings([...result.warnings, ...validationIssues])
      setHasGenerated(true)
    }
  }, [inputRows])

  const handleTasksChange = useCallback((updated: TimelineTask[]) => {
    setTasks(updated)
  }, [])

  // Derived: all unique assignees from current tasks
  const allAssignees = useMemo(
    () => Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))).sort() as string[],
    [tasks],
  )

  const canGenerate = inputRows.some(r => r.name.trim().length > 0)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="#4F46E5" />
            <rect x="8" y="12" width="14" height="4" rx="2" fill="#FFFFFF" />
            <rect x="18" y="19" width="14" height="4" rx="2" fill="#38BDF8" />
            <rect x="12" y="26" width="18" height="4" rx="2" fill="#818CF8" />
            <path d="M22 16L22 19M26 23L26 26" stroke="#C7D2FE" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
          <h1 className="text-text-primary text-[15px] font-semibold tracking-tight">
            Text-to-Gantt
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-primary"
            onClick={handleParse}
            disabled={!canGenerate}
          >
            <Play size={14} />
            <span>Generate Timeline</span>
          </button>
          {hasGenerated && <ExportButton tasks={tasks} />}
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Input section */}
        <section className="shrink-0">
          <RowEditor
            rows={inputRows}
            onChange={setInputRows}
            errors={errors}
          />
        </section>

        {/* Review + Filter bar */}
        {hasGenerated && tasks.length > 0 && (
          <section className="shrink-0 border-b border-border">
            <div className="px-3 py-2 space-y-2">
              <ReviewTable tasks={tasks} warnings={warnings} />
              <AssigneeFilter
                tasks={tasks}
                selected={selectedAssignees}
                onChange={setSelectedAssignees}
              />
            </div>
          </section>
        )}

        {/* Gantt workspace + Status bar */}
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-2">
          <GanttBoard
            tasks={tasks}
            selectedAssignees={selectedAssignees}
            onTasksChange={handleTasksChange}
          />
          <div className="shrink-0 px-2">
            {hasGenerated ? (
              <StatusBanner tasks={tasks} warnings={warnings} />
            ) : (
              <p className="text-muted text-[13px]">
                Add tasks and click Generate Timeline to build your Gantt chart.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}