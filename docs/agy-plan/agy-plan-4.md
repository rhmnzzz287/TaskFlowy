# TaskFlowy User Profile & Workspace Hub Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghadirkan dashboard profil pengguna dan workspace hub lokal (*The Lean Operator*) pada TaskFlowy yang menyatukan identitas kerja pengguna, pelacakan tugas aktif lintas proyek, pengelolaan linimasa tersimpan, dan keamanan pencadangan data JSON tanpa dependensi backend eksternal.

**Architecture:**
- **Local-First & Zero-Backend Storage:** State profil pengguna (`UserProfile`) dan arsip proyek disimpan langsung di browser melalui `localStorage` dengan skema deterministik dan mekanisme fail-safe backup/restore file JSON.
- **Cross-Project Task Aggregator:** Mesin komputasi *derived state* yang memfilter dan mengagregasikan seluruh tugas yang di-*assign* ke nama pengguna dari semua draf linimasa yang tersimpan, mengurutkannya berdasarkan kedekatan tenggat waktu (*due date*).
- **Non-Intrusive Modal Overlay:** Dashboard diakses melalui avatar trigger di top navbar sebagai modal *overlay* yang bersih dan responsif, menjaga status editor Gantt tetap aktif di latar belakang tanpa kehilangan konteks.
- **Lean Two-Column Layout:** Kolom kiri menampilkan kartu identitas kerja, 3 metrik esensial (Proyek Tersimpan, Tugas Aktif, Tugas Mendesak), dan kontrol backup. Kolom kanan menyediakan tab navigasi antara daftar proyek linimasa dan daftar tugas pribadi.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React.

**Spec:** [PRD.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/PRD.md), [SCHEMA.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/SCHEMA.md)

## Global Constraints

- **Zero Heavy Dependencies:** Dilarang menambah library state management eksternal (Redux, Zustand) atau modal toolkit berat. Gunakan native React hooks dan Tailwind CSS.
- **Zero Backend / Offline Capable:** Seluruh operasi simpan, baca, dan agregasi data berjalan 100% di sisi klien browser (offline-ready).
- **Non-Destructive Integration:** Integrasi tombol profil di header tidak boleh merusak tata letak tombol aksi eksisting (Generate, Export, Share, ThemeToggle).
- **Deterministic & Safe Parsing:** Backup dan restore JSON wajib menyertakan validasi struktur data untuk mencegah korupsi state aplikasi.

---

### Task 1: User Profile Store & Backup Engine

**Files:**
- Create: `frontend/src/lib/profile-store.ts`
- Create: `frontend/scripts/test-profile-store.ts`

**Interfaces:**
- Consumes: None (pure domain logic)
- Produces:
  ```typescript
  export interface UserProfile {
    name: string
    role: string
    avatarEmoji: string
    defaultAssignee: string
    createdAt: string
    updatedAt: string
  }

  export interface TaskFlowyBackupData {
    version: number
    exportedAt: string
    profile: UserProfile
    draftsStore: unknown
  }

  export function getDefaultProfile(): UserProfile
  export function loadUserProfile(): UserProfile
  export function saveUserProfile(profile: Partial<UserProfile>): UserProfile
  export function generateBackupData(): string
  export function validateAndRestoreBackup(jsonString: string): { success: boolean; error?: string }
  ```

- [ ] **Step 1: Tulis script test validasi profile store & backup parser**

