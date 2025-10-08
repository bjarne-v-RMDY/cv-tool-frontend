import { create } from 'zustand'

interface SidebarChatState {
    isOpen: boolean
    setOpen: (open: boolean) => void
    toggle: () => void
}

export const useSidebarChatStore = create<SidebarChatState>((set) => ({
    isOpen: false,
    setOpen: (isOpen) => set({ isOpen }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
