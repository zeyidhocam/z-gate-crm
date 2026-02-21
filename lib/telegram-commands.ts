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
import {
  collectPayment,
  createSchedulesForClient,
  listOutstandingClientPayments,
  summarizeClientPayments,
  syncClientPaymentStatus,
} from './server/payment-ledger'

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
    const pending = await listOutstandingClientPayments(supabase)
    if (!pending || pending.length === 0) {
      return `💰 <b>ÖDEME BEKLEYENLER</b>\n━━━━━━━━━━━━━━━━━━━━\n\nAçık ödeme bulunmuyor. ✅`
    }

    let message = `💰 <b>ÖDEME BEKLEYENLER</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`
    pending.slice(0, 20).forEach((client, index) => {
      const phone = formatPhone(client.phone)
      const processName = client.processName || 'Belirtilmemis'
      const nextDue = client.nextDueDate ? formatDate(client.nextDueDate) : '-'
      const overdueInfo = client.overdueCount > 0 ? ` (${client.overdueCount} gecikmis)` : ''

      message += `${index + 1}️⃣ <b>${client.clientName}</b>\n`
      message += `   🆔 <code>${client.clientId}</code>\n`
      message += `   📞 ${phone}\n`
      message += `   🔮 ${processName}\n`
      message += `   💸 Kalan: ${formatCurrency(client.remaining)}\n`
      message += `   📅 Sonraki Vade: ${nextDue}${overdueInfo}\n\n`
    })

    const totalPending = pending.reduce((sum, c) => sum + c.remaining, 0)
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📊 <b>Toplam:</b> ${pending.length} musteri\n`
    message += `💸 <b>Bekleyen Tutar:</b> ${formatCurrency(totalPending)}`

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
 * /durum_guncelle [id] [durum] - Müşteri durumunu güncelle
 */
export async function handleDurumGuncelle(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const parts = text.split(' ')

    if (parts.length < 3) {
      return `⚠️ <b>Kullanım:</b> /durum_guncelle [id] [durum]

<b>Durumlar:</b>
• Yeni
• Görüşüldü
• Teyit
• Tamamlandı
• İptal

