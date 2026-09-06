'use client'

import React from 'react'
import { TimelineTask } from '@/lib/schema'
import { formatDateDisplay } from '@/lib/parser/date-grammar'
import { Calendar, Users, Flame } from 'lucide-react'

interface ProjectMetricsStripProps {
  tasks: TimelineTask[]
}

export function ProjectMetricsStrip({ tasks }: ProjectMetricsStripProps) {
  if (tasks.length === 0) return null

  const startDates = tasks.map(t => t.start).sort()
  const endDates = tasks.map(t => t.end).sort()
  const earliest = formatDateDisplay(startDates[0])
  const latest = formatDateDisplay(endDates[endDates.length - 1])

  const totalDays = tasks.reduce((sum, t) => sum + (t.durationDays || 0), 0)
  const criticalCount = tasks.filter(t => t.isCritical).length
  const uniqueAssignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean)))
  const completedCount = tasks.filter(t => (t.progress ?? 0) >= 100).length

  return (
    <div className="h-8 bg-surface/60 border-b border-border px-3 flex items-center gap-4 text-[12px] text-text-dim overflow-x-auto shrink-0">
      <div className="flex items-center gap-1.5">
        <Calendar size={13} className="text-primary" />
        <span className="font-medium text-text-primary">{earliest} – {latest}</span>
        <span className="text-muted">({totalDays} hari total)</span>
      </div>

      <div className="h-3.5 w-px bg-border shrink-0" />

      <div className="flex items-center gap-1.5">
        <span className="font-medium text-text-primary">{tasks.length}</span>
        <span className="text-muted">Tasks</span>
        {completedCount > 0 && (
          <span className="text-completed font-medium">({completedCount} selesai)</span>
        )}
      </div>

      {criticalCount > 0 && (
        <>
          <div className="h-3.5 w-px bg-border shrink-0" />
          <div className="flex items-center gap-1 text-critical font-medium">
            <Flame size={13} />
            <span>{criticalCount} Critical Path</span>
          </div>
        </>
      )}

      {uniqueAssignees.length > 0 && (
        <>
          <div className="h-3.5 w-px bg-border shrink-0" />
          <div className="flex items-center gap-1.5 text-text-dim">
            <Users size={13} className="text-muted" />
            <span>{uniqueAssignees.length} PIC</span>
          </div>
        </>
      )}
    </div>
  )
}
