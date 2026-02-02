"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Edit2, MessageSquare } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

interface Template {
    id: number
    title: string
    content: string
}

export function TemplateSettings() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<Template | null>(null)
    const [formData, setFormData] = useState({ title: '', content: '' })

    useEffect(() => {
        fetchTemplates()
    }, [])

    const fetchTemplates = async () => {
        setLoading(true)
        const { data } = await supabase.from('message_templates').select('*').order('id', { ascending: true })
        if (data) setTemplates(data)
        setLoading(false)
    }

    const handleOpen = (item?: Template) => {
        if (item) {
            setEditingItem(item)
            setFormData({ title: item.title, content: item.content })
        } else {
            setEditingItem(null)
            setFormData({ title: '', content: '' })
        }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (editingItem) {
            await supabase.from('message_templates').update(formData).eq('id', editingItem.id)
        } else {
            await supabase.from('message_templates').insert([formData])
        }
        setDialogOpen(false)
        fetchTemplates()
    }

    const handleDelete = async (id: number) => {
        if (confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
            await supabase.from('message_templates').delete().eq('id', id)
            fetchTemplates()
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 mb-2">Mesaj Şablonları</h2>
                    <p className="text-slate-400">WhatsApp hızlı mesajları için şablonlar.</p>
                </div>
                <Button onClick={() => handleOpen()} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Plus size={18} /> Yeni Şablon
                </Button>
            </div>
            <Separator className="bg-slate-800" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(t => (
                    <div key={t.id} className="p-5 bg-slate-950/50 border border-slate-800 rounded-xl relative group hover:border-purple-500/30 transition-all">
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleOpen(t)} className="h-8 w-8 hover:bg-slate-800 text-slate-400 hover:text-white"><Edit2 size={14} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 hover:bg-red-900/20 text-slate-400 hover:text-red-400"><Trash2 size={14} /></Button>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <MessageSquare size={18} className="text-green-500" />
                            </div>
                            <h3 className="font-bold text-slate-200">{t.title}</h3>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{t.content}</p>
                    </div>
                ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Şablonu Düzenle' : 'Yeni Şablon'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Başlık</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="bg-slate-950 border-slate-700"
                                placeholder="Örn: IBAN"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mesaj İçeriği</Label>
                            <Textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                className="bg-slate-950 border-slate-700 h-32"
                                placeholder="Mesajınız..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-slate-800">İptal</Button>
                        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
