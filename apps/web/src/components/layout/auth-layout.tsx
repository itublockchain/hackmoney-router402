"use client";

import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Image src="/logo.png" alt="Router 402" width={160} height={21.5} />
      </div>
      <div className="w-full max-w-lg rounded-xl border border-border/40 bg-card p-6 shadow-lg">
        {children}
      </div>
    </div>
  );
}
