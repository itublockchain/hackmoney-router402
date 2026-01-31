"use client";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import * as React from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/wagmi";
import { QueryProvider } from "./query-provider";
import "@rainbow-me/rainbowkit/styles.css";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryProvider>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
