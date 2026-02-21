"use client"

import { useState } from "react"
import { useSettings, UIConfig } from "@/components/providers/settings-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Check, Globe, Image as ImageIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export function GeneralSettings() {
    const { config, updateConfig, isLoading } = useSettings()
    const [appNameDraft, setAppNameDraft] = useState<string | null>(null)
    const [logoUrlDraft, setLogoUrlDraft] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    const appName = appNameDraft ?? config.appName
    const logoUrl = logoUrlDraft ?? (config.logoUrl || '')

    const handleSave = async () => {
        await updateConfig({
            appName,
            logoUrl,
        } as Partial<UIConfig>)

        setAppNameDraft(null)
        setLogoUrlDraft(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Kimlik ve Sistem</h2>
                <p className="text-slate-400">Uygulamanın temel kimlik bilgilerini yönetin.</p>
            </div>
            <Separator className="bg-slate-800" />

            <div className="max-w-2xl space-y-8">
                <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-slate-200 font-semibold">
                        <Globe size={16} className="text-primary" /> Site Başlığı
                    </Label>
                    <Input
                        value={appName}
                        onChange={(e) => setAppNameDraft(e.target.value)}
                        className="bg-slate-950/50 border-slate-700 h-11 focus:border-primary"
                        placeholder="Örn: Z-Gate CRM"
                    />
                    <p className="text-xs text-slate-500">Tarayıcı sekmesinde ve ana ekranda görünen başlık.</p>
                </div>

                <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-slate-200 font-semibold">
                        <ImageIcon size={16} className="text-primary" /> Logo URL
                    </Label>
                    <div className="flex gap-4 items-start">
                        <div className="flex-1">
                            <Input
                                value={logoUrl}
                                onChange={(e) => setLogoUrlDraft(e.target.value)}
                                className="bg-slate-950/50 border-slate-700 h-11 focus:border-primary"
                                placeholder="https://..."
                            />
                        </div>
                        {logoUrl && (
                            <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800/50">
                    <Button
                        onClick={handleSave}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 gap-2"
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
