import { TimelineTask } from '../schema'
import { addDaysISO, daysBetweenISO } from '../simulation/slippage-engine'

export interface DailyAllocation {
  date: string // YYYY-MM-DD
  dayLabel: string // e.g. "Mon 06"
  isWeekend: boolean
  taskCount: number
  tasks: {
    id: string
    name: string
    isCritical: boolean
    progress: number
  }[]
  loadFactor: number // 1.0 = 100% capacity
  isOverallocated: boolean
}

export interface AssigneeWorkload {
  assigneeName: string
  isUnassigned: boolean
  totalTasks: number
  overallocatedDaysCount: number
  maxLoadFactor: number
  allocations: DailyAllocation[]
}

export interface ProjectWorkloadSummary {
  dateRange: string[]
  assignees: AssigneeWorkload[]
  totalAssignees: number
  overallocatedAssigneesCount: number
  unassignedTasksCount: number
  peakDate: string | null
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Computes workload distribution across team members for every calendar day
 * in the active project horizon.
 */
export function computeProjectWorkload(
  tasks: TimelineTask[],
  capacityLimitPerDay = 1
): ProjectWorkloadSummary {
  if (tasks.length === 0) {
    return {
      dateRange: [],
      assignees: [],
      totalAssignees: 0,
      overallocatedAssigneesCount: 0,
      unassignedTasksCount: 0,
      peakDate: null,
    }
  }

  // 1. Determine date span [minStart, maxEnd]
  const validDates = tasks.flatMap(t => [t.start, t.end]).filter(Boolean)
  const minDate = validDates.reduce((min, d) => (d < min ? d : min), validDates[0])
  const maxDate = validDates.reduce((max, d) => (d > max ? d : max), validDates[0])

  // Build sequential date range array
  const totalDays = Math.max(1, daysBetweenISO(minDate, maxDate) + 1)
  const dateRange: string[] = []
  let cur = minDate
  for (let i = 0; i < totalDays; i++) {
    dateRange.push(cur)
    cur = addDaysISO(cur, 1)
  }

  // 2. Identify all assignees (including Unassigned)
  const assigneeSet = new Set<string>()
  let unassignedCount = 0

  tasks.forEach(t => {
    const raw = t.assignee?.trim()
    if (!raw) {
      unassignedCount++
    } else {
      assigneeSet.add(raw)
    }
  })

  const sortedAssignees = Array.from(assigneeSet).sort((a, b) => a.localeCompare(b))
  const assigneeNames: { name: string; isUnassigned: boolean }[] = sortedAssignees.map(name => ({
    name,
    isUnassigned: false,
  }))

  // Unassigned group always goes at the bottom if unassigned tasks exist
  if (unassignedCount > 0) {
    assigneeNames.push({ name: 'Unassigned', isUnassigned: true })
  }

  // 3. Populate day-by-day allocation for each assignee
  const globalDailyTotals = new Map<string, number>()
  dateRange.forEach(d => globalDailyTotals.set(d, 0))

  let overallocatedAssigneesCount = 0

  const assignees: AssigneeWorkload[] = assigneeNames.map(({ name, isUnassigned }) => {
    // Tasks owned by this assignee (milestones excluded from duration load)
    const personTasks = tasks.filter(t => {
      const empty = !t.assignee || t.assignee.trim() === ''
      if (isUnassigned) return empty
      return !empty && t.assignee!.trim().toLowerCase() === name.toLowerCase()
    })

    let overallocatedDaysCount = 0
    let maxLoadFactor = 0

    const allocations: DailyAllocation[] = dateRange.map(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      const dayOfWeek = dateObj.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dayLabel = `${SHORT_DAYS[dayOfWeek]} ${String(d).padStart(2, '0')}`

      // Tasks covering this calendar day
      const activeOnDay = personTasks.filter(t => {
        if (t.isMilestone) return false
        return dateStr >= t.start && dateStr <= t.end
      })

      const taskCount = activeOnDay.length
      const loadFactor = taskCount // 1 task = 1.0 capacity unit
      const isOverallocated = !isUnassigned && loadFactor > capacityLimitPerDay

      if (isOverallocated) {
        overallocatedDaysCount++
      }
      if (loadFactor > maxLoadFactor) {
        maxLoadFactor = loadFactor
      }

      // Track global daily concurrent tasks
      globalDailyTotals.set(dateStr, (globalDailyTotals.get(dateStr) || 0) + taskCount)

      return {
        date: dateStr,
        dayLabel,
        isWeekend,
        taskCount,
        tasks: activeOnDay.map(t => ({
          id: t.id,
          name: t.name,
          isCritical: !!t.isCritical,
          progress: t.progress || 0,
        })),
        loadFactor,
        isOverallocated,
      }
    })

    if (overallocatedDaysCount > 0) {
      overallocatedAssigneesCount++
    }

    return {
      assigneeName: name,
      isUnassigned,
      totalTasks: personTasks.length,
      overallocatedDaysCount,
      maxLoadFactor,
      allocations,
    }
  })

  // 4. Find project peak workload date
  let peakDate: string | null = null
  let peakTasks = 0
  globalDailyTotals.forEach((count, date) => {
    if (count > peakTasks) {
      peakTasks = count
      peakDate = date
    }
  })

  return {
    dateRange,
    assignees,
    totalAssignees: sortedAssignees.length,
    overallocatedAssigneesCount,
    unassignedTasksCount: unassignedCount,
    peakDate,
  }
}
