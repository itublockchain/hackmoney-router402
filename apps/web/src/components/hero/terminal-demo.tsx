"use client";

import { useEffect, useRef, useState } from "react";

// The SDK code lines that get typed out
const CODE_LINES = [
  'import { Router402Sdk } from "@router402/sdk";',
  "",
  'const sdk = new Router402Sdk({ token: "your-jwt-token" });',
  'const response = await sdk.chat("What is ERC-4337?");',
  "console.log(response);",
];

const RESPONSE = `ERC-4337 is the Account Abstraction standard for Ethereum. It replaces traditional EOA wallets with smart contract accounts that support:

  • Gasless transactions — a paymaster sponsors gas fees
  • Batched operations — multiple calls in one transaction
  • Session keys — delegated, scoped permissions for dApps
  • Programmable validation — custom signature schemes

Router402 uses ERC-4337 to let you pay for AI with crypto micropayments. No seed phrases, no gas management — just connect and chat.`;

// Timing (ms)
const CODE_CHAR_DELAY = 18;
const LINE_PAUSE = 120;
const RESPONSE_CHAR_DELAY = 12;
const PAUSE_BEFORE_RESPONSE = 800;
const PAUSE_BEFORE_RESTART = 3000;

type Phase =
  | "typing-code"
  | "pause-line"
  | "pause-before-response"
  | "streaming-response"
  | "done";

export function TerminalDemo() {
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const [currentLineText, setCurrentLineText] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [phase, setPhase] = useState<Phase>("typing-code");
  const [showCursor, setShowCursor] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setShowCursor((c) => !c), 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom whenever content changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are intentional scroll triggers
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [codeLines, currentLineText, responseText, phase]);

  // Animation state machine
  useEffect(() => {
    const clear = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    switch (phase) {
      case "typing-code": {
        const targetLine = CODE_LINES[currentLineIndex];
        if (targetLine === undefined) {
          // All lines typed
          setPhase("pause-before-response");
          break;
        }
        // Empty lines are added instantly
        if (targetLine === "") {
          timeoutRef.current = setTimeout(() => {
            setCodeLines((prev) => [...prev, ""]);
            setCurrentLineIndex((i) => i + 1);
          }, LINE_PAUSE);
          break;
        }
        if (currentLineText.length < targetLine.length) {
          timeoutRef.current = setTimeout(() => {
            setCurrentLineText(targetLine.slice(0, currentLineText.length + 1));
          }, CODE_CHAR_DELAY);
        } else {
          // Line complete, commit it
          timeoutRef.current = setTimeout(() => {
            setCodeLines((prev) => [...prev, targetLine]);
            setCurrentLineText("");
            setCurrentLineIndex((i) => i + 1);
            setPhase("pause-line");
          }, LINE_PAUSE);
        }
        break;
      }
      case "pause-line": {
        timeoutRef.current = setTimeout(() => {
          setPhase("typing-code");
        }, LINE_PAUSE);
        break;
      }
      case "pause-before-response": {
        timeoutRef.current = setTimeout(() => {
          setPhase("streaming-response");
        }, PAUSE_BEFORE_RESPONSE);
        break;
      }
      case "streaming-response": {
        if (responseText.length < RESPONSE.length) {
          timeoutRef.current = setTimeout(() => {
            setResponseText(RESPONSE.slice(0, responseText.length + 1));
          }, RESPONSE_CHAR_DELAY);
        } else {
          timeoutRef.current = setTimeout(() => {
            setPhase("done");
          }, PAUSE_BEFORE_RESTART);
        }
        break;
      }
      case "done": {
        setCodeLines([]);
        setCurrentLineText("");
        setCurrentLineIndex(0);
        setResponseText("");
        setPhase("typing-code");
        break;
      }
    }

    return clear;
  }, [phase, currentLineText, currentLineIndex, responseText]);

  const cursor = (
    <span
      className={`inline-block h-4 w-[7px] translate-y-[2px] bg-emerald-400 ${showCursor ? "opacity-100" : "opacity-0"}`}
    />
  );

  const isTypingCode = phase === "typing-code" || phase === "pause-line";
  const showResponse =
    phase === "pause-before-response" ||
    phase === "streaming-response" ||
    phase === "done";

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col gap-0.5 overflow-y-auto p-4 font-mono text-xs leading-relaxed sm:p-6 sm:text-sm"
    >
      {/* Committed code lines */}
      {codeLines.map((line, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="w-5 shrink-0 text-right text-neutral-600">
            {i + 1}
          </span>
          <CodeLine text={line} />
        </div>
      ))}

      {/* Currently typing line */}
      {isTypingCode && currentLineText !== "" && (
        <div className="flex items-start gap-2">
          <span className="w-5 shrink-0 text-right text-neutral-600">
            {codeLines.length + 1}
          </span>
          <span>
            <CodeLine text={currentLineText} />
            {cursor}
          </span>
        </div>
      )}

      {/* Execution separator + response */}
      {showResponse && (
        <>
          <div className="mt-3 border-t border-neutral-800 pt-3">
            <div className="mb-2 flex items-center gap-2 text-neutral-500">
              <span className="text-emerald-400">$</span>
              <span>node index.ts</span>
            </div>
          </div>
          {phase === "pause-before-response" && (
            <div className="text-neutral-500">Running...{cursor}</div>
          )}
          {(phase === "streaming-response" || phase === "done") && (
            <div className="whitespace-pre-wrap text-neutral-400">
              {responseText}
              {phase === "streaming-response" && cursor}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Applies syntax highlighting to a single code line */
function CodeLine({ text }: { text: string }) {
  if (text === "") return <span>&nbsp;</span>;

  const tokens = tokenizeLine(text);
  return (
    <span>
      {tokens.map((token, i) => (
        <span key={i} className={token.className}>
          {token.text}
        </span>
      ))}
    </span>
  );
}

type Token = { text: string; className?: string };

const KEYWORDS = new Set(["import", "from", "const", "new", "await"]);
const IDENTIFIERS = new Set(["Router402Sdk", "console", "log", "chat"]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let buf = "";

  const flush = (className?: string) => {
    if (buf) {
      tokens.push({ text: buf, className });
      buf = "";
    }
  };

  while (i < line.length) {
    // Comments
    if (line[i] === "/" && line[i + 1] === "/") {
      flush();
      tokens.push({ text: line.slice(i), className: "text-neutral-500" });
      return tokens;
    }

    // Strings (double-quoted)
    if (line[i] === '"') {
      flush();
      const end = line.indexOf('"', i + 1);
      const str = end === -1 ? line.slice(i) : line.slice(i, end + 1);
      tokens.push({ text: str, className: "text-amber-300" });
      i += str.length;
      continue;
    }

    // Word boundaries — check for keywords/identifiers
    if (/[a-zA-Z_]/.test(line[i])) {
      flush();
      let word = "";
      while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
        word += line[i];
        i++;
      }
      if (KEYWORDS.has(word)) {
        tokens.push({ text: word, className: "text-violet-400" });
      } else if (IDENTIFIERS.has(word)) {
        tokens.push({ text: word, className: "text-sky-400" });
      } else {
        tokens.push({ text: word });
      }
      continue;
    }

    buf += line[i];
    i++;
  }

  flush();
  return tokens;
}
