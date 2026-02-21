"use client"

import { useEffect, useMemo, useState } from "react"
import { addDays, addMonths, format } from "date-fns"
import { tr } from "date-fns/locale"
import { Wallet, CheckCircle2, CalendarClock, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { AiPaymentSuggestion } from "@/lib/ai/types"

type PaymentMode = "full_paid" | "deposit_plan" | "pay_later"

interface ConfirmLead {
  id: string
  name: string
  price?: number
}

interface ConfirmCustomerPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: ConfirmLead | null
  onSuccess?: () => void
}

interface InstallmentItem {
  amount: number
  dueDate: string
  note?: string
}

const MODE_LABEL: Record<PaymentMode, string> = {
  full_paid: "Tam Ödendi",
  deposit_plan: "Kapora + Plan",
  pay_later: "Sonradan Ödeme",
}

function splitAmountEvenly(totalAmount: number, count: number): number[] {
  const safeCount = Math.max(1, count)
  const totalCents = Math.round(totalAmount * 100)
  const base = Math.floor(totalCents / safeCount)
  const remainder = totalCents % safeCount

  return Array.from({ length: safeCount }, (_, index) => {
    const cents = base + (index < remainder ? 1 : 0)
    return cents / 100
  })
}

function buildInstallments(params: {
  totalAmount: number
  firstDueDate: Date
  installmentCount: number
  notePrefix: string
}): InstallmentItem[] {
  const { totalAmount, firstDueDate, installmentCount, notePrefix } = params
  const amounts = splitAmountEvenly(totalAmount, installmentCount)

  return amounts.map((amount, index) => ({
    amount,
    dueDate: addMonths(firstDueDate, index).toISOString(),
    note: `${notePrefix} ${index + 1}/${installmentCount}`,
  }))
}

