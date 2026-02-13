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

  // Webhook URL'i (SABIT production domain kullan, VERCEL_URL her deploy'da değişir!)
  const PRODUCTION_DOMAIN = 'z-gate-crm.vercel.app'
  const finalWebhookUrl = `https://${PRODUCTION_DOMAIN}/api/telegram/webhook`

  console.log('[set-webhook] Using webhook URL:', finalWebhookUrl)

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
