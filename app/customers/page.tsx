"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Users, Search, Phone, Calendar, CheckCircle2, Circle, Filter, MoreVertical, Trash2, Archive, Edit, CreditCard, AlertCircle, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, parseISO, isPast, isToday as isDateToday, differenceInDays } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WhatsAppButton } from "@/components/WhatsAppButton"
import { ReminderButton } from "@/components/ReminderButton"
import { PaymentScheduleDialog } from "@/components/PaymentScheduleDialog"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { PaymentTracker } from "@/components/PaymentTracker"

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
    financial_note: string | null
    payment_balance: number | null
    payment_due_date: string | null
    reservation_at: string | null
}

interface PaymentInfo {
    overdueCount: number
    todayCount: number
    upcomingCount: number
    nextAmount: number
    nextDate: string | null
    isOverdue: boolean
    isToday: boolean
    totalRemaining: number
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
    const [stageFilter, setStageFilter] = useState<number | null>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('customersStageFilter')
            return (saved && saved !== 'null') ? parseInt(saved) : null
        }
        return null
    })
    const [paymentFilter, setPaymentFilter] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [editPrice, setEditPrice] = useState("")
    const [archiveCustomerId, setArchiveCustomerId] = useState<string | null>(null)
    const [initialStats, setInitialStats] = useState<{ count: number, revenue: number } | null>(null)

    // Ödeme bilgileri map
    const [paymentMap, setPaymentMap] = useState<Record<string, PaymentInfo>>({})

    // stageFilter değiştiğinde localStorage'a kaydet
    useEffect(() => {
        localStorage.setItem('customersStageFilter', String(stageFilter))
    }, [stageFilter])

    const fetchPaymentSchedules = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('payment_schedules')
                .select('client_id, amount, due_date, is_paid')
                .eq('is_paid', false)
                .order('due_date', { ascending: true })

            if (error) return

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map: Record<string, PaymentInfo> = {}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ; (data || []).forEach((p: any) => {
                    const clientId = p.client_id as string
                    if (!map[clientId]) {
                        map[clientId] = {
                            overdueCount: 0,
                            todayCount: 0,
                            upcomingCount: 0,
                            nextAmount: 0,
                            nextDate: null,
                            isOverdue: false,
                            isToday: false,
                            totalRemaining: 0
                        }
                    }

                    const dueDate = parseISO(p.due_date)
                    const overdue = isPast(dueDate) && !isDateToday(dueDate)
                    const today = isDateToday(dueDate)

                    map[clientId].totalRemaining += p.amount
                    if (overdue) {
                        map[clientId].overdueCount++
                        map[clientId].isOverdue = true
                    } else if (today) {
                        map[clientId].todayCount++
                        map[clientId].isToday = true
                    } else {
                        map[clientId].upcomingCount++
                    }

                    // İlk (en yakın) ödeme
                    if (!map[clientId].nextDate) {
                        map[clientId].nextAmount = p.amount
                        map[clientId].nextDate = p.due_date
                    }
                })

            setPaymentMap(map)
        } catch {
            // Table might not exist
        }
    }, [])

    useEffect(() => {
        fetchCustomers()
        fetchPaymentSchedules()
        // eslint-disable-next-line
    }, [])

    const fetchCustomers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('clients')
                .select('id, full_name, name, phone, price_agreed, price, process_name, process_types(name), stage, confirmed_at, created_at, notes, financial_note, payment_balance, payment_due_date, reservation_at')
                .eq('is_confirmed', true)
                .order('confirmed_at', { ascending: false })

            if (error) throw error
            const fetchedData = (data as unknown as Customer[]) || []
            setCustomers(fetchedData)
            if (!initialStats) {
                setInitialStats({
                    count: fetchedData.length,
                    revenue: fetchedData.reduce((sum, c) => sum + (c.price_agreed || c.price || 0), 0)
                })
            }
        } catch {
            // Hata kaydi gizlendi
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
        } catch {
            // Hata kaydi gizlendi
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
        } catch {
            // Hata kaydi gizlendi
        }
    }

    const handleArchive = async () => {
        if (!archiveCustomerId) return

        try {
            const { error } = await supabase
                .from('clients')
                .update({ status: 'Arşiv', is_confirmed: false })
                .eq('id', archiveCustomerId)

            if (error) throw error

            setCustomers(prev => prev.filter(c => c.id !== archiveCustomerId))
            setArchiveCustomerId(null)
            toast.success("Müşteri arşive taşındı")
        } catch {
            toast.error("Arşivleme sırasında hata oluştu")
        }
    }

    const handleSavePrice = async () => {
        if (!editingCustomer) return

        try {
            const newPrice = parseInt(editPrice) || 0
            const { error } = await supabase
                .from('clients')
                .update({ price_agreed: newPrice })
                .eq('id', editingCustomer.id)

            if (error) throw error

            setCustomers(prev => prev.map(c =>
                c.id === editingCustomer.id
                    ? { ...c, price_agreed: newPrice }
                    : c
            ))
            setEditingCustomer(null)
            toast.success("Fiyat güncellendi")
        } catch {
            toast.error("Fiyat güncellenemedi")
        }
    }

    // Filtreleme ve sıralama
    const filteredCustomers = useMemo(() => {
        let result = customers.filter(customer => {
            const matchesSearch = search === "" ||
                (customer.full_name?.toLowerCase().includes(search.toLowerCase())) ||
                (customer.name?.toLowerCase().includes(search.toLowerCase())) ||
                (customer.phone?.includes(search))

            const matchesStage = stageFilter === null || customer.stage === stageFilter
            const matchesPayment = !paymentFilter || !!paymentMap[customer.id]

            return matchesSearch && matchesStage && matchesPayment
        })

        // Ödeme öncelikli sıralama
        result.sort((a, b) => {
            const pa = paymentMap[a.id]
            const pb = paymentMap[b.id]

            // Önce gecikmiş
            const aOverdue = pa?.isOverdue ? 1 : 0
            const bOverdue = pb?.isOverdue ? 1 : 0
            if (aOverdue !== bOverdue) return bOverdue - aOverdue

            // Sonra bugün
            const aToday = pa?.isToday ? 1 : 0
            const bToday = pb?.isToday ? 1 : 0
            if (aToday !== bToday) return bToday - aToday

            // Sonra bekleyen ödeme olanlar
            const aHasPayment = pa ? 1 : 0
            const bHasPayment = pb ? 1 : 0
            if (aHasPayment !== bHasPayment) return bHasPayment - aHasPayment

            return 0
        })

        return result
    }, [customers, search, stageFilter, paymentFilter, paymentMap])

    // Ödeme istatistikleri
    const paymentStats = useMemo(() => {
        let overdueTotal = 0
        let todayTotal = 0
        let pendingTotal = 0

        Object.values(paymentMap).forEach(info => {
            if (info.isOverdue) overdueTotal++
            if (info.isToday) todayTotal++
            pendingTotal++
        })

        return { overdueTotal, todayTotal, pendingTotal }
    }, [paymentMap])

    // Toplam gelir ve kayıt sayısı
    const totalRevenue = initialStats?.revenue || 0
    const totalCount = initialStats?.count || 0

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-3 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Users className="text-emerald-400" size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gradient-ocean">Müşteriler</h1>
                        <p className="text-[10px] sm:text-sm text-slate-400">Onaylanmış müşteriler ve aşama takibi</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="text-right">
                        <div className="text-base sm:text-2xl font-black text-emerald-400">{totalCount}</div>
                        <div className="text-[9px] sm:text-xs text-slate-500 font-bold">Müşteri</div>
                    </div>
                    <div className="text-right">
                        <div className="text-base sm:text-2xl font-black text-cyan-400">{totalRevenue.toLocaleString('tr-TR')} ₺</div>
                        <div className="text-[9px] sm:text-xs text-slate-500 font-bold">Toplam Gelir</div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <div className="relative flex-1 sm:max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                        placeholder="Müşteri ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-[#0c1929] border-cyan-500/20 text-slate-200 h-9 text-sm"
                    />
                </div>
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <Filter size={13} className="text-slate-500 shrink-0" />

                    {/* Bekleyen Ödemeler filtresi */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setPaymentFilter(!paymentFilter)
                            if (!paymentFilter) setStageFilter(null)
                        }}
                        className={cn(
                            "text-[10px] sm:text-xs font-bold shrink-0 px-2 sm:px-3 gap-1 relative",
                            paymentFilter
                                ? "bg-red-500/20 text-red-300"
                                : "text-slate-400"
                        )}
                    >
                        <CreditCard size={12} />
                        Ödemeler
                        {paymentStats.overdueTotal > 0 && (
                            <span className="bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full ml-0.5">
                                {paymentStats.overdueTotal}
                            </span>
                        )}
                    </Button>

                    <span className="text-slate-700 mx-0.5">|</span>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setStageFilter(null); setPaymentFilter(false) }}
                        className={cn(
                            "text-[10px] sm:text-xs font-bold shrink-0 px-2 sm:px-3",
                            stageFilter === null && !paymentFilter ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400"
                        )}
                    >
                        Tümü
                    </Button>
                    {STAGES.map(stage => (
                        <Button
                            key={stage.value}
                            variant="ghost"
                            size="sm"
                            onClick={() => { setStageFilter(stage.value); setPaymentFilter(false) }}
                            className={cn(
                                "text-[10px] sm:text-xs font-bold shrink-0 px-2 sm:px-3",
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
                <div className="rounded-2xl bg-[#0c1929]/80 border border-cyan-500/10 p-8 sm:p-12 text-center">
                    <Users size={40} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-sm sm:text-base">
                        {paymentFilter ? "Bekleyen ödemesi olan müşteri yok" : "Henüz onaylanmış müşteri yok"}
                    </p>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">
                        {paymentFilter ? "Tüm ödemeler zamanında yapıldı" : "Rezervasyonlar sayfasından müşteri onaylayabilirsiniz"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {filteredCustomers.map(customer => {
                        const currentStage = STAGES.find(s => s.value === customer.stage) || STAGES[0]
                        const processName = customer.process_types?.name || customer.process_name || 'Belirtilmemiş'
                        const price = customer.price_agreed || customer.price || 0
                        const pInfo = paymentMap[customer.id]
                        const hasOverduePayment = pInfo?.isOverdue
                        const hasTodayPayment = pInfo?.isToday
                        const hasAnyPayment = !!pInfo

                        return (
                            <div
                                key={customer.id}
                                className={cn(
                                    "group p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0c1929]/90 to-[#0a1628]/80 border transition-all",
                                    hasOverduePayment
                                        ? "border-red-500/30 border-l-[3px] border-l-red-500"
                                        : hasTodayPayment
                                            ? "border-amber-500/20 border-l-[3px] border-l-amber-500"
                                            : "border-cyan-500/10 hover:border-cyan-500/30"
                                )}
                            >
                                {/* === MOBİL LAYOUT (lg altı) === */}
                                <div className="lg:hidden space-y-2.5">
                                    {/* Üst satır: Aşama + İsim + Fiyat */}
                                    <div className="flex items-start gap-2.5">
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                            currentStage.color + "/10", "border", currentStage.color.replace("bg-", "border-") + "/30"
                                        )}>
                                            <span className={cn("text-sm font-black", currentStage.textColor)}>{customer.stage}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm text-slate-200 truncate">{customer.full_name || customer.name || 'İsimsiz'}</span>
                                                {/* Ödeme bildirim ikonu */}
                                                {hasOverduePayment && (
                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                )}
                                                {!hasOverduePayment && hasTodayPayment && (
                                                    <Clock size={12} className="text-amber-400 shrink-0" />
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500">{customer.phone || '-'}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-sm font-black text-emerald-400">{price.toLocaleString('tr-TR')} ₺</div>
                                            <div className="text-[10px] text-slate-500 truncate max-w-[90px]">{processName}</div>
                                        </div>
                                    </div>

                                    {/* Ödeme bilgisi satırı (mobil) */}
                                    {hasAnyPayment && pInfo.nextDate && (
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border",
                                            hasOverduePayment
                                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                : hasTodayPayment
                                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                        )}>
                                            {hasOverduePayment ? <AlertCircle size={12} /> : hasTodayPayment ? <Clock size={12} /> : <CreditCard size={12} />}
                                            <span>Kalan: {pInfo.totalRemaining.toLocaleString('tr-TR')} ₺</span>
                                            <span className="opacity-60">•</span>
                                            <span className="opacity-80">
                                                {hasOverduePayment
                                                    ? `${Math.abs(differenceInDays(parseISO(pInfo.nextDate), new Date()))} gün gecikti`
                                                    : hasTodayPayment
                                                        ? 'Bugün'
                                                        : format(parseISO(pInfo.nextDate), 'd MMM', { locale: tr })
                                                }
                                            </span>
                                            {(pInfo.overdueCount + pInfo.todayCount + pInfo.upcomingCount) > 1 && (
                                                <span className="opacity-50 ml-auto">+{(pInfo.overdueCount + pInfo.todayCount + pInfo.upcomingCount) - 1} taksit</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Aşama + Aksiyon butonları */}
                                    <div className="flex items-center gap-1">
                                        {STAGES.map(stage => (
                                            <button key={stage.value} onClick={() => updateStage(customer.id, stage.value)} className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-all", customer.stage >= stage.value ? stage.color + " text-white shadow-lg" : "bg-slate-800/50 text-slate-600")} title={stage.label}>
                                                {customer.stage >= stage.value ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                            </button>
                                        ))}
                                        <div className="flex-1" />
                                        <PaymentScheduleDialog
                                            clientId={customer.id}
                                            clientName={customer.full_name || customer.name || 'Müşteri'}
                                            totalPrice={price || null}
                                            onUpdate={fetchPaymentSchedules}
                                        />
                                        <PaymentTracker clientId={customer.id} initialNote={customer.financial_note || null} initialBalance={customer.payment_balance || null} initialDueDate={customer.payment_due_date || null} onSave={(newNote, newBalance, newDate) => { setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, financial_note: newNote, payment_balance: newBalance, payment_due_date: newDate } : c)) }} />
                                        <ReminderButton clientId={customer.id} clientName={customer.full_name || customer.name || 'Müşteri'} iconSize={14} className="h-8 w-8 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-all" clientDetails={{ phone: customer.phone, process: processName, balance: customer.payment_balance, price: price }} />
                                        <WhatsAppButton phone={customer.phone} clientName={customer.full_name || customer.name || undefined} size="default" className="h-8 w-8 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg" processName={processName} reservationDate={customer.reservation_at} />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg"><MoreVertical size={14} /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#0c1929] border-cyan-500/20">
                                                <DropdownMenuItem onClick={() => setArchiveCustomerId(customer.id)} className="text-slate-300 focus:text-slate-200"><Archive size={14} className="mr-2" />Arşive Taşı</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => removeCustomer(customer.id)} className="text-red-400 focus:text-red-400"><Trash2 size={14} className="mr-2" />Listeden Kaldır</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* === MASAÜSTÜ LAYOUT (lg ve üstü) === */}
                                <div className="hidden lg:flex items-center gap-6">
                                    <div className={cn("w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0", currentStage.color + "/10", "border", currentStage.color.replace("bg-", "border-") + "/30")}>
                                        <span className={cn("text-xl font-black", currentStage.textColor)}>{customer.stage}</span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Aşama</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold text-lg text-slate-200">{customer.full_name || customer.name || 'İsimsiz'}</span>
                                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", currentStage.color + "/20", currentStage.textColor)}>{currentStage.description}</span>
                                            {/* Ödeme bildirim ikonları */}
                                            {hasOverduePayment && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                    Gecikmiş Ödeme
                                                </span>
                                            )}
                                            {!hasOverduePayment && hasTodayPayment && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                    <Clock size={10} />
                                                    Bugün Ödeme
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1.5"><Phone size={14} />{customer.phone || '-'}</span>
                                            <span className="flex items-center gap-1.5"><Calendar size={14} />{customer.confirmed_at ? format(parseISO(customer.confirmed_at), 'dd MMM yyyy', { locale: tr }) : '-'}</span>
                                        </div>
                                    </div>

                                    {/* Fiyat + Ödeme Bilgisi */}
                                    <div className="text-right shrink-0 group/price">
                                        <div className="text-sm font-bold text-slate-300 mb-1">{processName}</div>
                                        <div className="flex items-center justify-end gap-2 text-lg font-black text-emerald-400">
                                            <span>{price.toLocaleString('tr-TR')} ₺</span>
                                            <div className="flex items-center gap-1">
                                                <PaymentTracker clientId={customer.id} initialNote={customer.financial_note || null} initialBalance={customer.payment_balance || null} initialDueDate={customer.payment_due_date || null} onSave={(newNote, newBalance, newDate) => { setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, financial_note: newNote, payment_balance: newBalance, payment_due_date: newDate } : c)) }} />
                                                <button onClick={() => { setEditingCustomer(customer); setEditPrice(String(customer.price_agreed || customer.price || '')) }} className="opacity-0 group-hover/price:opacity-100 p-1 hover:bg-slate-700/50 rounded transition-all text-cyan-400 cursor-pointer" title="Hızlı Düzenle"><Edit size={14} /></button>
                                            </div>
                                        </div>
                                        {/* Ödeme özet badge */}
                                        {hasAnyPayment && pInfo.nextDate && (
                                            <div className={cn(
                                                "mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-bold",
                                                hasOverduePayment ? "text-red-400" : hasTodayPayment ? "text-amber-400" : "text-cyan-400"
                                            )}>
                                                {hasOverduePayment ? <AlertCircle size={10} /> : hasTodayPayment ? <Clock size={10} /> : <CreditCard size={10} />}
                                                <span>Kalan: {pInfo.totalRemaining.toLocaleString('tr-TR')} ₺</span>
                                                <span className="opacity-50">•</span>
                                                <span className="opacity-70">
                                                    {hasOverduePayment
                                                        ? `${Math.abs(differenceInDays(parseISO(pInfo.nextDate), new Date()))}g gecikti`
                                                        : hasTodayPayment
                                                            ? 'Bugün'
                                                            : format(parseISO(pInfo.nextDate), 'd MMM', { locale: tr })
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Aşama butonları */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {STAGES.map(stage => (<button key={stage.value} onClick={() => updateStage(customer.id, stage.value)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", customer.stage >= stage.value ? stage.color + " text-white shadow-lg" : "bg-slate-800/50 text-slate-600 hover:bg-slate-700")} title={stage.label}>{customer.stage >= stage.value ? <CheckCircle2 size={16} /> : <Circle size={16} />}</button>))}
                                    </div>

                                    {/* Aksiyon butonları */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <PaymentScheduleDialog
                                            clientId={customer.id}
                                            clientName={customer.full_name || customer.name || 'Müşteri'}
                                            totalPrice={price || null}
                                            onUpdate={fetchPaymentSchedules}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-10 w-10 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl transition-all" title="Ödeme Planı">
                                                    <CreditCard size={20} />
                                                </Button>
                                            }
                                        />
                                        <ReminderButton clientId={customer.id} clientName={customer.full_name || customer.name || 'Müşteri'} iconSize={20} className="h-10 w-10 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 rounded-xl transition-all" clientDetails={{ phone: customer.phone, process: processName, balance: customer.payment_balance, price: price }} />
                                        <WhatsAppButton phone={customer.phone} clientName={customer.full_name || customer.name || undefined} size="default" className="h-10 w-10 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 hover:text-[#25D366] rounded-xl" processName={processName} reservationDate={customer.reservation_at} />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-10 w-10 p-0 bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl"><MoreVertical size={20} /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#0c1929] border-cyan-500/20">
                                                <DropdownMenuItem onClick={() => setArchiveCustomerId(customer.id)} className="text-slate-300 focus:text-slate-200"><Archive size={14} className="mr-2" />Arşive Taşı</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => removeCustomer(customer.id)} className="text-red-400 focus:text-red-400"><Trash2 size={14} className="mr-2" />Listeden Kaldır</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Quick Edit Price Dialog */}
            <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
                <DialogContent className="bg-[#0c1929] border-cyan-500/20 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100 flex items-center gap-2">
                            <Edit size={20} className="text-cyan-400" />
                            Fiyat Düzenle
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Müşteri için anlaşılan fiyatı güncelleyin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                            <div className="text-xs text-slate-500 font-bold">Müşteri</div>
                            <div className="text-sm text-slate-200 font-bold">
                                {editingCustomer?.full_name || editingCustomer?.name || 'Müşteri'}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 mb-1 block">Yeni Fiyat (₺)</label>
                            <Input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                placeholder="Fiyat girin..."
                                className="bg-slate-900/50 border-slate-700 text-slate-200 text-lg font-bold"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button variant="ghost" onClick={() => setEditingCustomer(null)} className="text-slate-400">
                            İptal
                        </Button>
                        <Button
                            onClick={handleSavePrice}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
                        >
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Archive Confirmation Dialog */}
            <Dialog open={!!archiveCustomerId} onOpenChange={() => setArchiveCustomerId(null)}>
                <DialogContent className="bg-[#0c1929] border-cyan-500/20 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100 flex items-center gap-2">
                            <Archive size={20} className="text-amber-400" />
                            Arşive Taşı
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Bu işlem müşteriyi aktif listeden kaldırır.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-slate-300 text-sm">
                            Bu müşteriyi arşive taşımak istediğinize emin misiniz?
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                            Müşteri aktif listesinden kaldırılacak ve arşiv kategorisine taşınacak.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setArchiveCustomerId(null)} className="text-slate-400">
                            İptal
                        </Button>
                        <Button
                            onClick={handleArchive}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
                        >
                            Arşive Taşı
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
