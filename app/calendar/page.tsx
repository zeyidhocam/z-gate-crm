"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Phone } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths, getDay } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Reservation {
    id: string
    full_name: string | null
    name: string | null
    phone: string | null
    reservation_at: string
    price_agreed: number | null
    process_types?: { name: string } | null
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function CalendarPage() {
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [loading, setLoading] = useState(true)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    useEffect(() => {
        fetchReservations()
    }, [])

    const fetchReservations = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('clients')
                .select('id, full_name, name, phone, reservation_at, price_agreed, process_types(name)')
                .eq('status', 'Rezervasyon')
                .not('reservation_at', 'is', null)

            if (error) throw error
            setReservations(data as Reservation[] || [])
        } catch {
            // Hata kaydi gizlendi
        } finally {
            setLoading(false)
        }
    }

    // Takvim günleri oluştur
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(currentMonth)
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

        // Haftanın başlangıcına kadar boş günler ekle (Pazartesi = 0)
        const startDayOfWeek = getDay(monthStart)
        const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
        const emptyDays = Array(adjustedStartDay).fill(null)

        return [...emptyDays, ...days]
    }, [currentMonth])

    // Belirli bir gündeki rezervasyonlar
    const getReservationsForDate = (date: Date) => {
        return reservations.filter(r => {
            const resDate = parseISO(r.reservation_at)
            return isSameDay(resDate, date)
        })
    }

    // Seçilen günün rezervasyonları
    const selectedDateReservations = selectedDate
        ? getReservationsForDate(selectedDate)
        : []

    const handleDateClick = (date: Date) => {
        const dayReservations = getReservationsForDate(date)
        if (dayReservations.length > 0) {
            setSelectedDate(date)
            setDialogOpen(true)
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 sm:p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <CalendarIcon className="text-purple-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient-ocean">Takvim</h1>
                        <p className="text-xs sm:text-sm text-slate-400">Rezervasyonları takvimde görüntüle</p>
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center gap-2 sm:gap-4 self-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 h-9 w-9 sm:h-10 sm:w-10"
                    >
                        <ChevronLeft size={20} />
                    </Button>
                    <span className="text-sm sm:text-lg font-bold text-slate-200 min-w-[140px] sm:min-w-[180px] text-center capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 h-9 w-9 sm:h-10 sm:w-10"
                    >
                        <ChevronRight size={20} />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0c1929]/90 via-[#0a1628]/80 to-[#040d17]/90 border border-cyan-500/20 overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-cyan-500/10">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="py-2 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((day, index) => {
                        if (!day) {
                            return <div key={`empty-${index}`} className="h-16 sm:h-20 lg:h-28 border-b border-r border-cyan-500/5" />
                        }

                        const dayReservations = getReservationsForDate(day)
                        const isToday = isSameDay(day, new Date())
                        const hasReservations = dayReservations.length > 0

                        return (
                            <div
                                key={day.toISOString()}
                                onClick={() => handleDateClick(day)}
                                className={cn(
                                    "h-16 sm:h-20 lg:h-28 p-1 sm:p-2 border-b border-r border-cyan-500/5 transition-all",
                                    hasReservations && "cursor-pointer hover:bg-cyan-500/5",
                                    isToday && "bg-cyan-500/10"
                                )}
                            >
                                {/* Day Number */}
                                <div className={cn(
                                    "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold mb-0.5 sm:mb-1",
                                    isToday
                                        ? "bg-cyan-500 text-white"
                                        : isSameMonth(day, currentMonth)
                                            ? "text-slate-300"
                                            : "text-slate-600"
                                )}>
                                    {format(day, 'd')}
                                </div>

                                {/* Reservations Preview */}
                                <div className="space-y-0.5 sm:space-y-1">
                                    {dayReservations.slice(0, window.innerWidth < 640 ? 1 : 2).map(res => (
                                        <div
                                            key={res.id}
                                            className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 truncate font-medium"
                                        >
                                            <span className="hidden sm:inline">{format(parseISO(res.reservation_at), 'HH:mm')} - </span>
                                            <span className="sm:hidden">{format(parseISO(res.reservation_at), 'HH:mm')}</span>
                                            <span className="hidden sm:inline">{res.full_name || res.name}</span>
                                        </div>
                                    ))}
                                    {dayReservations.length > (typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2) && (
                                        <div className="text-[8px] sm:text-[10px] text-slate-500 font-bold px-1">
                                            +{dayReservations.length - 1} daha
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Reservation Detail Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#0c1929] border-cyan-500/20 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-cyan-300 font-bold">
                            {selectedDate && format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4">
                        {selectedDateReservations.map(res => (
                            <div
                                key={res.id}
                                className="p-4 rounded-xl bg-[#040d17]/50 border border-cyan-500/10"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="font-bold text-slate-200">
                                            {res.full_name || res.name || 'İsimsiz'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                            <Phone size={12} />
                                            {res.phone || '-'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">
                                        <Clock size={14} />
                                        {format(parseISO(res.reservation_at), 'HH:mm')}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
                                    <span className="text-xs text-slate-400">
                                        {res.process_types?.name || 'İşlem belirtilmemiş'}
                                    </span>
                                    {res.price_agreed && (
                                        <span className="text-sm font-bold text-emerald-400">
                                            {res.price_agreed.toLocaleString('tr-TR')} ₺
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
