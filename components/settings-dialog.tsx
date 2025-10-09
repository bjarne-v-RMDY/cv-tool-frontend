"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSettingsStore } from "@/lib/settings-store"
import { RotateCcw } from "lucide-react"

interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { brandColor, setBrandColor, resetBrandColor } = useSettingsStore()
    const [tempColor, setTempColor] = useState(brandColor)

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempColor(e.target.value)
    }

    const handleApply = () => {
        setBrandColor(tempColor)
        onOpenChange(false)
    }

    const handleReset = () => {
        resetBrandColor()
        setTempColor('#FF4D00')
    }

    const handleCancel = () => {
        setTempColor(brandColor)
        onOpenChange(false)
    }

    // Preset colors
    const presetColors = [
        { name: 'RMDY Orange', color: '#FF4D00' },
        { name: 'Blue', color: '#0066FF' },
        { name: 'Green', color: '#00B87C' },
        { name: 'Purple', color: '#8B5CF6' },
        { name: 'Red', color: '#EF4444' },
        { name: 'Pink', color: '#EC4899' },
        { name: 'Amber', color: '#F59E0B' },
        { name: 'Teal', color: '#14B8A6' },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl">Settings</DialogTitle>
                    <DialogDescription className="text-sm">
                        Customize your CV-Tool experience
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
                    {/* Brand Color Section */}
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <Label className="text-sm sm:text-base font-semibold">Brand Color</Label>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                                    Choose your primary accent color
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="gap-1 sm:gap-2 flex-shrink-0"
                            >
                                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Reset</span>
                            </Button>
                        </div>

                        {/* Color Picker */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            <input
                                type="color"
                                value={tempColor}
                                onChange={handleColorChange}
                                className="h-10 w-16 sm:h-12 sm:w-20 rounded-lg border-2 border-border cursor-pointer flex-shrink-0"
                                style={{ backgroundColor: tempColor }}
                            />
                            <input
                                type="text"
                                value={tempColor.toUpperCase()}
                                onChange={(e) => {
                                    const value = e.target.value
                                    if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                                        setTempColor(value)
                                    }
                                }}
                                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border border-input bg-background text-xs sm:text-sm font-mono min-w-0"
                                placeholder="#FF4D00"
                            />
                        </div>

                        {/* Preset Colors */}
                        <div>
                            <Label className="text-xs sm:text-sm text-muted-foreground mb-2 block">
                                Quick presets
                            </Label>
                            <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                                {presetColors.map((preset) => (
                                    <button
                                        key={preset.color}
                                        onClick={() => setTempColor(preset.color)}
                                        className="group relative aspect-square rounded-md sm:rounded-lg border-2 transition-all active:scale-95 sm:hover:scale-110"
                                        style={{
                                            backgroundColor: preset.color,
                                            borderColor: tempColor === preset.color ? preset.color : 'transparent',
                                            boxShadow: tempColor === preset.color ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${preset.color}` : 'none'
                                        }}
                                        title={preset.name}
                                    >
                                        <span className="sr-only">{preset.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3">
                            <Label className="text-xs sm:text-sm text-muted-foreground">Preview</Label>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" style={{ 
                                    backgroundColor: tempColor,
                                    color: 'white'
                                }}>
                                    Primary
                                </Button>
                                <Button size="sm" variant="outline" style={{ 
                                    borderColor: tempColor,
                                    color: tempColor
                                }}>
                                    Outline
                                </Button>
                            </div>
                            <p className="text-xs sm:text-sm">
                                This is a <span style={{ color: tempColor, fontWeight: 600 }}>brand accent</span> text example
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply}>
                        Apply Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

