import { TimelineTask, TimelineDependency, computeCriticalPath } from '../schema'
import { addDaysISO } from './slippage-engine'

export interface RiskBufferAssessment {
  baselineEndDate: string
  p50EndDate: string
  p80EndDate: string
  p95EndDate: string
  recommendedBufferDays: number
  confidenceRating: 'High' | 'Moderate' | 'High Risk'
  criticalPathTaskCount: number
  totalCriticalDurationDays: number
}

/**
 * Calculates schedule risk and Monte Carlo-derived P50/P80 buffer recommendations
 * based on variance along the dependency critical path.
 */
export function calculateScheduleRisk(
  tasks: TimelineTask[],
  dependencies: TimelineDependency[]
): RiskBufferAssessment {
  const fallbackDate = new Date().toISOString().slice(0, 10)
  if (tasks.length === 0) {
    return {
      baselineEndDate: fallbackDate,
      p50EndDate: fallbackDate,
      p80EndDate: fallbackDate,
      p95EndDate: fallbackDate,
      recommendedBufferDays: 0,
      confidenceRating: 'High',
      criticalPathTaskCount: 0,
      totalCriticalDurationDays: 0,
    }
  }

  const baselineEndDate = tasks.reduce((max, t) => (t.end > max ? t.end : max), '')
  const criticalSet = computeCriticalPath(tasks, dependencies)
  const criticalTasks = tasks.filter(t => criticalSet.has(t.id) && !t.isMilestone)

  if (criticalTasks.length === 0) {
    return {
      baselineEndDate,
      p50EndDate: baselineEndDate,
      p80EndDate: baselineEndDate,
      p95EndDate: baselineEndDate,
      recommendedBufferDays: 0,
      confidenceRating: 'High',
      criticalPathTaskCount: 0,
      totalCriticalDurationDays: 0,
    }
  }

  let totalVarianceSq = 0
  let totalCriticalDuration = 0

  criticalTasks.forEach(task => {
    const dur = Math.max(1, task.durationDays || 1)
    totalCriticalDuration += dur
    // PERT 3-point duration variance: optimistic = 0.85d, pessimistic = 1.45d
    const span = (1.45 * dur) - (0.85 * dur)
    const stdDev = span / 6
    totalVarianceSq += (stdDev * stdDev)
  })

  const totalStdDev = Math.sqrt(totalVarianceSq)

  // Z-scores for normal distribution percentiles:
  // P50 = 0 (baseline / median expected duration)
  // P80 = +0.8416 standard deviations
  // P95 = +1.6449 standard deviations
  const p50BufferDays = Math.round(0.1 * totalStdDev)
  const p80BufferDays = Math.max(1, Math.round(0.84 * totalStdDev))
  const p95BufferDays = Math.max(p80BufferDays + 1, Math.round(1.65 * totalStdDev))

  let confidenceRating: 'High' | 'Moderate' | 'High Risk' = 'High'
  if (totalCriticalDuration > 20 || p80BufferDays >= 5) {
    confidenceRating = 'High Risk'
  } else if (totalCriticalDuration > 10 || p80BufferDays >= 3) {
    confidenceRating = 'Moderate'
  }

  return {
    baselineEndDate,
    p50EndDate: addDaysISO(baselineEndDate, p50BufferDays),
    p80EndDate: addDaysISO(baselineEndDate, p80BufferDays),
    p95EndDate: addDaysISO(baselineEndDate, p95BufferDays),
    recommendedBufferDays: p80BufferDays,
    confidenceRating,
    criticalPathTaskCount: criticalTasks.length,
    totalCriticalDurationDays: totalCriticalDuration,
  }
}
