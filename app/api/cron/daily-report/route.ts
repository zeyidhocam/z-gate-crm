
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Initialize Supabase Admin Client (needed for crons/background tasks potentially, but client key works if RLS allows public read or we have service role)
        // Since we are running this as an API route, we can use the project credentials.
        // For security, cron jobs should use SERVICE_ROLE_KEY if RLS is strict, but for this user setup, let's try with standard environment variables.
        // If the user has RLS enabled on 'system_settings', standard anon key might fail to read if not authenticated.
        // HOWEVER, previous code suggests they are using a client-side supabase helper.
        // We will create a fresh client here.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Get Telegram Settings
        const { data: settings, error: settingsError } = await supabase
            .from('system_settings')
            .select('telegram_bot_token, telegram_chat_id')
            .single()

        if (settingsError || !settings?.telegram_bot_token || !settings?.telegram_chat_id) {
            return NextResponse.json({ ok: false, error: 'Telegram ayarları veritabanında bulunamadı.' }, { status: 400 })
        }

        const { telegram_bot_token: token, telegram_chat_id: chatId } = settings

        // 2. Calculate Daily Stats (Turkey Time: UTC+3)
        // We want the report to cover 00:00:00 to 23:59:59 TRT.
        // 00:00 TRT = Previous Day 21:00 UTC
        // 23:59 TRT = Current Day 20:59 UTC

        const now = new Date()

        // Get current date string in TRT (e.g. "2024-02-07")
        const trtDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) // YYYY-MM-DD format

        // Construct start and end times in TRT, then parse as ISO to get UTC offsets correctly
        // We can manually construct the ISO string with offset +0300
        const startOfTrtDay = new Date(`${trtDateStr}T00:00:00.000+03:00`)
        const endOfTrtDay = new Date(`${trtDateStr}T23:59:59.999+03:00`)

        const todayStart = startOfTrtDay.toISOString()
        const todayEnd = endOfTrtDay.toISOString()

        // Log gizlendi

        // 2.1 New Leads (Created Today)
        const { count: newLeadsCount } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStart)
            .lte('created_at', todayEnd)

        // 2.2 Reservations (Reservation Date is Today) - "Bugün randevusu olanlar"
        const { count: reservationsCount } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .gte('reservation_at', todayStart)
            .lte('reservation_at', todayEnd)

        // 2.3 New Customers (Confirmed Today)
        const { data: newCustomers } = await supabase
            .from('clients')
            .select('price_agreed')
            .eq('status', 'Aktif')
            .gte('confirmed_at', todayStart)
            .lte('confirmed_at', todayEnd)

        const newCustomersCount = newCustomers?.length || 0
        const revenue = newCustomers?.reduce((sum, client) => sum + (client.price_agreed || 0), 0) || 0

        // 2.4 Cancellations/Archives (Updated to Archive Today)
        const { count: archivedResult } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Arşiv')
            .gte('updated_at', todayStart)
            .lte('updated_at', todayEnd)

        const archivedCount = archivedResult || 0

        // 3. Format Message
        const dateStr = startOfTrtDay.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })

        const message = `
<b>🔔 Z-GATE CRM GÜNLÜK RAPOR</b>
📅 <b>${dateStr}</b>

<b>📊 GÜNLÜK ÖZET</b>
━━━━━━━━━━━━━━━━━━━━
🚀 <b>Yeni Kayıtlar:</b>   <b>${newLeadsCount || 0}</b>
✅ <b>Yeni Müşteriler:</b> <b>${newCustomersCount || 0}</b>
📅 <b>Bugünkü Randevular:</b> <b>${reservationsCount || 0}</b>
❌ <b>İptal / Arşiv:</b>   <b>${archivedCount}</b>

<b>💰 FİNANSAL DURUM</b>
━━━━━━━━━━━━━━━━━━━━
💵 <b>Günlük Ciro:</b> <b>${revenue.toLocaleString('tr-TR')} ₺</b>
`

        // 4. Send to Telegram
        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        })

        const telegramRes = await response.json()

        if (!telegramRes.ok) {
            return NextResponse.json({ ok: false, error: telegramRes.description }, { status: 400 })
        }

        return NextResponse.json({ ok: true })

    } catch {
        // Hata kaydi gizlendi
        return NextResponse.json({ ok: false, error: 'Sunucu hatası' }, { status: 500 })
    }
}
