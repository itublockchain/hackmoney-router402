"use client";

import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/primitives";
import { cn } from "@/lib";
import { CopyButton } from "./copy-button";

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
}

export function useHighlightedCode(code: string, language: string | undefined) {
  const [html, setHtml] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!language) return;

    let cancelled = false;

    // Debounce shiki highlighting to avoid re-tokenizing on every streaming tick
    const timer = setTimeout(() => {
      import("shiki").then(({ codeToHtml }) =>
        codeToHtml(code, {
          lang: language,
          theme: "github-dark-default",
        })
          .then((result) => {
            if (!cancelled) setHtml(result);
          })
          .catch(() => {
            /* fall back to plain text */
          })
      );
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, language]);

  return html;
}

function HighlightedCode({ html }: { html: string }) {
  return (
    <div
      className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed [&_pre]:!m-0 [&_pre]:!bg-transparent [&_code]:!bg-transparent"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki generates trusted HTML from code input
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ className, code, language, ...props }, ref) => {
    const highlightedHtml = useHighlightedCode(code, language);

    return (
      <div
        ref={ref}
        className={cn(
          "my-3 overflow-hidden rounded-xl border border-border/50 bg-[hsl(0_0%_6%)]",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between bg-[hsl(0_0%_8%)] px-4 py-2">
          {language ? (
            <span className="text-xs font-medium text-muted-foreground">
              {language}
            </span>
          ) : (
            <span />
          )}
          <CopyButton value={code} label="Copy code" className="h-7 w-7" />
        </div>
        <ScrollArea>
          {highlightedHtml ? (
            <HighlightedCode html={highlightedHtml} />
          ) : (
            <pre className="overflow-x-auto p-4">
              <code className="font-mono text-[13px] leading-relaxed">
                {code}
              </code>
            </pre>
          )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }
);
CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
export type { CodeBlockProps };
