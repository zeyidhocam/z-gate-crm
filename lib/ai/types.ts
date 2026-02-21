export type AiPaymentMode = 'full_paid' | 'deposit_plan' | 'pay_later'
export type AiRiskLevel = 'low' | 'medium' | 'high'
export type AiMessageScenario = 'overdue' | 'today_due' | 'upcoming' | 'partial_followup'
export type AiMessageTone = 'soft' | 'standard' | 'firm'
export type AiMessageChannel = 'whatsapp' | 'telegram'

export interface AiReason {
  key: string
  text: string
  impact: number
}

export interface AiPaymentInstallment {
  amount: number
  dueDate: string
}

export interface AiPaymentSuggestion {
  mode: AiPaymentMode
  depositAmount?: number
  installmentCount?: 1 | 2 | 3
  installments: AiPaymentInstallment[]
  confidence: number
  reasons: string[]
}

export interface AiRiskFactor {
  key: string
  value: number | string
  impact: number
}

export interface AiRiskScore {
  score: number
  level: AiRiskLevel
  factors: AiRiskFactor[]
}

export interface AiMessageDraft {
  text: string
  maskedFields: string[]
  reasons: string[]
}
