import type { ReactNode } from "react";

/*
 * Minimal, safe formatting for instructor-written lesson text: paragraphs,
 * "- " bullet lists, ``` code blocks, `inline code` and bare http(s) links.
 * Everything renders as React text nodes — no HTML is ever interpreted.
 */

type Block =
  | { kind: "code"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; lines: string[] };

const FENCE = /^\s*```/;
const BULLET = /^\s*[-*]\s+/;

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (FENCE.test(line)) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i]!)) {
        code.push(lines[i]!);
        i += 1;
      }
      i += 1; // closing fence (an unclosed block runs to the end)
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (BULLET.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET.test(lines[i]!)) {
        items.push(lines[i]!.replace(BULLET, "").trim());
        i += 1;
      }
      blocks.push({ kind: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !FENCE.test(lines[i]!) &&
      !BULLET.test(lines[i]!)
    ) {
      paragraph.push(lines[i]!.trim());
      i += 1;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }

  return blocks;
}

const INLINE = /`([^`\n]+)`|(https?:\/\/[^\s<>"'`]+)/g;

function linkParts(raw: string) {
  // Sentence punctuation after a URL isn't part of it.
  const href = raw.replace(/[.,;:!?)\]]+$/, "");
  return { href, rest: raw.slice(href.length) };
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    if (match[1] !== undefined) {
      nodes.push(
        <code
          key={index}
          className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-brand-navy"
        >
          {match[1]}
        </code>,
      );
    } else {
      const { href, rest } = linkParts(match[2]!);
      nodes.push(
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="break-all font-semibold text-brand-purple underline decoration-brand-purple/30 underline-offset-2 transition hover:text-brand-teal"
        >
          {href}
        </a>,
      );
      if (rest) nodes.push(rest);
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function LessonContent({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) {
    return <p className="text-muted">No written content for this lesson.</p>;
  }

  // Blocks are derived from static text, so their order is their identity.
  return blocks.map((block, index) => {
    if (block.kind === "code") {
      return (
        <pre
          key={index}
          className="overflow-x-auto rounded-xl bg-brand-navy px-4 py-3 font-mono text-[13px] leading-relaxed text-white/90"
        >
          <code>{block.text}</code>
        </pre>
      );
    }
    if (block.kind === "list") {
      return (
        <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-brand-teal">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={index}>
        {block.lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {renderInline(line)}
          </span>
        ))}
      </p>
    );
  });
}
