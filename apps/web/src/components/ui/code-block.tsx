"use client";

import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/primitives";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ className, code, language, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative rounded-lg border bg-muted/50", className)}
        {...props}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          {language && (
            <span className="text-xs font-medium text-muted-foreground">
              {language}
            </span>
          )}
          {!language && <span />}
          <CopyButton value={code} label="Copy code" className="h-7 w-7" />
        </div>
        <ScrollArea className="max-h-96">
          <pre className="overflow-x-auto p-4">
            <code className="font-mono text-sm">{code}</code>
          </pre>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }
);
CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
export type { CodeBlockProps };
