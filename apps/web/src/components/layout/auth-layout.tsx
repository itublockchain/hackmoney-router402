"use client";

import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Subtle radial gradient accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="relative mb-8">
        <Image src="/logo.png" alt="Router 402" width={160} height={21.5} />
      </div>
      <div className="relative w-full max-w-lg rounded-xl border border-border/40 bg-card p-6 shadow-lg md:max-w-2xl">
        {children}
      </div>
    </div>
  );
}
