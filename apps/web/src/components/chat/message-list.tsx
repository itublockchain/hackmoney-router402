"use client";

import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/stores/chat.store";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);

  const messagesLength = messages.length;
  const lastMessageContent = messages[messages.length - 1]?.content;

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count or content change during streaming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isInitialRender.current) {
      el.scrollTop = el.scrollHeight;
      isInitialRender.current = false;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messagesLength, lastMessageContent]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3 sm:p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {messages.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            Send a message to start the conversation.
          </p>
        ) : (
          messages.map((msg, i) => {
            // Hide the empty assistant placeholder while streaming — the typing indicator shows instead
            if (
              isStreaming &&
              i === messages.length - 1 &&
              msg.role === "assistant" &&
              msg.content === ""
            ) {
              return null;
            }
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming}
                isLastMessage={i === messages.length - 1}
              />
            );
          })
        )}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-accent">
              <Bot size={14} className="text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 pt-1.5">
              <span className="text-sm text-muted-foreground">Thinking</span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
