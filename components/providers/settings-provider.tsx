"use client"

import { useEffect, useState } from "react"
import { useSettingsStore } from "@/lib/settings-store"

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    const brandColor = useSettingsStore((state) => state.brandColor)
    const setBrandColor = useSettingsStore((state) => state.setBrandColor)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        // Apply the brand color after hydration
        if (mounted && brandColor) {
            // Force reapply to ensure it's set correctly
            setBrandColor(brandColor)
        }
    }, [mounted, brandColor, setBrandColor])

    return <>{children}</>
}

