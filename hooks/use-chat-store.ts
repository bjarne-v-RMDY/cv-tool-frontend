"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ChatState {
    isOpen: boolean
    toggle: () => void
    open: () => void
    close: () => void
}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            isOpen: true,
            toggle: () => set((state) => ({ isOpen: !state.isOpen })),
            open: () => set({ isOpen: true }),
            close: () => set({ isOpen: false }),
        }),
        {
            name: "chat-panel-state",
        }
    )
)
