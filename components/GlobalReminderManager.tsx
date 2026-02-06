"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { isBefore, isToday, parseISO } from "date-fns"
import { Bell, AlertTriangle } from "lucide-react"

export function GlobalReminderManager() {
    const [hasChecked, setHasChecked] = useState(false)

    useEffect(() => {
        if (hasChecked) return

        const checkReminders = async () => {
            try {
                const { data, error } = await supabase
                    .from('reminders')
                    .select('id, title, reminder_date, is_completed')
                    .eq('is_completed', false)

                if (error || !data) return

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const todayReminders = data.filter((r: any) => isToday(parseISO(r.reminder_date)))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const overdueReminders = data.filter((r: any) => isBefore(parseISO(r.reminder_date), new Date()) && !isToday(parseISO(r.reminder_date)))

                const total = todayReminders.length + overdueReminders.length

                if (total > 0) {
                    // Play notification sound (optional - browser policy might block auto-play)
                    // const audio = new Audio('/notification.mp3')
                    // audio.play().catch(() => {})

                    toast.custom((t) => (
                        <div className="bg-[#0c1929] border border-cyan-500/30 p-4 rounded-xl shadow-2xl flex items-start gap-3 w-full max-w-md">
                            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg shrink-0">
                                <Bell className="text-amber-400" size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-slate-100">Hatırlatma Var!</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {overdueReminders.length > 0 ? (
                                        <span className="text-red-400 font-bold">{overdueReminders.length} Gecikmiş, </span>
                                    ) : null}
                                    {todayReminders.length} Bugün
                                </p>
                            </div>
                            <button
                                onClick={() => toast.dismiss(t)}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                Kapat
                            </button>
                        </div>
                    ), { duration: 6000 })

                    // --- TELEGRAM INTEGRATION ---
                    const savedToken = localStorage.getItem('telegram_bot_token')
                    const savedChatId = localStorage.getItem('telegram_chat_id')
                    const lastSentStr = localStorage.getItem('last_telegram_sent_at')

                    // Check if we should send (throttle: once every 4 hours)
                    let shouldSend = false
                    const now = new Date()
                    if (savedToken && savedChatId) {
                        if (!lastSentStr) {
                            shouldSend = true
                        } else {
                            const lastSent = new Date(lastSentStr)
                            const diffMs = now.getTime() - lastSent.getTime()
                            const diffHours = diffMs / (1000 * 60 * 60)
                            if (diffHours >= 4) {
                                shouldSend = true
                            }
                        }
                    }

                    if (shouldSend && overdueReminders.length > 0) {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const message = `🚨 <b>Ocean Elite CRM: Hatırlatma Uyarısı!</b>\n\n` +
                                `Toplam <b>${total}</b> adet bildirim var.\n` +
                                `🔴 <b>${overdueReminders.length}</b> gecikmiş işlem bulunuyor.\n\n` +
                                `Lütfen panele girip kontrol ediniz.`

                            await fetch('/api/telegram/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    token: savedToken,
                                    chatId: savedChatId,
                                    message: message
                                })
                            })

                            localStorage.setItem('last_telegram_sent_at', now.toISOString())
                            console.log('Telegram notification sent')
                        } catch (err) {
                            console.error('Failed to send Telegram', err)
                        }
                    }
                }

                setHasChecked(true)
            } catch (error) {
                console.error("Reminder check failed", error)
            }
        }

        checkReminders()

        // Optional: Periodic check every 5 minutes
        const interval = setInterval(checkReminders, 5 * 60 * 1000)
        return () => clearInterval(interval)

    }, [hasChecked])

    return null // This component doesn't render anything visibly itself, just triggers toasts
}
