"use client";

import { Circle } from "lucide-react";
import { useChainId, useConnection } from "wagmi";
import { base } from "wagmi/chains";

export function Footer() {
  const { isConnected } = useConnection();
  const chainId = useChainId();
  const isBaseMainnet = chainId === base.id;

  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl mx-auto items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>© 2026 Router 402</span>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 text-sm">
              <Circle
                className={`h-2 w-2 fill-current ${
                  isBaseMainnet ? "text-green-500" : "text-yellow-500"
                }`}
              />
              <span className="text-muted-foreground">
                {isBaseMainnet ? "Base Mainnet" : "Wrong Network"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Circle className="h-2 w-2 fill-current text-gray-400" />
              <span className="text-muted-foreground">Not Connected</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
