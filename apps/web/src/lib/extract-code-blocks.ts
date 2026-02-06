export interface CodeBlockInfo {
  code: string;
  language?: string;
  index: number;
}

const FENCED_CODE_RE = /```(\w+)?\n([\s\S]*?)```/g;

/**
 * Extract fenced code blocks from a markdown string.
 * Returns an array of { code, language, index } objects.
 */
export function extractCodeBlocks(markdown: string): CodeBlockInfo[] {
  const blocks: CodeBlockInfo[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
  while ((match = FENCED_CODE_RE.exec(markdown)) !== null) {
    blocks.push({
      code: match[2].replace(/\n$/, ""),
      language: match[1] || undefined,
      index: idx++,
    });
  }

  return blocks;
}
