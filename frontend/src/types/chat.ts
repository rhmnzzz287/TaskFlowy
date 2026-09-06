export interface ChatMessage {
  id: string
  projectId: string
  senderId: string
  senderName: string
  message: string
  createdAt: string
}

export interface PresenceUser {
  userId: string
  name: string
  projectId: string
  lastSeen: string
}

export interface ChatState {
  messages: ChatMessage[]
  presence: PresenceUser[]
  isLoading: boolean
  error: string | null
}