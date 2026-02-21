"use client"

import { useState, useEffect } from "react"
import { CreditCard, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { format, isPast, isToday, parseISO, differenceInDays } from "date-fns"
import { tr } from "date-fns/locale"
import { getRemaining, type PaymentSchedule } from "@/components/PaymentScheduleDialog"

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
                    .order('due_date', { ascending: true })
                    .limit(8)

                if (error) {
                    setLoaded(true)
                    return
                }
                setSchedules((data || []) as PaymentSchedule[])
            } catch {
                // Silent fail
            } finally {
                setLoaded(true)
            }
        }
        fetch()
    }, [clientId])

    if (!loaded || schedules.length === 0) return null

    const openSchedules = schedules.filter((schedule) => getRemaining(schedule) > 0)
    if (openSchedules.length === 0) return null

    const nextPayment = openSchedules[0]
    const nextRemaining = getRemaining(nextPayment)
    const dueDate = parseISO(nextPayment.due_date)
    const overdue = isPast(dueDate) && !isToday(dueDate)
    const dueToday = isToday(dueDate)
    const daysUntil = differenceInDays(dueDate, new Date())

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border",
                overdue
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : dueToday
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                className
            )}>
                {overdue ? <AlertCircle size={10} /> : dueToday ? <Clock size={10} /> : <CreditCard size={10} />}
                <span>{nextRemaining.toLocaleString('tr-TR')} TL</span>
                <span className="opacity-70">
                    {overdue ? "gecikti" : dueToday ? "bugun" : `${daysUntil}g`}
                </span>
            </div>
        )
    }

    return (
        <div className={cn(
            "relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all",
            overdue
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : dueToday
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : daysUntil <= 3
                        ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
            className
        )}>
            {overdue ? <AlertCircle size={14} className="shrink-0" /> : dueToday ? <Clock size={14} className="shrink-0" /> : <CreditCard size={14} className="shrink-0" />}

            <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold opacity-70">
                    {overdue ? "Gecikmis Odeme" : dueToday ? "Bugun Odeme" : `${daysUntil} gun sonra`}
                </span>
                <span className="text-xs font-black">
                    {nextRemaining.toLocaleString('tr-TR')} TL
                </span>
                <span className="text-[9px] opacity-60">
                    {format(dueDate, 'd MMM', { locale: tr })}
                </span>
            </div>

            {overdue && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-[#0c1929]"></span>
                </span>
            )}

            {openSchedules.length > 1 && (
                <span className="text-[8px] font-bold opacity-50 ml-auto">
                    +{openSchedules.length - 1}
                </span>
            )}
        </div>
    )
}
