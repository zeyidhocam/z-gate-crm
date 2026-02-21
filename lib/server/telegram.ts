import type { SupabaseClient } from '@supabase/supabase-js'

interface TelegramSettingsRow {
  telegram_bot_token: string | null
  telegram_chat_id: string | null
}

interface TelegramApiResponse {
  ok?: boolean
  description?: string
}

export interface TelegramCredentials {
  token: string
  chatId: string
}

export async function getTelegramCredentials(
  supabase: SupabaseClient
): Promise<TelegramCredentials | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('telegram_bot_token, telegram_chat_id')
    .single()

  if (error || !data) {
    return null
  }

  const settings = data as Partial<TelegramSettingsRow>
  const token = typeof settings.telegram_bot_token === 'string' ? settings.telegram_bot_token.trim() : ''
  const chatId = typeof settings.telegram_chat_id === 'string' ? settings.telegram_chat_id.trim() : ''

  if (!token || !chatId) {
    return null
  }

  return { token, chatId }
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const raw = await response.json().catch(() => null)
    const result =
      typeof raw === 'object' && raw !== null
        ? (raw as TelegramApiResponse)
        : null

    if (!response.ok || !result?.ok) {
      return { ok: false, error: result?.description || 'Telegram send failed' }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Telegram request failed' }
  }
}
