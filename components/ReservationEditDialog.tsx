"use client"

import { useState, useEffect } from "react"
import { CalendarClock, CalendarDays, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, parseISO, setHours, setMinutes } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Lead {
  id: string
  name: string
  reservation_at?: string
}

interface ReservationEditDialogProps {
  client: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (date: Date) => void
}

export function ReservationEditDialog({ client, open, onOpenChange, onSave }: ReservationEditDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState<string>("12:00") // Default time

  // Sync state when dialog opens with a new client
  useEffect(() => {
    if (open && client?.reservation_at) {
      const reservationDate = parseISO(client.reservation_at)
      setDate(reservationDate)
      setTime(format(reservationDate, 'HH:mm'))
    }
  }, [open, client])

  const handleSave = () => {
    if (!date || !time) return

    const [hours, minutes] = time.split(':').map(Number)
    const newDate = setMinutes(setHours(date, hours), minutes)

    onSave(newDate)
    onOpenChange(false)
  }

  // Generate time slots (30 min intervals)
  const timeSlots = []
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0')
    timeSlots.push(`${hour}:00`)
    timeSlots.push(`${hour}:30`)
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c1929] border-cyan-500/20 text-slate-200 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gradient-ocean flex items-center gap-2">
            <CalendarClock size={22} className="text-cyan-400" />
            Tarih Değiştir
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mb-4">
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1">Müşteri</div>
            <div className="font-bold text-slate-200">{client.name}</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <CalendarDays size={14} /> Tarih
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-[#0a1628] border-cyan-500/10 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "d MMMM yyyy, EEEE", { locale: tr }) : <span>Tarih Seçin</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#0c1929] border-cyan-500/20" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={tr}
                  className="p-3 pointer-events-auto bg-[#0c1929] text-slate-200 rounded-md border border-slate-800"
                  classNames={{
                    day_selected: "bg-cyan-600 text-white hover:bg-cyan-600 focus:bg-cyan-600 rounded-md",
                    day_today: "bg-slate-800 text-cyan-400 font-bold rounded-md",
                    head_cell: "text-slate-500 font-bold",
                    caption_label: "text-slate-300 font-bold",
                    nav_button: "hover:bg-slate-800 hover:text-white rounded-md",
                    day: "h-9 w-9 p-0 font-normal hover:bg-slate-800 rounded-md aria-selected:opacity-100"
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Clock size={14} /> Saat
            </label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="bg-[#0a1628] border-cyan-500/10 hover:border-cyan-500/30 w-full">
                <SelectValue placeholder="Saat Seçin" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c1929] border-cyan-500/20 max-h-[200px] text-slate-300">
                {timeSlots.map(slot => (
                  <SelectItem key={slot} value={slot} className="hover:bg-slate-800 cursor-pointer focus:bg-cyan-500/20 focus:text-cyan-300">{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-red-500/10 hover:text-red-400">İptal</Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20">Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
