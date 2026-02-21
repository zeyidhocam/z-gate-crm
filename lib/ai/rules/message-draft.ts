import type {
  AiMessageChannel,
  AiMessageDraft,
  AiMessageScenario,
  AiMessageTone,
} from '@/lib/ai/types'

interface MessageDraftInput {
  scenario: AiMessageScenario
  tone: AiMessageTone
  channel: AiMessageChannel
  clientName: string
  phone: string | null
  nextDueDate: string | null
  nextDueAmount: number
  overdueAmount: number
  totalPaid: number
  remaining: number
}

function formatMoney(value: number): string {
  return `${Math.max(0, value).toLocaleString('tr-TR')} TL`
}

function formatDate(value: string | null): string {
  if (!value) return 'belirtilen tarihte'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'belirtilen tarihte'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

function maskName(raw: string): string {
  const cleaned = raw.trim()
  if (!cleaned) return 'Müşteri'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (parts.length === 1) return first
  const surnameInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${first} ${surnameInitial}.`
}

function maskPhone(phone: string | null): string {
  if (!phone) return '+90 5XX XXX XX XX'
  const digits = phone.replace(/\D/g, '')
  let leadDigit = '5'

  if (digits.startsWith('90') && digits.length >= 12) {
    leadDigit = digits.charAt(2) || '5'
  } else if (digits.startsWith('0') && digits.length >= 11) {
    leadDigit = digits.charAt(1) || '5'
  } else if (digits.length >= 10) {
    leadDigit = digits.charAt(0) || '5'
  }

  if (!/^[0-9]$/.test(leadDigit)) leadDigit = '5'
  return `+90 ${leadDigit}XX XXX XX XX`
}

function resolveTone(tone: AiMessageTone): { ask: string; close: string } {
  if (tone === 'soft') {
    return {
      ask: 'Uygun olduğunuzda ödeme planını netleştirebilir miyiz?',
      close: 'Teşekkür ederiz, iyi günler dileriz.',
    }
  }
  if (tone === 'firm') {
    return {
      ask: 'Lütfen ödemeyi bugün içinde tamamlayıp bilgi veriniz.',
      close: 'Gecikme yaşanmaması için geri dönüşünüzü bekliyoruz.',
    }
  }
  return {
    ask: 'Ödeme için uygun zamanı paylaşmanızı rica ederiz.',
    close: 'Bilgilendirmeniz için şimdiden teşekkür ederiz.',
  }
}

function enforceLength(text: string, channel: AiMessageChannel): string {
  const maxLength = channel === 'whatsapp' ? 500 : 800
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

export function buildMessageDraft(input: MessageDraftInput): AiMessageDraft {
  const tone = resolveTone(input.tone)
  const safeName = maskName(input.clientName)
  const safePhone = maskPhone(input.phone)
  const dueDate = formatDate(input.nextDueDate)
  const dueAmountValue = input.nextDueAmount > 0 ? input.nextDueAmount : input.remaining
  const overdueAmountValue = input.overdueAmount > 0 ? input.overdueAmount : input.remaining
  const dueAmount = dueAmountValue > 0 ? formatMoney(dueAmountValue) : null
  const overdueAmount = overdueAmountValue > 0 ? formatMoney(overdueAmountValue) : null
  const paidAmount = formatMoney(input.totalPaid)
  const remainingAmount = input.remaining > 0 ? formatMoney(input.remaining) : null

  let body = ''
  const reasons: string[] = []

  if (input.scenario === 'overdue') {
    body = overdueAmount
      ? `Merhaba ${safeName}, ${dueDate} vadeli ${overdueAmount} ödemeniz gecikmede görünüyor. ${tone.ask}`
      : `Merhaba ${safeName}, vadesi geçen ödemeniz gecikmede görünüyor. ${tone.ask}`
    reasons.push('Senaryo: gecikmiş ödeme')
  } else if (input.scenario === 'today_due') {
    body = dueAmount
      ? `Merhaba ${safeName}, bugün vadesi gelen ${dueAmount} ödemenizi hatırlatmak isteriz. ${tone.ask}`
      : `Merhaba ${safeName}, bugün vadesi gelen ödemenizi hatırlatmak isteriz. ${tone.ask}`
    reasons.push('Senaryo: bugün vadesi gelen ödeme')
  } else if (input.scenario === 'partial_followup') {
    body = remainingAmount
      ? `Merhaba ${safeName}, ödemenizin ${paidAmount} kısmını aldık. Kalan ${remainingAmount} tutar için planınızı paylaşabilir misiniz?`
      : `Merhaba ${safeName}, ödemenizin bir kısmını aldık. Kalan ödeme planınızı paylaşabilir misiniz?`
    reasons.push('Senaryo: kısmi ödeme sonrası takip')
  } else {
    body = dueAmount
      ? `Merhaba ${safeName}, ${dueDate} tarihinde ${dueAmount} ödemeniz bulunuyor. Planlı hatırlatma olarak bilgi vermek istedik.`
      : `Merhaba ${safeName}, ${dueDate} tarihinde ödemeniz bulunuyor. Planlı hatırlatma olarak bilgi vermek istedik.`
    reasons.push('Senaryo: yaklaşan ödeme')
  }

  const text = enforceLength(`${body} ${tone.close}`, input.channel)

  return {
    text,
    maskedFields: ['name', 'phone'],
    reasons: [
      ...reasons,
      `Ton: ${input.tone}`,
      `Kanal: ${input.channel}`,
      `Maskeleme uygulandı (${safePhone})`,
    ],
  }
}
