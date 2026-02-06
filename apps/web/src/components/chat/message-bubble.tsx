"use client";

import { Bot, Code2, ExternalLink, Loader2 } from "lucide-react";
import React, { useCallback, useMemo, useRef } from "react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { cn } from "@/lib";
import type { ChatMessage } from "@/stores/chat.store";
import { type Artifact, useUIStore } from "@/stores/ui.store";
import { InsufficientBalanceBlock } from "./insufficient-balance-block";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLastMessage?: boolean;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isStreaming,
  isLastMessage,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const selectedArtifact = useUIStore((s) => s.selectedArtifact);
  const setSelectedArtifact = useUIStore((s) => s.setSelectedArtifact);
  const blockIndexRef = useRef(0);

  // Reset counter before each render so indices stay stable
  blockIndexRef.current = 0;

  const isActivelyStreaming = isStreaming && isLastMessage;

  const handleCodeBlockClick = useCallback(
    (artifact: Artifact) => {
      // Toggle off if clicking the same artifact
      if (
        selectedArtifact?.messageId === artifact.messageId &&
        selectedArtifact?.blockIndex === artifact.blockIndex
      ) {
        setSelectedArtifact(null);
      } else {
        setSelectedArtifact(artifact);
      }
    },
    [selectedArtifact, setSelectedArtifact]
  );

  // Memoize the components object so MarkdownRenderer + react-markdown
  // don't see a new reference on every render
  const markdownComponents = useMemo(() => {
    const codeOverride = ({
      className,
      children,
      node,
      ...props
    }: // biome-ignore lint/suspicious/noExplicitAny: react-markdown component props
    any) => {
      const match = /language-(\w+)/.exec(className || "");
      const isBlock = node?.position
        ? node.position.start.line !== node.position.end.line
        : !!match;

      if (!isBlock) {
        return (
          <code
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
            {...props}
          >
            {children}
          </code>
        );
      }

      const code = String(children).replace(/\n$/, "");
      const language = match?.[1];
      const currentIndex = blockIndexRef.current++;
      const isSelected =
        selectedArtifact?.messageId === message.id &&
        selectedArtifact?.blockIndex === currentIndex;

      // Show loading state while message is still streaming
      if (isActivelyStreaming) {
        return (
          <div className="my-3 flex w-full items-center gap-3 rounded-xl border border-border/60 bg-[hsl(0_0%_6%)] px-4 py-3 text-left animate-pulse">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Loader2 size={16} className="text-primary animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {language ?? "Code"}
              </p>
              <p className="text-xs text-muted-foreground">Generating...</p>
            </div>
          </div>
        );
      }

      return (
        <button
          type="button"
          className={cn(
            "group/artifact my-3 flex w-full items-center gap-3 rounded-xl border border-border/60 bg-[hsl(0_0%_6%)] px-4 py-3 text-left transition-all cursor-pointer",
            isSelected
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : "hover:border-border hover:bg-[hsl(0_0%_8%)]"
          )}
          onClick={() =>
            handleCodeBlockClick({
              code,
              language,
              blockIndex: currentIndex,
              messageId: message.id,
            })
          }
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Code2 size={16} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {language ?? "Code"}
            </p>
            <p className="text-xs text-muted-foreground">
              Click to view artifact
            </p>
          </div>
          <ExternalLink
            size={14}
            className="shrink-0 text-muted-foreground/60"
          />
        </button>
      );
    };

    return { code: codeOverride };
  }, [
    selectedArtifact?.messageId,
    selectedArtifact?.blockIndex,
    message.id,
    handleCodeBlockClick,
    isActivelyStreaming,
  ]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-foreground px-4 py-2.5 text-sm text-background">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-accent">
        <Bot size={14} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {message.errorCode === 402 ? (
          <InsufficientBalanceBlock />
        ) : (
          <MarkdownRenderer
            content={message.content}
            className="text-sm [&>*:last-child]:mb-0"
            components={markdownComponents}
          />
        )}
      </div>
    </div>
  );
});
