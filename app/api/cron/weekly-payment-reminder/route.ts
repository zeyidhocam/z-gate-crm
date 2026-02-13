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

    // 2. Get All Unpaid Clients
    const { data: unpaidClients } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, price_agreed, reservation_at, process_type, created_at')
      .eq('payment_status', 'Ödenmedi')
      .order('price_agreed', { ascending: false })

    if (!unpaidClients || unpaidClients.length === 0) {
      // Send "all clear" message
      const message = `✅ <b>HAFTALIK ÖDEME TAKİBİ</b>

🎉 <b>Harika haber!</b>

Tüm ödemeler tamam! Ödenmemiş müşteri yok.

━━━━━━━━━━━━━━━━━━━━
<i>📅 ${new Date().toLocaleDateString('tr-TR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Istanbul'
})}</i>`

      const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      })

      return NextResponse.json({ ok: true, unpaidCount: 0 })
    }

    // 3. Calculate Statistics
    const totalDebt = unpaidClients.reduce((sum, client) => sum + (client.price_agreed || 0), 0)
    const oldestUnpaid = unpaidClients
      .filter(c => c.created_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

    // 4. Format Message
    const dateStr = new Date().toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    })

    let message = `⚠️ <b>HAFTALIK ÖDEME TAKİBİ</b>
📅 <b>${dateStr}</b>

<b>💸 ÖDEME BEKLEYENLERİ</b>
━━━━━━━━━━━━━━━━━━━━

📊 <b>Toplam Borçlu:</b> ${unpaidClients.length} kişi
💰 <b>Toplam Tutar:</b> ${totalDebt.toLocaleString('tr-TR')} ₺
⏳ <b>En Eski Borç:</b> ${oldestUnpaid ? new Date(oldestUnpaid.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}

<b>🔝 EN YÜKSEK BORÇLAR (İlk 10)</b>
━━━━━━━━━━━━━━━━━━━━`

    unpaidClients.slice(0, 10).forEach((client, index) => {
      const clientName = client.full_name || client.name || 'İsimsiz'
      const price = (client.price_agreed || 0).toLocaleString('tr-TR')
      const phone = client.phone || '-'

      message += `\n\n<b>${index + 1}.</b> ${clientName}
💰 Borç: <b>${price} ₺</b>
📱 Tel: <code>${phone}</code>
🔮 İşlem: ${client.process_type || '-'}
🆔 ID: <code>${client.id}</code>`
    })

    if (unpaidClients.length > 10) {
      const remainingDebt = unpaidClients
        .slice(10)
        .reduce((sum, client) => sum + (client.price_agreed || 0), 0)

      message += `\n\n<i>...ve ${unpaidClients.length - 10} kişi daha (${remainingDebt.toLocaleString('tr-TR')} ₺)</i>`
    }

    message += `\n\n━━━━━━━━━━━━━━━━━━━━
<i>💡 Detay için: /bekleyen
💳 Ödeme güncellemek için: /odeme_guncelle [id] Ödendi</i>`

    // 5. Send to Telegram
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

    return NextResponse.json({
      ok: true,
      unpaidCount: unpaidClients.length,
      totalDebt
    })

  } catch (error) {
    console.error('[weekly-payment-reminder error]', error)
    return NextResponse.json({ ok: false, error: 'Sunucu hatası' }, { status: 500 })
  }
}
