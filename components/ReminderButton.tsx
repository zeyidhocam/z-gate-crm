"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, addDays } from "date-fns"
import { tr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"

interface ReminderButtonProps {
    clientId: string
    clientName: string
    className?: string
    iconSize?: number
    clientDetails?: {
        phone?: string | null
        process?: string | null
        balance?: number | null
        price?: number | null
    }
}

export function ReminderButton({ clientId, clientName, className, iconSize = 18, clientDetails }: ReminderButtonProps) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1))
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!title.trim() || !date) return

        try {
            setSaving(true)
            const { error } = await supabase
                .from('reminders')
                .insert({
                    client_id: clientId,
                    title: title.trim(),
                    description: description.trim() || null,
                    reminder_date: date.toISOString(),
                    is_completed: false
                })

            if (error) {
                console.error('Supabase error:', error)
                toast.error(`Hata: ${error.message}. Reminders tablosu oluşturulmuş mu?`)
                return
            }

            toast.success("Hatırlatma eklendi!")

            // --- INSTANT TELEGRAM NOTIFICATION ---
            const savedToken = localStorage.getItem('telegram_bot_token')
            const savedChatId = localStorage.getItem('telegram_chat_id')

            if (savedToken && savedChatId) {
                try {
                    const priceInfo = clientDetails?.balance
                        ? `💰 <b>Kalan Ödeme:</b> ${clientDetails.balance.toLocaleString('tr-TR')} ₺`
                        : clientDetails?.price
                            ? `💰 <b>İşlem Tutarı:</b> ${clientDetails.price.toLocaleString('tr-TR')} ₺`
                            : ''

                    const processInfo = clientDetails?.process ? `🔮 <b>İşlem:</b> ${clientDetails.process}` : ''
                    const phoneInfo = clientDetails?.phone ? `📞 <b>Tel:</b> ${clientDetails.phone}` : ''

                    const message = `🔔 <b>YENİ HATIRLATMA EKLENDİ</b>\n\n` +
                        `👤 <b>Müşteri:</b> ${clientName}\n` +
                        `${phoneInfo}\n` +
                        `${processInfo}\n` +
                        `${priceInfo}\n\n` +
                        `📅 <b>Tarih:</b> ${format(date, 'dd MMMM yyyy', { locale: tr })}\n` +
                        `📌 <b>Başlık:</b> ${title.trim()}\n` +
                        (description.trim() ? `📝 <b>Not:</b> ${description.trim()}` : '')

                    await fetch('/api/telegram/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: savedToken,
                            chatId: savedChatId,
                            message: message
                        })
                    })
                } catch (err) {
                    console.error('Failed to send Telegram in ReminderButton', err)
                }
            }
            // -------------------------------------

            // Reset form
            setTitle('')
            setDescription('')
            setDate(addDays(new Date(), 1))
            setOpen(false)
        } catch (error) {
            console.error('Error adding reminder:', error)
            toast.error("Beklenmedik bir hata oluştu!")
        } finally {
            setSaving(false)
        }
    }

    const handleOpen = (isOpen: boolean) => {
        if (isOpen) {
            // Pre-fill title with client name
            setTitle(`${clientName} - Takip`)
        }
        setOpen(isOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={className || "h-9 w-9 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition-all"}
                    title="Hatırlatma Ekle"
                >
                    <Bell size={iconSize} />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0c1929] border-cyan-500/20">
                <DialogHeader>
                    <DialogTitle className="text-slate-100 flex items-center gap-2">
                        <Bell size={20} className="text-amber-400" />
                        Hatırlatma Ekle
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="text-xs text-slate-500 font-bold">Müşteri</div>
                        <div className="text-sm text-slate-200 font-bold">{clientName}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block">Başlık *</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Hatırlatma başlığı..."
                            className="bg-slate-900/50 border-slate-700 text-slate-200"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block">Açıklama</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detaylar..."
                            className="bg-slate-900/50 border-slate-700 text-slate-200 resize-none"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block">Tarih *</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start gap-2 bg-slate-900/50 border-slate-700 text-slate-200">
                                    <CalendarIcon size={16} />
                                    {date ? format(date, 'dd MMMM yyyy', { locale: tr }) : 'Tarih seç'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#0c1929] border-cyan-500/20">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    locale={tr}
                                    className="rounded-md"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter className="mt-6">
                    <DialogClose asChild>
                        <Button variant="ghost" className="text-slate-400">İptal</Button>
                    </DialogClose>
                    <Button
                        onClick={handleSave}
                        disabled={!title.trim() || !date || saving}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
                    >
                        {saving ? 'Kaydediliyor...' : 'Hatırlatma Ekle'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
