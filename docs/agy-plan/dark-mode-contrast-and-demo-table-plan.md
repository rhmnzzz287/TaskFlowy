# TaskFlowy Dark Mode Contrast Overhaul & Dual-Mode Landing Playground Implementation Plan (Plan 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki keterbacaan (*readability*) teks secara global dengan standar kontras WCAG AA (terutama di dark mode), menata ulang kanvas Gantt chart di dark mode agar solid dan bersih tanpa *zebra/checkerboard striping* yang mengganggu, serta meningkatkan Live Demo di Landing Page dengan *dual-mode switcher* (Catatan Teks vs Tabel Interaktif).

**Architecture:**
- **Theme-Aware Primary Token via CSS Variables:** Mengubah token `primary` dari hex statis menjadi variabel CSS dinamis (`--color-primary` dan `--color-primary-hover`). Pada dark mode, warna otomatis bertransformasi menjadi Indigo-400 (`#818CF8`) dengan rasio kontras 5.98:1 (lulus WCAG AA 4.5:1), sedangkan di light mode tetap Indigo-600 (`#4F46E5`).
- **High-Contrast Text Hierarchy:** Menaikkan nilai kecerahan `--text-primary` (`#F1F5F9`) dan `--text-muted` (`#B4C3D7`) di dark mode serta mengeliminasi penggunaan opacity rendah (`text-muted/60`, `text-muted/50`) pada teks fungsional.
- **Unified Obsidian Gantt Canvas:** Menghapus pewarnaan baris selang-seling (`:nth-child(even)`) dan warna *weekend highlight* yang bertabrakan. Menggantinya dengan kanvas solid gelap seragam (`#0B0F19`), garis grid subtil (`rgba(148, 163, 184, 0.08)`), dan weekend wash lembut (`rgba(255, 255, 255, 0.02)`).
- **Dual-Mode Live Playground (Text & Table View):** Menambahkan toggle `[ 📝 Catatan Teks ]` vs `[ 📊 Tabel Interaktif ]` pada input sisi kiri Live Demo di Landing Page, membuktikan kepada UMKM dan PM bahwa TaskFlowy fleksibel diinput sebagai teks maupun dilihat sebagai tabel terstruktur.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React.

**Spec:** [PRD.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/PRD.md), [DESIGN.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/DESIGN.md)

## Global Constraints

- **WCAG AA Compliance:** Setiap kombinasi warna teks normal terhadap warna background wajib memenuhi rasio kontras minimal 4.5:1, dan 3.0:1 untuk teks besar/badge.
- **Zero Flash of Unstyled Canvas:** Styling Gantt chart di dark mode harus menggunakan deklarasi CSS global berbasis `.dark` tanpa manipulasi DOM runtime inline yang lambat.
- **Synchronized Dual-Mode State:** Perubahan pada mode Catatan Teks harus otomatis menyinkronkan data di mode Tabel, dan sebaliknya, dengan URL hash state handoff tetap terjaga.
- **Performance First:** Tabel mini pada landing page tidak boleh memicu re-render berat; gunakan lightweight rendering murni.

---

### Task 1: Theme-Aware Primary Token & Global Dark Mode Contrast

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/app/globals.css`
- Create: `frontend/scripts/test-contrast-ratios.ts`

**Interfaces:**
- Consumes: CSS Variables `:root` dan `.dark`
- Produces: Dynamic `primary`, `text-primary`, and `muted` color tokens compliant with WCAG AA.

- [ ] **Step 1: Tulis script otomatis verifikasi rasio kontras WCAG AA**

Buat file `frontend/scripts/test-contrast-ratios.ts`:
```typescript
function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = luminance(...rgb1)
  const lum2 = luminance(...rgb2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

console.log('--- TEST 1: Dark Mode Primary Contrast ---')
const darkBg: [number, number, number] = [15, 23, 42] // #0F172A
const darkPrimary: [number, number, number] = [129, 140 248] // #818CF8 (Indigo-400)
const ratioPrimary = contrastRatio(darkBg, darkPrimary)
console.log(`Dark Mode Primary Ratio: ${ratioPrimary.toFixed(2)}:1`)
if (ratioPrimary < 4.5) {
  console.error(`FAIL: Primary token under 4.5:1 (${ratioPrimary.toFixed(2)})`)
  process.exit(1)
}
console.log('✓ Dark Primary token meets WCAG AA (>= 4.5:1).')

console.log('--- TEST 2: Dark Mode Muted Text Contrast ---')
const darkMuted: [number, number, number] = [180, 195, 215] // #B4C3D7
const ratioMuted = contrastRatio(darkBg, darkMuted)
console.log(`Dark Mode Muted Text Ratio: ${ratioMuted.toFixed(2)}:1`)
if (ratioMuted < 4.5) {
  console.error(`FAIL: Muted text under 4.5:1 (${ratioMuted.toFixed(2)})`)
  process.exit(1)
}
console.log('✓ Dark Muted text meets WCAG AA (>= 4.5:1).')
console.log('All contrast tests passed!')
```

- [ ] **Step 2: Jalankan test kontras untuk memastikan kriteria terpenuhi**

Run: `npx tsx scripts/test-contrast-ratios.ts` (dari folder `frontend`)
Expected: Output `All contrast tests passed!`

- [ ] **Step 3: Update `frontend/tailwind.config.js` untuk menggunakan CSS variable pada `primary`**

Di `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-background) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        'surface-hi': 'rgb(var(--bg-surface-hi) / <alpha-value>)',
        'surface-dim': 'rgb(var(--bg-surface-dim) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-dim': 'rgb(var(--text-dim) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        secondary: '#0D9488',
        critical: '#EA580C',
        milestone: '#7C3AED',
        completed: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Update CSS Variables pada `frontend/src/app/globals.css`**

