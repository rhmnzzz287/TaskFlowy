# TaskFlowy Gmail Team Reminders & Collaborative Dashboard Plan (Plan 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memungkinkan pemilik proyek (*Project Owner*) mengirimkan pengingat tugas dan permintaan update langsung ke Gmail anggota tim yang ditugaskan, didukung ekspansi syntax parser email, tab baru Dashboard "Tim & Pengingat", transport email gratis via Gmail SMTP (Nodemailer) dengan fallback interaktif, serta endpoint cron penjadwalan otomatis.

**Architecture:**
- **Email-Aware Assignee Parser:** Modul ekstraksi cerdas pada `assignee-parser.ts` untuk memisahkan nama display dan alamat email (mendukung format `Nama <email@gmail.com>`, `Nama (email@gmail.com)`, dan email murni).
- **Backend Email Transport Layer:** Next.js App Router API endpoint (`/api/reminders/send`) bertenaga `nodemailer` yang terhubung ke Gmail SMTP (Google App Password). Menyertakan validasi payload ketat, template HTML email responsif dan kontras tinggi (anti-slop standard), serta *graceful fallback* ke link Gmail compose jika environment belum terkonfigurasi.
- **Enhanced Dashboard (Tab Tim & Pengingat):** Penambahan tab ketiga pada `ProfileDashboardModal` yang mengagregasi seluruh anggota tim aktif, menampilkan email, ringkasan beban tugas, deadline terdekat, riwayat pengiriman email, dan tombol aksi instan `[ Minta Update / Kirim Reminder ]` dengan modal pesan kustom.
- **Bilingual & Anti-Slop Strictness:** Seluruh teks antarmuka terdaftar di `dict-schema.ts`, `id.ts`, dan `en.ts` tanpa karakter em dash (`—`), berdesain elegan bersudut tegas (`rounded-md`), dan memenuhi WCAG AA.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Nodemailer, Lucide React.

**Spec:** [2026-09-06-gmail-team-reminder-design.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/docs/superpowers/specs/2026-09-06-gmail-team-reminder-design.md)

---

### Task 1: Assignee Email Parser & Schema Extension

**Files:**
- Create: `frontend/src/lib/parser/assignee-parser.ts`
- Modify: `frontend/src/lib/schema.ts`
- Modify: `frontend/src/lib/parser/row-parser.ts`
- Create: `frontend/scripts/test-assignee-parser.ts`

- [ ] **Step 1: Tulis unit test untuk parser email anggota tim**

Buat file `frontend/scripts/test-assignee-parser.ts`:
```typescript
import { parseAssigneeField } from '../src/lib/parser/assignee-parser'

console.log('--- TEST 1: Parsing Berbagai Format Assignee ---')

const case1 = parseAssigneeField('Budi <budi@gmail.com>')
if (case1.name !== 'Budi' || case1.email !== 'budi@gmail.com') {
  console.error('FAIL: case1 gagal diekstrak', case1)
  process.exit(1)
}
console.log('✓ Format "Budi <budi@gmail.com>" sukses.')

const case2 = parseAssigneeField('Siti (siti@company.org)')
if (case2.name !== 'Siti' || case2.email !== 'siti@company.org') {
  console.error('FAIL: case2 gagal diekstrak', case2)
  process.exit(1)
}
console.log('✓ Format "Siti (siti@company.org)" sukses.')

const case3 = parseAssigneeField('devops@cloud.net')
if (case3.name !== 'devops' || case3.email !== 'devops@cloud.net') {
  console.error('FAIL: case3 gagal diekstrak', case3)
  process.exit(1)
}
console.log('✓ Format "devops@cloud.net" sukses.')

const case4 = parseAssigneeField('@Rian Pratama')
if (case4.name !== 'Rian Pratama' || case4.email !== null) {
  console.error('FAIL: case4 gagal diekstrak', case4)
  process.exit(1)
}
console.log('✓ Format biasa "@Rian Pratama" tetap terjaga tanpa email.')

console.log('All assignee parser tests passed!')
```

