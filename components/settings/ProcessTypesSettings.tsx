"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, DollarSign, GripVertical, List } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

// Types matching new SQL Schema
interface ProcessType {
    id: number // Changed to number
    name: string
    price: number // Changed from default_fee to price
}

export function ProcessTypesSettings() {
    const [items, setItems] = useState<ProcessType[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<ProcessType | null>(null)

    // Form State
    const [name, setName] = useState("")
    const [price, setPrice] = useState("0")

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('process_types')
            .select('*')
            .order('id', { ascending: true })

        if (!error && data) {
            setItems(data)
        } else {
            // Fallback/Empty state handled by UI
            setItems([])
        }
        setLoading(false)
    }

    const handleOpenDialog = (item?: ProcessType) => {
        if (item) {
            setEditingItem(item)
            setName(item.name)
            setPrice(item.price.toString())
        } else {
            setEditingItem(null)
            setName("")
            setPrice("0")
        }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        const itemData = {
            name,
            price: parseInt(price) || 0,
        }

        if (editingItem) {
            const { error } = await supabase
                .from('process_types')
                .update(itemData)
                .eq('id', editingItem.id)

            if (!error) fetchItems()
        } else {
            const { error } = await supabase
                .from('process_types')
                .insert([itemData])

            if (!error) fetchItems()
        }
        setDialogOpen(false)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Bu işlem türünü silmek istediğinize emin misiniz?')) {
            await supabase.from('process_types').delete().eq('id', id)
            fetchItems()
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-purple-400 mb-1">İşlem Türleri</h2>
                    <p className="text-slate-400 text-sm">Veritabanındaki işlem listesi.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Plus size={18} />
                    Yeni İşlem
                </Button>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <p className="text-slate-500 text-center py-8">Yükleniyor...</p>
                ) : items.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Henüz işlem türü eklenmemiş.</p>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl group hover:border-purple-500/30 transition-all">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-400">
                                <List size={20} />
                            </div>

                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-200">{item.name}</h3>
                                <p className="text-sm text-slate-500">{item.price.toLocaleString('tr-TR')} ₺</p>
                            </div>

                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)} className="hover:text-purple-400">
                                    <Edit2 size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="hover:text-red-400">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>İşlem Adı</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} className="bg-slate-950 border-slate-700" placeholder="Örn: Yıldızname" />
                        </div>

                        <div className="space-y-2">
                            <Label>Ücret (₺)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    className="bg-slate-950 border-slate-700 pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-700 hover:bg-slate-800">İptal</Button>
                        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
