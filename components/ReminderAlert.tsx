"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle, Clock, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { parseISO, isBefore, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Reminder {
    id: string
    title: string
    reminder_date: string
    is_completed: boolean
}

export function ReminderAlert() {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReminders()
    }, [])

    const fetchReminders = async () => {
        try {
            const { data, error } = await supabase
                .from('reminders')
                .select('id, title, reminder_date, is_completed')
                .eq('is_completed', false)
                .order('reminder_date', { ascending: true })
                .limit(10)

            if (error) {
                // Tablo yoksa sessizce boş dön
                setReminders([])
                return
            }
            setReminders(data || [])
        } catch {
            // Hata olursa sessizce boş dön
            setReminders([])
        } finally {
            setLoading(false)
        }
    }

    // Bugün ve gecikmiş
    const todayReminders = reminders.filter(r => isToday(parseISO(r.reminder_date)))
    const overdueReminders = reminders.filter(r => isBefore(parseISO(r.reminder_date), new Date()) && !isToday(parseISO(r.reminder_date)))

    const totalUrgent = todayReminders.length + overdueReminders.length

    if (loading) return null
    if (totalUrgent === 0) return null

    return (
        <Link href="/reminders">
            <div className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.02]",
                overdueReminders.length > 0
                    ? "bg-gradient-to-r from-red-500/10 to-orange-500/5 border-red-500/30 hover:border-red-500/50"
                    : "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/30 hover:border-amber-500/50"
            )}>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        overdueReminders.length > 0 ? "bg-red-500/20" : "bg-amber-500/20"
                    )}>
                        {overdueReminders.length > 0 ? (
                            <AlertTriangle className="text-red-400" size={24} />
                        ) : (
                            <Bell className="text-amber-400" size={24} />
                        )}
                    </div>
                    <div className="flex-1">
                        {overdueReminders.length > 0 ? (
                            <div className="flex flex-col">
                                <span className={cn(
                                    "font-bold text-lg",
                                    "text-red-400"
                                )}>
                                    {overdueReminders.length} Gecikmiş İşlem!
                                </span>
                                <span className="text-sm text-slate-500">
                                    {todayReminders.length > 0 ? `+${todayReminders.length} tane de bugün var` : "Lütfen kontrol edin"}
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <span className={cn(
                                    "font-bold text-lg",
                                    "text-amber-400"
                                )}>
                                    Bugün {todayReminders.length} Hatırlatma
                                </span>
                                <span className="text-sm text-slate-500">
                                    Zamanı gelen işlemleri incele
                                </span>
                            </div>
                        )}
                    </div>
                    <ChevronRight className="text-slate-600" size={20} />
                </div>
            </div>
        </Link>
    )
}
