"use client";

import { ArrowUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAddMessage,
  useCreateSession,
  useSession,
  useSetActiveSession,
} from "@/stores/chat.store";

export default function ChatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const session = useSession(params.sessionId);
  const addMessage = useAddMessage();
  const setActiveSession = useSetActiveSession();
  const createSession = useCreateSession();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Set active session on mount; create if it doesn't exist yet
  useEffect(() => {
    if (!session) {
      createSession(params.sessionId);
    }
    setActiveSession(params.sessionId);
  }, [params.sessionId, session, setActiveSession, createSession]);

  // Auto-scroll to bottom when messages change
  const messagesLength = session?.messages.length ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesLength]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addMessage(params.sessionId, "user", trimmed);
    setInput("");

    // Simulate assistant response (placeholder for real API integration)
    setTimeout(() => {
      addMessage(
        params.sessionId,
        "assistant",
        "This is a placeholder response. The AI integration will be connected here."
      );
    }, 500);
  }, [input, params.sessionId, addMessage]);

  // Auto-grow textarea
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    },
    []
  );

  // Reset textarea height after sending
  const handleSendAndReset = useCallback(() => {
    handleSend();
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [handleSend]);

  const handleKeyDownWrapped = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendAndReset();
      }
    },
    [handleSendAndReset]
  );

  const messages = session?.messages ?? [];
  const hasInput = input.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <p className="pt-8 text-center text-sm text-muted-foreground">
              Send a message to start the conversation.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-accent text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modern chat input */}
      <div className="px-3 pb-4 pt-4">
        <div className="mx-auto max-w-3xl">
          <div className="group relative rounded-2xl border border-border/60 bg-card shadow-lg transition-all duration-200 focus-within:border-ring/40 focus-within:shadow-[0_0_0_1px_hsl(var(--ring)/0.2),0_4px_20px_-4px_hsl(var(--ring)/0.1)]">
            <div className="flex items-center gap-2 p-3 sm:p-4">
              <textarea
                ref={inputRef}
                placeholder="Message..."
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDownWrapped}
                rows={1}
                className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-md leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={handleSendAndReset}
                disabled={!hasInput}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                  hasInput
                    ? "bg-foreground text-background hover:scale-105 hover:opacity-90 active:scale-95"
                    : "cursor-not-allowed bg-muted text-muted-foreground/40"
                }`}
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
            <kbd className="rounded border border-border/40 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>{" "}
            to send <span className="mx-1 text-border/60">·</span>
            <kbd className="rounded border border-border/40 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
              Shift + Enter
            </kbd>{" "}
            for new line
          </p>
        </div>
      </div>
    </div>
  );
}
