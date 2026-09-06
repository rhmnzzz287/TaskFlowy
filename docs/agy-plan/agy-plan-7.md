# TaskFlowy English Version & Global Internationalization Plan (Plan 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuka pasar global untuk TaskFlowy dengan menghadirkan dukungan Bahasa Inggris penuh (*English version*) pada Landing Page publik dan Workbench aplikasi, didukung arsitektur i18n tipe-aman (*type-safe*) yang ringan, zero-dependency, pergantian instan tanpa reload, serta preset contoh internasional (SMB & Dev Sprint).

**Architecture:**
- **Zero-Dependency Type-Safe i18n Dictionary:** Arsitektur kamus berbasis TypeScript murni (`dict-schema.ts`, `id.ts`, `en.ts`). TypeScript compiler menjamin 100% paritas key antara kamus bahasa Indonesia dan bahasa Inggris — tidak ada teks yang terlewat.
- **Client-Side Reactive Locale Context:** `LocaleProvider` dan hook `useTranslation()` mengelola bahasa aktif (`'id'` | `'en'`) secara reaktif, mendeteksi bahasa bawaan browser pengguna saat kunjungan pertama (`navigator.language`), dan menyimpannya di `localStorage['taskflowy_locale']`.
- **Bilingual Landing Page & Presets:** Seluruh copy di Landing Page (Hero, Live Playground, Persona UMKM/SMB vs PM, Freedom Matrix, About Us, Footer) tersedia dalam bahasa Inggris natural berorientasi konversi. Preset demo Hero otomatis menyesuaikan contoh internasional:
  - *ID:* "🍞 Operasional UMKM" (Bu Siti / Dapur) & "💻 Sprint Tim PM" (Budi / Siti).
  - *EN:* "🍞 SMB Bakery Operations" (Alice / Kitchen) & "💻 Tech Sprint Planning" (Alex / Dev).
- **Dual Language Switcher:** Komponen toggle bahasa kompak `[ 🇮🇩 ID | 🇬🇧 EN ]` disematkan pada navbar Landing Page dan header Workbench di samping `ThemeToggle`.
- **Bilingual Workbench & Profile Hub:** Seluruh tombol aksi workbench (Generate, Export CSV/PNG/SVG, Print PDF, Copy Summary, Bulk Shift) dan modal Workspace Dashboard tampil dalam bahasa yang dipilih.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React.

**Spec:** [PRD.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/PRD.md), [DESIGN.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/DESIGN.md)

## Global Constraints

- **Zero External i18n Libraries:** Dilarang menginstal library berat (seperti `next-intl` atau `react-i18next`). Gunakan React Context dan TypeScript dictionaries murni (< 8 kB overhead).
- **Zero Route Mutation:** Tidak mengubah struktur routing Next.js (tidak memakai subpath `/en` atau `/id` yang rawan mematahkan state hash URL `#state=...`).
- **Instant Language Switch:** Pergantian bahasa wajib instan 0 ms di sisi klien tanpa perlu me-reload halaman browser.
- **Full Parity Guarantee:** Setiap kunci terjemahan di `id.ts` wajib memiliki padanan akurat di `en.ts`.

---

### Task 1: Type-Safe Dictionary Schema & Locale Context

**Files:**
- Create: `frontend/src/lib/i18n/dict-schema.ts`
- Create: `frontend/src/lib/i18n/id.ts`
- Create: `frontend/src/lib/i18n/en.ts`
- Create: `frontend/src/lib/i18n/context.tsx`
- Create: `frontend/scripts/test-i18n-dictionaries.ts`

**Interfaces:**
- Consumes: None (Pure Domain Logic)
- Produces:
  ```typescript
  export type Locale = 'id' | 'en'
  export interface LocaleContextValue {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: TranslationDictionary
  }
  export function LocaleProvider({ children }: { children: React.ReactNode }): JSX.Element
  export function useTranslation(): LocaleContextValue
  ```

- [ ] **Step 1: Tulis script test validasi kelengkapan dictionary i18n**

