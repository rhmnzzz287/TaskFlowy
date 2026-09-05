'use client'

import { useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ParseRowState, createRowId } from '@/lib/schema'

interface RowEditorProps {
  rows: ParseRowState[]
  onChange: (rows: ParseRowState[]) => void
  errors: Record<string, string>
}

export function RowEditor({ rows, onChange, errors }: RowEditorProps) {
  const updateRow = useCallback(
    (id: string, field: keyof ParseRowState, value: string) => {
      onChange(
        rows.map(r => (r.id === id ? { ...r, [field]: value } : r)),
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

  const addRow = useCallback(() => {
    onChange([
      ...rows,
      { id: createRowId(), name: '', assignee: '', start: '', duration: '', end: '', dependsOn: '' },
    ])
  }, [rows, onChange])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="h-8 bg-surface/80 flex items-center px-2 text-muted text-[11px] font-medium uppercase tracking-wider border-b border-border">
        <div className="w-[30%] min-w-[140px] pl-1">Task</div>
        <div className="w-[16%] min-w-[100px]">Assignee</div>
        <div className="w-[20%] min-w-[110px]">Start</div>
        <div className="w-[17%] min-w-[90px]">Duration</div>
        <div className="w-[17%] min-w-[90px]">End (alt)</div>
        <div className="w-[30px] shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border border-b border-border">
        {rows.map(row => {
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
              <div className="w-[16%] min-w-[100px] pr-1">
                <input
                  className="cell-input"
                  placeholder="Person"
                  value={row.assignee}
                  onChange={e => updateRow(row.id, 'assignee', e.target.value)}
                />
              </div>
              <div className="w-[20%] min-w-[110px] pr-1">
                <input
                  className={`cell-input ${err.includes('date') || err.includes('Start') ? 'ring-1 ring-error' : ''}`}
                  placeholder="10 Sep 2026 / besok"
                  value={row.start}
                  onChange={e => updateRow(row.id, 'start', e.target.value)}
                />
              </div>
              <div className="w-[17%] min-w-[90px] pr-1">
                <input
                  className={`cell-input ${err.includes('duration') || err.includes('Duration') ? 'ring-1 ring-error' : ''}`}
                  placeholder="3 hari"
                  value={row.duration}
                  onChange={e => updateRow(row.id, 'duration', e.target.value)}
                />
              </div>
              <div className="w-[17%] min-w-[90px] pr-1">
                <input
                  className="cell-input text-text-dim"
                  placeholder="...or end"
                  value={row.end}
                  onChange={e => updateRow(row.id, 'end', e.target.value)}
                />
              </div>
              <div className="w-[30px] flex justify-center">
                {rows.length > 1 && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-all p-1"
                    onClick={() => removeRow(row.id)}
                    title="Remove row"
                  >
                    <Trash2 size={14} />
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