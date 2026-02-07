"use client";

import {
  AlertTriangle,
  CheckCircle,
  Coins,
  Key,
  Loader2,
  MessageSquare,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { ConnectWalletCard } from "@/components/layout";
import { Button } from "@/components/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CopyButton,
} from "@/components/ui";
import { SMART_ACCOUNT_CONFIG, USDC_ADDRESS } from "@/config";
import type { Router402Status } from "@/hooks";
import { useRouter402 } from "@/hooks";

const steps = [
  { id: "connect", label: "Connect Wallet" },
  { id: "smart-account", label: "Smart Account Setup" },
  { id: "session-key", label: "Session Key Authorization" },
  { id: "enable-session-key", label: "Enable Session Key On-Chain" },
  { id: "backend", label: "Authorization" },
] as const;

const statusToStep: Record<Router402Status, number> = {
  disconnected: 0,
  not_configured: 1,
  initializing: 1,
  deploying: 1,
  error: 1,
  creating_session_key: 2,
  approving_session_key: 2,
  enabling_session_key: 3,
  sending_to_backend: 4,
  ready: 5,
};

export default function SetupPage() {
  const {
    status,
    smartAccountAddress,
    authToken,
    isConnected,
    isReady,
    isConnecting,
    isReconnecting,
    initialize,
    error,
  } = useRouter402();

  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPrompt = searchParams.get("returnPrompt");

  // Auto-redirect to chat when setup completes and there's a pending prompt
  const hasAutoRedirected = useRef(false);
  useEffect(() => {
    if (isReady && returnPrompt && !hasAutoRedirected.current) {
      hasAutoRedirected.current = true;
      router.replace(`/chat?prompt=${encodeURIComponent(returnPrompt)}`);
    }
  }, [isReady, returnPrompt, router]);

  // Small delay before showing the connect-wallet card so wagmi has time to
  // start its auto-reconnect cycle and set `isReconnecting = true`.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setHasMounted(true), 300);
    return () => clearTimeout(id);
  }, []);

  // Ref to ensure initialize is called at most once automatically
  const hasAutoInitialized = useRef(false);

  // Fetch USDC balance of the smart account (not the EOA)
  const { data: rawBalance, isLoading: isBalanceLoading } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: smartAccountAddress ? [smartAccountAddress] : undefined,
    chainId: SMART_ACCOUNT_CONFIG.chainId,
    query: {
      enabled: isReady && !!smartAccountAddress,
      refetchInterval: 10000,
    },
  });

  const usdcBalance =
    rawBalance !== undefined ? formatUnits(rawBalance, 6) : undefined;
  const balanceNumber =
    usdcBalance !== undefined ? parseFloat(usdcBalance) : undefined;
  const isLowBalance = balanceNumber !== undefined && balanceNumber < 0.5;

  // Auto-initialize once when the wallet is connected and setup is needed.
  // Uses a ref to guarantee this fires at most once — no sign request duplicates.
  // A settling delay prevents firing while wagmi / Zustand state is still
  // stabilising, which avoids flickering and duplicate sign-request prompts.
  useEffect(() => {
    if (!isConnected) {
      // Reset when wallet disconnects so re-connect can auto-init again
      hasAutoInitialized.current = false;
      return;
    }

    // Don't auto-init if already ready or already ran
    if (isReady || hasAutoInitialized.current) return;

    // Don't auto-init if the hook hasn't settled yet (walletClient may not be
    // available) or if already in an active flow state.
    if (
      status === "disconnected" ||
      status === "initializing" ||
      status === "deploying" ||
      status === "creating_session_key" ||
      status === "approving_session_key" ||
      status === "enabling_session_key" ||
      status === "sending_to_backend"
    ) {
      return;
    }

    // Wait for state to settle before triggering initialization.
    // If any dependency changes during the delay the timer is cancelled,
    // preventing duplicate or overlapping sign requests.
    const timer = setTimeout(() => {
      hasAutoInitialized.current = true;
      initialize();
    }, 500);

    return () => clearTimeout(timer);
  }, [isConnected, isReady, status, initialize]);

  const currentStep = !isConnected ? 0 : statusToStep[status];

  // Show connect wallet card when not connected.
  // Suppress during reconnection (auto-reconnect on page load) and
  // during active connection attempts to avoid a brief flash of the card.
  // Also suppress until mount delay has elapsed — wagmi may not have set
  // isReconnecting yet on the very first render.
  if (!isConnected) {
    if (isConnecting || isReconnecting || !hasMounted) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <ConnectWalletCard
        title="Get Started"
        subtitle="Connect your wallet to set up Router 402 and start using AI with micropayments"
        variant="compact"
      />
    );
  }

  if (isReady) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Setup Complete
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your wallet and smart account are configured. You&apos;re ready to
            interact with Router402.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Credits / USDC Balance */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
                  <Coins size={14} className="text-emerald-500" />
                </div>
                <CardTitle className="text-sm">Credits</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                {isBalanceLoading ? (
                  <Loader2
                    size={18}
                    className="animate-spin text-muted-foreground"
                  />
                ) : (
                  <>
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {balanceNumber !== undefined
                        ? balanceNumber.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })
                        : "—"}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      USDC
                    </span>
                  </>
                )}
              </div>

              {isLowBalance && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-500"
                  />
                  <p className="text-[11px] leading-tight text-amber-200/80">
                    Low balance — requests may fail. Deposit USDC to continue.
                  </p>
                </div>
              )}

              {smartAccountAddress && (
                <div className="space-y-1.5 rounded-md border bg-muted/50 p-2">
                  <div className="flex items-center gap-1.5">
                    <Wallet size={12} className="text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Deposit Address
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 truncate font-mono text-[11px] text-foreground">
                      {smartAccountAddress}
                    </code>
                    <CopyButton
                      value={smartAccountAddress}
                      label="Copy deposit address"
                      className="h-6 w-6 shrink-0"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Key */}
          {authToken && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
                    <Key size={14} className="text-blue-500" />
                  </div>
                  <CardTitle className="text-sm">API Key</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 p-2">
                  <code className="flex-1 truncate font-mono text-[11px] text-foreground">
                    {authToken}
                  </code>
                  <CopyButton
                    value={authToken}
                    label="Copy API key"
                    className="h-6 w-6 shrink-0"
                  />
                </div>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  Use in the{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                    Authorization
                  </code>{" "}
                  header for Router402 API requests.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-center">
          <Button asChild>
            <Link
              href={
                returnPrompt
                  ? `/chat?prompt=${encodeURIComponent(returnPrompt)}`
                  : "/chat"
              }
            >
              <MessageSquare size={16} />
              Start Chatting
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">Get Started</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your wallet to start using Router 402
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                isComplete
                  ? "border-green-500/30 bg-green-500/5"
                  : isCurrent
                    ? "border-border bg-accent/50"
                    : "border-border/40 opacity-50"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50">
                {isComplete ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : isCurrent && currentStep > 0 ? (
                  <Loader2 size={16} className="animate-spin text-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                )}
              </div>
              <span
                className={`text-sm ${isComplete || isCurrent ? "text-foreground" : "text-muted-foreground"}`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action area */}
      <div className="pt-2">
        {status === "error" && (
          <Button
            onClick={() => {
              hasAutoInitialized.current = true;
              initialize();
            }}
            className="w-full"
          >
            Retry Setup
          </Button>
        )}

        {error && (
          <p className="mt-3 text-center text-sm text-destructive">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}