Buat file `frontend/scripts/test-i18n-dictionaries.ts`:
```typescript
import { idDict } from '../src/lib/i18n/id'
import { enDict } from '../src/lib/i18n/en'

console.log('--- TEST 1: Verifikasi Paritas Key Dictionary (ID vs EN) ---')

function checkKeys(idObj: Record<string, any>, enObj: Record<string, any>, path = '') {
  const idKeys = Object.keys(idObj)
  const enKeys = Object.keys(enObj)

  for (const key of idKeys) {
    const currentPath = path ? `${path}.${key}` : key
    if (!(key in enObj)) {
      console.error(`FAIL: Key "${currentPath}" ada di ID tetapi hilang di EN!`)
      process.exit(1)
    }
    if (typeof idObj[key] === 'object' && idObj[key] !== null) {
      checkKeys(idObj[key], enObj[key], currentPath)
    }
  }

  for (const key of enKeys) {
    const currentPath = path ? `${path}.${key}` : key
    if (!(key in idObj)) {
      console.error(`FAIL: Key "${currentPath}" ada di EN tetapi hilang di ID!`)
      process.exit(1)
    }
  }
}

checkKeys(idDict, enDict)
console.log('✓ 100% paritas key terverifikasi antara id.ts dan en.ts.')
console.log('All i18n dictionary tests passed!')
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (file belum dibuat)**

Run: `npx tsx scripts/test-i18n-dictionaries.ts` (dari folder `frontend`)
Expected: FAIL dengan `Cannot find module '../src/lib/i18n/id'`

- [ ] **Step 3: Buat skema dictionary `frontend/src/lib/i18n/dict-schema.ts`**

Buat file `frontend/src/lib/i18n/dict-schema.ts`:
```typescript
export interface TranslationDictionary {
  navbar: {
    freeBadge: string
    tryLive: string
    solutions: string
    freedom: string
    about: string
    openWorkbench: string
    backToHome: string
  }
  hero: {
    pillBadge: string
    titlePart1: string
    titlePart2: string
    description: string
    tryExample: string
    presetUmkm: string
    presetPm: string
    reset: string
    textTab: string
    tableTab: string
    inputHint: string
    liveParser: string
    tips: string
    timelinePreview: string
    tasksDetected: string
    noTasks: string
    handoffDesc: string
    handoffCta: string
    presetUmkmText: string
    presetPmText: string
  }
  solutions: {
    title: string
    subtitle: string
    tabUmkm: string
    tabPm: string
    umkmBadge: string
    umkmTitle: string
    umkmProblem1: string
    umkmProblem2: string
    umkmQuote: string
    umkmFeature1Title: string
    umkmFeature1Desc: string
    umkmFeature2Title: string
    umkmFeature2Desc: string
    umkmFeature3Title: string
    umkmFeature3Desc: string
    umkmFeature4Title: string
    umkmFeature4Desc: string
    pmBadge: string
    pmTitle: string
    pmProblem1: string
    pmProblem2: string
    pmQuote: string
    pmFeature1Title: string
    pmFeature1Desc: string
    pmFeature2Title: string
    pmFeature2Desc: string
    pmFeature3Title: string
    pmFeature3Desc: string
    pmFeature4Title: string
    pmFeature4Desc: string
  }
  matrix: {
    badge: string
    title: string
    subtitle: string
    colCriteria: string
    colExcel: string
    colJira: string
    rows: Array<{
      criteria: string
      taskflowy: string
      excel: string
      jira: string
      highlight?: boolean
    }>
  }
  about: {
    title: string
    p1: string
    p2: string
    p3: string
  }
  footer: {
    ctaTitle: string
    ctaSubtitle: string
    ctaButton: string
    tagline: string
    copyright: string
  }
  workbench: {
    tasksCount: string
    generateTimeline: string
    generating: string
    generatedSuccess: string
    exportPng: string
    exportSvg: string
    exportCsv: string
    printPdf: string
    copySummary: string
    copied: string
    shareLink: string
    sharedSuccess: string
    bulkShift: string
    myWorkspace: string
    viewGantt: string
    viewTable: string
    viewDependency: string
    zoomIn: string
    zoomOut: string
  }
}
```

- [ ] **Step 4: Buat kamus Bahasa Indonesia `frontend/src/lib/i18n/id.ts`**

Buat file `frontend/src/lib/i18n/id.ts`:
```typescript
import { TranslationDictionary } from './dict-schema'

