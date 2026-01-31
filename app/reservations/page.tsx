"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format, parseISO, isSameDay } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
// Icons
import {
    Calendar as CalendarIcon, Phone, User, ChevronRight, MessageCircle, Edit,
    CalendarDays, Copy, Check, X, Sparkles, Pin, Clock, Archive
} from "lucide-react"
// UI Components
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"

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
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .or('reservation_at.not.is.null,status.eq.Rezervasyon')
                .order('reservation_at', { ascending: true })

            if (error) throw error

            if (data) {
                const grouped: GroupedReservations[] = []
                const initialExpanded: Record<string, boolean> = {}

                data.forEach((lead: Lead) => {
                    const date = parseISO(lead.reservation_at!)
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

    const updateStatus = async (id: string, newStatus: string) => {
        const updatedReservations = reservations.map(group => ({
            ...group,
            leads: group.leads.map(l => l.id === id ? { ...l, status: newStatus } : l)
        }))
        setReservations(updatedReservations)

        await supabase.from('leads').update({ status: newStatus }).eq('id', id)
    }

    const handleReservation = async (leadId: string, date: Date | undefined) => {
        if (!date) return
        await supabase.from('leads').update({ reservation_at: date.toISOString() }).eq('id', leadId)
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
                        <h3 className="text-xl font-semibold text-slate-400">Henüz Rezervasyon Yok</h3>
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
                                        {/* Wrapper for Headers + List */}

                                        {/* Headers */}
                                        <div className="flex items-center gap-4 px-6 py-2 border-b border-slate-800/50 mb-3 text-sm font-black text-slate-400 uppercase tracking-wide">
                                            <div className="w-[180px] shrink-0">İsim & Telefon</div>
                                            <div className="w-[160px] shrink-0">İşlem & Ücret</div>
                                            <div className="w-[150px] shrink-0">Durum</div>
                                            <div className="flex-1 pl-2">Detay (AI)</div>
                                        </div>

                                        {/* List Items */}
                                        {group.leads.map(lead => {
                                            const config = CATEGORIES[lead.status] || { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }

                                            return (
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
                                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all hover:scale-110" title="Randevu Oluştur">
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
                                                                onClick={() => handleWhatsApp(lead.phone || null)}
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
