import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../components/ChatInput'

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput onSubmit={vi.fn()} isStreaming={false} />)
    expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('calls onSubmit with textarea value when form is submitted', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSubmit={onSubmit} isStreaming={false} />)

    const textarea = screen.getByRole('textbox', { name: /message input/i })
    await user.type(textarea, 'List all properties')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(onSubmit).toHaveBeenCalledWith('List all properties')
  })

  it('submits on Enter key', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSubmit={onSubmit} isStreaming={false} />)

    const textarea = screen.getByRole('textbox', { name: /message input/i })
    await user.type(textarea, 'Hello{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('Hello')
  })

  it('does not submit on Shift+Enter (newline)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSubmit={onSubmit} isStreaming={false} />)

    const textarea = screen.getByRole('textbox', { name: /message input/i })
    await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2')

    expect(onSubmit).not.toHaveBeenCalled()
    expect((textarea as HTMLTextAreaElement).value).toContain('Line 1')
    expect((textarea as HTMLTextAreaElement).value).toContain('Line 2')
  })

  it('does not submit empty input', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSubmit={onSubmit} isStreaming={false} />)

    await user.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('is disabled while streaming', () => {
    render(<ChatInput onSubmit={vi.fn()} isStreaming={true} />)

    const textarea = screen.getByRole('textbox', { name: /message input/i })
    const button = screen.getByRole('button', { name: /send message/i })

    expect(textarea).toBeDisabled()
    expect(button).toBeDisabled()
  })

  it('does not submit while streaming', async () => {
    const onSubmit = vi.fn()
    render(<ChatInput onSubmit={onSubmit} isStreaming={true} />)

    const button = screen.getByRole('button', { name: /send message/i })
    fireEvent.click(button)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears textarea after submission', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSubmit={onSubmit} isStreaming={false} />)

    const textarea = screen.getByRole('textbox', { name: /message input/i }) as HTMLTextAreaElement
    await user.type(textarea, 'Hello')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(textarea.value).toBe('')
  })
})
