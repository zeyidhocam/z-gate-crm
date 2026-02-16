"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle, ChevronRight, CreditCard, Wallet, CalendarCheck, TrendingUp } from "lucide-react"
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

interface ReservationDue {
    id: string
    name: string
    price: number
    reservation_at: string
}

export function ReminderAlert() {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [paymentsDue, setPaymentsDue] = useState<PaymentDue[]>([])
    const [reservationsDue, setReservationsDue] = useState<ReservationDue[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReminders()
        fetchPaymentsDue()
        fetchTodayReservations()
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

    const fetchTodayReservations = async () => {
        try {
            const today = new Date()
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

            const { data, error } = await supabase
                .from('clients')
                .select('id, full_name, name, price_agreed, price, reservation_at')
                .eq('status', 'Rezervasyon')
                .gte('reservation_at', startOfDay)
                .lt('reservation_at', endOfDay)

            if (error) {
                setReservationsDue([])
                return
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = (data || []).map((item: any) => ({
                id: item.id,
                name: item.full_name || item.name || 'Bilinmeyen',
                price: Number(item.price_agreed) || Number(item.price) || 0,
                reservation_at: item.reservation_at
            }))

            setReservationsDue(mapped)
        } catch {
            setReservationsDue([])
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

    // Combined totals
    const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)
    const totalTodayPaymentAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalReservationAmount = reservationsDue.reduce((sum, r) => sum + r.price, 0)
    const grandTotal = totalOverdueAmount + totalTodayPaymentAmount + totalReservationAmount
    const hasAnyPaymentInfo = overduePayments.length > 0 || todayPayments.length > 0 || reservationsDue.length > 0 || soonPayments.length > 0

    if (loading) return null
    if (totalUrgentReminders === 0 && !hasAnyPaymentInfo) return null

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

            {/* Combined Payment & Reservation Alert */}
            {hasAnyPaymentInfo && (
                <div className={cn(
                    "p-4 rounded-xl border transition-all",
                    overduePayments.length > 0
                        ? "bg-gradient-to-r from-red-500/10 to-amber-500/5 border-red-500/30"
                        : todayPayments.length > 0 || reservationsDue.length > 0
                            ? "bg-gradient-to-r from-amber-500/10 to-cyan-500/5 border-amber-500/30"
                            : "bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border-cyan-500/30"
                )}>
                    <div className="flex items-start gap-3">
                        <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                            overduePayments.length > 0 ? "bg-red-500/20" :
                                (todayPayments.length > 0 || reservationsDue.length > 0) ? "bg-amber-500/20" : "bg-cyan-500/20"
                        )}>
                            {overduePayments.length > 0 ? (
                                <Wallet className="text-red-400" size={22} />
                            ) : (
                                <TrendingUp className={todayPayments.length > 0 || reservationsDue.length > 0 ? "text-amber-400" : "text-cyan-400"} size={22} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* Grand Total */}
                            {grandTotal > 0 && (
                                <div className={cn(
                                    "font-black text-lg sm:text-xl mb-1",
                                    overduePayments.length > 0 ? "text-red-400" : "text-amber-400"
                                )}>
                                    {grandTotal.toLocaleString('tr-TR')} ₺
                                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 ml-2">
                                        bugün beklenen
                                    </span>
                                </div>
                            )}

                            {/* Detailed Breakdown */}
                            <div className="space-y-1.5">
                                {/* Overdue Payments - per person */}
                                {overduePayments.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider mb-0.5">
                                            Gecikmiş Taksitler
                                        </div>
                                        {overduePayments.map(p => (
                                            <div key={p.id} className="text-[11px] sm:text-xs text-red-400/80 flex items-center gap-1.5">
                                                <Wallet size={9} className="shrink-0" />
                                                <span className="font-semibold truncate">{p.client_name}</span>
                                                <span className="text-red-400/50">•</span>
                                                <span className="font-bold shrink-0">{Number(p.amount).toLocaleString('tr-TR')} ₺</span>
                                                <span className="text-red-400/40 text-[9px] shrink-0">
                                                    ({Math.abs(differenceInDays(parseISO(p.due_date), new Date()))} gün gecikti)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Today's Scheduled Payments - per person */}
                                {todayPayments.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-bold text-amber-400/60 uppercase tracking-wider mb-0.5">
                                            Bugünkü Taksitler
                                        </div>
                                        {todayPayments.map(p => (
                                            <div key={p.id} className="text-[11px] sm:text-xs text-amber-400/80 flex items-center gap-1.5">
                                                <CreditCard size={9} className="shrink-0" />
                                                <span className="font-semibold truncate">{p.client_name}</span>
                                                <span className="text-amber-400/50">•</span>
                                                <span className="font-bold shrink-0">{Number(p.amount).toLocaleString('tr-TR')} ₺</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Today's Reservations - per person */}
                                {reservationsDue.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider mb-0.5">
                                            Bugünkü Rezervasyonlar
                                        </div>
                                        {reservationsDue.map(r => (
                                            <div key={r.id} className="text-[11px] sm:text-xs text-cyan-400/80 flex items-center gap-1.5">
                                                <CalendarCheck size={9} className="shrink-0" />
                                                <span className="font-semibold truncate">{r.name}</span>
                                                <span className="text-cyan-400/50">•</span>
                                                <span className="font-bold shrink-0">
                                                    {r.price > 0 ? `${r.price.toLocaleString('tr-TR')} ₺` : 'Ücret belirtilmedi'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Soon Payments */}
                                {soonPayments.length > 0 && overduePayments.length === 0 && todayPayments.length === 0 && reservationsDue.length === 0 && (
                                    <div>
                                        <div className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider mb-0.5">
                                            Yaklaşan Ödemeler (3 gün içinde)
                                        </div>
                                        {soonPayments.map(p => (
                                            <div key={p.id} className="text-[11px] sm:text-xs text-cyan-400/80 flex items-center gap-1.5">
                                                <CreditCard size={9} className="shrink-0" />
                                                <span className="font-semibold truncate">{p.client_name}</span>
                                                <span className="text-cyan-400/50">•</span>
                                                <span className="font-bold shrink-0">{Number(p.amount).toLocaleString('tr-TR')} ₺</span>
                                                <span className="text-cyan-400/40 text-[9px] shrink-0">
                                                    ({format(parseISO(p.due_date), 'd MMM', { locale: tr })})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
