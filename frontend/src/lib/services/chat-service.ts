import type { IChatService } from './types'
import type { ChatMessage } from '@/types/chat'
import { getMessages, saveMessage } from './mock-storage'
import { cryptoRandomId } from './helpers'

const BUS_NAME = 'taskflowy_chat_bus'

export const chatService: IChatService = {
  async getMessages(projectId: string) {
    await new Promise(r => setTimeout(r, 100))
    return getMessages(projectId)
  },

  async sendMessage(projectId: string, message: string, senderName: string) {
    await new Promise(r => setTimeout(r, 50))
    const msg: ChatMessage = {
      id: cryptoRandomId('c'),
      projectId,
      senderId: '', // set by caller
      senderName,
      message,
      createdAt: new Date().toISOString(),
    }
    saveMessage(msg)
    // Broadcast to other tabs
    try {
      const bus = new BroadcastChannel(BUS_NAME)
      bus.postMessage({ type: 'chat', payload: msg })
    } catch { /* tab-to-tab broadcast not critical */ }
    return msg
  },

  subscribe(projectId: string, onMessage: (msg: ChatMessage) => void) {
    try {
      const bus = new BroadcastChannel(BUS_NAME)
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'chat' && e.data?.payload?.projectId === projectId) {
          onMessage(e.data.payload)
        }
      }
      bus.addEventListener('message', handler)
      return () => bus.close()
    } catch {
      return () => {}
    }
  },

  broadcastPresence(projectId: string) {
    try {
      const bus = new BroadcastChannel(BUS_NAME)
      bus.postMessage({ type: 'presence', projectId })
    } catch { /* silent */ }
  },
}