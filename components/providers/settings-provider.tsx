"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface UIConfig {
    appName: string
    logoUrl: string
    theme: string
    fontFamily: 'sans' | 'serif' | 'mono'
    fontWeight: 'normal' | 'bold'
    fontScale: 'small' | 'medium' | 'large' | 'xlarge'
    panelWidth: 'full' | 'boxed'
    whatsappNumber?: string
}

const DEFAULT_CONFIG: UIConfig = {
    appName: 'Z-Gate CRM',
    logoUrl: '',
    theme: 'zeyid-moru',
    fontFamily: 'sans',
    fontWeight: 'normal',
    fontScale: 'medium',
    panelWidth: 'full',
    whatsappNumber: ''
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

    // Initial Fetch
    useEffect(() => {
        fetchSettings()
    }, [])

    // Theme Engine: Apply styles when config changes
    useEffect(() => {
        const root = document.documentElement

        // 1. Set Theme Attribute matches [data-theme='name'] selectors in globals.css
        root.setAttribute('data-theme', config.theme)

        // 2. FORCE GLobal Variables (Fallback for CSS issues) across all components
        const gradients: Record<string, string[]> = {
            'zeyid-moru': ['#0F111A', '#1a1033', '#2D0F35'],
            'gece-mavisi': ['#020617', '#0f172a', '#1e3a8a'],
            'mistik-zumrut': ['#022c22', '#064e3b', '#065f46'],
            'bordo-asalet': ['#450a0a', '#7f1d1d', '#991b1b'],
            'minimal-siyah': ['#000000', '#171717', '#262626'],
            // Fallbacks
            'modern-purple': ['#0F111A', '#1a1033', '#2D0F35'],
            'ocean-blue': ['#020617', '#0f172a', '#1e3a8a'],
        }
        const activeGradient = gradients[config.theme] || gradients['zeyid-moru']
        root.style.setProperty('--gradient-start', activeGradient[0])
        root.style.setProperty('--gradient-via', activeGradient[1])
        root.style.setProperty('--gradient-end', activeGradient[2])

        // 3. Font Scale
        const scales: Record<string, string> = {
            'small': '14px',
            'medium': '16px',
            'large': '18px',
            'xlarge': '20px'
        }
        root.style.fontSize = scales[config.fontScale] || '16px'

        // 3. Font Family
        const fonts: Record<string, string> = {
            'sans': '"Montserrat", sans-serif',
            'serif': '"Playfair Display", serif',
            'mono': '"JetBrains Mono", monospace'
        }
        root.style.setProperty('--font-sans', fonts[config.fontFamily] || fonts['sans'])

        // 4. Font Weight
        if (config.fontWeight === 'bold') {
            root.classList.add('font-bold-mode')
            root.style.fontWeight = '600'
        } else {
            root.classList.remove('font-bold-mode')
            root.style.fontWeight = 'normal'
        }

        // 5. Panel Width (handled via CSS var or Context consumption in Layout)
        root.style.setProperty('--panel-max-width', config.panelWidth === 'boxed' ? '1400px' : '100%')

    }, [config])

    const fetchSettings = async () => {
        setIsLoading(true)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const saved = localStorage.getItem('system_settings')
            if (saved) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) })
            setIsLoading(false)
            return
        }

        try {
            const { data, error } = await supabase.from('system_settings').select('*').single()
            if (data) {
                setConfig({
                    appName: data.site_title || DEFAULT_CONFIG.appName,
                    logoUrl: data.logo_url || DEFAULT_CONFIG.logoUrl,
                    theme: data.theme_preference || DEFAULT_CONFIG.theme,
                    fontFamily: data.font_family || DEFAULT_CONFIG.fontFamily,
                    fontWeight: data.font_weight || DEFAULT_CONFIG.fontWeight,
                    fontScale: data.font_scale || DEFAULT_CONFIG.fontScale,
                    panelWidth: data.panel_width || DEFAULT_CONFIG.panelWidth,
                    whatsappNumber: data.whatsapp_number || DEFAULT_CONFIG.whatsappNumber
                } as any)
            } else if (error && error.code === 'PGRST116') {
                await supabase.from('system_settings').insert([{ site_title: DEFAULT_CONFIG.appName }])
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const updateConfig = async (updates: Partial<UIConfig>) => {
        const newConfig = { ...config, ...updates }
        setConfig(newConfig) // Optimistic

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            localStorage.setItem('system_settings', JSON.stringify(newConfig))
            return
        }

        try {
            const dbPayload: any = {}
            if (updates.appName) dbPayload.site_title = updates.appName
            if (updates.logoUrl !== undefined) dbPayload.logo_url = updates.logoUrl
            if (updates.theme) dbPayload.theme_preference = updates.theme
            if (updates.fontFamily) dbPayload.font_family = updates.fontFamily
            if (updates.fontWeight) dbPayload.font_weight = updates.fontWeight
            if (updates.fontScale) dbPayload.font_scale = updates.fontScale
            if (updates.panelWidth) dbPayload.panel_width = updates.panelWidth
            if (updates.whatsappNumber !== undefined) dbPayload.whatsapp_number = updates.whatsappNumber

            if (Object.keys(dbPayload).length > 0) {
                await supabase.from('system_settings').update(dbPayload).gt('id', 0)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const resetToDefaults = async () => {
        await updateConfig(DEFAULT_CONFIG)
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
