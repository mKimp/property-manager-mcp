import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageBubble } from '../components/MessageBubble'

describe('MessageBubble', () => {
  it('renders user message right-aligned', () => {
    render(<MessageBubble message={{ role: 'user', content: 'Hello there' }} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders assistant message with avatar', () => {
    render(<MessageBubble message={{ role: 'assistant', content: 'Hi! I can help.' }} />)
    // The avatar "P" should be present
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText('Hi! I can help.')).toBeInTheDocument()
  })

  it('renders markdown in assistant messages', () => {
    render(
      <MessageBubble
        message={{ role: 'assistant', content: '## Summary\n\n- Kent House\n- Portland' }}
      />
    )
    // react-markdown renders <h2> for ##
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toBe('Summary')
  })

  it('renders empty placeholder when content is empty', () => {
    render(<MessageBubble message={{ role: 'assistant', content: '' }} />)
    // Should show "…" placeholder
    const placeholder = document.querySelector('.italic')
    expect(placeholder).toBeInTheDocument()
  })

  it('user bubble does not render markdown', () => {
    render(<MessageBubble message={{ role: 'user', content: '## Not a heading' }} />)
    // User messages are plain text, no h2
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
