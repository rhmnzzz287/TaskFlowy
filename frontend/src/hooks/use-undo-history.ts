'use client'

import { useState, useCallback, useRef } from 'react'
import type { TimelineTask, ParseRowState } from '@/lib/schema'

export interface UndoSnapshot {
  label: string
  tasks: TimelineTask[]
  inputRows: ParseRowState[]
  at: number
}

const MAX_HISTORY = 25
/** Gantt drags commit repeatedly mid-gesture — coalesce pushes inside this window. */
const COALESCE_MS = 1500

/**
 * Bounded undo stack for local task mutations (delete, bulk shift, import,
 * template swap, inspector save, drag). Callers push the PRE-mutation state;
 * `undo()` pops and returns it for re-application. Toast UI lives with the
 * caller. Stack lives in a ref (synchronous, StrictMode-safe); `depth`
 * state only drives `canUndo` rendering.
 */
export function useUndoHistory() {
  const stackRef = useRef<UndoSnapshot[]>([])
  const lastPushAt = useRef(0)
  const [depth, setDepth] = useState(0)

  const push = useCallback((label: string, tasks: TimelineTask[], inputRows: ParseRowState[]) => {
    lastPushAt.current = Date.now()
    stackRef.current = [...stackRef.current.slice(-(MAX_HISTORY - 1)), { label, tasks, inputRows, at: Date.now() }]
    setDepth(stackRef.current.length)
  }, [])

  /** Coalesced push for high-frequency commits (Gantt drag). Keeps the
   *  pre-gesture snapshot so one Undo reverts the whole drag. */
  const pushCoalesced = useCallback((label: string, tasks: TimelineTask[], inputRows: ParseRowState[]) => {
    if (Date.now() - lastPushAt.current < COALESCE_MS) return
    lastPushAt.current = Date.now()
    stackRef.current = [...stackRef.current.slice(-(MAX_HISTORY - 1)), { label, tasks, inputRows, at: Date.now() }]
    setDepth(stackRef.current.length)
  }, [])

  const undo = useCallback((): UndoSnapshot | null => {
    const top = stackRef.current[stackRef.current.length - 1] ?? null
    if (!top) return null
    stackRef.current = stackRef.current.slice(0, -1)
    setDepth(stackRef.current.length)
    return top
  }, [])

  const peekLabel = useCallback((): string | null => {
    return stackRef.current[stackRef.current.length - 1]?.label ?? null
  }, [])

  return { push, pushCoalesced, undo, peekLabel, canUndo: depth > 0, depth }
}
