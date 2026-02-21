"use client"

import { type ReactNode, useState, useEffect, useCallback } from "react"
import {
    Wallet, Plus, CheckCircle2, AlertCircle, Clock, Calendar as CalendarIcon,
    Trash2, CreditCard, Banknote
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format, isPast, isToday, addDays, parseISO } from "date-fns"
import { tr } from "date-fns/locale"

export interface PaymentSchedule {
    id: string
    client_id: string
    amount: number | null
    amount_due: number | null
    amount_paid: number | null
    status: 'pending' | 'partially_paid' | 'paid' | string
    installment_no: number | null
    source: string | null
    due_date: string
    is_paid: boolean
    paid_at: string | null
    note: string | null
    updated_at: string | null
    created_at: string
}

const toNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
    }
    return 0
}

export const getAmountDue = (schedule: Partial<PaymentSchedule>) => {
    const amountDue = toNumber(schedule.amount_due)
    if (amountDue > 0) return amountDue
    return toNumber(schedule.amount)
}

export const getAmountPaid = (schedule: Partial<PaymentSchedule>) => {
    const explicitPaid = toNumber(schedule.amount_paid)
    if (explicitPaid > 0) return explicitPaid
    return schedule.is_paid ? getAmountDue(schedule) : 0
}

export const getRemaining = (schedule: Partial<PaymentSchedule>) =>
    Math.max(0, getAmountDue(schedule) - getAmountPaid(schedule))

export const isSchedulePaid = (schedule: Partial<PaymentSchedule>) =>
    schedule.status === 'paid' || schedule.is_paid || getRemaining(schedule) <= 0

export const getDisplayPaymentNote = (note: string | null | undefined, source?: string | null) => {
    if (!note) return null
    const normalized = note.toLowerCase()
    const isTechnical =
        source === 'migration' ||
        normalized.includes('backfill') ||
        normalized.includes('restore legacy') ||
        normalized.includes('payment_balance') ||
        normalized.includes('step4')

    if (isTechnical) {
        return 'Geçmiş kayıt aktarımı'
    }
    return note
}

interface PaymentScheduleDialogProps {
    clientId: string
    clientName: string
    totalPrice: number | null
    trigger?: ReactNode
    onUpdate?: () => void
}

