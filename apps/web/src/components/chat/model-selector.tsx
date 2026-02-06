"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "@/config";

/** Human-readable display names for supported models */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "anthropic/claude-opus-4.5": "Claude Opus 4.5",
  "anthropic/claude-sonnet-4.5": "Claude Sonnet 4.5",
  "anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
  "google/gemini-3-pro-preview": "Gemini 3 Pro",
  "google/gemini-3-flash-preview": "Gemini 3 Flash",
};

function getDisplayName(model: string): string {
  return MODEL_DISPLAY_NAMES[model] ?? model;
}

interface ModelSelectorProps {
  model: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  model,
  onModelChange,
  disabled,
}: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${APP_CONFIG.apiUrl}/v1/models`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.data)) {
          setModels(json.data);
        }
      })
      .catch(() => {
        // Silently fail — the selector will just show the current model
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (m: string) => {
      onModelChange(m);
      setOpen(false);
    },
    [onModelChange]
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="max-w-[140px] truncate">{getDisplayName(model)}</span>
        <ChevronDown size={12} />
      </button>

      {open && models.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[200px] rounded-lg border border-border/60 bg-card p-1 shadow-lg">
          {models.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleSelect(m)}
              className={`flex w-full items-center rounded-md px-3 py-2 text-left text-xs transition-colors ${
                m === model
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {getDisplayName(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
