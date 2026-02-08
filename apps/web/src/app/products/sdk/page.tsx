"use client";

import {
  ArrowRight,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  Key,
  Layers,
  MessageSquare,
  Package,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { TerminalDemo } from "@/components/hero/terminal-demo";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/primitives/button";

const packageManagers = [
  { id: "npm", label: "npm", command: "npm install @router402/sdk" },
  { id: "yarn", label: "yarn", command: "yarn add @router402/sdk" },
  { id: "pnpm", label: "pnpm", command: "pnpm add @router402/sdk" },
  { id: "bun", label: "bun", command: "bun add @router402/sdk" },
] as const;

const features = [
  {
    icon: MessageSquare,
    title: "Simple Chat Interface",
    description:
      "Send chat completions with a single method call. sdk.chat(prompt) abstracts away all API complexity.",
  },
  {
    icon: Key,
    title: "Session Key Auth",
    description:
      "Generate, approve, and manage session keys for delegated access. Perfect for backend services and autonomous agents.",
  },
  {
    icon: Zap,
    title: "Gasless Transactions",
    description:
      "All transactions are sponsored via Pimlico paymaster. No ETH required for gas fees.",
  },
  {
    icon: Shield,
    title: "Account Abstraction (ERC-4337)",
    description:
      "Built on ERC-4337 with ZeroDev Kernel accounts. Smart account features like batched transactions and programmable permissions.",
  },
  {
    icon: Layers,
    title: "Full Setup Flow",
    description:
      "One-call setupAccount method handles the entire flow: deploy account, generate session key, approve, and enable on-chain.",
  },
  {
    icon: Cpu,
    title: "TypeScript & viem",
    description:
      "First-class TypeScript support with full type safety. Built on viem for reliable EVM interactions.",
  },
];

function InstallSection() {
  const [activeManager, setActiveManager] = useState<string>("npm");
  const [copied, setCopied] = useState(false);

  const activeCommand =
    packageManagers.find((pm) => pm.id === activeManager)?.command ??
    packageManagers[0].command;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(activeCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeCommand]);

  return (
    <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-400">
            <Package size={12} />
            <a
              href="https://www.npmjs.com/package/@router402/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-emerald-400"
            >
              @router402/sdk
              <ExternalLink size={10} className="ml-1 inline" />
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
          {/* Package manager tabs */}
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
            <div className="flex items-center gap-1">
              {packageManagers.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setActiveManager(pm.id)}
                  className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                    activeManager === pm.id
                      ? "bg-neutral-800 text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Command display */}
          <div className="p-4">
            <pre className="font-mono text-sm text-neutral-300">
              <code>
                <span className="text-emerald-400">$</span> {activeCommand}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SDKPage() {
  return (
    <div>
      <Navbar />
      <main className="bg-black">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-24 pb-20 sm:px-8 md:px-16 lg:px-24">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-4 py-1.5 text-sm text-neutral-300">
              <Terminal size={14} />
              SDK
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              One line to
              <br />
              <span className="text-emerald-400">chat completions.</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-neutral-400">
              Send chat completion requests with a single method call. The
              Router402 SDK handles smart accounts, session keys, and API
              authentication so you can focus on building.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <a
                  href="https://router402.xyz/chat"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Started
                  <ArrowRight size={16} />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/itublockchain/hackmoney-router402"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Code Example */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-3xl">
            <div className="overflow-hidden rounded-xl border border-neutral-800 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <div className="h-3 w-3 rounded-full bg-[#28C840]" />
                <span className="ml-2 text-xs text-neutral-500">index.ts</span>
              </div>
              <div className="overflow-x-auto bg-neutral-950 p-5">
                <pre className="font-mono text-[13px] leading-7 text-neutral-300">
                  <code>
                    <span className="text-violet-400">import</span>{" "}
                    <span className="text-neutral-500">{"{"}</span>{" "}
                    <span className="text-neutral-200">Router402Sdk</span>{" "}
                    <span className="text-neutral-500">{"}"}</span>{" "}
                    <span className="text-violet-400">from</span>{" "}
                    <span className="text-amber-300">
                      &quot;@router402/sdk&quot;
                    </span>
                    <span className="text-neutral-500">;</span>
                    {"\n\n"}
                    <span className="text-neutral-500">
                      {"// Initialize with your JWT token"}
                    </span>
                    {"\n"}
                    <span className="text-violet-400">const</span>{" "}
                    <span className="text-neutral-200">sdk</span>{" "}
                    <span className="text-neutral-500">=</span>{" "}
                    <span className="text-violet-400">new</span>{" "}
                    <span className="text-sky-400">Router402Sdk</span>
                    <span className="text-neutral-500">{"({"}</span>
                    {"\n"}
                    {"  "}
                    <span className="text-neutral-200">token</span>
                    <span className="text-neutral-500">:</span>{" "}
                    <span className="text-amber-300">
                      &quot;your-jwt-token&quot;
                    </span>
                    <span className="text-neutral-500">,</span>
                    {"\n"}
                    <span className="text-neutral-500">{"});"}</span>
                    {"\n\n"}
                    <span className="text-neutral-500">
                      {"// Send a chat completion request"}
                    </span>
                    {"\n"}
                    <span className="text-violet-400">const</span>{" "}
                    <span className="text-neutral-200">response</span>{" "}
                    <span className="text-neutral-500">=</span>{" "}
                    <span className="text-violet-400">await</span>{" "}
                    <span className="text-neutral-200">sdk</span>
                    <span className="text-neutral-500">.</span>
                    <span className="text-sky-400">chat</span>
                    <span className="text-neutral-500">(</span>
                    <span className="text-amber-300">
                      &quot;What is ERC-4337?&quot;
                    </span>
                    <span className="text-neutral-500">);</span>
                    {"\n"}
                    <span className="text-neutral-200">console</span>
                    <span className="text-neutral-500">.</span>
                    <span className="text-sky-400">log</span>
                    <span className="text-neutral-500">(</span>
                    <span className="text-neutral-200">response</span>
                    <span className="text-neutral-500">);</span>
                    {"\n\n"}
                    <span className="text-neutral-500">
                      {"// Use a different model"}
                    </span>
                    {"\n"}
                    <span className="text-violet-400">const</span>{" "}
                    <span className="text-neutral-200">answer</span>{" "}
                    <span className="text-neutral-500">=</span>{" "}
                    <span className="text-violet-400">await</span>{" "}
                    <span className="text-neutral-200">sdk</span>
                    <span className="text-neutral-500">.</span>
                    <span className="text-sky-400">chat</span>
                    <span className="text-neutral-500">(</span>
                    <span className="text-amber-300">
                      &quot;Explain account abstraction&quot;
                    </span>
                    <span className="text-neutral-500">,</span>{" "}
                    <span className="text-neutral-500">{"{"}</span>
                    {"\n"}
                    {"  "}
                    <span className="text-neutral-200">model</span>
                    <span className="text-neutral-500">:</span>{" "}
                    <span className="text-amber-300">
                      &quot;anthropic/claude-haiku-4.5&quot;
                    </span>
                    <span className="text-neutral-500">,</span>
                    {"\n"}
                    <span className="text-neutral-500">{"});"}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Install command */}
        <InstallSection />

        {/* Terminal Demo */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">
                See it in action
              </h2>
              <p className="mx-auto max-w-2xl text-neutral-400">
                A few lines of code to start chatting with any AI model, powered
                by crypto micropayments.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-neutral-800 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <div className="h-3 w-3 rounded-full bg-[#28C840]" />
                <span className="ml-2 text-xs text-neutral-500">Terminal</span>
              </div>
              <div className="aspect-video bg-neutral-950">
                <TerminalDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Built for developers and agents
              </h2>
              <p className="mx-auto max-w-2xl text-neutral-400">
                A simple chat interface backed by smart accounts, session keys,
                and gasless transactions on Base.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 transition-colors hover:border-neutral-700"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-400">
                    <feature.icon size={20} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Router402 SDK */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Why use Router402 SDK?
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                "One-line chat completions with sdk.chat()",
                "Multi-model support (Claude, Gemini)",
                "Gasless transactions via Pimlico paymaster",
                "Session key generation and approval",
                "One-call account setup flow",
                "ERC-4337 account abstraction",
                "Full TypeScript type safety",
                "Agent and bot friendly",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 px-4 py-3"
                >
                  <Check size={16} className="shrink-0 text-emerald-400" />
                  <span className="text-sm text-neutral-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-32 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              Start building today
            </h2>
            <p className="mb-8 text-neutral-400">
              From setup to chat completions in minutes. Install the SDK and
              start sending requests.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <a
                  href="https://docs.router402.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the Docs
                  <ArrowRight size={16} />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/itublockchain/hackmoney-router402"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
