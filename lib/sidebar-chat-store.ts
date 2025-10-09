import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarChatState {
    isOpen: boolean
    setOpen: (open: boolean) => void
    toggle: () => void
}

export const useSidebarChatStore = create<SidebarChatState>()(
    persist(
        (set) => ({
            isOpen: false,
            setOpen: (isOpen) => set({ isOpen }),
            toggle: () => set((state) => ({ isOpen: !state.isOpen })),
        }),
        {
            name: 'cvtool-sidebar-chat-storage',
        }
    )
)
