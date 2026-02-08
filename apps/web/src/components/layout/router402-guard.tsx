"use client";

import { Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/primitives/button";
import type { Router402Status } from "@/hooks";
import { useRouter402 } from "@/hooks";
import { ConnectWalletCard } from "./connect-wallet-card";

interface Router402GuardProps {
  children: React.ReactNode;
}

/** Statuses that indicate setup is actively running */
const IN_PROGRESS_STATUSES: Set<Router402Status> = new Set([
  "initializing",
  "deploying",
  "creating_session_key",
  "approving_session_key",
  "enabling_session_key",
  "sending_to_backend",
]);

/**
 * Guard component for protected routes (e.g. /chat).
 *
 * - If wallet is not connected, shows a connect wallet prompt.
 * - If Router402 setup is not complete, shows an inline setup CTA.
 * - If ready, renders children.
 *
 * IMPORTANT: This guard NEVER calls initialize(). It only reads status and
 * renders the appropriate UI based on the current state.
 */
export function Router402Guard({ children }: Router402GuardProps) {
  const { isConnected, isReconnecting, isReady, status } = useRouter402();

  // Small delay before showing the connect-wallet card so wagmi has time to
  // start its auto-reconnect cycle and set `isReconnecting = true`.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setHasMounted(true), 300);
    return () => clearTimeout(id);
  }, []);

  // Wallet not connected — show connect prompt with decorative card.
  // During auto-reconnection (or before mount delay elapses), show loading
  // spinner instead to avoid flash of the connect wallet card.
  if (!isConnected) {
    if (isReconnecting || !hasMounted) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Reconnecting...</p>
        </div>
      );
    }
    return <ConnectWalletCard />;
  }

  // Ready — render children
  if (isReady) {
    return <>{children}</>;
  }

  // Setup is actively running — show loading spinner, not "Setup Required".
  if (IN_PROGRESS_STATUSES.has(status)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Setting up your account...
        </p>
      </div>
    );
  }

  // Connected but hook status is still "disconnected" (pre-hydration default)
  // or "not_configured" (waiting for walletClient / initialize() to run).
  // Show a loading spinner while the hook settles — initialize() will
  // either fast-path to "ready" or start the full setup flow.
  if (status === "disconnected" || status === "not_configured") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Setup is genuinely needed (status === "error") — show inline CTA
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <Settings size={24} className="text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Setup Required
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          You need to complete your Router 402 setup before you can start
          chatting. This includes deploying your smart account and creating
          session keys.
        </p>
        <Button asChild className="mt-2">
          <Link href="/setup">Go to Setup</Link>
        </Button>
      </div>
    </div>
  );
}
