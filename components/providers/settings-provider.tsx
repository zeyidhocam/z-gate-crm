'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// Ocean Elite - Tek Tema
export interface UIConfig {
    appName: string
    logoUrl: string
    theme: 'ocean-elite'  // Sadece 1 tema
    fontFamily: 'sans' | 'serif' | 'mono'
    fontWeight: 'normal' | 'bold'
    fontScale: 'small' | 'medium' | 'large' | 'xlarge'
    panelWidth: 'boxed' | 'full'
}

const DEFAULT_CONFIG: UIConfig = {
    appName: 'Z-Gate CRM',
    logoUrl: '',
    theme: 'ocean-elite',  // Sabit tema
    fontFamily: 'sans',
    fontWeight: 'normal',
    fontScale: 'medium',
    panelWidth: 'full',
}

interface SettingsContextType {
    config: UIConfig
    updateConfig: (partial: Partial<UIConfig>) => void
    isLoading: boolean
}

interface SystemSettingsRow {
    site_title?: string | null
    logo_url?: string | null
    font_family?: UIConfig['fontFamily'] | null
    font_weight?: UIConfig['fontWeight'] | null
    font_scale?: UIConfig['fontScale'] | null
    panel_width?: UIConfig['panelWidth'] | null
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<UIConfig>(DEFAULT_CONFIG)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        supabase
            .from('system_settings')
            .select('*')
            .single()
            .then(({ data }) => {
                const settings = data as SystemSettingsRow | null
                if (settings) {
                    setConfig({
                        appName: settings.site_title || DEFAULT_CONFIG.appName,
                        logoUrl: settings.logo_url || '',
                        theme: 'ocean-elite',  // Her zaman ocean-elite
                        fontFamily: settings.font_family || DEFAULT_CONFIG.fontFamily,
                        fontWeight: settings.font_weight || DEFAULT_CONFIG.fontWeight,
                        fontScale: settings.font_scale || DEFAULT_CONFIG.fontScale,
                        panelWidth: settings.panel_width || DEFAULT_CONFIG.panelWidth,
                    })
                }
                setIsLoading(false)
            })
    }, [])

    // Tema ayarlarını uygula
    useEffect(() => {
        const root = document.documentElement

        // Ocean Elite tema arka planını uygula (CSS değişkenleri zaten globals.css'te tanımlı)
        root.setAttribute('data-theme', 'ocean-elite')
        root.classList.add('dark')

        // Yazı Boyutu
        const scales: Record<string, string> = {
            'small': '14px',
            'medium': '16px',
            'large': '18px',
            'xlarge': '20px'
        }
        root.style.fontSize = scales[config.fontScale] || '16px'

        // Font Ailesi
        const fonts: Record<string, string> = {
            'sans': 'Montserrat, ui-sans-serif, system-ui, sans-serif',
            'serif': 'Georgia, ui-serif, serif',
            'mono': 'JetBrains Mono, ui-monospace, monospace'
        }
        root.style.fontFamily = fonts[config.fontFamily] || fonts['sans']

        // Font Kalınlığı - sadece body'ye
        document.body.style.fontWeight = config.fontWeight === 'bold' ? '600' : '400'

    }, [config])

    const updateConfig = useCallback((partial: Partial<UIConfig>) => {
        // Tema değiştirmeye izin verme
        const safePartial = { ...partial }
        delete safePartial.theme  // Tema değişikliğini engelle

        setConfig((prev) => ({ ...prev, ...safePartial }))

        supabase
            .from('system_settings')
            .update({
                site_title: partial.appName,
                logo_url: partial.logoUrl,
                font_family: partial.fontFamily,
                font_weight: partial.fontWeight,
                font_scale: partial.fontScale,
                panel_width: partial.panelWidth,
            })
            .eq('id', 1)
            .then(() => { })
    }, [])

    const value = useMemo(() => ({ config, updateConfig, isLoading }), [config, updateConfig, isLoading])

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
