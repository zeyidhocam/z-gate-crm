import { NextResponse } from 'next/server'

/**
 * Telegram webhook URL'ini ayarlar
 * Tarayıcıda bu URL'i açarak webhook'u aktifleştirin
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN environment variable bulunamadı. Vercel Settings → Environment Variables bölümünden ekleyin.'
      },
      { status: 500 }
    )
  }

  // Webhook URL'i (production domain)
  const webhookUrl = `${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/telegram/webhook`

  // HTTPS zorunlu (Vercel otomatik sağlar)
  const finalWebhookUrl = webhookUrl.startsWith('http://localhost')
    ? webhookUrl
    : `https://${webhookUrl.replace(/^https?:\/\//, '')}`

  try {
    // Telegram API'sine webhook ayarla
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: finalWebhookUrl,
          drop_pending_updates: true, // Eski mesajları temizle
        }),
      }
    )

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Telegram webhook ayarlanamadı',
          details: data
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: '✅ Webhook başarıyla ayarlandı!',
      webhookUrl: finalWebhookUrl,
      telegram_response: data,
    })

  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Telegram API isteği başarısız',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
}
