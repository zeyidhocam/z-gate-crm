"use client"

import { useState, useEffect, useMemo } from "react"
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download, Users, CreditCard, PieChart, BarChart3 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, parseISO, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { tr } from "date-fns/locale"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Client {
    id: string
    full_name: string | null
    name: string | null
    price_agreed: number | null
    price: number | null
    status: string
    created_at: string
    reservation_at: string | null
    process_name?: string | null
    process_types?: { name: string } | null
}

// Finans KPI Card
function FinanceCard({ title, value, icon: Icon, trend, trendValue, colorClass }: {
    title: string
    value: string | number
    icon: React.ComponentType<{ size?: number; className?: string }>
    trend?: "up" | "down" | "neutral"
    trendValue?: string
    colorClass: string
}) {
    return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20 hover:border-cyan-500/30 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-xl", colorClass.replace('text-', 'bg-').replace('400', '500/10'))}>
                    <Icon size={24} className={colorClass} />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md",
                        trend === "up" && "bg-emerald-500/10 text-emerald-400",
                        trend === "down" && "bg-red-500/10 text-red-400",
                        trend === "neutral" && "bg-slate-500/10 text-slate-400"
                    )}>
                        {trend === "up" && <TrendingUp size={12} />}
                        {trend === "down" && <TrendingDown size={12} />}
                        {trendValue}
                    </div>
                )}
            </div>
            <div className="text-3xl font-black text-slate-100 mb-1">
                {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
            </div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                {title}
            </div>
        </div>
    )
}

