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