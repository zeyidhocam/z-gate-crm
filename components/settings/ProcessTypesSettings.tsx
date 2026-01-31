
'use client'

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, GripVertical, Check, Palette, DollarSign } from "lucide-react"
import * as Icons from "lucide-react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

// Types
interface ProcessType {
    id: string
    name: string
    default_fee: number
    icon: string
    color: string
}

const AVAILABLE_ICONS = [
    'Scissors', 'Brush', 'SprayCan', 'Sparkles', 'Ghost', 'Gem', 'Crown',
    'Zap', 'Heart', 'Star', 'Moon', 'Sun'
]

const AVAILABLE_COLORS = [
    '#7C3AED', '#2563EB', '#DB2777', '#DC2626', '#EA580C',
    '#D97706', '#65A30D', '#059669', '#0891B2', '#475569'
]

export function ProcessTypesSettings() {
    const [items, setItems] = useState<ProcessType[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<ProcessType | null>(null)

    // Form State
    const [name, setName] = useState("")
    const [fee, setFee] = useState("0")
    const [selectedIcon, setSelectedIcon] = useState("Sparkles")
    const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0])

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('process_types')
            .select('*')
            .order('created_at', { ascending: true }) // In real app, order by rank

        if (!error && data) {
            setItems(data)
        } else {
            // Mock Data if Supabase is empty or unconnected
            setItems([
                { id: '1', name: 'Bağlama', default_fee: 3500, icon: 'Link', color: '#7C3AED' },
                { id: '2', name: 'Geri Getirme', default_fee: 4200, icon: 'Undo2', color: '#22D3EE' },
                { id: '3', name: 'Rızık Açma', default_fee: 2800, icon: 'Sun', color: '#F59E0B' },
            ])
        }
        setLoading(false)
    }

    const handleOpenDialog = (item?: ProcessType) => {
        if (item) {
            setEditingItem(item)
            setName(item.name)
            setFee(item.default_fee.toString())
            setSelectedIcon(item.icon)
            setSelectedColor(item.color)
        } else {
            setEditingItem(null)
            setName("")
            setFee("0")
            setSelectedIcon("Sparkles")
            setSelectedColor(AVAILABLE_COLORS[0])
        }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        const newItem = {
            name,
            default_fee: parseInt(fee) || 0,
            icon: selectedIcon,
            color: selectedColor
        }

        if (editingItem) {
            // Update (Mocked for now)
            setItems(items.map(i => i.id === editingItem.id ? { ...i, ...newItem } : i))
        } else {
            // Create (Mocked for now)
            setItems([...items, { id: Date.now().toString(), ...newItem } as any])
        }
        setDialogOpen(false)
    }

    const handleDelete = (id: string) => {
        if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
            setItems(items.filter(i => i.id !== id))
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-purple-400 mb-1">İşlem Tipleri</h2>
                    <p className="text-slate-400 text-sm">Sunduğunuz hizmetleri buradan yönetebilirsiniz.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Plus size={18} />
                    Yeni İşlem
                </Button>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <p className="text-slate-500 text-center py-8">Yükleniyor...</p>
                ) : (
                    items.map((item) => {
                        const IconComponent = (Icons as any)[item.icon] || Icons.HelpCircle
                        return (
                            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl group hover:border-purple-500/30 transition-all">
                                <GripVertical className="text-slate-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" size={20} />

                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center border-2"
                                    style={{
                                        backgroundColor: `${item.color}20`,
                                        borderColor: item.color,
                                        color: item.color
                                    }}
                                >
                                    <IconComponent size={20} />
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-200">{item.name}</h3>
                                    <p className="text-sm text-slate-500">Varsayılan: {item.default_fee} ₺</p>
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
                        )
                    })
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
                            <Input value={name} onChange={e => setName(e.target.value)} className="bg-slate-950 border-slate-700" placeholder="Örn: Bağlama Büyüsü" />
                        </div>

                        <div className="space-y-2">
                            <Label>Varsayılan Ücret (₺)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                <Input
                                    type="number"
                                    value={fee}
                                    onChange={e => setFee(e.target.value)}
                                    className="bg-slate-950 border-slate-700 pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>İkon</Label>
                            <ScrollArea className="h-[120px] rounded-md border border-slate-800 bg-slate-950 p-4">
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_ICONS.map(icon => {
                                        const IconComp = (Icons as any)[icon] || Icons.HelpCircle
                                        const isSelected = selectedIcon === icon
                                        return (
                                            <button
                                                key={icon}
                                                onClick={() => setSelectedIcon(icon)}
                                                className={`p-2 rounded-lg border transition-all ${isSelected ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                                            >
                                                <IconComp size={20} />
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="space-y-2">
                            <Label>Renk Etiketi</Label>
                            <div className="flex flex-wrap gap-3">
                                {AVAILABLE_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
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
