
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Bell, BrainCircuit, Settings, Calendar, DollarSign, CalendarDays } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { useSettings } from '@/components/providers/settings-provider'

export function Sidebar() {
    const pathname = usePathname()
    const { config } = useSettings()

    if (pathname === '/login') return null

    const items = [
        { label: 'Ana Sayfa', icon: LayoutDashboard, path: '/' },
        { label: 'Rezervasyonlar', icon: Calendar, path: '/reservations' },
        { label: 'Takvim', icon: CalendarDays, path: '/calendar' },
        { label: 'Müşteriler', icon: Users, path: '/customers' },
        { label: 'Kayıtlar', icon: Users, path: '/clients' },
        { label: 'Finans', icon: DollarSign, path: '/finance' },
        { label: 'Hatırlatmalar', icon: Bell, path: '/reminders' },
        { label: 'Bakım Yap', icon: BrainCircuit, path: '/analysis' },
        { label: 'Ayarlar', icon: Settings, path: '/settings' },
    ]

    return (
        <aside className="w-[260px] h-screen sticky top-0 bg-gradient-to-b from-[#040d17] via-[#0a1628] to-[#0c1929] border-r border-cyan-500/10 p-6 flex flex-col">
            {/* Logo / App Name */}
            <div className="mb-10 px-2">
                <h1
                    className="text-2xl font-black tracking-tight text-gradient-ocean"
                    title={config.appName}
                >
                    {config.appName}
                </h1>
                <p className="text-xs text-cyan-400/60 mt-1 font-medium">Yönetim Paneli</p>
            </div>

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
                            <span>{item.label}</span>

                            {/* Active indicator */}
                            {isActive && (
                                <div className="absolute right-4 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom decoration */}
            <div className="mt-auto pt-6 border-t border-cyan-500/10">
                <div className="px-2 text-xs text-slate-600">
                    Ocean Elite v1.0
                </div>
            </div>
        </aside>
    )
}
