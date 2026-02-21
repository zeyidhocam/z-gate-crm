import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import { listOutstandingClientPayments } from '@/lib/server/payment-ledger'

export const dynamic = 'force-dynamic'

function getTrtDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('telegram_bot_token, telegram_chat_id')
      .single()

    if (settingsError || !settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      return NextResponse.json({ ok: false, error: 'Telegram ayarları bulunamadı.' }, { status: 400 })
    }

    const { telegram_bot_token: token, telegram_chat_id: chatId } = settings

    const now = new Date()
    const trtDateStr = getTrtDateString(now)
    const startOfTrtDay = new Date(`${trtDateStr}T00:00:00.000+03:00`)
    const endOfTrtDay = new Date(`${trtDateStr}T23:59:59.999+03:00`)

    const tomorrowDateStr = getTrtDateString(new Date(startOfTrtDay.getTime() + 24 * 60 * 60 * 1000))
    const tomorrowStart = new Date(`${tomorrowDateStr}T00:00:00.000+03:00`)
    const tomorrowEnd = new Date(`${tomorrowDateStr}T23:59:59.999+03:00`)

    const [{ data: appointments }, { data: tomorrowReminders }] = await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, name, phone, reservation_at, process_name, price_agreed')
        .gte('reservation_at', startOfTrtDay.toISOString())
        .lte('reservation_at', endOfTrtDay.toISOString())
        .order('reservation_at', { ascending: true })
        .limit(10),
      supabase
        .from('reminders')
        .select('id, title, description, reminder_date')
        .eq('is_completed', false)
        .gte('reminder_date', tomorrowStart.toISOString())
        .lte('reminder_date', tomorrowEnd.toISOString())
        .order('reminder_date', { ascending: true })
        .limit(10),
    ])

    const outstanding = await listOutstandingClientPayments(supabase)
    const pendingCount = outstanding.length
    const totalDebt = outstanding.reduce((sum, client) => sum + client.remaining, 0)

    const dateStr = startOfTrtDay.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul',
    })

    let message = `☀️ <b>GÜNAYDIN - Z-GATE CRM SABAH RAPORU</b>\n📅 <b>${dateStr}</b>\n\n`
    message += `<b>BUGÜNKÜ RANDEVULAR (${appointments?.length || 0})</b>\n━━━━━━━━━━━━━━━━━━━━`

    if (appointments && appointments.length > 0) {
      appointments.forEach((client, index) => {
        const clientName = client.full_name || client.name || 'İsimsiz'
        const time = client.reservation_at
          ? new Date(client.reservation_at).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul',
          })
          : '--:--'

        message += `\n\n<b>${index + 1}.</b> <b>${clientName}</b>\n`
        message += `🕐 Saat: <b>${time}</b>\n`
        message += `📱 Tel: <code>${client.phone || '-'}</code>\n`
        message += `🔮 İşlem: ${client.process_name || '-'}\n`
        message += `💰 Fiyat: ${(client.price_agreed || 0).toLocaleString('tr-TR')} TL`
      })
    } else {
      message += `\n\n✅ <i>Bugün randevu yok.</i>`
    }

    message += `\n\n<b>ÖDEME MERKEZİ (${pendingCount})</b>\n━━━━━━━━━━━━━━━━━━━━`
    if (pendingCount > 0) {
      message += `\n💸 <b>Toplam Kalan:</b> ${totalDebt.toLocaleString('tr-TR')} TL\n`
      outstanding.slice(0, 3).forEach((client, index) => {
        const due = client.nextDueDate
          ? new Date(client.nextDueDate).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
          : '-'
        message += `\n<b>${index + 1}.</b> ${client.clientName} - ${client.remaining.toLocaleString('tr-TR')} TL (vade: ${due})`
      })
      if (pendingCount > 3) {
        message += `\n\n<i>...ve ${pendingCount - 3} kişi daha</i>`
      }
    } else {
      message += `\n\n✅ <i>Açık ödeme bulunmuyor.</i>`
    }

    message += `\n\n<b>YARINKİ HATIRLATMALAR (${tomorrowReminders?.length || 0})</b>\n━━━━━━━━━━━━━━━━━━━━`
    if (tomorrowReminders && tomorrowReminders.length > 0) {
      tomorrowReminders.forEach((reminder, index) => {
        const reminderTime = reminder.reminder_date
          ? new Date(reminder.reminder_date).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul',
          })
          : '--:--'

        message += `\n\n<b>${index + 1}.</b> ${reminder.title}`
        message += `\n🕐 Saat: <b>${reminderTime}</b>`
        if (reminder.description) {
          message += `\n📝 ${reminder.description}`
        }
      })
    } else {
      message += `\n\n✅ <i>Yarın için manuel hatırlatma yok.</i>`
    }

    message += `\n\n━━━━━━━━━━━━━━━━━━━━\n<i>Detay: /bugun veya /bekleyen</i>`

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const telegramRes = await response.json()
    if (!telegramRes.ok) {
      return NextResponse.json({ ok: false, error: telegramRes.description }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      appointmentsCount: appointments?.length || 0,
      pendingCount,
      totalDebt,
      tomorrowReminderCount: tomorrowReminders?.length || 0,
    })
  } catch (error) {
    console.error('[morning-report error]', error)
    return NextResponse.json({ ok: false, error: 'Sunucu hatası' }, { status: 500 })
  }
}
