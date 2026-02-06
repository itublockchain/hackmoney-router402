"use client";

import { AlertTriangle, Coins, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { erc20Abi, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { Button } from "@/components/primitives/button";
import { SMART_ACCOUNT_CONFIG, USDC_ADDRESS } from "@/config";
import { useSmartAccountStore } from "@/stores/smart-account.store";

export function InsufficientBalanceBlock() {
  const smartAccountAddress = useSmartAccountStore((s) => s.address);

  const { data: rawBalance, isLoading } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: smartAccountAddress ? [smartAccountAddress] : undefined,
    chainId: SMART_ACCOUNT_CONFIG.chainId,
    query: {
      enabled: !!smartAccountAddress,
    },
  });

  const usdcBalance =
    rawBalance !== undefined ? formatUnits(rawBalance, 6) : undefined;
  const balanceNumber =
    usdcBalance !== undefined ? Number.parseFloat(usdcBalance) : undefined;

  return (
    <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="shrink-0 text-amber-500" />
        <span className="text-sm font-medium text-foreground">
          Insufficient Balance
        </span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Your smart account doesn&apos;t have enough USDC to complete this
        request. Deposit funds to continue.
      </p>

      <div className="mt-3 flex items-center gap-3 rounded-md border border-border/60 bg-muted/50 px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
          <Coins size={14} className="text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Balance:</span>
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {balanceNumber !== undefined
                  ? balanceNumber.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })
                  : "—"}
              </span>
              <span className="text-xs text-muted-foreground">USDC</span>
            </>
          )}
        </div>
      </div>

      <Button asChild size="sm" className="mt-3 w-full">
        <Link href="/setup">
          <Wallet size={14} />
          Deposit USDC
        </Link>
      </Button>
    </div>
  );
}
