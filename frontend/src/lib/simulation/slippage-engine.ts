import { TimelineTask, TimelineDependency, computeCriticalPath } from '../schema'

export interface SimulatedTaskDiff {
  taskId: string
  taskName: string
  originalStart: string
  originalEnd: string
  simulatedStart: string
  simulatedEnd: string
  varianceDays: number
  isDirectlyShifted: boolean
  isCriticalPathImpacted: boolean
  isMilestone: boolean
}

export interface SimulationResult {
  diffs: Map<string, SimulatedTaskDiff>
  targetTaskId: string
  deltaDays: number
  baselineProjectEnd: string
  simulatedProjectEnd: string
  projectDelayDays: number
  impactedCount: number
  criticalPathImpactedCount: number
}

export function addDaysISO(dateStr: string, days: number): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr
  const [y, m, d] = dateStr.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const resY = date.getFullYear()
  const resM = String(date.getMonth() + 1).padStart(2, '0')
  const resD = String(date.getDate()).padStart(2, '0')
  return `${resY}-${resM}-${resD}`
}

export function daysBetweenISO(startStr: string, endStr: string): number {
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const s = new Date(sy, sm - 1, sd)
  const e = new Date(ey, em - 1, ed)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Computes downstream slippage cascades using the dependency DAG.
 * Non-destructive: preserves original tasks and computes simulated diffs.
 */
export function computeDownstreamSlippage(
  tasks: TimelineTask[],
  dependencies: TimelineDependency[],
  targetTaskId: string,
  deltaDays: number
): SimulationResult {
  const diffs = new Map<string, SimulatedTaskDiff>()

  const emptyResult: SimulationResult = {
    diffs,
    targetTaskId,
    deltaDays,
    baselineProjectEnd: '',
    simulatedProjectEnd: '',
    projectDelayDays: 0,
    impactedCount: 0,
    criticalPathImpactedCount: 0,
  }

  if (tasks.length === 0 || !targetTaskId || deltaDays === 0) {
    return emptyResult
  }

  const targetTask = tasks.find(t => t.id === targetTaskId)
  if (!targetTask) {
    return emptyResult
  }

  const criticalPathSet = computeCriticalPath(tasks, dependencies)

  // Adjacency graph: source -> targets
  const adj = new Map<string, { targetId: string; type: string }[]>()
  tasks.forEach(t => adj.set(t.id, []))
  dependencies.forEach(d => {
    if (adj.has(d.sourceId)) {
      adj.get(d.sourceId)!.push({ targetId: d.targetId, type: d.type || 'FS' })
    }
  })

  // Simulated state tracker: taskId -> { start, end, variance }
  const simMap = new Map<string, { start: string; end: string; variance: number; direct: boolean }>()

  // 1. Shift target task directly
  const targetSimStart = addDaysISO(targetTask.start, deltaDays)
  const targetSimEnd = addDaysISO(targetTask.end, deltaDays)
  simMap.set(targetTaskId, {
    start: targetSimStart,
    end: targetSimEnd,
    variance: deltaDays,
    direct: true,
  })

  // 2. Downstream BFS / Topological cascade
  const queue: string[] = [targetTaskId]
  const visited = new Set<string>([targetTaskId])

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const currentSim = simMap.get(currentId)!
    const outgoing = adj.get(currentId) || []

    for (const { targetId, type } of outgoing) {
      const succTask = tasks.find(t => t.id === targetId)
      if (!succTask) continue

      let candidateStart = succTask.start

      if (type === 'FS') {
        // Finish-to-Start: successor starts the day after predecessor ends
        const minValidStart = addDaysISO(currentSim.end, 1)
        if (minValidStart > succTask.start) {
          candidateStart = minValidStart
        }
      } else if (type === 'SS') {
        // Start-to-Start: successor starts at or after predecessor starts
        if (currentSim.start > succTask.start) {
          candidateStart = currentSim.start
        }
      } else {
        // Default to FS logic
        const minValidStart = addDaysISO(currentSim.end, 1)
        if (minValidStart > succTask.start) {
          candidateStart = minValidStart
        }
      }

      // If pushed beyond original start or beyond previously simulated start
      const existingSim = simMap.get(targetId)
      const currentKnownStart = existingSim ? existingSim.start : succTask.start

      if (candidateStart > currentKnownStart) {
        const pushDays = daysBetweenISO(succTask.start, candidateStart)
        const succSimEnd = addDaysISO(succTask.end, pushDays)
        simMap.set(targetId, {
          start: candidateStart,
          end: succSimEnd,
          variance: pushDays,
          direct: false,
        })
        if (!visited.has(targetId)) {
          visited.add(targetId)
          queue.push(targetId)
        }
      }
    }
  }

  // Populate diffs for all altered tasks
  simMap.forEach((sim, id) => {
    const original = tasks.find(t => t.id === id)
    if (!original) return

    diffs.set(id, {
      taskId: id,
      taskName: original.name,
      originalStart: original.start,
      originalEnd: original.end,
      simulatedStart: sim.start,
      simulatedEnd: sim.end,
      varianceDays: sim.variance,
      isDirectlyShifted: sim.direct,
      isCriticalPathImpacted: criticalPathSet.has(id),
      isMilestone: !!original.isMilestone,
    })
  })

  // Compute baseline vs simulated project end
  const baselineProjectEnd = tasks.reduce((max, t) => (t.end > max ? t.end : max), '')
  const simulatedProjectEnd = tasks.reduce((max, t) => {
    const effEnd = diffs.has(t.id) ? diffs.get(t.id)!.simulatedEnd : t.end
    return effEnd > max ? effEnd : max
  }, '')

  const projectDelayDays = Math.max(0, daysBetweenISO(baselineProjectEnd, simulatedProjectEnd))
  let criticalCount = 0
  diffs.forEach(d => {
    if (d.isCriticalPathImpacted) criticalCount++
  })

  return {
    diffs,
    targetTaskId,
    deltaDays,
    baselineProjectEnd,
    simulatedProjectEnd,
    projectDelayDays,
    impactedCount: diffs.size,
    criticalPathImpactedCount: criticalCount,
  }
}
