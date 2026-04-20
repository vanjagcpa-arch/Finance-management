import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'CFO Cockpit',
  description: 'Finance management for the modern CFO',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main
            className="flex-1 flex flex-col overflow-hidden"
            style={{ marginLeft: 'var(--nav-width)' }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
