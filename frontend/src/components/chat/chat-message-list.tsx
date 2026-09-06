'use client'

import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@/types/chat'
import { useAuth } from '@/contexts/auth-context'

interface Props {
  messages: ChatMessage[]
}

export function ChatMessageList({ messages }: Props) {
  const { user } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-[12px] px-4 text-center">
        Belum ada pesan. Mulai percakapan!
      </div>
    )
  }

  // Group consecutive messages from same sender
  const grouped: { sender: string; senderId: string; messages: ChatMessage[] }[] = []
  messages.forEach(msg => {
    const last = grouped[grouped.length - 1]
    if (last && last.senderId === msg.senderId) {
      last.messages.push(msg)
    } else {
      grouped.push({ sender: msg.senderName, senderId: msg.senderId, messages: [msg] })
    }
  })

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
      {grouped.map((g, gi) => {
        const isMe = g.senderId === user?.id
        return (
          <div key={gi} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            <span className="text-[11px] text-muted mb-0.5 px-1">{isMe ? 'Kamu' : g.sender}</span>
            <div className="flex flex-col gap-1 max-w-[80%]">
              {g.messages.map(m => (
                <div key={m.id}
                  className={`px-3 py-1.5 rounded-lg text-[13px] leading-relaxed ${
                    isMe
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-surface-hi text-text-primary rounded-bl-sm'
                  }`}>
                  {m.message}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}