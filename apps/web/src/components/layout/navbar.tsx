import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl mx-auto items-center justify-between px-4">
        <Image src="/logo.png" alt="Router 402" width={128} height={17.24} />

        <nav className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <a
              href="https://docs.route402.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
          </Button>
          <Button asChild>
            <Link href="/app">Launch App</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
