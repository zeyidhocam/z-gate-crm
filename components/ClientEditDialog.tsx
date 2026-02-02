"use client"

import { useState, useEffect } from "react"
import { Edit } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface Client {
    id: string
    full_name: string | null
    phone: string | null
    notes: string | null
    price_agreed: number | null
    process_type_id: number | null
    // Add other fields as needed for the form
}

interface ProcessType {
    id: number
    name: string
}

interface ClientEditDialogProps {
    client: Client | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (updatedClient: Client) => void
    processTypes: ProcessType[]
}

export function ClientEditDialog({ client, open, onOpenChange, onSave, processTypes }: ClientEditDialogProps) {
    const [formData, setFormData] = useState<Client | null>(null)

    useEffect(() => {
        if (client) {
            setFormData({ ...client })
        }
    }, [client])

    const handleSave = () => {
        if (formData) {
            onSave(formData)
            onOpenChange(false)
        }
    }

    if (!formData) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0F111A] border-slate-800 text-slate-200 max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Edit size={22} className="text-orange-400" />
                        Müşteri Düzenle
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-slate-500 text-xs font-bold uppercase">İsim Soyisim</Label>
                        <Input
                            value={formData.full_name || ''}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="bg-slate-900 border-slate-800 focus:border-orange-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-500 text-xs font-bold uppercase">Telefon</Label>
                        <Input
                            value={formData.phone || ''}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="bg-slate-900 border-slate-800 focus:border-orange-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-500 text-xs font-bold uppercase">Anlaşılan Fiyat (TL)</Label>
                        <Input
                            type="number"
                            value={formData.price_agreed || ''}
                            onChange={(e) => setFormData({ ...formData, price_agreed: Number(e.target.value) })}
                            className="bg-slate-900 border-slate-800 focus:border-orange-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-500 text-xs font-bold uppercase">İşlem Türü</Label>
                        <Select
                            value={formData.process_type_id?.toString()}
                            onValueChange={(val) => setFormData({ ...formData, process_type_id: Number(val) })}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-800">
                                <SelectValue placeholder="İşlem seç..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                                {processTypes.map(pt => (
                                    <SelectItem key={pt.id} value={pt.id.toString()}>{pt.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="col-span-2 space-y-2">
                        <Label className="text-slate-500 text-xs font-bold uppercase">Notlar & Detaylar</Label>
                        <Textarea
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="bg-slate-900 border-slate-800 focus:border-orange-500/50 min-h-[120px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-slate-900 hover:text-white">İptal</Button>
                    <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
