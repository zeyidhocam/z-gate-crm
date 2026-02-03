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
import { WhatsAppButton } from "@/components/WhatsAppButton"
import { ReminderButton } from "@/components/ReminderButton"
import { NewClientDialog } from "@/components/NewClientDialog"

// Database Type Matching New SQL
interface Client {
    id: string
    full_name: string | null
    name: string | null // Legacy support
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
    process_name?: string | null // Legacy support
    price?: number | null // Legacy support
    ai_summary?: string | null // Legacy support
}

// Category Configuration
const CATEGORIES = {
    'Yeni': { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Sparkles },
    'Sabit': { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Pin },
    'Takip': { color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: Clock },
    'Arşiv': { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Archive },
    'Rezervasyon': { color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: CalendarDays },
} as const

type CategoryType = keyof typeof CATEGORIES

const ORDERED_CATEGORIES: CategoryType[] = ['Yeni', 'Sabit', 'Takip', 'Arşiv', 'Rezervasyon']


// Additional imports
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClientEditDialog } from "@/components/ClientEditDialog"

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [processTypes, setProcessTypes] = useState<{ id: number, name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // UI State
    const [copiedText, setCopiedText] = useState<string | null>(null)
    const [reservationDate, setReservationDate] = useState<Date | undefined>(new Date())
    const [editingClient, setEditingClient] = useState<Client | null>(null) // For Edit Dialog

    // Expanded states for categories - localStorage ile kalıcı
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('categoryExpanded')
            if (saved) return JSON.parse(saved)
        }
        return { 'Yeni': true, 'Sabit': true, 'Takip': true, 'Rezervasyon': true, 'Arşiv': false }
    })

    // Expanded state'i localStorage'a kaydet
    useEffect(() => {
        localStorage.setItem('categoryExpanded', JSON.stringify(expanded))
    }, [expanded])

    useEffect(() => {
        fetchClients()
        fetchProcessTypes()
    }, [])

    const fetchClients = async () => {
        setLoading(true)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

        const { data, error } = await supabase
            .from('clients')
            .select(`*, process_types ( name ), magic_types ( name, risk_level )`)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching clients:', error)
        else setClients(data as any || []) // eslint-disable-next-line @typescript-eslint/no-explicit-any

        setLoading(false)
    }

    const fetchProcessTypes = async () => {
        const { data } = await supabase.from('process_types').select('id, name')
        if (data) setProcessTypes(data)
    }

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
                .update({ reservation_at: date.toISOString(), status: 'Rezervasyon' })
                .eq('id', clientId)

            if (!error) {
                // Optimistic Update
                setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: 'Rezervasyon', reservation_at: date!.toISOString() } : c))
                setReservationDate(undefined)
            }
        } catch (error) {
            console.error('Error creating reservation:', error)
        }
    }

    const updateStatus = async (id: string, newStatus: string) => {
        setClients(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
        await supabase.from('clients').update({ status: newStatus }).eq('id', id)
    }

    // EDIT CLIENT HANDLER
    const handleSaveEdit = async (updatedClient: Partial<Client>) => {
        if (!editingClient) return

        try {
            const { error } = await supabase
                .from('clients')
                .update(updatedClient)
                .eq('id', editingClient.id)

            if (error) throw error

            // Optimistic Update
            setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...updatedClient } : c))
            setEditingClient(null) // Close Dialog
            window.location.reload() // Reload to fetch relations if needed, or we can fetch single

        } catch (error) {
            console.error('Error updating client:', error)
        }
    }


    const filteredClients = clients.filter(client =>
        (client.full_name && client.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (client.name && client.name.toLowerCase().includes(search.toLowerCase())) ||
        (client.phone && client.phone.includes(search)) ||
        (client.process_types?.name && client.process_types.name.toLowerCase().includes(search.toLowerCase())) ||
        (client.process_name && client.process_name.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="p-8 max-w-[1700px] mx-auto space-y-8">
            {/* Header */}
            {/* Header - Ocean Elite */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-cyan-500/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gradient-ocean">
                        Müşteriler
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Müşteri takibi ve yönetimi.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
                        <Input
                            placeholder="İsim, telefon veya işlem ara..."
                            className="pl-10 bg-[#0c1929]/80 border-cyan-500/10 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/30"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <NewClientDialog onSuccess={fetchClients} />
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
                                "rounded-2xl border-2 transition-all duration-300",
                                isOpen
                                    ? "bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border-cyan-500/20 shadow-[0_0_30px_-10px_rgba(34,211,238,0.15)]"
                                    : "bg-[#0c1929]/40 border-transparent hover:bg-[#0c1929]/60 hover:border-cyan-500/10"
                            )}
                        >
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-4 p-5 cursor-pointer group select-none">
                                    <ChevronRight className={cn("text-cyan-500/50 transition-transform duration-300 group-hover:text-cyan-400", isOpen && "rotate-90 text-cyan-400")} size={20} />

                                    <div className={cn(
                                        "flex items-center gap-3 px-5 py-3 rounded-xl border-2 shadow-lg transition-all duration-300",
                                        "bg-gradient-to-r",
                                        config.bg.replace('/10', '/15'),
                                        config.border.replace('/20', '/40'),
                                        "group-hover:shadow-xl group-hover:scale-[1.02]"
                                    )}>
                                        <config.icon size={22} className={cn(config.color, "drop-shadow-md")} strokeWidth={2.5} />
                                        <span className={cn("font-black text-lg tracking-wide", config.color)}>{category}</span>
                                        <span className={cn("text-sm font-bold px-2 py-0.5 rounded-md", config.bg, config.color)}>({categoryItems.length})</span>
                                    </div>

                                    <div className="flex-1 h-0.5 bg-gradient-to-r from-cyan-500/20 to-transparent ml-2" />
                                </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <div className="px-4 pb-4 space-y-1">
                                    {/* Header Row - WIDER COLUMNS */}
                                    <div className="flex items-center gap-8 px-6 py-2 border-b border-slate-800/50 mb-3 text-sm font-black text-slate-400 uppercase tracking-wide">
                                        <div className="w-[240px] shrink-0">İsim & Telefon</div>
                                        <div className="w-[200px] shrink-0">İşlem & Fiyat</div>
                                        <div className="w-[160px] shrink-0">Durum</div>
                                        <div className="flex-1 pl-4">Notlar (Detay)</div>
                                        <div className="w-[120px] shrink-0 text-right">İşlemler</div>
                                    </div>

                                    {categoryItems.length === 0 ? (
                                        <div className="p-8 text-center text-slate-600 italic text-sm font-medium">Bu kategoride kayıt yok.</div>
                                    ) : (
                                        categoryItems.map(client => (
                                            <div
                                                key={client.id}
                                                className="flex items-center gap-8 px-6 py-5 rounded-xl hover:bg-gradient-to-r hover:from-cyan-500/5 hover:to-transparent transition-all duration-300 hover:scale-[1.005] border border-transparent hover:border-cyan-500/10 group bg-[#040d17]/30">

                                                {/* Name & Phone */}
                                                <div className="w-[240px] shrink-0 flex flex-col justify-center gap-1">
                                                    <div className="text-[15px] font-bold text-slate-200 truncate leading-tight">
                                                        {client.full_name || client.name || 'İsimsiz'}
                                                    </div>
                                                    <div className="text-[13px] font-semibold text-slate-500/90 truncate font-sans">{client.phone || '-'}</div>
                                                </div>

                                                {/* Process & Price Agreed */}
                                                <div className="w-[200px] shrink-0 flex flex-col justify-center gap-1.5">
                                                    <div className="text-[13px] font-bold text-slate-300 truncate opacity-90">
                                                        {client.process_types?.name || client.process_name || 'İşlem Yok'}
                                                    </div>
                                                    <div className="text-[12px] font-bold text-slate-500 opacity-80">
                                                        {(client.price_agreed || client.price) ? `${(client.price_agreed || client.price)?.toLocaleString('tr-TR')} ₺` : '-'}
                                                    </div>
                                                </div>

                                                {/* Status Selector */}
                                                <div className="w-[160px] shrink-0 flex items-center">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className={cn(
                                                                "text-[11px] font-black px-4 py-1.5 rounded-lg border transition-all flex items-center justify-center gap-2 shadow-sm min-w-[80px]",
                                                                config.color,
                                                                config.bg,
                                                                "border-transparent hover:border-slate-600"
                                                            )}>
                                                                {client.status}
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-48 p-1.5 bg-[#0c1929] border-cyan-500/20 shadow-xl rounded-xl">
                                                            {ORDERED_CATEGORIES.map(cat => {
                                                                const catConfig = CATEGORIES[cat]
                                                                const dotColors: Record<string, string> = {
                                                                    'Yeni': 'bg-green-500',
                                                                    'Sabit': 'bg-orange-500',
                                                                    'Takip': 'bg-cyan-500',
                                                                    'Arşiv': 'bg-slate-500',
                                                                    'Rezervasyon': 'bg-cyan-500',
                                                                }
                                                                return (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={() => updateStatus(client.id, cat)}
                                                                        className={cn(
                                                                            "w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-slate-800/80 flex items-center gap-3 transition-colors",
                                                                            cat === client.status ? "bg-slate-800/60 font-bold" : "font-semibold",
                                                                            catConfig.color
                                                                        )}
                                                                    >
                                                                        <div className={cn("w-2.5 h-2.5 rounded-full", dotColors[cat])} />
                                                                        {cat}
                                                                    </button>
                                                                )
                                                            })}
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>

                                                {/* Notes / Details */}
                                                <div className="flex-1 min-w-0 flex items-center gap-6 pl-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button className="text-[11px] font-semibold text-slate-500/80 hover:text-slate-300 transition-colors text-left truncate w-[300px] opacity-90 cursor-pointer flex items-center gap-2">
                                                                <Info size={14} />
                                                                {client.notes || client.ai_summary || 'Not/Detay yok...'}
                                                            </button>
                                                        </DialogTrigger>
                                                        <DialogContent className="bg-[#0c1929] border-cyan-500/20">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-slate-100 flex items-center gap-2">
                                                                    <User size={18} className="text-slate-400" />
                                                                    {client.full_name} - Detaylar
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 space-y-3">
                                                                <div>
                                                                    <div className="text-xs text-slate-500 font-bold mb-1">NOTLAR / DETAY</div>
                                                                    <div className="text-slate-300 text-sm leading-relaxed max-h-[40vh] overflow-y-auto">
                                                                        {client.notes || client.ai_summary || "Not veya detay bulunamadı."}
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
                                                    <div className="flex gap-1.5 shrink-0 ml-auto w-[160px] justify-end">
                                                        <ReminderButton
                                                            clientId={client.id}
                                                            clientName={client.full_name || client.name || 'Müşteri'}
                                                            iconSize={18}
                                                        />

                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all" title="Randevu Oluştur">
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

                                                        <WhatsAppButton
                                                            phone={client.phone}
                                                            clientName={client.full_name || client.name || 'Değerli Müşteri'}
                                                            size="sm"
                                                        />

                                                        {/* EDIT BUTTON */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingClient(client)}
                                                            className="h-9 w-9 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-xl transition-all"
                                                            title="Düzenle"
                                                        >
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

            {/* EDIT DIALOG */}
            <ClientEditDialog
                open={!!editingClient}
                onOpenChange={(open) => !open && setEditingClient(null)}
                client={editingClient as any}
                onSave={handleSaveEdit}
                processTypes={processTypes}
            />
        </div >
    )
}
