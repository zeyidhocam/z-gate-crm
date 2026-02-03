
'use client'

import { useState, useEffect } from "react"
import { DollarSign, Plus, Trash2, TrendingDown, TrendingUp, Wallet, Home, Zap, ShoppingCart, Car, User, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Expense {
    id: string
    title: string
    amount: number
    category: string
    date: string
}

const CATEGORIES = [
    { id: 'kira', label: 'Ev Kirası', icon: Home, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'fatura', label: 'Faturalar', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { id: 'gida', label: 'Mutfak/Gıda', icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-400/10' },
    { id: 'ulasim', label: 'Ulaşım/Yakıt', icon: Car, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'sahsi', label: 'Şahsi', icon: User, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'diger', label: 'Diğer', icon: Wallet, color: 'text-slate-400', bg: 'bg-slate-400/10' },
]

export default function AnalysisPage() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [totalRevenue, setTotalRevenue] = useState(0) // From clients

    // Form
    const [title, setTitle] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("diger")

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Expenses
            const { data: expenseData, error: expenseError } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false })

            // Handle missing table gracefully
            if (expenseError) {
                console.error("Expenses fetch error (Table might be missing):", expenseError)
                setExpenses([])
            } else {
                setExpenses(expenseData || [])
            }

            // 2. Fetch Total Revenue (Confirmed Clients)
            const { data: revenueData } = await supabase
                .from('clients')
                .select('price_agreed')
                .eq('is_confirmed', true)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const total = (revenueData as any[])?.reduce((sum, curr) => sum + (curr.price_agreed || 0), 0) || 0
            setTotalRevenue(total)

        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddExpense = async () => {
        if (!title || !amount) return

        try {
            const newExpense = {
                title,
                amount: parseInt(amount),
                category,
                date: new Date().toISOString()
            }

            const { error } = await supabase.from('expenses').insert([newExpense])
            if (error) throw error

            setTitle("")
            setAmount("")
            fetchData()

            // Success Toast could be added here

        } catch (error) {
            alert("Gider eklenirken hata: Tablo veritabanında bulunamadı. Lütfen SQL kodunu çalıştırın.")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bu gideri silmek istediğine emin misin?")) return
        await supabase.from('expenses').delete().eq('id', id)
        fetchData()
    }

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)
    const netBalance = totalRevenue - totalExpenses

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Kişisel Kasa & Giderler</h1>
                <p className="text-slate-400 mt-2">Şahsi bütçe yönetimi, ev giderleri ve net durum analizi.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gelir Kartı */}
                <div className="p-6 rounded-2xl bg-[#0c1929] border border-green-500/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-green-500" />
                    </div>
                    <div className="flex items-center gap-4 mb-3 relative z-10">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-slate-400 font-medium">Toplam İş Geliri</span>
                    </div>
                    <div className="text-3xl font-black text-green-400 relative z-10">
                        ₺{totalRevenue.toLocaleString('tr-TR')}
                    </div>
                </div>

                {/* Gider Kartı */}
                <div className="p-6 rounded-2xl bg-[#0c1929] border border-red-500/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown size={64} className="text-red-500" />
                    </div>
                    <div className="flex items-center gap-4 mb-3 relative z-10">
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                            <ArrowDownRight size={24} />
                        </div>
                        <span className="text-slate-400 font-medium">Toplam Giderler</span>
                    </div>
                    <div className="text-3xl font-black text-red-400 relative z-10">
                        ₺{totalExpenses.toLocaleString('tr-TR')}
                    </div>
                </div>

                {/* Net Durum Kartı */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1929] via-[#0a1628] to-[#040d17] border border-cyan-500/30 shadow-[0_0_30px_-10px_rgba(34,211,238,0.2)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-50" />
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={64} className="text-cyan-500" />
                    </div>
                    <div className="flex items-center gap-4 mb-3 relative z-10">
                        <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20">
                            <Wallet size={24} />
                        </div>
                        <span className="text-slate-100 font-bold">Net Kalan (Cepteki)</span>
                    </div>
                    <div className={cn("text-4xl font-black relative z-10 tracking-tight", netBalance >= 0 ? "text-cyan-400" : "text-red-400")}>
                        ₺{netBalance.toLocaleString('tr-TR')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Expense Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 rounded-2xl bg-[#0c1929] border border-cyan-500/20 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-cyan-500/10 pb-4">
                            <Plus className="text-cyan-400" size={20} />
                            Hızlı Gider Ekle
                        </h3>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gider Adı</label>
                                <Input
                                    placeholder="Örn: Ev Kirası"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="bg-slate-900/50 border-cyan-500/10 focus:border-cyan-500/50 h-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tutar (TL)</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="bg-slate-900/50 border-cyan-500/10 focus:border-cyan-500/50 h-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="bg-slate-900/50 border-cyan-500/10 focus:border-cyan-500/50 h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0c1929] border-cyan-500/20 text-slate-200">
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id} className="focus:bg-cyan-500/20 focus:text-cyan-400 cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <cat.icon size={16} className={cat.color} />
                                                    {cat.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleAddExpense}
                                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-900/20 h-11 font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Gider Ekle
                            </Button>
                        </div>
                    </div>

                    {/* Category Summary */}
                    <div className="p-6 rounded-2xl bg-[#0c1929] border border-cyan-500/10">
                        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <TrendingDown size={16} />
                            Kategori Dağılımı
                        </h3>
                        <div className="space-y-4">
                            {CATEGORIES.map(cat => {
                                const catTotal = expenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
                                if (catTotal === 0) return null
                                const percent = Math.round((catTotal / totalExpenses) * 100) || 0
                                return (
                                    <div key={cat.id} className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-300 flex items-center gap-2 font-medium">
                                                <div className={cn("p-1 rounded-md", cat.bg)}>
                                                    <cat.icon size={12} className={cat.color} />
                                                </div>
                                                {cat.label}
                                            </span>
                                            <span className="font-mono text-slate-400 font-bold">₺{catTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div style={{ width: `${percent}%` }} className={cn("h-full rounded-full transition-all duration-500", cat.color.replace('text-', 'bg-'))} />
                                        </div>
                                    </div>
                                )
                            })}
                            {totalExpenses === 0 && <p className="text-slate-600 text-sm text-center py-4">Henüz gider eklenmedi.</p>}
                        </div>
                    </div>
                </div>

                {/* Expense List */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0c1929] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-lg h-full max-h-[800px] flex flex-col">
                        <div className="p-6 border-b border-cyan-500/10 flex justify-between items-center bg-slate-900/30">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Wallet className="text-slate-400" size={20} />
                                Harcama Geçmişi
                            </h3>
                            <span className="text-xs font-medium text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                                {expenses.length} Kayıt
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <div className="divide-y divide-slate-800/50">
                                {expenses.map(expense => {
                                    const catConfig = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[5]
                                    return (
                                        <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-slate-900/30 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110", catConfig.bg)}>
                                                    <catConfig.icon size={20} className={catConfig.color} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-200 text-lg">{expense.title}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                        <span className="font-medium text-slate-400">{catConfig.label}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                        {format(new Date(expense.date), 'd MMMM yyyy HH:mm', { locale: tr })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="font-black text-red-400 text-lg tabular-nums">
                                                    -₺{expense.amount.toLocaleString('tr-TR')}
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {expenses.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                                        <div className="p-6 rounded-full bg-slate-900/50 border border-slate-800">
                                            <Wallet size={48} className="text-slate-700" />
                                        </div>
                                        <p>Henüz harcama kaydı yok.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
