"use client";

import { ConnectKitButton } from "connectkit";

export function ConnectWalletButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, truncatedAddress, ensName }) => {
        return (
          <button
            type="button"
            aria-label={isConnected ? "Open account details" : "Connect wallet"}
            disabled={isConnecting}
            onClick={show}
            className="flex items-center gap-3 rounded-3xl border border-border/50 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            <div className="flex flex-col items-center leading-tight">
              <div className="flex flex-row items-center space-x-1">
                <span className="text-xs">
                  {isConnected ? "Connected" : "Connect"}
                </span>
                <span className="text-xs">
                  {isConnected ? (ensName ?? truncatedAddress) : "Wallet"}
                </span>
              </div>
            </div>
          </button>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
