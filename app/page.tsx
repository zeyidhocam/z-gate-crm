'use client'

import { useEffect, useState, useMemo } from 'react'
import { CalendarCheck, Calendar, CalendarDays, CalendarRange, CalendarX, User, Phone, TrendingUp, PieChart as PieChartIcon, BarChart3, Check } from 'lucide-react'
import { KPICard } from '@/components/KPICard'
import { ProcessPieChart } from '@/components/charts/ProcessPieChart'
import { TrendChart } from '@/components/charts/TrendChart'
import { ConversionCard } from '@/components/charts/ConversionCard'
import { AIInsights } from '@/components/AIInsights'
import { ReminderAlert } from '@/components/ReminderAlert'
import { supabase } from '@/lib/supabase'
import { format, isSameDay, parseISO, subDays, startOfDay } from 'date-fns'
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

interface Client {
  id: string
  full_name: string | null
  name: string | null
  status: string
  created_at: string
  reservation_at: string | null
  price_agreed: number | null
  process_types?: { name: string } | null
}

const PROCESS_COLORS: Record<string, string> = {
  // Cyan / Turquoise
  'Büyü Bozma': '#22d3ee',
  'Standart Yorum': '#06b6d4',

  // Emerald / Green
  'Geri Getirme Çalışması': '#10b981',
  'Rızık Açma': '#34d399',
  'Kısmet Açma': '#22c55e',

  // Pink / Rose
  'Karma Kapama (Gönül + Rızık) Bozma': '#ec4899',
  'Karma Kapama': '#f472b6',

  // Amber / Orange
  'Rahmani Kilit Kırma ve Fetih Çalışması': '#f59e0b',
  'Mühürlü Bereket ve Fetih Çalışması': '#fbbf24',
  'Aşk Büyüsü': '#fb923c',

  // Violet / Purple
  'Soğutma Bozma İşlemi': '#8b5cf6',
  'İkili Bağlama': '#a78bfa',
  'Kızıl Hüddam Çalışması': '#c084fc',

  // Blue
  'Tarot': '#3b82f6',
  'Cesaret': '#60a5fa',

  // Red
  'Ayrılık Büyüsü': '#ef4444',

  // Default
  'Belirtilmemiş': '#64748b',
  'default': '#6366f1'
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    reservation: 0,
    new: 0,
    tracking: 0,
    fixed: 0,
    archive: 0,
    total: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Auto-Archive Logic
      const now = new Date()
      const { data: pastReservations } = await supabase
        .from('clients')
        .select('id, reservation_at')
        .eq('status', 'Rezervasyon')
        .lt('reservation_at', now.toISOString())

      if (pastReservations && pastReservations.length > 0) {
        console.log(`Auto-archiving ${pastReservations.length} records...`)
        const idsToArchive = (pastReservations as any[]).map(r => r.id)
        await supabase
          .from('clients')
          .update({ status: 'Arşiv' })
          .in('id', idsToArchive)
      }

      // 2. Fetch All Active Data for Stats
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, full_name, name, phone, status, reservation_at, price_agreed, price, created_at, process_types(name), process_name')

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAllClients(clientsData as any[] || [])

      // Calculate Stats
      const newStats = { reservation: 0, new: 0, tracking: 0, fixed: 0, archive: 0, total: 0 }
      const mappedLeads: Lead[] = []

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ; (clientsData as any[] || []).forEach(client => {
          if (client.status === 'Rezervasyon') newStats.reservation++
          else if (client.status === 'Yeni') newStats.new++
          else if (client.status === 'Takip') newStats.tracking++
          else if (client.status === 'Aktif') newStats.fixed++
          else if (client.status === 'Arşiv') newStats.archive++
          newStats.total++

          if (client.status === 'Rezervasyon' && client.reservation_at) {
            mappedLeads.push({
              ...client,
              name: client.full_name || client.name || 'İsimsiz',
              price: client.price_agreed
            })
          }
        })

      setStats(newStats)
      setLeads(mappedLeads.sort((a, b) => new Date(a.reservation_at!).getTime() - new Date(b.reservation_at!).getTime()))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Process distribution data for pie chart
  const processData = useMemo(() => {
    const counts: Record<string, number> = {}
    allClients.forEach(client => {
      // Fallback: eski kayıtlarda process_name, yeni kayıtlarda process_types.name
      const processName = (client as any).process_types?.name || (client as any).process_name || 'Belirtilmemiş'
      counts[processName] = (counts[processName] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        color: PROCESS_COLORS[name] || PROCESS_COLORS.default
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [allClients])

  // 30-day trend data
  const trendData = useMemo(() => {
    const now = new Date()
    const days: { date: string; value: number }[] = []

    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const count = allClients.filter(client => {
        const createdDate = format(parseISO(client.created_at), 'yyyy-MM-dd')
        return createdDate === dateStr
      }).length
      days.push({
        date: format(date, 'd MMM', { locale: tr }),
        value: count
      })
    }
    return days
  }, [allClients])

  // Conversion rate (Yeni → Sabit)
  const conversionRate = useMemo(() => {
    const newCount = allClients.filter(c => c.status === 'Yeni').length
    const fixedCount = allClients.filter(c => c.status === 'Aktif').length
    const total = newCount + fixedCount
    return total > 0 ? (fixedCount / total) * 100 : 0
  }, [allClients])

  const now = new Date()

  // Group by Date for UI
  const groupedReservations = leads.reduce((groups, lead) => {
    const date = format(parseISO(lead.reservation_at!), 'yyyy-MM-dd')
    if (!groups[date]) groups[date] = []
    groups[date].push(lead)
    return groups
  }, {} as Record<string, Lead[]>)

  const sortedDates = Object.keys(groupedReservations).sort((a, b) => a.localeCompare(b))

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header - Ocean Elite */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
          <CalendarCheck className="text-cyan-400" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gradient-ocean">Gösterge Paneli</h1>
          <p className="text-slate-400">Genel durum ve yaklaşan randevular</p>
        </div>
      </div>

      {/* Reminder Alert */}
      <ReminderAlert />

      {/* KPI Cards - Ocean Elite Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Yaklaşan Rezervasyon"
          value={stats.reservation.toString()}
          icon={CalendarCheck}
          colorClass="text-cyan-400"
          bgClass="bg-cyan-500/10"
          borderClass="border-cyan-500/20"
        />
        <KPICard
          title="Yeni Müşteri"
          value={stats.new.toString()}
          icon={User}
          colorClass="text-emerald-400"
          bgClass="bg-emerald-500/10"
          borderClass="border-emerald-500/20"
        />
        <KPICard
          title="Takip Edilen"
          value={stats.tracking.toString()}
          icon={CalendarRange}
          colorClass="text-sky-400"
          bgClass="bg-sky-500/10"
          borderClass="border-sky-500/20"
        />
        <KPICard
          title="Aktif Müşteri"
          value={stats.fixed.toString()}
          icon={Check}
          colorClass="text-red-400"
          bgClass="bg-red-500/10"
          borderClass="border-red-500/20"
        />
        <KPICard
          title="Arşiv"
          value={stats.archive.toString()}
          icon={CalendarX}
          colorClass="text-slate-400"
          bgClass="bg-slate-500/10"
          borderClass="border-slate-500/20"
        />
        <KPICard
          title="Toplam Kayıt"
          value={stats.total.toString()}
          icon={CalendarDays}
          colorClass="text-indigo-400"
          bgClass="bg-indigo-500/10"
          borderClass="border-indigo-500/20"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process Distribution */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={18} className="text-cyan-400" />
            <h3 className="font-bold text-slate-200">İşlem Dağılımı</h3>
          </div>
          <ProcessPieChart data={processData} />
        </div>

        {/* 30-Day Trend */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-cyan-400" />
            <h3 className="font-bold text-slate-200">Son 30 Gün</h3>
          </div>
          <TrendChart data={trendData} title="Yeni Kayıt" />
        </div>

        {/* Conversion Stats */}
        <div className="space-y-4">
          <ConversionCard
            title="Dönüşüm Oranı"
            value={conversionRate}
            suffix="%"
            description="Yeni → Aktif dönüşüm"
          />
          <ConversionCard
            title="Aktif Müşteri"
            value={stats.fixed}
            suffix=""
            description="Sadık müşteri sayısı"
          />
          {/* AI Insights */}
          <AIInsights clients={allClients} />
        </div>
      </div>

      {/* Content Area - Horizontal Scroll */}
      {
        sortedDates.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl min-h-[300px] flex flex-col items-center justify-center text-center">
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
                        ? "bg-slate-900/80 border-cyan-500/50 shadow-[0_0_30px_-10px_rgba(34,211,238,0.2)]"
                        : "bg-slate-900/40 border-slate-800/50"
                    )}
                  >
                    {/* Date Header */}
                    <div className={cn(
                      "px-5 py-4 border-b flex items-center justify-between",
                      isToday ? "bg-cyan-500/10 border-cyan-500/20" : "bg-slate-900/50 border-slate-800/50"
                    )}>
                      <div>
                        <div className={cn("text-lg font-bold", isToday ? "text-cyan-300" : "text-slate-200")}>
                          {format(dateObj, 'd MMMM', { locale: tr })}
                        </div>
                        <div className={cn("text-xs font-medium uppercase tracking-wider", isToday ? "text-cyan-400/70" : "text-slate-500")}>
                          {format(dateObj, 'EEEE', { locale: tr })}
                        </div>
                      </div>
                      {isToday && (
                        <span className="text-[10px] font-bold bg-cyan-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Bugün</span>
                      )}
                    </div>

                    {/* List */}
                    <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
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
