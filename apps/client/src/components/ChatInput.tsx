import { useRef, type FormEvent, type KeyboardEvent } from 'react'

interface ChatInputProps {
  onSubmit: (text: string) => void
  isStreaming: boolean
}

export function ChatInput({ onSubmit, isStreaming }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const text = textareaRef.current?.value.trim()
    if (!text || isStreaming) return
    onSubmit(text)
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleInput() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  return (
    // safe-bottom ensures the bar sits above the iPhone home indicator
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-4 pt-3 border-t border-[#313244] bg-[#1e1e2e] safe-bottom"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder={isStreaming ? 'Waiting for reply…' : 'Message Property Manager…'}
        disabled={isStreaming}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        aria-label="Message input"
        className="flex-1 resize-none bg-[#313244] text-[#cdd6f4] placeholder-[#6c7086] rounded-xl px-4 py-3 text-base leading-relaxed outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed max-h-40 overflow-y-auto"
        style={{ height: 'auto', minHeight: '46px' }}
      />
      <button
        type="submit"
        disabled={isStreaming}
        aria-label="Send message"
        className="flex-shrink-0 w-11 h-11 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-white"
        >
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </form>
  )
}