export const idDict: TranslationDictionary = {
  navbar: {
    freeBadge: '100% Bebas & Tanpa Login',
    tryLive: 'Coba Langsung',
    solutions: 'Untuk UMKM & PM',
    freedom: 'Filosofi Kebebasan',
    about: 'Tentang Kami',
    openWorkbench: 'Buka Workbench',
    backToHome: 'Kembali ke Beranda',
  },
  hero: {
    pillBadge: 'Kebebasan Menjadwalkan Tanpa Batas',
    titlePart1: 'Bebas Jadwalkan Apa Saja.',
    titlePart2: 'Catatan Mentah Jadi Gantt Chart Seketika.',
    description: 'Tinggalkan birokrasi software manajemen proyek yang kaku dan formulir yang berbelit. Cukup tulis rencana kerja Anda layaknya mencatat biasa — TaskFlowy mengubahnya menjadi linimasa visual interaktif dalam hitungan detik.',
    tryExample: 'Coba Contoh Langsung:',
    presetUmkm: '🍞 Operasional UMKM',
    presetPm: '💻 Sprint Tim PM',
    reset: 'Reset',
    textTab: 'Catatan Teks',
    tableTab: 'Tabel Rapi',
    inputHint: 'Ketik teks baris bebas (Task | PIC | Tanggal | Durasi)',
    liveParser: 'Live Parser',
    tips: '💡 Tips: Coba ubah nama penanggung jawab atau ketik "after Desain" untuk melihat bar bergeser otomatis!',
    timelinePreview: 'Preview Linimasa Visual',
    tasksDetected: 'tugas terdeteksi',
    noTasks: 'Belum ada baris task yang valid. Ketik di sebelah kiri untuk melihat linimasa.',
    handoffDesc: 'Suka hasilnya? Lanjutkan edit durasi, drag & drop, atau ekspor CSV di workbench.',
    handoffCta: 'Buka Teks Ini di Workbench Lengkap',
    presetUmkmText: `Beli Bahan Baku | Bu Siti | besok | 2 hari
Produksi Kue Kering | Tim Dapur | after Beli Bahan Baku | 4 hari
Packaging & Label | Mas Doni | after Produksi Kue Kering | 2 hari
Pengiriman Pelanggan | Kurir Toko | after Packaging & Label | 1 hari`,
    presetPmText: `Desain Wireframe UI | Designer | 10 Sep 2026 | 3 hari
Backend API & DB | Budi | 12 Sep 2026 | 5 hari
Integrasi Frontend | Siti | after Backend API & DB | 4 hari
QA Regression Test | Tim QA | after Integrasi Frontend | 2 hari`,
  },
  solutions: {
    title: 'Dirancang untuk Mereka yang Menghargai Waktu',
    subtitle: 'Apakah Anda pemilik bisnis lokal yang sibuk atau manajer proyek yang mengejar deadline rilis, TaskFlowy memangkas waktu perencanaan hingga 90%.',
    tabUmkm: 'Untuk Pelaku UMKM & Bisnis Lokal',
    tabPm: 'Untuk Project & Product Manager',
    umkmBadge: 'Solusi Usaha Mikro, Kecil, & Menengah',
    umkmTitle: 'Kendalikan Produksi & Pesanan Tanpa Pusing Software Mahal',
    umkmProblem1: 'Jira atau Asana terlalu rumit, penuh istilah teknis, dan menuntut biaya langganan per karyawan.',
    umkmProblem2: 'Spreadsheet Excel gampang rusak rumusnya saat Anda ingin menggeser tanggal pesanan pelanggan.',
    umkmQuote: '"Saya tidak punya waktu berjam-jam belajar software baru. Saya cuma ingin tahu siapa yang belanja bahan, siapa yang masak, dan kapan pesanan siap kirim."',
    umkmFeature1Title: '100% Gratis & Tanpa Akun',
    umkmFeature1Desc: 'Buka di browser toko atau kasir, ketik jadwal, langsung jadi tanpa harus mendaftar.',
    umkmFeature2Title: 'Cetak Jadwal 1-Klik',
    umkmFeature2Desc: 'Format cetak A4 landscape rapi siap print dan tempel di dinding dapur atau papan toko.',
    umkmFeature3Title: 'Kirim Ringkasan WhatsApp',
    umkmFeature3Desc: 'Salin daftar tugas ber-emoji rapi langsung ke grup WhatsApp karyawan toko.',
    umkmFeature4Title: 'Ekspor ke Excel Bebas Rusak',
    umkmFeature4Desc: 'Unduh ke format CSV standar jika pembukuan Anda membutuhkan arsip spreadsheet.',
    pmBadge: 'Solusi Project & Product Manager',
    pmTitle: 'Dari Notulen Rapat Jadi Gantt Chart Siap Stakeholder',
    pmProblem1: 'Notulen rapat di Slack atau Google Docs membutuhkan waktu manual untuk diubah menjadi Gantt chart.',
    pmProblem2: 'Klien dan eksekutif butuh linimasa visual bersih, bukan board Kanban yang berantakan dengan 50 kartu.',
    pmQuote: '"Meeting baru selesai jam 1:30 siang dan saya harus presentasi linimasa ke Direksi jam 2:00. TaskFlowy menyelamatkan saya hanya dengan copy-paste notulen."',
    pmFeature1Title: 'Kalkulasi Jalur Kritis (Critical Path)',
    pmFeature1Desc: 'Sistem otomatis mendeteksi task mana yang menjadi penentu utama tanggal rilis proyek.',
    pmFeature2Title: 'Ekspor Gambar Presentasi (PNG & SVG)',
    pmFeature2Desc: 'Unduh grafik Gantt beresolusi tinggi langsung tempel ke slide deck pitch atau laporan klien.',
    pmFeature3Title: 'Bulk Shift Dates (Geser Masal)',
    pmFeature3Desc: 'Tanggal kickoff mundur seminggu? Geser seluruh linimasa sekaligus secara proporsional dalam 1 klik.',
    pmFeature4Title: 'Sintaks Dependensi Alami',
    pmFeature4Desc: 'Cukup ketik "after Desain" atau "after Backend" tanpa harus menarik garis koneksi rumit secara manual.',
  },
  matrix: {
    badge: 'Filosofi Produk',
    title: 'Menjual Kebebasan dalam Penjadwalan',
    subtitle: 'Kami percaya membuat jadwal tidak seharusnya terasa seperti pekerjaan administratif baru.',
    colCriteria: 'Kriteria',
    colExcel: 'Excel / Spreadsheet',
    colJira: 'Jira / Asana',
    rows: [
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
    ],
  },
  about: {
    title: 'Mengapa Kami Membangun TaskFlowy?',
    p1: 'TaskFlowy lahir dari rasa frustrasi terhadap tools produktivitas modern yang justru membuat kita semakin tidak produktif. Sering kali, kita menghabiskan waktu 30 menit hanya untuk mengatur kartu, mengisi formulir tanggal, dan menyesuaikan warna status di aplikasi manajemen proyek yang berat.',
    p2: 'Bagi pemilik usaha kecil dan pengelola tim yang tangkas, hal tersebut adalah pemborosan waktu. Menjadwalkan pekerjaan seharusnya membebaskan pikiran untuk mengeksekusi rencana, bukan membebani kita dengan birokrasi baru.',
    p3: 'Misi kami sederhana: Memberikan Anda alat tercepat, terbebas, dan paling fleksibel untuk mengubah ide di kepala menjadi linimasa nyata — tanpa login, tanpa biaya, dan tanpa komplikasi.',
  },
  footer: {
    ctaTitle: 'Siap Mengatur Jadwal dalam Hitungan Detik?',
    ctaSubtitle: 'Tidak butuh kartu kredit, tidak butuh pendaftaran akun. Langsung buka dan mulai rencanakan.',
    ctaButton: 'Buka TaskFlowy Workbench Sekarang',
    tagline: '— Free & Open Productivity',
    copyright: '© 2026 TaskFlowy. Dibuat dengan kebebasan untuk para pelaku usaha dan tim kerja.',
  },
  workbench: {
    tasksCount: 'tasks',
    generateTimeline: 'Generate Timeline',
    generating: 'Generating…',
    generatedSuccess: 'Timeline Generated!',
    exportPng: 'PNG',
    exportSvg: 'SVG',
    exportCsv: 'CSV',
    printPdf: 'Print PDF',
    copySummary: 'Copy Summary',
    copied: 'Copied!',
    shareLink: 'Share',
    sharedSuccess: 'Tersalin',
    bulkShift: 'Shift Dates',
    myWorkspace: 'Workspace Saya',
    viewGantt: 'Gantt',
    viewTable: 'Tabel',
    viewDependency: 'Dependensi',
    zoomIn: 'Perbesar',
    zoomOut: 'Perkecil',
  },
}
```

- [ ] **Step 5: Buat kamus English `frontend/src/lib/i18n/en.ts`**

Buat file `frontend/src/lib/i18n/en.ts`:
```typescript
import { TranslationDictionary } from './dict-schema'

