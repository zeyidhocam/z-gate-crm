export interface LedgerScheduleLike {
  amount?: number | null
  amount_due?: number | null
  amount_paid?: number | null
  is_paid?: boolean | null
  due_date?: string | null
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function roundMoney(value: number): number {
  return round2(value)
}

export function getAmountDue(schedule: LedgerScheduleLike): number {
  const amountDue = toNumber(schedule.amount_due)
  if (amountDue > 0) return amountDue
  return toNumber(schedule.amount)
}

export function getAmountPaid(schedule: LedgerScheduleLike): number {
  const explicit = toNumber(schedule.amount_paid)
  if (explicit > 0) return explicit
  return schedule.is_paid ? getAmountDue(schedule) : 0
}

export function getRemaining(schedule: LedgerScheduleLike): number {
  return Math.max(0, getAmountDue(schedule) - getAmountPaid(schedule))
}

export function addMonthsSafe(base: Date, months: number): Date {
  const next = new Date(base)
  next.setMonth(next.getMonth() + months)
  return next
}

export function splitAmountEvenly(totalAmount: number, count: number): number[] {
  const safeCount = Math.max(1, Math.floor(count))
  const totalCents = Math.round(totalAmount * 100)
  const baseCents = Math.floor(totalCents / safeCount)
  const remainder = totalCents % safeCount

  return Array.from({ length: safeCount }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0)
    return cents / 100
  })
}

export function daysDiff(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.max(0, Math.floor((from.getTime() - to.getTime()) / msPerDay))
}

export function startOfDay(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}
