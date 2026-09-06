'use client'

import type { ParseRowState } from '@/lib/schema'
import { createRowId, todayRef } from '@/lib/schema'
import { formatDateISO } from '@/lib/parser/date-grammar'

export interface Template {
  name: string
  label: string
  description?: string
  rows: ParseRowState[]
}

function offsetDate(baseDateStr: string, days: number): string {
  const d = new Date(baseDateStr)
  d.setDate(d.getDate() + days)
  return formatDateISO(d)
}

export function generateTemplates(referenceDate?: string): Template[] {
  const ref = referenceDate || todayRef()

  return [
    {
      name: 'software-sprint',
      label: 'Software Sprint (2 Minggu)',
      description: 'Siklus sprint 2 pekan lengkap dengan UI, Backend, Integrasi, Testing & Deploy',
      rows: [
        {
          id: createRowId(),
          name: 'Sprint Planning & Grooming',
          assignee: 'Scrum Master',
          start: offsetDate(ref, 0),
          duration: '1 hari',
          end: offsetDate(ref, 0),
          dependsOn: '',
        },
        {
          id: createRowId(),
          name: 'Desain UI/UX & Wireframing',
          assignee: 'Andi',
          start: offsetDate(ref, 1),
          duration: '3 hari',
          end: offsetDate(ref, 3),
          dependsOn: 'Sprint Planning & Grooming',
        },
        {
          id: createRowId(),
          name: 'Setup Database & Arsitektur API',
          assignee: 'Budi',
          start: offsetDate(ref, 1),
          duration: '2 hari',
          end: offsetDate(ref, 2),
          dependsOn: 'Sprint Planning & Grooming',
        },
        {
          id: createRowId(),
          name: 'Backend API Development',
          assignee: 'Budi',
          start: offsetDate(ref, 3),
          duration: '5 hari',
          end: offsetDate(ref, 7),
          dependsOn: 'Setup Database & Arsitektur API',
        },
        {
          id: createRowId(),
          name: 'Frontend Components & Integration',
          assignee: 'Cici',
          start: offsetDate(ref, 4),
          duration: '5 hari',
          end: offsetDate(ref, 8),
          dependsOn: 'Desain UI/UX & Wireframing',
        },
        {
          id: createRowId(),
          name: 'QA Testing & Bug Fixing',
          assignee: 'Andi',
          start: offsetDate(ref, 9),
          duration: '3 hari',
          end: offsetDate(ref, 11),
          dependsOn: 'Frontend Components & Integration',
        },
        {
          id: createRowId(),
          name: 'Deployment ke Staging & Production',
          assignee: 'Budi',
          start: offsetDate(ref, 12),
          duration: '1 hari',
          end: offsetDate(ref, 12),
          dependsOn: 'QA Testing & Bug Fixing',
        },
        {
          id: createRowId(),
          name: 'Sprint Review & Retrospective',
          assignee: 'Semua',
          start: offsetDate(ref, 13),
          duration: '1 hari',
          end: offsetDate(ref, 13),
          dependsOn: 'Deployment ke Staging & Production',
        },
      ],
    },
    {
      name: 'marketing',
      label: 'Marketing Campaign',
      description: 'Peluncuran kampanye pemasaran produk dari riset hingga evaluasi ROI',
      rows: [
        {
          id: createRowId(),
          name: 'Briefing & Riset Audiens',
          assignee: 'Tini',
          start: offsetDate(ref, 0),
          duration: '2 hari',
          end: offsetDate(ref, 1),
          dependsOn: '',
        },
        {
          id: createRowId(),
          name: 'Copywriting & Content Plan',
          assignee: 'Tini',
          start: offsetDate(ref, 2),
          duration: '3 hari',
          end: offsetDate(ref, 4),
          dependsOn: 'Briefing & Riset Audiens',
        },
        {
          id: createRowId(),
          name: 'Desain Materi Visual & Ads Banner',
          assignee: 'Rudi',
          start: offsetDate(ref, 2),
          duration: '4 hari',
          end: offsetDate(ref, 5),
          dependsOn: 'Briefing & Riset Audiens',
        },
        {
          id: createRowId(),
          name: 'Produksi Video Konten TikTok & Reels',
          assignee: 'Rudi',
          start: offsetDate(ref, 6),
          duration: '3 hari',
          end: offsetDate(ref, 8),
          dependsOn: 'Desain Materi Visual & Ads Banner',
        },
        {
          id: createRowId(),
          name: 'Review & Final Approval Materi',
          assignee: 'Tini',
          start: offsetDate(ref, 9),
          duration: '1 hari',
          end: offsetDate(ref, 9),
          dependsOn: 'Produksi Video Konten TikTok & Reels',
        },
        {
          id: createRowId(),
          name: 'Setup Kampanye Meta & Google Ads',
          assignee: 'Dina',
          start: offsetDate(ref, 10),
          duration: '2 hari',
          end: offsetDate(ref, 11),
          dependsOn: 'Review & Final Approval Materi',
        },
        {
          id: createRowId(),
          name: 'Peluncuran Kampanye (Go Live)',
          assignee: 'Semua',
          start: offsetDate(ref, 12),
          duration: '2 hari',
          end: offsetDate(ref, 13),
          dependsOn: 'Setup Kampanye Meta & Google Ads',
        },
        {
          id: createRowId(),
          name: 'Evaluasi Konversi & Laporan ROI',
          assignee: 'Tini',
          start: offsetDate(ref, 14),
          duration: '1 hari',
          end: offsetDate(ref, 14),
          dependsOn: 'Peluncuran Kampanye (Go Live)',
        },
      ],
    },
    {
      name: 'event',
      label: 'Event Organizer Timeline',
      description: 'Manajemen acara seminar/konferensi dari pengadaan hingga hari-H',
      rows: [
        {
          id: createRowId(),
          name: 'Survei & Booking Lokasi Acara',
          assignee: 'Andi',
          start: offsetDate(ref, 0),
          duration: '3 hari',
          end: offsetDate(ref, 2),
          dependsOn: '',
        },
        {
          id: createRowId(),
          name: 'Pengajuan Proposal & Sponsor',
          assignee: 'Budi',
          start: offsetDate(ref, 2),
          duration: '5 hari',
          end: offsetDate(ref, 6),
          dependsOn: 'Survei & Booking Lokasi Acara',
        },
        {
          id: createRowId(),
          name: 'Desain Booth & Media Promosi',
          assignee: 'Cici',
          start: offsetDate(ref, 5),
          duration: '4 hari',
          end: offsetDate(ref, 8),
          dependsOn: 'Pengajuan Proposal & Sponsor',
        },
        {
          id: createRowId(),
          name: 'Penjualan Tiket & Publikasi',
          assignee: 'Dina',
          start: offsetDate(ref, 7),
          duration: '7 hari',
          end: offsetDate(ref, 13),
          dependsOn: 'Desain Booth & Media Promosi',
        },
        {
          id: createRowId(),
          name: 'Gladi Bersih & Briefing Panitia',
          assignee: 'Andi',
          start: offsetDate(ref, 14),
          duration: '1 hari',
          end: offsetDate(ref, 14),
          dependsOn: 'Penjualan Tiket & Publikasi',
        },
        {
          id: createRowId(),
          name: 'Hari-H Pelaksanaan Acara',
          assignee: 'Semua',
          start: offsetDate(ref, 15),
          duration: '1 hari',
          end: offsetDate(ref, 15),
          dependsOn: 'Gladi Bersih & Briefing Panitia',
        },
        {
          id: createRowId(),
          name: 'Evaluasi & LPJ Keuangan',
          assignee: 'Budi',
          start: offsetDate(ref, 16),
          duration: '2 hari',
          end: offsetDate(ref, 17),
          dependsOn: 'Hari-H Pelaksanaan Acara',
        },
      ],
    },
  ]
}

export function getDefaultTemplate(referenceDate?: string): Template {
  return generateTemplates(referenceDate)[0]
}

export const templates: Template[] = generateTemplates()

interface Props {
  onSelect: (rows: ParseRowState[], templateName?: string) => void
  activeTemplate?: string | null
}

export function TemplatePicker({ onSelect, activeTemplate }: Props) {
  const currentTemplates = generateTemplates()

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
      <span className="text-muted text-[11px] whitespace-nowrap font-medium">Template:</span>
      {currentTemplates.map(t => {
        const isActive = activeTemplate === t.name
        return (
          <button
            key={t.name}
            onClick={() => onSelect(t.rows, t.name)}
            className={`text-[11px] px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-primary/25 text-primary font-semibold border border-primary/40 shadow-sm'
                : 'btn-secondary hover:text-text-primary'
            }`}
            title={t.description || t.label}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}