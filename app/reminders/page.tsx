"use client"

import { useState, useEffect, useMemo } from "react"
import { Bell, Clock, AlertTriangle, UserX, Phone, Calendar, TrendingDown, Filter, Plus, CheckCircle, Trash2, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, parseISO, differenceInDays, isBefore, isToday, addDays } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WhatsAppButton } from "@/components/WhatsAppButton"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

interface Client {
    id: string
    full_name: string | null
    name: string | null
    phone: string | null
    status: string
    created_at: string
    reservation_at: string | null
    process_types?: { name: string } | null
}

interface Reminder {
    id: string
    client_id: string | null
    title: string
    description: string | null
    reminder_date: string
    is_completed: boolean
    created_at: string
    clients?: Client | null
}

type FilterType = 'all' | '7days' | '14days' | '30days' | '60days'
type TabType = 'manual' | 'auto'

const FILTER_OPTIONS: { value: FilterType; label: string; days: number }[] = [
    { value: 'all', label: 'Tümü', days: 0 },
    { value: '7days', label: '7+ Gün', days: 7 },
    { value: '14days', label: '14+ Gün', days: 14 },
    { value: '30days', label: '30+ Gün', days: 30 },
    { value: '60days', label: '60+ Gün', days: 60 },
]

export default function RemindersPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)

    // localStorage ile kalıcı state
    const [filter, setFilter] = useState<FilterType>('14days')
    const [activeTab, setActiveTab] = useState<TabType>('manual')

    // New reminder form
    const [newTitle, setNewTitle] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newDate, setNewDate] = useState<Date | undefined>(addDays(new Date(), 1))
    const [dialogOpen, setDialogOpen] = useState(false)

    // localStorage'dan state yükle
    useEffect(() => {
        const savedTab = localStorage.getItem('remindersActiveTab')
        const savedFilter = localStorage.getItem('remindersFilter')
        if (savedTab) setActiveTab(savedTab as TabType)
        if (savedFilter) setFilter(savedFilter as FilterType)
    }, [])

    // State değiştiğinde localStorage'a kaydet
    useEffect(() => {
        localStorage.setItem('remindersActiveTab', activeTab)
    }, [activeTab])

    useEffect(() => {
        localStorage.setItem('remindersFilter', filter)
    }, [filter])

    useEffect(() => {
        fetchClients()
        fetchReminders()
    }, [])

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, full_name, name, phone, status, created_at, reservation_at, process_types(name)')
                .in('status', ['Sabit', 'Takip', 'Yeni'])
                .order('created_at', { ascending: true })

            if (error) throw error
            setClients((data as unknown as Client[]) || [])
        } catch (error) {
            console.error('Error fetching clients:', error)
        }
    }

    const fetchReminders = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('reminders')
                .select('*, clients(id, full_name, name, phone)')
                .order('reminder_date', { ascending: true })

            if (error) throw error
            setReminders((data as unknown as Reminder[]) || [])
        } catch (error) {
            console.error('Error fetching reminders:', error)
        } finally {
            setLoading(false)
        }
    }

    const addReminder = async () => {
        if (!newTitle.trim() || !newDate) return

        try {
            const { error } = await supabase
                .from('reminders')
                .insert({
                    title: newTitle.trim(),
                    description: newDescription.trim() || null,
                    reminder_date: newDate.toISOString(),
                    is_completed: false
                })

            if (error) throw error

            setNewTitle('')
            setNewDescription('')
            setNewDate(addDays(new Date(), 1))
            setDialogOpen(false)
            fetchReminders()
        } catch (error) {
            console.error('Error adding reminder:', error)
        }
    }

    const toggleComplete = async (id: string, current: boolean) => {
        try {
            const { error } = await supabase
                .from('reminders')
                .update({ is_completed: !current })
                .eq('id', id)

            if (error) throw error
            fetchReminders()
        } catch (error) {
            console.error('Error toggling reminder:', error)
        }
    }

    const deleteReminder = async (id: string) => {
        try {
            const { error } = await supabase
                .from('reminders')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchReminders()
        } catch (error) {
            console.error('Error deleting reminder:', error)
        }
    }

    // Uzun süredir gelmeyen müşteriler (otomatik)
    const inactiveClients = useMemo(() => {
        const now = new Date()
        const filterDays = FILTER_OPTIONS.find(f => f.value === filter)?.days || 0

        return clients
            .map(client => {
                const lastDate = client.reservation_at
                    ? parseISO(client.reservation_at)
                    : parseISO(client.created_at)
                const daysSince = differenceInDays(now, lastDate)
                return { ...client, daysSince, lastDate }
            })
            .filter(client => filterDays === 0 || client.daysSince >= filterDays)
            .sort((a, b) => b.daysSince - a.daysSince)
    }, [clients, filter])

    // Manuel hatırlatmalar - aktif (tamamlanmamış)
    const activeReminders = reminders.filter(r => !r.is_completed)
    const completedReminders = reminders.filter(r => r.is_completed)

    // Bugün ve geçmiş hatırlatmalar
    const todayReminders = activeReminders.filter(r => isToday(parseISO(r.reminder_date)))
    const overdueReminders = activeReminders.filter(r => isBefore(parseISO(r.reminder_date), new Date()) && !isToday(parseISO(r.reminder_date)))
    const upcomingReminders = activeReminders.filter(r => !isBefore(parseISO(r.reminder_date), new Date()) && !isToday(parseISO(r.reminder_date)))

    // İstatistikler
    const stats = useMemo(() => {
        const now = new Date()
        let over7 = 0, over14 = 0, over30 = 0

        clients.forEach(client => {
            const lastDate = client.reservation_at
                ? parseISO(client.reservation_at)
                : parseISO(client.created_at)
            const days = differenceInDays(now, lastDate)
            if (days >= 30) over30++
            else if (days >= 14) over14++
            else if (days >= 7) over7++
        })

        return { over7, over14, over30, total: clients.length }
    }, [clients])

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
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <Bell className="text-amber-400" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gradient-ocean">Hatırlatmalar</h1>
                        <p className="text-slate-400">Manuel ve otomatik hatırlatmalar</p>
                    </div>
                </div>

                {/* Add Reminder Button */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold">
                            <Plus size={18} />
                            Hatırlatma Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0c1929] border-cyan-500/20">
                        <DialogHeader>
                            <DialogTitle className="text-slate-100 flex items-center gap-2">
                                <Bell size={20} className="text-amber-400" />
                                Yeni Hatırlatma
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Başlık *</label>
                                <Input
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Hatırlatma başlığı..."
                                    className="bg-slate-900/50 border-slate-700 text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Açıklama</label>
                                <Textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Detaylar..."
                                    className="bg-slate-900/50 border-slate-700 text-slate-200 resize-none"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Tarih *</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start gap-2 bg-slate-900/50 border-slate-700 text-slate-200">
                                            <Calendar size={16} />
                                            {newDate ? format(newDate, 'dd MMMM yyyy', { locale: tr }) : 'Tarih seç'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#0c1929] border-cyan-500/20">
                                        <CalendarComponent
                                            mode="single"
                                            selected={newDate}
                                            onSelect={setNewDate}
                                            locale={tr}
                                            className="rounded-md"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <DialogClose asChild>
                                <Button variant="ghost" className="text-slate-400">İptal</Button>
                            </DialogClose>
                            <Button onClick={addReminder} disabled={!newTitle.trim() || !newDate} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                                Ekle
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <Bell className="text-amber-400" size={24} />
                        <div>
                            <div className="text-2xl font-black text-amber-400">{activeReminders.length}</div>
                            <div className="text-xs text-slate-500 font-bold">Aktif Hatırlatma</div>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-400" size={24} />
                        <div>
                            <div className="text-2xl font-black text-red-400">{overdueReminders.length}</div>
                            <div className="text-xs text-slate-500 font-bold">Gecikmiş</div>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
                    <div className="flex items-center gap-3">
                        <Clock className="text-cyan-400" size={24} />
                        <div>
                            <div className="text-2xl font-black text-cyan-400">{todayReminders.length}</div>
                            <div className="text-xs text-slate-500 font-bold">Bugün</div>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20">
                    <div className="flex items-center gap-3">
                        <UserX className="text-violet-400" size={24} />
                        <div>
                            <div className="text-2xl font-black text-violet-400">{stats.over30}</div>
                            <div className="text-xs text-slate-500 font-bold">30+ Gün İnaktif</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('manual')}
                    className={cn(
                        "text-sm font-bold",
                        activeTab === 'manual' ? "text-cyan-400 bg-cyan-500/10" : "text-slate-500"
                    )}
                >
                    <Bell size={16} className="mr-2" />
                    Manuel Hatırlatmalar ({activeReminders.length})
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('auto')}
                    className={cn(
                        "text-sm font-bold",
                        activeTab === 'auto' ? "text-cyan-400 bg-cyan-500/10" : "text-slate-500"
                    )}
                >
                    <TrendingDown size={16} className="mr-2" />
                    İnaktif Müşteriler ({inactiveClients.length})
                </Button>
            </div>

            {/* Content */}
            {activeTab === 'manual' ? (
                <div className="space-y-6">
                    {/* Gecikmiş */}
                    {overdueReminders.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Gecikmiş ({overdueReminders.length})
                            </h3>
                            <div className="space-y-2">
                                {overdueReminders.map(reminder => (
                                    <ReminderCard key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder} isOverdue />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bugün */}
                    {todayReminders.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                <Clock size={16} />
                                Bugün ({todayReminders.length})
                            </h3>
                            <div className="space-y-2">
                                {todayReminders.map(reminder => (
                                    <ReminderCard key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder} isToday />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Yaklaşan */}
                    {upcomingReminders.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                <Calendar size={16} />
                                Yaklaşan ({upcomingReminders.length})
                            </h3>
                            <div className="space-y-2">
                                {upcomingReminders.map(reminder => (
                                    <ReminderCard key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tamamlanan */}
                    {completedReminders.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                                <CheckCircle size={16} />
                                Tamamlanan ({completedReminders.length})
                            </h3>
                            <div className="space-y-2 opacity-60">
                                {completedReminders.slice(0, 5).map(reminder => (
                                    <ReminderCard key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder} isCompleted />
                                ))}
                            </div>
                        </div>
                    )}

                    {activeReminders.length === 0 && completedReminders.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Bell size={48} className="mx-auto mb-4 opacity-30" />
                            <p>Henüz hatırlatma yok</p>
                            <p className="text-sm">Yukarıdaki butona tıklayarak ekleyebilirsiniz</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-500" />
                        {FILTER_OPTIONS.map(opt => (
                            <Button
                                key={opt.value}
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilter(opt.value)}
                                className={cn(
                                    "text-xs font-bold",
                                    filter === opt.value ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400"
                                )}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>

                    {/* Inactive Clients List */}
                    <div className="space-y-2">
                        {inactiveClients.map(client => (
                            <div
                                key={client.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-[#0c1929]/80 border border-slate-800/50 hover:border-amber-500/30 transition-all"
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                    client.daysSince >= 30 ? "bg-red-500/10 text-red-400" :
                                        client.daysSince >= 14 ? "bg-amber-500/10 text-amber-400" :
                                            "bg-slate-500/10 text-slate-400"
                                )}>
                                    <span className="text-lg font-black">{client.daysSince}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-200">{client.full_name || client.name || 'İsimsiz'}</div>
                                    <div className="text-xs text-slate-500">{client.phone || '-'}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-xs text-slate-500">Son işlem</div>
                                    <div className="text-sm text-slate-400">{format(client.lastDate, 'dd MMM yyyy', { locale: tr })}</div>
                                </div>
                                <WhatsAppButton phone={client.phone} clientName={client.full_name || client.name || 'Değerli Müşteri'} size="sm" />
                            </div>
                        ))}

                        {inactiveClients.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500 opacity-50" />
                                <p>Tüm müşteriler aktif!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// Reminder Card Component
function ReminderCard({
    reminder,
    onToggle,
    onDelete,
    isOverdue = false,
    isToday = false,
    isCompleted = false
}: {
    reminder: Reminder
    onToggle: (id: string, current: boolean) => void
    onDelete: (id: string) => void
    isOverdue?: boolean
    isToday?: boolean
    isCompleted?: boolean
}) {
    return (
        <div className={cn(
            "flex items-center gap-4 p-4 rounded-xl border transition-all",
            isOverdue ? "bg-red-500/5 border-red-500/30" :
                isToday ? "bg-cyan-500/5 border-cyan-500/30" :
                    isCompleted ? "bg-slate-800/30 border-slate-700/30" :
                        "bg-[#0c1929]/80 border-slate-800/50"
        )}>
            <button
                onClick={() => onToggle(reminder.id, reminder.is_completed)}
                className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    reminder.is_completed
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-600 hover:border-cyan-500"
                )}
            >
                {reminder.is_completed && <CheckCircle size={14} />}
            </button>
            <div className="flex-1 min-w-0">
                <div className={cn("font-bold", isCompleted ? "text-slate-500 line-through" : "text-slate-200")}>
                    {reminder.title}
                </div>
                {reminder.description && (
                    <div className="text-xs text-slate-500 truncate">{reminder.description}</div>
                )}
            </div>
            <div className="text-right shrink-0">
                <div className={cn(
                    "text-sm font-bold",
                    isOverdue ? "text-red-400" : isToday ? "text-cyan-400" : "text-slate-400"
                )}>
                    {format(parseISO(reminder.reminder_date), 'dd MMM', { locale: tr })}
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(reminder.id)}
                className="h-8 w-8 text-slate-600 hover:text-red-400 hover:bg-red-500/10"
            >
                <Trash2 size={16} />
            </Button>
        </div>
    )
}
