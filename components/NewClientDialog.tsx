'use client'

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Plus, User, Phone, Tag, DollarSign, FileText, Code, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface NewClientDialogProps {
    onSuccess?: () => void
}

export function NewClientDialog({ onSuccess }: NewClientDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("manual")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // JSON Validation State
    const [jsonStatus, setJsonStatus] = useState<'neutral' | 'valid' | 'invalid'>('neutral')
    const [jsonMessage, setJsonMessage] = useState("")

    // Form Data
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        process_name: "",
        price: "",
        notes: "",
        status: "Yeni"
    })

    // Tags
    const [tags, setTags] = useState<string[]>([])
    const [availableTags, setAvailableTags] = useState<string[]>([])

    // Duplicate detection
    const [duplicateMatches, setDuplicateMatches] = useState<Array<Record<string, any>>>([])
    const [forceSave, setForceSave] = useState(false)

    // JSON Input
    const [jsonInput, setJsonInput] = useState("")

    const handleJsonPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setJsonInput(val)
        setError(null)

        if (!val.trim()) {
            setJsonStatus('neutral')
            setJsonMessage("")
            return
        }

        const parsePrice = (raw: string | number | null | undefined) => {
            if (!raw) return ""
            // "8.500 TL" -> "8500"
            // "12.500,50" -> "12500.50"
            let str = String(raw).replace(/[^0-9.,]/g, '') // Remove letters/symbols

            // If it looks like Turkish format (dots as thousands), remove dots
            if (str.includes('.') && str.indexOf('.') < str.length - 3) {
                str = str.replace(/\./g, '')
            } else if (str.includes('.') && str.split('.').length > 1 && str.split('.')[1].length === 3) {
                // "8.500" case
                str = str.replace(/\./g, '')
            }

            // Replace comma with dot for decimals
            str = str.replace(',', '.')
            return str
        }

        try {
            const parsed = JSON.parse(val)

            // Auto-fill form from JSON
            setFormData({
                full_name: parsed.full_name || parsed.name || parsed.isim_soyisim || "",
                phone: parsed.phone || parsed.telefon || "",
                process_name: parsed.process_name || parsed.islem || "",
                price: parsePrice(parsed.price || parsed.ucret || parsed.price_agreed),
                notes: parsed.notes || parsed.detay || "",
                status: "Yeni" // JSON'dan ne gelirse gelsin, manuel yapıştırmada "Yeni" olsun
            })

            setJsonStatus('valid')
            setJsonMessage("✅ Form başarıyla dolduruldu! 'Kaydet' butonuna basabilirsiniz.")

        } catch {
            setJsonStatus('invalid')
            setJsonMessage("❌ Geçersiz JSON formatı. Lütfen kontrol edin.")
        }
    }

    useEffect(() => {
        // Fetch available tags from system_settings.customer_tags if exists
        supabase.from('system_settings').select('customer_tags').single().then(({ data }) => {
            if (data && (data as any).customer_tags) {
                setAvailableTags((data as any).customer_tags || [])
            } else {
                const local = localStorage.getItem('customer_tags')
                if (local) setAvailableTags(JSON.parse(local))
            }
        }).catch(() => {
            const local = localStorage.getItem('customer_tags')
            if (local) setAvailableTags(JSON.parse(local))
        })
    }, [])

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            // Validation
            if (!formData.full_name) {
                // Eğer JSON tabındaysa ve isim yoksa, JSON hatalı demektir
                if (activeTab === 'json') {
                    throw new Error("JSON geçerli değil veya isim alanı bulunamadı.")
                }
                throw new Error("Müşteri adı zorunludur.")
            }

            // Validate Status against known categories
            const VALID_CATEGORIES = ['Yeni', 'Teklif', 'Düşünüyor', 'Arşiv', 'Çöp']
            let finalStatus = formData.status?.trim() || 'Yeni'
            // Capitalize first letter just in case (yeni -> Yeni)
            finalStatus = finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1).toLowerCase()

            if (!VALID_CATEGORIES.includes(finalStatus)) {
                finalStatus = 'Yeni'
            }

            // Prepare Data
            const clientData = {
                name: formData.full_name,
                full_name: formData.full_name,
                phone: formData.phone || null,
                process_name: formData.process_name || null,
                price_agreed: formData.price ? parseInt(String(formData.price)) : 0,
                notes: formData.notes || null,
                status: finalStatus,
                tags: tags.length ? tags : null,
                created_at: new Date().toISOString(),
                is_confirmed: false,
                stage: 0
            }

            // Duplicate check (by phone or similar full_name) unless forceSave is true
            if (!forceSave) {
                const matches: Record<string, any>[] = []
                if (formData.phone && formData.phone.trim()) {
                    const { data: byPhone } = await supabase.from('clients').select('id, full_name, phone').eq('phone', formData.phone).limit(5)
                    if (byPhone && byPhone.length) matches.push(...byPhone)
                }
                if (formData.full_name && formData.full_name.trim().length > 3) {
                    const { data: byName } = await supabase.from('clients').select('id, full_name, phone').ilike('full_name', `%${formData.full_name}%`).limit(5)
                    if (byName && byName.length) matches.push(...byName)
                }

                // Unique
                const unique = Array.from(new Map(matches.map(m => [m.id, m])).values())
                if (unique.length > 0) {
                    setDuplicateMatches(unique)
                    setError("Benzer kayıt(lar) bulundu. Lütfen kontrol edin veya 'Yine de Kaydet' ile devam edin.")
                    setLoading(false)
                    return
                }
            }

            // Insert
            const { error: dbError } = await supabase
                .from('clients')
                .insert([clientData])

            if (dbError) throw dbError

            setSuccess("Kaydedildi!")

            // Reset
            setTimeout(() => {
                setIsOpen(false)
                setSuccess(null)
                setError(null)
                setJsonStatus('neutral')
                setJsonMessage("")
                setFormData({
                    full_name: "",
                    phone: "",
                    process_name: "",
                    price: "",
                    notes: "",
                    status: "Yeni"
                })
                setJsonInput("")
                if (onSuccess) onSuccess()
            }, 1000)

            // reset duplicate/force state
            setForceSave(false)
            setDuplicateMatches([])

        } catch (err: unknown) {
            // Hata kaydi gizlendi
            const errorMsg = err instanceof Error ? err.message : "Bir hata oluştu"
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    const handleAddTag = (tag: string) => {
        const t = tag.trim()
        if (!t) return
        if (!tags.includes(t)) setTags(prev => [...prev, t])
    }

    const handleRemoveTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-2 shadow-lg shadow-cyan-900/30 transition-all duration-150 hover:scale-[1.02]">
                    <Plus size={18} />
                    Yeni Kayıt
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col bg-[#0c1929] border-cyan-500/20 text-slate-100 p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Yeni Müşteri Kaydı
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Müşteri bilgilerini manuel girin veya JSON yapıştırın.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 shrink-0">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 border border-slate-800">
                            <TabsTrigger value="manual" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                                <User className="w-4 h-4 mr-2" />
                                Manuel Giriş
                            </TabsTrigger>
                            <TabsTrigger value="json" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                                <Code className="w-4 h-4 mr-2" />
                                JSON Yapıştır
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                        {/* Manuel Tab Content */}
                        <div className={cn("space-y-4 transition-all", activeTab === 'json' && "opacity-50 pointer-events-none")}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 uppercase">Ad Soyad</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <Input
                                            placeholder="Ahmet Yılmaz"
                                            className="pl-9 bg-slate-900/50 border-slate-800 focus:border-cyan-500/50"
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 uppercase">Telefon</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <Input
                                            placeholder="905..."
                                            className="pl-9 bg-slate-900/50 border-slate-800 focus:border-cyan-500/50"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 uppercase">İşlem</Label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <Input
                                            placeholder="Geri Getirme..."
                                            className="pl-9 bg-slate-900/50 border-slate-800 focus:border-cyan-500/50"
                                            value={formData.process_name}
                                            onChange={e => setFormData({ ...formData, process_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 uppercase">Ücret</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="pl-9 bg-slate-900/50 border-slate-800 focus:border-cyan-500/50"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase">Notlar</Label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-slate-500" size={16} />
                                    <Textarea
                                        placeholder="Müşteri notları..."
                                        className="pl-9 min-h-[80px] bg-slate-900/50 border-slate-800 focus:border-cyan-500/50 resize-none"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Tags input */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase">Etiketler</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Yeni etiket ekle..."
                                        className="bg-slate-900/50 border-slate-800"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                const val = (e.target as HTMLInputElement).value
                                                handleAddTag(val)
                                                ;(e.target as HTMLInputElement).value = ''
                                            }
                                        }}
                                    />
                                    <Button size="sm" onClick={() => {
                                        const input = document.querySelector<HTMLInputElement>('input[placeholder="Yeni etiket ekle..."]')
                                        if (input) { handleAddTag(input.value); input.value = '' }
                                    }}>Ekle</Button>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map(t => (
                                        <button key={t} onClick={() => handleRemoveTag(t)} className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 text-sm flex items-center gap-2">
                                            <span>{t}</span>
                                            <X size={12} />
                                        </button>
                                    ))}
                                </div>

                                {availableTags.length > 0 && (
                                    <div className="mt-2 text-xs text-slate-400">
                                        Öneriler: <span className="flex gap-2 mt-2 flex-wrap">
                                            {availableTags.map(t => (
                                                <button key={t} onClick={() => handleAddTag(t)} className="px-2 py-1 rounded-md bg-slate-900/40 hover:bg-slate-800 text-slate-300 text-xs">{t}</button>
                                            ))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* JSON Tab Content Overlay */}
                        <TabsContent value="json" className="mt-0 space-y-3">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-purple-400 uppercase">JSON Kodunu Buraya Yapıştırın</Label>
                                <Textarea
                                    placeholder='{ "full_name": "...", "phone": "..." }'
                                    className={cn(
                                        "min-h-[200px] font-mono text-xs bg-slate-950/80 border-2 transition-colors",
                                        jsonStatus === 'valid' ? "border-green-500/50 focus:border-green-500 text-green-300" :
                                            jsonStatus === 'invalid' ? "border-red-500/50 focus:border-red-500 text-red-300" :
                                                "border-purple-500/30 focus:border-purple-500 text-purple-200"
                                    )}
                                    value={jsonInput}
                                    onChange={handleJsonPaste}
                                />
                                {jsonMessage && (
                                    <div className={cn(
                                        "text-sm font-bold flex items-center gap-2 p-2 rounded-lg",
                                        jsonStatus === 'valid' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {jsonStatus === 'valid' && <CheckCircle size={16} />}
                                        {jsonStatus === 'invalid' && <AlertCircle size={16} />}
                                        {jsonMessage}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>

                    <div className="p-6 pt-2 shrink-0 bg-slate-900/30 border-t border-slate-800 flex justify-between items-center">
                            <div className="text-sm">
                                {error && <span className="text-red-400 flex items-center gap-2"><AlertCircle size={14} /> {error}</span>}
                                {success && <span className="text-green-400 flex items-center gap-2"><CheckCircle size={14} /> {success}</span>}

                                {duplicateMatches.length > 0 && (
                                    <div className="mt-2 p-2 rounded-md bg-yellow-900/10 border border-yellow-700/10 text-yellow-300">
                                        <div className="font-bold mb-1">Benzer kayıt bulundu:</div>
                                        <ul className="text-xs list-disc list-inside mb-2">
                                            {duplicateMatches.map(m => (
                                                <li key={m.id}>{m.full_name} {m.phone ? `- ${m.phone}` : ''}</li>
                                            ))}
                                        </ul>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => { setForceSave(true); handleSubmit() }}>Yine de Kaydet</Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setDuplicateMatches([]); setForceSave(false); setError(null) }}>İptal</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setIsOpen(false)} className="hover:bg-slate-800 text-slate-400">İptal</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || (activeTab === 'json' && jsonStatus === 'invalid')}
                                className={cn(
                                    "min-w-[120px] bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30 transition-all duration-150",
                                    loading && "opacity-80 cursor-not-allowed"
                                )}
                            >
                                {loading ? "Kaydediliyor..." : "Kaydet"}
                            </Button>
                        </div>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
