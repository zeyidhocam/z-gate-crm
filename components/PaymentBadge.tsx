"use client"

import { useState, useEffect } from "react"
import { CreditCard, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { format, isPast, isToday, parseISO, differenceInDays } from "date-fns"
import { tr } from "date-fns/locale"
import type { PaymentSchedule } from "@/components/PaymentScheduleDialog"

interface PaymentBadgeProps {
    clientId: string
    className?: string
    compact?: boolean
}

export function PaymentBadge({ clientId, className, compact = false }: PaymentBadgeProps) {
    const [schedules, setSchedules] = useState<PaymentSchedule[]>([])
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data, error } = await supabase
                    .from('payment_schedules')
                    .select('*')
                    .eq('client_id', clientId)
                    .eq('is_paid', false)
                    .order('due_date', { ascending: true })
                    .limit(5)

                if (error) {
                    setLoaded(true)
                    return
                }
                setSchedules(data || [])
            } catch {
                // Silent fail
            } finally {
                setLoaded(true)
            }
        }
        fetch()
    }, [clientId])

    if (!loaded || schedules.length === 0) return null

    const nextPayment = schedules[0]
    const dueDate = parseISO(nextPayment.due_date)
    const isOverdue = isPast(dueDate) && !isToday(dueDate)
    const isDueToday = isToday(dueDate)
    const daysUntil = differenceInDays(dueDate, new Date())

    // Compact mode for mobile
    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border",
                isOverdue
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : isDueToday
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                className
            )}>
                {isOverdue ? (
                    <AlertCircle size={10} />
                ) : isDueToday ? (
                    <Clock size={10} />
                ) : (
                    <CreditCard size={10} />
                )}
                <span>{nextPayment.amount.toLocaleString('tr-TR')} ₺</span>
                <span className="opacity-70">
                    {isOverdue
                        ? "gecikti"
                        : isDueToday
                            ? "bugün"
                            : `${daysUntil}g`
                    }
                </span>
            </div>
        )
    }

    // Full mode for desktop
    return (
        <div className={cn(
            "relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all",
            isOverdue
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : isDueToday
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : daysUntil <= 3
                        ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
            className
        )}>
            {isOverdue ? (
                <AlertCircle size={14} className="shrink-0" />
            ) : isDueToday ? (
                <Clock size={14} className="shrink-0" />
            ) : schedules.every(s => s.is_paid) ? (
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
            ) : (
                <CreditCard size={14} className="shrink-0" />
            )}

            <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold opacity-70">
                    {isOverdue
                        ? "Gecikmiş Ödeme"
                        : isDueToday
                            ? "Bugün Ödeme"
                            : `${daysUntil} gün sonra`
                    }
                </span>
                <span className="text-xs font-black">
                    {nextPayment.amount.toLocaleString('tr-TR')} ₺
                </span>
                <span className="text-[9px] opacity-60">
                    {format(dueDate, 'd MMM', { locale: tr })}
                </span>
            </div>

            {/* Overdue pulse */}
            {isOverdue && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-[#0c1929]"></span>
                </span>
            )}

            {/* Multiple payments indicator */}
            {schedules.length > 1 && (
                <span className="text-[8px] font-bold opacity-50 ml-auto">
                    +{schedules.length - 1}
                </span>
            )}
        </div>
    )
}
