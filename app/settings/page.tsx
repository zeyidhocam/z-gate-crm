"use client"

import { useState } from "react"
import { Settings, BrainCircuit, List, Save, Shield, Palette, RotateCcw, Activity, Lock, Eye, EyeOff, Check } from "lucide-react"
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

import { ProcessTypesSettings } from "@/components/settings/ProcessTypesSettings"
import { useSettings } from "@/components/providers/settings-provider"


export default function SettingsPage() {
    const { config, updateConfig, resetToDefaults } = useSettings()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("appearance")
    const [saved, setSaved] = useState(false)

    // Mock States for Security
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="p-8 max-w-[1700px] mx-auto min-h-screen">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-8">
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 shadow-lg shadow-purple-500/5">
                    <Settings className="text-purple-400" size={32} />
                </div>
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent tracking-tight">
                        Sistem Ayarları
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">
                        Görünüm, işlem tipleri, güvenlik ve sistem yapılandırması.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Left Sidebar Menu */}
                <div className="w-full lg:w-72 flex-shrink-0">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-2 sticky top-8">
                        <Tabs defaultValue="appearance" orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0 w-full items-stretch">
                                <TabsTrigger
                                    value="appearance"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <Palette size={18} />
                                    Görünüm & Tema
                                </TabsTrigger>
                                <TabsTrigger
                                    value="dictionaries"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <List size={18} />
                                    İşlem Tanımları
                                </TabsTrigger>
                                <TabsTrigger
                                    value="ai"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <BrainCircuit size={18} />
                                    Yapay Zeka (AI)
                                </TabsTrigger>
                                <TabsTrigger
                                    value="security"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <Shield size={18} />
                                    Güvenlik & Erişim
                                </TabsTrigger>
                                <TabsTrigger
                                    value="logs"
                                    className="justify-start gap-3 px-4 py-3.5 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-300 data-[state=active]:font-bold rounded-xl transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                >
                                    <Activity size={18} />
                                    Sistem Kayıtları
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

                    {/* APPEARANCE TAB */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-2">Görünüm Ayarları</h2>
                                <p className="text-slate-400">Uygulamanın temasını, ismini ve genel görünümünü özelleştirin.</p>
                            </div>
                            <Separator className="bg-slate-800" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-4">
                                    <Label className="text-slate-200 font-semibold">Uygulama Başlığı (Sidebar)</Label>
                                    <div className="relative">
                                        <Input
                                            value={config.sidebarTitle}
                                            onChange={(e) => updateConfig({ sidebarTitle: e.target.value })}
                                            className="bg-slate-950/50 border-slate-700 h-11 focus:border-purple-500/50 transition-colors"
                                            placeholder="Örn: Z-Gate CRM"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">Sol menünün en üstünde görünen marka ismi.</p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-200 font-semibold">Tarayıcı Başlığı (Tab)</Label>
                                    <Input
                                        value={config.appName}
                                        onChange={(e) => updateConfig({ appName: e.target.value })}
                                        className="bg-slate-950/50 border-slate-700 h-11"
                                        placeholder="Z-Gate CRM"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-200 font-semibold">Renk Teması</Label>
                                    <Select
                                        value={config.theme}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onValueChange={(val: string) => updateConfig({ theme: val as any })}
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

                                <div className="space-y-4">
                                    <Label className="text-slate-200 font-semibold">Logo URL</Label>
                                    <Input
                                        value={config.logoUrl || ''}
                                        onChange={(e) => updateConfig({ logoUrl: e.target.value })}
                                        className="bg-slate-950/50 border-slate-700 h-11"
                                        placeholder="https://..."
                                    />
                                    <p className="text-xs text-slate-500 font-medium">Logonuzun doğrudan resim bağlantısını yapıştırın.</p>
                                </div>
                            </div>

                            <div className="pt-6 flex items-center justify-between border-t border-slate-800/50">
                                <Button
                                    variant="outline"
                                    onClick={resetToDefaults}
                                    className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 gap-2"
                                >
                                    <RotateCcw size={16} /> Defaults
                                </Button>
                                <Button
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 gap-2"
                                    onClick={() => {
                                        setSaved(true)
                                        setTimeout(() => setSaved(false), 2000)
                                    }}
                                >
                                    {saved ? <Check size={18} /> : <Save size={18} />}
                                    {saved ? "Kaydedildi!" : "Değişiklikleri Kaydet"}
                                </Button>
                            </div>
                        </div>
                    )}


                    {/* DICTIONARIES TAB */}
                    {activeTab === 'dictionaries' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <ProcessTypesSettings />
                        </div>
                    )}

                    {/* AI TAB */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-2">Yapay Zeka (AI)</h2>
                                <p className="text-slate-400">Veri analizi ve otomatik öneri sistemleri.</p>
                            </div>
                            <Separator className="bg-slate-800" />

                            <div className="p-8 border border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 bg-emerald-500/10 rounded-full">
                                    <BrainCircuit size={48} className="text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-200">AI Modülü Hazırlanıyor</h3>
                                <p className="text-slate-400 max-w-md">
                                    Bu modül, müşteri verilerini analiz ederek otomatik öneriler ve risk analizleri sunacak. Çok yakında aktif olacak.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-2">Güvenlik Ayarları</h2>
                                <p className="text-slate-400">Hesap güvenliği ve erişim yönetimi.</p>
                            </div>
                            <Separator className="bg-slate-800" />

                            <div className="max-w-xl space-y-6">
                                <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-xl space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Lock className="text-red-400" size={20} />
                                        <h3 className="font-bold text-red-100">Yönetici Şifresi</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Mevcut Şifre</Label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                className="bg-slate-950 border-slate-700 pr-10"
                                                value="**********"
                                                readOnly
                                            />
                                            <button
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                        Şifreyi Değiştir
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-5 bg-slate-950/50 rounded-xl border border-slate-800">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">İki Faktörlü Doğrulama (2FA)</Label>
                                        <p className="text-sm text-slate-500">Giriş yaparken ekstra güvenlik sağlar.</p>
                                    </div>
                                    <Switch />
                                </div>

                                <div className="flex items-center justify-between p-5 bg-slate-950/50 rounded-xl border border-slate-800">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Oturum Zaman Aşımı</Label>
                                        <p className="text-sm text-slate-500">30 dakika işlem yapılmazsa çıkış yap.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-2">Sistem Kayıtları (Logs)</h2>
                                <p className="text-slate-400">Sistemde gerçekleşen son işlemler.</p>
                            </div>
                            <Separator className="bg-slate-800" />

                            <div className="flex-1 bg-black rounded-lg border border-slate-800 p-4 font-mono text-xs text-green-500 overflow-y-auto max-h-[500px] shadow-inner">
                                <div className="mb-2 opacity-50 border-b border-slate-800 pb-2">Console Output Stream...</div>
                                <div className="space-y-1.5">
                                    <p>[SYSTEM] <span className="text-slate-500">2024-02-02 14:01:22</span> - Database connection established (Supabase)</p>
                                    <p>[AUTH] <span className="text-slate-500">2024-02-02 14:01:25</span> - User 'Admin' logged in successfully.</p>
                                    <p>[DATA] <span className="text-slate-500">2024-02-02 14:02:10</span> - Fetched 142 client records.</p>
                                    <p>[JOB] <span className="text-slate-500">2024-02-02 14:05:00</span> - Auto-archive check running...</p>
                                    <p>[JOB] <span className="text-slate-500">2024-02-02 14:05:01</span> - 0 records moved to archive.</p>
                                    <p>[DATA] <span className="text-slate-500">2024-02-02 14:12:44</span> - New client registered: "Ahmet Y."</p>
                                    <p>[WARN] <span className="text-slate-500">2024-02-02 14:15:30</span> - High latency detected on API endpoint (240ms).</p>
                                    <p>[SYSTEM] <span className="text-slate-500">2024-02-02 14:20:00</span> - Backup started.</p>
                                    <p>[SYSTEM] <span className="text-slate-500">2024-02-02 14:20:05</span> - Backup completed (Size: 4.2MB).</p>
                                </div>
                                <div className="mt-4 animate-pulse">_</div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div >
    )
}
