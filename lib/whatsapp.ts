export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1)
  }

  if (!cleaned.startsWith('90')) {
    cleaned = `90${cleaned}`
  }

  return cleaned
}

export function buildWhatsAppDesktopUrl(phone: string, message = ''): string {
  const formattedPhone = formatPhoneForWhatsApp(phone)

  if (!message.trim()) {
    return `whatsapp://send?phone=${formattedPhone}`
  }

  const encodedMessage = encodeURIComponent(message)
  return `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`
}
