import React, { Suspense } from "react"
import DashboardContent from "@/components/DashboardContent"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Yükleniyor...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
