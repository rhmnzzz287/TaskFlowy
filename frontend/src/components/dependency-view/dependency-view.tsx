'use client'

import { useState, useMemo } from 'react'
import { TimelineTask, TimelineDependency, detectCycles } from '@/lib/schema'
import { GitBranch, AlertTriangle } from 'lucide-react'

interface DependencyViewProps {
  tasks: TimelineTask[]
  dependencies: TimelineDependency[]
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

const LAYOUT = {
  levelGap: 120,   // px horizontally between levels
  rowGap: 28,      // px vertically between nodes in the same level
  nodeW: 220,
  nodeH: 44,
}

interface LayoutNode {
  task: TimelineTask
  x: number
  y: number
  level: number
  maxInLevel: number
}

export function DependencyView({ tasks, dependencies, onSelectTask, selectedTaskId }: DependencyViewProps) {
  const [highlightDep, setHighlightDep] = useState<string | null>(null)

  // Level assignment: node level = longest path from any source (Kahn-like longest chain)
  const { levels, edges, cycles, nodes } = useMemo(() => {
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
      const x = 40 + l * LAYOUT.levelGap
      const y = 40 + idx * LAYOUT.rowGap
      return { task: t, x, y, level: l, maxInLevel: group.length }
    })

    const edges = dependencies
      .filter(d => idToTask.has(d.sourceId) && idToTask.has(d.targetId))
      .map(d => {
        const s = nodes.find(n => n.task.id === d.sourceId)!
        const t = nodes.find(n => n.task.id === d.targetId)!
        return { dep: d, x1: s.x + LAYOUT.nodeW, y1: s.y + LAYOUT.nodeH / 2, x2: t.x, y2: t.y + LAYOUT.nodeH / 2 }
      })

    return { levels: maxLevel + 1, nodes, edges, cycles }
  }, [tasks, dependencies])

  const scale = useMemo(() => {
    // fit viewport via CSS transform; keep reasonable zoom for small graphs
    return { width: 900, height: 500 }
  }, [])

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
        {cycles.length > 0 && (
          <div className="flex items-center gap-1.5 text-warning text-[12px]">
            <AlertTriangle size={14} />
            {cycles.length} cycle{cycles.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 overflow-auto bg-surface-dim/50 relative">
        <svg
          viewBox={`0 0 ${scale.width} ${scale.height}`}
          className="w-full h-full min-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Edges */}
          {edges.map((e, i) => {
            const active = highlightDep === e.dep.id
            const isCyclic = cycles.length > 0
            return (
              <g key={e.dep.id || i} onMouseEnter={() => setHighlightDep(e.dep.id)} onMouseLeave={() => setHighlightDep(null)}>
                <line
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  className={`dep-edge${active ? ' dep-edge-active' : ''}${isCyclic ? ' dep-cyclic' : ''}`}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeOpacity={active ? 1 : 0.7}
                  strokeDasharray={isCyclic ? '6 3' : undefined}
                />
                {/* arrowhead */}
                <path
                  d={`M${e.x2} ${e.y2} l-8 -4 v8 z`}
                  className={`dep-arrow${active ? ' dep-arrow-active' : ''}${isCyclic ? ' dep-cyclic' : ''}`}
                />
                {/* dependency type label */}
                <text x={(e.x1 + e.x2) / 2} y={(e.y1 + e.y2) / 2 - 4}
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
            return (
              <g
                key={t.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={() => onSelectTask?.(t.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTask?.(t.id) } }}
                tabIndex={0}
                focusable="true"
                role="button"
                aria-label={`Task: ${t.name}`}
                className="cursor-pointer outline-none focus:outline-2 focus:outline-primary focus:outline-offset-2 focus:rounded"
              >
                {/* node body */}
                <rect
                  width={LAYOUT.nodeW} height={LAYOUT.nodeH} rx={6}
                  className={`dep-node${t.isCritical ? ' dep-critical' : ''}${isSel ? ' dep-selected' : ''}`}
                  strokeWidth={isSel ? 2 : 1.5}
                />
                <rect x={4} y={4} width={44} height={LAYOUT.nodeH - 8} rx={4}
                  className={`dep-node-tint${t.isCritical ? ' dep-critical' : ''}`} />
                <text x={26} y={LAYOUT.nodeH - 16} textAnchor="middle" fontSize={15} className={`dep-node-glyph${t.isCritical ? ' dep-critical' : ''}`}>
                  {t.isMilestone ? '◆' : ''}
                </text>
                <text x={58} y={18} fontSize={11} fontWeight={600} className={`dep-node-title${isSel ? ' dep-selected' : ''}`}>
                  {t.name.length > 18 ? t.name.slice(0, 18) + '…' : t.name}
                </text>
                <text x={58} y={34} fontSize={10} className={`dep-node-sub${isSel ? ' dep-selected' : ''}`}>
                  {t.start} → {t.end}
                  {t.status ? ' · ' + t.status : ''}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

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