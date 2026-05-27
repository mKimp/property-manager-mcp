import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[80%] bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 px-4 py-1">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white select-none mt-0.5">
        P
      </div>
      <div className="max-w-[80%] bg-[#313244] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed prose-chat text-[#cdd6f4]">
        {message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        ) : (
          <span className="opacity-40 italic">…</span>
        )}
      </div>
    </div>
  )
}
