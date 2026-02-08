"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CircleDollarSign,
  Coins,
  ExternalLink,
  Key,
  Loader2,
  MessageSquare,
  Shield,
  Wallet,
  Zap,
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
import { SMART_ACCOUNT_CONFIG, SUPPORTED_CHAIN, USDC_ADDRESS } from "@/config";
import type { Router402Status } from "@/hooks";
import { useRouter402 } from "@/hooks";

const steps = [
  {
    id: "connect",
    label: "Connect Wallet",
    description: "Link your wallet",
    icon: Wallet,
  },
  {
    id: "smart-account",
    label: "Smart Account",
    description: "Deploy your account",
    icon: Shield,
  },
  {
    id: "session-key",
    label: "Session Key",
    description: "Authorize sessions",
    icon: Key,
  },
  {
    id: "enable-session-key",
    label: "Enable On-Chain",
    description: "Activate key on-chain",
    icon: Zap,
  },
  {
    id: "backend",
    label: "Authorization",
    description: "Verify with backend",
    icon: CheckCircle,
  },
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
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

  const currentStep = !isConnected ? 0 : statusToStep[status];

  // Show connect wallet card when not connected.
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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Success Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-green-500/10 blur-xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
              <CheckCircle size={28} className="text-green-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Setup Complete
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your wallet and smart account are ready to go.
            </p>
          </div>
        </motion.div>

        {/* Balance & Deposit — Full width prominent section */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Coins size={16} className="text-emerald-500" />
                  </div>
                  <CardTitle className="text-sm">Credits</CardTitle>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-2.5 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-medium text-blue-400">
                    {SUPPORTED_CHAIN.name}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Balance Display */}
              <div className="flex items-baseline gap-2">
                {isBalanceLoading ? (
                  <Loader2
                    size={18}
                    className="animate-spin text-muted-foreground"
                  />
                ) : (
                  <>
                    <span className="text-3xl font-bold tabular-nums text-foreground">
                      {balanceNumber !== undefined
                        ? balanceNumber.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })
                        : "—"}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      USDC
                    </span>
                  </>
                )}
              </div>

              {/* Low Balance Warning */}
              {isLowBalance && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-500"
                  />
                  <p className="text-xs leading-relaxed text-amber-200/80">
                    Low balance — requests may fail. Deposit USDC to your smart
                    account to continue using Router 402.
                  </p>
                </div>
              )}

              {/* Deposit Address */}
              {smartAccountAddress && (
                <div className="space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Wallet size={12} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Deposit Address
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-2">
                    <code className="flex-1 truncate font-mono text-xs text-foreground">
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

              {/* Funding Information */}
              <div className="space-y-2.5 rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <CircleDollarSign
                    size={12}
                    className="text-muted-foreground"
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    How to Fund Your Account
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Send{" "}
                  <span className="font-medium text-foreground/80">
                    USDC on {SUPPORTED_CHAIN.name}
                  </span>{" "}
                  to your deposit address above. You can get USDC on Base by:
                </p>
                <div className="space-y-1.5">
                  <FundingOption
                    icon={<ArrowRight size={10} />}
                    text="Bridging from Ethereum or other chains to Base"
                  />
                  <FundingOption
                    icon={<ArrowRight size={10} />}
                    text="Purchasing USDC directly on a centralized exchange and withdrawing to Base"
                  />
                  <FundingOption
                    icon={<ArrowRight size={10} />}
                    text="Transferring from another Base wallet"
                  />
                </div>
                <a
                  href="https://bridge.base.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  Bridge to Base
                  <ExternalLink size={10} />
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* API Key */}
        {authToken && (
          <motion.div variants={itemVariants}>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <Key size={16} className="text-blue-500" />
                  </div>
                  <CardTitle className="text-sm">API Key</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-foreground">
                    {authToken}
                  </code>
                  <CopyButton
                    value={authToken}
                    label="Copy API key"
                    className="h-6 w-6 shrink-0"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Use in the{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                    Authorization
                  </code>{" "}
                  header for Router 402 API requests.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center pt-1"
        >
          <Button asChild size="lg">
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
        </motion.div>
      </motion.div>
    );
  }

  // In-progress setup flow
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="text-xl font-semibold text-foreground">Get Started</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your wallet to start using Router 402
        </p>
      </motion.div>

      {/* Horizontal Progress Bar */}
      <motion.div variants={itemVariants}>
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-green-500"
            initial={{ width: "0%" }}
            animate={{
              width: `${(currentStep / steps.length) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {Math.round((currentStep / steps.length) * 100)}%
          </span>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const StepIcon = step.icon;

          return (
            <motion.div
              key={step.id}
              variants={itemVariants}
              className={`group flex items-center gap-3 rounded-lg border p-3 transition-all ${
                isComplete
                  ? "border-green-500/20 bg-green-500/5"
                  : isCurrent
                    ? "border-border bg-accent/50"
                    : "border-border/30 opacity-40"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isComplete
                    ? "bg-green-500/10"
                    : isCurrent
                      ? "bg-accent"
                      : "bg-muted/50"
                }`}
              >
                {isComplete ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : isCurrent && currentStep > 0 ? (
                  <Loader2 size={16} className="animate-spin text-foreground" />
                ) : (
                  <StepIcon size={16} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${
                    isComplete || isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {step.description}
                </span>
              </div>
              {isComplete && (
                <span className="text-[10px] font-medium text-green-500">
                  Done
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Action area */}
      <motion.div variants={itemVariants} className="pt-1">
        {status === "error" && (
          <Button onClick={() => initialize()} className="w-full">
            Retry Setup
          </Button>
        )}

        {error && (
          <p className="mt-3 text-center text-sm text-destructive">
            {error.message}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

function FundingOption({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="text-[11px] leading-relaxed text-muted-foreground">
        {text}
      </span>
    </div>
  );
}
