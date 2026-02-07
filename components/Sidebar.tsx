
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Bell, Settings, Calendar, DollarSign, CalendarDays, Wallet, Send } from 'lucide-react'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'
import { useSettings } from '@/components/providers/settings-provider'
import { supabase } from '@/lib/supabase'

export function Sidebar() {
    const pathname = usePathname()
    const { config } = useSettings()
    const [reminderCount, setReminderCount] = useState(0)
    const [sendingReport, setSendingReport] = useState(false)

    const handleManualReport = async () => {
        try {
            setSendingReport(true)
            const res = await fetch('/api/cron/daily-report')
            const data: { ok?: boolean; error?: string } = await res.json()

            if (data.ok) {
                toast.success("Rapor başarıyla Telegram'a gönderildi!")
            } else {
                toast.error("Rapor gönderilemedi: " + (data.error || "Bilinmeyen hata"))
            }
        } catch (error) {
            console.error(error)
            toast.error("İstek sırasında bir hata oluştu")
        } finally {
            setSendingReport(false)
        }
    }

    // Fetch reminder count
    useEffect(() => {
        const fetchReminders = async () => {
            const { data } = await supabase
                .from('reminders')
                .select('id, reminder_date')
                .eq('is_completed', false)

            if (data) {
                const now = new Date()
                const count = (data as { reminder_date: string }[]).filter((r) => {
                    const date = new Date(r.reminder_date)
                    return date <= now || date.toDateString() === now.toDateString()
                }).length
                setReminderCount(count)
            }
        }

        fetchReminders()
        // Refresh every minute
        const interval = setInterval(fetchReminders, 60000)
        return () => clearInterval(interval)
    }, [])

    if (pathname === '/login') return null

    const items = [
        { label: 'Ana Sayfa', icon: LayoutDashboard, path: '/' },
        { label: 'Rezervasyonlar', icon: Calendar, path: '/reservations' },
        { label: 'Takvim', icon: CalendarDays, path: '/calendar' },
        { label: 'Müşteriler', icon: Users, path: '/customers' },
        { label: 'Kayıtlar', icon: Users, path: '/clients' },
        { label: 'Finans', icon: DollarSign, path: '/finance' },
        { label: 'Hatırlatmalar', icon: Bell, path: '/reminders', badge: reminderCount },
        { label: 'Kişisel Kasa Analysis', icon: Wallet, path: '/analysis' },
        { label: 'Ayarlar', icon: Settings, path: '/settings' },
    ]

    return (
        <aside className="w-[260px] h-screen sticky top-0 bg-gradient-to-b from-[#040d17] via-[#0a1628] to-[#0c1929] border-r border-cyan-500/10 p-6 flex flex-col">
            {/* Logo / App Name */}
            <Link href="/" className="mb-10 px-2 flex items-center gap-3 group cursor-pointer">
                <img
                    src="/icon.png"
                    alt="Logo"
                    className="w-12 h-12 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform"
                />
                <div>
                    <h1
                        className="text-2xl font-black tracking-tight text-gradient-ocean group-hover:opacity-80 transition-opacity"
                        title={config.appName}
                    >
                        {config.appName}
                    </h1>
                    <p className="text-xs text-cyan-400/60 font-medium">Yönetim Paneli</p>
                </div>
            </Link>

            {/* Navigation Items */}
            <nav className="flex flex-col gap-1">
                {items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={twMerge(
                                "group relative flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-300",
                                "hover:bg-cyan-500/10 hover:translate-x-1",
                                isActive
                                    ? "bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border-l-[3px] border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                                    : "text-slate-400 hover:text-cyan-300"
                            )}
                        >
                            {/* Icon */}
                            <item.icon
                                size={22}
                                strokeWidth={2}
                                className={twMerge(
                                    "transition-all duration-300",
                                    isActive
                                        ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                        : "text-slate-500 group-hover:text-cyan-400"
                                )}
                            />

                            {/* Label */}
                            <span className="flex-1">{item.label}</span>

                            {/* Badge */}
                            {item.badge ? (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                                    {item.badge}
                                </span>
                            ) : null}

                            {/* Active indicator */}
                            {isActive && !item.badge && (
                                <div className="absolute right-4 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom decoration */}
            <div className="mt-auto pt-6 border-t border-cyan-500/10 space-y-4">
                <button
                    onClick={handleManualReport}
                    disabled={sendingReport}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 rounded-xl py-2.5 text-xs font-bold text-cyan-400 transition-all disabled:opacity-50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] group"
                >
                    <Send size={14} className={twMerge("transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5", sendingReport && "animate-pulse")} />
                    {sendingReport ? "Gönderiliyor..." : "Manuel Rapor Gönder"}
                </button>
                <div className="px-2 text-[10px] text-slate-600 text-center font-mono">
                    Ocean Elite v1.0
                </div>
            </div>
        </aside>
    )
}
