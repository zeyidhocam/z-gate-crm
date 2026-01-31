
import { LucideIcon } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

interface KPICardProps {
    title: string
    value: string
    icon: LucideIcon
    colorClass: string // e.g. "text-purple-500"
    bgClass: string // e.g. "bg-purple-500/15"
    borderClass: string // e.g. "border-purple-500/30"
}

export function KPICard({ title, value, icon: Icon, colorClass, bgClass, borderClass }: KPICardProps) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 transition-all hover:bg-slate-800/50">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className={twMerge("p-2.5 rounded-xl border-2", bgClass, borderClass)}>
                        <Icon size={24} className={colorClass} />
                    </div>
                    <span className={twMerge("text-3xl font-extrabold", colorClass)}>
                        {value}
                    </span>
                </div>
                <span className="text-slate-400 font-medium text-sm">
                    {title}
                </span>
            </div>
        </div>
    )
}
