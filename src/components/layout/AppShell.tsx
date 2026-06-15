'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !pathname.startsWith('/portal') && !pathname.startsWith('/connect')

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: 'var(--nav-width)' }}
      >
        {children}
      </main>
    </div>
  )
}
