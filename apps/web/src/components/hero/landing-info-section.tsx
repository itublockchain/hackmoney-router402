"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { TerminalDemo } from "@/components/hero/terminal-demo";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib";

const features = [
  {
    emoji: "💸",
    title: "True Pay-Per-Use",
    description:
      "Not prepaid, not subscription. Every API call settles the exact cost of your previous request as a USDC micropayment on Base. Your funds stay in your smart account until a completed request is being paid for.",
  },
  {
    emoji: "🔌",
    title: "One API, Multiple Models",
    description:
      "Access Claude, Gemini, and more through a single OpenRouter-compatible endpoint. Switch models by changing one string. No new accounts, no new API keys, no new billing.",
  },
  {
    emoji: "⛽",
    title: "Gasless UX",
    description:
      "All transactions are handled via Pimlico-powered account abstraction. No gas fees, no wallet popups, no seed phrases. It feels like a traditional API, but your money stays yours.",
  },
  {
    emoji: "🌉",
    title: "Li.Fi MCP Integration",
    description:
      "Bridge and swap assets directly from your own wallet via the built-in Li.Fi MCP server. The gateway returns typed transaction data, you sign it yourself. No private key handoff, no custody risk.",
  },
  {
    emoji: "⚡",
    title: "~0.2s Settlement",
    description:
      "We modified the OpenFacilitator to leverage Base Flashblocks for ~200ms on-chain settlement. The previous request's cost confirms before the next LLM call is forwarded, fast enough to feel instant.",
  },
];

const tabs = [
  { id: "web", label: "Web" },
  { id: "vscode", label: "VS Code" },
  { id: "cli", label: "CLI" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function LandingInfoSection() {
  const [activeTab, setActiveTab] = useState<TabId>("web");
  const [gifLoaded, setGifLoaded] = useState(false);

  return (
    <section className="relative -mt-[32rem] md:-mt-[32rem] w-full bg-black px-4 pt-32 pb-24 sm:px-8 sm:pt-40 md:px-16 lg:px-24">
      <div className="mx-auto max-w-6xl">
        {/* Logo — relative z-20 so it floats above the wave animation (z-10) */}
        <div className="relative z-20 mb-12 flex justify-center">
          <Image
            src="/logo-large.png"
            alt="Router 402"
            width={240}
            height={60}
            className="h-auto w-48 sm:w-60"
            priority
          />
        </div>

        {/* Title and Subtitle — relative z-20 so it floats above the wave animation (z-10) */}
        <div className="relative z-20 mb-16 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            Use any LLM with x402 micropayments
          </h2>
          <p className="mx-auto max-w-3xl text-sm text-neutral-400 sm:text-base">
            One API, multiple models, true pay-per-use. Router402 is an
            OpenRouter-compatible AI gateway where every API call settles a USDC
            micropayment on Base via the x402 protocol. No subscriptions, no
            prepaid balances. Your money stays in your smart account until a
            completed request is paid for.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="relative z-20 mb-24 flex items-center justify-center gap-4">
          <div className="inline-flex gap-1 rounded-full border border-neutral-700 bg-neutral-900 p-1">
            {tabs.map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setGifLoaded(false);
                  }}
                  className={cn(
                    "rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Demo Terminal with Decorative Background */}
        <div className="relative z-20 mb-20 flex justify-center">
          <div className="relative w-full max-w-6xl">
            {/* Decorative background image */}
            <div className="absolute -inset-y-8 -inset-x-4 sm:-inset-y-12 sm:-inset-x-24 md:-inset-x-32 rounded-3xl overflow-hidden">
              <Image
                src="/frame.png"
                alt=""
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Terminal */}
            <div className="relative overflow-hidden rounded-lg bg-black">
              {/* macOS window title bar */}
              <div className="flex items-center gap-2 bg-black px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <div className="h-3 w-3 rounded-full bg-[#28C840]" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  className="aspect-video w-full bg-black"
                >
                  <div className="relative flex h-full items-start justify-start bg-black text-neutral-500">
                    {activeTab === "web" && (
                      <>
                        {!gifLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-400" />
                          </div>
                        )}
                        <Image
                          src="/demo/demo-web.gif"
                          alt="Web Demo"
                          fill
                          className={cn(
                            "object-cover transition-opacity duration-300",
                            gifLoaded ? "opacity-100" : "opacity-0"
                          )}
                          unoptimized
                          onLoad={() => setGifLoaded(true)}
                        />
                      </>
                    )}
                    {activeTab === "vscode" && (
                      <>
                        {!gifLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-400" />
                          </div>
                        )}
                        <Image
                          src="/demo/demo-vscode.gif"
                          alt="VS Code Demo"
                          fill
                          className={cn(
                            "object-cover transition-opacity duration-300",
                            gifLoaded ? "opacity-100" : "opacity-0"
                          )}
                          unoptimized
                          onLoad={() => setGifLoaded(true)}
                        />
                        <a
                          href="https://marketplace.visualstudio.com/items?itemName=router402xyz.router402-vscode"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-black backdrop-blur-sm transition-colors hover:bg-white"
                        >
                          Install Extension
                          <ExternalLink size={12} />
                        </a>
                      </>
                    )}
                    {activeTab === "cli" && <TerminalDemo />}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Feature Items - Row 1 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mt-50">
          {features.slice(0, 3).map((feature, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0000ff]">
                <span className="text-lg">{feature.emoji}</span>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Items - Row 2 (centered) */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 md:px-[16.67%]">
          {features.slice(3).map((feature, index) => (
            <div key={index + 3} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0000ff]">
                <span className="text-lg">{feature.emoji}</span>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Learn Details Button */}
        <div className="mt-12 flex justify-center">
          <Button asChild>
            <a
              href="https://docs.router402.xyz"
              target="_blank"
              rel="noopener noreferrer"
            >
              More Details
              <ExternalLink size={16} />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
