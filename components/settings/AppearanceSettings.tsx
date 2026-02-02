"use client"

import { useSettings } from "@/components/providers/settings-provider"
import { Separator } from "@/components/ui/separator"
import { Waves, CheckCircle } from "lucide-react"

export function AppearanceSettings() {
    const { config } = useSettings()

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Görünüm</h2>
                <p className="text-slate-400">Sistemin genel görünümü ve tema bilgisi.</p>
            </div>
            <Separator className="bg-cyan-500/10" />

            {/* Aktif Tema Bilgisi */}
            <div className="p-6 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent rounded-xl border border-cyan-500/20">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Waves size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-xl font-bold text-cyan-300">Ocean Elite Tema</p>
                            <CheckCircle size={16} className="text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Premium okyanus mavisi gradient ve cyan aksanlarla tasarlanmış profesyonel tema.
                        </p>
                    </div>
                </div>

                {/* Tema Özellikleri */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Renk Şeması", value: "Okyanus Mavisi" },
                        { label: "Aksan Rengi", value: "Cyan/Turkuaz" },
                        { label: "Yazı Kalınlığı", value: "Bold Aktif" },
                        { label: "Arka Plan", value: "Gradient" },
                    ].map((item) => (
                        <div key={item.label} className="p-3 bg-[#040d17]/50 rounded-lg border border-cyan-500/10">
                            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">{item.label}</p>
                            <p className="text-sm text-slate-300 font-semibold mt-1">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Site Adı Bilgisi */}
            <div className="p-5 bg-[#0c1929]/80 rounded-xl border border-cyan-500/10">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-slate-200">Site Adı</p>
                        <p className="text-xs text-slate-500 mt-1">Sidebar ve sayfa başlıklarında görünür</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-cyan-300">{config.appName}</p>
                        <p className="text-[10px] text-slate-600 uppercase">Kimlik sekmesinden değiştirilebilir</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
