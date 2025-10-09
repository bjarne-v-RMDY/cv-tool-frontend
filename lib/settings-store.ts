import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
    brandColor: string
    setBrandColor: (color: string) => void
    resetBrandColor: () => void
}

// Default RMDY orange color
const DEFAULT_BRAND_COLOR = '#FF4D00'

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            brandColor: DEFAULT_BRAND_COLOR,
            setBrandColor: (color: string) => {
                set({ brandColor: color })
                // Apply the color to CSS variables
                applyBrandColor(color)
            },
            resetBrandColor: () => {
                set({ brandColor: DEFAULT_BRAND_COLOR })
                applyBrandColor(DEFAULT_BRAND_COLOR)
            },
        }),
        {
            name: 'cvtool-settings-storage',
        }
    )
)

// Apply brand color to CSS variables
function applyBrandColor(color: string) {
    if (typeof window === 'undefined') return
    
    const root = document.documentElement
    
    // Create a temporary element to let the browser convert hex to RGB
    const temp = document.createElement('div')
    temp.style.color = color
    document.body.appendChild(temp)
    const computedColor = window.getComputedStyle(temp).color
    document.body.removeChild(temp)
    
    // Extract RGB values
    const match = computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (!match) return
    
    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])
    
    // Convert RGB to HSL for lightness-based dark mode adjustment
    const rNorm = r / 255
    const gNorm = g / 255
    const bNorm = b / 255
    
    const max = Math.max(rNorm, gNorm, bNorm)
    const min = Math.min(rNorm, gNorm, bNorm)
    const l = (max + min) / 2
    
    // For dark mode, slightly lighten the color
    let darkModeColor = color
    if (l < 0.7) {
        // Lighten by mixing with white
        const factor = 0.15
        const rLight = Math.round(r + (255 - r) * factor)
        const gLight = Math.round(g + (255 - g) * factor)
        const bLight = Math.round(b + (255 - b) * factor)
        darkModeColor = `rgb(${rLight}, ${gLight}, ${bLight})`
    }
    
    // Apply colors directly as hex/rgb (browsers handle color space conversion)
    root.style.setProperty('--primary', color)
    root.style.setProperty('--primary-dark', darkModeColor)
    root.style.setProperty('--sidebar-primary', color)
    root.style.setProperty('--sidebar-ring', color)
    root.style.setProperty('--ring', color)
    root.style.setProperty('--chart-1', color)
}

