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
  dependsOn?: string | null
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

// ID generator with graceful fallback — crypto.randomUUID() only exists in
// secure contexts (https / localhost). Without this guard, any parse/render
// on plain-http hosts throws and the whole timeline UI goes dead.
function safeId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
    }
  } catch { /* fall through to Math.random below */ }
  const rand = Math.floor(Math.random() * 0xffffff).toString(36).padStart(4, '0')
  return `${prefix}-${Date.now().toString(36)}-${rand}`
}

export function createTaskId(): string {
  return safeId('task')
}

export function createRowId(): string {
  return safeId('row')
}

export function createDepId(): string {
  return safeId('dep')
}

export const DEFAULT_TIMEZONE = 'Asia/Jakarta'

export function todayRef(): string {
  // Local calendar date — toISOString() is UTC and shifts the day back for
  // WIB (UTC+7) users accessing late at night.
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateDiffDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/** Display order: chronological by start date (ties: end, then name). */
export function compareTasksByDate(a: TimelineTask, b: TimelineTask): number {
  if (a.start !== b.start) return a.start < b.start ? -1 : 1
  if (a.end !== b.end) return a.end < b.end ? -1 : 1
  return a.name.localeCompare(b.name)
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

  // backward pass: latest START times.
  // LS(u) = min over successors v of (LS(v) - dur(u)); sinks finish at projectEnd.
  ;[...topo].reverse().forEach(id => {
    const dur = idToTask.get(id)!.isMilestone ? 0 : idToTask.get(id)!.durationDays
    const next = adj.get(id)!
    const ls = next.length
      ? Math.min(...next.map(nt => latest.get(nt)! - dur))
      : projectEnd - dur
    latest.set(id, ls)
  })

  // slack = latest-start - earliest-start; zero slack (head included) = critical.
  // (Nodes unreachable by topo order — e.g. inside a dependency cycle — keep
  // latest=Infinity and are never flagged.)
  tasks.forEach(t => {
    const slack = (latest.get(t.id) ?? Infinity) - (earliest.get(t.id) ?? 0)
    if (slack === 0) {
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

// An edge u→v lies on a cycle iff v can reach u (DFS).
export function findCyclicEdgeIds(tasks: TimelineTask[], deps: TimelineDependency[]): Set<string> {
  const adj = new Map<string, string[]>()
  tasks.forEach(t => adj.set(t.id, []))
  deps.forEach(d => {
    if (adj.has(d.sourceId) && adj.has(d.targetId)) adj.get(d.sourceId)!.push(d.targetId)
  })
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>([from])
    const stack = [from]
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const nxt of adj.get(cur) ?? []) {
        if (nxt === to) return true
        if (!seen.has(nxt)) { seen.add(nxt); stack.push(nxt) }
      }
    }
    return false
  }
  const out = new Set<string>()
  deps.forEach(d => { if (reaches(d.targetId, d.sourceId)) out.add(d.id) })
  return out
}