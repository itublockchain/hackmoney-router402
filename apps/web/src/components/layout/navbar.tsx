"use client";

import Image from "next/image";
import { ConnectWalletButton } from "./connect-wallet-button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl mx-auto items-center justify-between px-4">
        <Image src="/logo.png" alt="Router 402" width={128} height={17.24} />

        <nav className="flex items-center gap-6">
          <ConnectWalletButton />
        </nav>
      </div>
    </header>
  );
}
