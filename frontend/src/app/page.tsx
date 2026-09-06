import React from 'react'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { HeroPlayground } from '@/components/landing/hero-playground'
import { PersonaSolutions } from '@/components/landing/persona-solutions'
import { FreedomMatrix } from '@/components/landing/freedom-matrix'
import { AboutSection } from '@/components/landing/about-section'
import { LandingFooter } from '@/components/landing/landing-footer'

export const metadata = {
  title: 'TaskFlowy: Bebas Jadwalkan Apa Saja. Text-to-Gantt Instan Tanpa Login',
  description: 'Ubah catatan rencana kerja mentah menjadi linimasa Gantt chart rapi dalam detik. Solusi bebas dan fleksibel untuk pelaku UMKM dan Project Manager.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-text-primary flex flex-col selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />
      <main className="flex-1">
        <HeroPlayground />
        <PersonaSolutions />
        <FreedomMatrix />
        <AboutSection />
      </main>
      <LandingFooter />
    </div>
  )
}