- [ ] **Step 2: Jalankan test dan pastikan gagal sebelum implementasi**

Run: `npx tsx scripts/test-assignee-parser.ts` (dari folder `frontend`)

- [ ] **Step 3: Buat modul `frontend/src/lib/parser/assignee-parser.ts`**

Implementasikan fungsi parsing regex yang aman dan toleran:
```typescript
export interface ParsedAssignee {
  name: string
  email: string | null
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

export function parseAssigneeField(raw: string | null | undefined): ParsedAssignee {
  if (!raw || raw.trim() === '') {
    return { name: '', email: null }
  }

  const clean = raw.trim().replace(/^@/, '')
  const emailMatch = clean.match(EMAIL_REGEX)
  const email = emailMatch ? emailMatch[0].toLowerCase() : null

  let name = clean
  if (email) {
    name = clean
      .replace(EMAIL_REGEX, '')
      .replace(/[<>()[\]]/g, '')
      .trim()
    if (!name) {
      name = email.split('@')[0]
    }
  }

  return { name, email }
}
```

- [ ] **Step 4: Integrasikan ke `frontend/src/lib/schema.ts` dan `frontend/src/lib/parser/row-parser.ts`**

Tambahkan `assigneeEmail?: string | null` ke tipe `TimelineTask`, dan gunakan `parseAssigneeField` di `parseRow()`.

- [ ] **Step 5: Jalankan test dan commit Task 1**

Run: `npx tsx scripts/test-assignee-parser.ts`
```bash
git add frontend/src/lib/parser/assignee-parser.ts frontend/src/lib/schema.ts frontend/src/lib/parser/row-parser.ts frontend/scripts/test-assignee-parser.ts
git commit -m "feat(parser): add email-aware assignee parser with zero-regression unit tests"
```

---

### Task 2: Backend API & Nodemailer Email Transport

**Files:**
- Create: `frontend/src/lib/email/email-template.ts`
- Create: `frontend/src/lib/email/transporter.ts`
- Create: `frontend/src/app/api/reminders/send/route.ts`
- Create: `frontend/scripts/test-email-payload.ts`

- [ ] **Step 1: Pasang paket `nodemailer` dan `@types/nodemailer`**

Run: `npm install nodemailer && npm install -D @types/nodemailer` (dari folder `frontend`)

- [ ] **Step 2: Buat template generator email di `frontend/src/lib/email/email-template.ts`**

Rancang template email HTML bersih, berorientasi tindakan, tanpa elemen slop AI:
- Header nama proyek dan identitas pengirim (Project Owner).
- Highlight nama tugas dan sisa hari menuju tenggat waktu.
- Tombol aksi jelas: "Buka Linimasa di TaskFlowy".
- Footer teks minimalis tanpa spambot link.

- [ ] **Step 3: Buat transporter SMTP di `frontend/src/lib/email/transporter.ts`**

Kelola koneksi pool Gmail SMTP menggunakan `GMAIL_USER` dan `GMAIL_APP_PASSWORD`. Sertakan pengecekan kredensial yang informatif.

- [ ] **Step 4: Buat endpoint Next.js API `frontend/src/app/api/reminders/send/route.ts`**

Validasi payload request (nama pemilik, email tujuan, nama tugas, tanggal deadline). Tangani pengiriman email atau return fallback URL jika kredensial SMTP belum diatur.

- [ ] **Step 5: Tulis script pengujian payload `frontend/scripts/test-email-payload.ts`**

Verifikasi bahwa validasi request menolak email tidak valid dan merespons format JSON yang konsisten.

- [ ] **Step 6: Commit Task 2**

```bash
git add frontend/src/lib/email/ frontend/src/app/api/reminders/send/ frontend/scripts/test-email-payload.ts
git commit -m "feat(api): create Nodemailer Gmail transport and send reminder endpoint"
```

---

### Task 3: Dashboard Tab "Tim & Pengingat" (`TeamTab`)

