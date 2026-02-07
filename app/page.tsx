import React, { Suspense } from "react"
import DashboardContent from "@/components/DashboardContent"
import { createClient } from "@/lib/supabase-server"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function getDashboardData() {
  const supabase = await createClient()

  // Fetch all clients with related data
  // Similar to what was done in client-side fetch, but robustly on server
  const { data, error } = await supabase
    .from('clients')
    .select('*, process_types(name)')
    // Add sorting if needed, though client side handles sorting for some charts
    .order('created_at', { ascending: false })

  if (error) {
    console.error('SERVER ERROR: Failed to fetch dashboard data', error)
    return []
  }

  // Map to the shape expected by DashboardContent (Client Interface)
  // Ensure types match what UI expects
  return (data || []) as any[]
}

export default async function DashboardPage() {
  // Fetch data on the server
  const clients = await getDashboardData()

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">Yükleniyor...</div>}>
      <DashboardContent initialClients={clients} />
    </Suspense>
  )
}
