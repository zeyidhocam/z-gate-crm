"use client"

import { useSettings } from "@/components/providers/settings-provider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { LayoutTemplate, Type, Monitor, Waves } from "lucide-react"

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
            <Separator className="bg-cyan-500/10" />

            {/* Aktif Tema Bilgisi */}
            <div className="p-5 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent rounded-xl border border-cyan-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                        <Waves size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-cyan-300">Ocean Elite Tema</p>
                        <p className="text-xs text-slate-500">Tek kusursuz tema - tüm elementler uyumlu</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* COLUMN 1: Layout */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between p-5 bg-[#0c1929]/80 rounded-xl border border-cyan-500/10">
                        <div className="space-y-0.5">
                            <Label className="flex items-center gap-2 text-base text-slate-200">
                                <LayoutTemplate size={16} className="text-cyan-400" /> Panel Genişliği
                            </Label>
                            <p className="text-xs text-slate-500">İçeriği ortala veya tam ekran yay.</p>
                        </div>
                        <div className="flex items-center border border-cyan-500/20 rounded-lg p-1 bg-[#040d17]">
                            <button
                                onClick={() => updateConfig({ panelWidth: 'boxed' })}
                                className={`px-3 py-1.5 text-xs rounded-md transition-all ${config.panelWidth === 'boxed' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Kutulu
                            </button>
                            <button
                                onClick={() => updateConfig({ panelWidth: 'full' })}
                                className={`px-3 py-1.5 text-xs rounded-md transition-all ${config.panelWidth === 'full' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
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
                            <Type size={16} className="text-cyan-400" /> Yazı Tipi Ailesi
                        </Label>
                        <Select
                            value={config.fontFamily}
                            onValueChange={(val: any) => updateConfig({ fontFamily: val })}
                        >
                            <SelectTrigger className="bg-[#0c1929]/80 border-cyan-500/10 h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0c1929] border-cyan-500/20">
                                <SelectItem value="sans">Modern Sans (Montserrat)</SelectItem>
                                <SelectItem value="serif">Klasik Serif (Playfair)</SelectItem>
                                <SelectItem value="mono">Digital Mono (JetBrains)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-[#0c1929]/80 rounded-xl border border-cyan-500/10">
                        <div className="space-y-0.5">
                            <Label className="text-base text-slate-200">Kalın Yazı (Bold Mode)</Label>
                            <p className="text-xs text-slate-500">Tüm metinleri daha belirgin yapar.</p>
                        </div>
                        <Switch
                            checked={config.fontWeight === 'bold'}
                            onCheckedChange={(checked) => updateConfig({ fontWeight: checked ? 'bold' : 'normal' })}
                        />
                    </div>

                    <div className="space-y-4 p-5 bg-[#0c1929]/80 rounded-xl border border-cyan-500/10">
                        <div className="flex justify-between">
                            <Label className="flex items-center gap-2 text-slate-200">
                                <Monitor size={16} className="text-cyan-400" /> Yazı Boyutu (Scale)
                            </Label>
                            <span className="text-xs text-cyan-400 font-bold uppercase">{config.fontScale}</span>
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
