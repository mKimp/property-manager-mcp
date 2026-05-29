import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

interface MessageBubbleProps {
  message: Message
}

// Wrap every table in a scrollable div so wide tables don't overflow the bubble
const markdownComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="table-wrap">
      <table {...props}>{children}</table>
    </div>
  ),
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[82%] bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-base leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 px-3 py-1">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white select-none mt-1">
        P
      </div>
      {/* Bubble — wider than user bubbles to give tables room */}
      <div className="min-w-0 flex-1 max-w-[92%] bg-[#313244] rounded-2xl rounded-tl-sm px-4 py-3 text-base leading-relaxed prose-chat text-[#cdd6f4]">
        {message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        ) : (
          <span className="opacity-40 italic">…</span>
        )}
      </div>
    </div>
  )
}
