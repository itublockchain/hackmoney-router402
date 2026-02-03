"use client";

import { MessageSquare, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";

export default function ChatPage() {
  const router = useRouter();

  const handleNewChat = () => {
    const sessionId = crypto.randomUUID();
    router.push(`/chat/${sessionId}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
          <MessageSquare size={28} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Start a new conversation
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Send payments, interact with smart contracts, and manage your assets
          through natural language.
        </p>
        <Button onClick={handleNewChat} className="mt-2">
          <Plus size={16} />
          New Chat
        </Button>
      </div>
    </div>
  );
}
