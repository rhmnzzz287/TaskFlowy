import { TimelineTask } from '@/lib/schema'

interface ParseTelemetryCardProps {
  tasks: TimelineTask[]
  timezone: string
  show?: boolean
}

export function ParseTelemetryCard({ tasks, timezone, show = true }: ParseTelemetryCardProps) {
  if (!show) return null

  const nodeCount = tasks.length
  const loops = 0
  const criticalCount = tasks.filter(t => t.isCritical).length
  const totalDays = tasks.reduce((sum, t) => sum + (t.isMilestone ? 0 : t.durationDays), 0)

  return (
    <div className="shrink-0 bg-surface-dim border-b border-border px-3 py-2 grid grid-cols-2 md:grid-cols-5 gap-2">
      <div className="flex flex-col">
        <span className="label">Tasks</span>
        <span className="text-[13px] font-semibold text-text-primary">{nodeCount}</span>
      </div>
      <div className="flex flex-col">
        <span className="label">DAG Loops</span>
        <span className={`text-[13px] font-semibold ${loops === 0 ? 'text-secondary' : 'text-warning'}`}>{loops === 0 ? '0 (valid)' : loops}</span>
      </div>
      <div className="flex flex-col">
        <span className="label">Timezone</span>
        <span className="text-[13px] font-semibold text-text-primary font-mono">{timezone}</span>
      </div>
      <div className="flex flex-col">
        <span className="label">Critical</span>
        <span className="text-[13px] font-semibold text-critical">{criticalCount} tasks</span>
      </div>
      <div className="flex flex-col">
        <span className="label">Total Effort</span>
        <span className="text-[13px] font-semibold text-text-primary font-mono">{totalDays} days</span>
      </div>
    </div>
  )
}