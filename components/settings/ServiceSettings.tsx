"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, List } from "lucide-react"

interface ProcessType {
    id: number
    name: string
    price: number
}

export function ServiceSettings() {
    const [items, setItems] = useState<ProcessType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        setLoading(true)
        const { data } = await supabase.from('process_types').select('*').order('id', { ascending: true })
        if (data) setItems(data)
        setLoading(false)
    }

    const handleUpdate = async (id: number, field: keyof ProcessType, value: any) => {
        // Optimistic update
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))

        // DB Update
        await supabase.from('process_types').update({ [field]: value }).eq('id', id)
    }

    const handleCreate = async () => {
        const { data, error } = await supabase
            .from('process_types')
            .insert([{ name: 'Yeni İşlem', price: 0 }])
            .select()

        if (data) {
            setItems([...items, data[0]])
        }
    }

    const handleDelete = async (id: number) => {
        if (confirm('Silmek istediğinize emin misiniz?')) {
            await supabase.from('process_types').delete().eq('id', id)
            setItems(items.filter(i => i.id !== id))
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 mb-2">Hizmet ve Fiyat Yönetimi</h2>
                    <p className="text-slate-400">İşlem türlerini ve fiyatlarını doğrudan düzenleyin.</p>
                </div>
                <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Plus size={18} /> Yeni Ekle
                </Button>
            </div>
            <Separator className="bg-slate-800" />

            <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 font-medium">
                        <tr>
                            <th className="p-4 w-12 text-center">#</th>
                            <th className="p-4">İşlem Adı</th>
                            <th className="p-4 w-48">Fiyat (TL)</th>
                            <th className="p-4 w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950/30">
                        {items.map((item, idx) => (
                            <tr key={item.id} className="group hover:bg-slate-900/50 transition-colors">
                                <td className="p-4 text-center text-slate-600">{idx + 1}</td>
                                <td className="p-4">
                                    <Input
                                        value={item.name}
                                        onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                                        className="bg-transparent border-transparent hover:border-slate-700 focus:bg-slate-950 focus:border-purple-500 h-9"
                                    />
                                </td>
                                <td className="p-4">
                                    <Input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => handleUpdate(item.id, 'price', Number(e.target.value))}
                                        className="bg-transparent border-transparent hover:border-slate-700 focus:bg-slate-950 focus:border-purple-500 h-9 font-mono text-green-400"
                                    />
                                </td>
                                <td className="p-4 text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(item.id)}
                                        className="opacity-20 group-hover:opacity-100 hover:bg-red-900/20 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    Kayıtlı işlem bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
