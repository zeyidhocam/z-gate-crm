
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Bell, BrainCircuit, Settings, Calendar } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { useSettings } from '@/components/providers/settings-provider'

export function Sidebar() {
    const pathname = usePathname()
    const { config } = useSettings()

    if (pathname === '/login') return null

    const items = [
        { label: 'Ana Sayfa', icon: LayoutDashboard, path: '/' },
        { label: 'Rezervasyonlar', icon: Calendar, path: '/reservations' },
        { label: 'Müşteriler', icon: Users, path: '/clients' },
        { label: 'Hatırlatmalar', icon: Bell, path: '/reminders' },
        { label: 'Bakım Yap', icon: BrainCircuit, path: '/analysis' },
        { label: 'Ayarlar', icon: Settings, path: '/settings' },
    ]

    return (
        <div className="w-[240px] h-screen bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80 backdrop-blur-xl border-r border-white/5 p-5 flex flex-col">
            {/* Logo / App Name */}
            <div className="mb-8 px-3">
                <h1
                    className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent truncate"
                    title={config.appName}
                >
                    {config.appName}
                </h1>
            </div>

            {/* Navigation Items */}
            <nav className="flex flex-col gap-1.5">
                {items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={twMerge(
                                "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out",
                                "hover:bg-white/5 hover:shadow-lg hover:shadow-purple-500/5 hover:scale-[1.02]",
                                "active:scale-[0.98]",
                                isActive && "bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-transparent border-l-2 border-purple-400 shadow-lg shadow-purple-500/10"
                            )}
                        >
                            {/* Hover glow effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-purple-500/0 opacity-0 group-hover:opacity-100 group-hover:from-purple-500/10 group-hover:via-pink-500/5 group-hover:to-transparent transition-all duration-300" />

                            {/* Icon */}
                            <item.icon
                                size={20}
                                className={twMerge(
                                    "relative z-10 transition-all duration-300",
                                    isActive
                                        ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                                        : "text-slate-500 group-hover:text-purple-400 group-hover:drop-shadow-[0_0_6px_rgba(168,85,247,0.3)]"
                                )}
                            />

                            {/* Label with gradient on active/hover */}
                            <span
                                className={twMerge(
                                    "relative z-10 font-medium transition-all duration-300",
                                    isActive
                                        ? "bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent"
                                        : "text-slate-500 group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:via-pink-300 group-hover:to-purple-400 group-hover:bg-clip-text group-hover:text-transparent"
                                )}
                            >
                                {item.label}
                            </span>

                            {/* Active indicator dot */}
                            {isActive && (
                                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg shadow-purple-400/50 animate-pulse" />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
