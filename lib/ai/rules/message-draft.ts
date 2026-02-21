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
  if (!cleaned) return 'Musteri'
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
      ask: 'Uygun oldugunuzda odeme planini netlestirebilir miyiz?',
      close: 'Tesekkur ederiz, iyi gunler dileriz.',
    }
  }
  if (tone === 'firm') {
    return {
      ask: 'Lutfen odemeyi bugun icinde tamamlayip bilgi veriniz.',
      close: 'Gecikme yasamamasi icin geri donusunuzu bekliyoruz.',
    }
  }
  return {
    ask: 'Odeme icin uygun zamani paylasmanizi rica ederiz.',
    close: 'Bilgilendirmeniz icin simdiden tesekkur ederiz.',
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
  const dueAmount = formatMoney(input.nextDueAmount > 0 ? input.nextDueAmount : input.remaining)
  const overdueAmount = formatMoney(input.overdueAmount > 0 ? input.overdueAmount : input.remaining)
  const paidAmount = formatMoney(input.totalPaid)
  const remainingAmount = formatMoney(input.remaining)

  let body = ''
  const reasons: string[] = []

  if (input.scenario === 'overdue') {
    body = `Merhaba ${safeName}, ${dueDate} vadeli ${overdueAmount} odemeniz gecikmede gorunuyor. ${tone.ask}`
    reasons.push('Senaryo: gecikmis odeme')
  } else if (input.scenario === 'today_due') {
    body = `Merhaba ${safeName}, bugun vadesi gelen ${dueAmount} odemenizi hatirlatmak isteriz. ${tone.ask}`
    reasons.push('Senaryo: bugun vadesi gelen odeme')
  } else if (input.scenario === 'partial_followup') {
    body = `Merhaba ${safeName}, odemenizin ${paidAmount} kismini aldik. Kalan ${remainingAmount} tutar icin planinizi paylasabilir misiniz?`
    reasons.push('Senaryo: kismi odeme sonrasi takip')
  } else {
    body = `Merhaba ${safeName}, ${dueDate} tarihinde ${dueAmount} odemeniz bulunuyor. Planli hatirlatma olarak bilgi vermek istedik.`
    reasons.push('Senaryo: yaklasan odeme')
  }

  const text = enforceLength(`${body} ${tone.close}`, input.channel)

  return {
    text,
    maskedFields: ['name', 'phone'],
    reasons: [
      ...reasons,
      `Ton: ${input.tone}`,
      `Kanal: ${input.channel}`,
      `Maskeleme uygulandi (${safePhone})`,
    ],
  }
}
