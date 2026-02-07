"use client";

import {
  ArrowRight,
  CreditCard,
  Globe,
  MessageSquare,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/primitives/button";

const features = [
  {
    icon: Wallet,
    title: "Wallet-Based Access",
    description:
      "Connect your wallet and start chatting with AI instantly. No sign-ups, no credit cards, no passwords.",
  },
  {
    icon: Sparkles,
    title: "Multiple AI Models",
    description:
      "Access GPT-4o, Claude, Gemini and more through a single unified interface. Switch between models mid-conversation.",
  },
  {
    icon: CreditCard,
    title: "Pay-Per-Use",
    description:
      "Only pay for what you use with crypto micropayments. No monthly subscriptions, no overage fees, no commitment.",
  },
  {
    icon: Zap,
    title: "Gasless Transactions",
    description:
      "All payments are sponsored via account abstraction. You never need to worry about gas fees or network congestion.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your wallet is your identity. No personal data collected, no tracking, no data selling. Your conversations stay yours.",
  },
  {
    icon: MessageSquare,
    title: "Rich Chat Experience",
    description:
      "Code highlighting, markdown rendering, conversation history, and artifact support for a complete AI chat experience.",
  },
];

export default function WebAppPage() {
  return (
    <div>
      <Navbar />
      <main className="bg-black">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-24 pb-20 sm:px-8 md:px-16 lg:px-24">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-4 py-1.5 text-sm text-neutral-300">
              <Globe size={14} />
              Web Application
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Chat with AI.
              <br />
              <span className="text-blue-400">Pay with crypto.</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-neutral-400">
              Router402 gives you instant access to the world&apos;s best AI
              models through a single, wallet-powered interface. No
              subscriptions, no sign-ups — just connect and start building.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/chat">
                  Launch App
                  <ArrowRight size={16} />
                </Link>
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
                  router402.xyz
                </span>
              </div>
              <div className="relative aspect-video bg-neutral-950">
                <Image
                  src="/demo/demo-web.gif"
                  alt="Router402 Web App Demo"
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
                Everything you need to chat with AI
              </h2>
              <p className="mx-auto max-w-2xl text-neutral-400">
                A full-featured AI chat experience powered by decentralized
                infrastructure and crypto-native payments.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 transition-colors hover:border-neutral-700"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
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

        {/* How It Works */}
        <section className="px-4 pb-24 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Get started in 2 steps
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:px-[16.67%]">
              {[
                {
                  step: "01",
                  title: "Connect Wallet",
                  description:
                    "Link your crypto wallet. We support all major wallets via WalletConnect and browser extensions.",
                },
                {
                  step: "02",
                  title: "Start Chatting",
                  description:
                    "Choose your AI model and start a conversation. Pay only for the tokens you consume.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-700 text-sm font-bold text-blue-400">
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

        {/* CTA */}
        <section className="px-4 pb-32 sm:px-8 md:px-16 lg:px-24">
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              Ready to try it?
            </h2>
            <p className="mb-8 text-neutral-400">
              No sign-up required. Connect your wallet and start chatting in
              seconds.
            </p>
            <Button size="lg" asChild>
              <Link href="/chat">
                Launch App
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
