"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/primitives/button";

// TODO: Wire up chat input with state management and message submission logic
export default function ChatSessionPage() {
  const params = useParams<{ sessionId: string }>();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          <p className="text-center text-sm text-muted-foreground">
            Session: {params.sessionId}
          </p>
        </div>
      </div>

      {/* Chat input area */}
      <div className="border-t border-border/40 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-3">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button size="sm">Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
