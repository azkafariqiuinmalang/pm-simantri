import HarvestDetail from '@/components/harvest/HarvestDetail'
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params;return <HarvestDetail id={id} /> }
