export interface UserProfile {
  name: string
  role: string
  avatarIcon: AvatarIconKey
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

export const AVATAR_ICON_KEYS = ['user', 'code', 'terminal', 'rocket', 'zap', 'target', 'wrench', 'chart'] as const
export type AvatarIconKey = (typeof AVATAR_ICON_KEYS)[number]
/** Legacy emoji values stored before the icon migration fall back to 'user' at render. */
export const AVATAR_PRESETS = AVATAR_ICON_KEYS

export function getDefaultProfile(): UserProfile {
  return {
    name: 'Pengguna TaskFlowy',
    role: 'Project Manager',
    avatarIcon: 'user',
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