export const enDict: TranslationDictionary = {
  navbar: {
    freeBadge: '100% Free & No Sign-up',
    tryLive: 'Try Live',
    solutions: 'For SMBs & PMs',
    freedom: 'Freedom Philosophy',
    about: 'About Us',
    openWorkbench: 'Open Workbench',
    backToHome: 'Back to Home',
  },
  hero: {
    pillBadge: 'Unconstrained Scheduling Freedom',
    titlePart1: 'Schedule Anything, Freely.',
    titlePart2: 'Turn Raw Notes into a Gantt Chart in Seconds.',
    description: 'Leave behind rigid project management software and tedious forms. Simply write your plans like regular notes — TaskFlowy transforms them into an interactive visual timeline instantly.',
    tryExample: 'Try a Live Example:',
    presetUmkm: '🍞 SMB Bakery Operations',
    presetPm: '💻 Dev Team Sprint',
    reset: 'Reset',
    textTab: 'Text Notes',
    tableTab: 'Clean Table',
    inputHint: 'Type freeform lines (Task | Assignee | Date | Duration)',
    liveParser: 'Live Parser',
    tips: '💡 Pro-tip: Try changing assignees or type "after Wireframe" to see bars shift automatically!',
    timelinePreview: 'Visual Timeline Preview',
    tasksDetected: 'tasks detected',
    noTasks: 'No valid tasks yet. Type on the left to see the timeline appear.',
    handoffDesc: 'Like the result? Adjust durations, drag & drop, or export CSV in the full workbench.',
    handoffCta: 'Open in Full Workbench',
    presetUmkmText: `Order Ingredients | Alice | tomorrow | 2 days
Bake Cookie Batch | Kitchen Team | after Order Ingredients | 4 days
Packaging & Labeling | Dave | after Bake Cookie Batch | 2 days
Customer Deliveries | Courier | after Packaging & Labeling | 1 day`,
    presetPmText: `UI Wireframes | Designer | 10 Sep 2026 | 3 days
Backend API & DB | Alex | 12 Sep 2026 | 5 days
Frontend Integration | Sarah | after Backend API & DB | 4 days
QA Regression Testing | QA Team | after Frontend Integration | 2 days`,
  },
  solutions: {
    title: 'Engineered for Those Who Value Execution Over Tooling',
    subtitle: 'Whether you are a busy local business operator or a product manager racing toward release day, TaskFlowy cuts planning time by 90%.',
    tabUmkm: 'For Small Businesses & Local Shops',
    tabPm: 'For Project & Product Managers',
    umkmBadge: 'Small & Medium Business Solution',
    umkmTitle: 'Master Production & Orders Without Expensive Software',
    umkmProblem1: 'Jira and Asana are overly complex, full of tech jargon, and demand costly monthly per-user licenses.',
    umkmProblem2: 'Spreadsheets break easily whenever you need to shift client order dates or production schedules.',
    umkmQuote: '"I do not have hours to learn complex software. I just need to know who buys ingredients, who bakes, and when customer orders ship out."',
    umkmFeature1Title: '100% Free & No Sign-up Required',
    umkmFeature1Desc: 'Open on any store or shop counter browser, type your plan, and get a timeline without creating accounts.',
    umkmFeature2Title: '1-Click Printable Schedule',
    umkmFeature2Desc: 'Formatted for clean A4 landscape printing — ready to pin on the kitchen wall or noticeboard.',
    umkmFeature3Title: 'Instant WhatsApp / Slack Summary',
    umkmFeature3Desc: 'Copy a neat, emoji-formatted task breakdown directly into your staff chat groups.',
    umkmFeature4Title: 'Clean Excel-Ready CSV Export',
    umkmFeature4Desc: 'Download clean CSV files whenever your bookkeeping requires spreadsheet records.',
    pmBadge: 'Project & Product Manager Solution',
    pmTitle: 'From Meeting Notes to Stakeholder-Ready Gantt in Seconds',
    pmProblem1: 'Meeting notes scattered across Slack or Docs take tedious manual work to map into Gantt charts.',
    pmProblem2: 'Clients and executives need a crisp visual roadmap, not a cluttered Kanban board with 50 cards.',
    pmQuote: '"Meeting wrapped up at 1:30 PM and I had to present a roadmap to executives at 2:00 PM. TaskFlowy saved me with a simple copy-paste of my raw notes."',
    pmFeature1Title: 'Automatic Critical Path Calculation',
    pmFeature1Desc: 'Instantly highlights the chain of dependent tasks that strictly dictates the project launch date.',
    pmFeature2Title: 'Presentation-Ready Exports (PNG & SVG)',
    pmFeature2Desc: 'Download high-resolution vector charts ready to drop right into pitch decks or client reports.',
    pmFeature3Title: 'Proportional Bulk Date Shifts',
    pmFeature3Desc: 'Kickoff delayed by a week? Shift the entire timeline forward proportionally in one single click.',
    pmFeature4Title: 'Natural Dependency Syntax',
    pmFeature4Desc: 'Simply write "after Design" or "after Backend" without fiddling with manual SVG connector handles.',
  },
  matrix: {
    badge: 'Product Philosophy',
    title: 'Selling Freedom in Task Scheduling',
    subtitle: 'We believe scheduling work should never feel like an additional administrative chore.',
    colCriteria: 'Criteria',
    colExcel: 'Excel / Spreadsheets',
    colJira: 'Jira / Enterprise PM',
    rows: [
      {
        criteria: 'Time from Idea to Timeline',
        taskflowy: '< 30 Seconds (Type notes and done)',
        excel: '15 - 30 Minutes (Formulas & styling)',
        jira: '30 - 60 Minutes (Boards, cards, sprints)',
        highlight: true,
      },
      {
        criteria: 'Input Form Fatigue',
        taskflowy: 'Zero Forms (Natural text lines)',
        excel: 'Prone to broken date formulas',
        jira: 'Mandatory 8–10 form fields per task',
      },
      {
        criteria: 'Cost & Licenses',
        taskflowy: '100% Free Without Limits',
        excel: 'Requires Office / Workspace seat',
        jira: 'Costly monthly subscription per user',
      },
      {
        criteria: 'Data Privacy & Ownership',
        taskflowy: 'Local-First (Stored in your browser)',
        excel: 'Stored in vendor cloud / files',
        jira: 'Locked inside third-party servers',
      },
      {
        criteria: 'Team Distribution',
        taskflowy: '1-Click Chat Summary & A4 PDF',
        excel: 'File sharing / messy screenshots',
        jira: 'Entire team must register & log in',
      },
    ],
  },
  about: {
    title: 'Why Did We Build TaskFlowy?',
    p1: 'TaskFlowy was born from frustration with modern productivity tools that paradoxically make us less productive. Too often, we spend 30 minutes dragging cards, filling date modals, and color-coding status tags on bloated project management suites.',
    p2: 'For small business operators and agile team leads, that is wasted energy. Scheduling work should free your mind to execute ideas, rather than burdening you with new bureaucratic friction.',
    p3: 'Our mission is straightforward: to provide the fastest, freest, and most flexible tool to transform thoughts in your head into actionable visual roadmaps — no login, no paywalls, and no complications.',
  },
  footer: {
    ctaTitle: 'Ready to Plan Your Next Project in Seconds?',
    ctaSubtitle: 'No credit card needed. No account creation. Open and start planning right away.',
    ctaButton: 'Open TaskFlowy Workbench Now',
    tagline: '— Free & Open Productivity',
    copyright: '© 2026 TaskFlowy. Built with freedom for business owners and agile teams worldwide.',
  },
  workbench: {
    tasksCount: 'tasks',
    generateTimeline: 'Generate Timeline',
    generating: 'Generating…',
    generatedSuccess: 'Timeline Generated!',
    exportPng: 'PNG',
    exportSvg: 'SVG',
    exportCsv: 'CSV',
    printPdf: 'Print PDF',
    copySummary: 'Copy Summary',
    copied: 'Copied!',
    shareLink: 'Share',
    sharedSuccess: 'Copied!',
    bulkShift: 'Shift Dates',
    myWorkspace: 'My Workspace',
    viewGantt: 'Gantt',
    viewTable: 'Table',
    viewDependency: 'Dependencies',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
  },
}
```

- [ ] **Step 6: Implementasikan `LocaleContext` dan hook `useTranslation`**

Buat file `frontend/src/lib/i18n/context.tsx`:
```tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { TranslationDictionary } from './dict-schema'
import { idDict } from './id'
import { enDict } from './en'

