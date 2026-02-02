"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format, parseISO, isSameDay } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
// Icons
import {
    Calendar as CalendarIcon, CalendarDays, Copy, Check, ChevronRight, MessageCircle, Edit, User, MoreVertical, DollarSign, CheckCircle, XCircle
} from "lucide-react"
// UI Components
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Types
interface Lead {
    id: string
    name: string
    phone?: string
    process_name?: string
    price?: number
    status: string
    reservation_at?: string
    ai_summary?: string
    notes?: string
    is_done: boolean
}

interface GroupedReservations {
    date: Date
    leads: Lead[]
}

// Reuse Categories for Status Colors
const CATEGORIES: Record<string, { color: string, bg: string, border: string }> = {
    'Rezervasyon': { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    'Yeni': { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    'Sabit': { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    'Takip': { color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    'Arşiv': { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
}

const ORDERED_CATEGORIES = ['Rezervasyon', 'Yeni', 'Sabit', 'Takip', 'Arşiv']

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<GroupedReservations[]>([])
    const [loading, setLoading] = useState(true)

    // UI State
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [copiedText, setCopiedText] = useState<string | null>(null)
    const [reservationDate, setReservationDate] = useState<Date | undefined>(new Date())

    useEffect(() => {
        fetchReservations()
    }, [])

    const fetchReservations = async () => {
        try {
            setLoading(true)

            // Auto Archive Logic
            const now = new Date()
            await supabase
                .from('clients')
                .update({ status: 'Arşiv' })
                .eq('status', 'Rezervasyon')
                .lt('reservation_at', now.toISOString())

            // Fetch
            const { data, error } = await supabase
                .from('clients')
                .select('*, process_types(name)')
                .eq('status', 'Rezervasyon') // Only show active reservations here? Or all upcoming? User said "Rezervasyon kategorisine aldıklarımız"
                .order('reservation_at', { ascending: true })

            if (error) throw error

            if (data) {
                const grouped: GroupedReservations[] = []
                const initialExpanded: Record<string, boolean> = {}

                data.forEach((client: any) => {
                    // Map client to lead structure
                    const lead: Lead = {
                        id: client.id,
                        name: client.full_name || client.name || 'Bilinmeyen',
                        phone: client.phone,
                        process_name: client.process_types?.name || client.process_name,
                        price: client.price_agreed || client.price,
                        status: client.status,
                        reservation_at: client.reservation_at,
                        ai_summary: client.notes || client.ai_summary,
                        is_done: client.notes?.includes('[YAPILDI]') || false // Simple logic for demo, can be a column later if needed
                    }

                    if (!lead.reservation_at) return

                    const date = parseISO(lead.reservation_at)
                    const existingGroup = grouped.find(g => isSameDay(g.date, date))
                    const dateKey = date.toISOString()

                    if (existingGroup) {
                        existingGroup.leads.push(lead)
                        initialExpanded[dateKey] = true
                    } else {
                        grouped.push({ date, leads: [lead] })
                        initialExpanded[dateKey] = true
                    }
                })

                setReservations(grouped)
                setExpanded(initialExpanded)
            }
        } catch (error) {
            console.error('Error fetching reservations:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleDate = (dateIso: string) => {
        setExpanded(prev => ({ ...prev, [dateIso]: !prev[dateIso] }))
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

    const toggleDone = async (lead: Lead) => {
        // Toggle done status by appending/removing a tag in notes
        // Ideally checking 'payment_status' or a boolean is better, but using notes as per schema limitation for now
        const isDone = !lead.is_done
        let newNotes = lead.ai_summary || ""

        if (isDone) {
            newNotes = "[YAPILDI] " + newNotes.replace("[YAPILDI] ", "")
        } else {
            newNotes = newNotes.replace("[YAPILDI] ", "")
        }

        const { error } = await supabase.from('clients').update({ notes: newNotes }).eq('id', lead.id)
        if (!error) fetchReservations()
    }

    const updateStatus = async (id: string, newStatus: string) => {
        await supabase.from('clients').update({ status: newStatus }).eq('id', id)
        fetchReservations()
    }

    const handleReservation = async (leadId: string, date: Date | undefined) => {
        if (!date) return
        await supabase.from('clients').update({ reservation_at: date.toISOString() }).eq('id', leadId)
        fetchReservations() // Refresh to move into correct date bucket
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto text-slate-200">
            <div className="mb-8 flex items-end justify-between border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Rezervasyon Takvimi
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Tarihe göre planlanmış randevular (Liste Görünümü).
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {reservations.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800/50 border-dashed">
                        <CalendarIcon size={48} className="mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-400">Yaklaşan Rezervasyon Yok</h3>
                        <p className="text-slate-500 mt-2">Geçmiş rezervasyonlar arşive taşınmış olabilir.</p>
                    </div>
                ) : (
                    reservations.map((group) => {
                        const dateKey = group.date.toISOString()
                        const isOpen = expanded[dateKey]

                        return (
                            <Collapsible
                                key={dateKey}
                                open={isOpen}
                                onOpenChange={() => toggleDate(dateKey)}
                                className={cn(
                                    "rounded-xl border transition-all duration-200",
                                    isOpen ? "bg-slate-900/40 border-slate-800" : "bg-transparent border-transparent hover:bg-slate-900/20"
                                )}
                            >
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center gap-3 p-4 cursor-pointer group select-none">
                                        <ChevronRight className={cn("text-slate-500 transition-transform duration-200", isOpen && "rotate-90")} />

                                        {/* Date Header */}
                                        <div className="flex items-center gap-3 bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20">
                                            <CalendarIcon size={20} className="text-purple-400" />
                                            <span className="font-bold text-lg text-purple-100 capitalize">
                                                {format(group.date, 'd MMMM yyyy', { locale: tr })}
                                            </span>
                                            <span className="text-sm font-medium text-slate-500 ml-1 bg-slate-900/80 px-2 py-0.5 rounded-full">
                                                {format(group.date, 'EEEE', { locale: tr })}
                                            </span>
                                            <div className="h-4 w-px bg-purple-500/30 mx-1" />
                                            <span className="text-xs font-bold text-purple-300">
                                                {group.leads.length} Kayıt
                                            </span>
                                        </div>

                                        <div className="flex-1 h-px bg-slate-800/50 ml-4 group-hover:bg-slate-800" />
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="px-4 pb-4 space-y-1">
                                        {/* Wrapper for Headers + List (Updated Widths for Symmetry) */}

                                        {/* Headers */}
                                        <div className="flex items-center gap-6 px-6 py-2 border-b border-slate-800/50 mb-3 text-sm font-black text-slate-400 uppercase tracking-wide">
                                            <div className="w-[200px] shrink-0">İsim & Telefon</div>
                                            <div className="w-[180px] shrink-0">İşlem & Ücret</div>
                                            <div className="w-[160px] shrink-0">İşlem Durumu</div>
                                            <div className="w-[140px] shrink-0">Kayıt Durumu</div>
                                            <div className="flex-1 pl-4">Notlar (Detay)</div>
                                            <div className="w-[100px] shrink-0 text-right">İşlemler</div>
                                        </div>

                                        {/* List Items */}
                                        {group.leads.map(lead => {
                                            const config = CATEGORIES[lead.status] || CATEGORIES['Arşiv']

                                            return (
                                                <div
                                                    key={lead.id}
                                                    className="flex items-center gap-6 px-6 py-4 rounded-lg hover:bg-slate-800/60 transition-all duration-200 hover:scale-[1.01] hover:shadow-md border border-transparent hover:border-slate-800/50 group bg-slate-900/20"
                                                >
                                                    {/* Name & Phone */}
                                                    <div className="w-[200px] shrink-0 flex flex-col justify-center gap-1">
                                                        <div className="text-[14px] font-bold text-slate-200 truncate leading-tight">
                                                            {lead.name}
                                                        </div>
                                                        <div className="text-[12px] font-semibold text-slate-500/90 truncate font-sans">{lead.phone || '-'}</div>
                                                    </div>

                                                    {/* Process & Price */}
                                                    <div className="w-[180px] shrink-0 flex flex-col justify-center gap-1.5">
                                                        <div className="text-[13px] font-bold text-slate-300 truncate opacity-90">
                                                            {lead.process_name || 'İşlem Yok'}
                                                        </div>
                                                        <div className="text-[12px] font-bold text-slate-500 opacity-80">
                                                            {lead.price ? `${lead.price.toLocaleString('tr-TR')} ₺` : '-'}
                                                        </div>
                                                    </div>

                                                    {/* PROCESS DONE TOGGLE */}
                                                    <div className="w-[160px] shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleDone(lead)}
                                                            className={cn(
                                                                "w-full justify-start gap-2 border-slate-800 bg-slate-950/50 hover:bg-slate-900",
                                                                lead.is_done ? "text-green-500 border-green-500/20 bg-green-500/5" : "text-slate-400"
                                                            )}
                                                        >
                                                            {lead.is_done ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600" />}
                                                            {lead.is_done ? "İşlem Yapıldı" : "Bekliyor"}
                                                        </Button>
                                                    </div>

                                                    {/* Status Selector */}
                                                    <div className="w-[140px] shrink-0">
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

                                                    {/* AI Summary (Detail) */}
                                                    <div className="flex-1 pl-4 min-w-0">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <button className="text-[10px] font-semibold text-slate-500/80 hover:text-slate-300 transition-colors text-left truncate w-full opacity-90 cursor-pointer flex items-center gap-2">
                                                                    {lead.ai_summary ? (
                                                                        <span className="truncate">{lead.ai_summary.replace('[YAPILDI]', '').trim()}</span>
                                                                    ) : (
                                                                        <span className="italic opacity-50">Not yok...</span>
                                                                    )}
                                                                </button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-slate-950 border-slate-800">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-slate-100 flex items-center gap-2">
                                                                        <User size={18} className="text-slate-400" />
                                                                        {lead.name} - Detaylar
                                                                    </DialogTitle>
                                                                </DialogHeader>
                                                                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 space-y-3">
                                                                    <div>
                                                                        <div className="text-xs text-slate-500 font-bold mb-1">NOTLAR / DETAY</div>
                                                                        <div className="text-slate-300 text-sm leading-relaxed max-h-[40vh] overflow-y-auto">
                                                                            {lead.ai_summary || "Not veya detay bulunamadı."}
                                                                        </div>
                                                                    </div>
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
                                                    </div>

                                                    {/* Operations Menu */}
                                                    <div className="w-[100px] shrink-0 flex justify-end">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                                                    <MoreVertical size={16} />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="bg-slate-900 border-slate-800" align="end">
                                                                <DropdownMenuItem onClick={() => handleWhatsApp(lead.phone || null)} className="gap-2 cursor-pointer text-slate-300 focus:bg-slate-800">
                                                                    <MessageCircle size={14} /> WhatsApp'a Git
                                                                </DropdownMenuItem>
                                                                {/* Can add more specific reservation actions here */}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )
                    })
                )}
            </div>
        </div>
    )
}
