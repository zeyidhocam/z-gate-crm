
import { LucideIcon } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

interface KPICardProps {
    title: string
    value: string
    icon: LucideIcon
    colorClass: string
    bgClass: string
    borderClass: string
}

export function KPICard({ title, value, icon: Icon, colorClass, bgClass, borderClass }: KPICardProps) {
    return (
        <div className={twMerge(
            "relative group p-6 rounded-2xl transition-all duration-300",
            "bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90",
            "backdrop-blur-xl border-2",
            borderClass,
            "hover:scale-[1.02] hover:shadow-lg",
            "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
        )}>
            {/* Hover Background - Category Color */}
            <div className={twMerge(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                bgClass.replace('/10', '/20')
            )} />
            {/* Glow Effect */}
            <div className={twMerge(
                "absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10",
                bgClass.replace('/10', '/30')
            )} />

            <div className="flex items-center justify-between relative z-10">
                {/* Icon Container */}
                <div className={twMerge(
                    "p-3.5 rounded-xl border-2 shadow-inner",
                    bgClass,
                    borderClass,
                    "shadow-black/20"
                )}>
                    <Icon size={26} className={twMerge(colorClass, "drop-shadow-lg")} strokeWidth={2.5} />
                </div>

                {/* Value */}
                <div className="text-right">
                    <span className={twMerge(
                        "text-4xl font-black tracking-tight",
                        colorClass,
                        "drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                    )}>
                        {value}
                    </span>
                </div>
            </div>

            {/* Title */}
            <div className="mt-4 relative z-10">
                <span className="text-slate-300 font-bold text-sm tracking-wide">
                    {title}
                </span>
            </div>
        </div>
    )
}
