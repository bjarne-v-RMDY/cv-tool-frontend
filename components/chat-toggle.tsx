"use client"

import * as React from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatToggleProps {
    isOpen: boolean
    onToggle: () => void
}

export function ChatToggle({ isOpen, onToggle }: ChatToggleProps) {
    return (
        <Button
            variant={isOpen ? "default" : "outline"}
            size="icon"
            onClick={onToggle}
            className={`h-9 w-9 transition-all duration-200 ${isOpen
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted"
                }`}
        >
            <MessageCircle className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "scale-110" : "scale-100"
                }`} />
            <span className="sr-only">{isOpen ? "Close chat" : "Open chat"}</span>
        </Button>
    )
}