export type Locale = 'id' | 'en'

const STORAGE_KEY = 'taskflowy_locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationDictionary
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved === 'id' || saved === 'en') {
        setLocaleState(saved)
      } else if (typeof navigator !== 'undefined') {
        // Auto-detect browser preference
        const navLang = navigator.language?.toLowerCase() || ''
        if (navLang.startsWith('en')) {
          setLocaleState('en')
        }
      }
    } catch {
      // fallback
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // ignore
    }
  }, [])

  const t = locale === 'en' ? enDict : idDict

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      locale: 'id',
      setLocale: () => {},
      t: idDict,
    }
  }
  return ctx
}
```

- [ ] **Step 7: Jalankan test verifikasi paritas dictionary**

Run: `npx tsx scripts/test-i18n-dictionaries.ts` (dari folder `frontend`)
Expected: Output `All i18n dictionary tests passed!`

- [ ] **Step 8: Commit perubahan Task 1**

```bash
git add frontend/src/lib/i18n/ frontend/scripts/test-i18n-dictionaries.ts
git commit -m "feat(i18n): create type-safe bilingual dictionaries and LocaleProvider"
```

---

### Task 2: Language Switcher UI Component

**Files:**
- Create: `frontend/src/components/ui/language-switcher.tsx`

**Interfaces:**
- Consumes: `useTranslation` dari `@/lib/i18n/context`
- Produces:
  ```typescript
  export function LanguageSwitcher({ className }: { className?: string }): JSX.Element
  ```

- [ ] **Step 1: Implementasikan komponen `LanguageSwitcher`**

Buat file `frontend/src/components/ui/language-switcher.tsx`:
```tsx
'use client'

