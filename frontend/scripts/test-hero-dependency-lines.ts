import { parseRawText } from '../src/lib/format/raw-text'
import { parseRows } from '../src/lib/parser/row-parser'
import { buildUmkmPreset, buildPmPreset } from '../src/lib/landing-presets'

const REF = '2026-09-07'

function computeGanttDependencyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  parentIdx: number,
  childIdx: number
): string {
  const r = 3

  if (x2 >= x1 + 16) {
    const turnX = x1 + Math.max(8, (x2 - x1) / 2)
    const dy = y2 > y1 ? 1 : -1
    const clampedR = Math.min(r, Math.abs(turnX - x1), Math.abs(x2 - turnX), Math.abs(y2 - y1) / 2)
    return [
      `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
      `L ${(turnX - clampedR).toFixed(1)} ${y1.toFixed(1)}`,
      `Q ${turnX.toFixed(1)} ${y1.toFixed(1)} ${turnX.toFixed(1)} ${(y1 + dy * clampedR).toFixed(1)}`,
      `L ${turnX.toFixed(1)} ${(y2 - dy * clampedR).toFixed(1)}`,
      `Q ${turnX.toFixed(1)} ${y2.toFixed(1)} ${(turnX + clampedR).toFixed(1)} ${y2.toFixed(1)}`,
      `L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    ].join(' ')
  } else {
    const exitX = x1 + 8
    const enterX = Math.max(6, x2 - 8)
    const goingDown = childIdx > parentIdx
    const midY = goingDown ? parentIdx * 42 + 37 : parentIdx * 42 - 5

    if (goingDown) {
      return [
        `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
        `L ${(exitX - r).toFixed(1)} ${y1.toFixed(1)}`,
        `Q ${exitX.toFixed(1)} ${y1.toFixed(1)} ${exitX.toFixed(1)} ${(y1 + r).toFixed(1)}`,
        `L ${exitX.toFixed(1)} ${(midY - r).toFixed(1)}`,
        `Q ${exitX.toFixed(1)} ${midY.toFixed(1)} ${(exitX - r).toFixed(1)} ${midY.toFixed(1)}`,
        `L ${(enterX + r).toFixed(1)} ${midY.toFixed(1)}`,
        `Q ${enterX.toFixed(1)} ${midY.toFixed(1)} ${enterX.toFixed(1)} ${(midY + r).toFixed(1)}`,
        `L ${enterX.toFixed(1)} ${(y2 - r).toFixed(1)}`,
        `Q ${enterX.toFixed(1)} ${y2.toFixed(1)} ${(enterX + r).toFixed(1)} ${y2.toFixed(1)}`,
        `L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      ].join(' ')
    } else {
      return [
        `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
        `L ${(exitX - r).toFixed(1)} ${y1.toFixed(1)}`,
        `Q ${exitX.toFixed(1)} ${y1.toFixed(1)} ${exitX.toFixed(1)} ${(y1 - r).toFixed(1)}`,
        `L ${exitX.toFixed(1)} ${(midY + r).toFixed(1)}`,
        `Q ${exitX.toFixed(1)} ${midY.toFixed(1)} ${(exitX - r).toFixed(1)} ${midY.toFixed(1)}`,
        `L ${(enterX + r).toFixed(1)} ${midY.toFixed(1)}`,
        `Q ${enterX.toFixed(1)} ${midY.toFixed(1)} ${enterX.toFixed(1)} ${(midY - r).toFixed(1)}`,
        `L ${enterX.toFixed(1)} ${(y2 + r).toFixed(1)}`,
        `Q ${enterX.toFixed(1)} ${y2.toFixed(1)} ${(enterX + r).toFixed(1)} ${y2.toFixed(1)}`,
        `L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      ].join(' ')
    }
  }
}

const DAY_MS = 86400000

function parseISODateLocal(iso: string): number {
  const parts = iso.split('-')
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  return new Date(y, m, d, 0, 0, 0, 0).getTime()
}

// Test with UMKM preset
const umkmRows = parseRawText(buildUmkmPreset(REF))
const { tasks: umkmTasks } = parseRows(umkmRows, REF)
console.log('UMKM parsed tasks:', umkmTasks.map(t => ({ name: t.name, start: t.start, end: t.end, dur: t.durationDays, dep: t.dependsOn })))

let minTime = Infinity
let maxTime = -Infinity
umkmTasks.forEach(t => {
  const s = parseISODateLocal(t.start)
  const e = s + (t.durationDays ?? 1) * DAY_MS
  if (s < minTime) minTime = s
  if (e > maxTime) maxTime = e
})

const totalDays = Math.max(1, Math.round((maxTime - minTime) / DAY_MS))
const minDayWidth = 56
const containerWidth = 400 // test scrolling behavior
const dayWidth = containerWidth > totalDays * minDayWidth ? Math.floor(containerWidth / totalDays) : minDayWidth
const contentWidth = totalDays * dayWidth
const isScrollable = contentWidth > containerWidth

console.log(`\nUMKM Layout: totalDays=${totalDays}, dayWidth=${dayWidth}px, contentWidth=${contentWidth}px, isScrollable=${isScrollable}`)

const taskBounds = umkmTasks.map((t, idx) => {
  const s = parseISODateLocal(t.start)
  const startDay = Math.max(0, Math.round((s - minTime) / DAY_MS))
  const dur = Math.max(1, t.durationDays ?? 1)
  const xLeft = startDay * dayWidth + 2
  const barW = Math.max(28, dur * dayWidth - 4)
  const xRight = xLeft + barW
  return {
    idx,
    id: t.id,
    name: t.name.trim().toLowerCase(),
    displayName: t.name,
    startDay,
    dur,
    xLeft,
    xRight,
    yCenter: idx * 42 + 16,
  }
})

