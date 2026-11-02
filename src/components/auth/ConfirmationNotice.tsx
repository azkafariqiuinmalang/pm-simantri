'use client'

import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default function ConfirmationNotice() {
  const params = useSearchParams()
  if (params.get('reason') !== 'confirmation') return null

  return (
    <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <p className="text-xs leading-relaxed font-medium">
        Tautan konfirmasi tidak dapat digunakan atau sesi pendaftaran tidak ditemukan.
        Jika email sudah dikonfirmasi, masuk menggunakan email dan kata sandi Anda.
        Buka tautan konfirmasi di browser yang digunakan saat mendaftar.
      </p>
    </div>
  )
}