Perbarui blok `:root` dan `.dark` di `frontend/src/app/globals.css`:
```css
@layer base {
  :root {
    /* Light theme — RGB channel triplets */
    --bg-background: 248 250 252;
    --bg-surface: 255 255 255;
    --bg-surface-hi: 241 245 249;
    --bg-surface-dim: 226 232 240;
    --border: 203 213 225;
    --text-primary: 15 23 42;
    --text-dim: 51 65 85;
    --text-muted: 100 116 139;
    --color-primary: 79 70 229;        /* #4F46E5 Indigo-600 */
    --color-primary-hover: 99 102 241;  /* #6366F1 Indigo-500 */
    color-scheme: light;
  }

  .dark {
    /* Dark theme — tuned for high contrast & zero eye-strain */
    --bg-background: 11 15 25;         /* #0B0F19 Deep Obsidian */
    --bg-surface: 20 27 45;            /* #141B2D Dark Slate */
    --bg-surface-hi: 30 41 59;          /* #1E293B Slate-800 */
    --bg-surface-dim: 15 23 42;         /* #0F172A Slate-900 */
    --border: 45 58 80;                /* #2D3A50 Clean Border */
    --text-primary: 241 245 249;       /* #F1F5F9 Slate-100 (Crisp & White) */
    --text-dim: 226 232 240;           /* #E2E8F0 Slate-200 */
    --text-muted: 180 195 215;         /* #B4C3D7 High-contrast muted */
    --color-primary: 129 140 248;      /* #818CF8 Indigo-400 (5.98:1 Contrast) */
    --color-primary-hover: 165 180 252;/* #A5B4FC Indigo-300 */
    color-scheme: dark;
  }
...
```

- [ ] **Step 5: Commit perubahan Task 1**

```bash
git add frontend/tailwind.config.js frontend/src/app/globals.css frontend/scripts/test-contrast-ratios.ts
git commit -m "feat(theme): establish theme-aware primary token and high-contrast dark mode variables"
```

---

### Task 2: Gantt Chart Dark Mode Canvas Overhaul

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/components/gantt-board/gantt-board.tsx`

**Interfaces:**
- Consumes: SVG classes Frappe Gantt (`.grid-row`, `.row-line`, `.tick`, `--g-weekend-highlight-color`, dll)
- Produces: Clean, uniform dark canvas without zebra stripes or checkerboard artifacts.

- [ ] **Step 1: Perbarui styling Gantt SVG di `frontend/src/app/globals.css`**

Hapus aturan striping selang-seling di dark mode dan terapkan kanvas solid:
```css
/* ============================================================
   Gantt SVG palette — Unified Solid Dark Canvas
   ============================================================ */
.gantt {
  --font-family: 'Inter', sans-serif;
  border: none !important;
}

.gantt .grid-background { fill: none !important; pointer-events: none; }
.gantt-container .hide { display: none !important; }

/* Light mode keeps subtle zebra striping */
html:not(.dark) .gantt .grid-row { fill: rgb(var(--bg-background)) !important; }
html:not(.dark) .gantt .grid-row:nth-child(even) { fill: rgb(var(--bg-surface-hi)) !important; }
html:not(.dark) .gantt .row-line { stroke: rgb(var(--border)) !important; }
html:not(.dark) .gantt .tick { stroke: rgb(var(--border)) !important; }

