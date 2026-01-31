"use client";

import Link from "next/link";

import { ConnectWalletButton } from "./connect-wallet-button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl mx-auto items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-xl">Router 402</span>
        </Link>

        <nav className="flex items-center gap-6">
          <ConnectWalletButton />
        </nav>
      </div>
    </header>
  );
}
