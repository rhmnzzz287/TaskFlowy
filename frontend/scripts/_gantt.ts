/**
 * Shared Gantt-layout test helpers for `frontend/scripts/`.
 *
 * NOTE: `computeGanttDependencyPath`, `parseISODateLocal`, and the layout
 * constants intentionally mirror `src/components/landing/hero-playground.tsx`.
 * That component is a `'use client'` React module, so the pure geometry is
 * duplicated here for Node self-checks. If the component's routing changes,
 * update both places together.
 */
import type { TimelineTask } from '../src/lib/schema';

export const DAY_MS = 86_400_000;
export const ROW_HEIGHT = 42;
export const BAR_Y_OFFSET = 16;
export const MIN_DAY_WIDTH = 56;
export const CORNER_RADIUS = 3;

export interface GanttBounds {
  idx: number;
  name: string;
  displayName: string;
  startDay: number;
  dur: number;
  xLeft: number;
  xRight: number;
  yCenter: number;
}

export interface GanttLayout {
  bounds: GanttBounds[];
  totalDays: number;
  dayWidth: number;
  contentWidth: number;
  isScrollable: boolean;
}

export interface DependencyLink {
  parentIdx: number;
  childIdx: number;
  path: string;
}

/** Local-midnight parse for `YYYY-MM-DD`; falls back to Date for anything else. */
export function parseISODateLocal(iso: string): number {
  if (!iso) return Date.now();
  const parts = iso.split('-');
  if (parts.length === 3) {
    const y = Number.parseInt(parts[0], 10);
    const m = Number.parseInt(parts[1], 10) - 1;
    const d = Number.parseInt(parts[2], 10);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(y, m, d, 0, 0, 0, 0).getTime();
    }
  }
  const dt = new Date(iso);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0).getTime();
}

/**
 * Orthogonal SVG connector with rounded corners from a predecessor bar edge
 * (x1, y1) to a successor bar edge (x2, y2).
 */
export function computeGanttDependencyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  parentIdx: number,
  childIdx: number,
): string {
  const r = CORNER_RADIUS;

  if (x2 >= x1 + 16) {
    // Forward progression with enough lag: single mid-turn.
    const turnX = x1 + Math.max(8, (x2 - x1) / 2);
    const dy = y2 > y1 ? 1 : -1;
    const clampedR = Math.min(r, Math.abs(turnX - x1), Math.abs(x2 - turnX), Math.abs(y2 - y1) / 2);
    return [
      `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
      `L ${(turnX - clampedR).toFixed(1)} ${y1.toFixed(1)}`,
      `Q ${turnX.toFixed(1)} ${y1.toFixed(1)} ${turnX.toFixed(1)} ${(y1 + dy * clampedR).toFixed(1)}`,
      `L ${turnX.toFixed(1)} ${(y2 - dy * clampedR).toFixed(1)}`,
      `Q ${turnX.toFixed(1)} ${y2.toFixed(1)} ${(turnX + clampedR).toFixed(1)} ${y2.toFixed(1)}`,
      `L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    ].join(' ');
  }

  // Overlap / back-edge: route through the inter-row gap.
  const exitX = x1 + 8;
  const enterX = Math.max(6, x2 - 8);
  const goingDown = childIdx > parentIdx;
  const midY = goingDown ? parentIdx * ROW_HEIGHT + 37 : parentIdx * ROW_HEIGHT - 5;
  const dir = goingDown ? 1 : -1;

  return [
    `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    `L ${(exitX - r).toFixed(1)} ${y1.toFixed(1)}`,
    `Q ${exitX.toFixed(1)} ${y1.toFixed(1)} ${exitX.toFixed(1)} ${(y1 + dir * r).toFixed(1)}`,
    `L ${exitX.toFixed(1)} ${(midY - dir * r).toFixed(1)}`,
    `Q ${exitX.toFixed(1)} ${midY.toFixed(1)} ${(exitX - r).toFixed(1)} ${midY.toFixed(1)}`,
    `L ${(enterX + r).toFixed(1)} ${midY.toFixed(1)}`,
    `Q ${enterX.toFixed(1)} ${midY.toFixed(1)} ${enterX.toFixed(1)} ${(midY + dir * r).toFixed(1)}`,
    `L ${enterX.toFixed(1)} ${(y2 - dir * r).toFixed(1)}`,
    `Q ${enterX.toFixed(1)} ${y2.toFixed(1)} ${(enterX + r).toFixed(1)} ${y2.toFixed(1)}`,
    `L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
  ].join(' ');
}

/** Lay out bar bounds for a task list inside a container of fixed width. */
export function layoutTaskBounds(tasks: TimelineTask[], containerWidth: number): GanttLayout {
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const t of tasks) {
    const s = parseISODateLocal(t.start);
    const e = s + Math.max(1, t.durationDays ?? 1) * DAY_MS;
    if (s < minTime) minTime = s;
    if (e > maxTime) maxTime = e;
  }
  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) {
    minTime = Date.now();
    maxTime = minTime + DAY_MS;
  }

  const totalDays = Math.max(1, Math.round((maxTime - minTime) / DAY_MS));
  const dayWidth =
    containerWidth > totalDays * MIN_DAY_WIDTH ? Math.floor(containerWidth / totalDays) : MIN_DAY_WIDTH;
  const contentWidth = totalDays * dayWidth;

  const bounds = tasks.map((t, idx) => {
    const s = parseISODateLocal(t.start);
    const startDay = Math.max(0, Math.round((s - minTime) / DAY_MS));
    const dur = Math.max(1, t.durationDays ?? 1);
    const xLeft = startDay * dayWidth + 2;
    const barW = Math.max(28, dur * dayWidth - 4);
    return {
      idx,
      name: t.name.trim().toLowerCase(),
      displayName: t.name,
      startDay,
      dur,
      xLeft,
      xRight: xLeft + barW,
      yCenter: idx * ROW_HEIGHT + BAR_Y_OFFSET,
    } satisfies GanttBounds;
  });

  return { bounds, totalDays, dayWidth, contentWidth, isScrollable: contentWidth > containerWidth };
}

function findParent(
  bounds: GanttBounds[],
  childIdx: number,
  token: string,
): GanttBounds | undefined {
  const needle = token.trim().toLowerCase();
  if (!needle) return undefined;
  return bounds.find(
    (p, pIdx) =>
      pIdx !== childIdx && (p.name === needle || p.name.includes(needle) || needle.includes(p.name)),
  );
}

/** Resolve every `dependsOn` into an SVG path; skips unresolvable tokens. */
export function resolveDependencyLinks(tasks: TimelineTask[], bounds: GanttBounds[]): DependencyLink[] {
  const links: DependencyLink[] = [];
  tasks.forEach((child, childIdx) => {
    if (!child.dependsOn) return;
    const parent = findParent(bounds, childIdx, child.dependsOn);
    if (!parent) return;
    const childBound = bounds[childIdx];
    links.push({
      parentIdx: parent.idx,
      childIdx: childBound.idx,
      path: computeGanttDependencyPath(
        parent.xRight,
        parent.yCenter,
        childBound.xLeft,
        childBound.yCenter,
        parent.idx,
        childBound.idx,
      ),
    });
  });
  return links;
}
