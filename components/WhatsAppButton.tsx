"use client"

import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface WhatsAppButtonProps {
    phone: string | null | undefined
    clientName?: string
    className?: string
    size?: "sm" | "default"
    processName?: string | null
    reservationDate?: string | null // ISO string
}

// WhatsApp Icon SVG
const WhatsAppIcon = ({ size = 18, className }: { size?: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M17.472 14.382C17.119 14.207 15.385 13.353 15.061 13.235C14.737 13.117 14.502 13.058 14.267 13.411C14.032 13.764 13.356 14.558 13.15 14.793C12.944 15.028 12.738 15.058 12.384 14.881C12.031 14.705 10.893 14.332 9.544 13.129C8.477 12.177 7.756 11.002 7.55 10.649C7.344 10.295 7.528 10.111 7.705 9.934C7.863 9.776 8.056 9.522 8.232 9.316C8.409 9.11 8.468 8.934 8.585 8.701C8.703 8.466 8.644 8.261 8.556 8.084C8.468 7.907 7.761 6.173 7.467 5.467C7.182 4.79 6.894 4.877 6.678 4.877C6.472 4.877 6.236 4.877 6.001 4.877C5.766 4.877 5.384 4.965 5.06 5.318C4.737 5.671 3.824 6.524 3.824 8.258C3.824 9.992 5.089 11.726 5.265 11.961C5.441 12.196 7.824 15.871 11.47 17.443C12.338 17.817 13.016 18.04 13.542 18.207C14.384 18.474 15.148 18.435 15.753 18.345C16.425 18.245 17.825 17.498 18.118 16.674C18.412 15.851 18.412 15.145 18.324 14.998C18.235 14.851 17.824 14.558 17.472 14.382Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M12.008 0C5.377 0 0.016 5.394 0.016 12.025C0.016 14.153 0.57 16.147 1.543 17.901L0 23.504L5.758 21.996C7.436 22.906 9.336 23.407 11.272 23.407H11.277C18.477 23.399 24.005 18.277 24.005 11.998C24.002 8.783 22.753 5.767 20.485 3.49C18.217 1.214 15.204 0.002 12.008 0.002V0ZM12.008 21.396C10.287 21.396 8.653 20.941 7.215 20.088L7.424 19.965L3.924 20.883L4.852 17.48L4.636 17.136C3.659 15.589 3.143 13.791 3.143 11.933C3.143 7.025 7.123 3.033 12.013 3.033C14.386 3.033 16.611 3.961 18.288 5.645C19.965 7.329 20.886 9.566 20.882 11.933C20.882 16.897 16.902 20.889 12.008 20.889V21.396Z" />
    </svg>
)

// Telefon numarasını WhatsApp formatına çevir
function formatPhoneForWhatsApp(phone: string): string {
    // Türkiye formatı için
    let cleaned = phone.replace(/\D/g, '')

    // 0 ile başlıyorsa kaldır
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1)
    }

    // 90 ile başlamıyorsa ekle (Türkiye kodu)
    if (!cleaned.startsWith('90')) {
        cleaned = '90' + cleaned
    }

    return cleaned
}

export function WhatsAppButton({
    phone,
    clientName = "Değerli Müşteri",
    className,
    size = "default",
    processName,
    reservationDate
}: WhatsAppButtonProps) {
    if (!phone) return null

    const formattedPhone = formatPhoneForWhatsApp(phone)

    const getReservationText = () => {
        if (!reservationDate) return ''
        const date = new Date(reservationDate)
        // Format: 8 Şubat (Yarın) veya sadece tarih
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
    }

    // Hazır mesaj şablonları (Dynamic)
    const templates = [
        {
            id: 1,
            name: "Randevu Teyit",
            icon: "📅",
            message: () => `Merhaba ${clientName}, ${getReservationText()} tarihindeki ${processName || 'işlem'} randevunuzu teyit etmek için yazıyorum. Müsait misiniz?`
        },
        {
            id: 2,
            name: "İşlem Bilgi",
            icon: "ℹ️",
            message: () => `Merhaba ${clientName}, ${processName || 'işlem'} süreciniz hakkında bilgi vermek istedim. Herhangi bir sorunuz var mı?`
        },
        {
            id: 3,
            name: "Konum",
            icon: "📍",
            message: () => `Merhaba, ofisimizin konumu: [Konum Linki Buraya] - Geldiğinizde haber verebilirsiniz.`
        },
        {
            id: 4,
            name: "Teşekkür",
            icon: "💖",
            message: () => `Merhaba ${clientName}, bizi tercih ettiğiniz için teşekkür ederiz! Tekrar görüşmek üzere. ✨`
        },
        {
            id: 5,
            name: "Boş Mesaj",
            icon: "💬",
            message: () => ""
        }
    ]

    const openWhatsApp = (message: string) => {
        const encodedMessage = encodeURIComponent(message)
        // whatsapp:// protokolü masaüstü uygulamasını tetikler
        const url = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`
        window.open(url, "_self")
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size={size === "sm" ? "sm" : "default"}
                    className={cn(
                        "text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-xl transition-all duration-150 flex items-center justify-center",
                        size === "sm" ? "h-9 w-9 p-0" : "p-0",
                        className
                    )}
                >
                    <WhatsAppIcon size={size === "sm" ? 18 : 20} className="fill-current" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
                <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide px-2 py-1">
                        Mesaj Şablonu Seç
                    </p>
                    {templates.map(template => (
                        <button
                            key={template.id}
                            onClick={() => openWhatsApp(template.message())}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cyan-500/10 transition-colors duration-150 text-left group"
                        >
                            <span className="text-lg">{template.icon}</span>
                            <div className="flex flex-col">
                                <span className="text-sm text-slate-300 font-medium group-hover:text-cyan-300 transition-colors">
                                    {template.name}
                                </span>
                                {template.id === 1 && reservationDate && (
                                    <span className="text-[10px] text-slate-500">
                                        {getReservationText()}
                                    </span>
                                )}
                            </div>
                            <Send size={14} className="ml-auto text-slate-600 group-hover:text-[#25D366] transition-colors" />
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
