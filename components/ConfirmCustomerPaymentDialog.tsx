"use client"

import { useEffect, useState } from "react"
import { addDays, format } from "date-fns"
import { tr } from "date-fns/locale"
import { Wallet, CheckCircle2, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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

const MODE_LABEL: Record<PaymentMode, string> = {
  full_paid: "Tam Ödendi",
  deposit_plan: "Kapora + Plan",
  pay_later: "Sonradan Ödeme",
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
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 7))
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !lead) return
    setMode(null)
    setTotalAmount(String(lead.price || ""))
    setDepositAmount("")
    setDueDate(addDays(new Date(), 7))
    setNote("")
  }, [open, lead])

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
      installments?: Array<{ amount: number; dueDate: string; note?: string }>
      note?: string
    } = {
      clientId: lead.id,
      paymentMode: mode,
      totalAmount: total,
      note: note.trim() || undefined,
    }

    if (mode === "deposit_plan") {
      const deposit = Number(depositAmount)
      if (!Number.isFinite(deposit) || deposit <= 0 || deposit >= total) {
        toast.error("Kapora tutarı 0 ile toplam arasında olmalı.")
        return
      }
      body.depositAmount = deposit
      body.installments = [
        {
          amount: total - deposit,
          dueDate: (dueDate || addDays(new Date(), 7)).toISOString(),
          note: "Kalan ödeme",
        },
      ]
    }

    if (mode === "pay_later") {
      body.installments = [
        {
          amount: total,
          dueDate: (dueDate || addDays(new Date(), 7)).toISOString(),
          note: "Sonradan ödeme",
        },
      ]
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
            <label className="text-xs font-bold text-slate-400 mb-1 block">Toplam Tutar (₺)</label>
            <Input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-200"
              placeholder="Örn: 10000"
            />
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
                <label className="text-xs font-bold text-slate-400 mb-1 block">Kapora Tutarı (₺)</label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-slate-200"
                  placeholder="Örn: 3000"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Kalan Ödeme Vadesi</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-slate-900/50 border-slate-700 text-slate-200">
                      <CalendarClock size={14} className="mr-2" />
                      {dueDate ? format(dueDate, "dd MMMM yyyy", { locale: tr }) : "Tarih seç"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0c1929] border-cyan-500/20">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={tr} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {mode === "pay_later" && (
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">İlk Vade</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-slate-900/50 border-slate-700 text-slate-200">
                    <CalendarClock size={14} className="mr-2" />
                    {dueDate ? format(dueDate, "dd MMMM yyyy", { locale: tr }) : "Tarih seç"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0c1929] border-cyan-500/20">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={tr} />
                </PopoverContent>
              </Popover>
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
