# PRD: Text-to-Gantt

## 1. Ringkasan Produk

Text-to-Gantt adalah aplikasi web yang mengubah jadwal proyek menjadi timeline proyek berbentuk diagram Gantt interaktif tanpa biaya per penggunaan dan tanpa dependensi pada model bahasa.

Pengguna menyusun jadwal melalui input terstruktur berbasis baris, misalnya:

```
Desain  | Andi  | 10 Sep 2026 | 3 hari
Backend | Budi  | 12 Sep 2026 | 7 hari
Testing | Sinta | after Backend | 3 hari
```

Setiap baris merepresentasikan satu task dengan field eksplisit: nama task, assignee, start date (tanggal eksplisit atau relative), dan durasi. Sistem memvalidasi dan menormalisasi field tersebut, lalu merender tugas ke dalam Gantt chart. Pengguna kemudian dapat memfilter berdasarkan anggota tim, mengubah durasi langsung dari visualisasi, dan mengekspor jadwal ke CSV.

Pendekatan ini sepenuhnya deterministik dan berbiaya nol per parse. Masih terdapat input teks natural di level field (tanggal dan durasi), tetapi scope-nya sempit dan terkendali, sehingga tidak memerlukan model bahasa.

## 2. Problem Statement

Pembuatan timeline proyek biasanya membutuhkan pekerjaan manual untuk mengubah catatan, chat, atau deskripsi pekerjaan menjadi task, tanggal, durasi, dan PIC yang terstruktur.

Masalah utama:
- Data jadwal sering tersedia dalam format teks tidak terstruktur.
- Membuat Gantt chart secara manual memerlukan input berulang.
- Perubahan durasi membuat timeline harus diperbarui kembali secara manual.
- Stakeholder membutuhkan tampilan visual untuk memahami urutan dan beban pekerjaan.
- Jadwal yang disusun perlu dapat diperiksa dan dikoreksi oleh manusia.

## 3. Product Goal

Mengurangi waktu dari "jadwal masih berupa teks" menjadi "timeline proyek yang dapat diedit", tanpa menimbulkan biaya parsing per penggunaan.

Target produk awal:
- Input task berbasis baris terstruktur.
- Ekstraksi task, tanggal, durasi, dan assignee dari field eksplisit.
- Rendering Gantt interaktif.
- Filtering berdasarkan assignee.
- Editing durasi dari Gantt.
- Export CSV.

## 4. Target User

### Primary User
Project manager, product manager, engineering manager, atau individual contributor yang perlu menyusun timeline dari informasi tekstual.

### Secondary User
Stakeholder proyek yang ingin melihat timeline tanpa harus membuat Gantt chart secara manual.

## 5. User Stories

### Pembuatan Timeline
- Sebagai project manager, saya ingin menyusun jadwal task per baris agar sistem membuat timeline otomatis.
- Sebagai pengguna, saya ingin melihat hasil input sebelum jadwal ditampilkan agar saya dapat memperbaiki kesalahan penulisan.

### Visualisasi
- Sebagai pengguna, saya ingin melihat task dalam Gantt chart agar urutan dan durasi pekerjaan mudah dipahami.
- Sebagai pengguna, saya ingin melihat nama task dan PIC pada timeline.

### Filtering
- Sebagai project manager, saya ingin memfilter berdasarkan anggota tim agar saya dapat melihat pekerjaan orang tertentu.
- Sebagai pengguna, saya ingin mengembalikan tampilan ke seluruh anggota tim.

### Editing
- Sebagai pengguna, saya ingin memperpanjang atau memperpendek task langsung pada Gantt agar perubahan jadwal tidak memerlukan input ulang.
- Sebagai pengguna, saya ingin perubahan visual memperbarui data task yang mendasarinya.

### Export
- Sebagai pengguna, saya ingin mengekspor timeline ke CSV agar data dapat digunakan di Excel, Google Sheets, atau sistem lain.

## 6. Scope MVP

