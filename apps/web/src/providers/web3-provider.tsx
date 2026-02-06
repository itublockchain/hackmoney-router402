"use client";

import { ConnectKitProvider } from "connectkit";
import { useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "@/config";
import { QueryProvider } from "./query-provider";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => getWagmiConfig(), []);

  return (
    <WagmiProvider config={config}>
      <QueryProvider>
        <ConnectKitProvider mode="dark">{children}</ConnectKitProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
