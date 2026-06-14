'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !pathname.startsWith('/portal')

  return (
    <div className="flex h-screen overflow-hidden">
      {showSidebar && <Sidebar />}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={showSidebar ? { marginLeft: 'var(--nav-width)' } : {}}
      >
        {children}
      </main>
    </div>
  )
}
