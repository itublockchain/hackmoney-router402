"use client";

import { ChevronDown, Globe, Puzzle, Terminal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/primitives/button";

const products = [
  {
    label: "Web Application",
    href: "/products/web-app",
    description: "AI chat interface powered by crypto micropayments",
    icon: Globe,
  },
  {
    label: "VS Code Extension",
    href: "/products/vscode-extension",
    description: "AI coding assistant right inside your editor",
    icon: Puzzle,
  },
  {
    label: "SDK",
    href: "/products/sdk",
    description: "Integrate Router402 into your own applications",
    icon: Terminal,
  },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl mx-auto items-center justify-between px-4">
        <Link href="/">
          <Image src="/logo.png" alt="Router 402" width={128} height={17.24} />
        </Link>

        <nav className="flex items-center gap-3">
          {/* Products dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Products
              <ChevronDown
                size={14}
                className="transition-transform group-hover:rotate-180"
              />
            </button>

            {/* Floating menu */}
            <div className="pointer-events-none absolute right-0 top-full pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="w-72 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-2 shadow-2xl shadow-black/50">
                {products.map((product) => (
                  <Link
                    key={product.href}
                    href={product.href}
                    className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-neutral-800/60"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900">
                      <product.icon size={16} className="text-neutral-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-100">
                        {product.label}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {product.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Button variant="ghost" asChild>
            <a
              href="https://docs.router402.xyz"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
          </Button>
          <Button asChild>
            <Link href="/chat">Launch App</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
