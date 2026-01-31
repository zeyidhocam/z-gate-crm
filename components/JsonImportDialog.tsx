
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

            // Perform Mapping (Flutter logic replication)
            const leadData = {
                name: json['isim_soyisim'] || 'Bilinmeyen',
                phone: json['telefon'] || '',
                source: 'JSON Import',
                process_name: json['islem'] || 'Bilinmeyen',
                status: 'Yeni', // Default status from Flutter app
                price: json['ucret'] ? parseFloat(json['ucret']) : null,
                ai_summary: json['detay'] || null,
                created_at: json['sistem']?.['olusturulma_tarihi'] || new Date().toISOString(),
            }

            // Check configuration
            if (!('auth' in supabase)) {
                // Mock success
                setSuccess(`[DEMO] ✅ ${leadData.name} başarıyla eklendi! (Veritabanı bağlı değil)`)
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
                .from('leads')
                .insert([leadData])

            if (dbError) throw dbError

            setSuccess(`✅ ${leadData.name} başarıyla eklendi!`)
            if (onSuccess) onSuccess()

            // Close dialog after 2 seconds on success
            setTimeout(() => {
                setIsOpen(false)
                setSuccess(null)
            }, 2000)

        } catch (err: any) {
            console.error(err)

            let errorMessage = err.message || "Bilinmeyen bir hata oluştu"

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
