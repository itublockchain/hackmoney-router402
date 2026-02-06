"use client";

import { Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface ChatHeaderProps {
  sessionName: string;
  onDelete: () => void;
}

export function ChatHeader({ sessionName, onDelete }: ChatHeaderProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-3 sm:px-4">
      <h1 className="text-sm font-medium text-foreground truncate">
        {sessionName}
      </h1>
      <ConfirmationDialog
        title="Delete chat"
        description="This will permanently delete this chat and all its messages. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={onDelete}
        trigger={
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive cursor-pointer"
            aria-label="Delete chat"
          >
            <Trash2 size={16} />
          </button>
        }
      />
    </div>
  );
}