import React from 'react'
import { useTranslation, Locale } from '@/lib/i18n/context'
import { Globe } from 'lucide-react'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useTranslation()

  const toggleLocale = () => {
    setLocale(locale === 'id' ? 'en' : 'id')
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`btn-secondary text-[11px] h-7 px-2 gap-1.5 font-semibold transition-all ${className}`}
      title={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      aria-label="Switch Language"
    >
      <Globe size={13} className="text-primary" />
      <span className="uppercase tracking-wider">{locale}</span>
    </button>
  )
}
```

- [ ] **Step 2: Commit perubahan Task 2**

```bash
git add frontend/src/components/ui/language-switcher.tsx
git commit -m "feat(ui): implement LanguageSwitcher toggle component"
```

---

### Task 3: Bilingual Landing Page Integration

**Files:**
- Modify: `frontend/src/components/landing/landing-navbar.tsx`
- Modify: `frontend/src/components/landing/hero-playground.tsx`
- Modify: `frontend/src/components/landing/persona-solutions.tsx`
- Modify: `frontend/src/components/landing/freedom-matrix.tsx`
- Modify: `frontend/src/components/landing/about-section.tsx`
- Modify: `frontend/src/components/landing/landing-footer.tsx`

**Interfaces:**
- Consumes: `useTranslation` dari `@/lib/i18n/context`, `LanguageSwitcher`
- Produces: Fully translated, reactive landing page sections with dynamic English/Indonesian presets.

- [ ] **Step 1: Modifikasi `landing-navbar.tsx`**

Integrasikan `useTranslation()` dan pasang `<LanguageSwitcher />` tepat di samping `<ThemeToggle />`:
```tsx
// Di frontend/src/components/landing/landing-navbar.tsx
import { useTranslation } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

