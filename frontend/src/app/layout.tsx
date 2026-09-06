import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaskFlowy Gantt',
  description: 'Turn plain-text schedules into interactive Gantt charts. Zero login, zero cost, instant sharing.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} h-screen`}>
        {children}
      </body>
    </html>
  )
}