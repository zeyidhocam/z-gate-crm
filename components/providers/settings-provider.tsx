"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface UIConfig {
    theme: 'modern-purple' | 'ocean-blue' | 'forest-green' | 'sunset-orange'
    appName: string
    sidebarTitle: string
    logoUrl: string | null
    isSidebarCollapsed: boolean
}

const DEFAULT_CONFIG: UIConfig = {
    theme: 'modern-purple',
    appName: 'Oracle CRM',
    sidebarTitle: 'Rezervasyon CRM',
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

    const fetchSettings = async () => {
        setIsLoading(true)
        if (!('auth' in supabase)) {
            // Mock mode
            const saved = localStorage.getItem('ui_config')
            if (saved) setConfig(JSON.parse(saved))
            setIsLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('settings')
                .select('ui_config')
                .single()

            if (data?.ui_config) {
                setConfig({ ...DEFAULT_CONFIG, ...data.ui_config })
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

        if (!('auth' in supabase)) {
            localStorage.setItem('ui_config', JSON.stringify(newConfig))
            return
        }

        try {
            // First check if row exists, if not insert
            const { count } = await supabase.from('settings').select('*', { count: 'exact', head: true })

            if (count === 0) {
                await supabase.from('settings').insert([{ ui_config: newConfig }])
            } else {
                // Assuming single row for global settings
                // For multi-user, we'd use user_id, but here it's global app config as requested
                await supabase
                    .from('settings')
                    .update({ ui_config: newConfig })
                    .not('id', 'is', null) // Update all/first row
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            // Revert on error could go here
        }
    }

    const resetToDefaults = async () => {
        setConfig(DEFAULT_CONFIG)
        if ('auth' in supabase) {
            await supabase
                .from('settings')
                .update({ ui_config: DEFAULT_CONFIG })
                .not('id', 'is', null)
        } else {
            localStorage.removeItem('ui_config')
        }
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
