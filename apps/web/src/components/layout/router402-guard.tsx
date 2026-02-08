"use client";

import { Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/primitives/button";
import { useRouter402 } from "@/hooks";
import { getActiveSessionKey, getAuthToken } from "@/lib/session-keys";
import { useSmartAccountStore } from "@/stores";
import { ConnectWalletCard } from "./connect-wallet-card";

interface Router402GuardProps {
  children: React.ReactNode;
}

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
  const { isConnected, isReconnecting, isReady, status, eoaAddress } =
    useRouter402();

  const {
    address: storedSmartAccountAddress,
    eoaAddress: storedEoaAddress,
    isDeployed: storedIsDeployed,
  } = useSmartAccountStore();

  /**
   * Check if the persisted store + localStorage indicate a previously
   * completed setup for the current EOA. If so, the "not_configured" status
   * is just a transient state while walletClient hydrates — don't show setup CTA.
   */
  const hasPreviousSetup = useCallback((): boolean => {
    if (!eoaAddress || !storedSmartAccountAddress) return false;
    if (storedEoaAddress !== eoaAddress || !storedIsDeployed) return false;

    const sessionKey = getActiveSessionKey(storedSmartAccountAddress);
    const authToken = getAuthToken(storedSmartAccountAddress);
    return !!sessionKey && !!authToken;
  }, [
    eoaAddress,
    storedSmartAccountAddress,
    storedEoaAddress,
    storedIsDeployed,
  ]);

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

  // Connected but hook status is still "disconnected" (pre-hydration default)
  // or "not_configured" with a previous setup (fast path will resolve shortly).
  // Show a loading spinner while the hook settles.
  const isHydrating =
    status === "disconnected" ||
    (status === "not_configured" && hasPreviousSetup());

  if (isHydrating) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Setup is needed or in progress — show inline CTA instead of redirecting
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
