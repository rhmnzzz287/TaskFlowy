# TaskFlowy MVP Market-Readiness Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memposisikan TaskFlowy sebagai alternatif tercepat di pasar untuk membuat dan membagikan jadwal proyek (*"From notes to client-ready Gantt in 30 seconds"*) tanpa *over-engineering*, melalui akselerasi input cerdas, checkpoint milestone, metrik ringkas, dan distribusi 1-klik (Slack/WA & Native PDF).

**Architecture:**
- **Zero-Dependency Acceleration:** Memanfaatkan kapabilitas native browser (`window.print`, `navigator.clipboard`, keyboard events) dan *pure derived state* (metrik proyek di memory).
- **Frictionless Sequential Input:** Menggabungkan *Smart Default Start Date* (mengikuti tanggal selesai tugas sebelumnya), *Quick-Preset Chips*, dan *Predecessor Dropdown* langsung pada tabel baris.
- **Project Dynamics:** Dukungan *Milestone* (durasi 0 hari dengan visual diamond) dan *Bulk Shift Dates* (menggeser seluruh jadwal proyek secara proporsional).
- **Dual Distribution:** Format teks rapi ber-emoji untuk obrolan tim (Slack/WA) dan layout cetak A4 landscape untuk laporan eksekutif.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, Frappe Gantt.

**Spec:** [PRD.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/PRD.md), [DESIGN.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/DESIGN.md)

## Global Constraints

- **No New Heavy Libraries:** Dilarang menginstal library PDF (jsPDF, puppeteer), datepicker eksternal, atau drag-and-drop toolkit. Gunakan native DOM dan Tailwind CSS.
- **Deterministic & Zero-Cost:** Seluruh parsing dan kalkulasi jadwal harus berjalan deterministik di sisi browser pengguna tanpa memicu request API server.
- **Responsive & Clean Grid:** Input tabel di `RowEditor` harus tetap rapi pada layar desktop minimal 1024px tanpa horizontal scrolling yang mengganggu.

---

### Task 1: Engine Input Cepat (Quick-Preset Chips + Arrow Stepper)

**Files:**
- Create: `frontend/src/components/task-input/duration-input.tsx`
- Modify: `frontend/src/components/task-input/row-editor.tsx`
- Test: `frontend/scripts/test-duration-input.ts`

**Interfaces:**
- Consumes: `parseDuration` dari `@/lib/parser/duration-grammar`
- Produces: `DurationInput({ value, onChange, error, placeholder, className }: DurationInputProps)`

- [x] **Step 1: Tulis script test validasi parser durasi**

Buat `frontend/scripts/test-duration-input.ts`:
```typescript
import { parseDuration } from '../src/lib/parser/duration-grammar'

const validPresets = ['1 hari', '2 hari', '3 hari', '5 hari', '1 minggu', '2 minggu']
for (const p of validPresets) {
  const res = parseDuration(p)
  if (!res.ok) {
    console.error(`Preset "${p}" gagal di-parse:`, res)
    process.exit(1)
  }
}
console.log('✓ Seluruh preset durasi terbukti valid.')
```

- [x] **Step 2: Jalankan test preset**

Run: `npx tsx scripts/test-duration-input.ts` (dari folder `frontend`)
Expected: `✓ Seluruh preset durasi terbukti valid.`

- [x] **Step 3: Buat komponen `DurationInput`**

Buat `frontend/src/components/task-input/duration-input.tsx`:
```tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { parseDuration } from '@/lib/parser/duration-grammar'

interface DurationInputProps {
  value: string
  onChange: (val: string) => void
  error?: boolean
  placeholder?: string
  className?: string
}

const PRESET_CHIPS = [
  { label: '1h', value: '1 hari' },
  { label: '2h', value: '2 hari' },
  { label: '3h', value: '3 hari' },
  { label: '5h', value: '5 hari' },
  { label: '1m', value: '1 minggu' },
  { label: '2m', value: '2 minggu' },
]

export function DurationInput({
  value,
  onChange,
  error = false,
  placeholder = '3 hari',
  className = '',
}: DurationInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const parsed = parseDuration(value)
      const currentDays = parsed.ok ? parsed.days : 1
      const nextDays = e.key === 'ArrowUp' ? currentDays + 1 : Math.max(1, currentDays - 1)
      onChange(`${nextDays} hari`)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        className={`cell-input ${error ? 'ring-1 ring-error' : ''} ${className}`}
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-surface border border-border rounded shadow-xl p-1.5 flex flex-wrap gap-1 min-w-[160px]">
          <span className="text-[10px] text-muted font-medium w-full px-1">Quick Select:</span>
          {PRESET_CHIPS.map(chip => (
            <button
              key={chip.label}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onChange(chip.value)
                setIsOpen(false)
              }}
              className="px-2 py-0.5 text-[11px] rounded bg-surface-hi hover:bg-primary hover:text-white text-text-dim font-medium transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 4: Sambungkan `DurationInput` ke `RowEditor`**

Gantikan kolom durasi biasa di `frontend/src/components/task-input/row-editor.tsx` dengan komponen `<DurationInput>`.

---

### Task 2: Alur Input Sekuensial (Smart Start Date, Predecessor Dropdown & Row Controls)

**Files:**
- Modify: `frontend/src/components/task-input/row-editor.tsx`

**Interfaces:**
- Input: `rows: ParseRowState[]`
- Output: Row Editor dengan auto-chain date, reorder rows (`▲/▼`), duplicate row, dan predecessor dropdown.

- [x] **Step 1: Implementasikan Smart Default Start Date pada `addRow`**

Di [row-editor.tsx](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/frontend/src/components/task-input/row-editor.tsx):
```tsx
  const addRow = useCallback(() => {
    const lastRow = rows[rows.length - 1]
    const defaultStart = lastRow?.end ? lastRow.end : new Date().toISOString().slice(0, 10)

    onChange([
      ...rows,
      {
        id: createRowId(),
        name: '',
        assignee: lastRow?.assignee || '',
        start: defaultStart,
        duration: '3 hari',
        end: '',
        dependsOn: lastRow?.name ? lastRow.name : '',
      },
    ])
  }, [rows, onChange])
