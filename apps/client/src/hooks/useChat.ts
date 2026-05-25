import { useState, useCallback, useEffect } from 'react'
import type { Message } from '../components/MessageBubble'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const INACTIVITY_MS = 2 * 60 * 60 * 1000 // 2 hours

function loadSession(): Message[] {
  try {
    const lastAt = localStorage.getItem('lastActivityAt')
    if (lastAt && Date.now() - Number(lastAt) > INACTIVITY_MS) {
      localStorage.removeItem('lastActivityAt')
      localStorage.removeItem('chatMessages')
      return []
    }
    const stored = localStorage.getItem('chatMessages')
    return stored ? (JSON.parse(stored) as Message[]) : []
  } catch {
    return []
  }
}

function persistSession(messages: Message[]) {
  try {
    localStorage.setItem('chatMessages', JSON.stringify(messages))
    localStorage.setItem('lastActivityAt', String(Date.now()))
  } catch {
    // storage quota exceeded — just skip
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(loadSession)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Persist whenever messages change
  useEffect(() => {
    if (messages.length > 0) persistSession(messages)
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    setError(null)

    const userMsg: Message = { role: 'user', content: text }
    const nextMessages: Message[] = [...messages, userMsg]
    setMessages(nextMessages)
    setIsStreaming(true)

    // Placeholder assistant message that will be filled by stream
    const assistantPlaceholder: Message = { role: 'assistant', content: '' }
    setMessages([...nextMessages, assistantPlaceholder])

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            setIsStreaming(false)
            return
          }
          try {
            const chunk = JSON.parse(payload) as { t: string }
            assistantContent += chunk.t
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
              return updated
            })
          } catch {
            // malformed chunk — ignore
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      // Replace the empty placeholder with an error indicator
      setMessages((prev) => {
        const updated = [...prev]
        // Remove empty assistant placeholder if still empty
        if (updated[updated.length - 1]?.content === '') {
          updated.pop()
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [messages])

  const retry = useCallback(() => {
    // Re-send the last user message
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) {
      // Remove messages after and including the last user message attempt
      const idx = messages.lastIndexOf(lastUser)
      setMessages(messages.slice(0, idx))
      sendMessage(lastUser.content)
    }
  }, [messages, sendMessage])

  return { messages, isStreaming, error, sendMessage, retry }
}
