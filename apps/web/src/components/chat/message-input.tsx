"use client";

import { ArrowUp, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModelSelector } from "./model-selector";

interface MessageInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  model: string;
  onModelChange: (model: string) => void;
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  model,
  onModelChange,
}: MessageInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    },
    []
  );

  const handleSendAndReset = useCallback(() => {
    if (isStreaming) return;
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, onSend, isStreaming]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendAndReset();
      }
    },
    [handleSendAndReset]
  );

  const hasInput = input.trim().length > 0;

  return (
    <div className="px-3 py-3 sm:py-4">
      <div className="mx-auto max-w-4xl">
        <div className="group relative rounded-2xl border border-border/60 bg-card shadow-lg transition-all duration-200 focus-within:border-ring/40 focus-within:shadow-[0_0_0_1px_hsl(var(--ring)/0.2),0_4px_20px_-4px_hsl(var(--ring)/0.1)]">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <textarea
              ref={inputRef}
              placeholder="Message..."
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
              className="max-h-40 min-h-[32px] w-full resize-none bg-transparent text-md leading-6 text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center justify-between pr-3 pl-1 pb-2 sm:pr-4 sm:pl-2 sm:pb-2">
            <ModelSelector
              model={model}
              onModelChange={onModelChange}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-all duration-200 hover:scale-105 hover:opacity-90 active:scale-95"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
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
            )}
          </div>
        </div>
        <p className="mt-2 hidden text-center text-[11px] text-muted-foreground/50 sm:block">
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
  );
}
