"use client"

import { useState, useEffect } from "react"
import { useSettings } from "@/components/providers/settings-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Check } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export function GeneralSettings() {
    const { config, updateConfig, isLoading } = useSettings()
    const [formData, setFormData] = useState({
        appName: '',
        logoUrl: '',
        whatsappNumber: ''
    })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!isLoading) {
            setFormData({
                appName: config.appName,
                logoUrl: config.logoUrl || '',
                whatsappNumber: config.whatsappNumber || ''
            })
        }
    }, [config, isLoading])

    const handleSave = async () => {
        await updateConfig({
            appName: formData.appName,
            logoUrl: formData.logoUrl,
            whatsappNumber: formData.whatsappNumber
        } as any)

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Genel ve Kimlik</h2>
                <p className="text-slate-400">Uygulamanın temel kimlik bilgileri ve iletişim ayarları.</p>
            </div>
            <Separator className="bg-slate-800" />

            <div className="max-w-2xl space-y-6">
                <div className="space-y-4">
                    <Label className="text-slate-200 font-semibold">Site Başlığı (App Title)</Label>
                    <Input
                        value={formData.appName}
                        onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                        className="bg-slate-950/50 border-slate-700 h-11 focus:border-purple-500/50"
                        placeholder="Örn: Z-Gate CRM"
                    />
                    <p className="text-xs text-slate-500">Tarayıcı sekmesinde ve ana ekranda görünen başlık.</p>
                </div>

                <div className="space-y-4">
                    <Label className="text-slate-200 font-semibold">Logo URL</Label>
                    <div className="flex gap-4 items-start">
                        <div className="flex-1">
                            <Input
                                value={formData.logoUrl}
                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                className="bg-slate-950/50 border-slate-700 h-11 focus:border-purple-500/50"
                                placeholder="https://..."
                            />
                        </div>
                        {formData.logoUrl && (
                            <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-slate-200 font-semibold">Varsayılan WhatsApp No</Label>
                    <Input
                        value={formData.whatsappNumber}
                        onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                        className="bg-slate-950/50 border-slate-700 h-11 focus:border-purple-500/50"
                        placeholder="90555..."
                    />
                    <p className="text-xs text-slate-500">Otomatik mesajların gönderileceği varsayılan gönderici (opsiyonel).</p>
                </div>

                <div className="pt-4">
                    <Button
                        onClick={handleSave}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 gap-2"
                        disabled={isLoading}
                    >
                        {saved ? <Check size={18} /> : <Save size={18} />}
                        {saved ? "Kaydedildi" : "Ayarları Kaydet"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
