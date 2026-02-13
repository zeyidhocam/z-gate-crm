/**
 * Telegram Bot Utility Functions
 * Yardımcı fonksiyonlar: Tarih, formatlama, hata mesajları
 */

export interface DateRange {
  startDate: string
  endDate: string
}

/**
 * Türkiye saat dilimine göre tarih aralığı hesapla
 * @param period 'today' | 'week' | 'month'
 * @returns ISO format start ve end tarihleri
 */
export function getTurkeyDateRange(period: 'today' | 'week' | 'month'): DateRange {
  const now = new Date()

  // Türkiye tarihi (UTC+3)
  const trtDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })

  if (period === 'today') {
    const startOfTrtDay = new Date(`${trtDateStr}T00:00:00.000+03:00`)
    const endOfTrtDay = new Date(`${trtDateStr}T23:59:59.999+03:00`)

    return {
      startDate: startOfTrtDay.toISOString(),
      endDate: endOfTrtDay.toISOString()
    }
  }

  if (period === 'week') {
    // Haftanın başı (Pazartesi)
    const trtDate = new Date(`${trtDateStr}T00:00:00.000+03:00`)
    const dayOfWeek = trtDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    const startOfWeek = new Date(trtDate)
    startOfWeek.setDate(trtDate.getDate() - daysToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return {
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString()
    }
  }

  if (period === 'month') {
    const trtDate = new Date(`${trtDateStr}T00:00:00.000+03:00`)

    const startOfMonth = new Date(trtDate.getFullYear(), trtDate.getMonth(), 1, 0, 0, 0, 0)
    const endOfMonth = new Date(trtDate.getFullYear(), trtDate.getMonth() + 1, 0, 23, 59, 59, 999)

    return {
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString()
    }
  }

  // Fallback: today
  return getTurkeyDateRange('today')
}

/**
 * Para miktarını Türk Lirası formatında göster
 * @param amount Miktar (number)
 * @returns Formatlanmış string (örn: "3.500 ₺")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (!amount && amount !== 0) return '-'
  return `${amount.toLocaleString('tr-TR')} ₺`
}

/**
 * Telefon numarasını formatla
 * @param phone Telefon numarası
 * @returns Formatlanmış telefon (örn: "0555 111 22 33")
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'

  // 05551112233 -> 0555 111 22 33
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`
  }

  return phone
}

/**
 * Müşteri bilgisini formatla (tek satır özet)
 * @param client Müşteri objesi
 * @returns Formatlanmış string
 */
export function formatClientSummary(client: {
  full_name?: string | null
  name?: string | null
  phone?: string | null
  status?: string | null
  price_agreed?: number | null
}): string {
  const clientName = client.full_name || client.name || 'İsimsiz'
  const phone = formatPhone(client.phone)
  const status = client.status || '-'
  const price = formatCurrency(client.price_agreed)

  return `👤 ${clientName} | 📞 ${phone} | 🔖 ${status} | 💰 ${price}`
}

/**
 * Tarih formatlama (Türkçe)
 * @param date ISO date string veya Date objesi
 * @returns Formatlanmış tarih (örn: "13 Şubat 2026")
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    })
  } catch {
    return '-'
  }
}

/**
 * Tarih + saat formatlama (Türkçe)
 * @param date ISO date string veya Date objesi
 * @returns Formatlanmış tarih-saat (örn: "13 Şubat 2026, 14:00")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    const dateStr = d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    })
    const timeStr = d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul'
    })
    return `${dateStr}, ${timeStr}`
  } catch {
    return '-'
  }
}

/**
 * Metni belirli uzunlukta kes ve "..." ekle
 * @param text Metin
 * @param maxLength Maksimum uzunluk
 * @returns Kısaltılmış metin
 */
export function truncateText(text: string | null | undefined, maxLength = 50): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Input sanitization - XSS ve script injection koruması
 * @param input Kullanıcı girdisi
 * @returns Temizlenmiş string
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .substring(0, 500) // Max 500 karakter
}

/**
 * UUID formatını doğrula
 * @param id Kontrol edilecek string
 * @returns Boolean
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Telefonu E.164 formatına çevir (+90XXXXXXXXXX)
 * @param phone Türk telefon numarası
 * @returns E.164 format
 */
export function toE164Phone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  // 05551112233 -> +905551112233
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+9${cleaned}`
  }

  // 5551112233 -> +905551112233
  if (cleaned.length === 10) {
    return `+90${cleaned}`
  }

  // Already in E.164 format
  if (cleaned.startsWith('90') && cleaned.length === 12) {
    return `+${cleaned}`
  }

  return phone // Return as-is if format unknown
}

// Hata mesajları sabitleri
export const ERRORS = {
  NO_RESULTS: '❌ Sonuç bulunamadı.',
  INVALID_ID: '⚠️ Geçersiz müşteri ID.',
  INVALID_UUID: '⚠️ Geçersiz ID formatı. UUID bekleniyor.',
  DB_ERROR: '❌ Veritabanı hatası. Lütfen tekrar deneyin.',
  MISSING_PARAMS: '⚠️ Eksik parametre.',
  UNAUTHORIZED: '⛔ Yetkisiz erişim.',
  RATE_LIMIT: '⏱️ Çok fazla istek. Lütfen 1 dakika bekleyin.',
  GENERIC_ERROR: '❌ Bir hata oluştu. Lütfen tekrar deneyin.',
  NO_PHONE: '⚠️ Müşterinin telefon numarası yok.',
  INVALID_STATUS: '⚠️ Geçersiz durum. Geçerli değerler: Yeni, Aktif, Takip, Rezervasyon, Arşiv',
  TWILIO_NOT_ENABLED: '⚠️ WhatsApp/SMS entegrasyonu aktif değil. Lütfen ayarlardan aktifleştirin.',
  MESSAGE_SEND_FAILED: '❌ Mesaj gönderilemedi. Lütfen ayarları kontrol edin.',
}

// Başarı mesajları
export const SUCCESS = {
  STATUS_UPDATED: '✅ Durum güncellendi!',
  NOTE_ADDED: '✅ Not eklendi!',
  MESSAGE_SENT: '✅ Mesaj gönderildi!',
}
