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

    // 2. Calculate Today's Range (Turkey Time)
    const now = new Date()
    const trtDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
    const startOfTrtDay = new Date(`${trtDateStr}T00:00:00.000+03:00`)
    const endOfTrtDay = new Date(`${trtDateStr}T23:59:59.999+03:00`)

    const todayStart = startOfTrtDay.toISOString()
    const todayEnd = endOfTrtDay.toISOString()

    // 3. Get Today's Appointments
    const { data: appointments } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, reservation_at, process_type, price_agreed')
      .gte('reservation_at', todayStart)
      .lte('reservation_at', todayEnd)
      .order('reservation_at', { ascending: true })
      .limit(10)

    const appointmentsCount = appointments?.length || 0

    // 4. Get Pending Payments (All time)
    const { data: pendingPayments } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, price_agreed, payment_status')
      .eq('payment_status', 'Ödenmedi')
      .limit(5)

    const pendingCount = pendingPayments?.length || 0
    const totalDebt = pendingPayments?.reduce((sum, client) => sum + (client.price_agreed || 0), 0) || 0

    // 5. Format Message
    const dateStr = startOfTrtDay.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    })

    let message = `<b>☀️ GÜNAYDINN! Z-GATE CRM SABAH RAPORU</b>
📅 <b>${dateStr}</b>

<b>📅 BUGÜNKÜ RANDEVULAR (${appointmentsCount})</b>
━━━━━━━━━━━━━━━━━━━━`

    if (appointmentsCount > 0) {
      appointments?.forEach((client, index) => {
        const clientName = client.full_name || client.name || 'İsimsiz'
        const time = new Date(client.reservation_at).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Istanbul'
        })
        const price = (client.price_agreed || 0).toLocaleString('tr-TR')

        message += `\n\n<b>${index + 1}.</b> <b>${clientName}</b>
🕐 Saat: <b>${time}</b>
📱 Tel: <code>${client.phone || '-'}</code>
🔮 İşlem: ${client.process_type || '-'}
💰 Fiyat: ${price} ₺`
      })
    } else {
      message += `\n\n✅ <i>Bugün randevu yok, rahat bir gün!</i>`
    }

    message += `\n\n<b>💸 ÖDEME BEKLEYENLERİ (${pendingCount})</b>
━━━━━━━━━━━━━━━━━━━━`

    if (pendingCount > 0) {
      message += `\n💰 <b>Toplam Borç:</b> ${totalDebt.toLocaleString('tr-TR')} ₺\n`

      pendingPayments?.slice(0, 3).forEach((client, index) => {
        const clientName = client.full_name || client.name || 'İsimsiz'
        const price = (client.price_agreed || 0).toLocaleString('tr-TR')

        message += `\n<b>${index + 1}.</b> ${clientName} - ${price} ₺`
      })

      if (pendingCount > 3) {
        message += `\n\n<i>...ve ${pendingCount - 3} kişi daha</i>`
      }
    } else {
      message += `\n\n✅ <i>Tüm ödemeler tamam!</i>`
    }

    message += `\n\n━━━━━━━━━━━━━━━━━━━━
<i>💡 Detay için /bugun veya /bekleyen komutlarını kullanabilirsiniz.</i>`

    // 6. Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`
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

    if (!telegramRes.ok) {
      return NextResponse.json({ ok: false, error: telegramRes.description }, { status: 400 })
    }

    return NextResponse.json({ ok: true, appointmentsCount, pendingCount, totalDebt })

  } catch (error) {
    console.error('[morning-report error]', error)
    return NextResponse.json({ ok: false, error: 'Sunucu hatası' }, { status: 500 })
  }
}