Buat file `frontend/scripts/test-profile-store.ts`:
```typescript
import {
  getDefaultProfile,
  validateAndRestoreBackup,
  type UserProfile,
  type TaskFlowyBackupData,
} from '../src/lib/profile-store'

console.log('--- TEST 1: Default Profile Initialization ---')
const defaultProfile = getDefaultProfile()
if (!defaultProfile.name || !defaultProfile.avatarEmoji || !defaultProfile.defaultAssignee) {
  console.error('FAIL: Default profile properties missing:', defaultProfile)
  process.exit(1)
}
console.log('✓ Default profile verified:', defaultProfile.name, defaultProfile.avatarEmoji)

console.log('--- TEST 2: Validate Malformed Backup JSON ---')
const malformedRes = validateAndRestoreBackup('{"invalid": true}')
if (malformedRes.success) {
  console.error('FAIL: Expected failure on malformed backup but got success')
  process.exit(1)
}
console.log('✓ Malformed JSON correctly rejected:', malformedRes.error)

console.log('--- TEST 3: Validate Valid Backup Payload Schema ---')
const sampleValidBackup: TaskFlowyBackupData = {
  version: 1,
  exportedAt: new Date().toISOString(),
  profile: {
    name: 'Budi Santoso',
    role: 'Lead Architect',
    avatarEmoji: '⚡',
    defaultAssignee: 'Budi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  draftsStore: {
    drafts: [],
    rows: {},
  },
}

// Simulasi lingkungan tanpa window untuk testing schema parsing
const validRes = validateAndRestoreBackup(JSON.stringify(sampleValidBackup))
if (!validRes.success && validRes.error !== 'WINDOW_UNDEFINED_IN_TEST') {
  console.error('FAIL: Valid schema rejected unexpectedly:', validRes.error)
  process.exit(1)
}
console.log('✓ Valid backup payload schema confirmed.')
console.log('All profile store tests passed!')
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (file belum ada)**

Run: `npx tsx scripts/test-profile-store.ts` (dari folder `frontend`)
Expected: FAIL dengan `Cannot find module '../src/lib/profile-store'`

- [ ] **Step 3: Implementasikan `frontend/src/lib/profile-store.ts`**

Buat file `frontend/src/lib/profile-store.ts`:
```typescript
export interface UserProfile {
  name: string
  role: string
  avatarEmoji: string
  defaultAssignee: string
  createdAt: string
  updatedAt: string
}

export interface TaskFlowyBackupData {
  version: number
  exportedAt: string
  profile: UserProfile
  draftsStore: unknown
}

const PROFILE_STORAGE_KEY = 'taskflowy_user_profile'
const DRAFTS_STORAGE_KEY = 'taskflowy_drafts'

export const AVATAR_PRESETS = ['👤', '👨‍💻', '👩‍💻', '🚀', '⚡', '🎯', '🛠️', '📊']

export function getDefaultProfile(): UserProfile {
  return {
    name: 'Pengguna TaskFlowy',
    role: 'Project Manager',
    avatarEmoji: '👤',
    defaultAssignee: 'Saya',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function loadUserProfile(): UserProfile {
  if (typeof window === 'undefined') return getDefaultProfile()
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...getDefaultProfile(), ...parsed }
    }
  } catch (err) {
    console.error('Failed to parse user profile from localStorage:', err)
  }
  return getDefaultProfile()
}

export function saveUserProfile(updates: Partial<UserProfile>): UserProfile {
  if (typeof window === 'undefined') return { ...getDefaultProfile(), ...updates }
  try {
    const current = loadUserProfile()
    const updated: UserProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Failed to save user profile:', err)
    return getDefaultProfile()
  }
}

export function generateBackupData(): string {
  if (typeof window === 'undefined') return ''
  const profile = loadUserProfile()
  let draftsStore = { drafts: [], rows: {} }
  try {
    const rawDrafts = localStorage.getItem(DRAFTS_STORAGE_KEY)
    if (rawDrafts) draftsStore = JSON.parse(rawDrafts)
  } catch {
    // fallback
  }

  const backup: TaskFlowyBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    draftsStore,
  }
  return JSON.stringify(backup, null, 2)
}

