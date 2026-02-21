import type { SupabaseClient } from '@supabase/supabase-js'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'
export type PaymentSource = 'web' | 'telegram' | 'migration'
export type ScheduleStatus = 'pending' | 'partially_paid' | 'paid'

export interface PaymentSummary {
  totalDue: number
  totalPaid: number
  remaining: number
  status: 'Ödendi' | 'Kapora' | 'Ödenmedi'
}

export interface CreateScheduleItemInput {
  amount: number
  dueDate: string
  note?: string
}

export interface PaymentScheduleRow {
  id: string
  client_id: string
  amount: number | null
  amount_due: number | null
  amount_paid: number | null
  status: string | null
  installment_no: number | null
  due_date: string
  is_paid: boolean | null
  note?: string | null
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function getScheduleAmountDue(schedule: Partial<PaymentScheduleRow>): number {
  const amountDue = toNumber(schedule.amount_due)
  if (amountDue > 0) return amountDue
  return toNumber(schedule.amount)
}

export function getScheduleAmountPaid(schedule: Partial<PaymentScheduleRow>): number {
  const explicitPaid = toNumber(schedule.amount_paid)
  if (explicitPaid > 0) return explicitPaid
  if (schedule.is_paid) return getScheduleAmountDue(schedule)
  return 0
}

export function getScheduleRemaining(schedule: Partial<PaymentScheduleRow>): number {
  return Math.max(0, getScheduleAmountDue(schedule) - getScheduleAmountPaid(schedule))
}

export function deriveScheduleStatus(schedule: Partial<PaymentScheduleRow>): ScheduleStatus {
  const remaining = getScheduleRemaining(schedule)
  const due = getScheduleAmountDue(schedule)
  if (remaining <= 0) return 'paid'
  if (due > 0 && remaining < due) return 'partially_paid'
  return 'pending'
}

export function deriveClientPaymentStatus(
  summary: Pick<PaymentSummary, 'totalDue' | 'remaining' | 'totalPaid'>
): PaymentSummary['status'] {
  if (summary.totalDue <= 0) return 'Ödenmedi'
  if (summary.remaining <= 0) return 'Ödendi'
  if (summary.totalPaid > 0) return 'Kapora'
  return 'Ödenmedi'
}

export async function fetchClientSchedules(
  supabase: SupabaseClient,
  clientId: string
): Promise<PaymentScheduleRow[]> {
  const { data, error } = await supabase
    .from('payment_schedules')
    .select('id, client_id, amount, amount_due, amount_paid, status, installment_no, due_date, is_paid')
    .eq('client_id', clientId)
    .order('due_date', { ascending: true })

  if (error || !data) return []
  return data as unknown as PaymentScheduleRow[]
}

export function summarizeSchedules(schedules: Array<Partial<PaymentScheduleRow>>): PaymentSummary {
  const totalDue = schedules.reduce((sum, s) => sum + getScheduleAmountDue(s), 0)
  const totalPaid = schedules.reduce((sum, s) => sum + getScheduleAmountPaid(s), 0)
  const remaining = Math.max(0, totalDue - totalPaid)
  return {
    totalDue,
    totalPaid,
    remaining,
    status: deriveClientPaymentStatus({ totalDue, remaining, totalPaid }),
  }
}

export async function summarizeClientPayments(
  supabase: SupabaseClient,
  clientId: string
): Promise<PaymentSummary> {
  const schedules = await fetchClientSchedules(supabase, clientId)
  return summarizeSchedules(schedules)
}

export async function syncClientPaymentStatus(
  supabase: SupabaseClient,
  clientId: string
): Promise<PaymentSummary> {
  const summary = await summarizeClientPayments(supabase, clientId)

  await supabase
    .from('clients')
    .update({ payment_status: summary.status })
    .eq('id', clientId)

  return summary
}

function ensurePositiveAmount(amount: number, fieldName: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} must be a positive number`)
  }
}

function normalizeMethod(method?: string): PaymentMethod {
  if (method === 'card' || method === 'transfer' || method === 'other') return method
  return 'cash'
}

async function safeInsertAuditLog(
  supabase: SupabaseClient,
  params: {
    recordId: string
    action: string
    tableName?: string
    changes?: unknown
    userId?: string | null
  }
) {
  const { recordId, action, tableName = 'clients', changes, userId } = params
  try {
    await supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action,
      user_id: userId || null,
      changes: changes ?? null,
    })
  } catch {
    // best-effort log write
  }
}

function buildPaymentReminderTitle(clientName: string) {
  return `Odeme takibi: ${clientName}`
}

function buildPaymentReminderDescription(schedule: PaymentScheduleRow) {
  const parts: string[] = []
  if (typeof schedule.installment_no === 'number') {
    parts.push(`Taksit #${schedule.installment_no}`)
  }
  if (schedule.note) {
    parts.push(schedule.note)
  }
  return parts.join(' - ') || null
}