console.log('\nTask Bounds:')
taskBounds.forEach(b => console.log(`  Task ${b.idx} (${b.displayName}): day ${b.startDay}, dur ${b.dur}d, [${b.xLeft.toFixed(1)} -> ${b.xRight.toFixed(1)}], y: ${b.yCenter}`))

const links: string[] = []
umkmTasks.forEach((child, childIdx) => {
  if (!child.dependsOn) return
  const token = child.dependsOn.trim().toLowerCase()
  const parent = taskBounds.find((p, pIdx) => pIdx !== childIdx && (p.name === token || p.name.includes(token) || token.includes(p.name)))
  if (parent) {
    const childBound = taskBounds[childIdx]
    const path = computeGanttDependencyPath(
      parent.xRight,
      parent.yCenter,
      childBound.xLeft,
      childBound.yCenter,
      parent.idx,
      childBound.idx
    )
    console.log(`\nLink: Task ${parent.idx} -> Task ${childBound.idx}`)
    console.log(`  Path: ${path}`)
    if (path.includes('NaN')) {
      console.error('FAIL: Path contains NaN!')
      process.exit(1)
    }
    links.push(path)
  }
})


if (links.length !== 3) {
  console.error(`FAIL: Expected 3 dependency links, found ${links.length}`)
  process.exit(1)
}

console.log('\n✓ All 3 UMKM dependency links computed successfully with zero NaN!')

// Test with PM preset
const pmRows = parseRawText(buildPmPreset(REF))
const { tasks: pmTasks } = parseRows(pmRows, REF)

let pmMin = Infinity
let pmMax = -Infinity
pmTasks.forEach(t => {
  const s = parseISODateLocal(t.start)
  const e = s + (t.durationDays ?? 1) * DAY_MS
  if (s < pmMin) pmMin = s
  if (e > pmMax) pmMax = e
})

const pmTotalDays = Math.max(1, Math.round((pmMax - pmMin) / DAY_MS))
const pmDayWidth = containerWidth > pmTotalDays * minDayWidth ? Math.floor(containerWidth / pmTotalDays) : minDayWidth
const pmContentWidth = pmTotalDays * pmDayWidth
const pmIsScrollable = pmContentWidth > containerWidth

console.log(`\nPM Layout: totalDays=${pmTotalDays}, dayWidth=${pmDayWidth}px, contentWidth=${pmContentWidth}px, isScrollable=${pmIsScrollable}`)

const pmBounds = pmTasks.map((t, idx) => {
  const s = parseISODateLocal(t.start)
  const startDay = Math.max(0, Math.round((s - pmMin) / DAY_MS))
  const dur = Math.max(1, t.durationDays ?? 1)
  const xLeft = startDay * pmDayWidth + 2
  const barW = Math.max(28, dur * pmDayWidth - 4)
  const xRight = xLeft + barW
  return {
    idx,
    id: t.id,
    name: t.name.trim().toLowerCase(),
    displayName: t.name,
    startDay,
    dur,
    xLeft,
    xRight,
    yCenter: idx * 42 + 16,
  }
})

const pmLinks: string[] = []
pmTasks.forEach((child, childIdx) => {
  if (!child.dependsOn) return
  const token = child.dependsOn.trim().toLowerCase()
  const parent = pmBounds.find((p, pIdx) => pIdx !== childIdx && (p.name === token || p.name.includes(token) || token.includes(p.name)))
  if (parent) {
    const childBound = pmBounds[childIdx]
    const path = computeGanttDependencyPath(
      parent.xRight,
      parent.yCenter,
      childBound.xLeft,
      childBound.yCenter,
      parent.idx,
      childBound.idx
    )
    console.log(`\nPM Link: Task ${parent.idx} -> Task ${childBound.idx}`)
    console.log(`  Path: ${path}`)
    if (path.includes('NaN')) {
      console.error('FAIL: PM Path contains NaN!')
      process.exit(1)
    }
    pmLinks.push(path)
  }
})


if (pmLinks.length !== 3) {
  console.error(`FAIL: Expected 3 PM dependency links, found ${pmLinks.length}`)
  process.exit(1)
}

console.log('\n✓ All 3 PM dependency links computed successfully with zero NaN!')

// Test with English presets
import { buildUmkmPresetEn, buildPmPresetEn } from '../src/lib/landing-presets'
const umkmEnRows = parseRawText(buildUmkmPresetEn(REF))
const { tasks: umkmEnTasks } = parseRows(umkmEnRows, REF)
const umkmEnDeps = umkmEnTasks.filter(t => t.dependsOn)
if (umkmEnDeps.length !== 3) {
  console.error('FAIL: Expected 3 EN UMKM dependsOn, got:', umkmEnDeps.length)
  process.exit(1)
}

const pmEnRows = parseRawText(buildPmPresetEn(REF))
const { tasks: pmEnTasks } = parseRows(pmEnRows, REF)
const pmEnDeps = pmEnTasks.filter(t => t.dependsOn)
if (pmEnDeps.length !== 3) {
  console.error('FAIL: Expected 3 EN PM dependsOn, got:', pmEnDeps.length)
  process.exit(1)
}

console.log('✓ All English presets have corresponding dependsOn relations!')


