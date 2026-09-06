'use client'

import { useCallback } from 'react'
import { ListFilter } from 'lucide-react'
import { TimelineTask } from '@/lib/schema'

interface AssigneeFilterProps {
  tasks: TimelineTask[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function AssigneeFilter({ tasks, selected, onChange }: AssigneeFilterProps) {
  const assignees = Array.from(
    new Set(tasks.map(t => t.assignee).filter(Boolean) as string[]),
  ).sort()

  const toggle = useCallback(
    (name: string) => {
      if (selected.includes(name)) {
        onChange(selected.filter(s => s !== name))
      } else {
        onChange([...selected, name])
      }
    },
    [selected, onChange],
  )

  const selectAll = useCallback(() => onChange([]), [onChange])

  if (assignees.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted text-[11px] font-medium uppercase tracking-wider mr-1">
        Assignees:
      </span>
      <button
        className={`px-2 py-1 rounded text-[13px] transition-colors inline-flex items-center gap-1 ${
          selected.length === 0
            ? 'bg-primary text-white font-medium'
            : 'bg-surface-hi/30 text-text-dim hover:text-text-primary'
        }`}
        onClick={selectAll}
        title="Tampilkan semua task (reset filter)"
      >
        <ListFilter size={12} />
        All ({assignees.length})
      </button>
      {assignees.map(a => {
        // "@" marks a real person/team label — never the reset button above.
        // (Template data literally names someone "Semua"; users could even
        // name a PIC "All". The @ + icon keeps the two unmistakable.)
        const handle = `@${a.replace(/^@+/, '')}`
        return (
          <button
            key={a}
            className={`px-2 py-1 rounded text-[13px] transition-colors ${
              selected.includes(a)
                ? 'bg-primary text-white font-medium'
                : 'bg-surface-hi/20 text-text-dim hover:text-text-primary hover:bg-surface-hi/40'
            }`}
            onClick={() => toggle(a)}
            title={`Filter task milik ${handle}`}
          >
            {handle}
          </button>
        )
      })}
    </div>
  )
}