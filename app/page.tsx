
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
  const [stats, setStats] = useState({
    reservation: 0,
    new: 0,
    tracking: 0,
    fixed: 0,
    total: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Auto-Archive Logic: Find past reservations that are still 'Rezervasyon'
      const now = new Date()
      const { data: pastReservations } = await supabase
        .from('clients')
        .select('id, reservation_at')
        .eq('status', 'Rezervasyon')
        .lt('reservation_at', now.toISOString())

      if (pastReservations && pastReservations.length > 0) {
        console.log(`Auto-archiving ${pastReservations.length} records...`)
        const idsToArchive = pastReservations.map(r => r.id)

        // Update specific records to 'Arşiv'
        await supabase
          .from('clients')
          .update({ status: 'Arşiv' })
          .in('id', idsToArchive)
      }

      // 2. Fetch All Active Data for Stats
      const { data: allClients, error } = await supabase
        .from('clients')
        .select('id, full_name, name, phone, status, reservation_at, price_agreed')
        .neq('status', 'Arşiv') // Optionally exclude archive from main dashboard list or stats if requested, but for stats we might want to see them separately. 
      // User asked "Toplam kayıt miktarı yazdın yanındada rezervasyon ayrı...". Let's fetch everything meaningful.

      if (error) throw error

      // Calculate Stats
      const newStats = {
        reservation: 0,
        new: 0,
        tracking: 0,
        fixed: 0,
        total: 0
      }

      const mappedLeads: Lead[] = []

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (allClients as any[] || []).forEach(client => {
          // Stats
          if (client.status === 'Rezervasyon') newStats.reservation++
          else if (client.status === 'Yeni') newStats.new++
          else if (client.status === 'Takip') newStats.tracking++
          else if (client.status === 'Sabit') newStats.fixed++

          newStats.total++

          // Map for "Upcoming Reservations" List (Only 'Rezervasyon' status)
          if (client.status === 'Rezervasyon' && client.reservation_at) {
            mappedLeads.push({
              ...client,
              name: client.full_name || client.name || 'İsimsiz',
              price: client.price_agreed
            })
          }
        })

      setStats(newStats)
      // Sort upcoming by date
      setLeads(mappedLeads.sort((a, b) => new Date(a.reservation_at!).getTime() - new Date(b.reservation_at!).getTime()))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter Stats (Time based - keeping for "Upcoming" view if needed, but main stats are now status based)
  const now = new Date()

  // Group by Date for UI
  const groupedReservations = leads.reduce((groups, lead) => {
    const date = format(parseISO(lead.reservation_at!), 'yyyy-MM-dd')
    if (!groups[date]) groups[date] = []
    groups[date].push(lead)
    return groups
  }, {} as Record<string, Lead[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedReservations).sort((a, b) => a.localeCompare(b))

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <CalendarCheck className="text-purple-400" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Gösterge Paneli</h1>
          <p className="text-slate-400">Genel durum ve yaklaşan randevular</p>
        </div>
      </div>

      {/* KPI Cards - UPDATED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Yaklaşan Rezervasyon"
          value={stats.reservation.toString()}
          icon={CalendarCheck}
          colorClass="text-purple-400"
          bgClass="bg-purple-500/10"
        />
        <KPICard
          title="Yeni Müşteri"
          value={stats.new.toString()}
          icon={User}
          colorClass="text-green-400"
          bgClass="bg-green-500/10"
        />
        <KPICard
          title="Takip Edilen"
          value={stats.tracking.toString()}
          icon={CalendarRange}
          colorClass="text-cyan-400"
          bgClass="bg-cyan-500/10"
        />
        <KPICard
          title="Toplam Kayıt"
          value={stats.total.toString()}
          icon={CalendarDays}
          colorClass="text-pink-400"
          bgClass="bg-pink-500/10"
        />
      </div>  borderClass="border-purple-500/30"
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

      {/* Content Area - Horizontal Scroll */ }
  {
    sortedDates.length === 0 ? (
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
  )
  }
    </div >
  )
}
