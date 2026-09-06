'use client'

import { useMemo } from 'react'
import { TimelineTask } from '@/lib/schema'
import { BarChart3, CircleCheck, AlertTriangle, Diamond, User, CalendarDays, TrendingUp } from 'lucide-react'

interface AnalysisViewProps {
  tasks: TimelineTask[]
}

export function AnalysisView({ tasks }: AnalysisViewProps) {
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => (t.progress ?? 0) >= 100).length
    const critical = tasks.filter(t => t.isCritical).length
    const milestones = tasks.filter(t => t.isMilestone).length
    const inProgress = tasks.filter(t => (t.progress ?? 0) > 0 && (t.progress ?? 0) < 100).length
    const planned = total - completed - inProgress - milestones
    const totalDays = tasks.reduce((s, t) => s + (t.isMilestone ? 0 : t.durationDays), 0)

    // Assignee workload
    const workload = new Map<string, { tasks: number; days: number }>()
    tasks.forEach(t => {
      const name = t.assignee || '(unassigned)'
      const w = workload.get(name) || { tasks: 0, days: 0 }
      w.tasks++
      w.days += t.isMilestone ? 0 : t.durationDays
      workload.set(name, w)
    })
    const assignees = [...workload.entries()].sort((a, b) => b[1].days - a[1].days)

    return { total, completed, critical, milestones, inProgress, planned, totalDays, assignees }
  }, [tasks])

  const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) => (
    <div className="bg-surface rounded p-3 border border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-muted text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[22px] font-semibold text-text-primary">{value}</span>
    </div>
  )

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-[13px]">
        No data. Generate a timeline first.
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-surface-dim/30">
      <div className="p-4 flex flex-col gap-4 max-w-3xl">
        {/* Header */}
        <div>
          <h3 className="text-text-primary text-[15px] font-semibold flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            Project Analysis
          </h3>
          <p className="text-muted text-[12px] mt-0.5">{stats.total} task{stats.total > 1 ? 's' : ''} · {stats.totalDays} total days</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Tasks" value={stats.total} icon={<BarChart3 size={14} />} color="text-primary" />
          <StatCard label="Completed" value={stats.completed} icon={<CircleCheck size={14} />} color="text-completed" />
          <StatCard label="Critical" value={stats.critical} icon={<AlertTriangle size={14} />} color="text-critical" />
          <StatCard label="Milestones" value={stats.milestones} icon={<Diamond size={14} />} color="text-milestone" />
        </div>

        {/* Status breakdown */}
        <div className="bg-surface rounded border border-border p-3">
          <h4 className="text-text-primary text-[13px] font-semibold mb-3 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-primary" />
            Status Breakdown
          </h4>
          <div className="flex items-center h-6 rounded overflow-hidden text-[11px] font-medium">
            {[
              { label: 'Planned', count: stats.planned, color: 'bg-muted/30 text-muted' },
              { label: 'In Progress', count: stats.inProgress, color: 'bg-secondary/30 text-secondary' },
              { label: 'Completed', count: stats.completed, color: 'bg-completed/30 text-completed' },
              { label: 'Critical', count: stats.critical, color: 'bg-critical/30 text-critical' },
              { label: 'Milestone', count: stats.milestones, color: 'bg-milestone/30 text-milestone' },
            ].filter(s => s.count > 0).map(s => (
              <div key={s.label} className={`${s.color} h-full flex items-center justify-center px-2`}
                style={{ flex: s.count }}>
                {s.label} {s.count}
              </div>
            ))}
          </div>
        </div>

        {/* Assignee workload */}
        {stats.assignees.length > 0 && (
          <div className="bg-surface rounded border border-border p-3">
            <h4 className="text-text-primary text-[13px] font-semibold mb-3 flex items-center gap-1.5">
              <User size={14} className="text-primary" />
              Assignee Workload
            </h4>
            <div className="flex flex-col gap-2">
              {stats.assignees.map(([name, w]) => {
                const pct = stats.totalDays > 0 ? Math.round((w.days / stats.totalDays) * 100) : 0
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-text-primary">{name}</span>
                      <span className="text-muted font-mono">{w.tasks} task{w.tasks > 1 ? 's' : ''} · {w.days} days</span>
                    </div>
                    <div className="h-2 bg-surface-hi/30 rounded overflow-hidden">
                      <div className="h-full bg-primary rounded transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Timeline summary */}
        <div className="bg-surface rounded border border-border p-3">
          <h4 className="text-text-primary text-[13px] font-semibold mb-2 flex items-center gap-1.5">
            <CalendarDays size={14} className="text-primary" />
            Timeline
          </h4>
          <div className="text-[12px] text-muted space-y-1">
            <p>Total effort: <span className="font-mono text-text-primary">{stats.totalDays} days</span></p>
            <p>Duration range: <span className="font-mono text-text-primary">
              {tasks.length > 0 ? `${tasks[0].start} → ${tasks[tasks.length - 1].end}` : '—'}
            </span></p>
            <p>Avg task duration: <span className="font-mono text-text-primary">
              {stats.total > 0 ? `${(stats.totalDays / stats.total).toFixed(1)} days` : '—'}
            </span></p>
          </div>
        </div>
      </div>
    </div>
  )
}