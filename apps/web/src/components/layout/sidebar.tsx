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
import { useCallback, useEffect } from "react";
import { useUIStore } from "@/stores/ui.store";

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();

  // Close sidebar on mobile when navigating
  const handleNavigation = useCallback(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // Close sidebar on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && sidebarOpen && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  // Close mobile sidebar overlay on window resize past breakpoint
  useEffect(() => {
    function handleResize() {
      if (sidebarOpen && window.innerWidth >= 768) {
        // No longer in mobile, no overlay needed — keep sidebar open but
        // ensure mobile overlay is gone by re-setting state
        setSidebarOpen(true);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setSidebarOpen(false);
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border/40 bg-background
          transition-all duration-300 ease-in-out
          md:relative md:z-auto
          ${sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-12 md:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div
          className={`flex h-14 items-center border-b border-border/40 ${sidebarOpen ? "justify-between px-4" : "justify-center px-0"}`}
        >
          {sidebarOpen && (
            <span className="text-sm font-semibold text-foreground">Chats</span>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="hidden md:block" size={16} />
                <X className="md:hidden" size={16} />
              </>
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>

        {/* New chat button */}
        {sidebarOpen && (
          <div className="p-3">
            <Link
              href="/chat"
              onClick={handleNavigation}
              className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-foreground transition hover:bg-accent"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </Link>
          </div>
        )}

        {/* Chat list placeholder */}
        <nav className="flex-1 overflow-y-auto px-3">
          {sidebarOpen && (
            <div className="space-y-1 py-2">
              <p className="px-2 text-xs text-muted-foreground">
                No conversations yet
              </p>
            </div>
          )}
          {!sidebarOpen && (
            <div className="flex flex-col items-center gap-2 py-3">
              <Link
                href="/chat"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="New chat"
              >
                <Plus size={16} />
              </Link>
              <Link
                href="/chat"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Chats"
              >
                <MessageSquare size={16} />
              </Link>
            </div>
          )}
        </nav>

        {/* Sidebar footer */}
        {sidebarOpen && (
          <div className="border-t border-border/40 p-3">
            <Link
              href="/setup"
              onClick={handleNavigation}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-accent ${
                pathname === "/setup"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
