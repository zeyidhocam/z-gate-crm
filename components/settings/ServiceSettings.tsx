"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Loader2, Save } from "lucide-react"

interface ProcessType {
    id: number
    name: string
    price: number
}

export function ServiceSettings() {
    const [items, setItems] = useState<ProcessType[]>([])
    const [loading, setLoading] = useState(true)
    const [editingParams, setEditingParams] = useState<{ id: number, field: string } | null>(null)
    const [newItem, setNewItem] = useState<{ name: string, price: string }>({ name: '', price: '' })

    // For auto-focus
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchItems()
    }, [])

    useEffect(() => {
        if (editingParams && inputRef.current) {
            inputRef.current.focus()
        }
    }, [editingParams])

    const fetchItems = async () => {
        setLoading(true)
        const { data } = await supabase.from('process_types').select('*').order('id', { ascending: true })
        if (data) setItems(data)
        setLoading(false)
    }

    const handleCellClick = (id: number, field: string) => {
        setEditingParams({ id, field })
    }

    const handleBlur = async () => {
        setEditingParams(null)
    }

    const handleChange = async (id: number, field: keyof ProcessType, value: any) => {
        // Validation for price
        if (field === 'price' && isNaN(Number(value))) return

        // Optimistic
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))

        // Debounce or just save on blur? User requested "Blur (clicking outside) saves it".
        // But we need to update state immediately for input to work.
        // The save happens in handleBlur logic implicitly if we tracked dirty state, 
        // but explicit save on change is safer for "Excel-like" feel if we don't want to lose data.
        // Actually, let's trigger update on DB "on the fly" or on Blur.
        // For simplicity and robustness, lets just update DB on every keystroke with debounce? 
        // No, user said "Blur (clicking outside) saves it". 
        // So we will perform the UPDATE in handleBlur. But handleBlur doesn't verify value change easily.
        // Let's create a specific update function called on Blur.
    }

    // Explicit save function for Blur
    const saveChange = async (id: number, field: string, value: any) => {
        await supabase.from('process_types').update({ [field]: value }).eq('id', id)
    }

    const handleAddItem = async () => {
        if (!newItem.name) return

        const priceVal = Number(newItem.price) || 0
        const { data } = await supabase
            .from('process_types')
            .insert([{ name: newItem.name, price: priceVal }])
            .select()
            .single()

        if (data) {
            setItems([...items, data])
            setNewItem({ name: '', price: '' })
        }
    }

    const handleDelete = async (id: number) => {
        if (confirm('Silmek istediğinize emin misiniz?')) {
            await supabase.from('process_types').delete().eq('id', id)
            setItems(items.filter(i => i.id !== id))
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Hizmet ve Fiyat Yönetimi</h2>
                <p className="text-slate-400">Veritabanına bağlı canlı düzenlenebilir liste.</p>
            </div>
            <Separator className="bg-slate-800" />

            {/* Quick Add Form */}
            <div className="flex gap-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl items-end">
                <div className="flex-1 space-y-1">
                    <span className="text-xs font-medium text-purple-300 ml-1">Yeni Hizmet Adı</span>
                    <Input
                        placeholder="Örn: Cilt Bakımı"
                        className="bg-slate-950 border-slate-700 focus:border-purple-500"
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItem()
                        }}
                    />
                </div>
                <div className="w-32 space-y-1">
                    <span className="text-xs font-medium text-purple-300 ml-1">Fiyat (TL)</span>
                    <Input
                        placeholder="0"
                        type="number"
                        className="bg-slate-950 border-slate-700 focus:border-purple-500"
                        value={newItem.price}
                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItem()
                        }}
                    />
                </div>
                <Button onClick={handleAddItem} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Plus size={18} /> Ekle
                </Button>
            </div>

            {/* Data Grid */}
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-1 p-4 text-center border-r border-slate-800/50">#</div>
                    <div className="col-span-8 p-4 border-r border-slate-800/50">Hizmet Adı</div>
                    <div className="col-span-2 p-4 border-r border-slate-800/50">Fiyat</div>
                    <div className="col-span-1 p-4 text-center">İşlem</div>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center text-slate-500">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Kayıt yok.</div>
                ) : (
                    <div className="divide-y divide-slate-800 bg-slate-950/30">
                        {items.map((item, idx) => (
                            <div key={item.id} className="grid grid-cols-12 group hover:bg-slate-900/40 transition-colors">
                                <div className="col-span-1 p-3 text-center text-slate-600 flex items-center justify-center border-r border-slate-800/30">
                                    {idx + 1}
                                </div>

                                {/* NAME CELL */}
                                <div
                                    className="col-span-8 p-0 border-r border-slate-800/30 relative"
                                    onClick={() => handleCellClick(item.id, 'name')}
                                >
                                    {editingParams?.id === item.id && editingParams?.field === 'name' ? (
                                        <Input
                                            ref={inputRef}
                                            value={item.name}
                                            onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                                            onBlur={(e) => {
                                                saveChange(item.id, 'name', e.target.value)
                                                handleBlur()
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') e.currentTarget.blur()
                                            }}
                                            className="h-full w-full rounded-none border-0 bg-slate-900 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2 text-sm"
                                        />
                                    ) : (
                                        <div className="w-full h-full px-3 py-3 text-sm text-slate-200 cursor-text flex items-center">
                                            {item.name}
                                        </div>
                                    )}
                                </div>

                                {/* PRICE CELL */}
                                <div
                                    className="col-span-2 p-0 border-r border-slate-800/30 relative"
                                    onClick={() => handleCellClick(item.id, 'price')}
                                >
                                    {editingParams?.id === item.id && editingParams?.field === 'price' ? (
                                        <Input
                                            ref={inputRef}
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => handleChange(item.id, 'price', Number(e.target.value))}
                                            onBlur={(e) => {
                                                saveChange(item.id, 'price', Number(e.target.value))
                                                handleBlur()
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') e.currentTarget.blur()
                                            }}
                                            className="h-full w-full rounded-none border-0 bg-slate-900 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2 text-sm font-mono text-green-400"
                                        />
                                    ) : (
                                        <div className="w-full h-full px-3 py-3 text-sm text-green-400 font-mono cursor-text flex items-center">
                                            {item.price.toLocaleString('tr-TR')} ₺
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-1 p-2 flex items-center justify-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(item.id)}
                                        className="h-8 w-8 text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <p className="text-xs text-slate-500 italic text-center">
                * Değişiklikler hücreden çıkınca (tıklayınca) otomatik kaydedilir.
            </p>
        </div>
    )
}
