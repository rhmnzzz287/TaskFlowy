import { TimelineTask } from '@/lib/schema'

export function StatusBanner({ tasks, warnings }: { tasks: TimelineTask[]; warnings: string[] }) {
  const allCount = tasks.length
  const invalidCount = tasks.filter(t => {
    const s = new Date(t.start)
    const e = new Date(t.end)
    return e < s || t.durationDays < 1
  }).length
  const validCount = allCount - invalidCount

  return (
    <div className="flex items-center gap-3 text-[12px] text-muted">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-completed" />
        {validCount} Valid
      </span>
      {invalidCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-error" />
          {invalidCount} Invalid
        </span>
      )}
      {warnings.length > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" />
          {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
        </span>
      )}
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-secondary" />
        {tasks.length > 0 ? 'In Progress' : 'Planned'}
      </span>
    </div>
  )
}