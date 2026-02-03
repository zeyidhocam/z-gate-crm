"use client"

import { useState, useEffect } from "react"
import { Users, Search, Phone, Calendar, CheckCircle2, Circle, Clock, Star, ChevronRight, Filter, MoreVertical, Trash2, Archive, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WhatsAppButton } from "@/components/WhatsAppButton"
import { ReminderButton } from "@/components/ReminderButton"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Customer {
    id: string
    full_name: string | null
    name: string | null
    phone: string | null
    price_agreed: number | null
    price: number | null
    process_name: string | null
    process_types?: { name: string } | null
    stage: number
    confirmed_at: string | null
    created_at: string
    notes: string | null
}

const STAGES = [
    { value: 1, label: "1. Aşama", color: "bg-amber-500", textColor: "text-amber-400", description: "Başlangıç" },
    { value: 2, label: "2. Aşama", color: "bg-sky-500", textColor: "text-sky-400", description: "İşlem Başladı" },
    { value: 3, label: "3. Aşama", color: "bg-violet-500", textColor: "text-violet-400", description: "Devam Ediyor" },
    { value: 4, label: "4. Aşama", color: "bg-emerald-500", textColor: "text-emerald-400", description: "Tamamlandı" },
]

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [stageFilter, setStageFilter] = useState<number | null>(null)

    // localStorage'dan state yükle
    useEffect(() => {
        const savedFilter = localStorage.getItem('customersStageFilter')
        if (savedFilter && savedFilter !== 'null') {
            setStageFilter(parseInt(savedFilter))
        }
    }, [])

    // stageFilter değiştiğinde localStorage'a kaydet
    useEffect(() => {
        localStorage.setItem('customersStageFilter', String(stageFilter))
    }, [stageFilter])

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('clients')
                .select('id, full_name, name, phone, price_agreed, price, process_name, process_types(name), stage, confirmed_at, created_at, notes')
                .eq('is_confirmed', true)
                .order('confirmed_at', { ascending: false })

            if (error) throw error
            setCustomers(data as any[] || [])
        } catch (error) {
            console.error('Error fetching customers:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateStage = async (customerId: string, newStage: number) => {
        try {
            const { error } = await supabase
                .from('clients')
                .update({ stage: newStage })
                .eq('id', customerId)

            if (error) throw error

            setCustomers(prev =>
                prev.map(c => c.id === customerId ? { ...c, stage: newStage } : c)
            )
        } catch (error) {
            console.error('Error updating stage:', error)
        }
    }

    const removeCustomer = async (customerId: string) => {
        if (!confirm('Bu müşteriyi listeden kaldırmak istediğinize emin misiniz?')) return

        try {
            const { error } = await supabase
                .from('clients')
                .update({ is_confirmed: false, stage: 1 })
                .eq('id', customerId)

            if (error) throw error

            setCustomers(prev => prev.filter(c => c.id !== customerId))
            toast.success("Müşteri listeden kaldırıldı")
        } catch (error) {
            console.error('Error removing customer:', error)
        }
    }

    const handleArchive = async (customerId: string) => {
        if (!confirm('Bu müşteriyi arşive taşımak istediğinize emin misiniz?')) return

        try {
            const { error } = await supabase
                .from('clients')
                .update({ status: 'Arşiv', is_confirmed: false })
                .eq('id', customerId)

            if (error) throw error

            setCustomers(prev => prev.filter(c => c.id !== customerId))
            toast.success("Müşteri arşive taşındı")
        } catch (error) {
            console.error('Error archiving customer:', error)
            toast.error("Arşivleme sırasında hata oluştu")
        }
    }

    // Filtreleme
    const filteredCustomers = customers.filter(customer => {
        const matchesSearch = search === "" ||
            (customer.full_name?.toLowerCase().includes(search.toLowerCase())) ||
            (customer.name?.toLowerCase().includes(search.toLowerCase())) ||
            (customer.phone?.includes(search))

        const matchesStage = stageFilter === null || customer.stage === stageFilter

        return matchesSearch && matchesStage
    })

    // Aşama bazlı gruplar
    const groupedByStage = STAGES.map(stage => ({
        ...stage,
        customers: filteredCustomers.filter(c => c.stage === stage.value)
    }))

    // Toplam gelir
    const totalRevenue = customers.reduce((sum, c) => sum + (c.price_agreed || c.price || 0), 0)

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Users className="text-emerald-400" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gradient-ocean">Müşteriler</h1>
                        <p className="text-slate-400">Onaylanmış müşteriler ve aşama takibi</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-2xl font-black text-emerald-400">{customers.length}</div>
                        <div className="text-xs text-slate-500 font-bold">Müşteri</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-cyan-400">{totalRevenue.toLocaleString('tr-TR')} ₺</div>
                        <div className="text-xs text-slate-500 font-bold">Toplam Gelir</div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                        placeholder="Müşteri ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-[#0c1929] border-cyan-500/20 text-slate-200"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-500" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStageFilter(null)}
                        className={cn(
                            "text-xs font-bold",
                            stageFilter === null ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400"
                        )}
                    >
                        Tümü
                    </Button>
                    {STAGES.map(stage => (
                        <Button
                            key={stage.value}
                            variant="ghost"
                            size="sm"
                            onClick={() => setStageFilter(stage.value)}
                            className={cn(
                                "text-xs font-bold",
                                stageFilter === stage.value ? `${stage.color}/20 ${stage.textColor}` : "text-slate-400"
                            )}
                        >
                            {stage.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Customer List */}
            {filteredCustomers.length === 0 ? (
                <div className="rounded-2xl bg-[#0c1929]/80 border border-cyan-500/10 p-12 text-center">
                    <Users size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Henüz onaylanmış müşteri yok</p>
                    <p className="text-slate-600 text-sm mt-1">Rezervasyonlar sayfasından müşteri onaylayabilirsiniz</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredCustomers.map(customer => {
                        const currentStage = STAGES.find(s => s.value === customer.stage) || STAGES[0]
                        const processName = customer.process_types?.name || customer.process_name || 'Belirtilmemiş'
                        const price = customer.price_agreed || customer.price || 0

                        return (
                            <div
                                key={customer.id}
                                className="group p-5 rounded-2xl bg-gradient-to-r from-[#0c1929]/90 to-[#0a1628]/80 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                            >
                                <div className="flex items-center gap-6">
                                    {/* Stage Indicator */}
                                    <div className={cn(
                                        "w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0",
                                        currentStage.color + "/10",
                                        "border",
                                        currentStage.color.replace("bg-", "border-") + "/30"
                                    )}>
                                        <span className={cn("text-xl font-black", currentStage.textColor)}>
                                            {customer.stage}
                                        </span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Aşama</span>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold text-lg text-slate-200">
                                                {customer.full_name || customer.name || 'İsimsiz'}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                currentStage.color + "/20",
                                                currentStage.textColor
                                            )}>
                                                {currentStage.description}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <Phone size={14} />
                                                {customer.phone || '-'}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                {customer.confirmed_at
                                                    ? format(parseISO(customer.confirmed_at), 'dd MMM yyyy', { locale: tr })
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Process & Price */}
                                    <div className="text-right shrink-0 group/price">
                                        <div className="text-sm font-bold text-slate-300 mb-1">{processName}</div>
                                        <div className="flex items-center justify-end gap-2 text-lg font-black text-emerald-400">
                                            <span>{price.toLocaleString('tr-TR')} ₺</span>
                                            <button
                                                className="opacity-0 group-hover/price:opacity-100 p-1 hover:bg-slate-700/50 rounded transition-all text-cyan-400"
                                                title="Hızlı Düzenle"
                                            >
                                                <Edit size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stage Buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {STAGES.map(stage => (
                                            <button
                                                key={stage.value}
                                                onClick={() => updateStage(customer.id, stage.value)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                    customer.stage >= stage.value
                                                        ? stage.color + " text-white shadow-lg"
                                                        : "bg-slate-800/50 text-slate-600 hover:bg-slate-700"
                                                )}
                                                title={stage.label}
                                            >
                                                {customer.stage >= stage.value ? (
                                                    <CheckCircle2 size={16} />
                                                ) : (
                                                    <Circle size={16} />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <ReminderButton
                                            clientId={customer.id}
                                            clientName={customer.full_name || customer.name || 'Müşteri'}
                                            iconSize={18}
                                        />
                                        <WhatsAppButton
                                            phone={customer.phone}
                                            clientName={customer.full_name || customer.name || 'Değerli Müşteri'}
                                            size="sm"
                                        />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-300">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#0c1929] border-cyan-500/20">
                                                <DropdownMenuItem
                                                    onClick={() => handleArchive(customer.id)}
                                                    className="text-slate-300 focus:text-slate-200"
                                                >
                                                    <Archive size={14} className="mr-2" />
                                                    Arşive Taşı
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => removeCustomer(customer.id)}
                                                    className="text-red-400 focus:text-red-400"
                                                >
                                                    <Trash2 size={14} className="mr-2" />
                                                    Listeden Kaldır
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
