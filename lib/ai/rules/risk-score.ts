import type { AiRiskFactor, AiRiskLevel, AiRiskScore } from '@/lib/ai/types'
import { clamp, daysDiff, getAmountDue, getAmountPaid, getRemaining, round2, startOfDay } from '@/lib/ai/rules/shared'

export interface LedgerTransactionLike {
  paid_at?: string | null
}

export interface LedgerRiskMetrics {
  totalDue: number
  totalPaid: number
  remaining: number
  overdueCount: number
  longestOverdueDays: number
  remainingRatio: number
  daysSinceLastPayment: number
  lastPaymentAt: string | null
}

interface RiskContribution {
  overdueInstallmentCount: number
  longestOverdueDays: number
  remainingRatio: number
  daysSinceLastPayment: number
}

const WEIGHTS = {
  overdueInstallmentCount: 35,
  longestOverdueDays: 25,
  remainingRatio: 20,
  daysSinceLastPayment: 20,
} as const

function resolveRiskLevel(score: number): AiRiskLevel {
  if (score >= 70) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

function normalizeContributions(metrics: LedgerRiskMetrics): RiskContribution {
  const overdueNorm = clamp(metrics.overdueCount, 0, 5) / 5
  const overdueDaysNorm = clamp(metrics.longestOverdueDays, 0, 60) / 60
  const remainingNorm = clamp(metrics.remainingRatio, 0, 1)
  const paymentGapNorm = clamp(metrics.daysSinceLastPayment, 0, 60) / 60

  return {
    overdueInstallmentCount: overdueNorm * WEIGHTS.overdueInstallmentCount,
    longestOverdueDays: overdueDaysNorm * WEIGHTS.longestOverdueDays,
    remainingRatio: remainingNorm * WEIGHTS.remainingRatio,
    daysSinceLastPayment: paymentGapNorm * WEIGHTS.daysSinceLastPayment,
  }
}

function toFactors(metrics: LedgerRiskMetrics, contribution: RiskContribution): AiRiskFactor[] {
  return [
    {
      key: 'overdue_installment_count',
      value: metrics.overdueCount,
      impact: round2(contribution.overdueInstallmentCount),
    },
    {
      key: 'longest_overdue_days',
      value: metrics.longestOverdueDays,
      impact: round2(contribution.longestOverdueDays),
    },
    {
      key: 'remaining_ratio',
      value: round2(metrics.remainingRatio),
      impact: round2(contribution.remainingRatio),
    },
    {
      key: 'days_since_last_payment',
      value: metrics.lastPaymentAt ? metrics.daysSinceLastPayment : 'no_payment_history',
      impact: round2(contribution.daysSinceLastPayment),
    },
  ]
}

export function buildLedgerRiskMetrics(params: {
  schedules: Array<{
    amount?: number | null
    amount_due?: number | null
    amount_paid?: number | null
    is_paid?: boolean | null
    due_date?: string | null
  }>
  transactions?: LedgerTransactionLike[]
  now?: Date
}): LedgerRiskMetrics {
  const { schedules, transactions = [], now = new Date() } = params
  const today = startOfDay(now)

  let totalDue = 0
  let totalPaid = 0
  let overdueCount = 0
  let longestOverdueDays = 0

  for (const row of schedules) {
    const due = getAmountDue(row)
    const paid = getAmountPaid(row)
    const remaining = getRemaining(row)

    totalDue += due
    totalPaid += paid

    if (remaining <= 0 || !row.due_date) continue
    const dueDate = new Date(row.due_date)
    if (Number.isNaN(dueDate.getTime())) continue
    if (dueDate >= today) continue

    overdueCount += 1
    longestOverdueDays = Math.max(longestOverdueDays, daysDiff(today, dueDate))
  }

  const remaining = Math.max(0, totalDue - totalPaid)
  const remainingRatio = totalDue > 0 ? remaining / totalDue : 0

  let lastPaymentAt: string | null = null
  for (const transaction of transactions) {
    if (!transaction.paid_at) continue
    const paidDate = new Date(transaction.paid_at)
    if (Number.isNaN(paidDate.getTime())) continue
    if (!lastPaymentAt || paidDate > new Date(lastPaymentAt)) {
      lastPaymentAt = paidDate.toISOString()
    }
  }

  const daysSinceLastPayment = lastPaymentAt
    ? daysDiff(today, new Date(lastPaymentAt))
    : totalDue > 0 && totalPaid <= 0
      ? 90
      : 0

  return {
    totalDue: round2(totalDue),
    totalPaid: round2(totalPaid),
    remaining: round2(remaining),
    overdueCount,
    longestOverdueDays,
    remainingRatio: round2(remainingRatio),
    daysSinceLastPayment,
    lastPaymentAt,
  }
}

export function scoreCollectionRisk(metrics: LedgerRiskMetrics): AiRiskScore {
  if (metrics.totalDue <= 0) {
    return {
      score: 0,
      level: 'low',
      factors: toFactors(metrics, {
        overdueInstallmentCount: 0,
        longestOverdueDays: 0,
        remainingRatio: 0,
        daysSinceLastPayment: 0,
      }),
    }
  }

  const contribution = normalizeContributions(metrics)
  const score = clamp(
    Math.round(
      contribution.overdueInstallmentCount +
      contribution.longestOverdueDays +
      contribution.remainingRatio +
      contribution.daysSinceLastPayment
    ),
    0,
    100
  )

  return {
    score,
    level: resolveRiskLevel(score),
    factors: toFactors(metrics, contribution),
  }
}
