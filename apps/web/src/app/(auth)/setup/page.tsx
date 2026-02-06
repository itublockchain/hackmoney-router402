"use client";

import { CheckCircle, Key, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ConnectWalletCard } from "@/components/layout";
import { Button } from "@/components/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CopyButton,
} from "@/components/ui";
import type { Router402Status } from "@/hooks";
import { useRouter402 } from "@/hooks";

const steps = [
  { id: "connect", label: "Connect Wallet" },
  { id: "smart-account", label: "Smart Account Setup" },
  { id: "session-key", label: "Session Key Authorization" },
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
  sending_to_backend: 3,
  ready: 4,
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

  // Ref to ensure initialize is called at most once automatically
  const hasAutoInitialized = useRef(false);

  // Auto-initialize once when the wallet is connected and setup is needed.
  // Uses a ref to guarantee this fires at most once — no sign request duplicates.
  useEffect(() => {
    if (!isConnected) {
      // Reset when wallet disconnects so re-connect can auto-init again
      hasAutoInitialized.current = false;
      return;
    }

    // Don't auto-init if already ready or already ran
    if (isReady || hasAutoInitialized.current) return;

    // Don't auto-init if already in an active flow state
    if (
      status === "initializing" ||
      status === "deploying" ||
      status === "creating_session_key" ||
      status === "approving_session_key" ||
      status === "sending_to_backend"
    ) {
      return;
    }

    hasAutoInitialized.current = true;
    initialize();
  }, [isConnected, isReady, status, initialize]);

  const currentStep = !isConnected ? 0 : statusToStep[status];

  // Show connect wallet card when not connected.
  // Suppress during reconnection (auto-reconnect on page load) and
  // during active connection attempts to avoid a brief flash of the card.
  if (!isConnected) {
    if (isConnecting || isReconnecting) {
      return null;
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

        {authToken && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                  <Key size={16} className="text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">API Key</CardTitle>
                  <CardDescription className="text-xs">
                    Use this key to authenticate with Router402
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                <code className="flex-1 truncate font-mono text-xs text-foreground">
                  {authToken}
                </code>
                <CopyButton
                  value={authToken}
                  label="Copy API key"
                  className="h-7 w-7 shrink-0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Include this token as a Bearer token in the{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  Authorization
                </code>{" "}
                header when making requests to Router402 APIs.
              </p>
            </CardContent>
          </Card>
        )}

        {smartAccountAddress && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Smart Account:</span>
            <code className="font-mono">{smartAccountAddress}</code>
            <CopyButton
              value={smartAccountAddress}
              label="Copy address"
              className="h-6 w-6"
            />
          </div>
        )}

        <div className="flex justify-center">
          <Button asChild>
            <Link href="/chat">
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

        {smartAccountAddress && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Smart Account: {smartAccountAddress}
          </p>
        )}
      </div>
    </div>
  );
}