export function PaymentScheduleDialog({
    clientId,
    clientName,
    totalPrice,
    trigger,
    onUpdate
}: PaymentScheduleDialogProps) {
    const [open, setOpen] = useState(false)
    const [schedules, setSchedules] = useState<PaymentSchedule[]>([])
    const [loading, setLoading] = useState(false)

    const [newAmount, setNewAmount] = useState("")
    const [newDate, setNewDate] = useState<Date | undefined>(addDays(new Date(), 7))
    const [newNote, setNewNote] = useState("")
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [calendarOpen, setCalendarOpen] = useState(false)

    const fetchSchedules = useCallback(async () => {
        if (!open) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('payment_schedules')
                .select('*')
                .eq('client_id', clientId)
                .order('due_date', { ascending: true })

            if (error) {
                if (error.code === '42P01') return
                throw error
            }
            setSchedules((data || []) as PaymentSchedule[])
        } catch {
            // Table might not exist on initial deployments
        } finally {
            setLoading(false)
        }
    }, [clientId, open])

    useEffect(() => {
        if (open) {
            fetchSchedules()
        }
    }, [open, fetchSchedules])

    const handleAdd = async () => {
        if (!newAmount || !newDate) return

        setSaving(true)
        try {
            const amount = parseFloat(newAmount.replace(/\./g, '').replace(',', '.'))
            if (Number.isNaN(amount) || amount <= 0) {
                toast.error("Gecerli bir tutar giriniz.")
                return
            }

            const response = await fetch('/api/payments/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    items: [{ amount, dueDate: newDate.toISOString(), note: newNote.trim() || undefined }]
                })
            })
            const apiResult = await response.json().catch(() => ({}))
            if (!response.ok || !apiResult?.ok) {
                throw new Error(apiResult?.error || 'Odeme plani eklenemedi')
            }

            toast.success("Odeme plani eklendi.")

            try {
                const message = `Yeni odeme plani\nMusteri: ${clientName}\nTutar: ${amount.toLocaleString('tr-TR')} TL\nVade: ${format(newDate, 'dd MMMM yyyy', { locale: tr })}`
                await fetch('/api/telegram/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                })
            } catch {
                // Telegram notification is best effort
            }

            setNewAmount("")
            setNewNote("")
            setNewDate(addDays(new Date(), 7))
            setShowForm(false)
            fetchSchedules()
            onUpdate?.()
        } catch {
            toast.error("Odeme plani eklenemedi.")
        } finally {
            setSaving(false)
        }
    }

    const handleCollect = async (scheduleId: string) => {
        try {
            const schedule = schedules.find(s => s.id === scheduleId)
            if (!schedule) return

            const remaining = getRemaining(schedule)
            if (remaining <= 0) {
                toast.info("Bu taksit zaten kapali.")
                return
            }

            const entered = window.prompt(
                `Tahsilat tutari (kalan: ${remaining.toLocaleString('tr-TR')} TL)`,
                remaining.toString()
            )
            if (!entered) return

            const amount = Number(entered.replace(',', '.'))
            if (!Number.isFinite(amount) || amount <= 0) {
                toast.error("Gecerli bir tahsilat tutari girin.")
                return
            }
            if (amount > remaining + 0.01) {
                toast.error("Tahsilat tutari kalan borcu asamaz.")
                return
            }

            const response = await fetch('/api/payments/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    scheduleId,
                    amount,
                    method: 'cash'
                })
            })
            const apiResult = await response.json().catch(() => ({}))
            if (!response.ok || !apiResult?.ok) {
                throw new Error(apiResult?.error || 'Tahsilat kaydedilemedi')
            }

            toast.success("Tahsilat kaydedildi.")
            fetchSchedules()
            onUpdate?.()
        } catch {
            toast.error("Guncellenemedi.")
        }
    }

    const handleDelete = async (scheduleId: string) => {
        try {
            const { data: deleted, error } = await supabase
                .from('payment_schedules')
                .delete()
                .eq('id', scheduleId)
                .select()
                .single()

            if (error) throw error

            try {
                const userRes = await supabase.auth.getUser()
                const userId = userRes?.data?.user?.id || null
                await supabase.from('audit_logs').insert([{
                    table_name: 'payment_schedules',
                    record_id: deleted.id,
                    user_id: userId,
                    action: 'delete',
                    changes: { old: deleted }
                }])
            } catch {
                // Ignore audit log failures
            }

            toast.success("Odeme plani silindi.")
            fetchSchedules()
            onUpdate?.()
        } catch {
            toast.error("Silinemedi.")
        }
    }

    const totalDue = schedules.reduce((sum, s) => sum + getAmountDue(s), 0)
    const totalPaid = schedules.reduce((sum, s) => sum + getAmountPaid(s), 0)
    const totalRemaining = Math.max(0, totalDue - totalPaid)
    const progressBase = totalPrice && totalPrice > 0 ? totalPrice : totalDue
    const progressPercent = progressBase > 0
        ? Math.min(Math.round((totalPaid / progressBase) * 100), 100)
        : 0

    const openSchedules = schedules.filter(s => getRemaining(s) > 0)
    const overdueSchedules = openSchedules.filter(s => isPast(parseISO(s.due_date)) && !isToday(parseISO(s.due_date)))
    const todaySchedules = openSchedules.filter(s => isToday(parseISO(s.due_date)))
    const upcomingSchedules = openSchedules.filter(s => !isPast(parseISO(s.due_date)) && !isToday(parseISO(s.due_date)))
    const paidSchedules = schedules.filter(s => isSchedulePaid(s))

    const hasOverdue = overdueSchedules.length > 0
    const hasToday = todaySchedules.length > 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all"
                        title="Odeme Plani"
                    >
                        <CreditCard size={16} />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-[#0c1929] border-cyan-500/20 max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-slate-100 flex items-center gap-2">
                        <Wallet size={20} className="text-emerald-400" />
                        Odeme Takibi
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <div className="text-xs text-slate-500 font-bold">MUSTERI</div>
                                <div className="text-sm text-slate-200 font-bold">{clientName}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 font-bold">TOPLAM TUTAR</div>
                                <div className="text-lg text-white font-black">
                                    {totalPrice ? `${totalPrice.toLocaleString('tr-TR')} TL` : 'Belirtilmemis'}
                                </div>
                            </div>
                        </div>

                        {(totalPrice && totalPrice > 0) || totalDue > 0 ? (
                            <div className="mt-3">
                                <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                    <span className="text-emerald-400">
                                        Tahsil edilen: {totalPaid.toLocaleString('tr-TR')} TL
                                    </span>
                                    <span className={cn(totalRemaining > 0 ? "text-amber-400" : "text-emerald-400")}>
                                        Kalan: {Math.max(0, totalRemaining).toLocaleString('tr-TR')} TL
                                    </span>
                                </div>
                                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            progressPercent >= 100
                                                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                : hasOverdue
                                                    ? "bg-gradient-to-r from-red-500 to-orange-500"
                                                    : "bg-gradient-to-r from-cyan-500 to-emerald-500"
                                        )}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <div className="text-center mt-1">
                                    <span className={cn("text-[10px] font-black", progressPercent >= 100 ? "text-emerald-400" : "text-slate-400")}>
                                        %{progressPercent}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className={cn(
                            "p-2.5 rounded-lg border text-center",
                            hasOverdue ? "bg-red-500/10 border-red-500/20" : "bg-slate-800/30 border-slate-700/30"
                        )}>
                            <div className={cn("text-lg font-black", hasOverdue ? "text-red-400" : "text-slate-500")}>
                                {overdueSchedules.length}
                            </div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Gecikmis</div>
                        </div>
                        <div className={cn(
                            "p-2.5 rounded-lg border text-center",
                            hasToday ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-800/30 border-slate-700/30"
                        )}>
                            <div className={cn("text-lg font-black", hasToday ? "text-amber-400" : "text-slate-500")}>
                                {todaySchedules.length}
                            </div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Bugun</div>
                        </div>
                        <div className="p-2.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20 text-center">
                            <div className="text-lg font-black text-emerald-400">{paidSchedules.length}</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Odendi</div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="text-center py-8">
                            <Banknote size={40} className="mx-auto mb-3 text-slate-700" />
                            <p className="text-sm text-slate-500">Henuz odeme plani eklenmemis</p>
                            <p className="text-xs text-slate-600 mt-1">Asagidaki butonla taksit ekleyebilirsiniz</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {overdueSchedules.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        Gecikmis
                                    </div>
                                    {overdueSchedules.map(schedule => (
                                        <ScheduleItem
                                            key={schedule.id}
                                            schedule={schedule}
                                            variant="overdue"
                                            onCollect={handleCollect}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            )}

                            {todaySchedules.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Clock size={12} />
                                        Bugun
                                    </div>
                                    {todaySchedules.map(schedule => (
                                        <ScheduleItem
                                            key={schedule.id}
                                            schedule={schedule}
                                            variant="today"
                                            onCollect={handleCollect}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            )}

                            {upcomingSchedules.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <CalendarIcon size={12} />
                                        Yaklasan
                                    </div>
                                    {upcomingSchedules.map(schedule => (
                                        <ScheduleItem
                                            key={schedule.id}
                                            schedule={schedule}
                                            variant="upcoming"
                                            onCollect={handleCollect}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            )}

                            {paidSchedules.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <CheckCircle2 size={12} />
                                        Tamamlanan
                                    </div>
                                    {paidSchedules.map(schedule => (
                                        <ScheduleItem
                                            key={schedule.id}
                                            schedule={schedule}
                                            variant="paid"
                                            onCollect={handleCollect}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {showForm ? (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-cyan-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-cyan-400 uppercase">Yeni Odeme Plani</span>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-xs text-slate-500 hover:text-slate-300"
                                >
                                    Vazgec
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tutar (TL) *</label>
                                    <Input
                                        type="text"
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(e.target.value)}
                                        placeholder="4.000"
                                        className="bg-[#0a1628] border-slate-700 text-white font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Vade Tarihi *</label>
                                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-left bg-[#0a1628] border-slate-700 hover:bg-slate-800 text-sm font-normal h-9"
                                            >
                                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                                                {newDate ? format(newDate, "d MMM", { locale: tr }) : "Sec"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#0c1929] border-slate-700" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={newDate}
                                                onSelect={(date) => {
                                                    setNewDate(date)
                                                    setCalendarOpen(false)
                                                }}
                                                initialFocus
                                                locale={tr}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Not (istege bagli)</label>
                                <Textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Odeme ile ilgili detaylar..."
                                    className="bg-[#0a1628] border-slate-700 text-xs resize-none min-h-[60px]"
                                />
                            </div>

                            <Button
                                onClick={handleAdd}
                                disabled={!newAmount || !newDate || saving}
                                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm gap-2"
                            >
                                {saving ? "Kaydediliyor..." : (
                                    <>
                                        <Plus size={16} />
                                        Odeme Plani Ekle
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={() => setShowForm(true)}
                            variant="outline"
                            className="w-full border-dashed border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 gap-2 font-bold"
                        >
                            <Plus size={16} />
                            Taksit / Odeme Plani Ekle
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function ScheduleItem({
    schedule,
    variant,
    onCollect,
    onDelete
}: {
    schedule: PaymentSchedule
    variant: 'overdue' | 'today' | 'upcoming' | 'paid'
    onCollect: (id: string) => void
    onDelete: (id: string) => void
}) {
    const colors = {
        overdue: {
            bg: "bg-red-500/5",
            border: "border-red-500/20",
            amount: "text-red-400",
            date: "text-red-400/80"
        },
        today: {
            bg: "bg-amber-500/5",
            border: "border-amber-500/20",
            amount: "text-amber-400",
            date: "text-amber-400/80"
        },
        upcoming: {
            bg: "bg-slate-800/30",
            border: "border-slate-700/30",
            amount: "text-slate-200",
            date: "text-slate-400"
        },
        paid: {
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/15",
            amount: "text-emerald-400/70",
            date: "text-slate-500"
        }
    }

    const c = colors[variant]
    const amountDue = getAmountDue(schedule)
    const amountPaid = getAmountPaid(schedule)
    const remaining = getRemaining(schedule)
    const isPaid = remaining <= 0
    const isPartial = !isPaid && amountPaid > 0

    return (
        <div className={cn("flex items-center gap-3 p-3 rounded-lg border transition-all mb-1.5", c.bg, c.border)}>
            <div className="shrink-0">
                {isPaid ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                ) : variant === 'overdue' ? (
                    <div className="relative">
                        <AlertCircle size={18} className="text-red-500" />
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    </div>
                ) : variant === 'today' ? (
                    <Clock size={18} className="text-amber-500" />
                ) : (
                    <CalendarIcon size={18} className="text-slate-500" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-black", c.amount)}>
                        {amountDue.toLocaleString('tr-TR')} TL
                    </span>
                    {isPaid && (
                        <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                            ODENDI
                        </span>
                    )}
                    {isPartial && (
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                            KISMI
                        </span>
                    )}
                </div>
                <div className={cn("text-[11px] font-medium", c.date)}>
                    {format(parseISO(schedule.due_date), 'd MMMM yyyy', { locale: tr })}
                    {isPaid && schedule.paid_at && (
                        <span className="text-slate-600 ml-1">
                            (Tahsilat: {format(parseISO(schedule.paid_at), 'd MMM', { locale: tr })})
                        </span>
                    )}
                </div>
                {!isPaid && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                        Tahsil edilen: {amountPaid.toLocaleString('tr-TR')} TL - Kalan: {remaining.toLocaleString('tr-TR')} TL
                    </div>
                )}
                {getDisplayPaymentNote(schedule.note, schedule.source) && (
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {getDisplayPaymentNote(schedule.note, schedule.source)}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {!isPaid && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCollect(schedule.id)}
                        className="h-7 w-7 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"
                        title="Tahsilat Al"
                    >
                        <CheckCircle2 size={14} />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(schedule.id)}
                    className="h-7 w-7 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg"
                    title="Sil"
                >
                    <Trash2 size={14} />
                </Button>
            </div>
        </div>
    )
}

export async function fetchPaymentSummary(clientId: string): Promise<{
    total: number
    paid: number
    remaining: number
    nextDue: PaymentSchedule | null
    hasOverdue: boolean
    overdueCount: number
} | null> {
    try {
        const { data, error } = await supabase
            .from('payment_schedules')
            .select('*')
            .eq('client_id', clientId)
            .order('due_date', { ascending: true })

        if (error || !data) return null

        const schedules = data as PaymentSchedule[]
        const total = schedules.reduce((sum, s) => sum + getAmountDue(s), 0)
        const paid = schedules.reduce((sum, s) => sum + getAmountPaid(s), 0)
        const open = schedules.filter(s => getRemaining(s) > 0)
        const overdue = open.filter(s => isPast(parseISO(s.due_date)) && !isToday(parseISO(s.due_date)))
        const nextDue = open.length > 0 ? open[0] : null

        return {
            total,
            paid,
            remaining: Math.max(0, total - paid),
            nextDue,
            hasOverdue: overdue.length > 0,
            overdueCount: overdue.length
        }
    } catch {
        return null
    }
}

export async function fetchAllPaymentReminders(): Promise<(PaymentSchedule & { clients: { full_name: string | null; name: string | null; phone: string | null } | null })[]> {
    try {
        const { data, error } = await supabase
            .from('payment_schedules')
            .select('*, clients(full_name, name, phone)')
            .order('due_date', { ascending: true })

        if (error) return []
        const all = (data || []) as (PaymentSchedule & { clients: { full_name: string | null; name: string | null; phone: string | null } | null })[]
        return all.filter((schedule) => getRemaining(schedule) > 0)
    } catch {
        return []
    }
}