### In Scope
1. Structured task input editor (baris per task).
2. Parsing dan normalisasi field (tanggal dan durasi) secara deterministik tanpa LLM.
3. Structured task validation.
4. Validation dan normalization tanggal/durasi.
5. Preview hasil input.
6. Interactive Gantt chart.
7. Filtering berdasarkan assignee.
8. Drag/resize task untuk mengubah durasi.
9. Edit task minimum pada level visual.
10. CSV export.
11. Error handling untuk input tidak valid.
12. Project state disimpan selama sesi browser.
13. Graphify digunakan sebagai mekanisme tracking perubahan struktur/task yang relevan agar update dapat dilakukan secara lebih terarah.

### Out of Scope untuk MVP
- Multi-user collaboration real-time.
- Authentication dan role management kompleks.
- Database persistence lintas perangkat.
- Dependency management kompleks seperti FS/SS/FF/SF dengan constraint solver.
- Resource capacity planning.
- Baseline comparison.
- Critical path analysis.
- PDF/PNG export.
- Integrasi Jira, Asana, Trello, Notion, atau kalender eksternal.
- Mobile-first editing.

## 7. Core Workflow

### Step 1. Input
Pengguna menyusun task pada editor berbasis baris (atau mengetik format baris dalam textarea). Setiap baris berisi field yang dipisahkan delimiter.

### Step 2. Parse & Normalize
Frontend (atau backend) memparse field per baris:
- field tanggal dengan grammar sempit (spesifik eksplisit / relative)
- field durasi
- field assignee dan nama task
Hasil dinormalisasi menjadi format internal yang konsisten.

### Step 3. Validate
Sistem memvalidasi setiap task:
- date valid (ISO)
- `start <= end`
- `durationDays >= 1`
- `durationDays` sesuai selisih tanggal

### Step 4. Review
Frontend menampilkan tabel/preview task hasil parsing / validasi sebelum Gantt dirender penuh.

### Step 5. Visualize
Task yang sudah lolos validasi dirender sebagai Gantt chart.

### Step 6. Edit
Pengguna dapat mengubah durasi dengan resize bar. Perubahan disimpan ke state aplikasi.

### Step 7. Filter
Pengguna memilih assignee dari filter control. Gantt hanya menampilkan task yang sesuai.

### Step 8. Export
Pengguna mengekspor state timeline saat ini ke CSV.

## 8. Functional Requirements

### FR-01 Task Input
- Sistem menyediakan editor task berbasis baris atau textarea terstruktur.
- Setiap task direpresentasikan satu baris dengan field yang dipisahkan delimiter (contoh `|`).
- Field support:
  - `name` (wajib)
  - `assignee` (opsional)
  - `start` (wajib; tanggal eksplisit, relative, atau `after <task>` jika dependency diaktifkan)
  - `duration` (opsional; default 1 hari) — atau `end` sebagai alternatif
- Sistem menampilkan status validasi per field/baris selama pengetikan.

### FR-02 Structured Input Parsing
Sistem harus memparse per baris dan mengekstrak:
- Nama task.
- Assignee jika diisi.
- Start date (eksplisit atau relative).
- End date (dari input eksplisit atau dari durasi).
- Duration.
- Dependency sederhana (`after <task>`) bila field start menggunakan referensi tersebut.

Contoh baris input:

```
Desain | Andi | 10 September 2026 | 3 hari
```

Expected normalized result:
- Task: Desain
- Assignee: Andi
- Start: 2026-09-10
- Duration: 3 calendar days
- End: 2026-09-12

Parsing dilakukan oleh parser deterministic (regex + grammar kecil), bukan model bahasa. Setiap field diparse secara independen; kegagalan satu field menghasilkan error lokal pada field tersebut, bukan gagal seluruh parse.

### FR-03 Field Resolution (Tanggal)
Sistem harus menggunakan reference date/timezone yang eksplisit agar frasa seperti "besok", "Senin depan", atau "minggu depan" tidak ambigu.

Default timezone aplikasi: Asia/Jakarta.

Sistem harus membedakan:
- Date eksplisit.
- Date relatif (berdasarkan reference date).
- Date yang tidak dapat ditentukan / tidak valid.

Jika tanggal tidak dapat ditentukan dengan cukup yakin, sistem harus menandai field sebagai invalid daripada membuat tanggal secara diam-diam.

