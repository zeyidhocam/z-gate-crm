"use client"

import { useSettings } from "@/components/providers/settings-provider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { LayoutTemplate, Type, Palette, Monitor } from "lucide-react"

export function AppearanceSettings() {
    const { config, updateConfig } = useSettings()

    // Map slider value to config
    const getScaleValue = (val: number) => {
        if (val === 0) return 'small'
        if (val === 33) return 'medium'
        if (val === 66) return 'large'
        return 'xlarge'
    }

    const getSliderValue = (scale: string) => {
        if (scale === 'small') return 0
        if (scale === 'medium') return 33
        if (scale === 'large') return 66
        return 100
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Gelişmiş Görünüm</h2>
                <p className="text-slate-400">Panelin görsel detaylarını ince ayar yapın.</p>
            </div>
            <Separator className="bg-slate-800" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* COLUMN 1: Colors & Layout */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <Label className="flex items-center gap-2 text-slate-200">
                            <Palette size={16} className="text-primary" /> Renk Teması
                        </Label>
                        <Select
                            value={config.theme}
                            onValueChange={(val: any) => updateConfig({ theme: val })}
                        >
                            <SelectTrigger className="bg-slate-950/50 border-slate-700 h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="midnight-violet">🟣 Gece Moru</SelectItem>
                                <SelectItem value="ocean-depth">🔵 Okyanus Derinliği</SelectItem>
                                <SelectItem value="oled-black">⚫ OLED Siyah</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-slate-950/50 rounded-xl border border-slate-800">
                        <div className="space-y-0.5">
                            <Label className="flex items-center gap-2 text-base text-slate-200">
                                <LayoutTemplate size={16} className="text-primary" /> Panel Genişliği
                            </Label>
                            <p className="text-xs text-slate-500">İçeriği ortala veya tam ekran yay.</p>
                        </div>
                        <div className="flex items-center border border-slate-700 rounded-lg p-1 bg-slate-900">
                            <button
                                onClick={() => updateConfig({ panelWidth: 'boxed' })}
                                className={`px-3 py-1.5 text-xs rounded-md transition-all ${config.panelWidth === 'boxed' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Kutulu
                            </button>
                            <button
                                onClick={() => updateConfig({ panelWidth: 'full' })}
                                className={`px-3 py-1.5 text-xs rounded-md transition-all ${config.panelWidth === 'full' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Tam Ekran
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: Typography */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <Label className="flex items-center gap-2 text-slate-200">
                            <Type size={16} className="text-orange-400" /> Yazı Tipi Ailesi
                        </Label>
                        <Select
                            value={config.fontFamily}
                            onValueChange={(val: any) => updateConfig({ fontFamily: val })}
                        >
                            <SelectTrigger className="bg-slate-950/50 border-slate-700 h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="sans">Modern Sans (Montserrat)</SelectItem>
                                <SelectItem value="serif">Klasik Serif (Playfair)</SelectItem>
                                <SelectItem value="mono">Digital Mono (JetBrains)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-slate-950/50 rounded-xl border border-slate-800">
                        <div className="space-y-0.5">
                            <Label className="text-base text-slate-200">Kalın Yazı (Bold Mode)</Label>
                            <p className="text-xs text-slate-500">Tüm metinleri daha belirgin yapar.</p>
                        </div>
                        <Switch
                            checked={config.fontWeight === 'bold'}
                            onCheckedChange={(checked) => updateConfig({ fontWeight: checked ? 'bold' : 'normal' })}
                        />
                    </div>

                    <div className="space-y-4 p-5 bg-slate-950/50 rounded-xl border border-slate-800">
                        <div className="flex justify-between">
                            <Label className="flex items-center gap-2 text-slate-200">
                                <Monitor size={16} className="text-slate-400" /> Yazı Boyutu (Scale)
                            </Label>
                            <span className="text-xs text-primary font-bold uppercase">{config.fontScale}</span>
                        </div>
                        <Slider
                            defaultValue={[getSliderValue(config.fontScale)]}
                            max={100}
                            step={33}
                            className="py-4"
                            onValueChange={(vals) => updateConfig({ fontScale: getScaleValue(vals[0]) as any })}
                        />
                        <div className="flex justify-between text-[10px] text-slate-600 uppercase font-bold tracking-widest">
                            <span>Küçük</span>
                            <span>Orta</span>
                            <span>Büyük</span>
                            <span>Dev</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