export function LandingNavbar() {
  const { t } = useTranslation()
  // Gunakan t.navbar.freeBadge, t.navbar.tryLive, t.navbar.solutions, t.navbar.openWorkbench
  ...
  <div className="flex items-center gap-2">
    <LanguageSwitcher />
    <ThemeToggle />
    ...
  </div>
}
```

- [ ] **Step 2: Modifikasi `hero-playground.tsx` untuk preset dinamis bilingual**

Di `frontend/src/components/landing/hero-playground.tsx`:
Gunakan `t.hero` untuk seluruh judul, tombol preset, hint, dan teks contoh:
```tsx
const { locale, t } = useTranslation()

// Saat locale berganti, perbarui contoh preset secara cerdas
useEffect(() => {
  setRawText(activePreset === 'umkm' ? t.hero.presetUmkmText : t.hero.presetPmText)
}, [locale, activePreset, t])
```

- [ ] **Step 3: Modifikasi `persona-solutions.tsx`, `freedom-matrix.tsx`, `about-section.tsx`, dan `landing-footer.tsx`**

Gantikan seluruh string hardcoded dengan `t.solutions`, `t.matrix`, `t.about`, dan `t.footer`.

- [ ] **Step 4: Commit perubahan Task 3**

```bash
git add frontend/src/components/landing/
git commit -m "feat(landing): make all landing page components fully bilingual with i18n support"
```

---

### Task 4: Root Provider & Bilingual Workbench Integration

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/app/page.tsx`
- Modify: `frontend/src/components/ui/header-actions-menu.tsx`

