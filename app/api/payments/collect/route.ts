import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import { collectPayment, type PaymentMethod } from '@/lib/server/payment-ledger'

interface CollectBody {
  clientId?: string
  scheduleId?: string
  amount?: number
  method?: PaymentMethod
  paidAt?: string
  note?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CollectBody
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''
    const scheduleId = typeof body.scheduleId === 'string' ? body.scheduleId : undefined
    const amount = Number(body.amount)

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'clientId is required' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'amount must be positive' }, { status: 400 })
    }

    const accessToken = request.headers.get('authorization')
    const supabase = createServerSupabaseClient(accessToken)
    const result = await collectPayment(supabase, {
      clientId,
      scheduleId,
      amount,
      method: body.method,
      paidAt: body.paidAt,
      note: body.note,
      source: 'web',
    })

    return NextResponse.json({
      ok: true,
      updatedSchedules: result.updatedSchedules,
      paymentSummary: result.paymentSummary,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
