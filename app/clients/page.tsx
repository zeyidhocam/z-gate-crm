"use client"

import { useState, useEffect } from "react"
import { Search, ChevronRight, MessageCircle, Edit, CalendarDays, Copy, Check, Sparkles, Pin, Clock, Archive, Plus, User, Info } from "lucide-react"
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

// Database Type Matching New SQL
interface Client {
    id: string
    full_name: string
    phone: string | null
    mother_name: string | null
    status: string | null
    created_at: string
    notes: string | null
    price_agreed: number | null
    payment_status: string | null
    reservation_at: string | null

    // Relations
    process_type_id: number | null
    magic_type_id: number | null
    process_types?: { name: string } | null
    magic_types?: { name: string, risk_level: string } | null
}

// Category Configuration
const CATEGORIES = {
    'Yeni': { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Sparkles },
    'Sabit': { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Pin },
    'Takip': { color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: Clock },
    'Arşiv': { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Archive },
    'Rezervasyon': { color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: CalendarDays },
} as const

type CategoryType = keyof typeof CATEGORIES

const ORDERED_CATEGORIES: CategoryType[] = ['Yeni', 'Sabit', 'Takip', 'Arşiv', 'Rezervasyon']

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // UI State
    const [copiedText, setCopiedText] = useState<string | null>(null)
    const [reservationDate, setReservationDate] = useState<Date | undefined>(new Date())
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

    // Expanded states for categories
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        'Yeni': true,
        'Sabit': true,
        'Takip': true,
        'Rezervasyon': true,
        'Arşiv': false
    })

    const fetchClients = async () => {
        setLoading(true)

        // Supabase Check
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            console.warn("Supabase not configured")
            setLoading(false)
            return
        }

        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                process_types ( name ),
                magic_types ( name, risk_level )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching clients:', error)
            setLoading(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setClients(data as any || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchClients()
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

    const handleReservation = async (clientId: string, date: Date | undefined) => {
        if (!date) return

        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    reservation_at: date.toISOString(),
                    status: 'Rezervasyon'
                })
                .eq('id', clientId)

            if (error) throw error

            // Optimistic update
            setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: 'Rezervasyon', reservation_at: date.toISOString() } : c))

            // Close popover logic handled by UI state reset implies success
            setReservationDate(undefined)
        } catch (error) {
            console.error('Error creating reservation:', error)
        }
    }

    const updateStatus = async (id: string, newStatus: string) => {
        setClients(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))

        await supabase.from('clients').update({ status: newStatus }).eq('id', id)
    }

    const filteredClients = clients.filter(client =>
        (client.full_name && client.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (client.name && client.name.toLowerCase().includes(search.toLowerCase())) ||
        (client.phone && client.phone.includes(search)) ||
        (client.process_types?.name && client.process_types.name.toLowerCase().includes(search.toLowerCase())) ||
        (client.process_name && client.process_name.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Müşteriler
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
                        <JsonImportDialog onSuccess={fetchClients} />
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2 shadow-lg shadow-purple-900/20 transition-all duration-300 hover:scale-[1.02]">
                            <Plus size={18} />
                            Yeni Müşteri
                        </Button>
                    </div>
                </div>
            </div>

            {/* List Layout */}
            <div className="space-y-6">
                {ORDERED_CATEGORIES.map(category => {
                    const categoryItems = filteredClients.filter(l => (l.status || 'Yeni') === category)
                    const config = CATEGORIES[category] || CATEGORIES['Yeni']
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
                                    {/* Header Row */}
                                    <div className="flex items-center gap-4 px-6 py-2 border-b border-slate-800/50 mb-3 text-sm font-black text-slate-400 uppercase tracking-wide">
                                        <div className="w-[180px] shrink-0">İsim & Telefon</div>
                                        <div className="w-[120px] shrink-0">İşlem & Fiyat</div>
                                        <div className="w-[120px] shrink-0">Anne Adı</div>
                                        <div className="w-[120px] shrink-0">Durum</div>
                                        <div className="flex-1 pl-2">Notlar (Detay)</div>
                                    </div>

                                    {categoryItems.length === 0 ? (
                                        <div className="p-8 text-center text-slate-600 italic text-sm font-medium">Bu kategoride kayıt yok.</div>
                                    ) : (
                                        categoryItems.map(client => (
                                            <div
                                                key={client.id}
                                                className="flex items-center gap-4 px-6 py-3 rounded-lg hover:bg-slate-800/60 transition-all duration-200 hover:scale-[1.01] hover:shadow-md border border-transparent hover:border-slate-800/50 group bg-slate-900/20"
                                            >
                                                {/* Name & Phone */}
                                                <div className="w-[180px] shrink-0 flex flex-col justify-center gap-0.5">
                                                    <div className="text-[13px] font-bold text-slate-200 truncate leading-tight">
                                                        {client.full_name || client.name || 'İsimsiz'}
                                                    </div>
                                                    <div className="text-[11px] font-semibold text-slate-500/90 truncate font-sans">{client.phone || '-'}</div>
                                                </div>

                                                {/* Process & Price Agreed */}
                                                <div className="w-[120px] shrink-0 flex flex-col justify-center gap-1">
                                                    <div className="text-[12px] font-bold text-slate-300 truncate opacity-90">
                                                        {client.process_types?.name || client.process_name || 'İşlem Yok'}
                                                    </div>
                                                    <div className="text-[11px] font-bold text-slate-500 opacity-80">
                                                        {client.price_agreed ? `${client.price_agreed.toLocaleString('tr-TR')} ₺` : '-'}
                                                    </div>
                                                </div>

                                                {/* Mother Name */}
                                                <div className="w-[120px] shrink-0 text-[12px] text-slate-400 font-medium truncate">
                                                    {client.mother_name || '-'}
                                                </div>

                                                {/* Status Selector */}
                                                <div className="w-[120px] shrink-0">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className={cn("text-[10px] font-black px-2.5 py-1 rounded-md border border-slate-800/50 hover:border-slate-700 hover:bg-slate-800 transition-all flex w-fit items-center gap-2 shadow-sm", config.color, config.bg)}>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full", config.bg.replace('/10', ''))} />
                                                                {client.status}
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-48 p-1 bg-[#0F111A] border-slate-800 shadow-xl rounded-lg">
                                                            {ORDERED_CATEGORIES.map(cat => (
                                                                <button
                                                                    key={cat}
                                                                    onClick={() => updateStatus(client.id, cat)}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2.5 text-xs rounded-md hover:bg-slate-800 flex items-center gap-2.5 transition-colors",
                                                                        cat === client.status ? "text-white bg-slate-800/80 font-bold" : "text-slate-400 font-semibold"
                                                                    )}
                                                                >
                                                                    <div className={cn("w-2 h-2 rounded-full", CATEGORIES[cat].bg.replace('/10', ''))} />
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>

                                                {/* Notes / Details */}
                                                <div className="flex-1 min-w-0 flex items-center gap-6 pl-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button className="text-[10px] font-semibold text-slate-500/80 hover:text-slate-300 transition-colors text-left truncate w-[260px] opacity-90 cursor-pointer flex items-center gap-2">
                                                                <Info size={12} />
                                                                {client.notes || 'Not/Detay yok...'}
                                                            </button>
                                                        </DialogTrigger>
                                                        <DialogContent className="bg-slate-950 border-slate-800">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-slate-100 flex items-center gap-2">
                                                                    <User size={18} className="text-slate-400" />
                                                                    {client.full_name} - Detaylar
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 space-y-3">
                                                                <div>
                                                                    <div className="text-xs text-slate-500 font-bold mb-1">ANNE ADI</div>
                                                                    <div className="text-slate-300 text-sm">{client.mother_name || '-'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-slate-500 font-bold mb-1">NOTLAR</div>
                                                                    <div className="text-slate-300 text-sm leading-relaxed max-h-[40vh] overflow-y-auto">
                                                                        {client.notes || "Not yok."}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-slate-500 font-bold mb-1">BÜYÜ TÜRÜ (RİSK)</div>
                                                                    <div className="text-slate-300 text-sm">
                                                                        {client.magic_types ? `${client.magic_types.name} (${client.magic_types.risk_level})` : '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <DialogFooter className="sm:justify-between gap-2 mt-4">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleCopy(client.notes || "")}
                                                                    className="gap-2 border-slate-700 hover:bg-slate-800 hover:text-white"
                                                                >
                                                                    {copiedText === client.notes ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                                    {copiedText === client.notes ? "Notu Kopyala" : "Notu Kopyala"}
                                                                </Button>
                                                                <DialogClose asChild>
                                                                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white">Kapat</Button>
                                                                </DialogClose>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    {/* Actions */}
                                                    <div className="flex gap-2 shrink-0 ml-auto">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all" title="Randevu Oluştur">
                                                                    <CalendarDays size={18} />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0 bg-slate-950 border-slate-800" align="end">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={reservationDate}
                                                                    onSelect={(date) => {
                                                                        setReservationDate(date)
                                                                        if (date) handleReservation(client.id, date)
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
                                                            onClick={() => handleWhatsApp(client.phone)}
                                                            className="h-9 w-9 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all"
                                                            title="WhatsApp Web"
                                                        >
                                                            <MessageCircle size={18} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-all" title="Düzenle">
                                                            <Edit size={18} />
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
