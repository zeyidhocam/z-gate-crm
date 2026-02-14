
import type { Metadata } from 'next'
import "@/app/globals.css"
import "@fontsource/montserrat/400.css"
import "@fontsource/montserrat/600.css"
import "@fontsource/montserrat/700.css"
import { Sidebar } from '@/components/Sidebar'
import { GlobalReminderManager } from '@/components/GlobalReminderManager'
import { SettingsProvider } from '@/components/providers/settings-provider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Z-Gate CRM',
  description: 'Premium dark dashboard for offline reservation management',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

import { MobileSidebar } from '@/components/MobileSidebar'

// ... imports remain the same

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-background text-foreground min-h-screen flex font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <SettingsProvider>
          <GlobalReminderManager />

          {/* Desktop Sidebar (Hidden on Mobile) */}
          <div className="hidden md:flex h-screen sticky top-0">
            <Sidebar />
          </div>

          {/* Main Content Area */}
          <main className="flex-1 min-h-screen flex flex-col overflow-hidden bg-background">

            {/* Mobile Header (Visible only on Mobile) */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-cyan-500/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <MobileSidebar />
                <span className="font-bold text-lg text-gradient-ocean">Z-Gate CRM</span>
              </div>
              {/* Mobile Header Right Actions (Optional - currently empty) */}
              <div className="w-8"></div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto app-gradient-bg">
              {children}
            </div>
          </main>
          <Toaster position="top-center" theme="dark" />
        </SettingsProvider>
      </body>
    </html>
  )
}
