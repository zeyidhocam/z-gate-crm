'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Bell, Settings, Calendar, DollarSign, CalendarDays, Wallet, Send, Menu, X } from 'lucide-react'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'
import { useSettings } from '@/components/providers/settings-provider'
import { supabase } from '@/lib/supabase'

export function Sidebar() {
    const pathname = usePathname()
    const { config } = useSettings()
    const [reminderCount, setReminderCount] = useState(0)
    const [sendingReport, setSendingReport] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    // Sayfa değiştiğinde mobil menüyü kapat
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    // Mobil menü açıkken body scroll'u engelle
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileOpen])

    const closeMobile = useCallback(() => setMobileOpen(false), [])

    const handleManualReport = async () => {
        try {
            setSendingReport(true)
            const res = await fetch('/api/cron/daily-report')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = await res.json() as any

            if (data.ok) {
                toast.success("Rapor başarıyla Telegram'a gönderildi!")
            } else {
                toast.error("Rapor gönderilemedi: " + (data.error || "Bilinmeyen hata"))
            }
        } catch {
            // Hata kaydi gizlendi
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const count = data.filter((r: any) => {
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

    const sidebarContent = (
        <>
            {/* Logo / App Name */}
            <Link href="/" className="mb-8 lg:mb-10 px-2 flex items-center gap-3 group cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/icon.png"
                    alt="Logo"
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0">
                    <h1
                        className="text-xl lg:text-2xl font-black tracking-tight text-gradient-ocean group-hover:opacity-80 transition-opacity truncate"
                        title={config.appName}
                    >
                        {config.appName}
                    </h1>
                    <p className="text-xs text-cyan-400/60 font-medium">Yönetim Paneli</p>
                </div>
            </Link>

            {/* Navigation Items */}
            <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
                {items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={twMerge(
                                "group relative flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-3 lg:py-3.5 rounded-xl font-semibold text-sm lg:text-[15px] transition-all duration-150",
                                "hover:bg-cyan-500/10 hover:translate-x-1",
                                isActive
                                    ? "bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border-l-[3px] border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                                    : "text-slate-400 hover:text-cyan-300"
                            )}
                        >
                            {/* Icon */}
                            <item.icon
                                size={20}
                                strokeWidth={2}
                                className={twMerge(
                                    "shrink-0 transition-all duration-150",
                                    isActive
                                        ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                        : "text-slate-500 group-hover:text-cyan-400"
                                )}
                            />

                            {/* Label */}
                            <span className="flex-1 truncate">{item.label}</span>

                            {/* Badge */}
                            {item.badge ? (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                                    {item.badge}
                                </span>
                            ) : null}

                            {/* Active indicator */}
                            {isActive && !item.badge && (
                                <div className="absolute right-3 lg:right-4 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom decoration */}
            <div className="mt-auto pt-4 lg:pt-6 border-t border-cyan-500/10 space-y-3 lg:space-y-4">
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
        </>
    )

    return (
        <>
            {/* Mobil Üst Bar (Hamburger Menü) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#040d17]/95 backdrop-blur-md border-b border-cyan-500/10 flex items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                    <span className="text-lg font-black text-gradient-ocean truncate">{config.appName}</span>
                </Link>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    aria-label="Menüyü aç/kapat"
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobil Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={closeMobile}
                />
            )}

            {/* Mobil Sidebar (Kayar Panel) */}
            <aside
                className={twMerge(
                    "lg:hidden fixed top-14 left-0 bottom-0 z-50 w-[280px] bg-gradient-to-b from-[#040d17] via-[#0a1628] to-[#0c1929] border-r border-cyan-500/10 p-4 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>

            {/* Masaüstü Sidebar (Her zamanki gibi) */}
            <aside className="hidden lg:flex w-[260px] h-screen sticky top-0 bg-gradient-to-b from-[#040d17] via-[#0a1628] to-[#0c1929] border-r border-cyan-500/10 p-6 flex-col shrink-0">
                {sidebarContent}
            </aside>
        </>
    )
}
