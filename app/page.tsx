
'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, Calendar, CalendarDays, CalendarRange, CalendarX, User, Phone } from 'lucide-react'
import { KPICard } from '@/components/KPICard'
import { supabase } from '@/lib/supabase'
import { format, isSameDay, isThisWeek, isThisMonth, parseISO, startOfDay, isAfter } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Lead {
  id: string
  name: string
  phone?: string
  status: string
  reservation_at?: string
  price?: number
  process_name?: string
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'Rezervasyon')
        .not('reservation_at', 'is', null) // Ensure date exists
        .order('reservation_at', { ascending: true })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching reservations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter Stats
  const now = new Date()
  const upcomingLeads = leads.filter(l => {
    if (!l.reservation_at) return false
    return isAfter(parseISO(l.reservation_at), startOfDay(now)) || isSameDay(parseISO(l.reservation_at), now)
  })

  const STATS = {
    total: leads.length,
    today: leads.filter(l => l.reservation_at && isSameDay(parseISO(l.reservation_at), now)).length,
    week: leads.filter(l => l.reservation_at && isThisWeek(parseISO(l.reservation_at), { weekStartsOn: 1 })).length,
    month: leads.filter(l => l.reservation_at && isThisMonth(parseISO(l.reservation_at))).length
  }

  // Group by Date for UI
  const groupedReservations = upcomingLeads.reduce((groups, lead) => {
    const date = format(parseISO(lead.reservation_at!), 'yyyy-MM-dd')
    if (!groups[date]) groups[date] = []
    groups[date].push(lead)
    return groups
  }, {} as Record<string, Lead[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedReservations).sort((a, b) => a.localeCompare(b))

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <CalendarCheck className="text-purple-400" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Yaklaşan Rezervasyonlar</h1>
          <p className="text-slate-400">Takvim ve rezervasyon takibi</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Toplam Kayıt"
          value={STATS.total.toString()}
          icon={CalendarCheck}
          colorClass="text-purple-400"
          bgClass="bg-purple-500/15"
          borderClass="border-purple-500/30"
        />
        <KPICard
          title="Bugün"
          value={STATS.today.toString()}
          icon={Calendar}
          colorClass="text-green-400"
          bgClass="bg-green-500/15"
          borderClass="border-green-500/30"
        />
        <KPICard
          title="Bu Hafta"
          value={STATS.week.toString()}
          icon={CalendarDays}
          colorClass="text-blue-400"
          bgClass="bg-blue-500/15"
          borderClass="border-blue-500/30"
        />
        <KPICard
          title="Bu Ay"
          value={STATS.month.toString()}
          icon={CalendarRange}
          colorClass="text-fuchsia-400"
          bgClass="bg-fuchsia-500/15"
          borderClass="border-fuchsia-500/30"
        />
      </div>

      {/* Content Area - Horizontal Scroll */}
      {sortedDates.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl min-h-[400px] flex flex-col items-center justify-center text-center">
          <CalendarX size={64} className="text-slate-800 mb-6" />
          <p className="text-xl text-slate-400 font-medium">Yaklaşan rezervasyon bulunmuyor</p>
          <p className="text-sm text-slate-600 mt-2">Kayıtlar ekranından yeni bir tarih belirleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-6 min-w-max px-1">
            {sortedDates.map(dateStr => {
              const items = groupedReservations[dateStr]
              const dateObj = parseISO(dateStr)
              const isToday = isSameDay(dateObj, now)

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "w-[340px] shrink-0 rounded-2xl border flex flex-col overflow-hidden",
                    isToday
                      ? "bg-slate-900/80 border-purple-500/50 shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]"
                      : "bg-slate-900/40 border-slate-800/50"
                  )}
                >
                  {/* Date Header */}
                  <div className={cn(
                    "px-5 py-4 border-b flex items-center justify-between",
                    isToday ? "bg-purple-500/10 border-purple-500/20" : "bg-slate-900/50 border-slate-800/50"
                  )}>
                    <div>
                      <div className={cn("text-lg font-bold", isToday ? "text-purple-300" : "text-slate-200")}>
                        {format(dateObj, 'd MMMM', { locale: tr })}
                      </div>
                      <div className={cn("text-xs font-medium uppercase tracking-wider", isToday ? "text-purple-400/70" : "text-slate-500")}>
                        {format(dateObj, 'EEEE', { locale: tr })}
                      </div>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Bugün</span>
                    )}
                  </div>

                  {/* List */}
                  <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {items.map(lead => (
                      <div key={lead.id} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-slate-700/50 transition-colors group">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-bold text-slate-200 text-base">{lead.name}</div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
                              <Phone size={12} />
                              {lead.phone || '-'}
                            </div>
                          </div>
                          {lead.price && (
                            <div className="text-right">
                              <div className="text-sm font-bold text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded-md font-mono">
                                {lead.price.toLocaleString('tr-TR')} ₺
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/10 rounded-md">
                              <User size={14} className="text-indigo-400" />
                            </div>
                            <span className="text-xs font-semibold text-slate-400">
                              {lead.process_name || 'İşlem Belirtilmemiş'}
                            </span>
                          </div>

                          {lead.reservation_at && (
                            <span className="text-xs font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded">
                              {format(parseISO(lead.reservation_at), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
