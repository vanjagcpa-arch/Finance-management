import { Suspense } from 'react'

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
