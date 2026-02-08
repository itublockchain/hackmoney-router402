"use client";

import { ConnectKitProvider } from "connectkit";
import { useEffect, useMemo } from "react";
import { useConnection, WagmiProvider } from "wagmi";
import { getWagmiConfig } from "@/config";
import { useChatStore } from "@/stores/chat.store";
import { QueryProvider } from "./query-provider";

/**
 * Syncs the connected wallet address to the chat store
 * so that chat sessions are isolated per wallet.
 */
function WalletSync() {
  const { address, isConnected } = useConnection();
  const setWalletAddress = useChatStore((s) => s.setWalletAddress);

  useEffect(() => {
    setWalletAddress(isConnected && address ? address : null);
  }, [address, isConnected, setWalletAddress]);

  return null;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => getWagmiConfig(), []);

  return (
    <WagmiProvider config={config}>
      <QueryProvider>
        <ConnectKitProvider
          options={{
            disableSiweRedirect: true,
          }}
          mode="dark"
        >
          <WalletSync />
          {children}
        </ConnectKitProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
