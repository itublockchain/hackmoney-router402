"use client";

import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores";

const SIDEBAR_WIDTH_OPEN = 256;
const SIDEBAR_WIDTH_COLLAPSED = 48;
const MOBILE_BREAKPOINT = 768;

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const hasInitialized = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // On mount: detect viewport, close sidebar on mobile, then reveal
  useEffect(() => {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    setIsMobile(mobile);

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (mobile) {
        setSidebarOpen(false);
      }
    }
    setIsMounted(true);

    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  // Close sidebar on mobile when navigating
  const handleNavigation = useCallback(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // Close on Escape key (mobile)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        sidebarOpen &&
        window.innerWidth < MOBILE_BREAKPOINT
      ) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  // Don't render until mounted (avoids SSR/hydration flash)
  if (!isMounted) {
    return null;
  }

  // Mobile: sidebar is fixed overlay, 0 width when closed (slides out via transform)
  // Desktop: sidebar is in-flow, 48px collapsed / 256px expanded
  const sidebarWidth = isMobile
    ? SIDEBAR_WIDTH_OPEN
    : sidebarOpen
      ? SIDEBAR_WIDTH_OPEN
      : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <>
      {/* Mobile overlay backdrop */}
      <button
        type="button"
        className={`
          fixed inset-0 z-40 bg-black/50 md:hidden
          transition-opacity duration-300 border-0 cursor-default
          ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}
        `}
        onClick={() => setSidebarOpen(false)}
        tabIndex={-1}
        aria-label="Close sidebar"
      />

      {/* Sidebar */}
      <aside
        className={`
          z-50 flex h-full shrink-0
          border-r border-border/40 bg-background
          overflow-hidden
          transition-[width,transform] duration-300 ease-in-out
          ${isMobile ? "fixed left-0 top-0" : "relative"}
        `}
        style={{
          width: sidebarWidth,
          transform:
            isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        {/* Expanded content — always rendered at full width, clipped by parent overflow */}
        <div
          className={`
            flex h-full flex-col
            transition-opacity duration-200
            ${sidebarOpen ? "opacity-100 delay-100" : "opacity-0"}
          `}
          style={{ width: SIDEBAR_WIDTH_OPEN, minWidth: SIDEBAR_WIDTH_OPEN }}
        >
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
            <span className="text-sm font-semibold text-foreground">Chats</span>
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              aria-label="Collapse sidebar"
            >
              {isMobile ? <X size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* New chat button */}
          <div className="p-3">
            <Link
              href="/chat"
              onClick={handleNavigation}
              className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <Plus size={16} className="shrink-0" />
              <span className="whitespace-nowrap">New Chat</span>
            </Link>
          </div>

          {/* Chat list */}
          <nav className="flex-1 overflow-y-auto px-3">
            <div className="space-y-1 py-2">
              <p className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                No conversations yet
              </p>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-border/40 p-3">
            <Link
              href="/setup"
              onClick={handleNavigation}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${
                pathname === "/setup"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Settings size={16} className="shrink-0" />
              <span className="whitespace-nowrap">Settings</span>
            </Link>
          </div>
        </div>

        {/* Collapsed icon bar — positioned absolutely, visible when sidebar is narrow */}
        {!isMobile && (
          <div
            className={`
              absolute inset-0 flex h-full flex-col items-center
              transition-opacity duration-200
              ${sidebarOpen ? "pointer-events-none opacity-0" : "opacity-100 delay-100"}
            `}
            style={{ width: SIDEBAR_WIDTH_COLLAPSED }}
          >
            <div className="flex h-14 shrink-0 items-center justify-center border-b border-border/40 w-full">
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                aria-label="Expand sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 py-3">
              <Link
                href="/chat"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="New chat"
              >
                <Plus size={16} />
              </Link>
              <Link
                href="/chat"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Chats"
              >
                <MessageSquare size={16} />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
