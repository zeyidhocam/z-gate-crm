"use client"

import { useMemo } from "react"
import { Sparkles, TrendingUp, AlertTriangle, Calendar, Users, Award } from "lucide-react"
import { differenceInDays, parseISO, format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"

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

interface AIInsightsProps {
    clients: Client[]
}

export function AIInsights({ clients }: AIInsightsProps) {
    // En popüler işlem tahmini
    const popularProcess = useMemo(() => {
        const counts: Record<string, number> = {}
        clients.forEach(c => {
            const name = c.process_types?.name || (c as any).process_name || 'Belirtilmemiş'
            counts[name] = (counts[name] || 0) + 1
        })
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        return sorted[0] || ['Veri yok', 0]
    }, [clients])

    // Uzun süredir gelmeyen müşteri sayısı
    const inactiveCount = useMemo(() => {
        const now = new Date()
        return clients.filter(c => {
            const lastDate = c.reservation_at ? parseISO(c.reservation_at) : parseISO(c.created_at)
            return differenceInDays(now, lastDate) >= 14
        }).length
    }, [clients])

    // Dönüşüm oranı (Yeni → Sabit)
    const conversionRate = useMemo(() => {
        const newCount = clients.filter(c => c.status === 'Yeni').length
        const fixedCount = clients.filter(c => c.status === 'Aktif').length
        const total = newCount + fixedCount
        return total > 0 ? Math.round((fixedCount / total) * 100) : 0
    }, [clients])

    // Yaklaşan rezervasyon sayısı
    const upcomingCount = useMemo(() => {
        return clients.filter(c => c.status === 'Rezervasyon').length
    }, [clients])

    // Ortalama fiyat
    const avgPrice = useMemo(() => {
        const validClients = clients.filter(c => c.price_agreed && c.price_agreed > 0)
        if (validClients.length === 0) return 0
        const total = validClients.reduce((sum, c) => sum + (c.price_agreed || 0), 0)
        return Math.round(total / validClients.length)
    }, [clients])

    const insights = [
        {
            icon: Award,
            title: "En Popüler İşlem",
            value: popularProcess[0] as string,
            subtitle: `${popularProcess[1]} müşteri tercih etti`,
            color: "text-violet-400",
            bg: "bg-violet-500/10",
            border: "border-violet-500/20"
        },
        {
            icon: AlertTriangle,
            title: "İletişim Gerekli",
            value: `${inactiveCount} Müşteri`,
            subtitle: "14+ gündür iletişim yok",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        },
        {
            icon: TrendingUp,
            title: "Dönüşüm Oranı",
            value: `%${conversionRate}`,
            subtitle: "Yeni → Sabit müşteri",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20"
        },
        {
            icon: Calendar,
            title: "Yaklaşan",
            value: `${upcomingCount} Randevu`,
            subtitle: "Bekleyen rezervasyonlar",
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/20"
        }
    ]

    return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles size={20} className="text-cyan-400" />
                <h3 className="font-bold text-slate-200 text-lg">AI Öngörüleri</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {insights.map((insight, i) => (
                    <div
                        key={i}
                        className={cn(
                            "p-4 rounded-xl border transition-all hover:scale-[1.02]",
                            insight.bg,
                            insight.border
                        )}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <insight.icon size={16} className={insight.color} />
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                                {insight.title}
                            </span>
                        </div>
                        <div className={cn("text-xl font-black mb-0.5", insight.color)}>
                            {insight.value}
                        </div>
                        <div className="text-[11px] text-slate-600">
                            {insight.subtitle}
                        </div>
                    </div>
                ))}
            </div>

            {/* Weekly Tip */}
            <div className="mt-5 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <Sparkles size={16} className="text-cyan-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-cyan-300 mb-1">Haftalık Öneri</p>
                        <p className="text-xs text-slate-500">
                            {inactiveCount > 5
                                ? `${inactiveCount} müşteriniz uzun süredir iletişim bekliyor. Hatırlatma gönderin!`
                                : conversionRate < 30
                                    ? "Dönüşüm oranınızı artırmak için takip müşterilerine özel teklifler sunun."
                                    : `${popularProcess[0]} işlemi bu dönemde çok talep görüyor. Kampanya fırsatı!`
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
