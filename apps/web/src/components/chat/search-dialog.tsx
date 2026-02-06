"use client";

import { MessageSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/primitives/dialog";
import type { ChatSession } from "@/stores/chat.store";
import { useGetSortedSessions, useSetActiveSession } from "@/stores/chat.store";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const getSortedSessions = useGetSortedSessions();
  const setActiveSession = useSetActiveSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatSession[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(getSortedSessions());
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, getSortedSessions]);

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(0);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const sessions = getSortedSessions();
        if (!value.trim()) {
          setResults(sessions);
          return;
        }
        const lower = value.toLowerCase();
        setResults(
          sessions.filter((s) => s.name.toLowerCase().includes(lower))
        );
      }, 300);
    },
    [getSortedSessions]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const navigateToSession = useCallback(
    (session: ChatSession) => {
      setActiveSession(session.id);
      router.push(`/chat/${session.id}`);
      onOpenChange(false);
    },
    [setActiveSession, router, onOpenChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        navigateToSession(results[selectedIndex]);
      }
    },
    [results, selectedIndex, navigateToSession]
  );

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogTitle className="sr-only">Search chats</DialogTitle>

        {/* Search input */}
        <div className="flex items-center border-b border-border/40 px-4">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search conversations..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent px-3 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 mr-8 rounded border border-border/60 bg-accent/50 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto overscroll-contain">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageSquare size={24} className="text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {query ? "No matching conversations" : "No conversations yet"}
              </p>
            </div>
          ) : (
            <div className="p-1.5">
              {results.map((session, index) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigateToSession(session)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    index === selectedIndex
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{session.name}</span>
                    <span className="text-xs text-muted-foreground/70">
                      {session.messages.length} message
                      {session.messages.length !== 1 ? "s" : ""} &middot;{" "}
                      {formatRelativeTime(session.updatedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-2">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/60 bg-accent/50 px-1 py-px">
                &uarr;
              </kbd>
              <kbd className="rounded border border-border/60 bg-accent/50 px-1 py-px">
                &darr;
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/60 bg-accent/50 px-1 py-px">
                &crarr;
              </kbd>
              open
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
