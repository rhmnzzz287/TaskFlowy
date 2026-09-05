import { TimelineTask } from '@/lib/schema'

interface LegendBarProps {
  tasks: TimelineTask[]
  warnings: string[]
}

export function LegendBar({ tasks, warnings }: LegendBarProps) {
  const allCount = tasks.length
  const completed = tasks.filter(t => (t.progress ?? 0) >= 100).length
  const inProgress = tasks.filter(t => (t.progress ?? 0) > 0 && (t.progress ?? 0) < 100).length
  const critical = tasks.filter(t => t.isCritical).length
  const milestone = tasks.filter(t => t.isMilestone).length

  return (
    <div className="h-8 bg-surface border-t border-border flex items-center justify-between px-3 text-[11px] text-muted shrink-0">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-completed" />
          Completed ({completed})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-critical" />
          Critical ({critical})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          In Progress ({inProgress})
        </span>
        {warnings.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
          </span>
        )}
        {milestone > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rotate-45 bg-milestone" />
            Milestones ({milestone})
          </span>
        )}
      </div>
      <span className="font-mono">Total: {allCount} tasks</span>
    </div>
  )
}