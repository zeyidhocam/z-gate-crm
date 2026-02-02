
'use client'

import { useState } from "react"
import { Upload, FileJson, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"

interface JsonImportDialogProps {
    onSuccess?: () => void
}

export function JsonImportDialog({ onSuccess }: JsonImportDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const text = await file.text()
            const json = JSON.parse(text)

            // 1. Fetch Process Types to Map "islem" string to ID
            const { data: processTypes } = await supabase.from('process_types').select('id, name')

            // Helper to find process ID
            const findProcessId = (name: string) => {
                if (!processTypes || !name) return null
                const found = processTypes.find(p => p.name.toLowerCase() === name.toLowerCase())
                return found ? found.id : null
            }

            const clientData = {
                full_name: json['isim_soyisim'] || 'Bilinmeyen Müşteri',
                phone: json['telefon'] || null,
                // Map 'islem' name to ID
                process_type_id: findProcessId(json['islem']),

                status: json['durum'] || 'Yeni',
                price_agreed: json['ucret'] ? parseInt(json['ucret']) : 0,
                notes: json['detay'] || null,
                created_at: new Date().toISOString(),
            }

            // Check configuration
            if (!('auth' in supabase)) {
                // Mock success
                setSuccess(`[DEMO] ✅ ${clientData.full_name} başarıyla eklendi! (Veritabanı bağlı değil)`)
                if (onSuccess) onSuccess()
                setTimeout(() => {
                    setIsOpen(false)
                    setSuccess(null)
                }, 2000)
                setIsLoading(false)
                event.target.value = ''
                return
            }

            // Insert into Supabase
            const { error: dbError } = await supabase
                .from('clients')
                .insert([clientData])

            if (dbError) throw dbError

            setSuccess(`✅ ${clientData.full_name} başarıyla eklendi!`)
            if (onSuccess) onSuccess()

            // Close dialog after 2 seconds on success
            setTimeout(() => {
                setIsOpen(false)
                setSuccess(null)
            }, 2000)



        } catch (err: unknown) {
            console.error(err)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let errorMessage = (err as any)?.message || "Bilinmeyen bir hata oluştu"

            // Check for missing table error
            if (errorMessage.includes("Could not find the table") || errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
                errorMessage = "Veritabanı tabloları bulunamadı! Lütfen Supabase SQL Editor'e giderek size verdiğim 'supabase_schema.sql' kodlarını çalıştırın."
            }

            setError(errorMessage)
        } finally {
            setIsLoading(false)
            // Reset input
            event.target.value = ''
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2 border-0 shadow-lg shadow-purple-900/20 transition-all duration-300 hover:scale-[1.02]">
                    <Upload size={18} />
                    JSON Yükle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle>JSON Müşteri Kaydı Yükle</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Müşteri verilerini içeren .json dosyasını seçin.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    {!isLoading && !success && !error && (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileJson className="w-8 h-8 mb-2 text-slate-400" />
                                <p className="mb-2 text-sm text-slate-400">
                                    <span className="font-semibold">Yüklemek için tıklayın</span>
                                </p>
                                <p className="text-xs text-slate-500">.json dosyaları</p>
                            </div>
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </label>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            <p className="text-sm text-slate-400">Yükleniyor...</p>
                        </div>
                    )}

                    {success && (
                        <div className="flex flex-col items-center gap-2 text-green-400 bg-green-500/10 p-4 rounded-lg w-full">
                            <CheckCircle size={24} />
                            <p className="text-sm font-medium">{success}</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-lg w-full text-center">
                            <AlertCircle size={24} />
                            <p className="text-sm font-medium">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setError(null)}
                                className="mt-2 border-red-500/30 hover:bg-red-500/20 text-red-300"
                            >
                                Tekrar Dene
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
