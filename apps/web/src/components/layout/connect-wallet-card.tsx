"use client";

import { Wallet } from "lucide-react";
import Image from "next/image";
import { ConnectWalletButton } from "./connect-wallet-button";

interface ConnectWalletCardProps {
  title?: string;
  subtitle?: string;
  /**
   * full: Full-page experience with max-w-md constraint (default)
   * compact: Embedded within existing card, no outer container
   */
  variant?: "full" | "compact";
}

/**
 * A modern connect wallet card with a decorative background.
 * Reusable across Router402Guard, setup page, and other auth flows.
 */
export function ConnectWalletCard({
  title = "Sign in",
  subtitle = "You need to connect your favorite wallet to continue using Router 402",
  variant = "full",
}: ConnectWalletCardProps) {
  const content = (
    <>
      {/* Wallet icon */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Wallet size={32} className="text-primary" />
        </div>
      </div>

      {/* Title */}
      <h2 className="mb-2 text-center text-xl font-semibold text-foreground">
        {title}
      </h2>

      {/* Subtitle */}
      <p className="mb-8 text-center text-sm text-muted-foreground">
        {subtitle}
      </p>

      {/* Connect button */}
      <div className="flex justify-center">
        <ConnectWalletButton />
      </div>
    </>
  );

  if (variant === "compact") {
    return (
      <div className="relative py-4">
        {/* Decorative background image - smaller bleed for compact */}
        <div className="absolute -inset-4 sm:-inset-8 overflow-hidden rounded-2xl">
          <Image
            src="/frame.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Content */}
        <div className="relative px-2 py-6">{content}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-md">
        {/* Decorative background image */}
        <div className="absolute -inset-8 sm:-inset-16 md:-inset-24 overflow-hidden rounded-3xl">
          <Image
            src="/frame.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Content */}
        <div className="relative p-8">{content}</div>
      </div>
    </div>
  );
}
