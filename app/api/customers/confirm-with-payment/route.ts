import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import {
  createSchedulesForClient,
  collectPayment,
  syncClientPaymentStatus,
  type CreateScheduleItemInput,
} from '@/lib/server/payment-ledger'

type PaymentMode = 'full_paid' | 'deposit_plan' | 'pay_later'

interface ConfirmWithPaymentBody {
  clientId?: string
  paymentMode?: PaymentMode
  totalAmount?: number
  depositAmount?: number
  firstDueDate?: string
  installments?: Array<{ amount: number; dueDate: string; note?: string }>
  note?: string
}

function toIsoOrDefault(dateLike?: string, fallbackDays = 7): string {
  if (dateLike) {
    const date = new Date(dateLike)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  const fallback = new Date()
  fallback.setDate(fallback.getDate() + fallbackDays)
  return fallback.toISOString()
}

function sumInstallments(items: Array<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConfirmWithPaymentBody
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''
    const paymentMode = body.paymentMode
    const totalAmount = Number(body.totalAmount)

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'clientId is required' }, { status: 400 })
    }
    if (paymentMode !== 'full_paid' && paymentMode !== 'deposit_plan' && paymentMode !== 'pay_later') {
      return NextResponse.json({ ok: false, error: 'Invalid paymentMode' }, { status: 400 })
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ ok: false, error: 'totalAmount must be positive' }, { status: 400 })
    }

    const accessToken = request.headers.get('authorization')
    const supabase = createServerSupabaseClient(accessToken)

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, price_agreed')
      .eq('id', clientId)
      .single()
    if (clientError || !client) {
      return NextResponse.json({ ok: false, error: 'Client not found' }, { status: 404 })
    }

    const nowIso = new Date().toISOString()
    const scheduleItems: CreateScheduleItemInput[] = []
    const note = body.note || null

    if (paymentMode === 'full_paid') {
      scheduleItems.push({
        amount: totalAmount,
        dueDate: nowIso,
        note: note || 'Onay sırasında tam ödeme',
      })
      const created = await createSchedulesForClient(supabase, {
        clientId,
        items: scheduleItems,
        source: 'web',
      })
      const first = created[0]
      if (first) {
        await collectPayment(supabase, {
          clientId,
          scheduleId: first.id,
          amount: totalAmount,
          method: 'cash',
          note: 'Onay sırasında tahsil edildi',
          source: 'web',
        })
      }
    } else if (paymentMode === 'deposit_plan') {
      const depositAmount = Number(body.depositAmount)
      if (!Number.isFinite(depositAmount) || depositAmount <= 0 || depositAmount >= totalAmount) {
        return NextResponse.json(
          { ok: false, error: 'depositAmount must be positive and less than totalAmount' },
          { status: 400 }
        )
      }

      const remaining = totalAmount - depositAmount
      const incomingInstallments = Array.isArray(body.installments) ? body.installments : []
      const installments =
        incomingInstallments.length > 0
          ? incomingInstallments
          : [{ amount: remaining, dueDate: toIsoOrDefault(body.firstDueDate), note: 'Kalan ödeme planı' }]

      const installmentSum = sumInstallments(installments)
      if (Math.abs(installmentSum - remaining) > 0.01) {
        return NextResponse.json(
          {
            ok: false,
            error: `Installment sum (${installmentSum}) must equal remaining amount (${remaining})`,
          },
          { status: 400 }
        )
      }

      scheduleItems.push({
        amount: depositAmount,
        dueDate: nowIso,
        note: 'Kapora',
      })
      installments.forEach((item) => {
        scheduleItems.push({
          amount: Number(item.amount),
          dueDate: toIsoOrDefault(item.dueDate),
          note: item.note || null || undefined,
        })
      })

      const created = await createSchedulesForClient(supabase, {
        clientId,
        items: scheduleItems,
        source: 'web',
      })
      const depositSchedule = created[0]
      if (depositSchedule) {
        await collectPayment(supabase, {
          clientId,
          scheduleId: depositSchedule.id,
          amount: depositAmount,
          method: 'cash',
          note: 'Kapora tahsilatı',
          source: 'web',
        })
      }
    } else {
      const incomingInstallments = Array.isArray(body.installments) ? body.installments : []
      const installments =
        incomingInstallments.length > 0
          ? incomingInstallments
          : [{ amount: totalAmount, dueDate: toIsoOrDefault(body.firstDueDate), note: 'Sonradan ödeme' }]

      const installmentSum = sumInstallments(installments)
      if (Math.abs(installmentSum - totalAmount) > 0.01) {
        return NextResponse.json(
          {
            ok: false,
            error: `Installment sum (${installmentSum}) must equal totalAmount (${totalAmount})`,
          },
          { status: 400 }
        )
      }

      installments.forEach((item) => {
        scheduleItems.push({
          amount: Number(item.amount),
          dueDate: toIsoOrDefault(item.dueDate),
          note: item.note || null || undefined,
        })
      })
      await createSchedulesForClient(supabase, {
        clientId,
        items: scheduleItems,
        source: 'web',
      })
    }

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        is_confirmed: true,
        confirmed_at: nowIso,
        stage: 1,
        status: 'Aktif',
        price_agreed: totalAmount,
      })
      .eq('id', clientId)
    if (updateError) {
      throw new Error(updateError.message)
    }

    const paymentSummary = await syncClientPaymentStatus(supabase, clientId)

    return NextResponse.json({
      ok: true,
      clientId,
      paymentSummary,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
