import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import { summarizeClientPayments } from '@/lib/server/payment-ledger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('telegram_bot_token, telegram_chat_id')
      .single()

    if (settingsError || !settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      return NextResponse.json({ ok: false, error: 'Telegram ayarlari bulunamadi.' }, { status: 400 })
    }

    const { telegram_bot_token: token, telegram_chat_id: chatId } = settings

    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    const bufferStart = new Date(oneHourLater.getTime() - 5 * 60 * 1000)
    const bufferEnd = new Date(oneHourLater.getTime() + 5 * 60 * 1000)

    const { data: upcomingAppointments } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, reservation_at, process_name, price_agreed')
      .gte('reservation_at', bufferStart.toISOString())
      .lte('reservation_at', bufferEnd.toISOString())
      .order('reservation_at', { ascending: true })

    if (!upcomingAppointments || upcomingAppointments.length === 0) {
      return NextResponse.json({ ok: true, message: 'Yaklasan randevu yok', count: 0 })
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`
    let sentCount = 0

    for (const client of upcomingAppointments) {
      const clientName = client.full_name || client.name || 'Isimsiz'
      const appointmentTime = client.reservation_at
        ? new Date(client.reservation_at).toLocaleString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'long',
          timeZone: 'Europe/Istanbul'
        })
        : '-'
      const price = (client.price_agreed || 0).toLocaleString('tr-TR')
      const payment = await summarizeClientPayments(supabase, client.id)

      const message = `⏰ <b>RANDEVU HATIRLATICI</b>\n\n` +
        `👤 <b>Musteri:</b> ${clientName}\n` +
        `📱 <b>Telefon:</b> <code>${client.phone || '-'}</code>\n` +
        `🕐 <b>Randevu:</b> ${appointmentTime}\n` +
        `🔮 <b>Islem:</b> ${client.process_name || '-'}\n` +
        `💰 <b>Fiyat:</b> ${price} TL\n` +
        `💳 <b>Kalan:</b> ${payment.remaining.toLocaleString('tr-TR')} TL\n` +
        `🔖 <b>Odeme Durumu:</b> ${payment.status}\n\n` +
        `<b>Randevuya 1 saat kaldi.</b>\n\n` +
        `<i>ID: <code>${client.id}</code></i>`

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

        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[appointment-reminder error for client ${client.id}]`, error)
      }
    }

    return NextResponse.json({
      ok: true,
      totalAppointments: upcomingAppointments.length,
      sentCount
    })
  } catch (error) {
    console.error('[appointment-reminders error]', error)
    return NextResponse.json({ ok: false, error: 'Sunucu hatasi' }, { status: 500 })
  }
}
