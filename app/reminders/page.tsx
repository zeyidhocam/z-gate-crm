import React, { Suspense } from "react"
import RemindersContent from "@/components/RemindersContent"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function RemindersPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <RemindersContent />
        </Suspense>
    )
}
