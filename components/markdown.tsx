/**
 * A deliberately small markdown renderer.
 *
 * The counterpart's replies are the only untrusted markdown in the product.
 * Escaping by construction — building React elements rather than HTML strings —
 * and allowing a fixed set of inline patterns is safer here than pulling in a
 * parser and a sanitiser and hoping they agree with each other.
 */

import { Fragment, type ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith("`")) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      const href = link?.[2] ?? "#";
      out.push(
        <a
          key={key}
          href={/^https?:\/\//i.test(href) ? href : "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="text-signal underline underline-offset-2"
        >
          {link?.[1]}
        </a>,
      );
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let listOrdered = false;
  let codeBuffer: string[] | null = null;
  let key = 0;

  const flushList = () => {
    if (!listBuffer.length) return;
    const items = listBuffer.map((item, i) => <li key={i}>{inline(item, `li${key}-${i}`)}</li>);
    blocks.push(listOrdered ? <ol key={key++}>{items}</ol> : <ul key={key++}>{items}</ul>);
    listBuffer = [];
  };

  for (const raw of lines) {
    if (raw.trimStart().startsWith("```")) {
      if (codeBuffer === null) {
        flushList();
        codeBuffer = [];
      } else {
        blocks.push(
          <pre key={key++}>
            <code>{codeBuffer.join("\n")}</code>
          </pre>,
        );
        codeBuffer = null;
      }
      continue;
    }
    if (codeBuffer !== null) {
      codeBuffer.push(raw);
      continue;
    }

    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (/^(-{3,}|_{3,})$/.test(line)) {
      flushList();
      blocks.push(<hr key={key++} />);
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const content = inline(heading[2], `h${key}`);
      blocks.push(
        level === 1 ? (
          <h1 key={key++}>{content}</h1>
        ) : level === 2 ? (
          <h2 key={key++}>{content}</h2>
        ) : (
          <h3 key={key++}>{content}</h3>
        ),
      );
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (listBuffer.length && ordered !== listOrdered) flushList();
      listOrdered = ordered;
      listBuffer.push((bullet?.[1] ?? numbered?.[1]) as string);
      continue;
    }
    flushList();
    blocks.push(<p key={key++}>{inline(line, `p${key}`)}</p>);
  }

  flushList();
  if (codeBuffer !== null) {
    blocks.push(
      <pre key={key++}>
        <code>{codeBuffer.join("\n")}</code>
      </pre>,
    );
  }

  return (
    <div className={`copy ${className}`}>
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
