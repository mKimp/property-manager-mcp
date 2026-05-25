import { useEffect, useRef } from 'react'
import { MessageBubble, type Message } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface ChatThreadProps {
  messages: Message[]
  isStreaming: boolean
}

export function ChatThread({ messages, isStreaming }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom whenever messages change or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-2xl mb-4">
          🏠
        </div>
        <h2 className="text-[#cdd6f4] font-semibold text-lg mb-1">Property Manager</h2>
        <p className="text-[#6c7086] text-sm max-w-xs">
          Ask me anything about your rental properties — rent, repairs, utilities, or tenants.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-1">
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      {isStreaming && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
