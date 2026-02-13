/**
 * Telegram Bot Command Handlers
 * Faz 1: Sorgulama & Raporlama Komutları
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  getTurkeyDateRange,
  formatCurrency,
  formatPhone,
  formatDate,
  formatDateTime,
  truncateText,
  sanitizeInput,
  ERRORS,
} from './telegram-utils'

export type CommandHandler = (
  text: string,
  chatId: string,
  supabase: SupabaseClient
) => Promise<string>

/**
 * Command Router - Komut eşleştirme
 * @param text Telegram mesaj metni
 * @returns Eşleşen komut adı veya null
 */
export function matchCommand(text: string): string | null {
  const commandKeys = Object.keys(commands)
  for (const cmd of commandKeys) {
    if (text.startsWith(cmd)) {
      return cmd
    }
  }
  return null
}

/**
 * /bugun - Bugünkü rezervasyonları listele
 */
export async function handleBugun(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const { startDate, endDate } = getTurkeyDateRange('today')

    const { data: reservations, error } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, status, price_agreed, notes, process_name, reservation_at')
      .gte('reservation_at', startDate)
      .lte('reservation_at', endDate)
      .order('reservation_at', { ascending: true })

    if (error) throw error

    const today = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    })

    if (!reservations || reservations.length === 0) {
      return `📅 <b>BUGÜNKÜ RANDEVULAR</b>\n━━━━━━━━━━━━━━━━━━━━\n📆 ${today}\n\nBugün için randevu yok. ✅`
    }

    let message = `📅 <b>BUGÜNKÜ RANDEVULAR</b>\n━━━━━━━━━━━━━━━━━━━━\n📆 ${today}\n\n`

    reservations.forEach((client, index) => {
      const clientName = client.full_name || client.name || 'İsimsiz'
      const phone = formatPhone(client.phone)
      const processName = client.process_name || 'Belirtilmemiş'
      const price = client.price_agreed || 0

      message += `${index + 1}️⃣ <b>${clientName}</b>\n`
      message += `   📞 ${phone}\n`
      message += `   🔮 ${processName}\n`
      message += `   💰 ${formatCurrency(price)}\n`

      if (client.notes) {
        message += `   📝 ${truncateText(client.notes, 50)}\n`
      }

      message += '\n'
    })

    const totalRevenue = reservations.reduce((sum, c) => sum + (c.price_agreed || 0), 0)
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📊 <b>Toplam:</b> ${reservations.length} randevu\n`
    message += `💵 <b>Toplam Gelir:</b> ${formatCurrency(totalRevenue)}`

    return message

  } catch (error) {
    console.error('[/bugun error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /ara [isim veya telefon] - Müşteri arama
 */
export async function handleAra(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    // Komutu ayıkla
    const searchTerm = text.replace('/ara', '').trim()

    if (!searchTerm) {
      return `⚠️ <b>Kullanım:</b> /ara [isim veya telefon]\n\n<b>Örnekler:</b>\n• /ara ahmet\n• /ara 0555\n• /ara yılmaz`
    }

    const sanitized = sanitizeInput(searchTerm)

    // İsim, telefon ve notlarda ara
    const { data: results, error } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, status, price_agreed, process_name, reservation_at, notes')
      .or(`full_name.ilike.%${sanitized}%,name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
      .limit(10)

    if (error) throw error

    if (!results || results.length === 0) {
      return `🔍 <b>ARAMA SONUÇLARI</b>\n━━━━━━━━━━━━━━━━━━━━\nArama: "${searchTerm}"\n\n${ERRORS.NO_RESULTS}`
    }

    let message = `🔍 <b>ARAMA SONUÇLARI</b>\n━━━━━━━━━━━━━━━━━━━━\nArama: "${searchTerm}"\n\n`

    results.forEach((client, index) => {
      const clientName = client.full_name || client.name || 'İsimsiz'
      const phone = formatPhone(client.phone)
      const status = client.status || '-'
      const processName = client.process_name || 'Belirtilmemiş'
      const price = formatCurrency(client.price_agreed)

      message += `${index + 1}️⃣ <b>${clientName}</b>\n`
      message += `   🆔 ID: <code>${client.id}</code>\n`
      message += `   📞 ${phone}\n`
      message += `   🔖 Durum: ${status}\n`
      message += `   🔮 İşlem: ${processName}\n`
      message += `   💰 Ücret: ${price}\n`

      if (client.reservation_at) {
        message += `   📅 Randevu: ${formatDate(client.reservation_at)}\n`
      }

      message += '\n'
    })

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📊 Toplam <b>${results.length}</b> sonuç bulundu`

    if (results.length === 10) {
      message += ` (ilk 10)`
    }

    return message

  } catch (error) {
    console.error('[/ara error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /bekleyen - Ödeme bekleyen müşteriler
 */
export async function handleBekleyen(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const { data: pending, error } = await supabase
      .from('clients')
      .select('id, full_name, name, phone, price_agreed, payment_status, reservation_at, process_name')
      .in('payment_status', ['Ödenmedi', 'Kapora'])
      .order('reservation_at', { ascending: true })
      .limit(20)

    if (error) throw error

    if (!pending || pending.length === 0) {
      return `💰 <b>ÖDEME BEKLEYENLER</b>\n━━━━━━━━━━━━━━━━━━━━\n\nÖdeme bekleyen müşteri yok. ✅`
    }

    let message = `💰 <b>ÖDEME BEKLEYENLER</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`

    pending.forEach((client, index) => {
      const clientName = client.full_name || client.name || 'İsimsiz'
      const phone = formatPhone(client.phone)
      const price = client.price_agreed || 0
      const paymentStatus = client.payment_status || 'Ödenmedi'
      const processName = client.process_name || 'Belirtilmemiş'

      message += `${index + 1}️⃣ <b>${clientName}</b>\n`
      message += `   📞 ${phone}\n`
      message += `   🔮 ${processName}\n`
      message += `   💵 Ücret: ${formatCurrency(price)}\n`
      message += `   🔖 Durum: ${paymentStatus}\n`

      if (client.reservation_at) {
        message += `   📅 Randevu: ${formatDate(client.reservation_at)}\n`
      }

      message += '\n'
    })

    const totalPending = pending.reduce((sum, c) => sum + (c.price_agreed || 0), 0)
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📊 <b>Toplam:</b> ${pending.length} müşteri\n`
    message += `💸 <b>Beklenen Tutar:</b> ${formatCurrency(totalPending)}`

    return message

  } catch (error) {
    console.error('[/bekleyen error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /gelir [bugün|hafta|ay] - Gelir raporu
 */
export async function handleGelir(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    // Parametreyi al (varsayılan: bugün)
    const parts = text.split(' ')
    const periodParam = parts[1]?.toLowerCase() || 'bugün'

    let period: 'today' | 'week' | 'month' = 'today'
    let periodLabel = 'Bugün'

    if (periodParam === 'hafta' || periodParam === 'week') {
      period = 'week'
      periodLabel = 'Bu Hafta'
    } else if (periodParam === 'ay' || periodParam === 'month') {
      period = 'month'
      periodLabel = 'Bu Ay'
    } else if (periodParam !== 'bugün' && periodParam !== 'today') {
      return `⚠️ <b>Kullanım:</b> /gelir [bugün|hafta|ay]\n\n<b>Örnekler:</b>\n• /gelir\n• /gelir hafta\n• /gelir ay`
    }

    const { startDate, endDate } = getTurkeyDateRange(period)

    // Onaylanmış müşteriler (gelir)
    const { data: confirmedClients, error: confirmedError } = await supabase
      .from('clients')
      .select('price_agreed, process_name')
      .eq('is_confirmed', true)
      .gte('confirmed_at', startDate)
      .lte('confirmed_at', endDate)

    if (confirmedError) throw confirmedError

    // Yeni kayıtlar (lead)
    const { count: newLeadsCount, error: leadsError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (leadsError) throw leadsError

    const customerCount = confirmedClients?.length || 0
    const totalRevenue = confirmedClients?.reduce((sum, c) => sum + (c.price_agreed || 0), 0) || 0
    const avgRevenue = customerCount > 0 ? totalRevenue / customerCount : 0

    // En çok tercih edilen işlemler
    const processCount: Record<string, number> = {}
    confirmedClients?.forEach(client => {
      const process = client.process_name || 'Diğer'
      processCount[process] = (processCount[process] || 0) + 1
    })

    const topProcesses = Object.entries(processCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // Tarih aralığını formatla
    const startDateFormatted = formatDate(startDate)
    const endDateFormatted = formatDate(endDate)
    const dateRange = period === 'today' ? startDateFormatted : `${startDateFormatted} - ${endDateFormatted}`

    let message = `💵 <b>GELİR RAPORU</b>\n━━━━━━━━━━━━━━━━━━━━\n📊 ${periodLabel}\n📆 ${dateRange}\n\n`

    message += `<b>📈 ÖZET</b>\n`
    message += `🚀 Yeni Kayıtlar: <b>${newLeadsCount || 0}</b>\n`
    message += `✅ Yeni Müşteriler: <b>${customerCount}</b>\n`
    message += `💰 Toplam Gelir: <b>${formatCurrency(totalRevenue)}</b>\n`

    if (customerCount > 0) {
      message += `📈 Ortalama: <b>${formatCurrency(avgRevenue)}</b>/müşteri\n`
    }

    if (topProcesses.length > 0) {
      message += `\n<b>🔝 EN ÇOK TERCİH EDİLEN</b>\n`
      topProcesses.forEach(([process, count], index) => {
        message += `   ${index + 1}. ${process} (${count})\n`
      })
    }

    if (totalRevenue === 0 && customerCount === 0) {
      message += `\n<i>Bu dönemde gelir kaydı yok.</i>`
    }

    return message

  } catch (error) {
    console.error('[/gelir error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /yardim - Komut listesi ve yardım
 */
export async function handleHelp(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  return `🤖 <b>Z-GATE CRM BOT KOMUTLARI</b>
━━━━━━━━━━━━━━━━━━━━━━━

<b>📊 SORGULAMA &amp; RAPORLAR</b>
/bugun - Bugünkü randevular
/ara [isim/tel] - Müşteri ara
/bekleyen - Ödeme bekleyenler
/gelir [bugün/hafta/ay] - Gelir raporu

<b>ℹ️ DİĞER</b>
/start - Hoş geldin mesajı
/id - Chat ID göster
/yardim - Bu menü

<b>📝 KAYIT OLUŞTURMA</b>
JSON formatında müşteri ekle:
<code>{"name": "Ahmet", "phone": "0555..."}</code>

━━━━━━━━━━━━━━━━━━━━━━━
<i>💡 Komut detayları için /[komut] şeklinde yazabilirsiniz.</i>`
}

/**
 * Komut registry - Tüm komutlar burada tanımlı
 */
export const commands: Record<string, CommandHandler> = {
  '/bugun': handleBugun,
  '/bugün': handleBugun, // Türkçe ü ile
  '/ara': handleAra,
  '/bekleyen': handleBekleyen,
  '/gelir': handleGelir,
  '/gelır': handleGelir, // Türkçe ı ile (olası yazım hatası)
  '/yardim': handleHelp,
  '/yardım': handleHelp, // Türkçe ım ile
  '/help': handleHelp, // İngilizce alias
}
