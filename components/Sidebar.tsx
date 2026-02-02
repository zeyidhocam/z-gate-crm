
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
        <div className="w-[240px] h-screen bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl border-r border-purple-500/10 p-5 flex flex-col">
            {/* Logo / App Name */}
            <div className="mb-8 px-3">
                <h1
                    className="text-xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent truncate tracking-tight"
                    title={config.appName}
                >
                    {config.appName}
                </h1>
            </div>

            {/* Navigation Items */}
            <nav className="flex flex-col gap-2">
                {items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={twMerge(
                                "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out",
                                "hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02]",
                                "active:scale-[0.98]",
                                isActive && "bg-gradient-to-r from-purple-500/25 via-pink-500/15 to-transparent border-l-2 border-purple-400 shadow-lg shadow-purple-500/20"
                            )}
                        >
                            {/* Icon */}
                            <item.icon
                                size={22}
                                strokeWidth={2.5}
                                className={twMerge(
                                    "transition-all duration-300",
                                    isActive
                                        ? "text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                                        : "text-slate-400 group-hover:text-purple-400 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                )}
                            />

                            {/* Label - BOLD and bright */}
                            <span
                                className={twMerge(
                                    "font-bold text-[15px] tracking-wide transition-all duration-300",
                                    isActive
                                        ? "text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                                        : "text-slate-300 group-hover:text-white"
                                )}
                            >
                                {item.label}
                            </span>

                            {/* Active indicator dot */}
                            {isActive && (
                                <div className="absolute right-3 w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg shadow-purple-400/60 animate-pulse" />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
