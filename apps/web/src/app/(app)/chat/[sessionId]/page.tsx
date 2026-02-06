"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { MessageInput } from "@/components/chat/message-input";
import { MessageList } from "@/components/chat/message-list";
import {
  useAddMessage,
  useCreateSession,
  useDeleteSession,
  useSession,
  useSetActiveSession,
  useWalletAddress,
} from "@/stores/chat.store";

export default function ChatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const session = useSession(params.sessionId);
  const addMessage = useAddMessage();
  const setActiveSession = useSetActiveSession();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const walletAddress = useWalletAddress();
  const isDeletingRef = useRef(false);

  // Reset deletion flag on mount / when sessionId changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on sessionId change
  useEffect(() => {
    isDeletingRef.current = false;
  }, [params.sessionId]);

  // Set active session on mount; create if it doesn't exist yet
  useEffect(() => {
    if (!session && !isDeletingRef.current) {
      createSession(params.sessionId);
    }
    if (!isDeletingRef.current) {
      setActiveSession(params.sessionId);
    }
  }, [params.sessionId, session, setActiveSession, createSession]);

  const handleSend = useCallback(
    (content: string) => {
      addMessage(params.sessionId, "user", content);

      // TODO: Replace with real AI API integration
      setTimeout(() => {
        addMessage(
          params.sessionId,
          "assistant",
          "This is a placeholder response. The AI integration will be connected here."
        );
      }, 500);
    },
    [params.sessionId, addMessage]
  );

  const handleDelete = useCallback(() => {
    if (walletAddress) {
      isDeletingRef.current = true;
      deleteSession(params.sessionId, walletAddress);
      router.push("/chat");
    }
  }, [deleteSession, params.sessionId, walletAddress, router]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatHeader
        sessionName={session?.name ?? "Chat"}
        onDelete={handleDelete}
      />
      <MessageList messages={session?.messages ?? []} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
