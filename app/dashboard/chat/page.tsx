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
                <div className="flex items-center justify-between px-4 md:px-8 py-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            AI <span className="rmdy-accent">Candidate Search</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Find the perfect candidates with intelligent search
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearChat}
                        className="gap-2 hover:border-primary hover:text-primary"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear History
                    </Button>
                </div>
            </div>

            {/* Centered chat with padding */}
            <div className="flex-1 min-h-0 flex justify-center">
                <div className="w-full max-w-4xl px-4 md:px-8 lg:px-16">
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
