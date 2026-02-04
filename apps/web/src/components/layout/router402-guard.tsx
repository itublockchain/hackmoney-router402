"use client";

import { Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useRouter402 } from "@/hooks";
import { ConnectWalletButton } from "./connect-wallet-button";

interface Router402GuardProps {
  children: React.ReactNode;
}

/**
 * Guard component for protected routes (e.g. /chat).
 *
 * - If wallet is not connected, shows a connect wallet prompt.
 * - If Router402 setup is not complete, redirects to /setup.
 * - If ready, renders children.
 *
 * IMPORTANT: This guard NEVER calls initialize(). It only reads status and
 * redirects to the setup page where initialization is managed.
 */
export function Router402Guard({ children }: Router402GuardProps) {
  const { isConnected, isReady, status } = useRouter402();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      hasRedirected.current = false;
      return;
    }

    if (isReady) {
      hasRedirected.current = false;
      return;
    }

    // Redirect on any state that indicates setup is needed or in progress.
    // "disconnected" is excluded because it's the pre-hydration default when
    // isConnected is true but the hook hasn't settled yet. Once Zustand
    // hydrates, the hook transitions to either "ready" or "not_configured".
    const needsSetup =
      status === "not_configured" ||
      status === "initializing" ||
      status === "deploying" ||
      status === "creating_session_key" ||
      status === "approving_session_key" ||
      status === "sending_to_backend" ||
      status === "error";

    if (needsSetup && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/setup");
    }
  }, [isConnected, isReady, status, router]);

  // Wallet not connected — show connect prompt inline
  if (!isConnected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Wallet size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Connect your wallet to continue
        </p>
        <ConnectWalletButton />
      </div>
    );
  }

  // Ready — render children
  if (isReady) {
    return <>{children}</>;
  }

  // Brief loading state while Zustand hydrates from localStorage.
  // Once hydrated, the hook will either set "ready" or "not_configured",
  // and this spinner will be replaced by children or a redirect.
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
