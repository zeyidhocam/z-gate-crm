'use client'

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export function MobileSidebar() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    // Sayfa değişince menüyü kapat
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
                    <Menu size={24} />
                    <span className="sr-only">Menüyü Aç</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-transparent border-none w-[280px]">
                {/* 
                    Sidebar bileşenini olduğu gibi kullanıyoruz.
                    Sidebar'ın kendi içindeki stil ayarları (w-[260px] vb.) buraya uyum sağlar.
                    Ancak SheetContent içinde olduğu için layout bozulmaz.
                */}
                <div className="h-full w-full">
                    <Sidebar className="w-full h-full border-r-0" />
                </div>
            </SheetContent>
        </Sheet>
    )
}
