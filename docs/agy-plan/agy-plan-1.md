    # Comprehensive MVP Execution Plan: TaskFlowy (Text-to-Gantt)

    ## 1. Goal (Establish the Objective)

    - **Main Goal**: Membangun utilitas timeline interaktif berbasis web

  (*zero-friction, zero-cost, zero-login*) yang mampu mengubah catatan teks

  jadwal proyek tidak terstruktur menjadi diagram Gantt interaktif siap

  presentasi dalam waktu &lt; 30 detik.

    - **Desired Outcome**: Pengguna (Project Manager/Tech Lead/Freelancer)

  dapat menyalin catatan teks (dari Slack/WhatsApp/Notulen), menempelkannya ke

  TaskFlowy, langsung melihat Gantt chart terstruktur, menggeser/mengatur

  durasi secara visual, mengekspor gambar berkualitas tinggi (PNG/SVG) untuk

  slide/laporan, serta membagikan tautan jadwal via URL hash tanpa memerlukan

  registrasi akun atau server database berbayar.

    - **Current State**:

      - Mesin parser deterministik grammar (), kalkulasi Critical Path, dan

  visualisasi Frappe Gantt sudah bekerja di root page.tsx.

      - Namun, input masih terkunci pada form per-baris (row-editor.tsx), belum

  ada bulk-paste textarea, belum ada export gambar visual (hanya ada CSV),

  state belum tersimpan lintas reload, dan rute workspace terisolasi dari core

  engine.

    - **Target State**:

      - Aplikasi web *single-page workbench* yang solid dengan **Dual-Mode

  Input** (Bulk Raw Textarea + Form Baris).

      - **Stateless URL Sharing** `#data=...` berbasis `lz-string`) +

  **LocalStorage Autosave** (menyimpan 5 draf terakhir).

      - **1-Click Visual Exporter** (PNG, SVG, dan CSV).

      - Sinkronisasi dua arah (*Two-Way Sync*): Edit teks memperbarui Gantt;

  drag bar Gantt memperbarui nilai teks.

    - **Non-Goals (Anti-Scope untuk MVP)**:

      - Multi-user concurrent editing (Google Docs style / WebSockets multi-

  cursor).

      - In-app team chat room / messaging drawer.

      - User authentication, role-based access control (RBAC), dan persistence

  database server (Supabase/PostgreSQL).

      - Solver dependency tingkat lanjut (SS, FF, SF with lag constraints).

      - Integrasi dua arah dengan Jira, Asana, Linear, atau Notion.

    - **Constraints**:

      - Hosting &amp; Operational Budget: **$0 / Free Tier** (Vercel / Cloudflare

  Pages).

      - Zero LLM Token Dependency: Parsing 100% deterministik di browser

  (privasi data jadwal terjamin).

    - **Definition of Success**:

      - *Time-to-Gantt*: Pengguna baru mampu menghasilkan Gantt chart dari 10

  baris teks dalam &lt; 30 detik sejak pertama kali membuka landing page.

      - *Visual Export Success*: 100% diagram yang diekspor ke PNG/SVG dapat

  dibaca jelas pada dokumen Google Slides / Notion.

    ---

    ## 2. Diagnosis (Starting Point Assessment)

    - **Existing Assets**:

      - Core Parser: date-grammar.ts, duration-grammar.ts, row-parser.ts.

      - DAG Engine: schema.ts dan schema.ts.

      - Visualization: gantt-board.tsx (Frappe Gantt), Table View, Dependency

  View, Analysis View.

    - **Known Blockers &amp; Gaps**:

      - *Input Friction*: Ketiadaan bulk textarea membuat konversi catatan

  rapat menjadi lambat karena harus klik "Add Row" berulang kali.

      - *Export Gap*: Ketiadaan export PNG/SVG memaksa pengguna mengambil

  screenshot manual yang sering kali terpotong atau pecah resolusinya.

      - *State Volatility*: Halaman me-reset semua task saat refresh; tidak ada

  mekanisme sharing asinkron.

      - *Code Disconnect*: Dokumen [planning-01.md](http://planning-01.md) mengarahkan proyek ke backend

  Supabase &amp; Chat yang mengaburkan diferensiasi utama produk.

    ---

    ## 3. Identify Assumptions

    1. **Confirmed**:

       - Frappe Gantt dapat menangani interaksi drag tanggal/durasi dan memicu

  callback event ke React state.

       - Algoritma parser yang ada saat ini sudah mampu memproses format

  natural field `Nama | PIC | Start/Relative | Durasi`).

    2. **Likely**:

       - Pengguna target lebih mementingkan kemudahan copy-paste gambar ke

  slide presentasi daripada memiliki akun pengguna formal.

       - Kompresi `lz-string` pada URL hash mampu menampung jadwal proyek

  hingga 80 task tanpa melebihi batas panjang URL browser (2048 karakter).

    3. **Uncertain / Critical to Validate**:

       - Apakah user lebih menyukai pemisah pipa `|`), tab/indented list, atau

  format tabel markdown standar?                                               

       - Apakah rendering Frappe Gantt cukup stabil saat diekspor langsung ke  

  SVG/PNG menggunakan canvas rasterization pada layar resolusi tinggi (Retina  

  display)?                                                                    

                                                                               

    ---

    ## 4. Define Strategy

    - **Strategic Approach: "Frictionless Utility First, Platform Later"**

      - Mengikuti pola sukses produk utilitas viral seperti **Excalidraw**,

  **Mermaid Live Editor**, dan **JSONCrack**.

      - Menghilangkan *barrier to entry* sebesar 100%: Tidak ada tombol login,

  tidak ada form kartu kredit, tidak ada onboarding bertahap.

      - Fokus pada satu alur kerja utama yang luar biasa cepat: **Raw Text In →

  Interactive Gantt View → Export/Share Out**.

    - **What Must Be True for Success**:

      - Pengalaman menempelkan teks (*pasting*) harus toleran terhadap spasi

  ekstra dan baris kosong.

      - Export gambar harus bersih dari artefak UI browser (tanpa scrollbar

  atau tombol inspect yang ikut terfoto).

    ---

    ## 5. Define Scope (MoSCoW)

    ### Must Have (P0 - MVP Core)

    1. **Dual-Mode Input Editor**:

       - Tab "Raw Text (Bulk Paste)" dengan syntax highlighting / placeholder

  format panduan.

       - Tab "Table Rows" (fitur yang ada saat ini) yang tersinkronisasi dua

  arah dengan Raw Text.

    2. **Robust Multi-Separator Parsing**:

       - Parser mendukung pemisah pipa `|`), tab (salinan langsung dari

  Excel/Google Sheets), dan koma.

    3. **Stateless URL Sharing**:

       - Fitur "Share Link" yang mengompresi payload jadwal ke URL hash

  `#data=...`).

    4. **LocalStorage Autosave &amp; Draft Selector**:

       - Menyimpan otomatis draf yang sedang dikerjakan; riwayat 5 proyek lokal

  terakhir.

    5. **High-Resolution Visual Export**:

       - Export diagram Gantt ke PNG (resolusi 2x/Retina) dan SVG vector.

    6. **Two-Way Synchronization**:

       - Drag bar pada Gantt memperbarui baris teks; edit baris teks

  memperbarui visual Gantt.

    ### Should Have (P1 - Fast Follow)

    1. **Preset Project Templates**:

       - Tombol 1-klik untuk memuat template: *Software Sprint (2 Minggu)*,

  *Marketing Campaign*, *Event Organizer Timeline*.

    2. **Zoom &amp; Time Horizon Quick Switch**:

       - Day / Week / Month / Quarter toggle yang responsif terhadap rentang

  tanggal task.

    3. **Format Beautifier / Auto-Align**:

       - Tombol "Prettify Text" yang merapikan spasi tabel pipa teks mentah

  secara otomatis.

    ### Could Have (P2 - Post-MVP)

    1. **Password-Protected Share Link**:

       - Enkripsi sederhana payload teks di URL hash menggunakan Web Crypto API

  dengan kata sandi lokal.

    2. **Printable PDF Export**:

       - Layout PDF A4/A3 landscape khusus untuk dokumen kontrak proyek formal.

    ### Out of Scope (Explicitly Excluded)

    - Sistem Autentikasi Supabase, JWT cookies, dan database PostgreSQL.

    - Real-time Team Chat Drawer.

    - Multi-user WebSockets live cursor editing.

    - Integrasi pihak ketiga (Jira/Asana/Trello API sync).

    ---

    ## 6. Workstreams

    1. **WS1: Input &amp; Parser Architecture (Engine)**

    2. **WS2: Visual Canvas &amp; Export Pipeline (Rendering)**

    3. **WS3: State Persistence &amp; Stateless Distribution (Sharing)**

    4. **WS4: UX Hardening &amp; Presentation Polishing (UI/UX)**

                                                                               

    ---                                                                        

                                                                               

    ## 7. Deliverables &amp; Execution Table                                       

                                                                               

    | Priority | Workstream | Deliverable / Task | Purpose | Dependency | Role |

  Output | Validation |

    | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

    | **P0** | WS1 | **Bulk Textarea Component** | Memungkinkan paste banyak

  baris teks jadwal sekaligus | None | Frontend Dev | `raw-text-editor.tsx` |

  Mampu paste 20 baris dan parsing dalam &lt; 100ms |

    | **P0** | WS1 | **Tab / Pipe Normalizer** | Mendukung salinan langsung

  dari spreadsheet tanpa edit manual | None | Core Dev | Update `row-parser.ts` |

  Paste dari Google Sheets (tab-separated) otomatis ter-parse |

    | **P0** | WS1 | **Two-Way State Bridge** | Sinkronisasi perubahan visual

  Gantt kembali ke raw text | `raw-text-editor.tsx` | Core Dev | Helper

  `tasksToRawText()` | Drag bar Gantt otomatis mengupdate teks di textarea |

    | **P0** | WS2 | **Visual Export Engine (PNG/SVG)** | Kebutuhan presentasi

  stakeholder pada slide/laporan | `gantt-board.tsx` | Frontend Dev | `visual-

  exporter.ts` | File PNG terunduh dengan resolusi 2x tanpa terpotong |

    | **P0** | WS3 | **LZ-String URL Codec** | Distribusi jadwal tanpa

  server/database | None | Frontend Dev | `url-state.ts` | Link URL di browser

  lain membuka timeline yang sama persis |

    | **P0** | WS3 | **LocalStorage Draft Manager** | Mencegah kehilangan

  jadwal saat tab tertutup | None | Frontend Dev | `use-drafts.ts` | Refresh

  browser mengembalikan state terakhir tanpa data hilang |

    | **P1** | WS4 | **Template Selector Dropdown** | Mempercepat edukasi

  pengguna tentang format penulisan | `raw-text-editor.tsx` | UX Designer |

  `template-picker.tsx` | Klik template langsung merender timeline contoh |

    | **P1** | WS4 | **Clean UI Consolidator** | Menyingkirkan komponen mock

  chat/auth dari root view | None | Frontend Dev | Refactor `app/page.tsx` |

  Tampilan bersih, fokus 100% pada editor timeline |

    ---

    ## 8. Dependencies &amp; Critical Path

    &gt; **Diagram exceeds terminal width (181 &gt; 81 cols)**

    &gt; Displayed as code block. Widen terminal to view inline.

    ```mermaid

    graph TD

        A["WS1: Bulk Textarea &amp; Parser Normalizer"] --&gt; B["WS1: Two-Way State

  Bridge (Gantt &lt;-&gt; Text)"]

        A --&gt; C["WS3: LocalStorage Autosave"]

        A --&gt; D["WS3: Stateless URL Codec (lz-string)"]

        B --&gt; E["WS2: Visual Export Engine (PNG/SVG)"]

        C --&gt; F["WS4: Template Selector &amp; UX Consolidator"]

        D --&gt; G["Final MVP Gate: Dogfooding &amp; Public Preview"]

        E --&gt; G

        F --&gt; G

  • Critical Path:

  WS1 (Bulk Textarea) → WS1 (Two-Way Sync) → WS2 (PNG/SVG Export) → WS3 (URL

  Sharing) → Final MVP Gate.

  • Parallelizable Work:

  Pembangunan WS3 (Stateless URL Codec) dan WS2 (Visual Export Engine) dapat

  dikerjakan secara paralel setelah struktur data task stabil.

  ──────

  ## 9. Decision Gates

  ### Gate 1: Parser Robustness Test

  • Decision: Apakah format pemisah pipa (|) dan tab spreadsheet cukup

  fleksibel bagi user non-teknis?

  • Evidence: Uji paste 5 format catatan rapat nyata.

  • Continue Condition: Parser berhasil mengekstrak task, tanggal, dan durasi

  dengan tingkat keberhasilan &gt; 90%.

  • Pivot Condition: Jika user sering salah meletakkan kolom, tambahkan header

  baris opsional atau mode auto-inferensi kolom.

  ### Gate 2: URL Payload Length Limit

  • Decision: Apakah URL hash cukup untuk proyek berukuran sedang?

  • Evidence: Uji kompresi jadwal dengan 50 task menggunakan lz-string.

  • Continue Condition: Panjang URL string &lt; 1800 karakter.

  • Pivot Condition: Jika melebihi 2000 karakter, aktifkan tombol fallback

  "Export to .taskflowy JSON file".

  ──────

  ## 10. Risk Management

   Risk     │ Cause     │ Im… │ Li… │ Mitigation Strategy │ Contingency Action

  ──────────┼───────────┼─────┼─────┼─────────────────────┼────────────────────

   Frappe   │ Frappe    │ Hig │ Med │ Siapkan wrapper     │ Fallback ke tombol

   Gantt    │ Gantt     │ h   │     │ cloning DOM dengan  │ print-friendly

   SVG      │ menggunak │     │     │ kalkulasi           │ stylesheet (CSS

   Clipping │ an        │     │     │ scrollWidth         │ @media print).

   saat     │ dynamic   │     │     │ eksplisit sebelum   │

   Export   │ SVG DOM   │     │     │ rasterisasi ke      │

            │ yang      │     │     │ canvas.             │

            │ lebar     │     │     │                     │

   Looping  │ Gantt     │ Hig │ Med │ Gunakan flag        │ Batasi

   Update   │ update    │ h   │     │ referensi           │ sinkronisasi ke

   pada     │ memicu    │     │     │ isInternalUpdate    │ teks hanya saat

   Two-Way  │ text      │     │     │ dan debounce 150ms  │ event drag_end

   Sync     │ update,   │     │     │ pada sinkronisasi   │ selesai.

            │ yang      │     │     │ state.              │

            │ memicu    │     │     │                     │

            │ re-parse  │     │     │                     │

            │ berulang  │     │     │                     │

            │ kali      │     │     │                     │

   Fragment │ Kebingung │ Med │ Low │ Isolasi penuh rute  │ Hapus routing

   asi Kode │ an antara │     │     │ (workspace) atau    │ /dashboard dan

   Lama     │ rute mock │     │     │ jadikan root page   │ /projects/[id]

   (plannin │ workspace │     │     │ sebagai satu-       │ sementara waktu.

   [g-01.md](http://g-01.md)) │ dengan    │     │     │ satunya entry       │

            │ root page │     │     │ point.              │

  ──────

  ## 11. Resource Planning

  • Roles:

      • 1 Frontend / Fullstack Engineer (React, Next.js, Canvas/SVG, DOM

      manipulation).

  • External Dependencies (Zero Cost):

      • lz-string: Kompresi URL hash.

      • html-to-image atau direct SVG-to-Canvas serializer: Export gambar.

      • lucide-react &amp; tailwind-merge: UI polishing.

  • Infrastructure:

      • Vercel Free Hobby Tier / Cloudflare Pages ($0/bulan).

  ──────

  ## 12. Validation Plan                                                       

                                                                               

  1. Friction Test: Ukur berapa klik dan detik yang dibutuhkan untuk mengubah  

  notulensi rapat mentah menjadi gambar Gantt PNG.                             

      • Target: &lt; 30 detik, &lt; 3 kali klik.                                     

  2. Cross-Browser URL Test: Buka link hasil share di Chrome, Firefox, Safari  

  iOS, dan Chrome Android.

      • Target: 100% timeline ter-render identik tanpa error parsing.

  3. Slide Insertion Test: Masukkan file PNG hasil export ke Google Slides dan

  Microsoft PowerPoint.

      • Target: Teks task dan bar timeline terbaca tajam pada ukuran layar

      presentasi 1080p.

  ──────

  ## 13. Execution Timeline

  📊 Diagram (unsupported type)

  ──────────────────────────────

  gantt

      title Timeline Eksekusi TaskFlowy MVP

      dateFormat  YYYY-MM-DD

      section Phase 1: Input Engine

      Bulk Textarea &amp; Parser Normalizer    :a1, 2026-09-06, 2d

      Two-Way Sync (Gantt &lt;-&gt; Raw Text)   :a2, after a1, 1d

      section Phase 2: Export &amp; Share

      Visual Exporter (PNG/SVG)           :b1, after a2, 1d

      LZ-String URL Codec &amp; Sharing       :b2, after a2, 1d

      LocalStorage Autosave &amp; Templates   :b3, after b1, 1d

      section Phase 3: Hardening

      UI Clean up &amp; Mobile View Hardening :c1, after b3, 1d

      Dogfooding &amp; Public Preview Launch  :c2, after c1, 1d

  ──────

  ## 14. Success Metrics

  • Aha! Moment Time: &lt; 30 detik dari landing hingga visual Gantt muncul.

  • Client Crash Rate: 0% unhandled exception pada syntax teks yang rusak

  (error ditampilkan secara anggun di editor).

  • Export Adoption: &gt; 50% sesi pengguna menggunakan tombol Export PNG atau

  Copy Link.

  • Operating Cost: Tepat $0.00.

    ---

    ### 15. Rekomendasi Terarah (Principal Recommendation)

    1. **Recommended Approach**:

       **Adopsi model "Frictionless Single-Page Canvas" (seperti Excalidraw /

  Mermaid Live).** Satukan seluruh fungsionalitas ke page.tsx, bangun antarmuka

  Dual-Mode (Bulk Raw Text + Table), pasang generator export PNG/SVG, serta

  gunakan URL-hash encoding `lz-string`) untuk kolaborasi asinkron tanpa

  database.

    2. **Why It Is Preferred**:

       - Menghindari jebakan pengembangan backend/auth/chat yang mahal dan

  belum divalidasi.

       - Mengkapitalisasi 100% aset parser deterministik yang sudah selesai

  dibuat di .

       - Menyediakan proposisi nilai yang jelas dan instan bagi target pengguna

  (PM &amp; Tech Lead).

    3. **Major Trade-offs**:

       - Tidak ada sinkronisasi multi-kursor real-time (jika 2 orang mengedit

  secara bersamaan, mereka bekerja pada salinan URL masing-masing).

       - Tidak ada sistem database terpusat untuk mencari seluruh proyek

  historis perusahaan.

    4. **Important Assumptions**:

       - Target pengguna lebih menghargai kecepatan dan privasi data lokal

  tanpa login dibanding memiliki dashboard manajemen akun.

    5. **Immediate Next Action**:

       Salin dan simpan isi dokumen di atas ke agy-plan.

    ---

    ### 16. Pertanyaan Strategis untuk Mempertajam Eksekusi

    Untuk memastikan rencana ini 100% presisi saat kita masuk ke tahap

  pengerjaan:

    1. **Format Input Teks Utama**: Apakah Anda lebih menyukai pemisah standar

  pipa `Task | Assignee | Date | Duration`) saja, atau apakah parser juga

  wajib mengenali format *Markdown Bullet/Indented List* (contoh: `- Task A

  (Andi, 3 hari)`) di MVP awal?

    2. **Visual Export Requirement**: Apakah export gambar cukup dengan opsi

  **PNG &amp; SVG**, atau Anda memiliki kebutuhan spesifik untuk langsung mencetak

  dokumen **PDF Landscape** (A4/A3)?

    3. **Workspace Cleanup**: Apakah modul mock auth dan mock chat yang saat

  ini ada di folder (workspace) sebaiknya kita arsipkan/sembunyikan agar

  repositori tetap ramping dan fokus ke root engine?