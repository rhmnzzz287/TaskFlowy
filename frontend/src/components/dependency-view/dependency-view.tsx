'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { TimelineTask, TimelineDependency, detectCycles } from '@/lib/schema'
import { formatDateDisplay } from '@/lib/parser/date-grammar'
import { taskStatus } from '@/lib/task-status'
import { GitBranch, AlertTriangle, List } from 'lucide-react'

interface DependencyViewProps {
  tasks: TimelineTask[]
  dependencies: TimelineDependency[]
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

const LAYOUT = {
  levelGap: 300,  // must exceed nodeW + edge run, else levels overlap horizontally
  rowGap: 60,    // must exceed nodeH, else stacked nodes overlap vertically
  nodeW: 220,
  nodeH: 44,
  pad: 40,       // canvas margin around the laid-out graph
}

// An edge u→v lies on a cycle iff v can reach u (DFS). Graphs here are tiny,
// so per-edge reachability O(E·(V+E)) is more than fast enough — and exact,
// unlike "any cycle exists → dash everything".
function findCyclicEdgeIds(tasks: TimelineTask[], deps: TimelineDependency[]): Set<string> {
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

function assigneeInitials(name: string | null): string {
  if (!name) return ''
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

interface LayoutNode {
  task: TimelineTask
  x: number
  y: number
}

const DEP_TYPE_LABEL: Record<string, string> = {
  FS: 'Finish-to-start',
  SS: 'Start-to-start',
  FF: 'Finish-to-finish',
  SF: 'Start-to-finish',
}

export function DependencyView({ tasks, dependencies, onSelectTask, selectedTaskId }: DependencyViewProps) {
  const [highlightDep, setHighlightDep] = useState<string | null>(null)
  const [pinnedDep, setPinnedDep] = useState<string | null>(null)
  const [showList, setShowList] = useState(false)

  const nameOf = (id: string): string => tasks.find(t => t.id === id)?.name ?? id
  const scrollBoxRef = useRef<HTMLDivElement>(null)
  const lastTaskSigRef = useRef('')

  // Level assignment: node level = longest path from any source (Kahn-like longest chain)
  const { levels, edges, cycles, nodes, contentW, contentH } = useMemo(() => {
    const cycles = detectCycles(tasks, dependencies)

    const idToTask = new Map(tasks.map(t => [t.id, t]))
    const outAdj = new Map<string, string[]>()
    const inAdj = new Map<string, string[]>()
    tasks.forEach(t => { outAdj.set(t.id, []); inAdj.set(t.id, []) })
    dependencies.forEach(d => {
      if (idToTask.has(d.sourceId) && idToTask.has(d.targetId)) {
        outAdj.get(d.sourceId)!.push(d.targetId)
        inAdj.get(d.targetId)!.push(d.sourceId)
      }
    })

    // longest-path levels (sources at level 0) — 3-color DFS prevents stack overflow on cycles
    const state = new Map<string, 0 | 1 | 2>() // 0=unvisited, 1=visiting, 2=done
    const level = new Map<string, number>()
    tasks.forEach(t => state.set(t.id, 0))
    const computeLevel = (id: string): number => {
      if (state.get(id) === 1) return 0   // cycle detected, assign level 0 to break
      if (state.get(id) === 2) return level.get(id)!
      state.set(id, 1)
      const preds = inAdj.get(id)!
      const l = preds.length === 0 ? 0 : 1 + Math.max(...preds.map(p => computeLevel(p)))
      state.set(id, 2)
      level.set(id, l)
      return l
    }
    tasks.forEach(t => computeLevel(t.id))

    // group by level
    const byLevel = new Map<number, TimelineTask[]>()
    tasks.forEach(t => {
      const l = level.get(t.id)!
      if (!byLevel.has(l)) byLevel.set(l, [])
      byLevel.get(l)!.push(t)
    })

    const maxLevel = Math.max(0, ...tasks.map(t => level.get(t.id)!))
    const nodes: LayoutNode[] = tasks.map(t => {
      const l = level.get(t.id)!
      const group = byLevel.get(l)!
      const idx = group.indexOf(t)
      const x = LAYOUT.pad + l * LAYOUT.levelGap
      const y = LAYOUT.pad + idx * LAYOUT.rowGap
      return { task: t, x, y }
    })

    const cyclicIds = findCyclicEdgeIds(tasks, dependencies)

    const edges = dependencies
      .filter(d => idToTask.has(d.sourceId) && idToTask.has(d.targetId))
      .map(d => {
        const s = nodes.find(n => n.task.id === d.sourceId)!
        const t = nodes.find(n => n.task.id === d.targetId)!
        const x1 = s.x + LAYOUT.nodeW
        const y1 = s.y + LAYOUT.nodeH / 2
        const x2 = t.x
        const y2 = t.y + LAYOUT.nodeH / 2
        const cyclic = cyclicIds.has(d.id)
        if (x2 >= x1) {
          // forward edge: horizontal → vertical → horizontal elbow keeps the
          // run clear of the nodes stacked between the two levels.
          const mx = x1 + (x2 - x1) / 2
          return {
            dep: d, isCyclic: cyclic,
            dAttr: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`,
            lx: (x1 + x2) / 2, ly: (y1 + y2) / 2 - 5,
          }
        }
        // backward (cycle) edge: loop below both nodes, enter target bottom.
        const cx = t.x + LAYOUT.nodeW / 2
        const bottom = t.y + LAYOUT.nodeH
        const loopY = Math.max(s.y + LAYOUT.nodeH, bottom) + 16
        return {
          dep: d, isCyclic: true,
          dAttr: `M ${x1} ${y1} V ${loopY} H ${cx} V ${bottom}`,
          lx: (x1 + cx) / 2, ly: loopY - 5,
        }
      })

    // Canvas size follows the laid-out content (a fixed viewBox clips deep/
    // wide graphs and letterboxes small ones under preserveAspectRatio).
    const maxX = nodes.length ? Math.max(...nodes.map(n => n.x)) : 0
    const maxY = nodes.length ? Math.max(...nodes.map(n => n.y)) : 0
    const contentW = maxX + LAYOUT.nodeW + LAYOUT.pad
    const contentH = maxY + LAYOUT.nodeH + LAYOUT.pad

    return { levels: maxLevel + 1, nodes, edges, cycles, contentW, contentH }
  }, [tasks, dependencies])

  // Reset pinned edge + canvas scroll whenever the underlying data changes.
  useEffect(() => {
    setPinnedDep(null)
    const sig = JSON.stringify(tasks.map(t => t.id))
    if (sig !== lastTaskSigRef.current) {
      lastTaskSigRef.current = sig
      scrollBoxRef.current?.scrollTo({ left: 0, top: 0 })
    }
  }, [tasks, dependencies])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header bar */}
      <div className="h-10 bg-surface/80 flex items-center justify-between px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-[12px] text-text-dim">
          <GitBranch size={14} className="text-primary" />
          <span>Dependency Graph</span>
          <span className="text-muted">·</span>
          <span className="font-mono">{tasks.length} nodes</span>
          <span className="text-muted">·</span>
          <span className="font-mono">{edges.length} edges</span>
        </div>
        <div className="flex items-center gap-2">
          {edges.length > 0 && (
            <button
              type="button"
              onClick={() => setShowList(s => !s)}
              aria-expanded={showList}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${showList ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-hi/40'}`}
              title="Toggle accessible dependency list"
            >
              <List size={12} aria-hidden="true" /> List
            </button>
          )}
          {cycles.length > 0 && (
            <div className="flex items-center gap-1.5 text-warning text-[12px]" role="alert">
              <AlertTriangle size={14} aria-hidden="true" />
              {cycles.length} cycle{cycles.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Cycle warnings with navigation to affected tasks */}
      {cycles.length > 0 && (
        <div className="bg-warning/10 border-b border-warning/30 px-3 py-1.5 flex flex-col gap-1" role="alert">
          {cycles.map((c, i) => {
            const ids = Array.from(new Set(c.match(/task-[A-Za-z0-9_-]+/g) ?? []))
            return (
              <div key={i} className="flex items-center gap-2 min-w-0 text-[12px]">
                <AlertTriangle size={12} className="text-warning shrink-0" aria-hidden="true" />
                <span className="text-text-primary truncate flex-1" title={c}>Dependency cycle detected</span>
                <span className="flex items-center gap-1 shrink-0">
                  {ids.map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectTask?.(id)}
                      className="px-1.5 py-0.5 rounded bg-warning/15 text-warning text-[11px] font-mono font-semibold hover:bg-warning/25 transition-colors focus-visible:ring-2 focus-visible:ring-warning focus-visible:outline-none"
                      title={`Open task "${nameOf(id)}"`}
                    >
                      {nameOf(id).slice(0, 14)}
                    </button>
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Graph canvas */}
      <div ref={scrollBoxRef} className="flex-1 overflow-auto bg-surface-dim/50 relative">
        {tasks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-[13px]">
            No tasks yet. Generate a timeline first.
          </div>
        ) : (
        <svg
          viewBox={`0 0 ${contentW} ${contentH}`}
          width={contentW}
          height={contentH}
          className="block shrink-0"
          role="img"
          aria-label="Dependency graph"
        >
          <defs>
            <marker id="dep-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" className="dep-arrow" />
            </marker>
            <marker id="dep-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" className="dep-arrow dep-arrow-active" />
            </marker>
            <marker id="dep-arrow-cyclic" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" className="dep-arrow dep-cyclic" />
            </marker>
          </defs>
          {/* Level bands */}
          {Array.from({ length: levels }, (_, l) => {
            if (l % 2 === 1) return null
            const start = l === 0 ? 0 : LAYOUT.pad + l * LAYOUT.levelGap - LAYOUT.levelGap / 2
            const end = l + 1 < levels
              ? LAYOUT.pad + (l + 1) * LAYOUT.levelGap - LAYOUT.levelGap / 2
              : contentW
            return (
              <rect key={`band-${l}`} x={start} y={0} width={end - start} height={contentH}
                style={{ fill: 'rgb(var(--bg-surface-hi))', fillOpacity: 0.25 }} />
            )
          })}
          {/* Edges */}
          {edges.map((e) => {
            const active = highlightDep === e.dep.id || pinnedDep === e.dep.id
            const marker = e.isCyclic ? 'url(#dep-arrow-cyclic)' : active ? 'url(#dep-arrow-active)' : 'url(#dep-arrow)'
            return (
              <g
                key={e.dep.id}
                onMouseEnter={() => setHighlightDep(e.dep.id)}
                onMouseLeave={() => setHighlightDep(null)}
                onClick={() => setPinnedDep(p => (p === e.dep.id ? null : e.dep.id))}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setPinnedDep(p => (p === e.dep.id ? null : e.dep.id)) } }}
                tabIndex={0}
                focusable="true"
                role="button"
                aria-label={`Dependency: ${nameOf(e.dep.sourceId)} to ${nameOf(e.dep.targetId)}, ${DEP_TYPE_LABEL[e.dep.type] ?? e.dep.type}${e.isCyclic ? ', in a dependency cycle' : ''}`}
                className="cursor-pointer outline-none focus:outline-2 focus:outline-primary focus:outline-offset-2 focus:rounded"
              >
                <path
                  d={e.dAttr}
                  className={`dep-edge${active ? ' dep-edge-active' : ''}${e.isCyclic ? ' dep-cyclic' : ''}`}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeOpacity={active ? 1 : 0.7}
                  strokeDasharray={e.isCyclic ? '6 3' : undefined}
                  markerEnd={marker}
                />
                {/* wide invisible hit-area so thin edges are easy to hover */}
                <path d={e.dAttr} fill="none" stroke="transparent" strokeWidth={14} style={{ pointerEvents: 'stroke' }} />
                {/* dependency type label */}
                <text x={e.lx} y={e.ly}
                  textAnchor="middle" fontSize={9} className="dep-edge-label" fontFamily="monospace">
                  {e.dep.type}
                </text>
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const isSel = selectedTaskId === n.task.id
            const t = n.task
            const prog = t.progress ?? 0
            // Status is a color dot (legend palette) + tooltip — status *text*
            // can't fit next to the dates, and the table views own the badges.
            const st = taskStatus(t)
            const dot = st.status === 'done'
              ? { label: 'Done', fill: 'fill-completed' }
              : st.status === 'milestone'
                ? { label: 'Milestone', fill: 'fill-milestone' }
                : st.status === 'critical'
                  ? { label: 'Critical', fill: 'fill-critical' }
                  : st.status === 'in-progress'
                    ? { label: `${prog}%`, fill: 'fill-secondary' }
                    : { label: 'Planned', fill: 'fill-muted' }
            return (
              <g
                key={t.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={() => onSelectTask?.(t.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTask?.(t.id) } }}
                tabIndex={0}
                focusable="true"
                role="button"
                aria-current={isSel ? 'true' : undefined}
                data-task-id={t.id}
                aria-label={`Task: ${t.name}, ${formatDateDisplay(t.start)} to ${formatDateDisplay(t.end)}${isSel ? ', selected' : ''}`}
                className="cursor-pointer outline-none focus:outline-2 focus:outline-primary focus:outline-offset-2 focus:rounded"
              >
                {/* node body */}
                <title>{t.name}</title>
                <rect
                  width={LAYOUT.nodeW} height={LAYOUT.nodeH} rx={6}
                  className={`dep-node${t.isCritical ? ' dep-critical' : ''}${isSel ? ' dep-selected' : ''}`}
                  strokeWidth={isSel ? 2 : 1.5}
                />
                <rect x={4} y={4} width={44} height={LAYOUT.nodeH - 8} rx={4}
                  className={`dep-node-tint${t.isCritical ? ' dep-critical' : ''}`} />
                <text x={26} y={LAYOUT.nodeH - 16} textAnchor="middle" fontSize={15} className={`dep-node-glyph${t.isCritical ? ' dep-critical' : ''}`}>
                  {t.isMilestone ? '◆' : assigneeInitials(t.assignee)}
                </text>
                <foreignObject x={58} y={5} width={154} height={16}>
                  {/* CSS ellipsis guarantees the title never spills past the
                      node rect (SVG has no text wrapping; nodeW - x - pad). */}
                  <div className={`truncate text-[11px] font-semibold leading-4 ${isSel ? 'text-white' : 'text-text-primary'}`}>
                    {t.name}
                  </div>
                </foreignObject>
                <text x={58} y={34} fontSize={10} className={`dep-node-sub${isSel ? ' dep-selected' : ''}`}>
                  {formatDateDisplay(t.start)} → {formatDateDisplay(t.end)}
                </text>
                <circle cx={172} cy={30.5} r={3.5} className={dot.fill}>
                  <title>{dot.label}</title>
                </circle>
              </g>
            )
          })}
        </svg>
        )}
      </div>

      {/* Accessible list fallback: every relationship as text with navigation */}
      {showList && edges.length > 0 && (
        <div className="max-h-44 overflow-y-auto border-b border-border bg-surface/40" role="list" aria-label="Dependencies list">
          <ul className="divide-y divide-border/40">
            {edges.map(e => {
              const s = nameOf(e.dep.sourceId)
              const tg = nameOf(e.dep.targetId)
              const pinned = pinnedDep === e.dep.id
              return (
                <li key={e.dep.id} role="listitem" className={`px-3 py-1.5 flex items-center gap-2 text-[12px] ${pinned ? 'bg-primary/10' : ''}`}>
                  <button type="button" onClick={() => { setPinnedDep(e.dep.id); onSelectTask?.(e.dep.sourceId) }} className="font-medium text-text-primary hover:text-primary hover:underline truncate focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded" title={`Open source task "${s}"`}>{s}</button>
                  <span className="text-muted shrink-0" aria-hidden="true">→</span>
                  <button type="button" onClick={() => { setPinnedDep(e.dep.id); onSelectTask?.(e.dep.targetId) }} className="font-medium text-text-primary hover:text-primary hover:underline truncate focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded" title={`Open target task "${tg}"`}>{tg}</button>
                  <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase font-mono ${e.isCyclic ? 'text-warning bg-warning/10' : 'text-muted bg-surface-hi/40'}`} title={DEP_TYPE_LABEL[e.dep.type] ?? e.dep.type}>{e.dep.type}</span>
                  <span className="sr-only">{DEP_TYPE_LABEL[e.dep.type] ?? e.dep.type}{e.isCyclic ? ', in a dependency cycle' : ''}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="h-9 bg-surface/30 border-t border-border px-3 flex items-center justify-between shrink-0 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <GitBranch size={11} className="text-primary" />
          Source → Target · {dependencies.length} dependency bound
        </span>
        <span>{levels} level{levels > 1 ? 's' : ''} deep</span>
      </div>
    </div>
  )
}