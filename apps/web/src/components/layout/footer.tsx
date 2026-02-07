import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

const FOOTER_LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/itublockchain/hackmoney-router402",
  },
  { label: "Docs", href: "https://docs.router402.xyz" },
  { label: "Showcase", href: "https://ethglobal.com/showcase/router402-b717q" },
  {
    label: "VS Code Extension",
    href: "https://marketplace.visualstudio.com/items?itemName=router402xyz.router402-vscode",
  },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t border-neutral-900 bg-background">
      <div className="container mx-auto max-w-screen-2xl px-4 pb-12 pt-12 sm:pt-[95px]">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/logo-text.png"
            alt="Router 402"
            width={180}
            height={80}
            className="object-contain"
          />

          <div className="flex flex-wrap items-center justify-center gap-3">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-black transition-colors hover:bg-primary/90"
              >
                {link.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Build with <span className="text-red-500">❤</span> for ETHGlobal.
          </p>
          <p className="text-sm text-muted-foreground">
            All rights reserved &copy; 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
