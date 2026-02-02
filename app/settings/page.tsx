"use client"

import { useState } from "react"
import { Settings, List, Shield, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"


import { GeneralSettings } from "@/components/settings/GeneralSettings"
import { ServiceSettings } from "@/components/settings/ServiceSettings"
import { AppearanceSettings } from "@/components/settings/AppearanceSettings"


export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("services")

    return (
        <div className="p-8 max-w-[1700px] mx-auto min-h-screen">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-8">
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 shadow-lg shadow-purple-500/5">
                    <Settings className="text-purple-400" size={32} />
                </div>
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent tracking-tight">
                        Yönetim Paneli
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">
                        Hizmet ve fiyat yönetimi, sistem görünümü ve genel ayarlar.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Left Sidebar Menu */}
                <div className="w-full lg:w-72 flex-shrink-0">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-2 sticky top-8">
                        <Tabs defaultValue="services" orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0 w-full items-stretch">
                                <TabsTrigger
                                    value="services"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <List size={18} />
                                    Hizmet ve Fiyat
                                </TabsTrigger>
                                <TabsTrigger
                                    value="appearance"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <Palette size={18} />
                                    Gelişmiş Görünüm
                                </TabsTrigger>
                                <TabsTrigger
                                    value="identity"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <Shield size={18} />
                                    Kimlik ve Sistem
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8 min-h-[600px] backdrop-blur-sm relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -z-10" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

                    {activeTab === 'services' && <ServiceSettings />}
                    {activeTab === 'appearance' && <AppearanceSettings />}
                    {activeTab === 'identity' && <GeneralSettings />}
                </div>
            </div>
        </div>
    )
}
