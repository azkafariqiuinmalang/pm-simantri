import PlanEditor from '@/components/farm-plans/PlanEditor'

export const metadata = { title: 'Buat Rencana Usaha Tani | SIMANTRI' }
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams
  return <PlanEditor mode={mode === 'selling' ? 'selling' : 'planning'} />
}