### FR-04 Validation
Sistem harus menolak atau menandai data yang tidak valid, termasuk:
- End date lebih awal daripada start date.
- Duration negatif atau nol (aplikasi menggunakan minimum 1 hari).
- Task tanpa tanggal yang dibutuhkan untuk Gantt.
- Format tanggal/durasi tidak dikenal.
- Dependensi `after X` yang merujuk task tidak dikenal atau membentuk cycle (jika dependency diaktifkan MVP).

### FR-05 Parse Result Preview
Sebelum final rendering, pengguna dapat melihat data terstruktur.
Minimum kolom:
- Task
- Assignee
- Start
- End
- Duration
- Status validation

### FR-06 Gantt Rendering
Gantt chart harus:
- Menampilkan task sebagai bar horizontal.
- Menampilkan skala hari/minggu/bulan.
- Menampilkan task name.
- Mendukung horizontal scrolling.
- Memiliki visual berbeda untuk task yang sedang difilter jika diperlukan.

### FR-07 Direct Duration Editing
Pengguna dapat resize sisi kanan task bar untuk mengubah end date/duration.

Aturan:
- Minimum duration: 1 hari.
- Start date tetap saat hanya melakukan resize kanan.
- State task langsung diperbarui setelah perubahan.
- Nilai duration dan end date dihitung ulang secara deterministik.

### FR-08 Assignee Filter
Filter harus:
- Menampilkan seluruh assignee unik.
- Mendukung satu atau lebih assignee.
- Memiliki opsi All.
- Tidak mengubah data asli task.

### FR-09 CSV Export
CSV harus minimal memuat:
- Task ID
- Task Name
- Assignee
- Start Date
- End Date
- Duration

CSV mengikuti state timeline terbaru. Filter tidak boleh mengubah data export kecuali filter export secara eksplisit dipilih sebagai behavior yang diaktifkan kemudian. Default MVP: export seluruh task.

### FR-10 Error States
Sistem harus menangani:
- Empty input.
- Baris dengan field wajib kosong.
- Format tanggal tidak valid / tidak dikenal.
- Format durasi tidak valid.
- End date sebelum start date.
- Dependensi `after X` tidak dikenal / cycle (jika aktif).
- Gantt rendering error.

Pesan error harus memberi tindakan berikutnya yang jelas.

## 9. Non-Functional Requirements

### Performance
- Initial UI harus cepat dirender.
- Parsing tidak boleh memblokir UI (dijalankan async/worker bila perlu).
- Gantt harus tetap interaktif untuk setidaknya 500 task pada MVP.

### Reliability
- Parser bersifat deterministic dan dapat diuji (unit-test).
- Output validation dilakukan terpusat, bukan per-field scattered.
- Export menggunakan state ter-normalisasi.

### Security
- Tidak ada API key eksternal yang dibutuhkan (tidak ada LLM provider).
- Batasi ukuran input (jumlah baris / panjang teks).
- Sanitasi text yang akan dirender kembali ke UI.

### Observability
Bila backend terpisah digunakan, backend mencatat metadata operasional minimal:
- request duration
- parser success/failure
- validation failure
- jumlah task hasil input

Jangan menyimpan raw input pengguna secara permanen dalam MVP tanpa kebutuhan produk yang eksplisit.

## 10. Technical Architecture

### Repository
Monorepo:

```text
/
  frontend/
  backend/
  docs/
```

Frontend dan backend memiliki deployment serta environment variable terpisah. Karena parser deterministic dan tidak memerlukan LLM, parsing dapat berjalan sepenuhnya di frontend.

### Frontend
- Next.js
- Tailwind CSS
- TypeScript
- Frappe Gantt sebagai pilihan utama untuk MVP interactive editing.

### Backend
Pilihan implementasi dapat menggunakan Next.js Route Handler atau service backend terpisah. Karena tidak ada LLM, backend opsional untuk MVP. Parser dan validation dapat berjalan di frontend.

Responsibilities (bila backend digunakan):
- Structured input validation.
- Date normalization.
- Business rules.
- CSV generation dapat berada di frontend atau backend, tetapi harus menggunakan normalized schema.

