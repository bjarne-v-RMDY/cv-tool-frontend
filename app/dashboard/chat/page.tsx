"use client"

import { ChatPanel } from "@/components/chat-panel"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useChatStore } from "@/lib/chat-store"

export default function ChatPage() {
    const { clearChat } = useChatStore()

    const handleClearChat = () => {
        clearChat()
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header with RMDY styling */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-3 sm:py-4 gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            AI <span className="rmdy-accent">Candidate Search</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                            Find the perfect candidates with intelligent search
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearChat}
                        className="gap-1 sm:gap-2 hover:border-primary hover:text-primary flex-shrink-0"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Clear History</span>
                        <span className="sm:hidden">Clear</span>
                    </Button>
                </div>
            </div>

            {/* Centered chat with padding */}
            <div className="flex-1 min-h-0 flex justify-center">
                <div className="w-full max-w-4xl px-2 sm:px-4 md:px-8 lg:px-16">
                    <ChatPanel
                        isOpen={true}
                        onClose={() => { }}
                        isFullWidth={true}
                        showCloseButton={false}
                        showHeader={false}
                    />
                </div>
            </div>
        </div>
    )
}
