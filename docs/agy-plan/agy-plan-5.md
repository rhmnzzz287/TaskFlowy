# TaskFlowy Public Landing Page & Interactive Playground Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun Landing Page publik TaskFlowy pada root route (`/`) dengan live interactive text-to-gantt playground, segmentasi solusi untuk UMKM & Project Manager, matriks kebebasan penjadwalan (*freedom matrix*), dan cerita brand (*About Us*), sembari memindahkan workbench Gantt penuh ke rute dedikasi (`/app`) dengan *seamless state handoff*.

**Architecture:**
- **Route Segregation (`/` vs `/app`):** Halaman publik promosi dan pengenalan brand hidup di `frontend/src/app/page.tsx` (`/`), sedangkan workbench editor Gantt dipindahkan ke `frontend/src/app/app/page.tsx` (`/app`).
- **Zero-Latency In-Hero Playground:** Editor interaktif mini di landing page menggunakan parser deterministik internal (`parseRows`) dan CSS bar chart horizontal murni (tanpa membebani landing page dengan engine Frappe Gantt SVG penuh), sehingga render bersifat instan dan ringan.
- **State Handoff via URL Hash:** Hasil ketikan pengguna di playground landing page langsung di-*serialize* menggunakan `encodeRowsToHash` ke tautan `/app#state=...`, sehingga saat pengguna mengklik "Buka di Workbench Lengkap", data tidak hilang dan langsung terbuka di editor.
- **Interactive Persona Switcher:** Komponen tab interaktif yang menyajikan perbedaan masalah nyata dan solusi konkret antara Pelaku UMKM (produksi, toko, restok) dan Project/Product Manager (sprint, notulen rapat, laporan klien).
- **Anti-Slop Design & Responsive Theme:** Tipografi tegas modern, integrasi tema gelap/terang native (`ThemeToggle`), dan copywriting tajam tanpa jargon AI kosong.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, LZ-String.

**Spec:** [PRD.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/PRD.md), [SCHEMA.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/SCHEMA.md)

## Global Constraints

- **No Heavy External Libraries:** Dilarang menginstal library animasi besar (seperti Framer Motion) atau UI library eksternal. Gunakan Tailwind CSS transitions dan native React hooks.
- **Instant First Contentful Paint (FCP):** Landing page harus memuat secepat kilat tanpa dependensi eksternal, render Frappe Gantt penuh hanya ada di `/app`.
- **Seamless State Handoff:** Teks yang dicoba di playground landing page wajib bisa diteruskan ke `/app` tanpa hilang melalui URL hash.
- **Responsive & Mobile Friendly:** Landing page wajib rapi di layar ponsel (< 640px) maupun monitor desktop (> 1024px).

---

### Task 1: Relokasi Workbench Gantt ke Route `/app` & Verifikasi Routing

**Files:**
- Create: `frontend/src/app/app/page.tsx`
- Test: `frontend/scripts/test-routing-build.ts`

**Interfaces:**
- Consumes: Seluruh komponen eksisting workbench (`RowEditor`, `GanttBoard`, `HeaderActionsMenu`, dll)
- Produces: Rute workbench aktif di `/app` yang mampu membaca state dari hash URL `#state=...`

- [ ] **Step 1: Pindahkan kode workbench eksisting ke `frontend/src/app/app/page.tsx`**

Salin seluruh implementasi workbench dari `frontend/src/app/page.tsx` ke `frontend/src/app/app/page.tsx` dengan menambahkan navigasi kembali ke Landing Page di header logo:
```tsx
// Di header frontend/src/app/app/page.tsx
<a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Kembali ke Beranda">
  <div className="w-5 h-5 rounded bg-primary flex items-center justify-center font-bold text-[11px] text-white">T</div>
  <span className="font-semibold text-text-primary tracking-tight text-[13px]">TaskFlowy</span>
</a>
```

- [ ] **Step 2: Tulis test script verifikasi keberadaan file route dan hash decoding**

