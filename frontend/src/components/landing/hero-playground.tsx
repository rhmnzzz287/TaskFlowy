'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Zap, CheckCircle2, RotateCcw, Store, Briefcase, Lightbulb, FileText, Table2, GitBranch, ChevronLeft, ChevronRight, Clock, Megaphone, Calendar, Lock } from 'lucide-react'
import { parseRawText, rowsToRawText } from '@/lib/format/raw-text'
import { parseRows } from '@/lib/parser/row-parser'
import { encodeRowsToHash } from '@/lib/url-state'
import { todayRef, type ParseRowState } from '@/lib/schema'
import {
  buildUmkmPreset,
  buildPmPreset,
  buildMarketingPreset,
  buildEventPreset,
  buildUmkmPresetEn,
  buildPmPresetEn,
  buildMarketingPresetEn,
  buildEventPresetEn,
  addDays,
} from '@/lib/landing-presets'
import { useTranslation } from '@/lib/i18n/context'



const ASSIGNEE_COLORS = [
  'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
]

/**
 * Route clean SVG orthogonal paths with rounded corners between predecessor
 * bar (x1, y1) and successor bar (x2, y2).
 */
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
    // Forward progression with enough lag
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
    // Immediate predecessor finish or overlap: route through the inter-row gap
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
  if (!iso) return Date.now()
  const parts = iso.split('-')
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    return new Date(y, m, d, 0, 0, 0, 0).getTime()
  }
  const dt = new Date(iso)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0).getTime()
}