### Gantt Library Decision
Frappe Gantt direkomendasikan untuk MVP karena requirement utama mencakup manipulasi task langsung pada visual timeline.

Mermaid.js lebih cocok untuk diagram deklaratif dan dokumentasi. Mermaid tidak menjadi pilihan utama untuk editing Gantt interaktif pada MVP.

## 11. API Contract

### POST /api/parse-timeline
Request:
```json
{
  "rows": [
    { "name": "Desain", "assignee": "Andi", "start": "10 September 2026", "duration": "3 hari" }
  ],
  "referenceDate": "2026-09-05",
  "timezone": "Asia/Jakarta"
}
```

Response:
```json
{
  "tasks": [
    {
      "id": "task-001",
      "name": "Desain",
      "assignee": "Andi",
      "start": "2026-09-10",
      "end": "2026-09-12",
      "durationDays": 3,
      "ambiguities": []
    }
  ],
  "warnings": []
}
```

### Validation Principle
User menyediakan candidate field value. Backend (atau frontend) validator dan normalizer menentukan apakah data tersebut boleh masuk ke application state.

## 12. Data Model Overview

Entity utama:
- Project
- Task
- Assignee
- TimelineState

MVP tidak wajib menyimpan Project ke database secara permanen.

## 13. UX Structure

### Layout
```text
+------------------------------------------------------+
| Header: Text-to-Gantt | Generate | Export CSV        |
+------------------------------------------------------+
| Task Input                                           |
| [ Task     | Assignee | Start        | Duration   ]   |
| [ Desain   | Andi     | 10 Sep 2026  | 3 hari     ]   |
| [ Backend  | Budi     | 12 Sep 2026  | 7 hari     ]   |
| [ + Add Row                                          ] |
| [ Generate Timeline ]                                |
+------------------------------------------------------+
| Review / Filters                                     |
| Assignee: [All v]                                   |
+------------------------------------------------------+
| Gantt Timeline                                       |
| Task |  Sep 10 | Sep 11 | Sep 12 | Sep 13 | ...    |
|------------------------------------------------------|
| Design | █████████                             |     |
| Backend|          ██████████                    |     |
+------------------------------------------------------+
```

### UX Principles
- Setiap task harus dapat diperiksa (inspectable).
- Perubahan visual harus terasa langsung.
- Tidak ada silent correction terhadap input pengguna.
- Error/ambiguity harus terlihat pada field yang relevan.
- Gantt menjadi primary workspace setelah input berhasil.

## 14. Input Parsing Strategy

Gunakan pending parser deterministic (regex + grammar kecil) per field, bukan model bahasa, dan bukan memparse prose bebas lalu di-extract ulang.

Pipeline:

```text
Structured Rows (name | assignee | start | duration)
  -> Field parsing (date grammar, duration grammar)
  -> Schema/normalization
  -> Business validation
  -> Canonical TimelineState
  -> Gantt
```

Aturan parser:
- Hanya menginterpretasikan field yang formatnya dikenal.
- Tidak mengarang tanggal.
- Menandai field yang tidak dapat di-resolve sebagai error, bukan default.
- Menggunakan reference date untuk relative expressions.
- Memproduksi output sesuai schema.

## 15. Date and Duration Rules

MVP menggunakan calendar-day duration.

Contoh:
- Start 10 Sep, duration 1 hari => end 10 Sep.
- Start 10 Sep, duration 3 hari => end 12 Sep.
- Week-end tetap dihitung pada MVP. Business-day scheduling dapat menjadi fitur lanjutan.

Grammar field tanggal (contoh) mendukung:
- `10 September 2026`, `2026-09-10`, `10/09/2026`
- relative: `besok`, `Senin depan`, `minggu depan` (terhadap reference date)
- dependency: `after <task>` (hanya bila dependency diaktifkan)

Grammar field durasi (contoh) mendukung:
- `3 hari`, `1 minggu`
- `sampai 15 September 2026` (menghasilkan end date eksplisit)

## 16. State Management

Canonical source of truth adalah normalized TimelineState.

Raw input rows tidak digunakan langsung oleh Gantt.

Minimal state:
```text
inputRows
parseStatus
warnings
errors
tasks
selectedAssignees
viewMode
```

