"use client"

import { useState, useEffect } from "react"
import { Bell, Save, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
// import { useSettings } from "@/components/providers/settings-provider"

export function NotificationSettings() {
    // const { config, updateSettings } = useSettings()

    // Local state for inputs
    const [telegramToken, setTelegramToken] = useState("")
    const [telegramChatId, setTelegramChatId] = useState("")
    const [loading, setLoading] = useState(false)
    const [testing, setTesting] = useState(false)

    // Load initial values (simulated since settings provider might not have these specific fields typed yet)
    // In a real app, you'd extend the Settings type. For now we use localStorage as a quick persistent store or assume updateSettings handles arbitrary keys if structured that way.
    // However, the `useSettings` hook likely has a specific structure. 
    // Let's check `useSettings` implementation if we were strict, but for now we'll assume we can save to localStorage for this specific feature 
    // OR primarily rely on the provided mechanism. 
    // Actually, looking at previous files, `useSettings` seems to handle `config`. 
    // Let's just use localStorage for these specific credentials to avoid breaking the existing Settings type for now, 
    // or better yet, we should probably add them to the Settings context? 
    // Simpler: Just save to localStorage for this client-side demo feature as per the plan "Fetch Telegram settings from DB (or use useSettings hook if settings are global context)".
    // Let's use localStorage for the credentials to keep it simple and secure enough for this local-first app context.

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('telegram_bot_token, telegram_chat_id')
                .single()

            if (data) {
                setTelegramToken(data.telegram_bot_token || "")
                setTelegramChatId(data.telegram_chat_id || "")
            }
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('system_settings')
                .update({
                    telegram_bot_token: telegramToken,
                    telegram_chat_id: telegramChatId
                })
                .eq('id', 1)

            if (error) throw error

            toast.success("Ayarlar veritabanına kaydedildi")
        } catch {
            // Hata kaydi gizlendi
            toast.error("Ayarlar kaydedilirken hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    const handleTest = async () => {
        if (!telegramToken || !telegramChatId) {
            toast.error("Lütfen önce Token ve Chat ID girin")
            return
        }

        setTesting(true)
        try {
            const response = await fetch('/api/telegram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "🔔 Test Bildirimi: Ocean Elite CRM sistemi Telegram entegrasyonu başarılı! 🚀"
                })
            })

            const data = await response.json()

            if (data.ok) {
                toast.success("Test mesajı gönderildi! Telegram'ı kontrol edin.")
            } else {
                toast.error(`Hata: ${data.error || 'Bilinmeyen hata'}`)
            }
        } catch {
            toast.error("Bağlantı hatası")
            // Hata kaydi gizlendi
        } finally {
            setTesting(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="bg-slate-950/50 border-cyan-500/20 shadow-lg shadow-cyan-900/10">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Send className="text-blue-400" size={24} />
                        </div>
                        <CardTitle className="text-xl text-slate-100">Telegram Bildirimleri</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400">
                        Hatırlatmaları cebinize anlık bildirim olarak almak için Telegram Bot ayarlarını yapın.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="alert bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
                        <p className="font-bold mb-1">🤖 Nasıl Kurulur?</p>
                        <ol className="list-decimal list-inside space-y-1 opacity-90">
                            <li>Telegram&apos;da <strong>@BotFather</strong>&apos;ı bulun ve <code>/newbot</code> diyerek yeni bir bot oluşturun.</li>
                            <li>Size verdiği <strong>Token</strong>&apos;ı aşağıya yapıştırın.</li>
                            <li>Kendi botunuzu bulun, <code>/start</code> diyerek başlatın.</li>
                            <li><strong>@userinfobot</strong>&apos;a yazarak <strong>ID</strong>&apos;nizi öğrenin ve aşağıya yapıştırın.</li>
                        </ol>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Bot Token</Label>
                            <Input
                                type="password"
                                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                className="bg-slate-900/50 border-slate-700 font-mono text-xs"
                                value={telegramToken}
                                onChange={e => setTelegramToken(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Chat ID</Label>
                            <Input
                                placeholder="123456789"
                                className="bg-slate-900/50 border-slate-700 font-mono text-xs"
                                value={telegramChatId}
                                onChange={e => setTelegramChatId(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[120px]"
                        >
                            {loading ? <span className="animate-spin mr-2">⏳</span> : <Save size={16} className="mr-2" />}
                            Ayarları Kaydet
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleTest}
                            disabled={testing || !telegramToken || !telegramChatId}
                            className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-300"
                        >
                            {testing ? <span className="animate-spin mr-2">⏳</span> : <Bell size={16} className="mr-2" />}
                            Test Mesajı
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                try {
                                    toast.info("Günlük rapor hazırlanıyor...")
                                    const res = await fetch('/api/cron/daily-report')
                                    const data = await res.json()
                                    if (data.ok) toast.success("Rapor başarıyla gönderildi!")
                                    else toast.error("Rapor gönderilemedi: " + data.error)
                                } catch {
                                    toast.error("Bir hata oluştu")
                                }
                            }}
                            className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30"
                        >
                            📊 Raporu Şimdi Gönder
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
