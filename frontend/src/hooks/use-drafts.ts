'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ParseRowState } from '@/lib/schema'

const STORAGE_KEY = 'taskflowy_drafts'
const MAX_DRAFTS = 5

export interface DraftMeta {
  id: string
  name: string
  savedAt: string
  taskCount: number
}

interface DraftStore {
  drafts: DraftMeta[]
  rows: Record<string, ParseRowState[]>
}

function loadStore(): DraftStore {
  if (typeof window === 'undefined') return { drafts: [], rows: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { drafts: [], rows: {} }
}

function saveStore(store: DraftStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch { /* quota */ }
}

export function useDrafts() {
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)

  useEffect(() => {
    const store = loadStore()
    // auto-select latest draft
    if (store.drafts.length > 0 && !currentDraftId) {
      setCurrentDraftId(store.drafts[0].id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = useCallback((rows: ParseRowState[]) => {
    const store = loadStore()
    const id = currentDraftId || crypto.randomUUID().slice(0, 8)
    const name = rows.find(r => r.name.trim())?.name.trim().slice(0, 40) || 'Untitled'
    const existing = store.drafts.find(d => d.id === id)
    const meta: DraftMeta = {
      id,
      name: existing ? existing.name : name,
      savedAt: new Date().toISOString(),
      taskCount: rows.length,
    }
    if (existing) {
      Object.assign(existing, meta)
    } else {
      store.drafts.unshift(meta)
      if (store.drafts.length > MAX_DRAFTS) {
        const removed = store.drafts.pop()!
        delete store.rows[removed.id]
      }
    }
    store.rows[id] = rows
    saveStore(store)
    setCurrentDraftId(id)
  }, [currentDraftId])

  const loadDraft = useCallback((id: string): ParseRowState[] | null => {
    const store = loadStore()
    const rows = store.rows[id]
    if (rows) setCurrentDraftId(id)
    return rows || null
  }, [])

  const deleteDraft = useCallback((id: string) => {
    const store = loadStore()
    store.drafts = store.drafts.filter(d => d.id !== id)
    delete store.rows[id]
    saveStore(store)
    if (currentDraftId === id) setCurrentDraftId(store.drafts[0]?.id || null)
  }, [currentDraftId])

  const listDrafts = useCallback((): DraftMeta[] => {
    return loadStore().drafts
  }, [])

  return { currentDraftId, setCurrentDraftId, saveDraft, loadDraft, deleteDraft, listDrafts }
}