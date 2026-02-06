"use client"

import { useState } from "react"
import { Wallet, Save, Clock, AlertCircle, CheckCircle2, Calendar as CalendarIcon, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format, isPast, isToday } from "date-fns"
import { tr } from "date-fns/locale"

interface PaymentTrackerProps {
    clientId: string
    initialNote: string | null
    initialBalance: number | null
    initialDueDate: string | null
    onSave: (note: string | null, balance: number | null, dueDate: string | null) => void
}

export function PaymentTracker({ clientId, initialNote, initialBalance, initialDueDate, onSave }: PaymentTrackerProps) {
    const [note, setNote] = useState(initialNote || "")
    const [balance, setBalance] = useState<string>(initialBalance?.toString() || "")
    const [dueDate, setDueDate] = useState<Date | undefined>(initialDueDate ? new Date(initialDueDate) : undefined)
    const [isOpen, setIsOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const numBalance = balance ? parseFloat(balance) : null
            const isoDate = dueDate ? dueDate.toISOString() : null

            const { error } = await supabase
                .from('clients')
                .update({
                    financial_note: note || null,
                    payment_balance: numBalance,
                    payment_due_date: isoDate
                })
                .eq('id', clientId)

            if (error) throw error

            onSave(note || null, numBalance, isoDate)
            setIsOpen(false)
            toast.success("Ödeme bilgileri güncellendi.")
        } catch (error) {
            console.error('Error saving payment info:', error)
            toast.error("Kaydedilemedi.")
        } finally {
            setSaving(false)
        }
    }

    const hasBalance = !!balance && parseFloat(balance) > 0
    const isOverdue = hasBalance && dueDate && isPast(dueDate) && !isToday(dueDate)
    const isPending = hasBalance && (!dueDate || !isPast(dueDate) || isToday(dueDate))

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className="relative group/wallet">
                    {hasBalance ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-9 px-3 rounded-xl transition-all border flex items-center gap-2",
                                isOverdue
                                    ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                            )}
                            title="Ödeme Takibi & Finans"
                        >
                            <Wallet size={16} />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] opacity-80 font-medium">Kalan</span>
                                <span className="font-bold text-xs">{Number(balance).toLocaleString('tr-TR')} ₺</span>
                            </div>
                            {isOverdue && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-[#0c1929]"></span>
                                </span>
                            )}
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all border",
                                "bg-slate-800/50 text-slate-500 border-transparent hover:text-slate-300"
                            )}
                            title="Ödeme Takibi & Finans"
                        >
                            <Wallet size={18} />
                        </Button>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-[#0c1929] border-slate-700 shadow-2xl overflow-hidden" align="end">
                {/* Header */}
                <div className={cn(
                    "px-4 py-3 border-b flex items-center gap-2",
                    isOverdue ? "bg-red-500/10 border-red-500/20" :
                        isPending ? "bg-amber-500/10 border-amber-500/20" :
                            "bg-slate-900/50 border-slate-800"
                )}>
                    {isOverdue ? <AlertCircle size={16} className="text-red-500" /> :
                        isPending ? <Clock size={16} className="text-amber-500" /> :
                            <CheckCircle2 size={16} className="text-emerald-500" />}
                    <span className={cn(
                        "text-sm font-bold",
                        isOverdue ? "text-red-400" : isPending ? "text-amber-400" : "text-emerald-400"
                    )}>
                        {isOverdue ? "Ödeme Gecikti!" : isPending ? "Ödeme Bekleniyor" : "Ödeme Tamam"}
                    </span>
                </div>

                <div className="p-4 space-y-4">
                    {/* Balance Input */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Kalan / Eksik Tutar (₺)</label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                placeholder="0"
                                className={cn(
                                    "bg-[#0a1628] border-slate-700 text-lg font-bold pl-3 pr-8",
                                    hasBalance ? "text-white border-slate-600" : "text-slate-500"
                                )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₺</span>
                        </div>
                    </div>

                    {/* Due Date Picker */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Ödeme Söz Tarihi</label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-[#0a1628] border-slate-700 hover:bg-slate-800 hover:text-white",
                                        !dueDate && "text-slate-500"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "d MMMM yyyy", { locale: tr }) : <span>Tarih Seçin</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#0c1929] border-slate-700" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dueDate}
                                    onSelect={(date) => {
                                        setDueDate(date)
                                        setIsCalendarOpen(false)
                                    }}
                                    initialFocus
                                    locale={tr}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Note Textarea */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Not / Açıklama</label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Detaylar..."
                            className="bg-[#0a1628] border-slate-700 min-h-[80px] text-xs resize-none"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                        className="h-8 text-xs text-slate-500 hover:text-slate-300"
                    >
                        İptal
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(
                            "h-8 text-xs text-white gap-1.5",
                            isOverdue ? "bg-red-600 hover:bg-red-500" : "bg-cyan-600 hover:bg-cyan-500"
                        )}
                    >
                        {saving ? "..." : (
                            <>
                                <Save size={14} />
                                Kaydet
                            </>
                        )}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