**Files:**
- Create: `frontend/src/components/profile/team-tab.tsx`
- Create: `frontend/src/components/profile/send-reminder-modal.tsx`
- Modify: `frontend/src/components/profile/profile-dashboard-modal.tsx`
- Modify: `frontend/src/lib/i18n/dict-schema.ts`
- Modify: `frontend/src/lib/i18n/id.ts`
- Modify: `frontend/src/lib/i18n/en.ts`

- [ ] **Step 1: Perbarui dictionary i18n (`dict-schema.ts`, `id.ts`, `en.ts`)**

Tambahkan section `team` dengan terjemahan bilingual:
- `tabTitle`: "Tim & Pengingat" / "Team & Reminders"
- `membersCount`: "anggota terdaftar" / "registered members"
- `sendReminder`: "Kirim Pengingat" / "Send Reminder"
- `requestUpdate`: "Minta Update" / "Request Update"
- `notePlaceholder`: "Tulis catatan tambahan untuk anggota tim..." / "Add a custom note for your team member..."
- `statusSent`: "Terkirim" / "Sent"
- `statusPending`: "Menunggu" / "Pending"

- [ ] **Step 2: Buat komponen `SendReminderModal`**

Modal konfirmasi sebelum email dikirim:
- Menampilkan penerima (`budi@gmail.com`), nama tugas, dan sisa hari.
- Textarea opsional untuk catatan dari Project Owner.
- Tombol aksi kirim dengan feedback loading dan status sukses.

- [ ] **Step 3: Buat komponen `TeamTab`**

- Mengagregasi seluruh task dari workspace aktif berdasarkan nama dan email PIC.
- Menampilkan kartu/tabel anggota dengan daftar tugas masing-masing.
- Tombol aksi per baris tugas untuk membuka `SendReminderModal`.
- Riwayat log notifikasi yang tersimpan di `localStorage`.

- [ ] **Step 4: Pasang `TeamTab` ke dalam `ProfileDashboardModal`**

Perbarui navigasi tab modal menjadi 3 pilihan:
`[ Proyek Saya | Tugas Saya | Tim & Pengingat ]`

- [ ] **Step 5: Commit Task 3**

```bash
git add frontend/src/components/profile/ frontend/src/lib/i18n/
git commit -m "feat(ui): add Team & Reminders tab and reminder modal to dashboard"
```

---

### Task 4: Automated Scheduled Cron Endpoint (`/api/reminders/cron`)

**Files:**
- Create: `frontend/src/app/api/reminders/cron/route.ts`
- Create: `frontend/scripts/test-cron-endpoint.ts`

- [ ] **Step 1: Buat route handler `/api/reminders/cron`**

- Memeriksa header `Authorization: Bearer <CRON_SECRET>` untuk keamanan.
- Menerima daftar task yang akan diperiksa tanggal tenggatnya (atau data workspace).
- Mengirimkan pengingat otomatis untuk task yang jatuh tempo H-1 (besok).
- Mengembalikan log status pengiriman batch dalam format JSON.

- [ ] **Step 2: Commit Task 4**

```bash
git add frontend/src/app/api/reminders/cron/ frontend/scripts/test-cron-endpoint.ts
git commit -m "feat(cron): add automated scheduled reminder endpoint"
```

---

### Task 5: End-to-End Verification & Production Build

- [ ] **Step 1: Jalankan seluruh test script**

```bash
cd frontend
npx tsx scripts/test-assignee-parser.ts
npx tsx scripts/test-email-payload.ts
npx tsx scripts/test-i18n-dictionaries.ts
npx tsx scripts/test-hero-playground.ts
npx tsx scripts/test-routing-build.ts
npx tsx scripts/test-contrast-ratios.ts
```

- [ ] **Step 2: Jalankan build produksi Next.js**

```bash
npm run build
```
Pastikan seluruh route (`/`, `/app`, `/api/reminders/send`, `/api/reminders/cron`) ter-compile tanpa error.

- [ ] **Step 3: Commit Final Task 5**

```bash
git add .
git commit -m "chore: complete Gmail team reminders & collaborative dashboard implementation"
```
