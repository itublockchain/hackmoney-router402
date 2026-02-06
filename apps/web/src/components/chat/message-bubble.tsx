import type { ChatMessage } from "@/stores/chat.store";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          message.role === "user"
            ? "bg-foreground text-background"
            : "bg-accent text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