export function validateAndRestoreBackup(jsonString: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonString) as TaskFlowyBackupData
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Format file backup tidak valid (bukan JSON object).' }
    }
    if (!parsed.profile || typeof parsed.profile.name !== 'string') {
      return { success: false, error: 'File backup tidak memiliki atribut profil yang valid.' }
    }
    if (!parsed.draftsStore || typeof parsed.draftsStore !== 'object') {
      return { success: false, error: 'File backup tidak memiliki riwayat draf proyek yang valid.' }
    }

    if (typeof window === 'undefined') {
      return { success: false, error: 'WINDOW_UNDEFINED_IN_TEST' }
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed.profile))
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(parsed.draftsStore))
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Gagal memproses file JSON backup: ' + String(err) }
  }
}
```

- [ ] **Step 4: Jalankan test untuk memverifikasi keberhasilan**

Run: `npx tsx scripts/test-profile-store.ts` (dari folder `frontend`)
Expected: Output `All profile store tests passed!`

- [ ] **Step 5: Commit perubahan Task 1**

```bash
git add frontend/src/lib/profile-store.ts frontend/scripts/test-profile-store.ts
git commit -m "feat(profile): add user profile store, schema, and backup engine"
```

---

### Task 2: Workspace Aggregator Engine & Hook

**Files:**
- Create: `frontend/src/lib/workspace-aggregator.ts`
- Create: `frontend/scripts/test-workspace-aggregator.ts`
- Create: `frontend/src/hooks/use-workspace.ts`

**Interfaces:**
- Consumes: `loadUserProfile` dari `@/lib/profile-store`, `useDrafts` dari `@/hooks/use-drafts`, `ParseRowState` dari `@/lib/schema`, `parseRows` dari `@/lib/parser/row-parser`
- Produces:
  ```typescript
  export interface AggregatedTask {
    projectId: string
    projectName: string
    rowId: string
    taskName: string
    assignee: string
    startDate: string
    endDate: string
    durationDays: number
    progress: number
    isUrgent: boolean // due in <= 3 days from reference
    isOverdue: boolean
  }

  export interface WorkspaceMetrics {
    totalProjects: number
    myActiveTasksCount: number
    urgentTasksCount: number
  }

  export function aggregateUserTasks(
    allProjectsRows: Record<string, ParseRowState[]>,
    projectMetaList: Array<{ id: string; name: string }>,
    targetAssignee: string,
    referenceDateStr: string
  ): { myTasks: AggregatedTask[]; metrics: WorkspaceMetrics }
  ```

- [ ] **Step 1: Tulis script test untuk workspace aggregator**

Buat file `frontend/scripts/test-workspace-aggregator.ts`:
```typescript
import { aggregateUserTasks } from '../src/lib/workspace-aggregator'
import type { ParseRowState } from '../src/lib/schema'

console.log('--- TEST 1: Cross-Project Task Aggregation ---')

const projectMeta = [
  { id: 'proj-1', name: 'Mobile App Redesign' },
  { id: 'proj-2', name: 'Cloud Migration' },
]

const rowsProj1: ParseRowState[] = [
  { id: 'r1', name: 'UI Mockups', assignee: 'Budi', start: '2026-09-07', duration: '3 hari', end: '2026-09-09' },
  { id: 'r2', name: 'API Design', assignee: 'Siti', start: '2026-09-10', duration: '4 hari', end: '2026-09-13' },
]

const rowsProj2: ParseRowState[] = [
  { id: 'r3', name: 'Database Setup', assignee: 'Budi', start: '2026-09-08', duration: '2 hari', end: '2026-09-09' },
]

const allRows: Record<string, ParseRowState[]> = {
  'proj-1': rowsProj1,
  'proj-2': rowsProj2,
}

const targetAssignee = 'Budi'
const refDate = '2026-09-06' // tasks ending on 2026-09-09 are within 3 days -> urgent!

const result = aggregateUserTasks(allRows, projectMeta, targetAssignee, refDate)

if (result.myTasks.length !== 2) {
  console.error(`FAIL: Expected 2 tasks for ${targetAssignee}, found: ${result.myTasks.length}`)
  process.exit(1)
}

if (result.metrics.totalProjects !== 2) {
  console.error(`FAIL: Expected 2 projects, found: ${result.metrics.totalProjects}`)
  process.exit(1)
}

if (result.metrics.urgentTasksCount !== 2) {
  console.error(`FAIL: Expected 2 urgent tasks, found: ${result.metrics.urgentTasksCount}`)
  process.exit(1)
}

console.log('✓ Aggregation correctly identified user tasks and urgency metrics.')
console.log('All workspace aggregator tests passed!')
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan**

Run: `npx tsx scripts/test-workspace-aggregator.ts` (dari folder `frontend`)
Expected: FAIL dengan `Cannot find module '../src/lib/workspace-aggregator'`

- [ ] **Step 3: Implementasikan `frontend/src/lib/workspace-aggregator.ts`**