Editing Gantt harus menghasilkan immutable state update agar perubahan dapat dilacak dan diekspor secara konsisten.

## 17. Acceptance Criteria MVP

### Parsing
- Input baris valid menghasilkan minimal satu task jika field terisi.
- Setiap field divalidasi terhadap schema.
- Date relative menggunakan reference date dan timezone yang eksplisit.
- Field yang tidak valid ditandai, bukan dibuang diam-diam.

### Visualization
- Semua task valid tampil pada Gantt.
- Timeline dapat di-scroll horizontal.
- Task name dan assignee dapat diidentifikasi.

### Filtering
- User dapat memilih assignee.
- Gantt memperbarui tampilan tanpa mengubah underlying task.

### Editing
- User dapat resize task bar.
- End date dan duration berubah sesuai resize.
- Perubahan dapat diekspor.

### Export
- CSV dapat diunduh.
- CSV memuat seluruh normalized task state.

## 18. Success Metrics

MVP dapat dianggap berhasil jika:
- Pengguna dapat menghasilkan Gantt dari satu set input baris tanpa memasukkan task satu per satu ke library.
- Mayoritas baris dengan tanggal eksplisit di-resolve dengan benar.
- Pengguna dapat memperbaiki durasi tanpa kembali ke input.
- Export CSV mempertahankan data timeline terbaru.
- Zero biaya per-parse (tanpa panggilan API eksternal).

Operational metrics yang disarankan:
- Streamline input-to-gantt success rate.
- Field validation error rate.
- Average input-to-render latency.
- Average number of manual edits per generated timeline.
- CSV export rate.

## 19. Edge Cases

- Dua task memiliki nama sama.
- Assignee tidak diisi.
- Satu task memiliki dua assignee (gabungan dipisah koma).
- Input berisi beberapa proyek sekaligus (namenama tetap task diskrit).
- Durasi ditulis sebagai "sekitar seminggu".
- Rentang tanggal menggunakan locale berbeda.
- Tanggal tanpa tahun.
- Task hanya memiliki deadline tanpa start date.
- Task bergantung pada task lain (`after X`) tetapi dependency tidak dinyatakan eksplisit.

MVP harus memprioritaskan correctness dibandingkan mencoba memaksakan semua kasus menjadi task valid.

## 20. Future Roadmap

### Phase 2
- Edit task name dan assignee.
- Add/delete task langsung pada Gantt.
- Dependencies.
- Business-day calendar.
- Save/load project.

### Phase 3
- Authentication.
- Database persistence.
- Shareable project URL.
- Collaboration.
- Import CSV.
- External integrations.

### Phase 4
- AI schedule refinement (opsional, jika kebutuhan muncul).
- Conflict detection.
- Workload analysis.
- Critical path.
- Scenario comparison.

## 21. Risks and Mitigations

### Risk: Parser deterministik gagal menangani variasi input user
Mitigation: grammar terkendali per field, preview hasil input, error per-field dengan contoh format valid, dan prioritas correctness.

### Risk: User menulis format input salah dan frustrasi
Mitigation: validasi realtime per field, placeholder contoh baris, dan presisi label error.

### Risk: Gantt library sulit mendukung editing tertentu
Mitigation: prioritaskan Frappe Gantt untuk MVP dan abstraksikan adapter Gantt di frontend.

### Risk: Dependensi `after X` menambah kompleksitas resolver
Mitigation: dependency opsional; jika diaktifkan, validasi referensi + deteksi cycle, dan tetap guard terhadap baris bebas dependency.

## 22. Engineering Principles

1. Canonical state selalu normalized task schema.
2. User input tidak langsung memodifikasi UI state; melalui validation/normalization.
3. Semua business rule penting dieksekusi melalui validator terpusat (frontend dan/atau backend).
4. UI editing adalah perubahan terhadap canonical state.
5. Jangan membangun fitur persistence dan collaboration sebelum core input-to-timeline workflow stabil.
6. Gunakan Graphify untuk menjaga perubahan struktur dan pekerjaan implementasi tetap terarah, terutama ketika schema, parser contract, atau komponen Gantt berubah.