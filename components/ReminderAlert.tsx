"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle, ChevronRight, CreditCard, Wallet } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { parseISO, isBefore, isToday, differenceInDays, format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Reminder {
    id: string
    title: string
    reminder_date: string
    is_completed: boolean
}

interface PaymentDue {
    id: string
    amount: number
    due_date: string
    client_name: string
}

export function ReminderAlert() {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [paymentsDue, setPaymentsDue] = useState<PaymentDue[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReminders()
        fetchPaymentsDue()
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
                setReminders([])
                return
            }
            setReminders(data || [])
        } catch {
            setReminders([])
        } finally {
            setLoading(false)
        }
    }

    const fetchPaymentsDue = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_schedules')
                .select('id, amount, due_date, clients(full_name, name)')
                .eq('is_paid', false)
                .order('due_date', { ascending: true })
                .limit(10)

            if (error) {
                setPaymentsDue([])
                return
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = (data || []).map((item: any) => ({
                id: item.id,
                amount: item.amount,
                due_date: item.due_date,
                client_name: item.clients?.full_name || item.clients?.name || 'Bilinmeyen'
            }))

            setPaymentsDue(mapped)
        } catch {
            setPaymentsDue([])
        }
    }

    // Reminder calculations
    const todayReminders = reminders.filter(r => isToday(parseISO(r.reminder_date)))
    const overdueReminders = reminders.filter(r => isBefore(parseISO(r.reminder_date), new Date()) && !isToday(parseISO(r.reminder_date)))
    const totalUrgentReminders = todayReminders.length + overdueReminders.length

    // Payment calculations
    const overduePayments = paymentsDue.filter(p => isBefore(parseISO(p.due_date), new Date()) && !isToday(parseISO(p.due_date)))
    const todayPayments = paymentsDue.filter(p => isToday(parseISO(p.due_date)))
    const soonPayments = paymentsDue.filter(p => {
        const daysUntil = differenceInDays(parseISO(p.due_date), new Date())
        return daysUntil > 0 && daysUntil <= 3
    })
    const totalUrgentPayments = overduePayments.length + todayPayments.length
    const totalPaymentAmount = [...overduePayments, ...todayPayments].reduce((sum, p) => sum + p.amount, 0)

    if (loading) return null
    if (totalUrgentReminders === 0 && totalUrgentPayments === 0 && soonPayments.length === 0) return null

    return (
        <div className="space-y-3">
            {/* Reminder Alert */}
            {totalUrgentReminders > 0 && (
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
                                        <span className="font-bold text-lg text-red-400">
                                            {overdueReminders.length} Gecikmiş İşlem!
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {todayReminders.length > 0 ? `+${todayReminders.length} tane de bugün var` : "Lütfen kontrol edin"}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg text-amber-400">
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
            )}

            {/* Payment Alert */}
            {(totalUrgentPayments > 0 || soonPayments.length > 0) && (
                <Link href="/reminders?tab=payments">
                    <div className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.02]",
                        overduePayments.length > 0
                            ? "bg-gradient-to-r from-red-500/10 to-rose-500/5 border-red-500/30 hover:border-red-500/50"
                            : todayPayments.length > 0
                                ? "bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/30 hover:border-amber-500/50"
                                : "bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border-cyan-500/30 hover:border-cyan-500/50"
                    )}>
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                overduePayments.length > 0 ? "bg-red-500/20" :
                                    todayPayments.length > 0 ? "bg-amber-500/20" : "bg-cyan-500/20"
                            )}>
                                {overduePayments.length > 0 ? (
                                    <Wallet className="text-red-400" size={24} />
                                ) : (
                                    <CreditCard className={todayPayments.length > 0 ? "text-amber-400" : "text-cyan-400"} size={24} />
                                )}
                            </div>
                            <div className="flex-1">
                                {overduePayments.length > 0 ? (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg text-red-400">
                                            {overduePayments.length} Gecikmiş Ödeme!
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            Toplam: {totalPaymentAmount.toLocaleString('tr-TR')} ₺
                                            {todayPayments.length > 0 && ` (+${todayPayments.length} bugün)`}
                                        </span>
                                    </div>
                                ) : todayPayments.length > 0 ? (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg text-amber-400">
                                            Bugün {todayPayments.length} Ödeme Bekleniyor
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            Toplam: {totalPaymentAmount.toLocaleString('tr-TR')} ₺
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg text-cyan-400">
                                            {soonPayments.length} Yaklaşan Ödeme
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {soonPayments.map(p => (
                                                <span key={p.id} className="mr-2">
                                                    {p.client_name}: {p.amount.toLocaleString('tr-TR')} ₺ ({format(parseISO(p.due_date), 'd MMM', { locale: tr })})
                                                </span>
                                            ))}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <ChevronRight className="text-slate-600" size={20} />
                        </div>
                    </div>
                </Link>
            )}
        </div>
    )
}
