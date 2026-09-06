import { User, Code, Terminal, Rocket, Zap, Target, Wrench, BarChart3, type LucideIcon } from 'lucide-react'
import type { AvatarIconKey } from '@/lib/profile-store'

const AVATAR_ICON_MAP: Record<AvatarIconKey, LucideIcon> = {
  user: User,
  code: Code,
  terminal: Terminal,
  rocket: Rocket,
  zap: Zap,
  target: Target,
  wrench: Wrench,
  chart: BarChart3,
}

function isAvatarIconKey(value: string): value is AvatarIconKey {
  return (Object.keys(AVATAR_ICON_MAP) as string[]).includes(value)
}

/** User avatar rendered as a real Lucide icon (project is emoji-free).
 *  Legacy emoji values persisted before the migration degrade to User. */
export function AvatarIcon({ iconKey, size = 16, className }: { iconKey: string; size?: number; className?: string }) {
  const Icon = isAvatarIconKey(iconKey) ? AVATAR_ICON_MAP[iconKey] : User
  return <Icon size={size} className={className} aria-hidden="true" />
}
