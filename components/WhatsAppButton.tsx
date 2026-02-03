"use client"

import { MessageCircle, Send } from "lucide-react"
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
}

// Hazır mesaj şablonları
const MESSAGE_TEMPLATES = [
    {
        id: 1,
        name: "Randevu Hatırlatma",
        icon: "📅",
        message: (name: string) => `Merhaba ${name}, randevunuzu hatırlatmak isteriz. Sizi bekliyoruz! 🙏`
    },
    {
        id: 2,
        name: "Teşekkür",
        icon: "💖",
        message: (name: string) => `Merhaba ${name}, bizi tercih ettiğiniz için teşekkür ederiz! Tekrar görüşmek üzere. ✨`
    },
    {
        id: 3,
        name: "Yeni Kampanya",
        icon: "🎉",
        message: (name: string) => `Merhaba ${name}, sizin için özel bir kampanyamız var! Detaylar için bizimle iletişime geçin. 🌟`
    },
    {
        id: 4,
        name: "Boş Mesaj",
        icon: "💬",
        message: () => ""
    }
]

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

export function WhatsAppButton({ phone, clientName = "Değerli Müşteri", className, size = "default" }: WhatsAppButtonProps) {
    if (!phone) return null

    const formattedPhone = formatPhoneForWhatsApp(phone)

    const openWhatsApp = (message: string) => {
        const encodedMessage = encodeURIComponent(message)
        const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`
        window.open(url, '_blank')
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size={size === "sm" ? "sm" : "default"}
                    className={cn(
                        "text-green-500 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-all",
                        size === "sm" ? "h-9 w-9 p-0" : "gap-2",
                        className
                    )}
                >
                    <MessageCircle size={18} />
                    {size !== "sm" && <span className="text-xs font-bold">WhatsApp</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide px-2 py-1">
                        Mesaj Şablonu Seç
                    </p>
                    {MESSAGE_TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => openWhatsApp(template.message(clientName))}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cyan-500/10 transition-colors text-left group"
                        >
                            <span className="text-lg">{template.icon}</span>
                            <span className="text-sm text-slate-300 font-medium group-hover:text-cyan-300 transition-colors">
                                {template.name}
                            </span>
                            <Send size={14} className="ml-auto text-slate-600 group-hover:text-green-400 transition-colors" />
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
