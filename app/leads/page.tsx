"use client"

import { useState, useEffect } from "react"
import { Search, ChevronRight, MessageCircle, Edit, CalendarDays, Copy, Check, Sparkles, Pin, Clock, Archive, Plus, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { tr } from "date-fns/locale"
import { JsonImportDialog } from "@/components/JsonImportDialog"

// Database Type
interface Lead {
    id: string
    name: string
    phone: string | null
    source: string | null
    process_name: string | null
    status: string | null
    created_at: string
    price: number | null
    ai_summary: string | null
    reservation_at: string | null
}

// Category Configuration
const CATEGORIES = {
    'Yeni': { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Sparkles },
    'Sabit': { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Pin },
    'Takip': { color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: Clock },
    'Arşiv': { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Archive },
} as const

type CategoryType = keyof typeof CATEGORIES

const ORDERED_CATEGORIES: CategoryType[] = ['Yeni', 'Sabit', 'Takip', 'Arşiv']

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // UI State
    const [copiedText, setCopiedText] = useState<string | null>(null)
    const [reservationDate, setReservationDate] = useState<Date | undefined>(new Date())
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isReservationOpen, setIsReservationOpen] = useState(false)

    // Expanded states for categories
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        'Yeni': true,
        'Sabit': true,
        'Takip': true,
        'Arşiv': false // Archive closed by default
    })

    const fetchLeads = async () => {
        setLoading(true)

        // Supabase Check
        if (!('auth' in supabase)) {
            console.warn("Supabase not configured, using mock data")
            setLeads([
                {
                    id: '1', name: 'Ahmet Yılmaz', phone: '5551234567', source: 'Instagram',
                    process_name: 'Bağlama', status: 'Yeni', created_at: new Date().toISOString(),
                    price: 5000, ai_summary: 'Eşiyle sorun yaşıyor, acil işlem istiyor.', reservation_at: null
                },
                {
                    id: '3', name: 'Mehmet Kaya', phone: '5331112233', source: 'Web',
                    process_name: 'Rızık', status: 'Arşiv', created_at: new Date().toISOString(),
                    price: 3000, ai_summary: 'İş yeri bereketi için.', reservation_at: null
                }
            ])
            setLoading(false)
            return
        }

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .neq('status', 'Rezervasyon') // Exclude reservations
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching leads:', error)
            setLoading(false)
            return
        }

        setLeads(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchLeads()
    }, [])

    const toggleCategory = (cat: string) => {
        setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }))
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedText(text)
        setTimeout(() => setCopiedText(null), 2000)
    }

    const handleWhatsApp = (phone: string | null) => {
        if (!phone) return
        const cleanPhone = phone.replace(/\D/g, '')
        const finalPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone}`
        window.open(`https://web.whatsapp.com/send?phone=${finalPhone}`, '_blank')
    }

    const handleReservation = async (leadId: string, date: Date | undefined) => {
        if (!date) return

        try {
            // 1. Update DB: Set date AND change status to 'Rezervasyon'
            const { error } = await supabase
                .from('leads')
                .update({
                    reservation_at: date.toISOString(),
                    status: 'Rezervasyon'
                })
                .eq('id', leadId)

            if (error) throw error

            // 2. Remove from local state (optimistic update)
            setLeads(prev => prev.filter(l => l.id !== leadId))

            // Close popover
            setIsReservationOpen(false)
            setSelectedLeadId(null)
        } catch (error) {
            console.error('Error creating reservation:', error)
        }
    }

    // Change Status
    const updateStatus = async (id: string, newStatus: string) => {
        // Optimistic UI Update
        const updatedLeads = leads.map(l => l.id === id ? { ...l, status: newStatus } : l)
        setLeads(updatedLeads)

        if ('auth' in supabase) {
            await supabase.from('leads').update({ status: newStatus }).eq('id', id)
        }
    }

    // Filter Logic
    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        (lead.phone && lead.phone.includes(search)) ||
        (lead.process_name && lead.process_name.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Kayıtlar
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Müşteri takibi ve yönetimi.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input
                            placeholder="İsim, telefon veya işlem ara..."
                            className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <JsonImportDialog onSuccess={fetchLeads} />
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2 shadow-lg shadow-purple-900/20 transition-all duration-300 hover:scale-[1.02]">
                            <Plus size={18} />
                            Yeni Kayıt
                        </Button>
                    </div>
                </div>
            </div>

            {/* List Layout - Grouped by Category */}
            <div className="space-y-6">
                {ORDERED_CATEGORIES.map(category => {
                    const categoryItems = filteredLeads.filter(l => (l.status || 'Yeni') === category)
                    const config = CATEGORIES[category]
                    const isOpen = expanded[category]

                    return (
                        <Collapsible
                            key={category}
                            open={isOpen}
                            onOpenChange={() => toggleCategory(category)}
                            className={cn(
                                "rounded-xl border transition-all duration-200",
                                isOpen ? "bg-slate-900/40 border-slate-800" : "bg-transparent border-transparent hover:bg-slate-900/20"
                            )}
                        >
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-3 p-4 cursor-pointer group select-none">
                                    <ChevronRight className={cn("text-slate-500 transition-transform duration-200", isOpen && "rotate-90")} />

                                    <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg border", config.bg, config.border)}>
                                        <config.icon size={20} className={config.color} />
                                        <span className={cn("font-bold text-lg", config.color)}>{category}</span>
                                        <span className={cn("text-sm opacity-70 ml-1", config.color)}>({categoryItems.length})</span>
                                    </div>

                                    <div className="flex-1 h-px bg-slate-800/50 ml-4 group-hover:bg-slate-800" />
                                </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <div className="px-4 pb-4 space-y-1">
                                    {/* Header Row - Flex Layout */}
                                    <div className="flex items-center gap-4 px-6 py-2 border-b border-slate-800/50 mb-3 text-sm font-black text-slate-400 uppercase tracking-wide">
                                        <div className="w-[180px] shrink-0">İsim & Telefon</div>
                                        <div className="w-[160px] shrink-0">İşlem & Ücret</div>
                                        <div className="w-[150px] shrink-0">Durum</div>
                                        <div className="flex-1 pl-2">Detay (AI)</div>
                                    </div>

                                    {categoryItems.length === 0 ? (
                                        <div className="p-8 text-center text-slate-600 italic text-sm font-medium">Bu kategoride kayıt yok.</div>
                                    ) : (
                                        categoryItems.map(lead => (
                                            <div
                                                key={lead.id}
                                                className="flex items-center gap-4 px-6 py-2 rounded-lg hover:bg-slate-800/60 transition-all duration-200 hover:scale-[1.01] hover:shadow-md border border-transparent hover:border-slate-800/50 group bg-slate-900/20"
                                            >
                                                {/* Name & Phone */}
                                                <div className="w-[180px] shrink-0 flex flex-col justify-center gap-0.5">
                                                    <div className="text-[13px] font-bold text-slate-200 truncate leading-tight">{lead.name}</div>
                                                    <div className="text-[11px] font-semibold text-slate-500/90 truncate font-sans">{lead.phone || '-'}</div>
                                                </div>

                                                {/* Process & Price */}
                                                <div className="w-[160px] shrink-0 flex flex-col justify-center gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px]",
                                                            lead.process_name?.includes('Bağlama') ? "bg-purple-500 shadow-purple-500/50" :
                                                                lead.process_name?.includes('Geri') ? "bg-cyan-500 shadow-cyan-500/50" :
                                                                    lead.process_name?.includes('Büyü') ? "bg-red-500 shadow-red-500/50" :
                                                                        lead.process_name?.includes('Rızık') ? "bg-amber-500 shadow-amber-500/50" :
                                                                            "bg-slate-500 shadow-slate-500/50"
                                                        )} />
                                                        <span className="text-[12px] font-bold text-slate-300 truncate opacity-90">{lead.process_name || 'İşlem Yok'}</span>
                                                    </div>
                                                    <div className="text-[11px] font-bold text-slate-500 pl-4 opacity-80">
                                                        {lead.price ? `${lead.price.toLocaleString('tr-TR')} ₺` : '-'}
                                                    </div>
                                                </div>

                                                {/* Status Selector */}
                                                <div className="w-[150px] shrink-0">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className={cn("text-[10px] font-black px-2.5 py-1 rounded-md border border-slate-800/50 hover:border-slate-700 hover:bg-slate-800 transition-all flex w-fit items-center gap-2 shadow-sm", config.color, config.bg)}>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full", config.bg.replace('/10', ''))} />
                                                                {lead.status}
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-48 p-1 bg-[#0F111A] border-slate-800 shadow-xl rounded-lg">
                                                            {ORDERED_CATEGORIES.map(cat => (
                                                                <button
                                                                    key={cat}
                                                                    onClick={() => updateStatus(lead.id, cat)}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2.5 text-xs rounded-md hover:bg-slate-800 flex items-center gap-2.5 transition-colors",
                                                                        cat === lead.status ? "text-white bg-slate-800/80 font-bold" : "text-slate-400 font-semibold"
                                                                    )}
                                                                >
                                                                    <div className={cn("w-2 h-2 rounded-full", CATEGORIES[cat].bg.replace('/10', ''))} />
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>

                                                {/* AI Summary (Detail) & Actions */}
                                                <div className="flex-1 min-w-0 flex items-center gap-6 pl-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button className="text-[10px] font-semibold text-slate-500/80 hover:text-slate-300 transition-colors text-left truncate w-[260px] opacity-90 cursor-pointer">
                                                                {lead.ai_summary || 'Detay yok...'}
                                                            </button>
                                                        </DialogTrigger>
                                                        <DialogContent className="bg-slate-950 border-slate-800">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-slate-100 flex items-center gap-2">
                                                                    <User size={18} className="text-slate-400" />
                                                                    {lead.name} - Detaylar
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-slate-300 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                                                                {lead.ai_summary || "Herhangi bir detay bulunamadı."}
                                                            </div>
                                                            <DialogFooter className="sm:justify-between gap-2 mt-4">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleCopy(lead.ai_summary || "")}
                                                                    className="gap-2 border-slate-700 hover:bg-slate-800 hover:text-white"
                                                                >
                                                                    {copiedText === lead.ai_summary ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                                    {copiedText === lead.ai_summary ? "Kopyalandı" : "Kopyala"}
                                                                </Button>
                                                                <DialogClose asChild>
                                                                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white">Kapat</Button>
                                                                </DialogClose>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    {/* Actions - Persistent & Scaled */}
                                                    <div className="flex gap-2 shrink-0 ml-auto">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-11 w-11 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all hover:scale-110" title="Randevu Oluştur">
                                                                    <CalendarDays size={22} />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0 bg-slate-950 border-slate-800" align="end">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={reservationDate}
                                                                    onSelect={(date) => {
                                                                        setReservationDate(date)
                                                                        if (date) handleReservation(lead.id, date)
                                                                    }}
                                                                    locale={tr}
                                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                                    initialFocus
                                                                    className="p-3"
                                                                />
                                                            </PopoverContent>
                                                        </Popover>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleWhatsApp(lead.phone)}
                                                            className="h-11 w-11 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-xl transition-all hover:scale-110"
                                                            title="WhatsApp Web"
                                                        >
                                                            <MessageCircle size={22} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-11 w-11 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-xl transition-all hover:scale-110" title="Düzenle">
                                                            <Edit size={22} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    )
                })}
            </div >
        </div >
    )
}
