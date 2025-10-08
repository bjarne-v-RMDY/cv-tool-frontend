import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { z } from 'zod'

const MessageSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string()
})

const MessagesSchema = z.array(MessageSchema)

export type Message = z.infer<typeof MessageSchema>

const getDefaultMessages = (): Message[] => [
    {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant for candidate search. I can help you find developers by skills, experience, location, or answer questions about specific candidates. Try asking me: "Find React developers with 5+ years experience" or "Who has experience with Azure?"',
    }
]

interface ChatState {
    messages: Message[]
    isLoading: boolean
    error: string | null
    setMessages: (messages: Message[]) => void
    addMessage: (message: Message) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    clearChat: () => void
}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            messages: getDefaultMessages(),
            isLoading: false,
            error: null,
            setMessages: (messages) => set({ messages }),
            addMessage: (message) => set((state) => ({ 
                messages: [...state.messages, message] 
            })),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            clearChat: () => set({ messages: getDefaultMessages() }),
        }),
        {
            name: 'cvtool-chat-storage',
            // Validate stored data with Zod
            partialize: (state) => ({ messages: state.messages }),
            onRehydrateStorage: () => (state) => {
                if (state?.messages) {
                    try {
                        const validated = MessagesSchema.parse(state.messages)
                        state.messages = validated
                    } catch (error) {
                        console.warn('Invalid chat data in storage, resetting:', error)
                        state.messages = getDefaultMessages()
                    }
                }
            },
        }
    )
)
