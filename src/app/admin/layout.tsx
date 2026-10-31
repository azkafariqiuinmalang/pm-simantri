import AdminShell from '@/components/dashboard/AdminShell'
import { requirePmProfile } from '@/lib/auth/pm-profile'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePmProfile(true)
  return <AdminShell>{children}</AdminShell>
}
