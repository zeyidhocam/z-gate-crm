import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import { getTelegramCredentials, sendTelegramMessage } from '@/lib/server/telegram'

interface SendTelegramBody {
    message?: string
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as SendTelegramBody
        const message = typeof body.message === 'string' ? body.message.trim() : ''

        if (!message) {
            return NextResponse.json(
                { ok: false, error: 'Mesaj eksik.' },
                { status: 400 }
            )
        }

        const accessToken = request.headers.get('authorization')
        const supabase = createServerSupabaseClient(accessToken)
        const credentials = await getTelegramCredentials(supabase)

        if (!credentials) {
            return NextResponse.json(
                { ok: false, error: 'Telegram ayarları bulunamadı.' },
                { status: 400 }
            )
        }

        const result = await sendTelegramMessage(credentials.token, credentials.chatId, message)

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error || 'Telegram hatası' },
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
