import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatThread } from '../components/ChatThread'
import type { Message } from '../components/MessageBubble'

describe('ChatThread', () => {
  it('shows empty state when no messages', () => {
    render(<ChatThread messages={[]} isStreaming={false} />)
    expect(screen.getByText('Property Manager')).toBeInTheDocument()
    expect(screen.getByText(/Ask me anything/)).toBeInTheDocument()
  })

  it('renders user and assistant messages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'What is the rent for Kent House?' },
      { role: 'assistant', content: 'Kent House rent is $2,500/month.' },
    ]
    render(<ChatThread messages={messages} isStreaming={false} />)
    expect(screen.getByText('What is the rent for Kent House?')).toBeInTheDocument()
    expect(screen.getByText('Kent House rent is $2,500/month.')).toBeInTheDocument()
  })

  it('shows typing indicator while streaming', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Show all properties' },
    ]
    render(<ChatThread messages={messages} isStreaming={true} />)
    // Typing indicator avatar "P" should appear
    const avatars = screen.getAllByText('P')
    expect(avatars.length).toBeGreaterThan(0)
  })

  it('does not show typing indicator when not streaming', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ]
    render(<ChatThread messages={messages} isStreaming={false} />)
    // Only one avatar for the assistant message bubble
    const avatars = screen.getAllByText('P')
    expect(avatars.length).toBe(1)
  })
})
