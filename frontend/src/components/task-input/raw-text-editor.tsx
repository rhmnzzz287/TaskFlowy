'use client'

import { useState, useEffect } from 'react'
import { FileText, Wand2, AlertTriangle } from 'lucide-react'

interface Props {
  value: string
  onChange: (text: string) => void
  onParse: () => void
}

const PLACEHOLDER = `Task | PIC | Start | Duration | End
Desain UI | Andi | besok | 3 hari |
Implementasi | Budi | 10 Sep 2026 | | 15 Sep 2026
Testing | Cici | | 2 hari |
Launch | | 20 Sep 2026 | |`

export function RawTextEditor({ value, onChange, onParse }: Props) {
  const [local, setLocal] = useState(value)

  // Keep local editor state in sync when value changes externally
  // (e.g. template selection, table-mode sync, URL restore).
  useEffect(() => { setLocal(value) }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setLocal(v)
    onChange(v)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onParse()
    }
  }

  const prettify = () => {
    const lines = local.split('\n').map(l => l.trim()).filter(Boolean)
    const cleaned = lines.map(line => {
      // Normalise multiple spaces between pipe-separated columns
      return line.replace(/\s*\|\s*/g, ' | ').replace(/\s+/g, ' ')
    })
    onChange(cleaned.join('\n'))
    setLocal(cleaned.join('\n'))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted text-[11px] font-medium uppercase tracking-wider">
          Mode Raw Text
        </span>
        <button
          onClick={prettify}
          className="flex items-center gap-1 text-primary hover:text-primary-hover text-[12px] font-medium transition-colors"
          title="Prettify table alignment"
        >
          <Wand2 size={12} /> Rapikan Teks
        </button>
      </div>
      <textarea
        value={local}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        rows={12}
        className="w-full bg-surface-dim/50 border border-border rounded px-3 py-2 font-mono text-[12px] text-text-primary placeholder:text-muted outline-none focus:ring-1 focus:ring-primary transition-shadow resize-y"
        placeholder={PLACEHOLDER}
      />
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-muted text-[11px]">
          <AlertTriangle size={11} /> Gunakan tanda pipa (|) atau tab. Jalankan dengan Cmd/Ctrl+Enter.
        </p>
        <button className="btn-primary text-[12px]" onClick={onParse}>
          <FileText size={13} /> Parse ke Gantt
        </button>
      </div>
    </div>
  )
}