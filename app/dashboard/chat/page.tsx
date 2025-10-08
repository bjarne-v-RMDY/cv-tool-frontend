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
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center justify-between px-4">
                    <h1 className="text-lg font-semibold">AI Candidate Search</h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearChat}
                        className="gap-2"
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
