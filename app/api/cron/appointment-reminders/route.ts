import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get Telegram Settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('telegram_bot_token, telegram_chat_id')
      .single()

    if (settingsError || !settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      return NextResponse.json({ ok: false, error: 'Telegram ayarları bulunamadı.' }, { status: 400 })
    }

    const { telegram_bot_token: token, telegram_chat_id: chatId } = settings

    // 2. Calculate Time Range (1 hour from now, ±5 minutes buffer)
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour
    const bufferStart = new Date(oneHourLater.getTime() - 5 * 60 * 1000) // -5 min
    const bufferEnd = new Date(oneHourLater.getTime() + 5 * 60 * 1000) // +5 min

    const startISO = bufferStart.toISOString()
    const endISO = bufferEnd.toISOString()

    // 3. Get Appointments in 1 Hour
    const { data: upcomingAppointments } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, reservation_at, process_type, price_agreed, payment_status')
      .gte('reservation_at', startISO)
      .lte('reservation_at', endISO)
      .order('reservation_at', { ascending: true })

    if (!upcomingAppointments || upcomingAppointments.length === 0) {
      return NextResponse.json({ ok: true, message: 'Yaklaşan randevu yok', count: 0 })
    }

    // 4. Send Reminders
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`
    let sentCount = 0

    for (const client of upcomingAppointments) {
      const clientName = client.full_name || client.name || 'İsimsiz'
      const appointmentTime = new Date(client.reservation_at).toLocaleString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Istanbul'
      })
      const price = (client.price_agreed || 0).toLocaleString('tr-TR')

      const message = `⏰ <b>RANDEVU HATIRLATICI!</b>

👤 <b>Müşteri:</b> ${clientName}
📱 <b>Telefon:</b> <code>${client.phone || '-'}</code>
🕐 <b>Randevu:</b> ${appointmentTime}
🔮 <b>İşlem:</b> ${client.process_type || '-'}
💰 <b>Fiyat:</b> ${price} ₺
💳 <b>Ödeme:</b> ${client.payment_status || 'Belirtilmedi'}

🔔 <b>Randevuya 1 saat kaldı!</b>

━━━━━━━━━━━━━━━━━━━━
<i>ID: <code>${client.id}</code></i>`

      try {
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
          })
        })

        const telegramRes = await response.json()

        if (telegramRes.ok) {
          sentCount++
        }

        // Rate limit protection (max 30 messages/second for Telegram)
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`[reminder error for client ${client.id}]`, error)
      }
    }

    return NextResponse.json({
      ok: true,
      totalAppointments: upcomingAppointments.length,
      sentCount
    })

  } catch (error) {
    console.error('[appointment-reminders error]', error)
    return NextResponse.json({ ok: false, error: 'Sunucu hatası' }, { status: 500 })
  }
}
