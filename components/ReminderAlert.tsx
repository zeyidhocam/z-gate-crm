"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle, ChevronRight, CreditCard, Wallet, CalendarCheck, TrendingUp, CheckCircle2, X, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { parseISO, isBefore, isToday, differenceInDays, format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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
    const [confirmPayment, setConfirmPayment] = useState<PaymentDue | null>(null)
    const [markingPaid, setMarkingPaid] = useState(false)

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

    const handleMarkPaid = async (payment: PaymentDue) => {
        setMarkingPaid(true)
        try {
            const { error } = await supabase
                .from('payment_schedules')
                .update({ is_paid: true, paid_at: new Date().toISOString() })
                .eq('id', payment.id)

            if (error) throw error
            toast.success(`${payment.client_name} - ${Number(payment.amount).toLocaleString('tr-TR')} ₺ ödeme tamamlandı!`)
            setConfirmPayment(null)
            fetchPaymentsDue()
        } catch {
            toast.error("Ödeme durumu güncellenemedi.")
        } finally {
            setMarkingPaid(false)
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
                                            <div key={p.id} className="text-[11px] sm:text-xs text-red-400/80 flex items-center gap-1.5 group">
                                                <Wallet size={9} className="shrink-0" />
                                                <span className="font-semibold truncate">{p.client_name}</span>
                                                <span className="text-red-400/50">•</span>
                                                <span className="font-bold shrink-0">{Number(p.amount).toLocaleString('tr-TR')} ₺</span>
                                                <span className="text-red-400/40 text-[9px] shrink-0">
                                                    ({Math.abs(differenceInDays(parseISO(p.due_date), new Date()))} gün)
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmPayment(p) }}
                                                    className="ml-auto shrink-0 p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all active:scale-95"
                                                    title="Ödendi olarak işaretle"
                                                >
                                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                                </button>
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
                                            <div key={p.id} className="text-[11px] sm:text-xs text-amber-400/80 flex items-center gap-1.5 group">
                                                <CreditCard size={9} className="shrink-0" />
                                                <span className="font-semibold truncate">{p.client_name}</span>
                                                <span className="text-amber-400/50">•</span>
                                                <span className="font-bold shrink-0">{Number(p.amount).toLocaleString('tr-TR')} ₺</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmPayment(p) }}
                                                    className="ml-auto shrink-0 p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all active:scale-95"
                                                    title="Ödendi olarak işaretle"
                                                >
                                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                                </button>
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

            {/* Payment Confirmation Dialog */}
            <Dialog open={!!confirmPayment} onOpenChange={(open) => !open && setConfirmPayment(null)}>
                <DialogContent className="bg-[#0a1628] border-slate-700/50 max-w-sm sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-slate-200 text-lg">
                            Ödeme Onayı
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm">
                            Bu ödemeyi tamamlandı olarak işaretlemek istediğinize emin misiniz?
                        </DialogDescription>
                    </DialogHeader>

                    {confirmPayment && (
                        <div className="space-y-4">
                            {/* Payment Details Card */}
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                        <Wallet size={18} className="text-cyan-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-200 truncate">
                                            {confirmPayment.client_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Vade: {format(parseISO(confirmPayment.due_date), 'd MMMM yyyy', { locale: tr })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                                    <span className="text-sm text-slate-400">Tutar</span>
                                    <span className="text-xl font-black text-emerald-400">
                                        {Number(confirmPayment.amount).toLocaleString('tr-TR')} ₺
                                    </span>
                                </div>
                                {isBefore(parseISO(confirmPayment.due_date), new Date()) && !isToday(parseISO(confirmPayment.due_date)) && (
                                    <div className="text-[11px] text-red-400/70 bg-red-500/10 rounded-lg px-3 py-1.5 text-center">
                                        {Math.abs(differenceInDays(parseISO(confirmPayment.due_date), new Date()))} gün gecikmiş
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                                    onClick={() => setConfirmPayment(null)}
                                    disabled={markingPaid}
                                >
                                    <X size={16} className="mr-1.5" />
                                    Ödenmedi
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleMarkPaid(confirmPayment)}
                                    disabled={markingPaid}
                                >
                                    {markingPaid ? (
                                        <Loader2 size={16} className="mr-1.5 animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={16} className="mr-1.5" />
                                    )}
                                    Ödendi
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