```

- [x] **Step 2: Tambahkan fungsi Reorder dan Duplicate baris**

Di [row-editor.tsx](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/frontend/src/components/task-input/row-editor.tsx):
```tsx
  const moveRow = useCallback((index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= rows.length) return
    const next = [...rows]
    const temp = next[index]
    next[index] = next[targetIdx]
    next[targetIdx] = temp
    onChange(next)
  }, [rows, onChange])

  const duplicateRow = useCallback((index: number) => {
    const target = rows[index]
    const copy = { ...target, id: createRowId(), name: `${target.name} (Copy)` }
    const next = [...rows]
    next.splice(index + 1, 0, copy)
    onChange(next)
  }, [rows, onChange])
```

- [x] **Step 3: Tambahkan kolom Predecessor di header & baris tabel**

Tambahkan kolom `Predecessor` (dropdown berisi task yang terdaftar di atas baris tersebut) dan tombol aksi baris `▲/▼`.

---

### Task 3: Dukungan Milestone (0 Hari / Diamond Checkpoint) & Bulk Shift Dates

**Files:**
- Modify: `frontend/src/lib/parser/duration-grammar.ts`
- Create: `frontend/src/components/task-input/bulk-shift-popover.tsx`
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- `parseDuration("0 hari" | "milestone")` mengembalikan `{ ok: true, days: 0 }`.
- `shiftAllDates(deltaDays: number)` menggeser seluruh jadwal proyek secara proporsional.

- [x] **Step 1: Izinkan durasi 0 hari / milestone di `duration-grammar.ts`**

Edit `frontend/src/lib/parser/duration-grammar.ts`:
```typescript
  if (s === 'milestone' || s === '0' || s === '0 hari' || s === '0 days' || s === '0 d') {
    return { ok: true, days: 0 }
  }

  const days = /^(\d+)\s*(hari|hrs?|hours?|days?)$/.exec(s)
  if (days) {
    const n = parseInt(days[1], 10)
    if (n >= 0) return { ok: true, days: n }
    return { ok: false, error: `Duration must be >= 0 days, got ${n}` }
  }
```

- [x] **Step 2: Buat komponen `BulkShiftPopover`**

Buat `frontend/src/components/task-input/bulk-shift-popover.tsx`:
```tsx
'use client'

import React, { useState } from 'react'
import { CalendarClock, ChevronDown } from 'lucide-react'

interface BulkShiftPopoverProps {
  onShift: (deltaDays: number) => void
  disabled?: boolean
}

