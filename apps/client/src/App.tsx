import { useState } from 'react'
import { ChatThread } from './components/ChatThread'
import { ChatInput } from './components/ChatInput'
import { useChat } from './hooks/useChat'
import LoginScreen from './components/LoginScreen'

// Inner component — useChat hook always called (no early return above it)
function ChatApp() {
  const { messages, isStreaming, error, sendMessage, retry } = useChat()

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e]">
      {/* Header — safe-top pads under the iPhone notch / status bar */}
      <header className="flex items-center gap-3 px-4 pb-3 border-b border-[#313244] bg-[#181825] safe-top">
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-base flex-shrink-0">
          🏠
        </div>
        <div>
          <h1 className="text-[#cdd6f4] font-semibold text-sm leading-tight m-0">Property Manager</h1>
          <p className="text-[#6c7086] text-xs m-0">Your rental portfolio assistant</p>
        </div>
      </header>

      {/* Chat thread */}
      <ChatThread messages={messages} isStreaming={isStreaming} />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2.5 bg-red-900/40 border border-red-700/60 rounded-xl text-red-300 text-sm flex items-center justify-between gap-3">
          <span>⚠️ {error}</span>
          <button
            onClick={retry}
            className="text-red-200 underline underline-offset-2 hover:text-white text-xs whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Input — safe-bottom lifts above the home indicator */}
      <ChatInput onSubmit={sendMessage} isStreaming={isStreaming} />
    </div>
  )
}

function App() {
  const [isAuthed, setIsAuthed] = useState(() => {
    // No password configured (local dev) or already authed this session
    const noPassword = !import.meta.env.VITE_APP_PASSWORD
    const sessionAuthed = sessionStorage.getItem('pm_authed') === '1'
    return noPassword || sessionAuthed
  })

  const handleLogin = () => {
    sessionStorage.setItem('pm_authed', '1')
    setIsAuthed(true)
  }

  if (!isAuthed) return <LoginScreen onLogin={handleLogin} />
  return <ChatApp />
}

export default App
