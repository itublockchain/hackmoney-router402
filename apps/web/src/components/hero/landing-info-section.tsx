"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib";

const features = [
  {
    title: "No Subscriptions",
    description:
      "Ditch monthly fees. Route 402 uses crypto-native micropayments so you only pay for what you use. Stake a small collateral and get instant access to top-tier AI models.",
  },
  {
    title: "Account-less Access",
    description:
      "No sign-ups, no credit cards, no passwords. Just connect your wallet, stake 3 USDC, and start using AI immediately. Your wallet is your identity.",
  },
  {
    title: "Agent-Ready",
    description:
      "Built for autonomous AI agents from the ground up. Programmatic session keys and the x402 protocol enable machines to pay for AI services without human intervention.",
  },
  {
    title: "Multi-Provider",
    description:
      "Access OpenAI, Anthropic, and Google models through a single unified API. No more juggling multiple accounts and API keys across different providers.",
  },
  {
    title: "Gasless UX",
    description:
      "All transactions are sponsored via account abstraction. Focus on building, not managing gas fees. Seamless, frictionless, just like traditional APIs should be.",
  },
];

const tabs = [
  { id: "web", label: "Web" },
  { id: "vscode", label: "VS Code" },
  { id: "cli", label: "Terminal" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function LandingInfoSection() {
  const [activeTab, setActiveTab] = useState<TabId>("web");

  return (
    <section className="relative -mt-[26rem] md:-mt-[32rem] w-full bg-black px-4 pt-32 pb-24 sm:px-8 sm:pt-40 md:px-16 lg:px-24">
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
            What is Router402?
          </h2>
          <p className="mx-auto max-w-3xl text-sm text-neutral-400 sm:text-base">
            Route 402 is a decentralized AI gateway that replaces traditional
            SaaS subscriptions with crypto-native micropayments. Stake once,
            access multiple LLM providers through a single API, and let
            autonomous agents pay for their own compute.
          </p>
          <div className="mt-6 flex justify-center">
            <Button>
              Get Started
              <ExternalLink size={16} />
            </Button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="relative z-20 mb-24 flex items-center justify-center gap-4">
          <div className="inline-flex gap-1 rounded-full border border-neutral-700 bg-neutral-900 p-1">
            {tabs.map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
          <div className="relative w-full max-w-4xl">
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
            <div className="relative overflow-hidden rounded-lg">
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
                  <div className="flex h-full items-center justify-center text-neutral-500">
                    {activeTab === "web" && "Web Demo"}
                    {activeTab === "vscode" && "VS Code Demo"}
                    {activeTab === "cli" && "Terminal Demo"}
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
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600" />
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
              <div className="shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600" />
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
          <Button>
            More Details
            <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
