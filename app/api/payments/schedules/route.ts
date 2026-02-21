import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import {
  createSchedulesForClient,
  syncClientPaymentStatus,
  type CreateScheduleItemInput,
} from '@/lib/server/payment-ledger'

interface CreateSchedulesBody {
  clientId?: string
  items?: Array<{ amount: number; dueDate: string; note?: string }>
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSchedulesBody
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''
    const items = Array.isArray(body.items) ? body.items : []

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'clientId is required' }, { status: 400 })
    }
    if (!items.length) {
      return NextResponse.json({ ok: false, error: 'items is required' }, { status: 400 })
    }

    const accessToken = request.headers.get('authorization')
    const supabase = createServerSupabaseClient(accessToken)
    const normalizedItems: CreateScheduleItemInput[] = items.map((item) => ({
      amount: Number(item.amount),
      dueDate: item.dueDate,
      note: item.note,
    }))

    const created = await createSchedulesForClient(supabase, {
      clientId,
      items: normalizedItems,
      source: 'web',
    })
    const paymentSummary = await syncClientPaymentStatus(supabase, clientId)

    return NextResponse.json({
      ok: true,
      createdCount: created.length,
      paymentSummary,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
