'use client'

import { useCallback, useRef } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import { ParseRowState, createRowId } from '@/lib/schema'
import { parseDate, formatDateISO } from '@/lib/parser/date-grammar'
import { parseDuration } from '@/lib/parser/duration-grammar'
import { DurationInput } from './duration-input'

interface RowEditorProps {
  rows: ParseRowState[]
  onChange: (rows: ParseRowState[]) => void
  errors: Record<string, string>
}

// Live-compute end date from start + duration when both parse, but only if the
// user hasn't typed their own end value. ENSURE end field reflects duration so
// the user never has to enter END manually.
function computeEndFromDuration(row: ParseRowState): string | null {
  if (!row.start.trim() || !row.duration.trim()) return null
  const startRes = parseDate(row.start, new Date().toISOString().slice(0, 10))
  const durRes = parseDuration(row.duration)
  if (!startRes.ok || !durRes.ok) return null
  const end = new Date(startRes.value)
  // 0-day milestone: checkpoint sits on its start date (span collapses to 0)
  end.setDate(end.getDate() + Math.max(0, durRes.days - 1))
  return formatDateISO(end)
}

export function RowEditor({ rows, onChange, errors }: RowEditorProps) {
  // value we last auto-filled per row, so we can clear stale auto-fills
  // without clobbering a manual override the user typed into the End field.
  const lastAutoEndRef = useRef<Record<string, string>>({})

  const updateRow = useCallback(
    (id: string, field: keyof ParseRowState, value: string) => {
      onChange(
        rows.map(r => {
          if (r.id !== id) return r
          const next: ParseRowState = { ...r, [field]: value }

          // When user edits start OR duration, auto-derive end. If inputs no
          // longer yield a valid date, drop only the stale auto-filled value
          // (keep a manual override the user typed in).
          if (field === 'start' || field === 'duration') {
            const computed = computeEndFromDuration(next)
            if (computed !== null) {
              next.end = computed
              lastAutoEndRef.current[id] = computed
            } else if (next.end === lastAutoEndRef.current[id]) {
              next.end = ''
              delete lastAutoEndRef.current[id]
            }
          }
          return next
        }),
      )
    },
    [rows, onChange],
  )

  const removeRow = useCallback(
    (id: string) => {
      if (rows.length <= 1) return
      onChange(rows.filter(r => r.id !== id))
    },
    [rows, onChange],
  )

  // Frictionless sequential input: a new row chains onto the previous one —
  // same owner, start = previous end, preset duration.
  const addRow = useCallback(() => {
    const lastRow = rows[rows.length - 1]
    const defaultStart = lastRow?.end ? lastRow.end : new Date().toISOString().slice(0, 10)

    onChange([
      ...rows,
      {
        id: createRowId(),
        name: '',
        assignee: lastRow?.assignee || '',
        start: defaultStart,
        duration: '3 hari',
        end: '',
        dependsOn: '',
      },
    ])
  }, [rows, onChange])

  const moveRow = useCallback((index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= rows.length) return
    const next = [...rows]
    const temp = next[index]
    next[index] = next[targetIdx]
    next[targetIdx] = temp
    onChange(next)
  }, [rows, onChange])

  const duplicateRow = useCallback((index: number) => {
    const target = rows[index]
    const copy = { ...target, id: createRowId(), name: `${target.name} (Copy)` }
    const next = [...rows]
    next.splice(index + 1, 0, copy)
    onChange(next)
  }, [rows, onChange])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="h-8 bg-surface/80 flex items-center px-2 text-muted text-[11px] font-medium uppercase tracking-wider border-b border-border">
        <div className="w-[30%] min-w-[140px] pl-1">Task</div>
        <div className="w-[17%] min-w-[100px]">Assignee</div>
        <div className="w-[19%] min-w-[105px]">Start</div>
        <div className="w-[16%] min-w-[90px]">Durasi</div>
        <div className="w-[18%] min-w-[95px]">End</div>
        <div className="w-[72px] shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border border-b border-border">
        {rows.map((row, idx) => {
          const err = errors[row.id] || ''
          return (
            <div key={row.id} className="h-10 flex items-center px-2 hover:bg-surface-hi/30 transition-colors group">
              <div className="w-[30%] min-w-[140px] pr-1">
                <input
                  className="cell-input"
                  placeholder="Task name"
                  value={row.name}
                  onChange={e => updateRow(row.id, 'name', e.target.value)}
                />
              </div>
              <div className="w-[17%] min-w-[100px] pr-1">
                <input
                  className="cell-input"
                  placeholder="Person"
                  value={row.assignee}
                  onChange={e => updateRow(row.id, 'assignee', e.target.value)}
                />
              </div>
              <div className="w-[19%] min-w-[105px] pr-1">
                <input
                  type="date"
                  className={`cell-input ${err.includes('date') || err.includes('Start') ? 'ring-1 ring-error' : ''}`}
                  title="Tanggal mulai (klik untuk kalender)"
                  value={row.start}
                  onChange={e => updateRow(row.id, 'start', e.target.value)}
                />
              </div>
              <div className="w-[16%] min-w-[90px] pr-1">
                <DurationInput
                  error={Boolean(err.includes('duration') || err.includes('Duration'))}
                  placeholder="3 hari"
                  value={row.duration}
                  onChange={val => updateRow(row.id, 'duration', val)}
                />
              </div>
              <div className="w-[18%] min-w-[95px] pr-1">
                <input
                  type="date"
                  className="cell-input text-text-dim"
                  title="Tanggal selesai (klik untuk kalender)"
                  value={row.end}
                  onChange={e => updateRow(row.id, 'end', e.target.value)}
                />
              </div>
              <div className="w-[72px] shrink-0 flex justify-center gap-0.5">
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-text-primary transition-all p-0.5"
                  onClick={() => moveRow(idx, 'up')}
                  disabled={idx === 0}
                  title="Move row up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-text-primary transition-all p-0.5"
                  onClick={() => moveRow(idx, 'down')}
                  disabled={idx === rows.length - 1}
                  title="Move row down"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-primary transition-all p-0.5"
                  onClick={() => duplicateRow(idx)}
                  title="Duplicate row"
                >
                  <Copy size={12} />
                </button>
                {rows.length > 1 && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-all p-0.5"
                    onClick={() => removeRow(row.id)}
                    title="Remove row"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary bar */}
      <div className="h-9 bg-surface/40 px-3 flex items-center justify-between border-b border-border">
        <button className="flex items-center gap-1 text-primary hover:text-primary-hover text-[13px] font-medium transition-colors" onClick={addRow}>
          <Plus size={14} />
          <span>Add Task Row</span>
        </button>
        <span className="text-muted text-[12px]">{rows.length} tasks</span>
      </div>
    </div>
  )
}