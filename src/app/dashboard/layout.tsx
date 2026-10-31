import DashboardShell from '@/components/dashboard/DashboardShell'
import { requirePmProfile } from '@/lib/auth/pm-profile'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePmProfile()
  return <DashboardShell>{children}</DashboardShell>
}
