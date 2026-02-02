"use client"

import { useSettings } from "@/components/providers/settings-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export function AppearanceSettings() {
    const { config, updateConfig } = useSettings()

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Görünüm Ayarları</h2>
                <p className="text-slate-400">Temayı ve yazı boyutunu özelleştirin.</p>
            </div>
            <Separator className="bg-slate-800" />

            <div className="max-w-2xl space-y-8">
                <div className="space-y-4">
                    <Label className="text-slate-200 font-semibold">Renk Teması</Label>
                    <Select
                        value={config.theme}
                        onValueChange={(val: any) => updateConfig({ theme: val })}
                    >
                        <SelectTrigger className="bg-slate-950/50 border-slate-700 h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="modern-purple" className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500" /> Modern Mor (Varsayılan)
                            </SelectItem>
                            <SelectItem value="ocean-blue" className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" /> Okyanus Mavisi
                            </SelectItem>
                            <SelectItem value="forest-green" className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" /> Orman Yeşili
                            </SelectItem>
                            <SelectItem value="sunset-orange" className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500" /> Gün Batımı
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-950/50 rounded-xl border border-slate-800">
                    <div className="space-y-0.5">
                        <Label className="text-base text-slate-200">Geniş Yazı Tipi (Large Font)</Label>
                        <p className="text-sm text-slate-500">Daha okunaklı metinler için yazı boyutunu büyütür.</p>
                    </div>
                    <Switch
                        checked={config.fontSize === 'large'}
                        onCheckedChange={(checked) => updateConfig({ fontSize: checked ? 'large' : 'normal' } as any)}
                    />
                </div>
            </div>
        </div>
    )
}
