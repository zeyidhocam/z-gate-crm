"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { formatDistanceToNow, format } from "date-fns"
import { tr } from "date-fns/locale"
import { Clock } from "lucide-react"

interface RecentActivityProps {
  clientId: string | null | undefined
  limit?: number
}

export default function RecentActivity({ clientId, limit = 10 }: RecentActivityProps) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    supabase
      .from('audit_logs')
      .select('*')
      .eq('record_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setActivities(data || [])
      })
      .finally(() => setLoading(false))
  }, [clientId, limit])

  if (!clientId) return null

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
        <Clock size={14} /> Son İşlemler
      </div>
      <div className="space-y-2 max-h-[220px] overflow-y-auto">
        {loading && <div className="text-xs text-slate-500">Yükleniyor...</div>}
        {!loading && activities.length === 0 && <div className="text-xs text-slate-500">Henüz işlem kaydı yok.</div>}
        {!loading && activities.map(act => (
          <div key={act.id} className="p-2 bg-[#07121a]/40 border border-slate-800 rounded-md text-sm">
            <div className="flex items-start justify-between">
              <div className="text-slate-200 font-semibold">{act.action}</div>
              <div className="text-xs text-slate-500">{format(new Date(act.created_at), 'd MMM yyyy HH:mm', { locale: tr })}</div>
            </div>
            <div className="text-xs text-slate-400 mt-1 line-clamp-3">{act.changes ? JSON.stringify(act.changes).slice(0, 300) : ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
