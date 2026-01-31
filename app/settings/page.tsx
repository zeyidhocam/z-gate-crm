"use client"

import { useState } from "react"
import { Settings, BrainCircuit, List, Save, Shield, Palette, Layout, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ProcessTypesSettings } from "@/components/settings/ProcessTypesSettings"
import { useSettings } from "@/components/providers/settings-provider"
import { toast } from "sonner" // Assuming sonner is installed, or valid alt. If not, fallback to alert.

export default function SettingsPage() {
    const { config, updateConfig, resetToDefaults } = useSettings()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("appearance")

    // Local state for AI (Mock)
    const [apiKey, setApiKey] = useState("sk-or-...")
    const [model, setModel] = useState("openai/gpt-4o")
    const [prompt, setPrompt] = useState("")

    const handleSaveGlobal = async () => {
        setIsLoading(true)
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 800))
        setIsLoading(false)
        // Show success
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Settings className="text-purple-400" size={28} />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Sistem Ayarları
                </h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar Menu */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <Tabs defaultValue="appearance" orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex flex-col h-auto bg-transparent gap-2 p-0 w-full items-stretch">
                            <TabsTrigger
                                value="appearance"
                                className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:border-l-2 data-[state=active]:border-purple-500 rounded-none rounded-r-lg transition-all"
                            >
                                <Palette size={18} />
                                Görünüm & Kimlik
                            </TabsTrigger>
                            <TabsTrigger
                                value="ai"
                                className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:border-l-2 data-[state=active]:border-purple-500 rounded-none rounded-r-lg transition-all"
                            >
                                <BrainCircuit size={18} />
                                Yapay Zeka
                            </TabsTrigger>
                            <TabsTrigger
                                value="dictionaries"
                                className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:border-l-2 data-[state=active]:border-purple-500 rounded-none rounded-r-lg transition-all"
                            >
                                <List size={18} />
                                İşlem Tanımları
                            </TabsTrigger>
                            <TabsTrigger
                                value="security"
                                className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:border-l-2 data-[state=active]:border-purple-500 rounded-none rounded-r-lg transition-all"
                            >
                                <Shield size={18} />
                                Güvenlik
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-8 min-h-[600px]">

                    {/* APPEARANCE TAB */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-lg font-semibold text-purple-400 mb-1">Görünüm ve Marka</h2>
                                <p className="text-slate-400 text-sm">Uygulamanın ismini, logosunu ve renk temasını buradan yönetebilirsiniz.</p>
                            </div>
                            <Separator className="bg-slate-800" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Label className="text-slate-200">Uygulama Başlığı (Sidebar)</Label>
                                    <Input
                                        value={config.sidebarTitle}
                                        onChange={(e) => updateConfig({ sidebarTitle: e.target.value })}
                                        className="bg-slate-950 border-slate-700"
                                        placeholder="Örn: Oracle CRM"
                                    />
                                    <p className="text-xs text-slate-500">Sol menünün en üstünde görünen marka ismi.</p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-200">Tarayıcı Başlığı (Tab Title)</Label>
                                    <Input
                                        value={config.appName}
                                        onChange={(e) => updateConfig({ appName: e.target.value })}
                                        className="bg-slate-950 border-slate-700"
                                        placeholder="Oracle CRM"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-200">Logo URL</Label>
                                    <Input
                                        value={config.logoUrl || ''}
                                        onChange={(e) => updateConfig({ logoUrl: e.target.value })}
                                        className="bg-slate-950 border-slate-700"
                                        placeholder="https://..."
                                    />
                                    <p className="text-xs text-slate-500">Logonuzun doğrudan resim bağlantısını yapıştırın.</p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-200">Renk Teması</Label>
                                    <Select
                                        value={config.theme}
                                        onValueChange={(val: any) => updateConfig({ theme: val })}
                                    >
                                        <SelectTrigger className="bg-slate-950 border-slate-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800">
                                            <SelectItem value="modern-purple">🔮 Modern Mor (Varsayılan)</SelectItem>
                                            <SelectItem value="ocean-blue">🌊 Okyanus Mavisi</SelectItem>
                                            <SelectItem value="forest-green">🌲 Orman Yeşili</SelectItem>
                                            <SelectItem value="sunset-orange">🌅 Gün Batımı</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator className="bg-slate-800" />

                            <div className="flex justify-between items-center">
                                <Button
                                    variant="destructive"
                                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                    onClick={resetToDefaults}
                                >
                                    <RotateCcw className="mr-2" size={16} />
                                    Varsayılana Dön
                                </Button>
                                {/* Changes are auto-saved in context, but we can allow explicit save for UX */}
                                <Button className="bg-green-600 hover:bg-green-700 text-white">
                                    <Save className="mr-2" size={18} />
                                    Ayarları Kaydet
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* AI Tab */}
                    {activeTab === 'ai' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-lg font-semibold text-purple-400 mb-1">Yapay Zeka Konfigürasyonu</h2>
                                <p className="text-slate-400 text-sm">Zeyid Hoca'nın beynini buradan yönetebilirsin.</p>
                            </div>
                            <Separator className="bg-slate-800" />
                            {/* ... existing AI settings ... */}
                            <p className="text-slate-500 text-sm">Bu modül yapım aşamasındadır.</p>
                        </div>
                    )}

                    {/* Dictionaries Tab */}
                    {activeTab === 'dictionaries' && (
                        <ProcessTypesSettings />
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-in fade-in slide-in-from-right-4">
                            <Shield size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">Bu özellik yapım aşamasında</p>
                            <p className="text-sm">Passkey ve Şifre yönetimi.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
