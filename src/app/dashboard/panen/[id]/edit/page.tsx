import HarvestForm from '@/components/harvest/HarvestForm'
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params;return <HarvestForm id={id} /> }
