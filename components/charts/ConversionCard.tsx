"use client"

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversionCardProps {
    title: string
    value: number
    previousValue?: number
    suffix?: string
    description?: string
}

export function ConversionCard({ title, value, previousValue, suffix = '%', description }: ConversionCardProps) {
    const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0
    const isPositive = change > 0
    const isNegative = change < 0

    return (
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-2">
                {title}
            </div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-black text-cyan-300">
                    {value.toFixed(1)}{suffix}
                </div>
                {previousValue !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-bold",
                        isPositive && "text-emerald-400",
                        isNegative && "text-red-400",
                        !isPositive && !isNegative && "text-slate-500"
                    )}>
                        {isPositive && <TrendingUp size={14} />}
                        {isNegative && <TrendingDown size={14} />}
                        {!isPositive && !isNegative && <Minus size={14} />}
                        {change !== 0 && `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
                    </div>
                )}
            </div>
            {description && (
                <div className="text-xs text-slate-600 mt-2">
                    {description}
                </div>
            )}
        </div>
    )
}