Buat file `frontend/scripts/test-routing-build.ts`:
```typescript
import fs from 'fs'
import path from 'path'
import { encodeRowsToHash, decodeHashToRows } from '../src/lib/url-state'
import type { ParseRowState } from '../src/lib/schema'

console.log('--- TEST 1: Verifikasi File Route /app/page.tsx ---')
const appPagePath = path.join(__dirname, '../src/app/app/page.tsx')
if (!fs.existsSync(appPagePath)) {
  console.error('FAIL: File frontend/src/app/app/page.tsx belum dibuat!')
  process.exit(1)
}
console.log('✓ File route /app/page.tsx terverifikasi.')

console.log('--- TEST 2: Verifikasi URL Hash Handoff ---')
const sampleRows: ParseRowState[] = [
  { id: '1', name: 'Produksi Roti', assignee: 'Bu Siti', start: '2026-09-07', duration: '3 hari', end: '2026-09-09' },
  { id: '2', name: 'Packaging', assignee: 'Doni', start: '2026-09-10', duration: '2 hari', end: '2026-09-11' },
]

const hash = encodeRowsToHash(sampleRows)
const decoded = decodeHashToRows(hash)

if (decoded.length !== 2 || decoded[0].name !== 'Produksi Roti') {
  console.error('FAIL: Hash handoff gagal mendekode data:', decoded)
  process.exit(1)
}
console.log('✓ Hash serialization & handoff berjalan sempurna.')
console.log('All routing tests passed!')
```

- [ ] **Step 3: Jalankan test verifikasi route dan handoff**

Run: `npx tsx scripts/test-routing-build.ts` (dari folder `frontend`)
Expected: Output `All routing tests passed!`

- [ ] **Step 4: Commit perubahan Task 1**

```bash
git add frontend/src/app/app/page.tsx frontend/scripts/test-routing-build.ts
git commit -m "refactor(routing): move gantt workbench to dedicated /app route"
```

---

### Task 2: Landing Navbar & In-Hero Interactive Playground

**Files:**
- Create: `frontend/src/components/landing/landing-navbar.tsx`
- Create: `frontend/src/components/landing/hero-playground.tsx`
- Create: `frontend/scripts/test-hero-playground.ts`

**Interfaces:**
- Consumes: `parseRows` dari `@/lib/parser/row-parser`, `parseRawText` dari `@/lib/format/raw-text`, `encodeRowsToHash` dari `@/lib/url-state`, `ThemeToggle` dari `@/components/ui/theme-toggle`
- Produces:
  ```typescript
  export function LandingNavbar(): JSX.Element
  export function HeroPlayground(): JSX.Element
  ```

- [ ] **Step 1: Tulis script test untuk preset playground dan mini-parser**

Buat file `frontend/scripts/test-hero-playground.ts`:
```typescript
import { parseRawText } from '../src/lib/format/raw-text'
import { parseRows } from '../src/lib/parser/row-parser'

console.log('--- TEST 1: Playground UMKM Preset Parsing ---')
const umkmText = `Beli Bahan Baku | Bu Siti | besok | 2 hari
Produksi Kue | Tim Dapur | after Beli Bahan Baku | 4 hari
Packaging & Label | Mas Doni | after Produksi Kue | 2 hari`

const umkmRows = parseRawText(umkmText)
const umkmResult = parseRows(
  umkmRows.map(r => ({ name: r.name, assignee: r.assignee, start: r.start, duration: r.duration })),
  '2026-09-07'
)

if (umkmResult.tasks.length !== 3) {
  console.error('FAIL: Expected 3 parsed tasks for UMKM, got:', umkmResult.tasks.length)
  process.exit(1)
}
console.log('✓ UMKM preset berhasil diparse menjadi 3 task valid.')

console.log('--- TEST 2: Playground PM Preset Parsing ---')
const pmText = `Wireframe UI | Designer | 10 Sep 2026 | 3 hari
Backend API | Budi | 12 Sep 2026 | 5 hari
Integrasi Frontend | Siti | after Backend API | 4 hari`

const pmRows = parseRawText(pmText)
const pmResult = parseRows(
  pmRows.map(r => ({ name: r.name, assignee: r.assignee, start: r.start, duration: r.duration })),
  '2026-09-07'
)

if (pmResult.tasks.length !== 3) {
  console.error('FAIL: Expected 3 parsed tasks for PM, got:', pmResult.tasks.length)
  process.exit(1)
}
console.log('✓ PM preset berhasil diparse menjadi 3 task valid.')
console.log('All hero playground tests passed!')
```

