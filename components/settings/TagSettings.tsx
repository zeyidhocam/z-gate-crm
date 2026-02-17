"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

export function TagSettings() {
    const [tags, setTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState("")
    const [status, setStatus] = useState<string | null>(null)

    useEffect(() => {
        supabase.from('system_settings').select('customer_tags').single().then(({ data, error }) => {
            if (!error && data && (data as any).customer_tags) {
                setTags((data as any).customer_tags || [])
            } else {
                const local = localStorage.getItem('customer_tags')
                if (local) setTags(JSON.parse(local))
            }
        }).catch(() => {
            const local = localStorage.getItem('customer_tags')
            if (local) setTags(JSON.parse(local))
        })
    }, [])

    const handleAdd = () => {
        const t = newTag.trim()
        if (!t) return
        if (!tags.includes(t)) setTags(prev => [...prev, t])
        setNewTag("")
    }

    const handleRemove = (t: string) => setTags(prev => prev.filter(x => x !== t))

    const handleSave = async () => {
        setStatus('Kaydediliyor...')
        try {
            const { error } = await supabase.from('system_settings').update({ customer_tags: tags }).eq('id', 1)
            if (error) throw error
            localStorage.setItem('customer_tags', JSON.stringify(tags))
            setStatus('Kaydedildi')
            setTimeout(() => setStatus(null), 1500)
        } catch {
            // Fallback to localStorage
            localStorage.setItem('customer_tags', JSON.stringify(tags))
            setStatus('Sunucuya kaydetme başarısız oldu — yerel olarak kaydedildi.')
            setTimeout(() => setStatus(null), 2500)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-slate-100">Müşteri Etiketleri</h2>
                <p className="text-sm text-slate-400">Müşteri etiketlerini burada oluşturun ve düzenleyin. Etiketler kayıt formunda öneri olarak gösterilecektir.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs text-slate-400">Yeni Etiket</Label>
                    <div className="flex gap-2">
                        <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Örn: VIP" className="bg-slate-900/50" />
                        <Button onClick={handleAdd}>Ekle</Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map(t => (
                            <button key={t} onClick={() => handleRemove(t)} className="px-3 py-1 rounded-md bg-slate-800 text-slate-200 text-sm">{t} — Kaldır</button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col justify-between">
                    <div className="text-sm text-slate-400">Kaydettiğiniz etiketler tüm yeni müşteri kayıtlarında öneri olarak görünür.</div>
                    <div className="mt-4">
                        <Button onClick={handleSave}>{status || 'Kaydet'}</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
