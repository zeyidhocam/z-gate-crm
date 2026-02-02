
import type { Metadata } from 'next'
import "@/app/globals.css"
import "@fontsource/montserrat/400.css"
import "@fontsource/montserrat/600.css"
import "@fontsource/montserrat/700.css"
import { Sidebar } from '@/components/Sidebar'
import { SettingsProvider } from '@/components/providers/settings-provider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Z-Gate CRM',
  description: 'Premium dark dashboard for offline reservation management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-background text-foreground min-h-screen flex font-sans antialiased">
        <SettingsProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen overflow-auto bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#0F111A] via-slate-950 to-[#020617]">
            {children}
          </main>
          <Toaster position="top-center" theme="dark" />
        </SettingsProvider>
      </body>
    </html>
  )
}
