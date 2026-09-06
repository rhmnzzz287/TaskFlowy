import type { TimelineTask } from './schema'

/** Canonical task status — Done (100%) beats critical/milestone labels. */
export type TaskStatus = 'done' | 'critical' | 'milestone' | 'in-progress' | 'planned'

export interface TaskStatusInfo {
  status: TaskStatus
  label: string
  /** Tailwind classes for badge text+background (shared by all views). */
  cls: string
  /** Sort rank: planned < critical < in-progress < milestone < done. */
  rank: number
}

export function taskStatus(t: TimelineTask): TaskStatusInfo {
  const prog = t.progress ?? 0
  if (prog >= 100) {
    return { status: 'done', label: 'Done', cls: 'text-completed bg-completed/10', rank: 5 }
  }
  if (t.isMilestone) {
    return { status: 'milestone', label: 'Milestone', cls: 'text-milestone bg-milestone/10', rank: 4 }
  }
  if (t.isCritical) {
    return { status: 'critical', label: 'Critical', cls: 'text-critical bg-critical/10', rank: 2 }
  }
  if (prog > 0) {
    return { status: 'in-progress', label: `${prog}%`, cls: 'text-secondary bg-secondary/10', rank: 3 }
  }
  return { status: 'planned', label: 'Planned', cls: 'text-text-dim bg-surface-hi/50', rank: 1 }
}