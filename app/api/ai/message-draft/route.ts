import { NextResponse } from 'next/server'
import type { AiMessageChannel, AiMessageScenario, AiMessageTone } from '@/lib/ai/types'
import { buildMessageDraft } from '@/lib/ai/rules/message-draft'
import { getAmountDue, getAmountPaid, getRemaining, startOfDay } from '@/lib/ai/rules/shared'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'

interface MessageDraftBody {
  clientId?: string
  scenario?: AiMessageScenario
  tone?: AiMessageTone
  channel?: AiMessageChannel
}

function isScenario(value: unknown): value is AiMessageScenario {
  return value === 'overdue' || value === 'today_due' || value === 'upcoming' || value === 'partial_followup'
}

function isTone(value: unknown): value is AiMessageTone {
  return value === 'soft' || value === 'standard' || value === 'firm'
}

function isChannel(value: unknown): value is AiMessageChannel {
  return value === 'whatsapp' || value === 'telegram'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MessageDraftBody
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'clientId is required' }, { status: 400 })
    }
    if (!isScenario(body.scenario)) {
      return NextResponse.json({ ok: false, error: 'Invalid scenario' }, { status: 400 })
    }
    if (!isTone(body.tone)) {
      return NextResponse.json({ ok: false, error: 'Invalid tone' }, { status: 400 })
    }
    if (!isChannel(body.channel)) {
      return NextResponse.json({ ok: false, error: 'Invalid channel' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const [{ data: client, error: clientError }, { data: schedules }] = await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, name, phone, price_agreed, price')
        .eq('id', clientId)
        .single(),
      supabase
        .from('payment_schedules')
        .select('amount, amount_due, amount_paid, is_paid, due_date')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true }),
    ])

    if (clientError || !client) {
      return NextResponse.json({ ok: false, error: 'Client not found' }, { status: 404 })
    }

    const rows = (schedules || []) as Array<{
      amount?: number | null
      amount_due?: number | null
      amount_paid?: number | null
      is_paid?: boolean | null
      due_date?: string | null
    }>

    const totalDue = rows.reduce((sum, row) => sum + getAmountDue(row), 0)
    const totalPaid = rows.reduce((sum, row) => sum + getAmountPaid(row), 0)
    const remaining = Math.max(0, totalDue - totalPaid)
    const agreedAmount = Math.max(0, Number(client.price_agreed || client.price || 0))
    const remainingFallback = remaining > 0 ? remaining : agreedAmount

    const today = startOfDay(new Date())
    const openRows = rows.filter((row) => getRemaining(row) > 0)
    const nextDueRow = openRows[0]
    const overdueAmount = openRows.reduce((sum, row) => {
      if (!row.due_date) return sum
      const dueDate = new Date(row.due_date)
      if (Number.isNaN(dueDate.getTime()) || dueDate >= today) return sum
      return sum + getRemaining(row)
    }, 0)

    const draft = buildMessageDraft({
      scenario: body.scenario,
      tone: body.tone,
      channel: body.channel,
      clientName: client.full_name || client.name || 'Müşteri',
      phone: client.phone || null,
      nextDueDate: nextDueRow?.due_date || null,
      nextDueAmount: nextDueRow ? getRemaining(nextDueRow) : remainingFallback,
      overdueAmount: overdueAmount > 0 ? overdueAmount : remainingFallback,
      totalPaid,
      remaining: remainingFallback,
    })

    return NextResponse.json({ ok: true, draft })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
