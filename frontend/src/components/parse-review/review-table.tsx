import { TimelineTask } from '@/lib/schema'

interface ReviewTableProps {
  tasks: TimelineTask[]
  warnings: string[]
}

export function ReviewTable({ tasks, warnings }: ReviewTableProps) {
  if (tasks.length === 0) return null

  return (
    <div className="rounded overflow-hidden">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 px-3 py-2 mb-2">
          {warnings.map((w, i) => (
            <p key={i} className="text-warning text-[13px]">{w}</p>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="h-8 bg-surface/80 text-muted text-[11px] font-medium uppercase tracking-wider">
              <th className="text-left px-2">Task</th>
              <th className="text-left px-2">Assignee</th>
              <th className="text-left px-2">Start</th>
              <th className="text-left px-2">End</th>
              <th className="text-right px-2">Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map(t => (
              <tr key={t.id} className="h-9 hover:bg-surface-hi/20 transition-colors">
                <td className="px-2 text-text-primary font-medium">{t.name}</td>
                <td className="px-2 text-text-dim">{t.assignee || '—'}</td>
                <td className="px-2 text-text-dim">{t.start}</td>
                <td className="px-2 text-text-dim">{t.end}</td>
                <td className="px-2 text-right text-text-primary font-mono">{t.durationDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}