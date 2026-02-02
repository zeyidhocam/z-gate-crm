"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface UIConfig {
    theme: 'modern-purple' | 'ocean-blue' | 'forest-green' | 'sunset-orange'
    appName: string
    sidebarTitle: string
    logoUrl: string | null
    isSidebarCollapsed: boolean
    whatsappNumber?: string
    fontSize?: 'normal' | 'large'
}

const DEFAULT_CONFIG: UIConfig = {
    theme: 'modern-purple',
    appName: 'Z-Gate CRM',
    sidebarTitle: 'Z-Gate',
    logoUrl: null,
    isSidebarCollapsed: false
}

interface SettingsContextType {
    config: UIConfig
    isLoading: boolean
    updateConfig: (updates: Partial<UIConfig>) => Promise<void>
    resetToDefaults: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<UIConfig>(DEFAULT_CONFIG)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchSettings()
    }, [])

    // Apply theme to body/html
    useEffect(() => {
        const root = document.documentElement
        root.classList.remove('modern-purple', 'ocean-blue', 'forest-green', 'sunset-orange')
        if (config.theme) root.classList.add(config.theme)

        if (config.fontSize === 'large') {
            root.style.fontSize = '18px'
        } else {
            root.style.fontSize = ''
        }
    }, [config.theme, config.fontSize])

    const fetchSettings = async () => {
        setIsLoading(true)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            // Mock mode
            const saved = localStorage.getItem('ui_config')
            if (saved) setConfig(JSON.parse(saved))
            setIsLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .single()

            if (data) {
                setConfig({
                    theme: data.theme_preference || 'modern-purple',
                    appName: data.site_title || 'Z-Gate CRM',
                    sidebarTitle: data.site_title?.split(' ')[0] || 'Z-Gate', // Simple logic for sidebar title
                    logoUrl: data.logo_url || null,
                    isSidebarCollapsed: false,
                    whatsappNumber: data.whatsapp_number,
                    fontSize: data.font_size
                } as any)
            } else if (error && error.code === 'PGRST116') {
                // No rows, try to insert default
                await supabase.from('system_settings').insert([{ site_title: 'Z-Gate CRM' }])
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const updateConfig = async (updates: Partial<UIConfig>) => {
        const newConfig = { ...config, ...updates }
        setConfig(newConfig) // Optimistic update

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            localStorage.setItem('ui_config', JSON.stringify(newConfig))
            return
        }

        try {
            const dbUpdates: any = {}
            if (updates.theme) dbUpdates.theme_preference = updates.theme
            if (updates.appName) dbUpdates.site_title = updates.appName
            if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl
            if ((updates as any).whatsappNumber !== undefined) dbUpdates.whatsapp_number = (updates as any).whatsappNumber
            if ((updates as any).fontSize !== undefined) dbUpdates.font_size = (updates as any).fontSize

            if (Object.keys(dbUpdates).length > 0) {
                await supabase
                    .from('system_settings')
                    .update(dbUpdates)
                    .gt('id', 0) // Update all rows (should be only one) or use single ID if we tracked it
            }
        } catch (error) {
            console.error('Error saving settings:', error)
        }
    }

    const resetToDefaults = async () => {
        setConfig(DEFAULT_CONFIG)
        // Reset DB logic if needed, but usually we just want to reset local state or specific fields
    }

    return (
        <SettingsContext.Provider value={{ config, isLoading, updateConfig, resetToDefaults }}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider")
    }
    return context
}