export function BulkShiftPopover({ onShift, disabled = false }: BulkShiftPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleShift = (days: number) => {
    onShift(days)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="btn-secondary text-[12px] h-7 gap-1"
        title="Geser seluruh tanggal jadwal proyek"
      >
        <CalendarClock size={13} />
        <span>Shift Dates</span>
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded shadow-xl p-2 w-48 flex flex-col gap-1.5 text-[12px]">
          <span className="text-muted font-medium text-[11px] px-1">Undur Proyek:</span>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => handleShift(1)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">+1 hari</button>
            <button onClick={() => handleShift(3)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">+3 hari</button>
            <button onClick={() => handleShift(7)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">+1 mgg</button>
          </div>
          <span className="text-muted font-medium text-[11px] px-1 mt-1">Majukan Proyek:</span>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => handleShift(-1)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">-1 hari</button>
            <button onClick={() => handleShift(-3)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">-3 hari</button>
            <button onClick={() => handleShift(-7)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">-1 mgg</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 3: Hubungkan fungsi Shift di toolbar `page.tsx`**

---

### Task 4: Visual Polish (Today Line & Project Health Metrics Strip)

**Files:**
- Create: `frontend/src/components/ui/project-metrics-strip.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/components/gantt-board/gantt-board.tsx`
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `tasks: TimelineTask[]`
- Produces: Komponen bar metrik ringkas dan garis penanda tanggal hari ini yang kontras tinggi.

- [x] **Step 1: Buat komponen `ProjectMetricsStrip`**

Buat file `frontend/src/components/ui/project-metrics-strip.tsx`:
```tsx
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
```

- [x] **Step 2: Tambahkan CSS `.today-highlight` di `globals.css`**

```css
/* Enhanced Today Line on Gantt */
.gantt .today-highlight {
  fill: rgba(239, 68, 68, 0.08) !important;
  stroke: #ef4444 !important;
  stroke-width: 2px !important;
  stroke-dasharray: 4 3 !important;
  pointer-events: none;
}
.dark .gantt .today-highlight {
  fill: rgba(239, 68, 68, 0.15) !important;
  stroke: #f87171 !important;
  stroke-width: 2px !important;
}
```

- [x] **Step 3: Pasang `ProjectMetricsStrip` di atas tab Gantt pada `page.tsx`**

---

### Task 5: Distribusi 1-Klik (Slack/WA Text Summary & Native Print-to-PDF)

**Files:**
- Create: `frontend/src/lib/format/text-summary.ts`
- Modify: `frontend/src/app/globals.css` (media print rules)
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- `generateChatSummary(tasks: TimelineTask[], title?: string): string`
- `window.print()` dengan layout A4 landscape yang bersih

- [x] **Step 1: Buat utilitas format ringkasan chat**

Buat `frontend/src/lib/format/text-summary.ts`:
```typescript
import { TimelineTask } from '../schema'
import { formatDateDisplay } from '../parser/date-grammar'

export function generateChatSummary(tasks: TimelineTask[], title = 'Jadwal Proyek'): string {
  if (!tasks || tasks.length === 0) return 'Belum ada task dalam timeline.'

  const startDates = tasks.map(t => t.start).sort()
  const endDates = tasks.map(t => t.end).sort()
  const earliest = formatDateDisplay(startDates[0])
  const latest = formatDateDisplay(endDates[endDates.length - 1])
  const totalDays = tasks.reduce((sum, t) => sum + (t.durationDays || 0), 0)

  const lines: string[] = [
    `📅 *${title}* (${earliest} - ${latest})`,
    `Total: ${tasks.length} task | Estimasi: ${totalDays} hari kerja`,
    '',
  ]

  tasks.forEach(t => {
    const startStr = formatDateDisplay(t.start)
    const endStr = formatDateDisplay(t.end)
    const pic = t.assignee ? ` — @${t.assignee}` : ''
    const crit = t.isCritical ? ' 🔥 *[Critical Path]*' : ''
    const badge = t.isMilestone ? ' 🚩 *[Milestone]*' : ` (${t.durationDays} hari)`
    const prog = (t.progress ?? 0) >= 100 ? ' ✅' : ''

    lines.push(`• [${startStr} - ${endStr}] ${t.name}${pic}${badge}${crit}${prog}`)
  })

  lines.push('')
  lines.push('Dibuat via TaskFlowy (Text-to-Gantt)')
  return lines.join('\n')
}
```

- [x] **Step 2: Tambahkan CSS Print Layout di `globals.css`**

```css
@media print {
  @page {
    size: landscape;
    margin: 1cm;
  }
  body {
    background: white !important;
    color: black !important;
  }
  header,
  .no-print,
  button,
  .panel:has(textarea),
  .panel:has(.cell-input) {
    display: none !important;
  }
  .gantt-container,
  .gantt {
    overflow: visible !important;
    width: 100% !important;
  }
}
```

- [x] **Step 3: Pasang tombol "Copy Summary" & "Print PDF" di toolbar `page.tsx`**

---

### Task 6: Verifikasi Menyeluruh & Build Test

- [x] **Step 1: Jalankan typecheck & build**

Run: `npm run build` di folder `frontend`
Expected: Status exit code 0 tanpa peringatan TypeScript.

- [x] **Step 2: End-to-End Checklist Verifikasi**
1. **Input:** Tambah row, klik durasi -> popover chips `1h`, `2h`, `3h`, `5h`, `1m`, `2m` muncul dan berfungsi.
2. **Keyboard:** Tekan ArrowUp/Down pada durasi -> angka hari bertambah/berkurang.
3. **Predecessor:** Dropdown memuat task sebelumnya dan panah relasi terhubung di Gantt.
4. **Milestone:** Ketik `milestone` atau `0 hari` -> tampil sebagai titik diamond 🚩.
5. **Shift Dates:** Klik "Shift Dates" +3 hari -> seluruh tanggal proyek otomatis maju 3 hari.
6. **Health Metrics Strip:** Baris atas Gantt menampilkan rentang tanggal dan jumlah PIC secara akurat.
7. **Copy Summary:** Klik "Copy Summary" -> salin ke clipboard dan paste di text editor.
8. **Print to PDF:** Tekan tombol Print / Ctrl+P -> dialog print browser terbuka dalam format landscape bersih.
