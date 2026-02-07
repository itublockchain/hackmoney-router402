"use client";

import { MessageSquare, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/primitives/button";
import { useCreateSession } from "@/stores/chat.store";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createSession = useCreateSession();
  const hasHandledPrompt = useRef(false);

  const prompt = searchParams.get("prompt");

  // If there's a prompt query param, create a session and redirect with the prompt
  useEffect(() => {
    if (prompt && !hasHandledPrompt.current) {
      hasHandledPrompt.current = true;
      const sessionId = createSession();
      router.replace(`/chat/${sessionId}?prompt=${encodeURIComponent(prompt)}`);
    }
  }, [prompt, createSession, router]);

  const handleNewChat = useCallback(() => {
    const sessionId = createSession();
    router.push(`/chat/${sessionId}`);
  }, [createSession, router]);

  // If we have a prompt, show nothing while redirecting
  if (prompt) {
    return null;
  }

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
