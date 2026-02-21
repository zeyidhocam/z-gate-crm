import { NextResponse } from 'next/server'
import { suggestPaymentPlan } from '@/lib/ai/rules/payment-plan'
import { buildLedgerRiskMetrics, scoreCollectionRisk } from '@/lib/ai/rules/risk-score'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'

interface PaymentPlanSuggestBody {
  clientId?: string
  totalAmount?: number
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PaymentPlanSuggestBody
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''
    const totalAmount = Number(body.totalAmount)

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'clientId is required' }, { status: 400 })
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ ok: false, error: 'totalAmount must be positive' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const [{ data: client, error: clientError }, { data: schedules }, { data: transactions }] = await Promise.all([
      supabase.from('clients').select('id, stage').eq('id', clientId).single(),
      supabase
        .from('payment_schedules')
        .select('amount, amount_due, amount_paid, is_paid, due_date')
        .eq('client_id', clientId),
      supabase
        .from('payment_transactions')
        .select('paid_at')
        .eq('client_id', clientId)
        .order('paid_at', { ascending: false })
        .limit(30),
    ])

    if (clientError || !client) {
      return NextResponse.json({ ok: false, error: 'Client not found' }, { status: 404 })
    }

    const metrics = buildLedgerRiskMetrics({
      schedules: (schedules || []) as Array<{
        amount?: number | null
        amount_due?: number | null
        amount_paid?: number | null
        is_paid?: boolean | null
        due_date?: string | null
      }>,
      transactions: (transactions || []) as Array<{ paid_at?: string | null }>,
    })
    const risk = scoreCollectionRisk(metrics)

    const suggestion = suggestPaymentPlan({
      totalAmount,
      clientRiskLevel: risk.level,
      stage: typeof client.stage === 'number' ? client.stage : 1,
      existingOverdueCount: metrics.overdueCount,
    })

    return NextResponse.json({ ok: true, suggestion })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