<b>Örnek:</b>
/durum_guncelle 123 Teyit`
    }

    const clientId = parseInt(parts[1])
    const newStatus = parts.slice(2).join(' ')

    if (isNaN(clientId)) {
      return `❌ Geçersiz ID. Sayı olmalı.\n\nÖrnek: /durum_guncelle 123 Teyit`
    }

    // Müşteri var mı kontrol et
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, full_name, name, status')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      return `❌ ID ${clientId} ile müşteri bulunamadı.\n\n💡 /ara komutu ile müşteri ID'sini öğrenebilirsin.`
    }

    // Durumu güncelle
    const { error: updateError } = await supabase
      .from('clients')
      .update({ status: newStatus })
      .eq('id', clientId)

    if (updateError) throw updateError

    const clientName = client.full_name || client.name || 'İsimsiz'

    return `✅ <b>Durum Güncellendi!</b>

👤 <b>Müşteri:</b> ${clientName}
🆔 ID: <code>${clientId}</code>
📌 <b>Eski Durum:</b> ${client.status || '-'}
🔄 <b>Yeni Durum:</b> ${newStatus}`

  } catch (error) {
    console.error('[/durum_guncelle error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

function parseClientId(parts: string[]): string {
  return parts[1]?.trim() || ''
}

function normalizeMethod(value?: string): 'cash' | 'card' | 'transfer' | 'other' {
  const method = (value || '').toLowerCase()
  if (method === 'card' || method === 'kart') return 'card'
  if (method === 'transfer' || method === 'havale' || method === 'eft') return 'transfer'
  if (method === 'other' || method === 'diger') return 'other'
  return 'cash'
}

/**
 * /odeme_al [id] [tutar] [yontem?] - Tahsilat gir
 */
export async function handleOdemeAl(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const parts = text.trim().split(/\s+/)
    if (parts.length < 3) {
      return `⚠️ <b>Kullanım:</b> /odeme_al [id] [tutar] [yontem?]\n\n<b>Ornek:</b>\n/odeme_al 8a3d... 3000 nakit`
    }

    const clientId = parseClientId(parts)
    const amount = Number(parts[2].replace(',', '.'))
    const method = normalizeMethod(parts[3])

    if (!clientId) return `❌ Geçersiz müşteri ID.`
    if (!Number.isFinite(amount) || amount <= 0) return `❌ Geçersiz tahsilat tutarı.`

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, name')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return `❌ ID ${clientId} ile müşteri bulunamadı.`
    }

    const result = await collectPayment(supabase, {
      clientId,
      amount,
      method,
      source: 'telegram',
      note: 'Telegram /odeme_al',
    })

    const clientName = client.full_name || client.name || 'İsimsiz'
    return `✅ <b>Tahsilat Kaydedildi</b>\n\n👤 <b>Müşteri:</b> ${clientName}\n💸 <b>Tahsilat:</b> ${formatCurrency(amount)}\n📉 <b>Kalan:</b> ${formatCurrency(result.paymentSummary.remaining)}\n🔖 <b>Durum:</b> ${result.paymentSummary.status}`
  } catch (error) {
    console.error('[/odeme_al error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /odeme_plan [id] [tutar] [yyyy-mm-dd] - Yeni taksit ekle
 */
export async function handleOdemePlan(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const parts = text.trim().split(/\s+/)
    if (parts.length < 4) {
      return `⚠️ <b>Kullanım:</b> /odeme_plan [id] [tutar] [yyyy-mm-dd]\n\n<b>Ornek:</b>\n/odeme_plan 8a3d... 7000 2026-03-15`
    }

    const clientId = parseClientId(parts)
    const amount = Number(parts[2].replace(',', '.'))
    const dateInput = parts[3]
    const dueDate = new Date(`${dateInput}T12:00:00+03:00`)

    if (!clientId) return `❌ Geçersiz müşteri ID.`
    if (!Number.isFinite(amount) || amount <= 0) return `❌ Geçersiz tutar.`
    if (Number.isNaN(dueDate.getTime())) return `❌ Geçersiz tarih. Format: yyyy-mm-dd`

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, name')
      .eq('id', clientId)
      .single()
    if (clientError || !client) return `❌ ID ${clientId} ile müşteri bulunamadı.`

    await createSchedulesForClient(supabase, {
      clientId,
      source: 'telegram',
      items: [{
        amount,
        dueDate: dueDate.toISOString(),
        note: 'Telegram /odeme_plan',
      }],
    })
    const summary = await syncClientPaymentStatus(supabase, clientId)
    const clientName = client.full_name || client.name || 'İsimsiz'

    return `✅ <b>Ödeme Planı Eklendi</b>\n\n👤 <b>Müşteri:</b> ${clientName}\n💵 <b>Taksit:</b> ${formatCurrency(amount)}\n📅 <b>Vade:</b> ${formatDate(dueDate.toISOString())}\n📉 <b>Kalan:</b> ${formatCurrency(summary.remaining)}`
  } catch (error) {
    console.error('[/odeme_plan error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /odeme_guncelle [id] [durum] - Geriye donuk alias
 */
export async function handleOdemeGuncelle(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const parts = text.trim().split(/\s+/)
    if (parts.length < 3) {
      return `⚠️ <b>Kullanım:</b> /odeme_guncelle [id] [durum]\n\n<b>Durumlar:</b> Ödendi | Ödenmedi | Kapora`
    }

    const clientId = parseClientId(parts)
    const requestedStatus = parts.slice(2).join(' ').toLowerCase()

    if (!clientId) return `❌ Geçersiz müşteri ID.`

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, name, price_agreed')
      .eq('id', clientId)
      .single()
    if (clientError || !client) return `❌ ID ${clientId} ile müşteri bulunamadı.`

    let summary = await summarizeClientPayments(supabase, clientId)

    if (requestedStatus.includes('ödendi') || requestedStatus.includes('odendi')) {
      if (summary.remaining > 0) {
        await collectPayment(supabase, {
          clientId,
          amount: summary.remaining,
          method: 'cash',
          source: 'telegram',
          note: 'Alias /odeme_guncelle -> Ödendi',
        })
      }
      summary = await syncClientPaymentStatus(supabase, clientId)
      return `✅ Alias işlendi. Kalan tutar kapatıldı.\n\n📉 Kalan: ${formatCurrency(summary.remaining)}\n🔖 Durum: ${summary.status}`
    }

    if (requestedStatus.includes('ödenmedi') || requestedStatus.includes('odenmedi')) {
      if (summary.totalDue <= 0 && (client.price_agreed || 0) > 0) {
        const due = new Date()
        due.setDate(due.getDate() + 7)
        await createSchedulesForClient(supabase, {
          clientId,
          source: 'telegram',
          items: [{
            amount: Number(client.price_agreed || 0),
            dueDate: due.toISOString(),
            note: 'Alias /odeme_guncelle -> Ödenmedi',
          }],
        })
      }
      summary = await syncClientPaymentStatus(supabase, clientId)
      return `✅ Alias işlendi. Açık ödeme planı korunuyor.\n\n📉 Kalan: ${formatCurrency(summary.remaining)}\n🔖 Durum: ${summary.status}`
    }

    if (requestedStatus.includes('kapora')) {
      summary = await syncClientPaymentStatus(supabase, clientId)
      if (summary.totalPaid <= 0) {
        return `⚠️ Kapora durumu için önce tahsilat girin: /odeme_al ${clientId} [tutar]`
      }
      return `✅ Alias işlendi.\n\n💵 Tahsil edilen: ${formatCurrency(summary.totalPaid)}\n📉 Kalan: ${formatCurrency(summary.remaining)}\n🔖 Durum: ${summary.status}`
    }

    return `⚠️ Desteklenmeyen durum. Ödendi | Ödenmedi | Kapora kullanın.`
  } catch (error) {
    console.error('[/odeme_guncelle error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /not_ekle [id] [not] - Müşteriye not ekle
 */
export async function handleNotEkle(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const parts = text.split(' ')

    if (parts.length < 3) {
      return `⚠️ <b>Kullanım:</b> /not_ekle [id] [not metni]

<b>Örnek:</b>
/not_ekle 123 Müşteri ödeme için yarın arayacak`
    }

    const clientId = parseInt(parts[1])
    const newNote = parts.slice(2).join(' ')

    if (isNaN(clientId)) {
      return `❌ Geçersiz ID. Sayı olmalı.\n\nÖrnek: /not_ekle 123 Not metni`
    }

    // Müşteri var mı kontrol et ve mevcut notları al
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, full_name, name, notes')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      return `❌ ID ${clientId} ile müşteri bulunamadı.\n\n💡 /ara komutu ile müşteri ID'sini öğrenebilirsin.`
    }

    // Tarih damgası ile not ekle (mevcut notların üstüne)
    const timestamp = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
    const existingNotes = client.notes || ''
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\n[${timestamp}] ${newNote}`
      : `[${timestamp}] ${newNote}`

    // Notu güncelle
    const { error: updateError } = await supabase
      .from('clients')
      .update({ notes: updatedNotes })
      .eq('id', clientId)

    if (updateError) throw updateError

    const clientName = client.full_name || client.name || 'İsimsiz'

    return `✅ <b>Not Eklendi!</b>

👤 <b>Müşteri:</b> ${clientName}
🆔 ID: <code>${clientId}</code>
📝 <b>Not:</b> ${newNote}
🕐 <b>Zaman:</b> ${timestamp}`

  } catch (error) {
    console.error('[/not_ekle error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /randevu_olustur [id] [tarih] - Randevu oluştur
 */
export async function handleRandevuOlustur(
  text: string,
  chatId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const parts = text.split(' ')

    if (parts.length < 3) {
      return `⚠️ <b>Kullanım:</b> /randevu_olustur [id] [tarih saat]

<b>Tarih Formatları:</b>
• /randevu_olustur 123 2024-02-15 14:00
• /randevu_olustur 123 15.02.2024 14:00
• /randevu_olustur 123 yarın 14:00

<b>Örnek:</b>
/randevu_olustur 123 2024-02-20 15:30`
    }

    const clientId = parseInt(parts[1])
    const dateTimeStr = parts.slice(2).join(' ')

    if (isNaN(clientId)) {
      return `❌ Geçersiz ID. Sayı olmalı.\n\nÖrnek: /randevu_olustur 123 2024-02-20 15:30`
    }

    // Müşteri var mı kontrol et
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, full_name, name, reservation_at')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      return `❌ ID ${clientId} ile müşteri bulunamadı.\n\n💡 /ara komutu ile müşteri ID'sini öğrenebilirsin.`
    }

    // Basit tarih parse (ISO format veya TR format)
    let reservationDate: Date

    try {
      // "yarın" kontrolü
      if (dateTimeStr.toLowerCase().includes('yarın') || dateTimeStr.toLowerCase().includes('yarin')) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Saat varsa çıkar (örn: "yarın 14:00")
        const timePart = dateTimeStr.match(/(\d{1,2}):(\d{2})/)
        if (timePart) {
          tomorrow.setHours(parseInt(timePart[1]), parseInt(timePart[2]), 0, 0)
        } else {
          tomorrow.setHours(9, 0, 0, 0) // Varsayılan: 09:00
        }

        reservationDate = tomorrow
      }
      // ISO format: 2024-02-15 14:00
      else if (dateTimeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        reservationDate = new Date(dateTimeStr)
      }
      // TR format: 15.02.2024 14:00
      else if (dateTimeStr.match(/^\d{2}\.\d{2}\.\d{4}/)) {
        const [datePart, timePart] = dateTimeStr.split(' ')
        const [day, month, year] = datePart.split('.')
        const timeStr = timePart || '09:00'
        reservationDate = new Date(`${year}-${month}-${day} ${timeStr}`)
      }
      // Geçersiz format
      else {
        return `❌ Geçersiz tarih formatı.\n\n<b>Desteklenen formatlar:</b>\n• 2024-02-15 14:00\n• 15.02.2024 14:00\n• yarın 14:00`
      }

      // Geçmiş tarih kontrolü
      if (reservationDate < new Date()) {
        return `⚠️ Geçmiş bir tarih giremezsin!\n\nGirilen: ${formatDateTime(reservationDate.toISOString())}\nŞimdi: ${formatDateTime(new Date().toISOString())}`
      }

    } catch {
      return `❌ Tarih parse edilemedi.\n\n<b>Örnek:</b> /randevu_olustur 123 2024-02-20 15:30`
    }

    // Randevuyu güncelle
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        reservation_at: reservationDate.toISOString(),
        status: 'Teyit' // Randevu oluşturulunca otomatik olarak Teyit durumuna geç
      })
      .eq('id', clientId)

    if (updateError) throw updateError

    const clientName = client.full_name || client.name || 'İsimsiz'

    return `✅ <b>Randevu Oluşturuldu!</b>

👤 <b>Müşteri:</b> ${clientName}
🆔 ID: <code>${clientId}</code>
📅 <b>Randevu Tarihi:</b> ${formatDateTime(reservationDate.toISOString())}
🔄 <b>Durum:</b> Teyit

${client.reservation_at ? `📌 <b>Eski Randevu:</b> ${formatDateTime(client.reservation_at)}` : ''}`

  } catch (error) {
    console.error('[/randevu_olustur error]', error)
    return ERRORS.GENERIC_ERROR
  }
}

/**
 * /yardim - Komut listesi ve yardım
 */
export async function handleHelp(): Promise<string> {
  return `🤖 <b>Z-GATE CRM BOT KOMUTLARI</b>
━━━━━━━━━━━━━━━━━━━━━━━

<b>📊 SORGULAMA &amp; RAPORLAR</b>
/bugun - Bugünkü randevular
/ara [isim/tel] - Müşteri ara
/bekleyen - Ödeme bekleyenler
/gelir [bugün/hafta/ay] - Gelir raporu

<b>✏️ MÜŞTERİ YÖNETİMİ</b>
/durum_guncelle [id] [durum] - Durum değiştir
/odeme_al [id] [tutar] [yontem?] - Tahsilat ekle
/odeme_plan [id] [tutar] [yyyy-mm-dd] - Taksit ekle
/odeme_guncelle [id] [durum] - Alias (eski komut)
/not_ekle [id] [not] - Not ekle
/randevu_olustur [id] [tarih] - Randevu oluştur

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
  // Faz 1: Sorgulama & Raporlama
  '/bugun': handleBugun,
  '/bugün': handleBugun, // Türkçe ü ile
  '/ara': handleAra,
  '/bekleyen': handleBekleyen,
  '/gelir': handleGelir,
  '/gelır': handleGelir, // Türkçe ı ile (olası yazım hatası)

  // Faz 2: Müşteri Yönetimi
  '/durum_guncelle': handleDurumGuncelle,
  '/odeme_al': handleOdemeAl,
  '/ödeme_al': handleOdemeAl,
  '/odeme_plan': handleOdemePlan,
  '/ödeme_plan': handleOdemePlan,
  '/odeme_guncelle': handleOdemeGuncelle,
  '/ödeme_guncelle': handleOdemeGuncelle, // Türkçe ö ile
  '/not_ekle': handleNotEkle,
  '/randevu_olustur': handleRandevuOlustur,
  '/randevu_oluştur': handleRandevuOlustur, // Türkçe ş ile

  // Yardım
  '/yardim': handleHelp,
  '/yardım': handleHelp, // Türkçe ım ile
  '/help': handleHelp, // İngilizce alias
}