export function ConfirmCustomerPaymentDialog({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: ConfirmCustomerPaymentDialogProps) {
  const [mode, setMode] = useState<PaymentMode | null>(null)
  const [totalAmount, setTotalAmount] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [installmentCount, setInstallmentCount] = useState<1 | 2 | 3>(2)
  const [firstDueDate, setFirstDueDate] = useState<Date | undefined>(addDays(new Date(), 7))
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestion, setSuggestion] = useState<AiPaymentSuggestion | null>(null)

  useEffect(() => {
    if (!open || !lead) return
    setMode(null)
    setTotalAmount(String(lead.price || ""))
    setDepositAmount("")
    setInstallmentCount(2)
    setFirstDueDate(addDays(new Date(), 7))
    setNote("")
    setSuggestion(null)
  }, [open, lead])

  useEffect(() => {
    if (mode === "deposit_plan" && installmentCount === 1) {
      setInstallmentCount(2)
    }
    if (mode === "full_paid") {
      setInstallmentCount(2)
    }
  }, [mode, installmentCount])

  const totalValue = Number(totalAmount)
  const depositValue = Number(depositAmount)
  const previewInstallments = useMemo(() => {
    if (!firstDueDate) return []

    if (mode === "deposit_plan") {
      if (!Number.isFinite(totalValue) || !Number.isFinite(depositValue)) return []
      const remaining = totalValue - depositValue
      if (remaining <= 0) return []
      return buildInstallments({
        totalAmount: remaining,
        firstDueDate,
        installmentCount: installmentCount < 2 ? 2 : installmentCount,
        notePrefix: "Kalan taksit",
      })
    }

    if (mode === "pay_later") {
      if (!Number.isFinite(totalValue) || totalValue <= 0) return []
      return buildInstallments({
        totalAmount: totalValue,
        firstDueDate,
        installmentCount,
        notePrefix: "Sonradan ödeme",
      })
    }

    return []
  }, [mode, totalValue, depositValue, firstDueDate, installmentCount])

  const submit = async () => {
    if (!lead) return
    if (!mode) {
      toast.error("Lütfen ödeme tipi seçin.")
      return
    }

    const total = Number(totalAmount)
    if (!Number.isFinite(total) || total <= 0) {
      toast.error("Toplam tutar pozitif olmalı.")
      return
    }

    const body: {
      clientId: string
      paymentMode: PaymentMode
      totalAmount: number
      depositAmount?: number
      installments?: InstallmentItem[]
      note?: string
    } = {
      clientId: lead.id,
      paymentMode: mode,
      totalAmount: total,
      note: note.trim() || undefined,
    }

    const dueDate = firstDueDate || addDays(new Date(), 7)

    if (mode === "deposit_plan") {
      const deposit = Number(depositAmount)
      if (!Number.isFinite(deposit) || deposit <= 0 || deposit >= total) {
        toast.error("Kapora tutarı 0 ile toplam tutar arasında olmalı.")
        return
      }

      const remaining = total - deposit
      const count = installmentCount < 2 ? 2 : installmentCount

      body.depositAmount = deposit
      body.installments = buildInstallments({
        totalAmount: remaining,
        firstDueDate: dueDate,
        installmentCount: count,
        notePrefix: "Kalan taksit",
      })
    }

    if (mode === "pay_later") {
      body.installments = buildInstallments({
        totalAmount: total,
        firstDueDate: dueDate,
        installmentCount,
        notePrefix: "Sonradan ödeme",
      })
    }

    setSaving(true)
    try {
      const res = await fetch("/api/customers/confirm-with-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Onay sırasında hata oluştu")
      }

      toast.success("Müşteri onaylandı ve ödeme planı kaydedildi.")
      onSuccess?.()
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Beklenmedik hata"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const fetchSuggestion = async () => {
    if (!lead) return

    const total = Number(totalAmount)
    if (!Number.isFinite(total) || total <= 0) {
      toast.error("Toplam tutar pozitif olmalı.")
      return
    }

    setSuggesting(true)
    try {
      const res = await fetch("/api/ai/payment-plan-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: lead.id,
          totalAmount: total,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok || !data?.suggestion) {
        throw new Error(data?.error || "AI önerisi alınamadı")
      }

      setSuggestion(data.suggestion as AiPaymentSuggestion)
      toast.success("AI ödeme önerisi hazır.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Beklenmedik hata"
      toast.error(message)
    } finally {
      setSuggesting(false)
    }
  }

  const applySuggestion = () => {
    if (!suggestion) return

    setMode(suggestion.mode)
    setDepositAmount(suggestion.depositAmount ? String(suggestion.depositAmount) : "")

    if (suggestion.installmentCount) {
      if (suggestion.mode === "deposit_plan") {
        const count = suggestion.installmentCount < 2 ? 2 : suggestion.installmentCount
        setInstallmentCount((count > 3 ? 3 : count) as 2 | 3)
      } else {
        setInstallmentCount((suggestion.installmentCount > 3 ? 3 : suggestion.installmentCount) as 1 | 2 | 3)
      }
    }

    if (suggestion.installments.length > 0) {
      const firstDate = new Date(suggestion.installments[0].dueDate)
      if (!Number.isNaN(firstDate.getTime())) {
        setFirstDueDate(firstDate)
      }
    }

    toast.success("AI önerisi forma uygulandı.")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c1929] border-cyan-500/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <Wallet size={18} className="text-emerald-400" />
            Onay ve Ödeme Planı
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Müşteriyi onaylamadan önce ödeme modelini seçmeniz gerekiyor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="text-xs text-slate-500 font-bold">MÜŞTERİ</div>
            <div className="text-sm text-slate-200 font-bold">{lead?.name || "-"}</div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Toplam Tutar (TL)</label>
            <Input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-200"
              placeholder="Örn: 10000"
            />
          </div>

          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                <Sparkles size={14} />
                AI Ödeme Asistanı
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={fetchSuggestion}
                disabled={suggesting}
                className="border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
              >
                {suggesting ? "Hesaplanıyor..." : "AI Önerisi Al"}
              </Button>
            </div>

            {suggestion && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-200">Mod: {MODE_LABEL[suggestion.mode]}</span>
                  <span className="text-cyan-300 font-bold">Güven: %{Math.round(suggestion.confidence * 100)}</span>
                </div>
                {typeof suggestion.depositAmount === "number" && suggestion.depositAmount > 0 && (
                  <div className="text-[11px] text-slate-300">
                    Kapora: {suggestion.depositAmount.toLocaleString("tr-TR")} TL
                  </div>
                )}
                {suggestion.installments.length > 0 && (
                  <div className="text-[11px] text-slate-300">
                    Taksit: {suggestion.installments.length} adet
                  </div>
                )}
                {suggestion.reasons.length > 0 && (
                  <div className="space-y-1">
                    {suggestion.reasons.slice(0, 3).map((reason, index) => (
                      <div key={`${reason}-${index}`} className="text-[11px] text-slate-400">
                        - {reason}
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={applySuggestion}
                  className="w-full bg-cyan-600/80 hover:bg-cyan-500 text-white"
                >
                  Öneriyi Uygula
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(["full_paid", "deposit_plan", "pay_later"] as PaymentMode[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                  mode === key
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {MODE_LABEL[key]}
              </button>
            ))}
          </div>

          {mode === "deposit_plan" && (
            <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Kapora Tutari (TL)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-slate-200"
                    placeholder="Örn: 5000"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const total = Number(totalAmount)
                      if (Number.isFinite(total) && total > 0) {
                        setDepositAmount(String(Math.round(total / 2)))
                      }
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    %50
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Kalan Taksit Sayısı</label>
                <div className="grid grid-cols-2 gap-2">
                  {[2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setInstallmentCount(count as 2 | 3)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        installmentCount === count
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                          : "bg-slate-900/40 border-slate-700 text-slate-400"
                      }`}
                    >
                      {count} taksit
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">İlk Vade</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-slate-900/50 border-slate-700 text-slate-200">
                      <CalendarClock size={14} className="mr-2" />
                      {firstDueDate ? format(firstDueDate, "dd MMMM yyyy", { locale: tr }) : "Tarih seç"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0c1929] border-cyan-500/20">
                    <Calendar mode="single" selected={firstDueDate} onSelect={setFirstDueDate} locale={tr} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {mode === "pay_later" && (
            <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Taksit Sayısı</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setInstallmentCount(count as 1 | 2 | 3)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        installmentCount === count
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                          : "bg-slate-900/40 border-slate-700 text-slate-400"
                      }`}
                    >
                      {count} taksit
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">İlk Vade</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-slate-900/50 border-slate-700 text-slate-200">
                      <CalendarClock size={14} className="mr-2" />
                      {firstDueDate ? format(firstDueDate, "dd MMMM yyyy", { locale: tr }) : "Tarih seç"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0c1929] border-cyan-500/20">
                    <Calendar mode="single" selected={firstDueDate} onSelect={setFirstDueDate} locale={tr} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {previewInstallments.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400 font-bold mb-2">PLAN ÖNİZLEME</div>
              <div className="space-y-1">
                {previewInstallments.map((item, index) => (
                  <div key={`${item.dueDate}-${index}`} className="text-xs text-slate-300 flex justify-between gap-3">
                    <span>{index + 1}. taksit</span>
                    <span>{item.amount.toLocaleString("tr-TR")} TL - {format(new Date(item.dueDate), "dd MMM yyyy", { locale: tr })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Not (isteğe bağlı)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-200 resize-none"
              rows={3}
              placeholder="Ödeme anlaşma notu..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-slate-400"
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={saving || !mode}
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold gap-2"
          >
            <CheckCircle2 size={16} />
            {saving ? "Kaydediliyor..." : "Onayla ve Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
