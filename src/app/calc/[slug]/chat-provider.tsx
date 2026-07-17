'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// The offer page's header (top) and "Связаться с нами" card (bottom) are two separate
// client components that both need to open the SAME chat panel — since their common
// ancestor is the Server Component page itself (which can't hold state), this context is
// the shared bridge between them instead of duplicating a second chat widget/state.
const ChatContext = createContext<{ chatOpen: boolean; setChatOpen: (open: boolean) => void } | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  return <ChatContext.Provider value={{ chatOpen, setChatOpen }}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}
