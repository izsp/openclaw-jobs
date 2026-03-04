"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";

interface ResultContentProps {
  content: string;
}

/** Enhanced markdown rendering with syntax-highlighted code blocks. */
export function ResultContent({ content }: ResultContentProps) {
  return (
    <div className="px-4 py-3 text-sm leading-relaxed text-zinc-200">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const match = className?.match(/language-(\w+)/);
            const codeStr = String(children).replace(/\n$/, "");
            if (match) {
              return <CodeBlock language={match[1]} code={codeStr} />;
            }
            return (
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-orange-400">
                {children}
              </code>
            );
          },
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-orange-400 underline hover:text-orange-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => <li className="text-zinc-300">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-1 mt-3 text-base font-bold text-zinc-100">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-2 text-sm font-bold text-zinc-100">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2 text-sm font-semibold text-zinc-200">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-zinc-600 pl-3 text-zinc-400 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-700 bg-zinc-900 px-2 py-1 text-left font-medium text-zinc-300">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-700 px-2 py-1 text-zinc-400">{children}</td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