- [ ] **Step 2: Jalankan test playground**

Run: `npx tsx scripts/test-hero-playground.ts` (dari folder `frontend`)
Expected: Output `All hero playground tests passed!`

- [ ] **Step 3: Implementasikan `LandingNavbar`**

Buat file `frontend/src/components/landing/landing-navbar.tsx`:
```tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-bold text-sm text-white shadow-sm">
              T
            </div>
            <span className="font-bold text-text-primary tracking-tight text-base">TaskFlowy</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles size={11} /> 100% Bebas & Tanpa Login
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-muted font-medium">
          <a href="#playground" className="hover:text-text-primary transition-colors">Coba Langsung</a>
          <a href="#solusi" className="hover:text-text-primary transition-colors">Untuk UMKM & PM</a>
          <a href="#kebebasan" className="hover:text-text-primary transition-colors">Filosofi Kebebasan</a>
          <a href="#tentang" className="hover:text-text-primary transition-colors">Tentang Kami</a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/app"
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
          >
            <span>Buka Workbench</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Implementasikan `HeroPlayground`**

Buat file `frontend/src/components/landing/hero-playground.tsx`:
```tsx
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Play, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react'
import { parseRawText } from '@/lib/format/raw-text'
import { parseRows } from '@/lib/parser/row-parser'
import { encodeRowsToHash } from '@/lib/url-state'
import { todayRef } from '@/lib/schema'

const UMKM_PRESET = `Beli Bahan Baku | Bu Siti | besok | 2 hari
Produksi Kue Kering | Tim Dapur | after Beli Bahan Baku | 4 hari
Packaging & Label | Mas Doni | after Produksi Kue Kering | 2 hari
Pengiriman Pelanggan | Kurir Toko | after Packaging & Label | 1 hari`

const PM_PRESET = `Desain Wireframe UI | Designer | 10 Sep 2026 | 3 hari
Backend API & DB | Budi | 12 Sep 2026 | 5 hari
Integrasi Frontend | Siti | after Backend API & DB | 4 hari
QA Regression Test | Tim QA | after Integrasi Frontend | 2 hari`

const ASSIGNEE_COLORS = [
  'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
]

