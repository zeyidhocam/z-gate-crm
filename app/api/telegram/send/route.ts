
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { message, token, chatId } = await request.json()

        if (!message || !token || !chatId) {
            return NextResponse.json(
                { ok: false, error: 'Mesaj, token veya chat ID eksik.' },
                { status: 400 }
            )
        }

        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        })

        const data = await response.json()

        if (!data.ok) {
            return NextResponse.json(
                { ok: false, error: data.description || 'Telegram hatası' },
                { status: 400 }
            )
        }

        return NextResponse.json({ ok: true })

    } catch {
        // Hata kaydi gizlendi
        return NextResponse.json(
            { ok: false, error: 'Sunucu hatası' },
            { status: 500 }
        )
    }
}
