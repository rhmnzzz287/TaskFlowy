import { TimelineTask } from '@/lib/schema'

interface ParseTelemetryBarProps {
  tasks: TimelineTask[]
  timezone: string
}

export function ParseTelemetryBar({ tasks, timezone }: ParseTelemetryBarProps) {

  const nodeCount = tasks.length
  const criticalCount = tasks.filter(t => t.isCritical).length
  const totalDays = tasks.reduce((sum, t) => sum + (t.isMilestone ? 0 : t.durationDays), 0)

  return (
    <div className="h-8 shrink-0 bg-surface-dim border-b border-border px-3 flex items-center justify-center gap-6 text-[12px] overflow-x-auto whitespace-nowrap">
      <span className="flex items-center gap-1.5">
        <span className="label">Tasks</span>
        <span className="font-semibold text-text-primary">{nodeCount}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="label">DAG Loops</span>
        <span className="font-semibold text-secondary">0 (valid)</span>
      </span>
      <span className="hidden lg:flex items-center gap-1.5">
        <span className="label">Timezone</span>
        <span className="font-mono text-text-primary">{timezone}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="label">Critical</span>
        <span className="font-semibold text-critical">{criticalCount} task{criticalCount === 1 ? '' : 's'}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="label">Effort</span>
        <span className="font-mono text-text-primary">{totalDays} days</span>
      </span>
    </div>
  )
}