export function HeroPlayground() {
  const [activePreset, setActivePreset] = useState<'umkm' | 'pm'>('umkm')
  const [rawText, setRawText] = useState(UMKM_PRESET)

  const handleSelectPreset = (type: 'umkm' | 'pm') => {
    setActivePreset(type)
    setRawText(type === 'umkm' ? UMKM_PRESET : PM_PRESET)
  }

  // Parse secara reaktif
  const { tasks, workbenchUrl } = useMemo(() => {
    const refDate = todayRef()
    const rows = parseRawText(rawText)
    const result = parseRows(
      rows.map(r => ({
        name: r.name,
        assignee: r.assignee || null,
        start: r.start,
        duration: r.duration || null,
        end: r.end || null,
      })),
      refDate
    )

    const hash = encodeRowsToHash(rows)
    const workbenchUrl = `/app${hash}`

    return { tasks: result.tasks, workbenchUrl }
  }, [rawText])

  // Cari rentang tanggal untuk rendering mini timeline bar
  const { minTime, maxTime, totalSpan } = useMemo(() => {
    if (tasks.length === 0) return { minTime: 0, maxTime: 0, totalSpan: 1 }
    let min = Infinity
    let max = -Infinity
    tasks.forEach(t => {
      const s = new Date(t.start).getTime()
      const e = new Date(t.end).getTime()
      if (s < min) min = s
      if (e > max) max = e
    })
    const span = Math.max(1, max - min)
    return { minTime: min, maxTime: max, totalSpan: span }
  }, [tasks])

  return (
    <section id="playground" className="relative pt-12 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Hero Headline */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
          <Sparkles size={13} />
          <span>Kebebasan Menjadwalkan Tanpa Batas</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
          Bebas Jadwalkan Apa Saja. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 dark:to-blue-400">
            Catatan Mentah Jadi Gantt Chart Seketika.
          </span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          Tinggalkan birokrasi software manajemen proyek yang kaku dan formulir yang berbelit. 
          Cukup tulis rencana kerja Anda layaknya mencatat biasa — TaskFlowy mengubahnya menjadi 
          linimasa visual interaktif dalam hitungan detik.
        </p>
      </div>

      {/* Interactive Playground Split Box */}
      <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Playground Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-hi/40 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary">Coba Contoh Langsung:</span>
            <button
              onClick={() => handleSelectPreset('umkm')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                activePreset === 'umkm'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface border border-border text-muted hover:text-text-primary'
              }`}
            >
              🍞 Operasional UMKM
            </button>
            <button
              onClick={() => handleSelectPreset('pm')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                activePreset === 'pm'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface border border-border text-muted hover:text-text-primary'
              }`}
            >
              💻 Sprint Tim PM
            </button>
          </div>

          <button
            onClick={() => setRawText(activePreset === 'umkm' ? UMKM_PRESET : PM_PRESET)}
            className="text-muted hover:text-text-primary text-xs flex items-center gap-1 transition-colors"
            title="Reset teks contoh"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Split Editor & Mini-Gantt */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Sisi Kiri: Text Input */}
          <div className="lg:col-span-5 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted">
                Ketik teks baris bebas <span className="text-[10px] text-muted font-normal">(Task | PIC | Tanggal | Durasi)</span>
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 size={10} /> Live Parser
              </span>
            </div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={6}
              className="w-full flex-1 p-3 rounded-xl bg-surface-hi/30 border border-border text-xs font-mono leading-relaxed text-text-primary focus:outline-none focus:border-primary resize-none"
              placeholder="Contoh: Desain | Budi | besok | 3 hari"
            />
            <p className="text-[11px] text-muted mt-2">
              💡 <em>Tips: Coba ubah nama penanggung jawab atau ketik "after Desain" untuk melihat bar bergeser otomatis!</em>
            </p>
          </div>

          {/* Sisi Kanan: Live Mini-Gantt Bar Visualizer */}
          <div className="lg:col-span-7 p-4 flex flex-col justify-between bg-surface-hi/10">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-primary">Preview Linimasa Visual</span>
                <span className="text-[11px] text-muted">{tasks.length} tugas terdeteksi</span>
              </div>

              {tasks.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs border border-dashed border-border rounded-xl">
                  Belum ada baris task yang valid. Ketik di sebelah kiri untuk melihat linimasa.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {tasks.map((task, idx) => {
                    const taskStart = new Date(task.start).getTime()
                    const taskEnd = new Date(task.end).getTime()
                    const leftPct = totalSpan > 0 ? Math.max(0, ((taskStart - minTime) / totalSpan) * 100) : 0
                    const widthPct = totalSpan > 0 ? Math.max(12, ((taskEnd - taskStart) / totalSpan) * 100) : 20
                    const colorClass = ASSIGNEE_COLORS[idx % ASSIGNEE_COLORS.length]

                    return (
                      <div key={task.id} className="relative flex items-center h-8 bg-surface-hi/40 rounded-lg p-1">
                        <div
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          className={`absolute h-6 rounded-md px-2 flex items-center justify-between text-[11px] font-medium border shadow-2xs transition-all duration-300 ${colorClass}`}
                        >
                          <span className="truncate font-semibold">{task.name}</span>
                          <span className="text-[10px] opacity-75 font-mono ml-1">{task.durationDays}h</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Seamless Handoff Action */}
            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-muted">
                Suka hasilnya? Lanjutkan edit durasi, drag & drop, atau ekspor CSV di workbench.
              </span>
              <Link
                href={workbenchUrl}
                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
              >
                <span>Buka Teks Ini di Workbench Lengkap</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Commit perubahan Task 2**

```bash
git add frontend/src/components/landing/landing-navbar.tsx frontend/src/components/landing/hero-playground.tsx frontend/scripts/test-hero-playground.ts
git commit -m "feat(landing): implement LandingNavbar and HeroPlayground with live mini-gantt"
```

---

### Task 3: Interactive Persona Solutions (UMKM vs PM)

**Files:**
- Create: `frontend/src/components/landing/persona-solutions.tsx`

**Interfaces:**
- Consumes: None (Pure presentation & interactive state)
- Produces:
  ```typescript
  export function PersonaSolutions(): JSX.Element
  ```

- [ ] **Step 1: Implementasikan `PersonaSolutions`**

Buat file `frontend/src/components/landing/persona-solutions.tsx`:
```tsx
'use client'

import React, { useState } from 'react'
import { Store, Briefcase, Check, AlertCircle, Printer, FileSpreadsheet, Share2, Zap } from 'lucide-react'

export function PersonaSolutions() {
  const [activeTab, setActiveTab] = useState<'umkm' | 'pm'>('umkm')

  return (
    <section id="solusi" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-border">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Dirancang untuk Mereka yang Menghargai Waktu
        </h2>
        <p className="mt-2 text-sm text-muted">
          Apakah Anda pemilik bisnis lokal yang sibuk atau manajer proyek yang mengejar deadline rilis, 
          TaskFlowy memangkas waktu perencanaan hingga 90%.
        </p>
      </div>

      {/* Switcher Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 rounded-xl bg-surface-hi border border-border">
          <button
            onClick={() => setActiveTab('umkm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'umkm'
                ? 'bg-surface text-primary shadow-xs border border-border/80'
                : 'text-muted hover:text-text-primary'
            }`}
          >
            <Store size={15} />
            <span>Untuk Pelaku UMKM & Bisnis Lokal</span>
          </button>

          <button
            onClick={() => setActiveTab('pm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pm'
                ? 'bg-surface text-primary shadow-xs border border-border/80'
                : 'text-muted hover:text-text-primary'
            }`}
          >
            <Briefcase size={15} />
            <span>Untuk Project & Product Manager</span>
          </button>
        </div>
      </div>

      {/* Solution Detail Content */}
      {activeTab === 'umkm' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-5 p-6 bg-surface border border-border rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Solusi Usaha Mikro, Kecil, & Menengah
              </span>
              <h3 className="text-xl font-bold text-text-primary mt-3">
                Kendalikan Produksi & Pesanan Tanpa Pusing Software Mahal
              </h3>
              <div className="mt-4 space-y-3 text-xs text-muted">
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>Jira atau Asana terlalu rumit, penuh istilah teknis, dan menuntut biaya langganan per karyawan.</span>
                </div>
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>Spreadsheet Excel gampang rusak rumusnya saat Anda ingin menggeser tanggal pesanan pelanggan.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-text-primary font-medium italic">
                "Saya tidak punya waktu berjam-jam belajar software baru. Saya cuma ingin tahu siapa yang belanja bahan, siapa yang masak, dan kapan pesanan siap kirim."
              </p>
            </div>
          </div>

          <div className="md:col-span-7 p-6 bg-surface-hi/30 border border-border rounded-2xl flex flex-col justify-between">
            <h4 className="text-sm font-semibold text-text-primary mb-4">Keunggulan Spesifik untuk Toko & Operasional:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Zap size={18} className="text-primary mb-2" />
                <h5 className="text-xs font-bold text-text-primary">100% Gratis & Tanpa Akun</h5>
                <p className="text-[11px] text-muted mt-1">Buka di browser toko atau kasir, ketik jadwal, langsung jadi tanpa harus mendaftar.</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Printer size={18} className="text-emerald-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">Cetak Jadwal 1-Klik</h5>
                <p className="text-[11px] text-muted mt-1">Format cetak A4 landscape rapi siap print dan tempel di dinding dapur atau papan toko.</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Share2 size={18} className="text-blue-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">Kirim Ringkasan WhatsApp</h5>
                <p className="text-[11px] text-muted mt-1">Salin daftar tugas ber-emoji rapi langsung ke grup WhatsApp karyawan toko.</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <FileSpreadsheet size={18} className="text-purple-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">Ekspor ke Excel Bebas Rusak</h5>
                <p className="text-[11px] text-muted mt-1">Unduh ke format CSV standar jika pembukuan Anda membutuhkan arsip spreadsheet.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-5 p-6 bg-surface border border-border rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Solusi Project & Product Manager
              </span>
              <h3 className="text-xl font-bold text-text-primary mt-3">
                Dari Notulen Rapat Jadi Gantt Chart Siap Stakeholder
              </h3>
              <div className="mt-4 space-y-3 text-xs text-muted">
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>Notulen rapat di Slack atau Google Docs membutuhkan waktu manual untuk diubah menjadi Gantt chart.</span>
                </div>
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>Klien dan eksekutif butuh linimasa visual bersih, bukan board Kanban yang berantakan dengan 50 kartu.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-text-primary font-medium italic">
                "Meeting baru selesai jam 1:30 siang dan saya harus presentasi linimasa ke Direksi jam 2:00. TaskFlowy menyelamatkan saya hanya dengan copy-paste notulen."
              </p>
            </div>
          </div>

          <div className="md:col-span-7 p-6 bg-surface-hi/30 border border-border rounded-2xl flex flex-col justify-between">
            <h4 className="text-sm font-semibold text-text-primary mb-4">Fitur Andalan Manajemen Proyek:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Zap size={18} className="text-primary mb-2" />
                <h5 className="text-xs font-bold text-text-primary">Kalkulasi Jalur Kritis (Critical Path)</h5>
                <p className="text-[11px] text-muted mt-1">Sistem otomatis mendeteksi task mana yang menjadi penentu utama tanggal rilis proyek.</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Share2 size={18} className="text-emerald-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">Ekspor Gambar Presentasi (PNG & SVG)</h5>
                <p className="text-[11px] text-muted mt-1">Unduh grafik Gantt beresolusi tinggi langsung tempel ke slide deck pitch atau laporan klien.</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Printer size={18} className="text-blue-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">Bulk Shift Dates (Geser Masal)</h5>
                <p className="text-[11px] text-muted mt-1">Tanggal kickoff mundur seminggu? Geser seluruh linimasa sekaligus secara proporsional dalam 1 klik.</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <FileSpreadsheet size={18} className="text-purple-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">Sintaks Dependensi Alami</h5>
                <p className="text-[11px] text-muted mt-1">Cukup ketik "after Desain" atau "after Backend" tanpa harus menarik garis koneksi rumit secara manual.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Commit perubahan Task 3**

```bash
git add frontend/src/components/landing/persona-solutions.tsx
git commit -m "feat(landing): implement interactive PersonaSolutions for UMKM and PM"
```

---

### Task 4: Freedom Matrix & About Us Section

**Files:**
- Create: `frontend/src/components/landing/freedom-matrix.tsx`
- Create: `frontend/src/components/landing/about-section.tsx`
- Create: `frontend/src/components/landing/landing-footer.tsx`

**Interfaces:**
- Consumes: None (Pure presentation)
- Produces:
  ```typescript
  export function FreedomMatrix(): JSX.Element
  export function AboutSection(): JSX.Element
  export function LandingFooter(): JSX.Element
  ```

- [ ] **Step 1: Implementasikan `FreedomMatrix`**

Buat file `frontend/src/components/landing/freedom-matrix.tsx`:
```tsx
'use client'

import React from 'react'
import { Check, X, Shield, Lock, Unlock, Clock, Coins } from 'lucide-react'

export function FreedomMatrix() {
  const comparisons = [
    {
      criteria: 'Waktu dari Ide ke Linimasa',
      taskflowy: '< 30 Detik (Ketik teks langsung jadi)',
      excel: '15 - 30 Menit (Setup rumus & format)',
      jira: '30 - 60 Menit (Setup board, card, sprint)',
      highlight: true,
    },
    {
      criteria: 'Beban Form Input',
      taskflowy: 'Bebas (Cukup 1 baris catatan)',
      excel: 'Rawan salah rumus tanggal',
      jira: 'Wajib isi 8–10 field form per tugas',
    },
    {
      criteria: 'Biaya & Lisensi',
      taskflowy: '100% Gratis Tanpa Batasan',
      excel: 'Perlu lisensi Office / Workspace',
      jira: 'Berlangganan bulanan per user',
    },
    {
      criteria: 'Privasi & Kepemilikan Data',
      taskflowy: 'Local-First (Tersimpan di browser Anda)',
      excel: 'Tersimpan di cloud / file lokal',
      jira: 'Tersimpan di cloud vendor',
    },
    {
      criteria: 'Distribusi ke Tim',
      taskflowy: '1-Klik WhatsApp & Cetak A4 PDF',
      excel: 'Kirim file / screenshot manual',
      jira: 'Tim wajib punya akun & login',
    },
  ]

  return (
    <section id="kebebasan" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-border">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Filosofi Produk</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">
          Menjual Kebebasan dalam Penjadwalan
        </h2>
        <p className="mt-2 text-sm text-muted">
          Kami percaya membuat jadwal tidak seharusnya terasa seperti pekerjaan administratif baru.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-border rounded-2xl bg-surface shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-hi/40">
              <th className="p-4 font-semibold text-muted w-1/4">Kriteria</th>
              <th className="p-4 font-bold text-primary bg-primary/5 w-1/3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>TaskFlowy</span>
                </div>
              </th>
              <th className="p-4 font-semibold text-text-primary w-1/5">Excel / Spreadsheet</th>
              <th className="p-4 font-semibold text-text-primary w-1/5">Jira / Asana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {comparisons.map((row, idx) => (
              <tr key={idx} className="hover:bg-surface-hi/20 transition-colors">
                <td className="p-4 font-medium text-text-primary">{row.criteria}</td>
                <td className="p-4 font-semibold text-primary bg-primary/5">{row.taskflowy}</td>
                <td className="p-4 text-muted">{row.excel}</td>
                <td className="p-4 text-muted">{row.jira}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Implementasikan `AboutSection`**

Buat file `frontend/src/components/landing/about-section.tsx`:
```tsx
'use client'

import React from 'react'
import { Heart, Sparkles, Target, Users } from 'lucide-react'

export function AboutSection() {
  return (
    <section id="tentang" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-border">
      <div className="p-8 sm:p-12 bg-gradient-to-br from-surface to-surface-hi/50 border border-border rounded-3xl text-center relative overflow-hidden shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 text-primary">
          <Heart size={24} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Mengapa Kami Membangun TaskFlowy?
        </h2>

        <div className="mt-6 text-sm sm:text-base text-muted leading-relaxed space-y-4 max-w-2xl mx-auto">
          <p>
            TaskFlowy lahir dari rasa frustrasi terhadap tools produktivitas modern yang justru membuat kita 
            semakin tidak produktif. Sering kali, kita menghabiskan waktu 30 menit hanya untuk mengatur kartu, 
            mengisi formulir tanggal, dan menyesuaikan warna status di aplikasi manajemen proyek yang berat.
          </p>
          <p>
            Bagi pemilik usaha kecil dan pengelola tim yang tangkas, hal tersebut adalah pemborosan waktu. 
            Menjadwalkan pekerjaan seharusnya <strong>membebaskan pikiran untuk mengeksekusi rencana</strong>, 
            bukan membebani kita dengan birokrasi baru.
          </p>
          <p className="font-medium text-text-primary">
            Misi kami sederhana: Memberikan Anda alat tercepat, terbebas, dan paling fleksibel untuk mengubah 
            ide di kepala menjadi linimasa nyata — tanpa login, tanpa biaya, dan tanpa komplikasi.
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Implementasikan `LandingFooter`**

Buat file `frontend/src/components/landing/landing-footer.tsx`:
```tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface-hi/20 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Call to Action Banner */}
        <div className="max-w-xl mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
            Siap Mengatur Jadwal dalam Hitungan Detik?
          </h3>
          <p className="text-xs sm:text-sm text-muted mt-2">
            Tidak butuh kartu kredit, tidak butuh pendaftaran akun. Langsung buka dan mulai rencanakan.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              href="/app"
              className="btn-primary text-xs sm:text-sm px-5 py-2.5 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <span>Buka TaskFlowy Workbench Sekarang</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Minimalist Footnote */}
        <div className="pt-8 border-t border-border w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center font-bold text-[10px] text-white">T</div>
            <span className="font-semibold text-text-primary">TaskFlowy</span>
            <span>— Free & Open Productivity</span>
          </div>
          <p>© 2026 TaskFlowy. Dibuat dengan kebebasan untuk para pelaku usaha dan tim kerja.</p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Commit perubahan Task 4**

```bash
git add frontend/src/components/landing/freedom-matrix.tsx frontend/src/components/landing/about-section.tsx frontend/src/components/landing/landing-footer.tsx
git commit -m "feat(landing): implement FreedomMatrix, AboutSection, and LandingFooter"
```

---

### Task 5: Integrasi Landing Page ke `frontend/src/app/page.tsx` & Build Verification

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `LandingNavbar`, `HeroPlayground`, `PersonaSolutions`, `FreedomMatrix`, `AboutSection`, `LandingFooter`
- Produces: Complete root landing page at `/`

- [ ] **Step 1: Ganti isi `frontend/src/app/page.tsx` dengan Landing Page utuh**

Ganti `frontend/src/app/page.tsx`:
```tsx
import React from 'react'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { HeroPlayground } from '@/components/landing/hero-playground'
import { PersonaSolutions } from '@/components/landing/persona-solutions'
import { FreedomMatrix } from '@/components/landing/freedom-matrix'
import { AboutSection } from '@/components/landing/about-section'
import { LandingFooter } from '@/components/landing/landing-footer'

export const metadata = {
  title: 'TaskFlowy — Bebas Jadwalkan Apa Saja. Text-to-Gantt Instan Tanpa Login',
  description: 'Ubah catatan rencana kerja mentah menjadi linimasa Gantt chart rapi dalam detik. Solusi bebas dan fleksibel untuk pelaku UMKM dan Project Manager.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-text-primary flex flex-col selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />
      <main className="flex-1">
        <HeroPlayground />
        <PersonaSolutions />
        <FreedomMatrix />
        <AboutSection />
      </main>
      <LandingFooter />
    </div>
  )
}
```

- [ ] **Step 2: Jalankan build dan linting aplikasi**

Run: `npm run lint` dan `npm run build` (dari folder `frontend`)
Expected: Build sukses tanpa type error, route `/` dan `/app` ter-generate dengan benar.

- [ ] **Step 3: Commit perubahan Task 5**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(landing): assemble public landing page at root route"
```

---

## Verification Plan

### Automated Tests
```bash
cd frontend
npx tsx scripts/test-routing-build.ts
npx tsx scripts/test-hero-playground.ts
npm run lint
npm run build
```

### Manual Verification
1. **Buka Root URL (`/`)**: Pastikan Landing Page muncul dengan tampilan bersih, navbar sticky, hero dengan headline tajam, dan badge "100% Bebas Tanpa Login".
2. **Uji Live Playground di Hero**:
   - Klik chip "Operasional UMKM", periksa teks dan bar visual ter-render.
   - Edit salah satu baris teks, pastikan bar Gantt mini di sebelah kanan langsung bergeser/melebar secara reaktif.
   - Klik tombol "Buka Teks Ini di Workbench Lengkap". Pastikan browser berpindah ke `/app#state=...` dan teks yang baru diedit langsung muncul di editor workbench!
3. **Uji Persona Switcher (UMKM vs PM)**:
   - Klik tab "Untuk Pelaku UMKM" dan periksa poin masalah serta 4 kartu solusinya.
   - Klik tab "Untuk Project & Product Manager" dan pastikan konten berganti secara instan.
4. **Uji Navigasi & Dark Mode**:
   - Klik ThemeToggle di navbar, periksa transisi warna landing page (latar belakang, kartu, teks) dalam dark & light mode.
   - Klik tombol "Buka Workbench" di navbar untuk memverifikasi perpindahan ke `/app`.
