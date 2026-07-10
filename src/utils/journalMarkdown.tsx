import React from "react";

interface JournalMarkdownProps {
  content: string;
  onLink: (linkKey: string) => void;
  onTag?: (tag: string) => void;
  onToggleTodo?: (index: number) => void;
}

const INLINE_RE = /(\[\[[^\]]+\]\])|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(#[\p{L}\p{N}_-]+)/gu;

function renderInline(text: string, onLink: (k: string) => void, onTag?: (t: string) => void): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  let key = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(text.slice(lastIndex, m.index));
    }
    const token = m[0];
    if (token.startsWith("[[")) {
      const inner = token.slice(2, -2);
      const [rawKey, label] = inner.split("|");
      const linkKey = (rawKey || "").trim();
      const display = (label || rawKey || "").trim();
      nodes.push(
        <button
          key={key++}
          onClick={() => onLink(linkKey)}
          className="text-[#4D7C5D] font-semibold hover:underline bg-[#4D7C5D]/8 px-1 rounded cursor-pointer transition-colors"
        >
          {display || linkKey}
        </button>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key++} className="bg-slate-100 text-[#A64424] rounded px-1 py-0.5 text-[0.85em] font-mono">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key++} className="font-bold text-[#2D323A]">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++} className="italic">{token.slice(1, -1)}</em>);
    } else if (token.startsWith("#")) {
      const tag = token.slice(1);
      nodes.push(
        <button
          key={key++}
          onClick={() => onTag?.(tag)}
          className="text-[#8B6E3C] bg-[#8B6E3C]/10 hover:bg-[#8B6E3C]/20 rounded-full px-2 py-0.5 text-[0.8em] font-medium cursor-pointer transition-colors"
        >
          #{tag}
        </button>
      );
    }
    lastIndex = m.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function JournalMarkdown({ content, onLink, onTag, onToggleTodo }: JournalMarkdownProps) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let orderList: string[] = [];
  let bk = 0;
  let todoIdx = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={bk++} className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
          {renderInline(para.join(" "), onLink, onTag)}
        </p>
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={bk++} className="pl-1 space-y-1 text-[13px] leading-relaxed text-slate-700">
          {list.map((it, i) => {
            const todoMatch = /^\[( |x|X)\]\s?([\s\S]*)$/.exec(it);
            if (todoMatch) {
              const checked = todoMatch[1].toLowerCase() === "x";
              const myIdx = todoIdx++;
              return (
                <li key={i} className="flex items-start gap-2 list-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleTodo?.(myIdx)}
                    className="mt-1 w-3.5 h-3.5 accent-[#4D7C5D] cursor-pointer flex-shrink-0"
                  />
                  <span className={checked ? "line-through text-slate-400" : ""}>
                    {renderInline(todoMatch[2], onLink, onTag)}
                  </span>
                </li>
              );
            }
            return <li key={i} className="list-disc ml-4">{renderInline(it, onLink, onTag)}</li>;
          })}
        </ul>
      );
      list = [];
    }
  };
  const flushOrder = () => {
    if (orderList.length) {
      blocks.push(
        <ol key={bk++} className="list-decimal pl-5 space-y-1 text-[13px] leading-relaxed text-slate-700">
          {orderList.map((it, i) => <li key={i}>{renderInline(it, onLink, onTag)}</li>)}
        </ol>
      );
      orderList = [];
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("### ")) {
      flushPara(); flushList(); flushOrder();
      blocks.push(<h3 key={bk++} className="text-[15px] font-bold text-[#2D323A] mt-3 mb-1">{renderInline(line.slice(4), onLink, onTag)}</h3>);
    } else if (line.startsWith("## ")) {
      flushPara(); flushList(); flushOrder();
      blocks.push(<h2 key={bk++} className="text-[17px] font-bold text-[#2D323A] mt-4 mb-1.5 border-b border-[#EFEBE4] pb-1">{renderInline(line.slice(3), onLink, onTag)}</h2>);
    } else if (line.startsWith("# ")) {
      flushPara(); flushList(); flushOrder();
      blocks.push(<h1 key={bk++} className="text-[20px] font-bold text-[#2D323A] mt-2 mb-2">{renderInline(line.slice(2), onLink, onTag)}</h1>);
    } else if (/^\s*[-*]\s+/.test(line)) {
      flushPara(); flushOrder();
      list.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (/^\s*\d+\.\s+/.test(line)) {
      flushPara(); flushList();
      orderList.push(line.replace(/^\s*\d+\.\s+/, ""));
    } else if (line.trim() === "") {
      flushPara(); flushList(); flushOrder();
    } else {
      flushList(); flushOrder();
      para.push(line);
    }
  }
  flushPara(); flushList(); flushOrder();

  if (blocks.length === 0) {
    return <p className="text-[13px] text-slate-300 italic">（空白）</p>;
  }
  return <div className="space-y-1.5">{blocks}</div>;
}
