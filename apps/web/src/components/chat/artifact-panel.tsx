"use client";

import { Code2, X } from "lucide-react";
import { useMemo } from "react";
import { useHighlightedCode } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { extractCodeBlocks } from "@/lib";
import { useUIStore } from "@/stores";
import { useChatStore } from "@/stores/chat.store";

export function ArtifactPanel() {
  const selectedArtifact = useUIStore((s) => s.selectedArtifact);
  const clearSelectedArtifact = useUIStore((s) => s.clearSelectedArtifact);

  // Read the live message content from the chat store so we reflect streaming updates
  const liveMessage = useChatStore((s) => {
    if (!selectedArtifact) return null;
    const walletAddress = s.walletAddress;
    if (!walletAddress) return null;
    const sessions = s.sessionsByWallet[walletAddress] ?? {};
    // Use activeSessionId for direct lookup instead of scanning all sessions
    const activeSession = s.activeSessionId
      ? sessions[s.activeSessionId]
      : null;
    if (activeSession) {
      const msg = activeSession.messages.find(
        (m) => m.id === selectedArtifact.messageId
      );
      if (msg) return msg;
    }
    return null;
  });

  // Extract the specific code block from the live message content
  const liveCode = useMemo(() => {
    if (!liveMessage || !selectedArtifact) return null;
    const blocks = extractCodeBlocks(liveMessage.content);
    return blocks.find((b) => b.index === selectedArtifact.blockIndex) ?? null;
  }, [liveMessage, selectedArtifact]);

  // Use live code if available, fall back to stored snapshot
  const code = liveCode?.code ?? selectedArtifact?.code ?? "";
  const language =
    liveCode?.language ?? selectedArtifact?.language ?? undefined;

  const highlightedHtml = useHighlightedCode(code, language);

  if (!selectedArtifact) return null;

  return (
    <div className="flex h-full flex-col bg-[hsl(0_0%_4%)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">{language ?? "Code"}</span>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton value={code} label="Copy code" className="h-7 w-7" />
          <button
            type="button"
            onClick={clearSelectedArtifact}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer"
            aria-label="Close artifact panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Code content — single scrollable area */}
      <div className="min-h-0 flex-1 overflow-auto">
        {highlightedHtml ? (
          <div
            className="p-4 font-mono text-[13px] leading-relaxed [&_pre]:m-0! [&_pre]:bg-transparent! [&_code]:bg-transparent!"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki generates trusted HTML from code input
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre className="p-4">
            <code className="font-mono text-[13px] leading-relaxed">
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
