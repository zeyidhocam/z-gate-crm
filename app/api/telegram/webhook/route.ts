
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Helper to send message back to Telegram
async function sendMessage(token: string, chatId: string, text: string) {
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        })
    } catch (e) {
        console.error('Error sending telegram message:', e)
    }
}

export async function POST(request: Request) {
    try {
        const update = await request.json()

        // Basic validation of Telegram Update object
        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true }) // Acknowledge to stop retries
        }

        const chatId = update.message.chat.id
        const text = update.message.text

        // Setup Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Verify Bot Token from DB (to ensure we reply with correct bot)
        // Optimization: In a high-traffic webhook, you might want to cache this or use env vars directly.
        // For now, fetching is safe.
        const { data: settings } = await supabase
            .from('system_settings')
            .select('telegram_bot_token')
            .single()

        const token = settings?.telegram_bot_token

        if (!token) {
            console.error('Telegram token not found in settings')
            return NextResponse.json({ ok: false, error: 'Settings missing' }, { status: 500 })
        }

        // 1. Check for Commands
        if (text.startsWith('/')) {
            if (text === '/start') {
                await sendMessage(token, chatId, "👋 Merhaba! Ben Z-Gate CRM asistanıyım.\n\nBana JSON formatında müşteri bilgisi atarsan senin için kayıt oluşturabilirim.\n\n<b>Örnek:</b>\n<code>{\"name\": \"Ahmet Yılmaz\", \"phone\": \"05551112233\"}</code>")
            } else if (text === '/id') {
                await sendMessage(token, chatId, `🆔 Chat ID: <code>${chatId}</code>`)
            } else {
                await sendMessage(token, chatId, "❓ Bilinmeyen komut. Yardım için /start yazabilirsin.")
            }
            return NextResponse.json({ ok: true })
        }

        // 2. Try JSON Parsing
        try {
            // Cleanup: Sometimes phones copy-paste with smart quotes or extra spaces
            const cleanText = text.trim()

            if (!cleanText.startsWith('{')) {
                // Not a JSON object
                // Silent ignore or helpful hint? Let's ignore normal chat to avoid spamming, 
                // unless it looks like they tried.
                return NextResponse.json({ ok: true })
            }

            const data = JSON.parse(cleanText)

            // Validate required fields (Support both 'name' and 'full_name')
            const clientName = data.name || data.full_name
            if (!clientName) {
                await sendMessage(token, chatId, "⚠️ <b>Hata:</b> 'name' veya 'full_name' alanı zorunludur.\n\nÖrnek:\n<code>{\"name\": \"Ali\"}</code>")
                return NextResponse.json({ ok: true })
            }

            // Clean price string (e.g. "9.000 TL" -> 9000)
            let price = 0
            if (data.price) {
                if (typeof data.price === 'number') price = data.price
                else if (typeof data.price === 'string') {
                    // Remove TL, dots, spaces
                    price = parseFloat(data.price.replace(/[^\d]/g, '')) || 0
                }
            }

            // Insert into Supabase
            const { data: newClient, error } = await supabase
                .from('clients')
                .insert({
                    full_name: clientName,
                    phone: data.phone || null,
                    notes: data.notes || data.note || "Telegram üzerinden oluşturuldu",
                    price_agreed: price,
                    status: data.status || 'Rehber',
                    process_name: data.process_name || null,
                    ai_summary: data.ai_summary || null,
                    reservation_at: data.reservation_at ? new Date(data.reservation_at).toISOString() : null,
                    payment_status: data.payment_status || null,
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) throw error

            await sendMessage(token, chatId, `✅ <b>Kayıt Başarılı!</b>\n\n👤 <b>İsim:</b> ${newClient.full_name}\n📞 <b>Tel:</b> ${newClient.phone || '-'}\n💰 <b>Fiyat:</b> ${newClient.price_agreed?.toLocaleString('tr-TR')} ₺`)

        } catch (e) {
            if (e instanceof SyntaxError) {
                await sendMessage(token, chatId, "⚠️ <b>JSON Hatası:</b> Gönderdiğin formatı anlayamadım.\n\nLütfen tırnak işaretlerine ve parantezlere dikkat et.")
            } else {
                console.error('Db Error:', e)
                await sendMessage(token, chatId, "❌ <b>Veritabanı Hatası:</b> Kayıt oluşturulurken bir sorun çıktı.")
            }
        }

        return NextResponse.json({ ok: true })

    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 })
    }
}