export function HeroPlayground() {

  const { locale, t } = useTranslation()
  type PresetType = 'umkm' | 'pm' | 'marketing' | 'event'
  const [activePreset, setActivePreset] = useState<PresetType>('umkm')

  // Presets are generated dynamically from today's reference date in current locale.
  const presets = useMemo(() => {
    const ref = todayRef()
    return locale === 'en'
      ? {
          umkm: buildUmkmPresetEn(ref),
          pm: buildPmPresetEn(ref),
          marketing: buildMarketingPresetEn(ref),
          event: buildEventPresetEn(ref),
        }
      : {
          umkm: buildUmkmPreset(ref),
          pm: buildPmPreset(ref),
          marketing: buildMarketingPreset(ref),
          event: buildEventPreset(ref),
        }
  }, [locale])

  const [rawText, setRawText] = useState(presets.umkm)

  // Switch demo text when locale or preset selection changes
  useEffect(() => {
    setRawText(presets[activePreset])
  }, [presets, activePreset])

  const handleSelectPreset = (type: PresetType) => {
    setActivePreset(type)
    setRawText(presets[type])
  }



  // Table view reads the same raw text
  const tableRows = useMemo(() => parseRawText(rawText), [rawText])

  // Parse reactively for preview and workbench URL
  const { tasks, workbenchUrl } = useMemo(() => {
    const rows = parseRawText(rawText)
    const { tasks: parsedTasks } = parseRows(rows, todayRef())
    const hash = encodeRowsToHash(rows)
    return {
      tasks: parsedTasks,
      workbenchUrl: `/app${hash ? `#${hash}` : ''}`,
    }
  }, [rawText])

  // Measure viewport container width to dynamically scale day columns or enable horizontal scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const rowsContainerRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)

  useEffect(() => {
    if (!scrollContainerRef.current) return
    const el = scrollContainerRef.current
    const update = () => {
      if (el) {
        setViewportWidth(el.clientWidth)
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleScroll = (delta: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' })
    }
  }

  // Calculate exact calendar day span, columns, and task layout positions
  const { minTime, totalDays, dayWidth, contentWidth, isScrollable, gridDays, taskLayouts } = useMemo(() => {
    if (tasks.length === 0) {
      return {
        minTime: 0,
        totalDays: 0,
        dayWidth: 70,
        contentWidth: 0,
        isScrollable: false,
        gridDays: [],
        taskLayouts: [],
      }
    }

    let min = Infinity
    let max = -Infinity

    tasks.forEach(t => {
      const s = parseISODateLocal(t.start)
      const e = s + (t.durationDays ?? 1) * DAY_MS
      if (s < min) min = s
      if (e > max) max = e
    })

    // Generous minimum day width so task titles and duration badges fit cleanly inside each bar
    const minDayW = 75
    const rawDays = Math.max(1, Math.round((max - min) / DAY_MS))
    const bufferDays = 2
    const daysCount = rawDays + bufferDays
    const availableW = viewportWidth > 0 ? viewportWidth - 4 : 0
    const dayW = availableW > daysCount * minDayW ? Math.floor(availableW / daysCount) : minDayW
    const totalW = daysCount * dayW
    const scrollable = totalW > availableW && availableW > 0


    const days: {
      index: number
      left: number
      weekday: string
      dayNum: number
      isWeekend: boolean
    }[] = []

    for (let i = 0; i < daysCount; i++) {
      const dt = new Date(min + i * DAY_MS)
      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
      days.push({
        index: i,
        left: i * dayW,
        weekday: dt.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { weekday: 'narrow' }),
        dayNum: dt.getDate(),
        isWeekend,
      })
    }

    const ROW_HEIGHT = 32
    const ROW_STEP = 42

    const layouts = tasks.map((task, idx) => {
      const s = parseISODateLocal(task.start)
      const startDay = Math.max(0, Math.round((s - min) / DAY_MS))
      const dur = Math.max(1, task.durationDays ?? 1)
      const barLeft = startDay * dayW + 2
      const barWidth = Math.max(28, dur * dayW - 4)
      const barRight = barLeft + barWidth
      const yCenter = idx * ROW_STEP + ROW_HEIGHT / 2

      return {
        task,
        idx,
        id: task.id,
        name: task.name.trim().toLowerCase(),
        displayName: task.name,
        startDay,
        dur,
        barLeft,
        barWidth,
        barRight,
        yCenter,
      }
    })

    return {
      minTime: min,
      totalDays: daysCount,
      dayWidth: dayW,
      contentWidth: totalW,
      isScrollable: scrollable,
      gridDays: days,
      taskLayouts: layouts,
    }
  }, [tasks, viewportWidth, locale])

  // Calculate Gantt dependency connection lines and arrow endpoints in exact contentWidth coordinate system
  const dependencyLinks = useMemo(() => {
    if (taskLayouts.length < 2 || contentWidth <= 0) return []

    const links: {
      id: string
      fromName: string
      toName: string
      dAttr: string
    }[] = []

    taskLayouts.forEach((childBound, childIdx) => {
      const child = childBound.task
      if (!child.dependsOn) return
      const rawDep = child.dependsOn.trim()
      if (!rawDep) return

      const depTokens = rawDep.split(/[,;]/).map(d => d.trim().toLowerCase()).filter(Boolean)

      depTokens.forEach(token => {
        const parent = taskLayouts.find((p, pIdx) => {
          if (pIdx === childIdx) return false
          if (p.name === token || p.id.toLowerCase() === token) return true
          if (`row ${pIdx + 1}` === token || `task ${pIdx + 1}` === token || String(pIdx + 1) === token) return true
          if (token.length >= 3 && (p.name.includes(token) || token.includes(p.name))) return true
          return false
        })

        if (parent) {
          const dAttr = computeGanttDependencyPath(
            parent.barRight,
            parent.yCenter,
            childBound.barLeft,
            childBound.yCenter,
            parent.idx,
            childBound.idx
          )
          links.push({
            id: `${parent.idx}->${childBound.idx}-${token}`,
            fromName: parent.displayName,
            toName: childBound.displayName,
            dAttr,
          })
        }
      })
    })

    return links
  }, [taskLayouts, contentWidth])



  return (
    <section id="playground" className="relative pt-12 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Hero Headline */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
          <Zap size={13} />
          <span>{t.hero.pillBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
          {t.hero.titlePart1} <br className="hidden sm:inline" />
          <span className="text-primary">{t.hero.titlePart2}</span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          {t.hero.description}
        </p>
      </div>

      {/* Interactive Playground Split Box */}
      <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Playground Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-hi/40 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-text-primary">{t.hero.tryExample}</span>
            <button
              onClick={() => handleSelectPreset('umkm')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                activePreset === 'umkm'
                  ? 'bg-primary text-white dark:text-[#0F172A] shadow-xs'
                  : 'bg-surface border border-border text-muted hover:text-text-primary'
              }`}
            >
              <Store size={13} />
              <span>{t.hero.presetUmkm}</span>
            </button>
            <button
              onClick={() => handleSelectPreset('pm')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                activePreset === 'pm'
                  ? 'bg-primary text-white dark:text-[#0F172A] shadow-xs'
                  : 'bg-surface border border-border text-muted hover:text-text-primary'
              }`}
            >
              <Briefcase size={13} />
              <span>{t.hero.presetPm}</span>
            </button>
            <button
              onClick={() => handleSelectPreset('marketing')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                activePreset === 'marketing'
                  ? 'bg-primary text-white dark:text-[#0F172A] shadow-xs'
                  : 'bg-surface border border-border text-muted hover:text-text-primary'
              }`}
            >
              <Megaphone size={13} />
              <span>{t.hero.presetMarketing}</span>
            </button>
            <button
              onClick={() => handleSelectPreset('event')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                activePreset === 'event'
                  ? 'bg-primary text-white dark:text-[#0F172A] shadow-xs'
                  : 'bg-surface border border-border text-muted hover:text-text-primary'
              }`}
            >
              <Calendar size={13} />
              <span>{t.hero.presetEvent}</span>
            </button>
          </div>

          <button
            onClick={() => setRawText(presets[activePreset])}
            className="text-muted hover:text-text-primary text-xs flex items-center gap-1 transition-colors"
            title={t.hero.reset}
          >
            <RotateCcw size={12} />
            <span>{t.hero.reset}</span>
          </button>
        </div>

        {/* Split Editor & Mini-Gantt */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Sisi Kiri: Locked Example Template Table */}
          <div className="lg:col-span-5 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div>
                <span className="text-xs font-bold text-text-primary block">{t.hero.tableTitle}</span>
                <span className="text-[11px] text-muted">
                  {locale === 'en' ? 'Template data preview for sample timeline' : 'Data template contoh untuk preview linimasa'}
                </span>
              </div>

              {/* Locked indicator badge */}
              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-surface border border-border text-muted inline-flex items-center gap-1.5 shadow-2xs">
                <Lock size={11} className="text-primary" />
                <span>{locale === 'en' ? 'Template (Locked)' : 'Template (Terkunci)'}</span>
              </span>
            </div>

            <div className="flex-1 overflow-x-auto rounded-xl border border-border flex flex-col bg-surface">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-hi/50 border-b border-border text-muted">
                    <th className="px-3 py-2 font-semibold">{locale === 'en' ? 'Task Name' : 'Nama Tugas'}</th>
                    <th className="px-2.5 py-2 font-semibold w-24">{locale === 'en' ? 'Assignee' : 'PIC'}</th>
                    <th className="px-2.5 py-2 font-semibold w-24">{locale === 'en' ? 'Start' : 'Mulai'}</th>
                    <th className="px-2.5 py-2 font-semibold w-20">{locale === 'en' ? 'Duration' : 'Durasi'}</th>
                    <th className="px-2.5 py-2 font-semibold w-28">{locale === 'en' ? 'Depends On' : 'Relasi'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tableRows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-hi/10 transition-colors">
                      <td className="px-3 py-2 font-medium text-text-primary text-[12px] truncate max-w-[140px]">
                        {row.name}
                      </td>
                      <td className="px-2.5 py-2 text-[11px] text-muted truncate max-w-[90px]">
                        {row.assignee ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-hi/60 text-text-primary text-[10px]">
                            {row.assignee}
                          </span>
                        ) : (
                          <span className="text-muted/50">-</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-text-primary/90">
                        {row.start}
                      </td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-text-primary/90">
                        {row.duration}
                      </td>
                      <td className="px-2.5 py-2 text-[11px] text-muted truncate max-w-[110px]">
                        {row.dependsOn ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            <GitBranch size={9} />
                            <span className="truncate max-w-[85px]">{row.dependsOn}</span>
                          </span>
                        ) : (
                          <span className="text-muted/50">{t.hero.noPredecessor}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-3 py-2.5 border-t border-border bg-surface-hi/30 flex items-center justify-between">
                <span className="text-[11px] text-muted flex items-center gap-1.5">
                  <Lock size={12} className="text-muted/70" />
                  <span>{locale === 'en' ? 'Table locked to template' : 'Tabel terkunci pada template'}</span>
                </span>
                <Link
                  href={workbenchUrl}
                  className="text-xs font-semibold text-primary hover:text-primary-focus flex items-center gap-1 transition-colors group"
                >
                  <span>{locale === 'en' ? 'Open in Workbench to edit' : 'Buka di Workbench untuk edit'}</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-muted mt-3 flex items-start gap-1.5">
              <Lightbulb size={13} className="shrink-0 mt-px text-amber-500" />
              <span>
                <em>
                  {locale === 'en'
                    ? 'Use the preset buttons above to preview different templates. Open Workbench to edit tasks or import your own Excel/CSV file.'
                    : 'Gunakan tombol template di atas untuk melihat contoh jadwal. Buka Workbench untuk mengedit tugas atau mengimpor file Excel/CSV Anda sendiri.'}
                </em>
              </span>
            </p>
          </div>

          {/* Sisi Kanan: Live Mini-Gantt Bar Visualizer */}
          <div className="lg:col-span-7 p-4 flex flex-col justify-between bg-surface-hi/10 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-text-primary">{t.hero.timelinePreview}</span>
                  {dependencyLinks.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                      <GitBranch size={10} />
                      <span>{dependencyLinks.length} {locale === 'en' ? 'dependencies' : 'relasi'}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isScrollable && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleScroll(-140)}
                        aria-label="Scroll timeline left"
                        className="p-1 rounded-md bg-surface border border-border text-muted hover:text-text-primary hover:bg-surface-hi transition-colors shadow-2xs"
                        title={locale === 'en' ? 'Scroll left' : 'Geser ke kiri'}
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span className="text-[10px] text-muted font-mono px-0.5">
                        {locale === 'en' ? 'Scroll' : 'Geser'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleScroll(140)}
                        aria-label="Scroll timeline right"
                        className="p-1 rounded-md bg-surface border border-border text-muted hover:text-text-primary hover:bg-surface-hi transition-colors shadow-2xs"
                        title={locale === 'en' ? 'Scroll right' : 'Geser ke kanan'}
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                  <span className="text-[11px] text-muted">{tasks.length} {t.hero.tasksDetected}</span>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs border border-dashed border-border rounded-xl">
                  {t.hero.noTasks}
                </div>
              ) : (
                /* Horizontally Scrollable Timeline Container */
                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto overflow-y-hidden rounded-xl border border-border/70 bg-surface-hi/20 shadow-inner select-none transition-all scrollbar-thin"
                  tabIndex={0}
                  aria-label={t.hero.timelinePreview}
                >
                  <div style={{ width: `${contentWidth}px`, minWidth: '100%' }} className="relative flex flex-col gap-2 p-2">
                    {/* Date Axis Header */}
                    <div
                      style={{ width: `${contentWidth}px` }}
                      className="relative h-9 border-b border-border/70 rounded-lg bg-surface-hi/50 overflow-hidden select-none"
                    >
                      {gridDays.map(day => (
                        <div
                          key={day.index}
                          style={{ left: `${day.left}px`, width: `${dayWidth}px` }}
                          className={`absolute inset-y-0 flex flex-col items-center justify-center border-r border-border/40 text-[10px] font-mono ${
                            day.isWeekend ? 'bg-surface-hi/60 text-muted/60' : 'text-text-primary'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-semibold opacity-70 leading-none mb-0.5">{day.weekday}</span>
                          <span className="font-bold text-[11px] leading-none">{day.dayNum}</span>
                        </div>
                      ))}
                    </div>

                    {/* Task Rows Container with SVG Dependency Overlay */}
                    <div ref={rowsContainerRef} className="relative flex flex-col gap-2.5">
                      {dependencyLinks.length > 0 && (
                        <svg
                          className="absolute inset-0 pointer-events-none z-10 overflow-visible"
                          style={{ width: `${contentWidth}px`, height: `${taskLayouts.length * 42 - 10}px` }}
                          aria-hidden="true"
                        >
                          <defs>
                            <marker
                              id="gantt-preview-arrow"
                              viewBox="0 0 10 10"
                              refX="7"
                              refY="5"
                              markerWidth="6"
                              markerHeight="6"
                              orient="auto"
                            >
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-primary/80 dark:fill-primary/90" />
                            </marker>
                          </defs>
                          {dependencyLinks.map(link => (
                            <path
                              key={link.id}
                              d={link.dAttr}
                              fill="none"
                              className="stroke-primary/75 dark:stroke-primary/90 transition-all duration-200"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              markerEnd="url(#gantt-preview-arrow)"
                            >
                              <title>{`${link.fromName} → ${link.toName}`}</title>
                            </path>
                          ))}
                        </svg>
                      )}

                      {taskLayouts.map((item, idx) => {
                        const colorClass = ASSIGNEE_COLORS[idx % ASSIGNEE_COLORS.length]

                        return (
                          <div
                            key={item.task.id}
                            style={{ width: `${contentWidth}px` }}
                            className="relative flex items-center h-8 bg-surface-hi/40 rounded-lg p-1"
                          >
                            {/* Column gridlines + weekend wash behind the bar */}
                            <div className="absolute inset-1 pointer-events-none" aria-hidden="true">
                              {gridDays.map(day => (
                                <div
                                  key={day.index}
                                  style={{ left: `${day.left}px`, width: `${dayWidth}px` }}
                                  className={`absolute inset-y-0 border-r border-border/30 ${
                                    day.isWeekend ? 'bg-surface-hi/40' : ''
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Task bar with all text cleanly INSIDE the box */}
                            <div
                              style={{ left: `${item.barLeft}px`, width: `${item.barWidth}px` }}
                              title={`${item.task.name} (${item.dur} ${locale === 'en' ? 'days' : 'hari'})${item.task.assignee ? ` • @${item.task.assignee}` : ''}${item.task.dependsOn ? ` • after: ${item.task.dependsOn}` : ''}`}
                              className={`absolute h-6 rounded-md px-2 flex items-center justify-between text-[11px] font-medium border shadow-2xs transition-all duration-300 select-none ${colorClass}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-1 overflow-hidden">
                                <span className="font-semibold truncate">{item.task.name}</span>
                                {item.task.assignee && (
                                  <span className="text-[10px] opacity-85 shrink-0 font-normal">@{item.task.assignee}</span>
                                )}
                              </div>
                              <span className="text-[10px] opacity-80 font-mono ml-1 shrink-0">{item.dur}{locale === 'en' ? 'd' : 'h'}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>



            {/* Seamless Handoff Action */}
            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-muted">
                {t.hero.handoffDesc}
              </span>
              <Link
                href={workbenchUrl}
                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
              >
                <span>{t.hero.handoffCta}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
