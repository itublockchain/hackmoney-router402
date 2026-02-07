"use client";

import {
  ArrowRight,
  Bot,
  Code2,
  FileCode,
  GitCompare,
  Puzzle,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/primitives/button";

const VS_CODE_EXTENSION_URL =
  "https://marketplace.visualstudio.com/items?itemName=router402xyz.router402-vscode";

const features = [
  {
    icon: Bot,
    title: "AI Chat in Your Editor",
    description:
      "Open a chat panel directly inside VS Code. Ask questions, get explanations, and brainstorm — all without leaving your editor.",
  },
  {
    icon: Code2,
    title: "Inline Code Generation",
    description:
      "Highlight code and ask AI to refactor, explain, or extend it. Generated code is inserted right where you need it.",
  },
  {
    icon: GitCompare,
    title: "Diff-Based Reviews",
    description:
      "Get AI-powered code reviews with inline diff views. Understand suggested changes before applying them.",
  },
  {
    icon: Sparkles,
    title: "Multi-Model Support",
    description:
      "Switch between GPT-4o, Claude, Gemini and more from the model selector. Use the best model for each task.",
  },
  {
    icon: Zap,
    title: "API Key Authentication",
    description:
      "Set your API key once from the Router402 dashboard and the extension handles the rest. No wallet setup needed inside the editor.",
  },
  {
    icon: FileCode,
    title: "Context-Aware",
    description:
      "The extension understands your workspace. It reads your open files and project structure to give more relevant answers.",
  },
];

export default function VSCodeExtensionPage() {
  return (
    <div>
      <Navbar />
      <main className="bg-black">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-24 pb-20 sm:px-8 md:px-16 lg:px-24">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-4 py-1.5 text-sm text-neutral-300">
              <Puzzle size={14} />
              VS Code Extension
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              AI coding assistant.
              <br />
              <span className="text-violet-400">Inside your editor.</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-neutral-400">
              Bring the power of Router402 directly into VS Code. Chat with AI,
              generate code, get reviews — all powered by crypto micropayments
              with zero subscriptions.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <a
                  href={VS_CODE_EXTENSION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Install Extension
                  <ArrowRight size={16} />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://docs.router402.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Docs
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Screenshot / Demo */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-neutral-800 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <div className="h-3 w-3 rounded-full bg-[#28C840]" />
                <span className="ml-2 text-xs text-neutral-500">
                  Visual Studio Code
                </span>
              </div>
              <div className="relative aspect-video bg-neutral-950">
                <Image
                  src="/demo/demo-vscode.gif"
                  alt="Router402 VS Code Extension Demo"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Your AI pair programmer
              </h2>
              <p className="mx-auto max-w-2xl text-neutral-400">
                Code faster, debug smarter, and ship better software with an AI
                assistant that lives right in your workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 transition-colors hover:border-neutral-700"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400">
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

        {/* Quick Start */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Up and running in minutes
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Install Extension",
                  description:
                    'Search for "Router402" in the VS Code marketplace or click the install button above.',
                },
                {
                  step: "02",
                  title: "Set API Key",
                  description:
                    "Get your API key from the Router402 dashboard and set it via the extension's Set API Key command.",
                },
                {
                  step: "03",
                  title: "Start Coding",
                  description:
                    "Open the Router402 chat panel and start chatting with AI, right from your editor.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-700 text-sm font-bold text-violet-400">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Terminal install command */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-2xl">
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
              <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
                <Terminal size={14} className="text-neutral-500" />
                <span className="text-xs text-neutral-500">Terminal</span>
              </div>
              <div className="p-4">
                <pre className="font-mono text-sm text-neutral-300">
                  <code>
                    <span className="text-emerald-400">$</span>{" "}
                    <span className="text-sky-400">code</span>{" "}
                    <span className="text-amber-300">
                      --install-extension router402xyz.router402-vscode
                    </span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-32 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              Supercharge your workflow
            </h2>
            <p className="mb-8 text-neutral-400">
              Install the Router402 VS Code extension and start coding with AI
              today.
            </p>
            <Button size="lg" asChild>
              <a
                href={VS_CODE_EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Install Extension
                <ArrowRight size={16} />
              </a>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