Buat file `frontend/src/lib/workspace-aggregator.ts`:
```typescript
import type { ParseRowState } from './schema'
import { parseRows } from './parser/row-parser'

export interface AggregatedTask {
  projectId: string
  projectName: string
  rowId: string
  taskName: string
  assignee: string
  startDate: string
  endDate: string
  durationDays: number
  progress: number
  isUrgent: boolean
  isOverdue: boolean
}

export interface WorkspaceMetrics {
  totalProjects: number
  myActiveTasksCount: number
  urgentTasksCount: number
}

export function aggregateUserTasks(
  allProjectsRows: Record<string, ParseRowState[]>,
  projectMetaList: Array<{ id: string; name: string }>,
  targetAssignee: string,
  referenceDateStr: string
): { myTasks: AggregatedTask[]; metrics: WorkspaceMetrics } {
  const normTarget = targetAssignee.trim().toLowerCase()
  const refTime = new Date(referenceDateStr).getTime()
  const myTasks: AggregatedTask[] = []

  for (const meta of projectMetaList) {
    const rows = allProjectsRows[meta.id]
    if (!rows || rows.length === 0) continue

    const parsed = parseRows(
      rows.map(r => ({
        name: r.name,
        assignee: r.assignee || null,
        start: r.start,
        duration: r.duration || null,
        end: r.end || null,
      })),
      referenceDateStr
    )

    parsed.tasks.forEach((task, idx) => {
      const taskAssignee = task.assignee?.trim().toLowerCase() || ''
      const isAssigned = normTarget !== '' && (taskAssignee === normTarget || taskAssignee.includes(normTarget))

      if (isAssigned) {
        const endTime = new Date(task.end).getTime()
        const diffDays = Math.ceil((endTime - refTime) / (1000 * 60 * 60 * 24))
        const isOverdue = diffDays < 0
        const isUrgent = diffDays >= 0 && diffDays <= 3

        myTasks.push({
          projectId: meta.id,
          projectName: meta.name,
          rowId: rows[idx]?.id || task.id,
          taskName: task.name,
          assignee: task.assignee || '',
          startDate: task.start,
          endDate: task.end,
          durationDays: task.durationDays,
          progress: parseInt(rows[idx]?.progress || '0', 10),
          isUrgent,
          isOverdue,
        })
      }
    })
  }

  // Urutkan task berdasarkan tanggal selesai terdekat
  myTasks.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())

  const metrics: WorkspaceMetrics = {
    totalProjects: projectMetaList.length,
    myActiveTasksCount: myTasks.filter(t => t.progress < 100).length,
    urgentTasksCount: myTasks.filter(t => t.isUrgent && t.progress < 100).length,
  }

  return { myTasks, metrics }
}
```

- [ ] **Step 4: Buat hook `frontend/src/hooks/use-workspace.ts`**

Buat file `frontend/src/hooks/use-workspace.ts`:
```typescript
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { loadUserProfile, saveUserProfile, type UserProfile } from '@/lib/profile-store'
import { aggregateUserTasks, type AggregatedTask, type WorkspaceMetrics } from '@/lib/workspace-aggregator'
import { todayRef, type ParseRowState } from '@/lib/schema'

const DRAFTS_STORAGE_KEY = 'taskflowy_drafts'

interface DraftStoreState {
  drafts: Array<{ id: string; name: string; savedAt: string; taskCount: number }>
  rows: Record<string, ParseRowState[]>
}

export function useWorkspace() {
  const [profile, setProfile] = useState<UserProfile>(loadUserProfile())
  const [draftStore, setDraftStore] = useState<DraftStoreState>({ drafts: [], rows: {} })

  const refreshData = useCallback(() => {
    setProfile(loadUserProfile())
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(DRAFTS_STORAGE_KEY)
        if (raw) setDraftStore(JSON.parse(raw))
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = saveUserProfile(updates)
    setProfile(updated)
    return updated
  }, [])

  const { myTasks, metrics } = useMemo(() => {
    const ref = todayRef()
    return aggregateUserTasks(
      draftStore.rows,
      draftStore.drafts.map(d => ({ id: d.id, name: d.name })),
      profile.defaultAssignee || profile.name,
      ref
    )
  }, [draftStore, profile])

  return {
    profile,
    updateProfile,
    drafts: draftStore.drafts,
    allRows: draftStore.rows,
    myTasks,
    metrics,
    refreshData,
  }
}
```

- [ ] **Step 5: Jalankan test aggregator**

Run: `npx tsx scripts/test-workspace-aggregator.ts` (dari folder `frontend`)
Expected: Output `All workspace aggregator tests passed!`

- [ ] **Step 6: Commit perubahan Task 2**

```bash
git add frontend/src/lib/workspace-aggregator.ts frontend/scripts/test-workspace-aggregator.ts frontend/src/hooks/use-workspace.ts
git commit -m "feat(workspace): create workspace aggregator engine and useWorkspace hook"
```

---

### Task 3: Profile Card & Backup Control UI

**Files:**
- Create: `frontend/src/components/profile/profile-card.tsx`

