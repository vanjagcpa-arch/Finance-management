import { ElectricityProvider } from '@/lib/ElectricityContext'

export default function ElectricityLayout({ children }: { children: React.ReactNode }) {
  return <ElectricityProvider>{children}</ElectricityProvider>
}
