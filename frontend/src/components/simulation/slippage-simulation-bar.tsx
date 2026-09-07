'use client'

import React, { useMemo } from 'react'
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { TimelineTask, TimelineDependency } from '@/lib/schema'
import { SimulationResult } from '@/lib/simulation/slippage-engine'
import { RiskBufferAssessment } from '@/lib/simulation/monte-carlo'
import { useTranslation } from '@/lib/i18n/context'

interface SlippageSimulationBarProps {
  tasks: TimelineTask[]
  dependencies: TimelineDependency[]
  targetTaskId: string | null
  deltaDays: number
  onSelectTargetTask: (taskId: string) => void
  onChangeDeltaDays: (delta: number) => void
  onCommit: () => void
  onDiscard: () => void
  onClose: () => void
  simulationResult: SimulationResult
  riskAssessment: RiskBufferAssessment
}

export function SlippageSimulationBar({
  tasks,
  targetTaskId,
  deltaDays,
  onSelectTargetTask,
  onChangeDeltaDays,
  onCommit,
  onDiscard,
  onClose,
  simulationResult,
  riskAssessment,
}: SlippageSimulationBarProps) {
  const { locale } = useTranslation()
  const isId = locale === 'id'

  // Non-milestone tasks eligible for slippage simulation
  const eligibleTasks = useMemo(() => {
    return tasks.filter(t => !t.isMilestone)
  }, [tasks])

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === targetTaskId) || null
  }, [tasks, targetTaskId])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeDeltaDays(parseInt(e.target.value, 10))
  }

  const handleStep = (inc: number) => {
    const next = Math.max(-7, Math.min(21, deltaDays + inc))
    onChangeDeltaDays(next)
  }

  return (
    <section
      aria-label="What-if simulation workspace"
      className="w-full bg-surface-container-low/95 backdrop-blur-sm border-y border-border-dark px-4 py-3 shadow-md flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header Row: Title, Sandbox Badge, Close */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-sm font-semibold text-on-surface tracking-tight">
              {isId ? 'Simulasi Risiko & Keterlambatan (What-If)' : 'What-If Schedule Slippage & Risk Sandbox'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {isId ? 'Pratinjau Non-Destruktif' : 'Non-Destructive Simulation'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Discard / Reset */}
          {deltaDays !== 0 && (
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded border border-border-dark transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
              title={isId ? 'Kembalikan simulasi ke baseline' : 'Reset simulation to baseline'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isId ? 'Reset' : 'Reset'}</span>
            </button>
          )}

          {/* Commit Changes */}
          <button
            type="button"
            disabled={deltaDays === 0 || !targetTaskId}
            onClick={onCommit}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isId ? 'Terapkan ke Jadwal' : 'Commit to Timeline'}</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
            title={isId ? 'Tutup simulasi' : 'Close simulation'}
            aria-label="Close simulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Controls: Task Selector, Slider & Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-surface-container-lowest/80 border border-border-dark p-2.5 rounded-lg">
        {/* Task Selector */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <label htmlFor="simulate-task-select" className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">
            {isId ? 'Pilih Tugas yang Mengalami Deviasi:' : 'Simulate Delay for Task:'}
          </label>
          <select
            id="simulate-task-select"
            value={targetTaskId || ''}
            onChange={e => onSelectTargetTask(e.target.value)}
            className="w-full bg-surface-container border border-border-dark rounded px-2.5 py-1.5 text-xs text-on-surface focus-visible:ring-2 focus-visible:ring-primary outline-none truncate"
          >
            <option value="" disabled>
              {isId ? '-- Pilih Tugas --' : '-- Choose Task --'}
            </option>
            {eligibleTasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.isCritical ? '⚡ ' : ''}{t.name} ({t.durationDays}d · {t.assignee || (isId ? 'Tanpa PIC' : 'Unassigned')})
              </option>
            ))}
          </select>
        </div>

        {/* Delay Slider + Stepper */}
        <div className="md:col-span-8 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">
              {isId ? 'Deviasi Durasi / Tanggal (Hari):' : 'Schedule Variance (Days):'}
            </span>
            <span
              className={`font-mono font-semibold px-2 py-0.5 rounded text-xs ${
                deltaDays > 0
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : deltaDays < 0
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-surface-container text-on-surface-variant border border-border-dark'
              }`}
            >
              {deltaDays > 0 ? `+${deltaDays}` : deltaDays} {isId ? 'Hari' : 'Days'}
              {deltaDays > 0 ? ' (Terlambat)' : deltaDays < 0 ? ' (Lebih Cepat)' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Decrement */}
            <button
              type="button"
              disabled={!targetTaskId || deltaDays <= -7}
              onClick={() => handleStep(-1)}
              className="p-1 rounded bg-surface-container hover:bg-surface-container-high border border-border-dark text-on-surface disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none shrink-0"
              aria-label="Decrease delay by 1 day"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Slider */}
            <input
              type="range"
              min="-7"
              max="21"
              step="1"
              disabled={!targetTaskId}
              value={deltaDays}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
              aria-label="Schedule variance in days"
            />

            {/* Increment */}
            <button
              type="button"
              disabled={!targetTaskId || deltaDays >= 21}
              onClick={() => handleStep(1)}
              className="p-1 rounded bg-surface-container hover:bg-surface-container-high border border-border-dark text-on-surface disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none shrink-0"
              aria-label="Increase delay by 1 day"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Impact Telemetry & Risk Summary */}
      {selectedTask && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-0.5 border-t border-border-dark/60">
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Finish Impact */}
            <div className="flex items-center gap-1.5 font-mono text-on-surface">
              <span className="text-on-surface-variant font-sans text-[11px] uppercase tracking-wider">
                {isId ? 'Dampak Proyek:' : 'Project End Impact:'}
              </span>
              {simulationResult.projectDelayDays > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  +{simulationResult.projectDelayDays} {isId ? 'hari mundur' : 'days delayed'}
                  <span className="text-on-surface-variant font-normal">
                    ({simulationResult.simulatedProjectEnd})
                  </span>
                </span>
              ) : (
                <span className="font-semibold text-emerald-400">
                  {isId ? 'Jadwal Akhir Aman (Terserap Slack)' : 'Project End Preserved (Slack Absorbed)'}
                </span>
              )}
            </div>

            <div className="h-3 w-px bg-border-dark hidden sm:block" />

            {/* Downstream Tasks Shifted */}
            <div className="flex items-center gap-1.5 font-mono text-on-surface-variant">
              <span className="font-sans text-[11px] uppercase tracking-wider">
                {isId ? 'Tugas Terdampak:' : 'Cascade Shift:'}
              </span>
              <span className="text-on-surface font-semibold">
                {simulationResult.impactedCount} {isId ? 'tugas downstream' : 'downstream tasks'}
              </span>
            </div>
          </div>

          {/* Monte Carlo P80 Confidence Buffer Indicator */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-on-surface-variant bg-surface-container px-2.5 py-1 rounded border border-border-dark">
            <ShieldAlert className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {isId ? 'Rekomendasi Buffer P80:' : 'P80 Buffer Recommendation:'}{' '}
              <strong className="text-on-surface font-semibold">
                +{riskAssessment.recommendedBufferDays}d
              </strong>{' '}
              ({riskAssessment.p80EndDate})
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
