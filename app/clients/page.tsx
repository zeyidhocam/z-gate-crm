import React, { Suspense } from "react"
import ClientsContent from "@/components/ClientsContent"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function ClientsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Yükleniyor...</div>}>
            <ClientsContent />
        </Suspense>
    )
}
