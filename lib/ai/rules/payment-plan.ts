import type { AiPaymentSuggestion, AiRiskLevel } from '@/lib/ai/types'
import { addMonthsSafe, clamp, round2, roundMoney, splitAmountEvenly } from '@/lib/ai/rules/shared'

interface PaymentSuggestionInput {
  totalAmount: number
  clientRiskLevel: AiRiskLevel
  stage?: number
  existingOverdueCount?: number
  now?: Date
}

function buildInstallments(totalAmount: number, count: 1 | 2 | 3, firstDueDate: Date) {
  const amounts = splitAmountEvenly(totalAmount, count)
  return amounts.map((amount, index) => ({
    amount: roundMoney(amount),
    dueDate: addMonthsSafe(firstDueDate, index).toISOString(),
  }))
}

function buildConfidence(params: {
  riskLevel: AiRiskLevel
  totalAmount: number
  existingOverdueCount: number
  stage: number
}): number {
  const { riskLevel, totalAmount, existingOverdueCount, stage } = params
  let confidence = 0.82

  if (totalAmount <= 5000) confidence += 0.06
  if (riskLevel === 'high') confidence += 0.04
  if (riskLevel === 'medium') confidence += 0.02
  if (existingOverdueCount > 0) confidence -= 0.08
  if (stage >= 3) confidence += 0.03

  return round2(clamp(confidence, 0.6, 0.96))
}

export function suggestPaymentPlan(input: PaymentSuggestionInput): AiPaymentSuggestion {
  const now = input.now || new Date()
  const totalAmount = roundMoney(input.totalAmount)
  const riskLevel = input.clientRiskLevel
  const stage = input.stage || 1
  const existingOverdueCount = input.existingOverdueCount || 0
  const riskLabel = riskLevel === 'high' ? 'yüksek' : riskLevel === 'medium' ? 'orta' : 'düşük'

  if (totalAmount <= 5000 && riskLevel === 'low') {
    return {
      mode: 'full_paid',
      depositAmount: totalAmount,
      installmentCount: 1,
      installments: [],
      confidence: buildConfidence({
        riskLevel,
        totalAmount,
        existingOverdueCount,
        stage,
      }),
      reasons: [
        'Toplam tutar 5.000 TL altında olduğu için tam ödeme önerildi.',
        'Risk seviyesi düşük olduğu için tek adımda tahsilat uygun görüldü.',
      ],
    }
  }

  const firstDueDate = new Date(now)
  firstDueDate.setDate(firstDueDate.getDate() + 7)

  const installmentCount: 2 | 3 = totalAmount > 15000 ? 3 : 2
  const baseDepositPercent = totalAmount > 15000 ? 40 : 50
  const minByRisk = riskLevel === 'high' ? 50 : riskLevel === 'medium' ? 40 : 0
  const depositPercent = Math.max(baseDepositPercent, minByRisk)

  let depositAmount = roundMoney((totalAmount * depositPercent) / 100)
  if (depositAmount >= totalAmount) {
    depositAmount = roundMoney(Math.max(totalAmount - 1, totalAmount * 0.5))
  }

  const remaining = roundMoney(Math.max(0, totalAmount - depositAmount))

  return {
    mode: 'deposit_plan',
    depositAmount,
    installmentCount,
    installments: buildInstallments(remaining, installmentCount, firstDueDate),
    confidence: buildConfidence({
      riskLevel,
      totalAmount,
      existingOverdueCount,
      stage,
    }),
    reasons: [
      totalAmount > 15000
        ? 'Tutar 15.000 TL üstü olduğu için kalan borç 3 taksite bölündü.'
        : 'Tutar aralığına göre kalan borç 2 taksite bölündü.',
      `Risk seviyesi ${riskLabel} olduğu için kapora tabanı %${depositPercent} olarak seçildi.`,
      existingOverdueCount > 0
        ? `Müşteride ${existingOverdueCount} gecikmiş taksit bulunduğu için peşinat güçlendirildi.`
        : 'Gecikmiş taksit kaydı olmadığı için standart kural uygulandı.',
    ],
  }
}