**Interfaces:**
- Consumes: `UserProfile`, `AVATAR_PRESETS`, `generateBackupData`, `validateAndRestoreBackup` dari `@/lib/profile-store`, `WorkspaceMetrics` dari `@/lib/workspace-aggregator`
- Produces:
  ```typescript
  export function ProfileCard({
    profile,
    metrics,
    onProfileChange,
    onDataRestored,
  }: {
    profile: UserProfile
    metrics: WorkspaceMetrics
    onProfileChange: (updates: Partial<UserProfile>) => void
    onDataRestored: () => void
  }): JSX.Element
  ```

- [ ] **Step 1: Implementasikan komponen `ProfileCard`**

Buat file `frontend/src/components/profile/profile-card.tsx`:
```tsx
'use client'

import React, { useState, useRef } from 'react'
import { UserProfile, AVATAR_PRESETS, generateBackupData, validateAndRestoreBackup } from '@/lib/profile-store'
import type { WorkspaceMetrics } from '@/lib/workspace-aggregator'
import { Download, Upload, Check, AlertCircle, Edit2, ShieldCheck, FolderKanban, CheckSquare, Clock } from 'lucide-react'

interface ProfileCardProps {
  profile: UserProfile
  metrics: WorkspaceMetrics
  onProfileChange: (updates: Partial<UserProfile>) => void
  onDataRestored: () => void
}

export function ProfileCard({ profile, metrics, onProfileChange, onDataRestored }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [role, setRole] = useState(profile.role)
  const [defaultAssignee, setDefaultAssignee] = useState(profile.defaultAssignee)
  const [selectedEmoji, setSelectedEmoji] = useState(profile.avatarEmoji)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    onProfileChange({
      name: name.trim() || 'Pengguna TaskFlowy',
      role: role.trim() || 'Project Manager',
      defaultAssignee: defaultAssignee.trim() || name.trim(),
      avatarEmoji: selectedEmoji,
    })
    setIsEditing(false)
    setFeedbackMsg({ type: 'success', text: 'Profil berhasil diperbarui!' })
    setTimeout(() => setFeedbackMsg(null), 3000)
  }

  const handleDownloadBackup = () => {
    const jsonStr = generateBackupData()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `taskflowy-backup-${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
    setFeedbackMsg({ type: 'success', text: 'Pencadangan data JSON berhasil diunduh!' })
    setTimeout(() => setFeedbackMsg(null), 3000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = validateAndRestoreBackup(content)
      if (result.success) {
        setFeedbackMsg({ type: 'success', text: 'Data berhasil dipulihkan dari backup!' })
        onDataRestored()
      } else {
        setFeedbackMsg({ type: 'error', text: result.error || 'Gagal memulihkan backup.' })
      }
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-5 p-5 bg-surface border border-border rounded-xl shadow-sm text-text-primary">
      {/* Header Info */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-surface-hi border-2 border-primary/40 flex items-center justify-center text-2xl shadow-inner select-none">
            {profile.avatarEmoji}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate leading-tight">{profile.name}</h2>
          <p className="text-xs text-muted truncate mt-0.5">{profile.role}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              PIC: {profile.defaultAssignee}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(v => !v)}
          className="p-1.5 rounded-lg border border-border hover:bg-surface-hi text-muted hover:text-text-primary transition-colors"
          title="Edit Profil"
        >
          <Edit2 size={13} />
        </button>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 p-3.5 bg-surface-hi/50 rounded-lg border border-border/80 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Avatar Preset</label>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_PRESETS.map(emoji => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-transform ${
                    selectedEmoji === emoji ? 'bg-primary/20 border border-primary scale-110' : 'hover:bg-surface-hi'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-0.5">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-0.5">Role / Jabatan</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-0.5">
              Nama di Kolom Assignee (PIC)
              <span className="block text-[10px] text-muted font-normal">Digunakan untuk auto-filter tugas Anda di seluruh linimasa.</span>
            </label>
            <input
              type="text"
              value={defaultAssignee}
              onChange={e => setDefaultAssignee(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 rounded border border-border text-muted hover:text-text-primary"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-3 py-1"
            >
              Simpan
            </button>
          </div>
        </form>
      )}

      {/* 3 Live Metric Badges */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-surface-hi/40 rounded-lg border border-border flex flex-col items-center justify-center text-center">
          <FolderKanban size={15} className="text-primary mb-1" />
          <span className="text-lg font-bold leading-tight">{metrics.totalProjects}</span>
          <span className="text-[10px] text-muted leading-tight mt-0.5">Proyek</span>
        </div>

        <div className="p-3 bg-surface-hi/40 rounded-lg border border-border flex flex-col items-center justify-center text-center">
          <CheckSquare size={15} className="text-emerald-500 mb-1" />
          <span className="text-lg font-bold leading-tight">{metrics.myActiveTasksCount}</span>
          <span className="text-[10px] text-muted leading-tight mt-0.5">Tugas Saya</span>
        </div>

        <div className="p-3 bg-surface-hi/40 rounded-lg border border-border flex flex-col items-center justify-center text-center">
          <Clock size={15} className={`mb-1 ${metrics.urgentTasksCount > 0 ? 'text-amber-500' : 'text-muted'}`} />
          <span className={`text-lg font-bold leading-tight ${metrics.urgentTasksCount > 0 ? 'text-amber-500' : ''}`}>
            {metrics.urgentTasksCount}
          </span>
          <span className="text-[10px] text-muted leading-tight mt-0.5">Mendesak (&le;3h)</span>
        </div>
      </div>

      {/* Safety & Backup Controls */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-2 font-medium">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Keamanan Data Browser</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1.5"
            title="Download cadangan semua proyek dan profil"
          >
            <Download size={12} />
            <span>Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1.5"
            title="Pulihkan data dari file cadangan JSON"
          >
            <Upload size={12} />
            <span>Restore JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 p-2.5 rounded-lg text-xs transition-opacity ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          {feedbackMsg.type === 'success' ? <Check size={13} /> : <AlertCircle size={13} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit perubahan Task 3**

```bash
git add frontend/src/components/profile/profile-card.tsx
git commit -m "feat(profile): implement ProfileCard with live metrics and JSON backup controls"
```

---

### Task 4: Workspace Tab Views (My Projects & My Assigned Tasks)

**Files:**
- Create: `frontend/src/components/profile/projects-tab.tsx`
- Create: `frontend/src/components/profile/my-tasks-tab.tsx`

**Interfaces:**
- Consumes: `DraftMeta` dari `@/hooks/use-drafts`, `AggregatedTask` dari `@/lib/workspace-aggregator`, `tasksToCSV`, `downloadCSV` dari `@/lib/csv-export`
- Produces:
  ```typescript
  export function ProjectsTab({
    drafts,
    currentDraftId,
    onOpenProject,
    onDeleteProject,
  }: ProjectsTabProps): JSX.Element

  export function MyTasksTab({
    tasks,
    onSelectTask,
  }: MyTasksTabProps): JSX.Element
  ```

- [ ] **Step 1: Implementasikan komponen `ProjectsTab`**

Buat file `frontend/src/components/profile/projects-tab.tsx`:
```tsx
'use client'

import React from 'react'
import { FolderKanban, ArrowRight, Trash2, Calendar, CheckCircle2 } from 'lucide-react'
import type { DraftMeta } from '@/hooks/use-drafts'

interface ProjectsTabProps {
  drafts: DraftMeta[]
  currentDraftId: string | null
  onOpenProject: (id: string) => void
  onDeleteProject: (id: string) => void
}

export function ProjectsTab({ drafts, currentDraftId, onOpenProject, onDeleteProject }: ProjectsTabProps) {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-surface-hi/20">
        <FolderKanban size={36} className="text-muted/60 mb-2.5" />
        <h3 className="text-sm font-medium text-text-primary">Belum ada linimasa tersimpan</h3>
        <p className="text-xs text-muted max-w-sm mt-1">
          Buat linimasa di workbench dan simpan draf agar otomatis muncul di sini.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft) => {
        const isCurrent = draft.id === currentDraftId
        const savedDate = new Date(draft.savedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div
            key={draft.id}
            className={`flex items-center justify-between p-3.5 bg-surface border rounded-xl transition-all ${
              isCurrent ? 'border-primary/50 shadow-sm bg-primary/5' : 'border-border hover:border-border/80'
            }`}
          >
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-text-primary truncate">{draft.name}</h4>
                {isCurrent && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium flex items-center gap-1">
                    <CheckCircle2 size={10} /> Aktif di Editor
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted mt-1">
                <span>{draft.taskCount} tugas</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {savedDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenProject(draft.id)}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                <span>Buka</span>
                <ArrowRight size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Hapus linimasa "${draft.name}"?`)) {
                    onDeleteProject(draft.id)
                  }
                }}
                className="p-1.5 rounded-lg border border-border text-muted hover:text-rose-500 hover:border-rose-500/30 transition-colors"
                title="Hapus Proyek"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Implementasikan komponen `MyTasksTab`**

Buat file `frontend/src/components/profile/my-tasks-tab.tsx`:
```tsx
'use client'

import React from 'react'
import { CheckSquare, Calendar, AlertTriangle, ArrowUpRight } from 'lucide-react'
import type { AggregatedTask } from '@/lib/workspace-aggregator'

interface MyTasksTabProps {
  tasks: AggregatedTask[]
  onSelectTask: (projectId: string, taskName: string) => void
}

export function MyTasksTab({ tasks, onSelectTask }: MyTasksTabProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-surface-hi/20">
        <CheckSquare size={36} className="text-muted/60 mb-2.5" />
        <h3 className="text-sm font-medium text-text-primary">Tidak ada tugas aktif yang di-assign</h3>
        <p className="text-xs text-muted max-w-sm mt-1">
          Pastikan nama pada kolom Assignee di tabel linimasa cocok dengan nama profil atau PIC Anda.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {tasks.map((task) => (
        <div
          key={`${task.projectId}-${task.rowId}`}
          className={`flex items-center justify-between p-3 bg-surface border rounded-xl transition-all ${
            task.isUrgent
              ? 'border-amber-500/40 bg-amber-500/5'
              : task.isOverdue
              ? 'border-rose-500/40 bg-rose-500/5'
              : 'border-border hover:border-border/80'
          }`}
        >
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">{task.taskName}</span>
              {task.isOverdue ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-medium flex items-center gap-1">
                  <AlertTriangle size={10} /> Terlewat
                </span>
              ) : task.isUrgent ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium flex items-center gap-1">
                  <AlertTriangle size={10} /> Segera Selesai
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted mt-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-surface-hi text-text-primary font-medium text-[10px]">
                {task.projectName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {task.startDate} s/d {task.endDate} ({task.durationDays} hari)
              </span>
              <span>• Progres: {task.progress}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTask(task.projectId, task.taskName)}
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
            title="Buka proyek dan lihat tugas ini di Gantt chart"
          >
            <span>Lihat</span>
            <ArrowUpRight size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit perubahan Task 4**

```bash
git add frontend/src/components/profile/projects-tab.tsx frontend/src/components/profile/my-tasks-tab.tsx
git commit -m "feat(profile): implement ProjectsTab and MyTasksTab components"
```

---

### Task 5: Modal Dashboard & Top Navbar Integration

**Files:**
- Create: `frontend/src/components/profile/profile-dashboard-modal.tsx`
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `useWorkspace` dari `@/hooks/use-workspace`, `ProfileCard`, `ProjectsTab`, `MyTasksTab`
- Produces: Integrated modal overlay triggered by profile button in top navbar.

- [ ] **Step 1: Implementasikan komponen modal `ProfileDashboardModal`**

Buat file `frontend/src/components/profile/profile-dashboard-modal.tsx`:
```tsx
'use client'

import React, { useState } from 'react'
import { X, FolderKanban, CheckSquare } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import { ProfileCard } from './profile-card'
import { ProjectsTab } from './projects-tab'
import { MyTasksTab } from './my-tasks-tab'

interface ProfileDashboardModalProps {
  isOpen: boolean
  currentDraftId: string | null
  onClose: () => void
  onOpenProject: (id: string) => void
  onSelectTask: (projectId: string, taskName: string) => void
  onDeleteProject: (id: string) => void
}

export function ProfileDashboardModal({
  isOpen,
  currentDraftId,
  onClose,
  onOpenProject,
  onSelectTask,
  onDeleteProject,
}: ProfileDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects')
  const { profile, updateProfile, drafts, myTasks, metrics, refreshData } = useWorkspace()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hi/20">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Workspace & Profil Pengguna</h2>
            <p className="text-xs text-muted">Pusat kendali linimasa pribadi dan pemantauan tugas aktif.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-hi text-muted hover:text-text-primary transition-colors"
            aria-label="Tutup Dashboard"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content: 2-Column Split Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Kolom Kiri: Profil & Kontrol (md: col-span-5) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <ProfileCard
              profile={profile}
              metrics={metrics}
              onProfileChange={updateProfile}
              onDataRestored={() => {
                refreshData()
              }}
            />
          </div>

          {/* Kolom Kanan: Tabbed Views (md: col-span-7) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 p-1 bg-surface-hi/40 border border-border rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'projects'
                    ? 'bg-surface text-primary shadow-sm border border-border/80'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                <FolderKanban size={14} />
                <span>Linimasa Saya ({drafts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-surface text-primary shadow-sm border border-border/80'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                <CheckSquare size={14} />
                <span>Tugas Saya ({myTasks.length})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'projects' ? (
                <ProjectsTab
                  drafts={drafts}
                  currentDraftId={currentDraftId}
                  onOpenProject={(id) => {
                    onOpenProject(id)
                    onClose()
                  }}
                  onDeleteProject={(id) => {
                    onDeleteProject(id)
                    refreshData()
                  }}
                />
              ) : (
                <MyTasksTab
                  tasks={myTasks}
                  onSelectTask={(projectId, taskName) => {
                    onSelectTask(projectId, taskName)
                    onClose()
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modifikasi `frontend/src/app/page.tsx` untuk menghubungkan Profile Modal**

Tambahkan tombol Profil di samping `ThemeToggle` pada header `frontend/src/app/page.tsx`, serta sambungkan state `isProfileOpen` untuk membuka modal dashboard.

Di `frontend/src/app/page.tsx`:
1. Import `ProfileDashboardModal`:
   ```tsx
   import { ProfileDashboardModal } from '@/components/profile/profile-dashboard-modal'
   import { loadUserProfile } from '@/lib/profile-store'
   ```
2. Tambahkan state `isProfileOpen`:
   ```tsx
   const [isProfileOpen, setIsProfileOpen] = useState(false)
   const [headerProfile, setHeaderProfile] = useState({ name: 'Pengguna', avatarEmoji: '👤' })
   ```
3. Tambahkan `useEffect` untuk membaca avatar header saat mount dan event storage.
4. Tambahkan tombol trigger profil tepat sebelum `<ThemeToggle />`:
   ```tsx
   <button
     onClick={() => setIsProfileOpen(true)}
     className="btn-secondary text-[11px] h-7 gap-1.5 px-2"
     title="Buka Workspace & Profil Saya"
   >
     <span>{headerProfile.avatarEmoji}</span>
     <span className="hidden sm:inline font-medium">{headerProfile.name}</span>
   </button>
   ```
5. Render `<ProfileDashboardModal>` di level terluar JSX:
   ```tsx
   <ProfileDashboardModal
     isOpen={isProfileOpen}
     currentDraftId={currentDraftId}
     onClose={() => {
       setIsProfileOpen(false)
       setHeaderProfile(loadUserProfile())
     }}
     onOpenProject={(id) => {
       restoreDraft(id)
     }}
     onSelectTask={(projectId, taskName) => {
       restoreDraft(projectId)
       setFocusTaskName(taskName)
     }}
     onDeleteProject={(id) => {
       deleteDraft(id)
       refreshDrafts()
     }}
   />
   ```

- [ ] **Step 3: Uji build aplikasi frontend untuk memverifikasi tidak ada lint / type error**

Run: `npm run build` (dari folder `frontend`)
Expected: Build sukses tanpa error TypeScript / compile Next.js.

- [ ] **Step 4: Commit perubahan Task 5**

```bash
git add frontend/src/components/profile/profile-dashboard-modal.tsx frontend/src/app/page.tsx
git commit -m "feat(profile): integrate ProfileDashboardModal into top navbar"
```

---

## Verification Plan

### Automated Tests
Jalankan script verifikasi mandiri yang telah disiapkan:
```bash
cd frontend
npx tsx scripts/test-profile-store.ts
npx tsx scripts/test-workspace-aggregator.ts
npm run lint
npm run build
```

### Manual Verification
1. **Buka Dashboard**: Klik tombol avatar pengguna di sebelah kanan atas navbar. Pastikan modal *The Lean Operator* terbuka dengan transisi halus.
2. **Ubah Profil**: Klik tombol edit di Profile Card, ganti nama (misal: "Budi") dan role, lalu simpan. Periksa apakah inisial/avatar di top navbar ikut terupdate.
3. **Validasi Tugas Saya**: Buat linimasa di editor dengan task yang PIC-nya berisi nama profil ("Budi"). Simpan linimasa. Buka kembali dashboard tab "Tugas Saya" dan pastikan tugas muncul dengan status due date yang akurat.
4. **Backup & Restore**: Klik "Backup JSON", simpan file hasil download. Ubah profil menjadi nama sembarang. Kemudian klik "Restore JSON" dan pilih file tadi; pastikan profil dan proyek kembali utuh.