export default function FinancePage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "all">("month")

    // localStorage ile kalıcı period
    useEffect(() => {
        const saved = localStorage.getItem('financeSelectedPeriod')
        if (saved) setSelectedPeriod(saved as "week" | "month" | "all")
    }, [])

    useEffect(() => {
        localStorage.setItem('financeSelectedPeriod', selectedPeriod)
    }, [selectedPeriod])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            // Sadece onaylı müşterilerden gelir hesapla
            const { data, error } = await supabase
                .from('clients')
                .select('id, full_name, name, price_agreed, price, status, created_at, reservation_at, confirmed_at, process_types(name), process_name')
                .eq('is_confirmed', true)

            if (error) throw error
            setClients(data as unknown as Client[] || [])
        } catch (error) {
            console.error('Error fetching finance data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Hesaplamalar
    const stats = useMemo(() => {
        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

        let totalRevenue = 0
        let monthlyRevenue = 0
        let weeklyRevenue = 0
        let reservationRevenue = 0
        let clientCount = 0

        clients.forEach(client => {
            const price = client.price_agreed || client.price || 0
            const createdDate = parseISO(client.created_at)

            totalRevenue += price
            clientCount++

            // Aylık
            if (createdDate >= monthStart && createdDate <= monthEnd) {
                monthlyRevenue += price
            }

            // Haftalık
            if (createdDate >= weekStart && createdDate <= weekEnd) {
                weeklyRevenue += price
            }

            // Rezervasyon bazlı
            if (client.status === 'Rezervasyon' && client.reservation_at) {
                reservationRevenue += price
            }
        })

        const avgRevenue = clientCount > 0 ? totalRevenue / clientCount : 0

        return {
            totalRevenue,
            monthlyRevenue,
            weeklyRevenue,
            reservationRevenue,
            avgRevenue,
            clientCount
        }
    }, [clients])

    // Grafik verisi - Son 30 gün
    const chartData = useMemo(() => {
        const now = new Date()
        const days: { date: string; revenue: number; count: number }[] = []

        for (let i = 29; i >= 0; i--) {
            const date = subDays(now, i)
            const dateStr = format(date, 'yyyy-MM-dd')

            let dayRevenue = 0
            let dayCount = 0

            clients.forEach(client => {
                const createdDate = format(parseISO(client.created_at), 'yyyy-MM-dd')
                if (createdDate === dateStr) {
                    dayRevenue += client.price_agreed || 0
                    dayCount++
                }
            })

            days.push({
                date: format(date, 'd MMM', { locale: tr }),
                revenue: dayRevenue,
                count: dayCount
            })
        }

        return days
    }, [clients])

    // İşlem bazlı dağılım
    const processRevenue = useMemo(() => {
        const revenue: Record<string, number> = {}
        clients.forEach(client => {
            const processName = client.process_types?.name || client.process_name || 'Belirtilmemiş'
            revenue[processName] = (revenue[processName] || 0) + (client.price_agreed || client.price || 0)
        })
        return Object.entries(revenue)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
    }, [clients])

    // Excel Export
    const exportToExcel = () => {
        const headers = ['İsim', 'Telefon', 'İşlem', 'Fiyat', 'Durum', 'Tarih']
        const rows = clients.map(c => [
            c.full_name || c.name || 'İsimsiz',
            '-',
            c.process_types?.name || '-',
            c.price_agreed?.toString() || '0',
            c.status,
            format(parseISO(c.created_at), 'dd.MM.yyyy', { locale: tr })
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n')

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `finans_raporu_${format(new Date(), 'yyyy-MM-dd')}.csv`
        link.click()
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <DollarSign className="text-emerald-400" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gradient-ocean">Finans</h1>
                        <p className="text-slate-400">Gelir takibi ve finansal raporlar</p>
                    </div>
                </div>

                <Button
                    onClick={exportToExcel}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-2"
                >
                    <Download size={16} />
                    Excel İndir
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinanceCard
                    title="Toplam Gelir"
                    value={`${stats.totalRevenue.toLocaleString('tr-TR')} ₺`}
                    icon={DollarSign}
                    colorClass="text-emerald-400"
                />
                <FinanceCard
                    title="Bu Ay"
                    value={`${stats.monthlyRevenue.toLocaleString('tr-TR')} ₺`}
                    icon={Calendar}
                    trend="up"
                    trendValue="Bu ay"
                    colorClass="text-cyan-400"
                />
                <FinanceCard
                    title="Bu Hafta"
                    value={`${stats.weeklyRevenue.toLocaleString('tr-TR')} ₺`}
                    icon={TrendingUp}
                    colorClass="text-sky-400"
                />
                <FinanceCard
                    title="Ortalama / Müşteri"
                    value={`${Math.round(stats.avgRevenue).toLocaleString('tr-TR')} ₺`}
                    icon={Users}
                    colorClass="text-violet-400"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 size={20} className="text-cyan-400" />
                        <h3 className="font-bold text-slate-200 text-lg">Son 30 Gün Gelir</h3>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0c1929',
                                        border: '1px solid rgba(34,211,238,0.2)',
                                        borderRadius: '8px',
                                        color: '#e2e8f0'
                                    }}
                                    formatter={(value) => [`${Number(value).toLocaleString('tr-TR')} ₺`, 'Gelir']}
                                />
                                <Bar dataKey="revenue" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Process Revenue Distribution */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart size={20} className="text-cyan-400" />
                        <h3 className="font-bold text-slate-200 text-lg">İşlem Bazlı Gelir</h3>
                    </div>
                    <div className="space-y-4">
                        {processRevenue.map((item, i) => (
                            <div key={item.name} className="flex items-center gap-4">
                                <div className="w-8 text-right text-xs text-slate-500 font-bold">
                                    {i + 1}.
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-slate-300">{item.name}</span>
                                        <span className="text-sm font-bold text-emerald-400">
                                            {item.value.toLocaleString('tr-TR')} ₺
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                                            style={{ width: `${(item.value / stats.totalRevenue) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-6">
                    <CreditCard size={20} className="text-cyan-400" />
                    <h3 className="font-bold text-slate-200 text-lg">Son İşlemler</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-cyan-500/10">
                                <th className="text-left text-xs text-slate-500 font-bold uppercase tracking-wide py-3 px-4">Müşteri</th>
                                <th className="text-left text-xs text-slate-500 font-bold uppercase tracking-wide py-3 px-4">İşlem</th>
                                <th className="text-left text-xs text-slate-500 font-bold uppercase tracking-wide py-3 px-4">Durum</th>
                                <th className="text-right text-xs text-slate-500 font-bold uppercase tracking-wide py-3 px-4">Tutar</th>
                                <th className="text-right text-xs text-slate-500 font-bold uppercase tracking-wide py-3 px-4">Tarih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.slice(0, 10).map(client => (
                                <tr key={client.id} className="border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-colors">
                                    <td className="py-4 px-4">
                                        <span className="font-bold text-slate-200">
                                            {client.full_name || client.name || 'İsimsiz'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-sm text-slate-400">
                                            {client.process_types?.name || '-'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={cn(
                                            "text-xs font-bold px-2 py-1 rounded-md",
                                            client.status === 'Sabit' && "bg-orange-500/10 text-orange-400",
                                            client.status === 'Yeni' && "bg-green-500/10 text-green-400",
                                            client.status === 'Takip' && "bg-cyan-500/10 text-cyan-400",
                                            client.status === 'Rezervasyon' && "bg-purple-500/10 text-purple-400"
                                        )}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="font-bold text-emerald-400">
                                            {(client.price_agreed || 0).toLocaleString('tr-TR')} ₺
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="text-sm text-slate-500">
                                            {format(parseISO(client.created_at), 'dd MMM yyyy', { locale: tr })}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
