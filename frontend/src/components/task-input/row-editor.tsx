'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Copy, ArrowUpDown } from 'lucide-react'
import { ParseRowState, createRowId } from '@/lib/schema'
import { parseDate, formatDateISO } from '@/lib/parser/date-grammar'
import { parseDuration } from '@/lib/parser/duration-grammar'
import { DurationInput } from './duration-input'

interface RowEditorProps {
  rows: ParseRowState[]
  onChange: (rows: ParseRowState[]) => void
  errors: Record<string, string>
}

type SortColumn = 'name' | 'assignee' | 'start' | 'duration' | 'end'
type SortDir = 'asc' | 'desc'

function parseDateForSort(val: string): number {
  if (!val || !val.trim()) return 0
  const p = parseDate(val, new Date().toISOString().slice(0, 10))
  if (p.ok) return new Date(p.value).getTime()
  const t = new Date(val).getTime()
  return isNaN(t) ? 0 : t
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
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // value we last auto-filled per row, so we can clear stale auto-fills
  // without clobbering a manual override the user typed into the End field.
  const lastAutoEndRef = useRef<Record<string, string>>({})
  // Focus the name cell of a freshly appended row so typing immediately
  // grows the live chart (an empty row otherwise renders nothing). Skipped
  // on first mount / bulk loads (template, draft) to avoid stealing focus.
  const prevCountRef = useRef(rows.length)
  const lastNameRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (rows.length > prevCountRef.current && prevCountRef.current > 0) {
      lastNameRef.current?.focus()
    }
    prevCountRef.current = rows.length
  }, [rows.length])

  const handleSort = useCallback(
    (col: SortColumn) => {
      const nextDir = sortColumn === col && sortDir === 'asc' ? 'desc' : 'asc'
      setSortColumn(col)
      setSortDir(nextDir)

      const sorted = [...rows].sort((a, b) => {
        let cmp = 0
        if (col === 'duration') {
          const resA = parseDuration(a.duration)
          const resB = parseDuration(b.duration)
          const dA = resA.ok ? resA.days : 0
          const dB = resB.ok ? resB.days : 0
          cmp = dA - dB
        } else if (col === 'start' || col === 'end') {
          cmp = parseDateForSort(a[col]) - parseDateForSort(b[col])
        } else {
          const va = (a[col] || '').trim()
          const vb = (b[col] || '').trim()
          cmp = va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: true })
        }
        return nextDir === 'asc' ? cmp : -cmp
      })

      onChange(sorted)
    },
    [rows, onChange, sortColumn, sortDir],
  )

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
    setSortColumn(null)
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

  const SortButton = ({ col, label }: { col: SortColumn; label: string }) => {
    const isActive = sortColumn === col
    return (
      <button
        type="button"
        onClick={() => handleSort(col)}
        className={`w-full flex items-center justify-center gap-1 transition-colors hover:text-text-primary uppercase tracking-wider text-[11px] font-medium cursor-pointer select-none group ${
          isActive ? 'text-primary font-semibold' : 'text-muted'
        }`}
        title={`Sort by ${label} (${isActive ? (sortDir === 'asc' ? 'Ascending' : 'Descending') : 'Klik untuk urutkan'})`}
      >
        <span>{label}</span>
        {isActive ? (
          sortDir === 'asc' ? (
            <ArrowUp size={11} className="shrink-0 text-primary" />
          ) : (
            <ArrowDown size={11} className="shrink-0 text-primary" />
          )
        ) : (
          <ArrowUpDown size={10} className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="h-8 bg-surface/80 flex items-center px-2 text-muted text-[11px] font-medium uppercase tracking-wider border-b border-border text-center">
        <div className="w-[30%] min-w-[140px] text-center">
          <SortButton col="name" label="Task" />
        </div>
        <div className="w-[17%] min-w-[100px] text-center">
          <SortButton col="assignee" label="Assignee" />
        </div>
        <div className="w-[19%] min-w-[105px] text-center">
          <SortButton col="start" label="Start" />
        </div>
        <div className="w-[16%] min-w-[90px] text-center">
          <SortButton col="duration" label="Durasi" />
        </div>
        <div className="w-[18%] min-w-[95px] text-center">
          <SortButton col="end" label="End" />
        </div>
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
                  ref={idx === rows.length - 1 ? lastNameRef : undefined}
                  className="cell-input text-center"
                  placeholder="Task name"
                  value={row.name}
                  onChange={e => updateRow(row.id, 'name', e.target.value)}
                />
              </div>
              <div className="w-[17%] min-w-[100px] pr-1">
                <input
                  className="cell-input text-center"
                  placeholder="Person"
                  value={row.assignee}
                  onChange={e => updateRow(row.id, 'assignee', e.target.value)}
                />
              </div>
              <div className="w-[19%] min-w-[105px] pr-1">
                <input
                  type="date"
                  className={`cell-input text-center ${err.includes('date') || err.includes('Start') ? 'ring-1 ring-error' : ''}`}
                  title="Tanggal mulai (klik untuk kalender)"
                  value={row.start}
                  onChange={e => updateRow(row.id, 'start', e.target.value)}
                />
              </div>
              <div className="w-[16%] min-w-[90px] pr-1">
                <DurationInput
                  className="text-center"
                  error={Boolean(err.includes('duration') || err.includes('Duration'))}
                  placeholder="3 hari"
                  value={row.duration}
                  onChange={val => updateRow(row.id, 'duration', val)}
                />
              </div>
              <div className="w-[18%] min-w-[95px] pr-1">
                <input
                  type="date"
                  className="cell-input text-center text-text-dim"
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
        <div className="flex items-center gap-3">
          {sortColumn && (
            <span className="text-[11px] text-text-dim flex items-center gap-1">
              <span>Urut: <strong className="text-text-primary capitalize">{sortColumn}</strong> ({sortDir === 'asc' ? 'Asc' : 'Desc'})</span>
              <button
                type="button"
                onClick={() => setSortColumn(null)}
                className="text-primary hover:underline ml-1"
                title="Reset urutan"
              >
                Reset
              </button>
            </span>
          )}
          <span className="text-muted text-[12px]">{rows.length} tasks</span>
        </div>
      </div>
    </div>
  )
}