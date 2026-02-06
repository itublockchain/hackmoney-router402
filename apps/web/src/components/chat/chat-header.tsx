"use client";

import { Trash2 } from "lucide-react";

interface ChatHeaderProps {
  sessionName: string;
  onDelete: () => void;
}

export function ChatHeader({ sessionName, onDelete }: ChatHeaderProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
      <h1 className="text-sm font-medium text-foreground truncate">
        {sessionName}
      </h1>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive cursor-pointer"
        aria-label="Delete chat"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
