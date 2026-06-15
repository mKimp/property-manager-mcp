import { useState } from 'react'

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? ''

interface Props {
  onLogin: () => void
}

export default function LoginScreen({ onLogin }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!APP_PASSWORD || password === APP_PASSWORD) {
      onLogin()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-xs">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center text-3xl shadow-lg">
            🏠
          </div>
          <h1 className="text-[#cdd6f4] text-2xl font-semibold tracking-tight">
            Property Manager
          </h1>
          <p className="text-[#6c7086] text-sm">Enter your password to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            className="w-full px-4 py-3 rounded-xl bg-[#313244] text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
            autoFocus
            autoComplete="current-password"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">Incorrect password. Try again.</p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 active:bg-purple-700 transition-colors text-base"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
