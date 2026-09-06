import type { User } from '@/types/auth'
import type { Project, ProjectMember } from '@/types/project'
import type { ChatMessage } from '@/types/chat'

export const demoUsers: User[] = [
  {
    id: 'u-demo-owner',
    email: 'owner@taskflowy.dev',
    name: 'Demo Owner',
    avatarUrl: '',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'u-demo-member',
    email: 'member@taskflowy.dev',
    name: 'Demo Member',
    avatarUrl: '',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
]

export const demoProjects: Project[] = [
  {
    id: 'p-mvp',
    name: 'MVP Launch',
    description: 'Koordinasi peluncuran versi pertama produk.',
    inviteCode: 'ABCD-1234',
    ownerId: 'u-demo-owner',
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    members: [],
  },
  {
    id: 'p-design',
    name: 'Design System',
    description: 'Perancangan sistem desain multi-brand.',
    inviteCode: 'WXYZ-9876',
    ownerId: 'u-demo-member',
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    members: [],
  },
]

export const demoMembers: ProjectMember[] = [
  {
    id: 'm-1',
    userId: 'u-demo-owner',
    projectId: 'p-mvp',
    role: 'owner',
    joinedAt: '2026-09-02T00:00:00.000Z',
    name: 'Demo Owner',
    email: 'owner@taskflowy.dev',
  },
  {
    id: 'm-2',
    userId: 'u-demo-member',
    projectId: 'p-mvp',
    role: 'member',
    joinedAt: '2026-09-02T01:00:00.000Z',
    name: 'Demo Member',
    email: 'member@taskflowy.dev',
  },
  {
    id: 'm-3',
    userId: 'u-demo-member',
    projectId: 'p-design',
    role: 'owner',
    joinedAt: '2026-09-03T00:00:00.000Z',
    name: 'Demo Member',
    email: 'member@taskflowy.dev',
  },
]

export const demoMessages: ChatMessage[] = [
  {
    id: 'c-1',
    projectId: 'p-mvp',
    senderId: 'u-demo-owner',
    senderName: 'Demo Owner',
    message: 'Selamat datang di MVP Launch. Mari kita mulai!',
    createdAt: '2026-09-02T08:00:00.000Z',
  },
  {
    id: 'c-2',
    projectId: 'p-mvp',
    senderId: 'u-demo-member',
    senderName: 'Demo Member',
    message: 'Siap, saya sudah lihat task listnya.',
    createdAt: '2026-09-02T08:05:00.000Z',
  },
]

export function buildSeedState() {
  // Attach members to their projects
  const projects = demoProjects.map(p => ({
    ...p,
    members: demoMembers.filter(m => m.projectId === p.id),
  }))
  return { users: demoUsers, projects, members: demoMembers, messages: demoMessages }
}