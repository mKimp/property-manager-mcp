export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white select-none">
        P
      </div>
      {/* Dots */}
      <div className="flex items-center gap-1 bg-[#313244] rounded-2xl rounded-tl-sm px-4 py-3">
        <span className="w-2 h-2 rounded-full bg-[#cdd6f4] opacity-60 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-[#cdd6f4] opacity-60 animate-bounce [animation-delay:160ms]" />
        <span className="w-2 h-2 rounded-full bg-[#cdd6f4] opacity-60 animate-bounce [animation-delay:320ms]" />
      </div>
    </div>
  )
}
