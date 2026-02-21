"use client"

import type { MouseEvent } from "react"
import { cn } from "@/lib/utils"
import { buildWhatsAppDesktopUrl } from "@/lib/whatsapp"

interface WhatsAppNameLinkProps {
  name: string
  phone?: string | null
  className?: string
  title?: string
}

export function WhatsAppNameLink({
  name,
  phone,
  className,
  title,
}: WhatsAppNameLinkProps) {
  if (!phone) {
    return <span className={className}>{name}</span>
  }

  const openWhatsApp = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const url = buildWhatsAppDesktopUrl(phone, "")
    window.open(url, "_self")
  }

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      title={title || `${name} ile WhatsApp ac`}
      className={cn(
        "text-left cursor-pointer bg-transparent border-0 p-0 no-underline hover:no-underline focus:outline-none",
        className
      )}
    >
      {name}
    </button>
  )
}