async function syncReminderForSchedules(
  supabase: SupabaseClient,
  clientId: string,
  schedules: PaymentScheduleRow[]
) {
  if (!schedules.length) return

  try {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name, name')
      .eq('id', clientId)
      .maybeSingle()

    const clientName =
      (client as { full_name?: string | null; name?: string | null } | null)?.full_name ||
      (client as { full_name?: string | null; name?: string | null } | null)?.name ||
      'Musteri'

    const rows = schedules.map((schedule) => ({
      client_id: clientId,
      schedule_id: schedule.id,
      title: buildPaymentReminderTitle(clientName),
      description: buildPaymentReminderDescription(schedule),
      reminder_date: schedule.due_date,
      is_completed: getScheduleRemaining(schedule) <= 0,
      source: 'payment_schedule',
    }))

    await supabase
      .from('reminders')
      .upsert(rows, { onConflict: 'schedule_id', ignoreDuplicates: false })
  } catch {
    // reminders table may not exist yet
  }
}

export async function createSchedulesForClient(
  supabase: SupabaseClient,
  params: {
    clientId: string
    items: CreateScheduleItemInput[]
    source: PaymentSource
  }
): Promise<PaymentScheduleRow[]> {
  const { clientId, items, source } = params
  if (!items.length) return []

  items.forEach((item, index) => {
    const amount = toNumber(item.amount)
    ensurePositiveAmount(amount, `items[${index}].amount`)
    if (!item.dueDate) throw new Error(`items[${index}].dueDate is required`)
  })

  const { data: latestData } = await supabase
    .from('payment_schedules')
    .select('installment_no')
    .eq('client_id', clientId)
    .order('installment_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const startNo =
    typeof latestData?.installment_no === 'number' && Number.isFinite(latestData.installment_no)
      ? latestData.installment_no
      : 0

  const rows = items.map((item, index) => {
    const due = toNumber(item.amount)
    return {
      client_id: clientId,
      amount: due,
      amount_due: due,
      amount_paid: 0,
      due_date: item.dueDate,
      note: item.note || null,
      status: 'pending',
      installment_no: startNo + index + 1,
      source,
      is_paid: false,
      updated_at: new Date().toISOString(),
    }
  })

  const { data, error } = await supabase
    .from('payment_schedules')
    .insert(rows)
    .select('id, client_id, amount, amount_due, amount_paid, status, installment_no, due_date, is_paid, note')

  if (error) throw new Error(error.message)
  const created = (data || []) as unknown as PaymentScheduleRow[]

  await syncReminderForSchedules(supabase, clientId, created)
  await safeInsertAuditLog(supabase, {
    recordId: clientId,
    action: 'payment_schedule_created',
    tableName: 'clients',
    changes: {
      source,
      scheduleCount: created.length,
      scheduleIds: created.map((row) => row.id),
      installmentNos: created.map((row) => row.installment_no),
    },
  })

  return created
}

async function updateScheduleAfterCollection(
  supabase: SupabaseClient,
  schedule: PaymentScheduleRow,
  collectAmount: number
) {
  const due = getScheduleAmountDue(schedule)
  const paid = getScheduleAmountPaid(schedule)
  const remaining = Math.max(0, due - paid)

  if (remaining <= 0) {
    throw new Error('Selected schedule is already fully paid')
  }
  if (collectAmount > remaining + 1e-9) {
    throw new Error('Collection amount exceeds remaining schedule amount')
  }

  const nextPaid = paid + collectAmount
  const nextRemaining = Math.max(0, due - nextPaid)
  const nextStatus: ScheduleStatus = nextRemaining <= 0 ? 'paid' : 'partially_paid'

  const { error } = await supabase
    .from('payment_schedules')
    .update({
      amount_due: due,
      amount_paid: nextPaid,
      status: nextStatus,
      is_paid: nextStatus === 'paid',
      paid_at: nextStatus === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', schedule.id)

  if (error) throw new Error(error.message)
}

async function insertTransaction(
  supabase: SupabaseClient,
  params: {
    clientId: string
    scheduleId?: string
    amount: number
    method?: string
    source: PaymentSource
    paidAt?: string
    note?: string
    createdBy?: string | null
  }
) {
  const { clientId, scheduleId, amount, method, source, paidAt, note, createdBy } = params

  const { error } = await supabase
    .from('payment_transactions')
    .insert({
      client_id: clientId,
      schedule_id: scheduleId || null,
      amount,
      method: normalizeMethod(method),
      source,
      paid_at: paidAt || new Date().toISOString(),
      note: note || null,
      created_by: createdBy || null,
    })

  if (error) throw new Error(error.message)
}

export async function collectPayment(
  supabase: SupabaseClient,
  params: {
    clientId: string
    amount: number
    scheduleId?: string
    method?: string
    source: PaymentSource
    paidAt?: string
    note?: string
    createdBy?: string | null
  }
): Promise<{ updatedSchedules: string[]; paymentSummary: PaymentSummary }> {
  const { clientId, amount, scheduleId, method, source, paidAt, note, createdBy } = params
  ensurePositiveAmount(amount, 'amount')

  const schedules = await fetchClientSchedules(supabase, clientId)
  const updatedSchedules: string[] = []

  if (scheduleId) {
    const target = schedules.find((s) => s.id === scheduleId)
    if (!target) throw new Error('Schedule not found')

    await updateScheduleAfterCollection(supabase, target, amount)
    await insertTransaction(supabase, {
      clientId,
      scheduleId: target.id,
      amount,
      method,
      source,
      paidAt,
      note,
      createdBy,
    })
    updatedSchedules.push(target.id)
  } else {
    const payable = schedules.filter((s) => getScheduleRemaining(s) > 0)
    if (!payable.length) throw new Error('No payable schedules found')

    const totalRemaining = payable.reduce((sum, s) => sum + getScheduleRemaining(s), 0)
    if (amount > totalRemaining + 1e-9) {
      throw new Error('Collection amount exceeds total remaining balance')
    }

    let remainingToCollect = amount
    for (const schedule of payable) {
      if (remainingToCollect <= 0) break
      const scheduleRemaining = getScheduleRemaining(schedule)
      const collect = Math.min(remainingToCollect, scheduleRemaining)
      if (collect <= 0) continue

      await updateScheduleAfterCollection(supabase, schedule, collect)
      await insertTransaction(supabase, {
        clientId,
        scheduleId: schedule.id,
        amount: collect,
        method,
        source,
        paidAt,
        note,
        createdBy,
      })
      updatedSchedules.push(schedule.id)
      remainingToCollect -= collect
    }
  }

  if (updatedSchedules.length) {
    try {
      const { data: updatedRows } = await supabase
        .from('payment_schedules')
        .select('id, client_id, amount, amount_due, amount_paid, status, installment_no, due_date, is_paid, note')
        .in('id', updatedSchedules)

      await syncReminderForSchedules(
        supabase,
        clientId,
        ((updatedRows || []) as unknown as PaymentScheduleRow[])
      )
    } catch {
      // reminders sync is best-effort
    }
  }

  const paymentSummary = await syncClientPaymentStatus(supabase, clientId)
  await safeInsertAuditLog(supabase, {
    recordId: clientId,
    action: 'payment_collected',
    tableName: 'clients',
    changes: {
      amount,
      method: normalizeMethod(method),
      scheduleId: scheduleId || null,
      updatedSchedules,
      source,
      paidAt: paidAt || new Date().toISOString(),
      note: note || null,
    },
    userId: createdBy || null,
  })
  return { updatedSchedules, paymentSummary }
}

export interface OutstandingClientPayment {
  clientId: string
  clientName: string
  phone: string | null
  processName: string | null
  totalDue: number
  totalPaid: number
  remaining: number
  nextDueDate: string | null
  overdueCount: number
}

export async function listOutstandingClientPayments(
  supabase: SupabaseClient
): Promise<OutstandingClientPayment[]> {
  const { data, error } = await supabase
    .from('payment_schedules')
    .select('client_id, amount, amount_due, amount_paid, due_date, is_paid, status, clients(full_name, name, phone, process_name)')
    .order('due_date', { ascending: true })

  if (error || !data) return []

  type Row = {
    client_id: string
    amount: number | null
    amount_due: number | null
    amount_paid: number | null
    due_date: string
    is_paid: boolean | null
    status: string | null
    clients?: { full_name?: string | null; name?: string | null; phone?: string | null; process_name?: string | null } | null
  }

  const now = new Date()
  const byClient = new Map<string, OutstandingClientPayment>()

  ;(data as unknown as Row[]).forEach((row) => {
    const remaining = getScheduleRemaining(row)
    if (remaining <= 0) return

    const clientId = row.client_id
    const existing = byClient.get(clientId)
    const dueDate = row.due_date
    const overdue = new Date(dueDate) < now ? 1 : 0

    if (!existing) {
      byClient.set(clientId, {
        clientId,
        clientName: row.clients?.full_name || row.clients?.name || 'İsimsiz',
        phone: row.clients?.phone || null,
        processName: row.clients?.process_name || null,
        totalDue: getScheduleAmountDue(row),
        totalPaid: getScheduleAmountPaid(row),
        remaining,
        nextDueDate: dueDate,
        overdueCount: overdue,
      })
      return
    }

    existing.totalDue += getScheduleAmountDue(row)
    existing.totalPaid += getScheduleAmountPaid(row)
    existing.remaining += remaining
    if (!existing.nextDueDate || new Date(dueDate) < new Date(existing.nextDueDate)) {
      existing.nextDueDate = dueDate
    }
    existing.overdueCount += overdue
  })

  return Array.from(byClient.values()).sort((a, b) => b.remaining - a.remaining)
}
