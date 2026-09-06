    # Strategic Plan &amp; Roadmap: TaskFlowy (Text-to-Gantt MVP)

    ## 1. Executive Summary &amp; Problem Reframing

    ### Problem Definition

    Project manager, tech lead, dan individual contributor sering kali menerima

  atau menyusun jadwal proyek dalam bentuk catatan teks kasar (notulensi rapat,

  pesan Slack/WhatsApp, atau bullet points).

    Untuk mengubah teks tersebut menjadi timeline visual yang dapat

  dipresentasikan ke stakeholder, mereka menghadapi gesekan:

    - Harus membuka software manajemen proyek yang berat (Jira, Asana, MS

  Project).

    - Harus membuat akun, login, membuat project baru, dan menginput task satu

  per satu secara manual.

    - Spreadsheet (Excel/Google Sheets) memerlukan rumus dan formatting manual

  yang memakan waktu.

    ### The Real Root Opportunity

    **TaskFlowy bukan pengganti Jira atau Slack.** Kekuatan utama (*core moat*)

  produk ini adalah **Frictionless Utility**: kecepatan mengubah teks kasar

  menjadi visualisasi Gantt interaktif yang siap dipresentasikan dalam hitungan

  detik, tanpa registrasi akun (*zero login to value*), dan tanpa biaya token

  LLM (*zero API cost, deterministic parsing*).

    ---

    ## 2. Audit Kritis &amp; Eliminasi Scope Inflation

    Berdasarkan analisis terhadap [planning-01.md](http://planning-01.md) (rencana Supabase 83KB) dan

  kode yang ada di src:

    ### Fitur yang Dikeluarkan dari MVP (Anti-Bloat / Out of Scope)

    1. **In-App Team Chat Drawer**:

       - *Alasan*: Pengguna sudah memiliki Slack, Teams, dan WhatsApp. Tidak

  ada tim yang akan berpindah channel komunikasi hanya untuk mengobrol di dalam

  timeline viewer.

       - *Dampak*: Menghilangkan kompleksitas WebSockets realtime dan

  pengelolaan state chat.

    2. **Kompleksitas Auth &amp; Multi-Tenant RLS Database**:

       - *Alasan*: Mewajibkan user registrasi email/password sebelum bisa

  melihat timeline adalah pembunuh retensi terbesar untuk tool utilitas.

       - *Dampak*: Menghilangkan ketergantungan pada backend database di fase

  validasi awal. Biaya hosting = $0.

    3. **Pemisahan Antara Root Editor dan Workspace**:

       - *Kondisi saat ini*: Editor Gantt yang canggih berada di page.tsx,

  sementara [`src/app/(workspace)/projects/[id]/page.

  tsx`](file:///run/media/sh1shiroon/Kerjaan-Linux-

  1/TaskFlowy/frontend/src/app/%28workspace%29/projects/%5Bid%5D/page.tsx)

  kosong.

       - *Koreksi*: Jadikan editor utama sebagai produk itu sendiri.

    ---

    ## 3. Empat Pilar Utama Solusi MVP

    &gt; **Diagram exceeds terminal width (142 &gt; 81 cols)**

    &gt; Displayed as code block. Widen terminal to view inline.

    ```mermaid

    flowchart LR

        A["1. Input Frictionless&lt;br/&gt;(Bulk Textarea / Form)"] --&gt; B["2.

  Deterministic Engine&lt;br/&gt;(Natural Date + Duration + Deps)"]

        B --&gt; C["3. Interactive Canvas&lt;br/&gt;(Gantt Drag + Critical Path)"]

        C --&gt; D["4. Output &amp; Distribution&lt;br/&gt;(PNG/SVG Export + URL Hash

  Share)"]

  ### Pilar 1: Frictionless Bulk Input (Penghilang Gesekan Terbesar)

  Saat ini editor di row-editor.tsx mewajibkan user mengisi kolom form satu per

  satu. Untuk MVP, sediakan mode Dual-Input:

  • Tab A: Bulk Raw Text (Default)

  User dapat langsung paste blok teks (misalnya 15 baris dari catatan rapat):

    Riset Kebutuhan | Andi | 10 Sep 2026 | 3 hari

    Desain UI/UX    | Budi | after Riset Kebutuhan | 5 hari

    Development API | Cici | after Desain UI/UX | 8 hari

    UAT &amp; QA        | Dedi | after Development API | 4 hari

  • Tab B: Table Row Editor

  Digunakan untuk fine-tuning atau pengguna yang menyukai input berbasis baris

  spreadsheet.

  ### Pilar 2: Deterministic Parser &amp; Dependency Solver

  Memanfaatkan aset yang sudah bekerja di :

  • Date Grammar: Tanggal absolut (10 Sep 2026, 2026-09-10) dan tanggal relatif

  (today, tomorrow, after &lt;Nama Task&gt;).

  • Duration Grammar: 3 hari, 1 minggu, 2d, 5w.

  • DAG Resolver: Deteksi cycle dependency otomatis dan kalkulasi Critical Path

  secara instan di client.

  ### Pilar 3: Interactive Visual Canvas

  • Render timeline menggunakan wrapper Frappe Gantt yang sudah ada di

  gantt-board.tsx.

  • Interaksi drag bar untuk mengubah durasi dan tanggal mulai secara visual.

  • Filter assignee instan dan toggle mode tampilan (Day, Week, Month).

  ### Pilar 4: Stateless Persistence &amp; Sharing

  Menyelesaikan masalah "bagaimana cara membagikan timeline ke atasan atau tim

  tanpa database?":

  • URL-Encoded State (seperti Mermaid Live &amp; Excalidraw): State teks dienkode

  dan dikompresi menggunakan lz-string ke dalam URL hash (#data=...). User

  cukup klik tombol "Share Link", dan siapapun yang membuka link tersebut akan

  melihat timeline yang persis sama.

  • LocalStorage Autosave: Menyimpan riwayat 5 proyek/timeline terakhir secara

  lokal di browser pengguna.

  • Visual Export (High Priority): Tombol Export to PNG/SVG agar gambar

  timeline dapat langsung ditempel ke slide presentasi atau dikirim ke

  WhatsApp/Slack.

  ──────

  ## 4. Matriks Prioritas Fitur (MoSCoW)

   Kategori         │ Fitur                     │ Alasan Strategis

  ──────────────────┼───────────────────────────┼──────────────────────────────

   Must Have (P0)   │ Bulk Raw Textarea Input   │ Menyelesaikan problem

                    │                           │ kecepatan input catatan

                    │                           │ rapat.

   Must Have (P0)   │ Export Image (PNG / SVG)  │ Kebutuhan paling nyata dari

                    │                           │ PM: menaruh diagram di

                    │                           │ dokumen/slide.

   Must Have (P0)   │ Stateless URL Sharing     │ Mengizinkan kolaborasi dan

                    │                           │ distribusi tanpa beban

                    │                           │ backend.

   Must Have (P0)   │ Client LocalStorage       │ Mencegah kehilangan data

                    │ Autosave                  │ saat browser ditutup tanpa

                    │                           │ butuh login.

   Must Have (P0)   │ Two-Way Sync (Gantt Drag  │ Perubahan drag pada Gantt

                    │ -&gt; Text)                  │ memperbarui nilai teks

                    │                           │ input.

   Should Have (P1) │ Template Presets          │ Contoh template jadwal 1-

                    │                           │ klik (e.g. Software Release,

                    │                           │ Event Planning, Marketing

                    │                           │ Campaign).

   Should Have (P1) │ Markdown Table Parser     │ Mampu membaca format tabel

                    │                           │ markdown standar (`

   Could Have (P2)  │ Export PDF Printable      │ Format cetak A4 landscape

                    │ Layout                    │ untuk laporan formal.

   Could Have (P2)  │ Simple Password-Protected │ Enkripsi payload URL dengan

                    │ Link                      │ passphrase opsional.

   Won't Have (MVP) │ Realtime Chat Drawer      │ Fitur redundan terhadap

                    │                           │ aplikasi pesan yang sudah

                    │                           │ ada.

   Won't Have (MVP) │ Supabase Auth &amp; Database  │ Menambah friksi adopsi dan

                    │ Sync                      │ biaya operasional di awal.

  ──────

  ## 5. Rencana Eksekusi Bertahap (Execution Phases)

  ### Fase 1: Konsolidasi Engine &amp; Bulk Input (1-2 Hari)

  • Tambahkan tab [Raw Text Paste] di sebelah [Form Table] pada UI input.

  • Hubungkan string textarea ke parser batch parseRows().

  • Pastikan feedback error baris (misalnya baris 3 tanggal tidak valid) muncul

  secara inline di samping textarea.

  ### Fase 2: Visual Export &amp; URL Sharing (1 Hari)

  • Integrasikan library export client-side (misal html-to-image atau SVG

  serializer) pada container Gantt.

  • Pasang lz-string untuk membaca dan menulis state diagram ke window.

  location.hash.

  • Tambahkan tombol Copy Shareable Link dengan notifikasi toast.

  ### Fase 3: Dogfooding &amp; Validasi Pengguna (1 Minggu)

  • Buat 3 studi kasus jadwal proyek nyata menggunakan TaskFlowy.

  • Uji ekspor gambar ke Google Slides dan bagikan link ke rekan

  kerja/stakeholder.

  • Ukur metrik: Apakah waktu pembuatan timeline berkurang dari 15 menit

  menjadi &lt; 2 menit?

  ──────

  ## 6. Analisis Risiko &amp; Mitigasi

   Risiko                  │ Dampak                  │ Mitigasi

  ─────────────────────────┼─────────────────────────┼─────────────────────────

   URL Hash Terlalu        │ URL menjadi ribet jika  │ Kompresi lz-string

   Panjang                 │ ada &gt; 100 task.         │ mampu mengompres teks

                           │                         │ hingga 70-80%. Untuk

                           │                         │ timeline &gt; 100 task,

                           │                         │ sediakan fitur

                           │                         │ "Export/Import JSON

                           │                         │ file".

   Keterbatasan Frappe     │ Rendering visual kurang │ Batasi jenis relasi di

   Gantt                   │ fleksibel untuk         │ MVP pada Finish-to-

                           │ dependensi kompleks.    │ Start (FS). Jangan

                           │                         │ masuk ke SS/FF/SF

                           │                         │ sebelum kebutuhan

                           │                         │ tervalidasi.

   Formatting Teks Bebas   │ User bingung dengan     │ `).

   Sering Error            │ pemisah kolom (`        │

    ---

    ### 6. Rekomendasi Terarah (Principal Recommendation)

    1. **What should the user do?**

       Simpan roadmap di atas ke docs. Alihkan fokus implementasi berikutnya ke

  **Dual-Mode Input (Bulk Raw Textarea)** dan **Export Visual (PNG/SVG)** di

  page.tsx, serta bekukan sementara pengembangan auth/chat di [planning-01.md](http://planning-01.md).

    2. **Why is it the strongest option?**

       Karena opsi ini langsung mengkapitalisasi kode parser deterministik yang

  sudah ada tanpa menambah kompleksitas backend, memangkas *time-to-value*

  menjadi hitungan detik, dan menjaga biaya operasional di angka $0.

    3. **What trade-offs does it accept?**

       Tidak ada fitur live concurrent editing multi-user dan tidak ada role

  permission formal. Kolaborasi berlangsung secara asinkron melalui URL sharing

  atau pertukaran gambar export.

    4. **What assumptions could invalidate it?**

       Jika validasi pasar menunjukkan pengguna wajib memiliki audit log

  terpusat dan sinkronisasi lintas tim di tingkat enterprise (B2B SaaS

  compliance), maka arsitektur backend PostgreSQL/Supabase akan dibutuhkan

  kembali.

    5. **What should happen next?**

       Jalankan `cd frontend && npm run dev` di terminal lokal Anda untuk

  memverifikasi kondisi visual saat ini, lalu putuskan apakah kita akan mulai

  merancang antarmuka **Bulk Textarea Input** atau **Visual Export (PNG/SVG)**

  terlebih dahulu.