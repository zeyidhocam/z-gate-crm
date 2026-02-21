import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import { listOutstandingClientPayments } from '@/lib/server/payment-ledger'

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
    const outstanding = await listOutstandingClientPayments(supabase)

    if (!outstanding.length) {
      const message = `✅ <b>HAFTALIK ODEME TAKIBI</b>\n\nAcilan bir odeme kaydi bulunmuyor.\n\n<i>${new Date().toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Istanbul'
      })}</i>`

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
      })

      return NextResponse.json({ ok: true, unpaidCount: 0 })
    }

    const totalDebt = outstanding.reduce((sum, client) => sum + client.remaining, 0)
    const top = outstanding.slice(0, 10)

    let message = `⚠️ <b>HAFTALIK ODEME TAKIBI</b>\n\n`
    message += `📊 <b>Acik Musteri:</b> ${outstanding.length}\n`
    message += `💸 <b>Toplam Kalan:</b> ${totalDebt.toLocaleString('tr-TR')} TL\n\n`
    message += `<b>EN YUKSEK BAKIYELER</b>\n━━━━━━━━━━━━━━━━━━━━`

    top.forEach((client, index) => {
      const nextDue = client.nextDueDate
        ? new Date(client.nextDueDate).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
        : '-'

      message += `\n\n<b>${index + 1}.</b> ${client.clientName}\n`
      message += `💸 Kalan: <b>${client.remaining.toLocaleString('tr-TR')} TL</b>\n`
      message += `📅 Sonraki Vade: ${nextDue}\n`
      message += `🆔 <code>${client.clientId}</code>`
    })

    if (outstanding.length > top.length) {
      const restTotal = outstanding.slice(top.length).reduce((sum, client) => sum + client.remaining, 0)
      message += `\n\n<i>...ve ${outstanding.length - top.length} kisi daha (${restTotal.toLocaleString('tr-TR')} TL)</i>`
    }

    message += `\n\n━━━━━━━━━━━━━━━━━━━━\n<i>Detay: /bekleyen</i>`

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })

    const telegramRes = await response.json()
    if (!telegramRes.ok) {
      return NextResponse.json({ ok: false, error: telegramRes.description }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      unpaidCount: outstanding.length,
      totalDebt,
    })
  } catch (error) {
    console.error('[weekly-payment-reminder error]', error)
    return NextResponse.json({ ok: false, error: 'Sunucu hatasi' }, { status: 500 })
  }
}
