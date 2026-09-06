'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string) => Promise<void>
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSend(trimmed)
      setText('')
    } catch {} finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border px-3 py-2 shrink-0">
      <input
        className="cell-input flex-1 text-[13px]"
        placeholder="Ketik pesan…"
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={disabled || sending}
        autoFocus
      />
      <button type="submit" disabled={!text.trim() || sending || disabled}
        className="p-2 rounded bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40">
        <Send size={14} />
      </button>
    </form>
  )
}