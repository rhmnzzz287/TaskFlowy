'use client'

import type { ParseRowState } from '@/lib/schema'
import { parseRawText } from '@/lib/format/raw-text'

interface Template {
  name: string
  label: string
  rows: ParseRowState[]
}

const templates: Template[] = [
  {
    name: 'software-sprint',
    label: 'Software Sprint (2 Minggu)',
    rows: parseRawText(`Task | Lead | Start | Durasi | Ket
Sprint Planning | Scrum Master | besok | 1 hari | |
Desain UI | Andi | besok | 3 hari | |
Backend API | Budi | 10 Sep 2026 | 5 hari | |
Frontend Integration | Cici | 12 Sep 2026 | 4 hari | |
Testing | Andi | | 2 hari | 18 Sep 2026
Sprint Review | Semua | 18 Sep 2026 | 1 hari | |`),
  },
  {
    name: 'marketing',
    label: 'Marketing Campaign',
    rows: parseRawText(`Task | Lead | Start | Durasi
Brief & Riset | Tini | besok | 2 hari
Copywriting | Tini | 10 Sep | 3 hari
Desain Visual | Rudi | 10 Sep | 4 hari
Video Produksi | Rudi | 13 Sep | 3 hari
Review & Approval | Tini | 15 Sep | 1 hari
Launch | Semua | 16 Sep | 1 hari`),
  },
  {
    name: 'event',
    label: 'Event Organizer Timeline',
    rows: parseRawText(`Task | PIC | Start | Durasi
Cari Venue | Andi | besok | 3 hari
Daftar Sponsor | Budi | 10 Sep | 5 hari
Desain Booth | Cici | | 4 hari | 15 Sep
Promosi Tiket | Dina | 12 Sep | 7 hari
Hari-H Acara | Semua | 20 Sep | 1 hari
Evaluasi | Andi | 21 Sep | 1 hari`),
  },
]

interface Props {
  onSelect: (rows: ParseRowState[]) => void
}

export function TemplatePicker({ onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted text-[11px] whitespace-nowrap">Template:</span>
      {templates.map(t => (
        <button
          key={t.name}
          onClick={() => onSelect(t.rows)}
          className="btn-secondary text-[11px]"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export { templates }