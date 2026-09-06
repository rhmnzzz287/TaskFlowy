// Canonical types — matches SCHEMA.md + extended for full mockup fidelity

export interface TimelineDependency {
  id: string
  sourceId: string
  targetId: string
  type: 'FS' | 'SS' | 'FF' | 'SF'
}

export interface ParseRowInput {
  name: string
  assignee?: string | null
  start: string
  duration?: string | null
  end?: string | null
}

export interface TimelineTask {
  id: string
  name: string
  assignee: string | null
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
  durationDays: number
  dependsOn?: string | null
  ambiguities: string[]
  progress?: number   // 0-100 completion %
  isMilestone?: boolean
  isCritical?: boolean
  color?: string
  status?: 'planned' | 'in-progress' | 'completed' | 'flagged'
}

export interface ExtractTelemetry {
  nodeCount: number
  topologicalLoops: number
  timezoneLock: string
  scheduleRisk: 'Low' | 'Moderate' | 'High'
  parseLatencyMs: number
  confidence: number
}

export interface ParseRowState {
  id: string
  name: string
  assignee: string
  start: string
  duration: string
  end: string
  dependsOn: string
  progress?: string
}

// Frappe Gantt adapter type
export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies?: string
  custom_class?: string
}

export function createTaskId(): string {
  return `task-${crypto.randomUUID().slice(0, 8)}`
}

export function createRowId(): string {
  return `row-${crypto.randomUUID().slice(0, 8)}`
}

export function createDepId(): string {
  return `dep-${crypto.randomUUID().slice(0, 8)}`
}

export const DEFAULT_TIMEZONE = 'Asia/Jakarta'

export function todayRef(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function dateDiffDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

// Compute critical path via longest-path through dependency DAG
// Tasks with 0 slack (lying on the longest chain) are flagged critical
export function computeCriticalPath(tasks: TimelineTask[], deps: TimelineDependency[]): Set<string> {
  const critical = new Set<string>()
  if (tasks.length === 0) return critical

  const idToTask = new Map(tasks.map(t => [t.id, t]))
  const indegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  const earliest = new Map<string, number>()
  const latest = new Map<string, number>()

  // init
  tasks.forEach(t => {
    indegree.set(t.id, 0)
    adj.set(t.id, [])
    earliest.set(t.id, 0)
    latest.set(t.id, Infinity)
  })

  // build graph from deps (source -> target)
  deps.forEach(d => {
    const s = d.sourceId
    const t = d.targetId
    if (!adj.has(s) || !adj.has(t)) return
    adj.get(s)!.push(t)
    indegree.set(t, (indegree.get(t) || 0) + 1)
  })

  // topological order (Kahn)
  const queue: string[] = []
  indegree.forEach((deg, id) => { if (deg === 0) queue.push(id) })
  const topo: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    topo.push(id)
    const next = adj.get(id)!
    next.forEach(nt => {
      const nd = indegree.get(nt)! - 1
      indegree.set(nt, nd)
      if (nd === 0) queue.push(nt)
    })
  }

  // forward pass: earliest start = max(predecessor earliest + duration)
  topo.forEach(id => {
    const prev = tasks.filter(t => adj.get(t.id)?.includes(id))
    const es = prev.reduce((max, p) => {
      const pES = earliest.get(p.id)!
      const pDur = p.isMilestone ? 0 : p.durationDays
      return Math.max(max, pES + pDur)
    }, 0)
    earliest.set(id, es)
  })

  const projectEnd = topo.reduce((max, id) => {
    const es = earliest.get(id)!
    const dur = idToTask.get(id)!.isMilestone ? 0 : idToTask.get(id)!.durationDays
    return Math.max(max, es + dur)
  }, 0)

  // backward pass
  latest.set(topo[topo.length - 1] ?? '', projectEnd)
  ;[...topo].reverse().forEach(id => {
    const next = adj.get(id)!
    const lf = next.length
      ? Math.min(...next.map(nt => latest.get(nt)! - (idToTask.get(nt)!.isMilestone ? 0 : idToTask.get(nt)!.durationDays)))
      : projectEnd
    latest.set(id, lf)
  })

  // slack = latest - earliest; critical = slack == 0 on longest chain
  const maxEarliest = Math.max(...tasks.map(t => earliest.get(t.id)!))
  tasks.forEach(t => {
    const slack = (latest.get(t.id) || Infinity) - (earliest.get(t.id) || 0)
    if (slack === 0 && (earliest.get(t.id) || 0) > 0) {
      critical.add(t.id)
    }
  })

  return critical
}

// Detect topological loops (cycles) in dependency graph
export function detectCycles(tasks: TimelineTask[], deps: TimelineDependency[]): string[] {
  const problems: string[] = []
  const adj = new Map<string, string[]>()
  const state = new Map<string, 0 | 1 | 2>() // 0=unvisited 1=in-stack 2=done
  tasks.forEach(t => { adj.set(t.id, []); state.set(t.id, 0) })
  deps.forEach(d => { adj.get(d.sourceId)?.push(d.targetId) })

  const stack: string[] = []
  const dfs = (id: string): boolean => {
    state.set(id, 1)
    stack.push(id)
    for (const n of (adj.get(id) || [])) {
      if (state.get(n) === 1) {
        // cycle found
        const cycle = stack.slice(stack.indexOf(n)).concat(n)
        problems.push(`Dependency cycle detected: ${cycle.join(' → ')}`)
        return true
      } else if (state.get(n) === 0) {
        if (dfs(n)) return true
      }
    }
    stack.pop()
    state.set(id, 2)
    return false
  }

  tasks.forEach(t => { if (state.get(t.id) === 0) dfs(t.id) })
  return problems
}