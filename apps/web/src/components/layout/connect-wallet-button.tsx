"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, mounted, openAccountModal, openConnectModal }) => {
        const ready = mounted;
        const connected = ready && Boolean(account);

        return (
          <button
            type="button"
            aria-label={connected ? "Open account details" : "Connect wallet"}
            disabled={!ready}
            onClick={connected ? openAccountModal : openConnectModal}
            className="flex items-center gap-3 rounded-full border border-border/50 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="flex flex-col items-center leading-tight">
              <div className="flex flex-row items-center space-x-1">
                <span className="text-xs">
                  {connected ? "Connected" : "Connect"}
                </span>
                <span className="text-xs">
                  {connected ? account?.displayName : "Wallet"}
                </span>
              </div>
            </div>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