**Interfaces:**
- Consumes: `LocaleProvider`
- Produces: Universally available i18n context and bilingual workbench toolbar.

- [ ] **Step 1: Pasang `LocaleProvider` di `frontend/src/app/layout.tsx`**

Bungkus `{children}` di `frontend/src/app/layout.tsx` dengan `<LocaleProvider>`:
```tsx
import { LocaleProvider } from '@/lib/i18n/context'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="...">
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Pasang `<LanguageSwitcher />` dan teks bilingual di `frontend/src/app/app/page.tsx`**

Tambahkan `<LanguageSwitcher />` di top header sebelah `ThemeToggle`, dan ganti label tombol utama dengan `t.workbench.generateTimeline`, `t.workbench.myWorkspace`, dll.

- [ ] **Step 3: Terjemahkan menu ekspor di `header-actions-menu.tsx`**

Gunakan `t.workbench` untuk tooltip dan label menu (PNG, SVG, CSV, Print PDF, Copy Summary, Shift Dates).

- [ ] **Step 4: Commit perubahan Task 4**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/app/page.tsx frontend/src/components/ui/header-actions-menu.tsx
git commit -m "feat(workbench): integrate LocaleProvider at root layout and add LanguageSwitcher to workbench"
```

---

### Task 5: Build Verification & Dual-Locale Test

**Files:**
- Test: `frontend/scripts/test-i18n-dictionaries.ts`
- Test: `frontend/scripts/test-hero-playground.ts`

- [ ] **Step 1: Jalankan seluruh pengujian otomatis**

Run:
```bash
cd frontend
npx tsx scripts/test-i18n-dictionaries.ts
npx tsx scripts/test-hero-playground.ts
npx tsx scripts/test-routing-build.ts
npm run lint
npm run build
```
Expected: Seluruh test pass dan Next.js production build sukses 100%.

- [ ] **Step 2: Commit final Task 5**

```bash
git add .
git commit -m "chore(i18n): complete English internationalization with zero-dependency type-safe dictionary"
```

---

## Verification Plan

### Automated Tests
```bash
cd frontend
npx tsx scripts/test-i18n-dictionaries.ts
npx tsx scripts/test-routing-build.ts
npx tsx scripts/test-hero-playground.ts
npm run lint
npm run build
```

### Manual Verification
1. **Verifikasi Bahasa Default & Deteksi Browser**:
   - Buka `/`. Jika browser berbahasa Inggris, teks otomatis tampil dalam Bahasa Inggris ("Schedule Anything, Freely").
2. **Verifikasi Tombol Switcher Bahasa**:
   - Klik tombol switcher `[ ID / EN ]` di navbar.
   - Periksa bahwa seluruh teks Landing Page berganti seketika (0 ms tanpa reload).
   - Teks pada Hero Playground berganti ke preset internasional ("Order Ingredients | Alice | tomorrow | 2 days").
3. **Verifikasi Handoff Bahasa ke Workbench**:
   - Dalam mode EN, klik "Open in Full Workbench".
   - Periksa workbench di `/app`: tombol header dan menu aksi tampil dalam bahasa Inggris ("Generate Timeline", "Print PDF", "My Workspace").
4. **Verifikasi Penyimpanan Preferensi**:
   - Refresh halaman browser; pastikan pilihan bahasa terakhir tetap tersimpan di `localStorage`.
