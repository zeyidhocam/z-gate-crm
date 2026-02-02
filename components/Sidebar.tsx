
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
        <div className="w-[240px] h-screen bg-slate-900/50 border-r border-slate-700 p-5 flex flex-col text-slate-100">
            <div className="mb-6 px-3">
                <h1 className="text-xl font-bold text-primary truncate" title={config.appName}>
                    {config.appName}
                </h1>
            </div>

            <div className="flex flex-col gap-2">
                {items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={twMerge(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 border border-transparent",
                                "hover:bg-primary/10 hover:border-primary/20 hover:text-primary",
                                isActive && "bg-primary/15 border-primary/50 text-white shadow-sm shadow-primary/10"
                            )}
                        >
                            <item.icon size={20} className={isActive ? "text-primary" : "text-slate-400 group-hover:text-primary"} />
                            <span className={isActive ? "text-primary-foreground font-medium" : "text-slate-400"}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
