"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

function truncateAddress(
  address: string,
  startChars = 6,
  endChars = 4
): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  address: string;
  startChars?: number;
  endChars?: number;
  copyable?: boolean;
}

const AddressDisplay = React.forwardRef<HTMLDivElement, AddressDisplayProps>(
  (
    {
      className,
      address,
      startChars = 6,
      endChars = 4,
      copyable = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 font-mono text-sm",
          className
        )}
        {...props}
      >
        <span title={address}>
          {truncateAddress(address, startChars, endChars)}
        </span>
        {copyable && <CopyButton value={address} label="Copy address" />}
      </div>
    );
  }
);
AddressDisplay.displayName = "AddressDisplay";

export { AddressDisplay, truncateAddress };
export type { AddressDisplayProps };
