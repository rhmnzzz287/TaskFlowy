'use client'

import { useState, useEffect } from 'react'

/** Reactive `navigator.onLine` (+1s debounce on reconnect to let routes settle). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    () => typeof navigator === 'undefined' || navigator.onLine,
  )

  useEffect(() => {
    const toOffline = () => setOnline(false)
    const toOnline = () => {
      // Brief grace period: backend session/proxy may lag behind the radio.
      const t = setTimeout(() => setOnline(true), 1000)
      return t
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const onOnline = () => { timer = toOnline() }
    window.addEventListener('offline', toOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', toOffline)
      window.removeEventListener('online', onOnline)
      if (timer) clearTimeout(timer)
    }
  }, [])

  return online
}
