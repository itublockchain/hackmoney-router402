"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
 * - If Router402 setup is not complete, redirects to /setup.
 * - If ready, renders children.
 *
 * IMPORTANT: This guard NEVER calls initialize(). It only reads status and
 * redirects to the setup page where initialization is managed.
 */
export function Router402Guard({ children }: Router402GuardProps) {
  const { isConnected, isReconnecting, isReady, status, eoaAddress } =
    useRouter402();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);
  const prevEoaAddress = useRef(eoaAddress);

  // Reset redirect guard when wallet changes so the new wallet can be redirected to setup
  if (prevEoaAddress.current !== eoaAddress) {
    prevEoaAddress.current = eoaAddress;
    hasRedirected.current = false;
  }

  const {
    address: storedSmartAccountAddress,
    eoaAddress: storedEoaAddress,
    isDeployed: storedIsDeployed,
  } = useSmartAccountStore();

  /**
   * Check if the persisted store + localStorage indicate a previously
   * completed setup for the current EOA. If so, the "not_configured" status
   * is just a transient state while walletClient hydrates — don't redirect.
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
      status === "enabling_session_key" ||
      status === "sending_to_backend" ||
      status === "error";

    if (needsSetup && !hasRedirected.current) {
      // If the persisted store has a completed setup for this EOA,
      // "not_configured" is just transient while walletClient loads.
      // Wait for the hook to resolve via its fast path instead of redirecting.
      if (status === "not_configured" && hasPreviousSetup()) {
        return;
      }

      hasRedirected.current = true;
      // Preserve query params (e.g. ?prompt=...) so the user returns after setup
      const prompt = searchParams.get("prompt");
      const setupUrl = prompt
        ? `/setup?returnPrompt=${encodeURIComponent(prompt)}`
        : "/setup";
      router.replace(setupUrl);
    }
  }, [isConnected, isReady, status, router, searchParams, hasPreviousSetup]);

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
