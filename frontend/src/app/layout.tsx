import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
// Upstream frappe-gantt structural stylesheet (vendored — see header in
// frappe-gantt.vendor.css). MUST load before globals.css so the app's
// theme overrides win on equal specificity (!important on colors anyway).
import './frappe-gantt.vendor.css'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaskFlowy Gantt',
  description: 'Turn plain-text schedules into interactive Gantt charts. Zero login, zero cost, instant sharing.',
}

import { LocaleProvider } from '@/lib/i18n/context'

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} h-screen`}>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}