"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { MessageInput } from "@/components/chat/message-input";
import { MessageList } from "@/components/chat/message-list";
import { useChatCompletion } from "@/hooks/use-chat-completion";
import { useSmartAccountStore } from "@/stores";
import {
  DEFAULT_MODEL,
  useAddMessage,
  useCreateSession,
  useDeleteSession,
  useSession,
  useSetActiveSession,
  useSetSessionModel,
  useUpdateMessage,
  useWalletAddress,
} from "@/stores/chat.store";

export default function ChatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession(params.sessionId);
  const addMessage = useAddMessage();
  const updateMessage = useUpdateMessage();
  const setActiveSession = useSetActiveSession();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const setSessionModel = useSetSessionModel();
  const walletAddress = useWalletAddress();
  const smartAccountAddress = useSmartAccountStore((s) => s.address);
  const isDeletingRef = useRef(false);
  const hasSentInitialPrompt = useRef(false);

  const messages = session?.messages ?? [];
  const model = session?.model ?? DEFAULT_MODEL;

  const { sendMessage, stop, isStreaming } = useChatCompletion({
    sessionId: params.sessionId,
    model,
    smartAccountAddress,
    addMessage,
    updateMessage,
    messages,
  });

  const handleModelChange = useCallback(
    (newModel: string) => {
      setSessionModel(params.sessionId, newModel);
    },
    [setSessionModel, params.sessionId]
  );

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

  // Auto-send the prompt from query param (e.g. from landing page)
  const promptParam = searchParams.get("prompt");
  useEffect(() => {
    if (promptParam && session && !hasSentInitialPrompt.current) {
      hasSentInitialPrompt.current = true;
      sendMessage(promptParam);
      // Clear the query param from URL to prevent re-sends
      router.replace(`/chat/${params.sessionId}`);
    }
  }, [promptParam, session, sendMessage, router, params.sessionId]);

  const handleDelete = useCallback(() => {
    if (walletAddress) {
      stop();
      isDeletingRef.current = true;
      deleteSession(params.sessionId, walletAddress);
      router.push("/chat");
    }
  }, [deleteSession, params.sessionId, walletAddress, router, stop]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatHeader
        sessionName={session?.name ?? "Chat"}
        onDelete={handleDelete}
      />
      <MessageList messages={messages} isStreaming={isStreaming} />
      <MessageInput
        onSend={sendMessage}
        onStop={stop}
        isStreaming={isStreaming}
        model={model}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
