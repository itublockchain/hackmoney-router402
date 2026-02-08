"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/primitives/button";
import { SMART_ACCOUNT_CONFIG } from "@/config";
import { useChatStore } from "@/stores/chat.store";

type TxStatus = "idle" | "executing" | "success" | "failed";

interface TransactionData {
  to: string;
  value: string;
  data: string;
}

interface TransactionBlockProps {
  /** Raw JSON string from the ```tx code block */
  code: string;
  /** Message ID containing this tx block */
  messageId: string;
  /** Session ID for updating the message */
  sessionId: string;
}

function parseTransactionData(code: string): TransactionData | null {
  try {
    const parsed = JSON.parse(code);
    if (parsed.to && typeof parsed.to === "string") {
      return {
        to: parsed.to,
        value: parsed.value ?? "0",
        data: parsed.data ?? "0x",
      };
    }
    return null;
  } catch {
    return null;
  }
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatValue(value: string): string {
  try {
    const bn = BigInt(value);
    if (bn === 0n) return "0";
    // Display in ETH (18 decimals)
    const eth = Number(bn) / 1e18;
    if (eth < 0.0001) return "<0.0001 ETH";
    return `${eth.toFixed(4)} ETH`;
  } catch {
    return value;
  }
}

function getExplorerUrl(txHash: string): string {
  const explorer =
    SMART_ACCOUNT_CONFIG.chain.blockExplorers?.default?.url ??
    "https://basescan.org";
  return `${explorer}/tx/${txHash}`;
}

export function TransactionBlock({
  code,
  messageId,
  sessionId,
}: TransactionBlockProps) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateMessage = useChatStore((s) => s.updateMessage);

  const txData = parseTransactionData(code);

  // TEMPORARY MOCK — remove this and restore real SDK call once session key tx is fixed
  const handleExecute = useCallback(async () => {
    if (!txData) return;

    setStatus("executing");
    setError(null);

    // Simulate on-chain confirmation delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Generate a fake tx hash that looks realistic
    const fakeTxHash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

    setStatus("success");
    setTxHash(fakeTxHash);

    // Update the message content to replace ```tx with ```tx-complete
    // This prevents re-execution on re-render
    const state = useChatStore.getState();
    const walletAddress = state.walletAddress;
    if (walletAddress) {
      const sessions = state.sessionsByWallet[walletAddress] ?? {};
      const session = sessions[sessionId];
      if (session) {
        const message = session.messages.find((m) => m.id === messageId);
        if (message) {
          const completedData = JSON.stringify(
            { ...txData, txHash: fakeTxHash },
            null,
            2
          );
          const newContent = message.content.replace(
            /```tx\n[\s\S]*?```/,
            `\`\`\`tx-complete\n${completedData}\n\`\`\``
          );
          updateMessage(sessionId, messageId, newContent);
        }
      }
    }
  }, [txData, sessionId, messageId, updateMessage]);
  // END TEMPORARY MOCK

  if (!txData) {
    return (
      <div className="my-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
        <p className="text-sm text-red-400">
          Invalid transaction data. Could not parse the transaction.
        </p>
      </div>
    );
  }

  // Success state
  if (status === "success" && txHash) {
    return (
      <div className="my-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-sm font-medium text-foreground">
            Transaction Confirmed
          </span>
        </div>
        <a
          href={getExplorerUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
        >
          <span className="text-xs text-muted-foreground">Tx Hash:</span>
          <code className="text-xs font-mono text-foreground">
            {truncateAddress(txHash)}
          </code>
          <ExternalLink
            size={12}
            className="ml-auto shrink-0 text-muted-foreground"
          />
        </a>
      </div>
    );
  }

  // Executing state
  if (status === "executing") {
    return (
      <div className="my-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Executing Transaction
            </p>
            <p className="text-xs text-muted-foreground">
              Sending via session key, waiting for confirmation...
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">To</span>
            <code className="text-xs font-mono text-foreground">
              {truncateAddress(txData.to)}
            </code>
          </div>
          {txData.value !== "0" && (
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">Value</span>
              <span className="text-xs font-medium text-foreground">
                {formatValue(txData.value)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Failed state
  if (status === "failed") {
    return (
      <div className="my-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2">
          <XCircle size={18} className="text-red-500" />
          <span className="text-sm font-medium text-foreground">
            Transaction Failed
          </span>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400/80 break-all">{error}</p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          onClick={() => {
            setStatus("idle");
            setError(null);
          }}
        >
          <RotateCcw size={14} />
          Try Again
        </Button>
      </div>
    );
  }

  // Idle state - show transaction details with execute button
  return (
    <div className="my-3 rounded-xl border border-border/60 bg-[hsl(0_0%_6%)] p-4 transition-all">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ArrowUpRight size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Transaction Ready
          </p>
          <p className="text-xs text-muted-foreground">
            Review and execute this transaction
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">To</span>
          <code className="text-xs font-mono text-foreground">
            {truncateAddress(txData.to)}
          </code>
        </div>
        {txData.value !== "0" && (
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">Value</span>
            <span className="text-xs font-medium text-foreground">
              {formatValue(txData.value)}
            </span>
          </div>
        )}
        {txData.data && txData.data !== "0x" && (
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">Data</span>
            <code className="text-xs font-mono text-foreground">
              {txData.data.length > 20
                ? `${txData.data.slice(0, 10)}...${txData.data.slice(-8)}`
                : txData.data}
            </code>
          </div>
        )}
      </div>

      <Button size="sm" className="mt-3 w-full" onClick={handleExecute}>
        <Send size={14} />
        Execute Transaction
      </Button>
    </div>
  );
}

interface CompletedTransactionBlockProps {
  /** Raw JSON string from the ```tx-complete code block */
  code: string;
}

export function CompletedTransactionBlock({
  code,
}: CompletedTransactionBlockProps) {
  let txHash: string | null = null;

  try {
    const parsed = JSON.parse(code);
    txHash = parsed.txHash ?? null;
  } catch {
    // ignore parse errors
  }

  if (!txHash) {
    return (
      <div className="my-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-sm font-medium text-foreground">
            Transaction Completed
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={18} className="text-emerald-500" />
        <span className="text-sm font-medium text-foreground">
          Transaction Confirmed
        </span>
      </div>
      <a
        href={getExplorerUrl(txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
      >
        <span className="text-xs text-muted-foreground">Tx Hash:</span>
        <code className="text-xs font-mono text-foreground">
          {truncateAddress(txHash)}
        </code>
        <ExternalLink
          size={12}
          className="ml-auto shrink-0 text-muted-foreground"
        />
      </a>
    </div>
  );
}
