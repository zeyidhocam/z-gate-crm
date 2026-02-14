"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format, parseISO, isSameDay } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
// Icons
import {
    Calendar as CalendarIcon, Copy, Check, ChevronRight, MessageCircle, Edit, User, CheckCircle, XCircle, CalendarClock
} from "lucide-react"
// UI Components
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ClientEditDialog, Client } from "@/components/ClientEditDialog"
import { ReservationEditDialog } from "@/components/ReservationEditDialog"
import { ReminderButton } from "@/components/ReminderButton"
import { WhatsAppButton } from "@/components/WhatsAppButton"


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
    process_type_id?: number | null
    created_at?: string
}

interface GroupedReservations {
    date: Date
    leads: Lead[]
}

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<GroupedReservations[]>([])
    const [loading, setLoading] = useState(true)

    // UI State - localStorage ile kalıcı
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [copiedText, setCopiedText] = useState<string | null>(null)
    const [editingClient, setEditingClient] = useState<Client | null>(null)
    const [reservationEditClient, setReservationEditClient] = useState<Lead | null>(null)
    const [processTypes, setProcessTypes] = useState<{ id: number, name: string }[]>([])

    // localStorage'dan expanded state yükle
    useEffect(() => {
        const saved = localStorage.getItem('reservationsExpanded')
        if (saved) setExpanded(JSON.parse(saved))
    }, [])

    // expanded state değiştiğinde localStorage'a kaydet
    useEffect(() => {
        if (Object.keys(expanded).length > 0) {
            localStorage.setItem('reservationsExpanded', JSON.stringify(expanded))
        }
    }, [expanded])

    // Initial fetch
    useEffect(() => {
        fetchReservations()
        fetchProcessTypes()
    }, [])

    const fetchProcessTypes = async () => {
        const { data } = await supabase.from('process_types').select('*')
        if (data) setProcessTypes(data)
    }

    const handleSaveEdit = async (updatedClient: Client) => {
        const { error } = await supabase
            .from('clients')
            .update({
                full_name: updatedClient.full_name,
                phone: updatedClient.phone,
                price_agreed: updatedClient.price_agreed,
                process_type_id: updatedClient.process_type_id,
                notes: updatedClient.notes
            })
            .eq('id', updatedClient.id)

        if (!error) {
            setEditingClient(null)
            fetchReservations()
        } else {
            // Hata kaydi gizlendi
        }
    }

    const handleSaveReservationDate = async (newDate: Date) => {
        if (!reservationEditClient) return

        const { error } = await supabase
            .from('clients')
            .update({
                reservation_at: newDate.toISOString(),
            })
            .eq('id', reservationEditClient.id)

        if (!error) {
            setReservationEditClient(null)
            fetchReservations()
        }
    }

    const fetchReservations = async () => {
        try {
            setLoading(true)

            // Auto Archive Logic TEMPORARILY DISABLED
            // const now = new Date()
            // now.setHours(0, 0, 0, 0)

            // await supabase
            //     .from('clients')
            //     .update({ status: 'Arşiv' })
            //     .eq('status', 'Rezervasyon')
            //     .lt('reservation_at', now.toISOString())

            // Fetch
            const { data, error } = await supabase
                .from('clients')
                .select('*, process_types(name), process_type_id')
                .eq('status', 'Rezervasyon') // Only show active reservations here? Or all upcoming? User said "Rezervasyon kategorisine aldıklarımız"
                .order('reservation_at', { ascending: true })

            if (error) throw error

            if (data) {
                const grouped: GroupedReservations[] = []
                const initialExpanded: Record<string, boolean> = {}

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const leadsData = data as any[]
                leadsData.forEach((client) => {
                    // Map client to lead structure
                    const lead: Lead = {
                        id: String(client.id),
                        name: client.full_name || client.name || 'Bilinmeyen',
                        phone: client.phone,
                        process_name: client.process_types?.name || client.process_name,
                        price: client.price_agreed || client.price,
                        status: client.status,
                        reservation_at: client.reservation_at,
                        ai_summary: client.notes || client.ai_summary,
                        process_type_id: client.process_type_id,
                        created_at: client.created_at
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
        } catch {
            // Hata kaydi gizlendi
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





    // Müşteriyi onayla ve Müşteriler sayfasına aktar
    const confirmCustomer = async (lead: Lead) => {
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    is_confirmed: true,
                    confirmed_at: new Date().toISOString(),
                    stage: 1,
                    status: 'Aktif'
                })
                .eq('id', lead.id)

            if (error) throw error
            fetchReservations()
        } catch {
            // Hata kaydi gizlendi
        }
    }

    // Müşteriyi reddet ve arşive taşı
    const rejectCustomer = async (id: string) => {
        try {
            const { error } = await supabase
                .from('clients')
                .update({ status: 'Arşiv' })
                .eq('id', id)

            if (error) throw error
            fetchReservations()
        } catch {
            // Hata kaydi gizlendi
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto text-slate-200">
            <div className="mb-8 flex items-end justify-between border-b border-cyan-500/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gradient-ocean">
                        Rezervasyon Takvimi <span className="text-xs text-slate-500 font-normal ml-2 opacity-50">v1.2</span>
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Tarihe göre planlanmış randevular (Liste Görünümü).
                    </p>
                </div>
            </div>

            <div className="space-y-4 md:space-y-6">
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
                                    <div className="flex items-center gap-3 p-3 md:p-4 cursor-pointer group select-none">
                                        <ChevronRight className={cn("text-slate-500 transition-transform duration-200", isOpen && "rotate-90")} />

                                        {/* Date Header */}
                                        <div className="flex items-center gap-2 md:gap-3 bg-purple-500/10 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-purple-500/20">
                                            <CalendarIcon size={16} className="text-purple-400 md:w-5 md:h-5" />
                                            <span className="font-bold text-sm md:text-lg text-purple-100 capitalize">
                                                {format(group.date, 'd MMMM yyyy', { locale: tr })}
                                            </span>
                                            <span className="text-[10px] md:text-sm font-medium text-slate-500 ml-1 bg-slate-900/80 px-1.5 md:px-2 py-0.5 rounded-full">
                                                {format(group.date, 'EEEE', { locale: tr })}
                                            </span>
                                            <div className="h-4 w-px bg-purple-500/30 mx-1" />
                                            <span className="text-[10px] md:text-xs font-bold text-purple-300">
                                                {group.leads.length} Kayıt
                                            </span>
                                        </div>

                                        <div className="flex-1 h-px bg-slate-800/50 ml-4 group-hover:bg-slate-800 hidden md:block" />
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="px-2 md:px-4 pb-4 space-y-1">
                                        {/* Wrapper for Headers + List (Updated Widths for Symmetry) */}

                                        {/* Headers - Desktop Only */}
                                        <div className="hidden md:flex items-center gap-6 px-6 py-2 border-b border-slate-800/50 mb-3 text-sm font-black text-slate-400 uppercase tracking-wide">
                                            <div className="w-[200px] shrink-0">İsim & Telefon</div>
                                            <div className="w-[180px] shrink-0">İşlem & Ücret</div>
                                            <div className="w-[180px] shrink-0">Onay</div>
                                            <div className="flex-1 pl-4">Notlar (Detay)</div>
                                            <div className="w-[100px] shrink-0 text-right">İşlemler</div>
                                        </div>

                                        {/* List Items */}
                                        {group.leads.map(lead => {

                                            return (
                                                <div
                                                    key={lead.id}
                                                    className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 md:px-6 md:py-4 rounded-lg hover:bg-slate-800/60 transition-all duration-200 hover:scale-[1.01] hover:shadow-md border border-slate-800/30 md:border-transparent hover:border-slate-800/50 group bg-slate-900/40 md:bg-slate-900/20"
                                                >
                                                    {/* Name & Phone */}
                                                    <div className="w-full md:w-[200px] shrink-0 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start gap-1">
                                                        <div>
                                                            <div className="text-[15px] md:text-[14px] font-bold text-slate-200 truncate leading-tight">
                                                                {lead.name}
                                                            </div>
                                                            <div className="text-[13px] md:text-[12px] font-semibold text-slate-500/90 truncate font-sans">{lead.phone || '-'}</div>
                                                        </div>
                                                        {/* Mobile Date Badge */}
                                                        <div className="md:hidden text-[10px] text-slate-600 font-medium bg-slate-950 px-2 py-1 rounded">
                                                            {lead.created_at ? format(parseISO(lead.created_at), 'd MMM', { locale: tr }) : ''}
                                                        </div>
                                                    </div>

                                                    {/* Mobile Divider */}
                                                    <div className="w-full h-px bg-slate-800/50 md:hidden" />

                                                    {/* Process & Price */}
                                                    <div className="w-full md:w-[180px] shrink-0 flex flex-row md:flex-col justify-between md:justify-center gap-1.5">
                                                        <div className="text-[14px] md:text-[13px] font-bold text-slate-300 truncate opacity-90">
                                                            {lead.process_name || 'İşlem Yok'}
                                                        </div>
                                                        <div className="text-[14px] md:text-[12px] font-bold text-slate-500 opacity-80">
                                                            {lead.price ? `${lead.price.toLocaleString('tr-TR')} ₺` : '-'}
                                                        </div>
                                                    </div>

                                                    {/* Onay Butonları */}
                                                    <div className="w-full md:w-[180px] shrink-0 flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => confirmCustomer(lead)}
                                                            className="flex-1 gap-1.5 text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300 h-9"
                                                        >
                                                            <CheckCircle size={14} />
                                                            Onayla
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => rejectCustomer(lead.id)}
                                                            className="flex-1 gap-1.5 text-xs font-bold border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 h-9"
                                                        >
                                                            <XCircle size={14} />
                                                            Reddet
                                                        </Button>
                                                    </div>

                                                    {/* AI Summary (Detail) */}
                                                    <div className="w-full md:flex-1 md:pl-4 min-w-0">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <button className="text-[12px] md:text-[10px] font-semibold text-slate-500/80 hover:text-slate-300 transition-colors text-left truncate w-full opacity-90 cursor-pointer flex items-center gap-2 bg-slate-950/30 md:bg-transparent p-2 md:p-0 rounded border border-slate-800/30 md:border-none">
                                                                    {lead.ai_summary ? (
                                                                        <span className="truncate">{lead.ai_summary.replace('[YAPILDI]', '').trim()}</span>
                                                                    ) : (
                                                                        <span className="italic opacity-50">Not yok...</span>
                                                                    )}
                                                                </button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-slate-950 border-slate-800 w-[95vw] max-w-lg">
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
                                                                <DialogFooter className="flex-col sm:justify-between gap-2 mt-4">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleCopy(lead.ai_summary || "")}
                                                                        className="gap-2 border-slate-700 hover:bg-slate-800 hover:text-white w-full sm:w-auto"
                                                                    >
                                                                        {copiedText === lead.ai_summary ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                                        {copiedText === lead.ai_summary ? "Kopyalandı" : "Kopyala"}
                                                                    </Button>
                                                                    <DialogClose asChild>
                                                                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white w-full sm:w-auto">Kapat</Button>
                                                                    </DialogClose>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="w-full md:w-[180px] shrink-0 flex justify-end gap-2 border-t border-slate-800/30 pt-3 md:border-none md:pt-0">
                                                        <ReminderButton
                                                            clientId={lead.id}
                                                            clientName={lead.name}
                                                            iconSize={20}
                                                            className="flex-1 md:flex-none h-10 md:w-10 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 rounded-xl transition-all"
                                                        />

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setReservationEditClient(lead)}
                                                            className="flex-1 md:flex-none h-10 md:w-10 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-400 rounded-xl transition-all"
                                                            title="Tarih Değiştir"
                                                        >
                                                            <CalendarClock size={20} />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingClient({
                                                                id: lead.id,
                                                                full_name: lead.name,
                                                                name: lead.name,
                                                                phone: lead.phone || null,
                                                                notes: lead.notes || lead.ai_summary || null,
                                                                price_agreed: lead.price || null,
                                                                process_type_id: lead.process_type_id || null
                                                            })}
                                                            className="flex-1 md:flex-none h-10 md:w-10 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 hover:text-orange-400 rounded-xl transition-all"
                                                            title="Düzenle"
                                                        >
                                                            <Edit size={20} />
                                                        </Button>

                                                        <WhatsAppButton
                                                            phone={lead.phone}
                                                            clientName={lead.name}
                                                            size="default"
                                                            className="flex-1 md:flex-none h-10 md:w-10 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 hover:text-[#25D366] rounded-xl"
                                                            processName={lead.process_name}
                                                            reservationDate={lead.reservation_at}
                                                        />
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

            <ClientEditDialog
                open={!!editingClient}
                onOpenChange={(open) => !open && setEditingClient(null)}
                client={editingClient}
                onSave={handleSaveEdit}
                processTypes={processTypes}
            />

            <ReservationEditDialog
                open={!!reservationEditClient}
                onOpenChange={(open) => !open && setReservationEditClient(null)}
                client={reservationEditClient}
                onSave={handleSaveReservationDate}
            />
        // Force deployment trigger: Rezervasyon Tarihi Değiştirme Butonu Eklendi
        </div>
    )
}
