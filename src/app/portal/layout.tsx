import { Suspense } from 'react'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    }>
      {children}
    </Suspense>
  )
}
