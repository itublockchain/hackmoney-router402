"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useUIStore } from "@/stores";
import { ConnectWalletButton } from "./connect-wallet-button";
import { PanelResizer } from "./panel-resizer";
import { Sidebar } from "./sidebar";

const MIN_ARTIFACT_WIDTH = 300;
const MAX_ARTIFACT_WIDTH = 800;
const DEFAULT_ARTIFACT_WIDTH = 400;

interface AppLayoutProps {
  children: React.ReactNode;
  artifactPanel?: React.ReactNode;
}

export function AppLayout({ children, artifactPanel }: AppLayoutProps) {
  const { setSidebarOpen } = useUIStore();
  const [artifactWidth, setArtifactWidth] = useState(DEFAULT_ARTIFACT_WIDTH);
  const showArtifact = !!artifactPanel;

  const handleArtifactResize = useCallback((delta: number) => {
    setArtifactWidth((prev) => {
      const newWidth = prev - delta;
      return Math.max(
        MIN_ARTIFACT_WIDTH,
        Math.min(MAX_ARTIFACT_WIDTH, newWidth)
      );
    });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          <Image src="/logo.png" alt="Router 402" width={100} height={13.5} />
        </div>
        <ConnectWalletButton />
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Chat area */}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>

        {/* Artifact panel (conditionally shown) */}
        {showArtifact && (
          <>
            <PanelResizer onResize={handleArtifactResize} />
            <aside
              className="hidden flex-col overflow-hidden border-l border-border/40 md:flex"
              style={{ width: artifactWidth }}
            >
              {artifactPanel}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
