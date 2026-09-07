'use client'

import { useEffect } from 'react'
import { initTelemetry, setTelemetryContext } from '@/lib/telemetry'
import { loadUserProfile } from '@/lib/profile-store'

/** Mount once in root layout: installs global error/rejection capture. */
export function TelemetryInit() {
  useEffect(() => {
    initTelemetry()
    try {
      const p = loadUserProfile()
      setTelemetryContext({ userName: p.name })
    } catch { /* profile unreadable — context stays empty */ }
  }, [])
  return null
}
