import Link from 'next/link'
import { ShoppingBasket } from 'lucide-react'

export default function HarvestListingPage() {
  return <section className="sim-card-flat mx-auto max-w-3xl space-y-4 p-6 sm:p-8">
    <ShoppingBasket className="h-9 w-9 text-[var(--theme-green)]" />
    <h1 className="text-2xl font-bold">Harvest Listing</h1>
    <p className="text-sm leading-7">Modul ini masuk dalam rencana PM, tetapi belum diimplementasikan pada tahap perapian salinan aplikasi. Belum ada listing, pemesanan, atau transaksi yang tersedia.</p>
    <p className="text-sm leading-7 text-[var(--sim-color-muted)]">Tahap berikutnya: pengelolaan listing hasil panen oleh pemilik, foto, status ketersediaan, pencarian, kontak penjual, dan moderasi Admin. Pembayaran serta pengiriman tidak termasuk scope.</p>
    <Link href="/dashboard" className="sim-button-secondary">Kembali ke dashboard</Link>
  </section>
}