/* Dark mode uses unified obsidian canvas — NO zebra stripes, NO checkerboards */
.dark .gantt .grid-row { fill: #0B0F19 !important; }
.dark .gantt .grid-row:nth-child(even) { fill: #0B0F19 !important; }
.dark .gantt .row-line { stroke: rgba(148, 163, 184, 0.08) !important; }
.dark .gantt .tick { stroke: rgba(148, 163, 184, 0.08) !important; }

.gantt .arrow { stroke: rgb(var(--text-muted)) !important; fill: none !important; }
.dark .gantt .arrow { stroke: #94A3B8 !important; }

.gantt .bar-label, .gantt .bar-label.big { fill: #F8FAFC !important; font-size: 11px !important; font-weight: 600; }
html:not(.dark) .gantt .bar-label.big { fill: #0f172a !important; }
html:not(.dark) .show-critical .gantt .bar-wrapper.bar-critical .bar-label { fill: #9a3412 !important; }

.gantt .lower-text, .gantt .upper-text, .gantt-container .lower-text, .gantt-container .upper-text { 
  fill: rgb(var(--text-muted)) !important; 
  color: rgb(var(--text-muted)) !important; 
  font-size: 10px !important; 
  font-weight: 600; 
  letter-spacing: 0.05em; 
}
.dark .gantt .lower-text, .dark .gantt .upper-text { fill: #CBD5E1 !important; color: #CBD5E1 !important; }

.gantt-container .side-header { display: none !important; }

/* Dark mode Frappe CSS variables mapping */
.dark {
  --g-header-background: #141B2D;
  --g-text-dark: #F1F5F9;
  --g-text-muted: #94A3B8;
  --g-border-color: rgba(148, 163, 184, 0.12);
  --g-row-border-color: rgba(148, 163, 184, 0.08);
  --g-arrow-color: #94A3B8;
  --g-weekend-highlight-color: rgba(255, 255, 255, 0.02); /* Soft transparent wash */
  --g-row-color: #0B0F19;
}
```

- [ ] **Step 2: Sesuaikan wrapper Gantt di `frontend/src/components/gantt-board/gantt-board.tsx`**

Pastikan container Gantt menyatu dengan background obsidian solid:
```tsx
// Di frontend/src/components/gantt-board/gantt-board.tsx line 269:
return (
  <div className="flex-1 bg-surface-dim dark:bg-[#0B0F19] rounded-none border-none overflow-hidden flex flex-col min-h-0">
    <div
      ref={scrollRef}
      className={`gantt-wrapper flex-1 overflow-hidden relative${showCritical ? ' show-critical' : ''}`}
      style={{ minHeight: '280px' }}
    >
      <div ref={containerRef} />
    </div>
  </div>
)
```

- [ ] **Step 3: Commit perubahan Task 2**

```bash
git add frontend/src/app/globals.css frontend/src/components/gantt-board/gantt-board.tsx
git commit -m "fix(gantt): eliminate dark mode zebra checkerboard and unify solid obsidian canvas"
```

---

### Task 3: Dual-Mode In-Hero Playground (Text & Table View)

**Files:**
- Modify: `frontend/src/components/landing/hero-playground.tsx`
- Test: `frontend/scripts/test-hero-playground.ts`

**Interfaces:**
- Consumes: `parseRawText`, `rowsToRawText` dari `@/lib/format/raw-text`, `parseRows` dari `@/lib/parser/row-parser`
- Produces: Dual-mode input switcher (`[ 📝 Catatan Teks ]` vs `[ 📊 Tabel Interaktif ]`) in `HeroPlayground`.

- [ ] **Step 1: Modifikasi `HeroPlayground` untuk menambahkan mode input Tabel**

Di `frontend/src/components/landing/hero-playground.tsx`:
1. Tambahkan state `inputView: 'text' | 'table'`.
2. Saat mode `'table'`, render tabel mini berpenampilan bersih di mana pengunjung dapat melihat kolom: **Nama Tugas**, **PIC (Assignee)**, **Tanggal Mulai**, dan **Durasi**.
3. Sediakan input inline langsung pada baris tabel yang saat diedit otomatis merefleksikan perubahan ke raw text dan mini-Gantt.
4. Kode integrasi:
```tsx
const [inputView, setInputView] = useState<'text' | 'table'>('text')

// Fungsi update baris tabel mini secara langsung
const handleUpdateTableRow = (index: number, field: keyof ParseRowState, value: string) => {
  const currentRows = parseRawText(rawText)
  if (currentRows[index]) {
    currentRows[index][field] = value
    setRawText(rowsToRawText(currentRows))
  }
}
```
5. Render tab switcher di atas area input:
```tsx
<div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface border border-border">
  <button
    type="button"
    onClick={() => setInputView('text')}
    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
      inputView === 'text' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-text-primary'
    }`}
  >
    <FileText size={12} />
    <span>Catatan Teks</span>
  </button>
  <button
    type="button"
    onClick={() => setInputView('table')}
    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
      inputView === 'table' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-text-primary'
    }`}
  >
    <Table2 size={12} />
    <span>Tabel Rapi</span>
  </button>
</div>
```
6. Render tampilan tabel interaktif saat `inputView === 'table'`.

- [ ] **Step 2: Jalankan test verifikasi parser playground**

Run: `npx tsx scripts/test-hero-playground.ts` (dari folder `frontend`)
Expected: Output `All hero playground tests passed!`

- [ ] **Step 3: Commit perubahan Task 3**

```bash
git add frontend/src/components/landing/hero-playground.tsx
git commit -m "feat(landing): add dual-mode switcher (text & table view) to hero playground"
```

---

### Task 4: UI Text Readability & Badge Audit across Components

**Files:**
- Modify: `frontend/src/components/landing/persona-solutions.tsx`
- Modify: `frontend/src/components/landing/freedom-matrix.tsx`
- Modify: `frontend/src/components/profile/profile-card.tsx`
- Modify: `frontend/src/components/task-input/row-editor.tsx`

**Interfaces:**
- Consumes: Theme tokens
- Produces: Crisp, readable typography across all UI sections without low-contrast opacity traps.

- [ ] **Step 1: Audit & perbaiki kontras badge dan teks di `persona-solutions.tsx`**

Ganti `text-rose-600 dark:text-rose-400` dan teks muted agar tetap tajam di latar gelap. Pastikan kutipan italic menggunakan `text-text-primary font-medium` bukan muted gelap.

- [ ] **Step 2: Audit & perbaiki kontras tabel di `freedom-matrix.tsx`**

Pastikan kolom TaskFlowy menggunakan `text-primary bg-primary/10` dengan teks kontras tinggi (Indigo-400 di dark mode), dan teks alternatif (Excel & Jira) menggunakan `text-text-dim` yang jelas terbaca.

- [ ] **Step 3: Audit & perbaiki kontras di `profile-card.tsx`**

Ubah badge PIC:
```tsx
<span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold border border-primary/20">
  PIC: {profile.defaultAssignee}
</span>
```
Pastikan 3 kartu metrik menggunakan label teks `text-xs font-medium text-text-dim` bukan muted pudar.

- [ ] **Step 4: Commit perubahan Task 4**

```bash
git add frontend/src/components/landing/persona-solutions.tsx frontend/src/components/landing/freedom-matrix.tsx frontend/src/components/profile/profile-card.tsx
git commit -m "style(contrast): polish text hierarchy, badges, and readability across landing and profile components"
```

---

### Task 5: Build Verification & Contrast Proof

**Files:**
- Test: `frontend/scripts/test-contrast-ratios.ts`

- [ ] **Step 1: Jalankan seluruh test suite otomatis**

Run:
```bash
cd frontend
npx tsx scripts/test-contrast-ratios.ts
npx tsx scripts/test-routing-build.ts
npx tsx scripts/test-hero-playground.ts
npm run lint
npm run build
```
Expected: Seluruh test pass dan `npm run build` sukses 100%.

- [ ] **Step 2: Commit perubahan final Task 5**

```bash
git add .
git commit -m "chore: complete dark mode contrast overhaul and live demo table enhancement"
```

---

## Verification Plan

### Automated Tests
```bash
cd frontend
npx tsx scripts/test-contrast-ratios.ts
npx tsx scripts/test-routing-build.ts
npx tsx scripts/test-hero-playground.ts
npm run lint
npm run build
```

### Manual Verification
1. **Verifikasi Dark Mode Text Contrast**:
   - Buka `/` dan `/app`, aktifkan Dark Mode via `ThemeToggle`.
   - Periksa seluruh badge (seperti "100% Bebas Tanpa Login", "PIC: ...", dan "Live Parser"): teks ungu/indigo kini terang dan mudah dibaca tanpa menyipitkan mata.
   - Periksa teks deskripsi sekunder (*muted text*): teks berwarna abu-abu terang kontras tinggi yang nyaman di mata.
2. **Verifikasi Gantt Chart di Dark Mode (`/app`)**:
   - Buka `/app` di Dark Mode.
   - Periksa latar belakang Gantt chart: seluruh baris kini memiliki warna obsidian solid seragam `#0B0F19`.
   - Tidak ada lagi garis zebra selang-seling yang mencolok maupun efek kotak papan catur pada kolom weekend. Garis pembatas terlihat tipis, halus, dan elegan.
3. **Verifikasi Dual-Mode Live Demo di Landing Page (`/`)**:
   - Di section Hero, klik tombol toggle `[ 📊 Tabel Rapi ]`.
   - Pastikan input berubah menjadi tabel berkolom rapi (Nama Tugas, PIC, Mulai, Durasi).
   - Edit salah satu tanggal atau PIC di dalam tabel, pastikan mini-Gantt di sebelah kanan langsung bergeser reaktif.
   - Klik kembali `[ 📝 Catatan Teks ]`, pastikan teks tetap sinkron dengan perubahan tabel.
