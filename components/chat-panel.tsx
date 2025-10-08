"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, X, Trash2 } from "lucide-react"
import { useChatStore, type Message } from "@/lib/chat-store"

interface ChatPanelProps {
    isOpen: boolean
    onClose: () => void
    isFullWidth?: boolean
    showCloseButton?: boolean
    showHeader?: boolean
}

export function ChatPanel({
    isOpen,
    onClose,
    isFullWidth = false,
    showCloseButton = true,
    showHeader = true
}: ChatPanelProps) {
    const [inputValue, setInputValue] = React.useState("")

    const {
        messages,
        isLoading,
        error,
        setMessages,
        addMessage,
        setLoading,
        setError,
        clearChat
    } = useChatStore()

    const handleClearChat = () => {
        clearChat()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim()
        }

        // Add user message immediately
        addMessage(userMessage)
        setInputValue("")
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            if (!response.body) {
                throw new Error('No response body')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            // Create assistant message
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: ''
            }

            addMessage(assistantMessage)

            let accumulatedContent = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                accumulatedContent += chunk

                // Update the assistant message with accumulated content
                setMessages(useChatStore.getState().messages.map(msg =>
                    msg.id === assistantMessage.id
                        ? { ...msg, content: accumulatedContent }
                        : msg
                ))
            }

        } catch (err) {
            console.error('Chat error:', err)
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useEffect(() => {
        scrollToBottom()
    }, [messages])

    if (!isOpen) return null

    return (
        <div className={`h-full bg-background flex flex-col ${isFullWidth
            ? 'w-full'
            : 'w-96 border-l shadow-lg'
            }`}>
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">AI Candidate Search</h2>
                        <p className="text-xs text-muted-foreground">Ask about candidates & skills</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClearChat}
                            className="h-8 w-8"
                            title="Clear chat history"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Clear chat history</span>
                        </Button>
                        {showCloseButton && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close chat</span>
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                    const isUser = message.role === 'user'

                    return (
                        <div
                            key={message.id}
                            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-lg p-3 ${isUser
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    {!isUser && (
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-semibold">AI</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {message.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-semibold">AI</span>
                                </div>
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="flex justify-center">
                        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                            Error: {error}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="e.g., Find React developers..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={!inputValue.trim() || isLoading} size="icon">
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send message</span>
                    </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2">
                    💡 Try: &quot;Who knows Azure?&quot; or &quot;5+ years React&quot;
                </p>
            </div>
        </div>
    )
}