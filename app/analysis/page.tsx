
'use client'

import { useState, useEffect } from "react"
import { DollarSign, Plus, Trash2, TrendingDown, TrendingUp, Wallet, Home, Zap, ShoppingCart, Car, User, ArrowUpRight, ArrowDownRight, Lock, Unlock, KeyRound, Briefcase, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Transaction {
    id: string
    title: string
    amount: number
    category: string
    type: 'income' | 'expense'
    date: string
}

// Fixed Income Categories
const INCOME_CATEGORIES = [
    { id: 'maas', label: 'Maaş', icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'ek_is', label: 'Ek Gelir (Freelance)', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { id: 'kira_geliri', label: 'Kira Geliri', icon: Home, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'yatirim', label: 'Yatırım/Faiz', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'satis', label: 'Satış/Ticaret', icon: ShoppingCart, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'hediye', label: 'Hediye/Prim', icon: Gift, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { id: 'diger_gelir', label: 'Diğer Gelir', icon: Wallet, color: 'text-slate-400', bg: 'bg-slate-400/10' },
]

const EXPENSE_CATEGORIES = [
    { id: 'kira', label: 'Ev Kirası', icon: Home, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'fatura', label: 'Faturalar', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { id: 'gida', label: 'Mutfak/Gıda', icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-400/10' },
    { id: 'ulasim', label: 'Ulaşım/Yakıt', icon: Car, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'sahsi', label: 'Şahsi', icon: User, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'diger', label: 'Diğer Gider', icon: Wallet, color: 'text-slate-400', bg: 'bg-slate-400/10' },
]

export default function AnalysisPage() {
    // Security State
    const [isLocked, setIsLocked] = useState(true)
    const [pin, setPin] = useState("")
    const [error, setError] = useState(false)
    const DEFAULT_PIN = "1881"
    const LOCK_KEY = "expenses_session_timestamp"
    const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    // Form
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense')
    const [title, setTitle] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("diger")

    useEffect(() => {
        const savedTime = localStorage.getItem(LOCK_KEY)
        if (savedTime) {
            const timeDiff = Date.now() - parseInt(savedTime)
            if (timeDiff < SESSION_DURATION) {
                setIsLocked(false)
            } else {
                localStorage.removeItem(LOCK_KEY)
            }
        }
    }, [])

    useEffect(() => {
        if (!isLocked) {
            fetchData()
        }
    }, [isLocked])

    const handleUnlock = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (pin === DEFAULT_PIN) {
            setIsLocked(false)
            setError(false)
            localStorage.setItem(LOCK_KEY, Date.now().toString())
            toast.success("Kasa açıldı!")
        } else {
            setError(true)
            setPin("")
            toast.error("Hatalı Şifre!")
            setTimeout(() => setError(false), 500)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false })

            setTransactions(data || [])
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleTabChange = (val: string) => {
        const tab = val as 'income' | 'expense'
        setActiveTab(tab)
        // Reset category to default for that tab
        if (tab === 'expense') {
            setCategory('diger')
        } else {
            setCategory('maas')
        }
    }

    const handleAdd = async () => {
        if (!title || !amount) return

        try {
            const newTransaction = {
                title,
                amount: parseInt(amount),
                category,
                type: activeTab,
                date: new Date().toISOString()
            }

            const { error } = await supabase.from('expenses').insert([newTransaction])
            if (error) throw error

            setTitle("")
            setAmount("")
            fetchData()
            toast.success(activeTab === 'income' ? "Gelir eklendi" : "Gider eklendi")

        } catch (error) {
            toast.error("Hata! SQL kodunu çalıştırdınız mı?")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Silmek istediğine emin misin?")) return
        await supabase.from('expenses').delete().eq('id', id)
        fetchData()
        toast.info("Kayıt silindi")
    }

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = transactions.filter(t => t.type === 'expense' || !t.type).reduce((sum, t) => sum + t.amount, 0)
    const netBalance = totalIncome - totalExpense

    // LOCK SCREEN
    if (isLocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-4">
                <div className="relative group animate-in zoom-in duration-500">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative p-8 bg-[#0c1929] border border-cyan-500/20 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-full max-w-sm mx-auto backdrop-blur-xl">

                        <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-2">
                            <Lock size={40} className="text-cyan-400" />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">Kişisel Kasa Kilitli</h2>
                            <p className="text-sm text-slate-400">Devam etmek için 4 haneli şifreyi girin.</p>
                        </div>

                        <form onSubmit={handleUnlock} className="w-full space-y-4">
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <Input
                                    type="password"
                                    placeholder="Şifre Giriniz"
                                    value={pin}
                                    maxLength={4}
                                    onChange={(e) => setPin(e.target.value)}
                                    className={cn(
                                        "pl-10 text-center text-lg tracking-[0.5em] font-mono h-12 bg-slate-900/50 border-cyan-500/20 focus:border-cyan-400 transition-all",
                                        error && "border-red-500 animate-shake"
                                    )}
                                    autoFocus
                                />
                            </div>

                            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-900/20">
                                <Unlock size={18} className="mr-2" />
                                Kilidi Aç
                            </Button>
                        </form>
                        <div className="text-xs text-slate-600">Varsayılan Şifre: 1881</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
                        Şahsi Cüzdan
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/10 text-green-400 border border-green-500/20">GÜVENLİ</span>
                    </h1>
                    <p className="text-slate-400 mt-2">Kişisel gelir ve gider yönetim paneli.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setIsLocked(true); localStorage.removeItem(LOCK_KEY) }} className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10">
                        <Lock size={16} className="mr-2" /> Kilitle
                    </Button>
                </div>
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
                        <span className="text-slate-400 font-medium">Toplam Gelir</span>
                    </div>
                    <div className="text-3xl font-black text-green-400 relative z-10">
                        ₺{totalIncome.toLocaleString('tr-TR')}
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
                        <span className="text-slate-400 font-medium">Toplam Gider</span>
                    </div>
                    <div className="text-3xl font-black text-red-400 relative z-10">
                        ₺{totalExpense.toLocaleString('tr-TR')}
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
                        <span className="text-slate-100 font-bold">Net Bakiye</span>
                    </div>
                    <div className={cn("text-4xl font-black relative z-10 tracking-tight", netBalance >= 0 ? "text-cyan-400" : "text-red-400")}>
                        ₺{netBalance.toLocaleString('tr-TR')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Transaction Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 rounded-2xl bg-[#0c1929] border border-cyan-500/20 shadow-lg">
                        <Tabs value={activeTab} onValueChange={handleTabChange}>
                            <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 mb-6">
                                <TabsTrigger value="income" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Gelir Ekle</TabsTrigger>
                                <TabsTrigger value="expense" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">Gider Ekle</TabsTrigger>
                            </TabsList>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Açıklama</label>
                                    <Input
                                        placeholder={activeTab === 'income' ? "Örn: Maaş" : "Örn: Kira"}
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
                                            {(activeTab === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                                <SelectItem key={cat.id} value={cat.id} className="cursor-pointer">
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
                                    onClick={handleAdd}
                                    className={cn(
                                        "w-full text-white shadow-lg h-11 font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]",
                                        activeTab === 'income'
                                            ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/20"
                                            : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-900/20"
                                    )}
                                >
                                    {activeTab === 'income' ? <Plus className="mr-2" /> : <TrendingDown className="mr-2" />}
                                    {activeTab === 'income' ? "Gelir Kaydet" : "Gider Kaydet"}
                                </Button>
                            </div>
                        </Tabs>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0c1929] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-lg h-full max-h-[800px] flex flex-col">
                        <div className="p-6 border-b border-cyan-500/10 flex justify-between items-center bg-slate-900/30">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Wallet className="text-slate-400" size={20} />
                                Hesap Hareketleri
                            </h3>
                            <span className="text-xs font-medium text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                                {transactions.length} İşlem
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <div className="divide-y divide-slate-800/50">
                                {transactions.map(item => {
                                    const isIncome = item.type === 'income'
                                    const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                                    const catConfig = cats.find(c => c.id === item.category) || cats[cats.length - 1]

                                    return (
                                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-900/30 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110", catConfig.bg)}>
                                                    <catConfig.icon size={20} className={catConfig.color} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-200 text-lg">{item.title}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider", isIncome ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                                                            {isIncome ? 'GELİR' : 'GİDER'}
                                                        </span>
                                                        <span className="font-medium text-slate-400">{catConfig.label}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                        {format(new Date(item.date), 'd MMMM yyyy HH:mm', { locale: tr })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className={cn("font-black text-lg tabular-nums", isIncome ? "text-green-400" : "text-red-400")}>
                                                    {isIncome ? '+' : '-'}₺{item.amount.toLocaleString('tr-TR')}
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {transactions.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                                        <div className="p-6 rounded-full bg-slate-900/50 border border-slate-800">
                                            <Wallet size={48} className="text-slate-700" />
                                        </div>
                                        <p>Henüz işlem yapmadınız.</p>
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
