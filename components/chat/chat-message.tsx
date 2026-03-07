import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ResultMetadata } from "@/lib/chat/chat-types";
import { TaskResultCard } from "./task-result-card";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  resultMeta?: ResultMetadata;
  onCredit?: (taskId: string) => Promise<boolean>;
  credited?: boolean;
}

export function ChatMessage({ role, content, resultMeta, onCredit, credited }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%] overflow-hidden rounded-2xl bg-user-msg-bg px-3 py-2 text-sm leading-relaxed text-user-msg-text break-words whitespace-pre-wrap md:max-w-[80%] md:px-4 md:py-2.5">
          {content}
        </div>
      </div>
    );
  }

  // Structured result card for completed task output
  if (resultMeta && onCredit) {
    return (
      <TaskResultCard
        message={{ id: "", role, content, timestamp: 0, result_meta: resultMeta }}
        onCredit={onCredit}
        credited={credited}
      />
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] overflow-hidden px-1 py-1 text-sm leading-relaxed text-content md:max-w-[85%] md:px-2 md:py-1.5">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ children }) => (
              <pre className="my-2 overflow-x-auto rounded-lg bg-code-bg border border-code-border p-3 text-xs leading-relaxed text-content-secondary">
                {children}
              </pre>
            ),
            code: ({ className, children, ...props }) => {
              const isBlock = className?.startsWith("language-");
              if (isBlock) {
                return <code className="text-content-secondary" {...props}>{children}</code>;
              }
              return (
                <code className="rounded bg-code-bg border border-code-border px-1.5 py-0.5 text-xs text-accent" {...props}>
                  {children}
                </code>
              );
            },
            a: ({ children, href }) => (
              <a href={href} className="text-accent underline hover:text-accent-hover" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="text-content-secondary">{children}</li>,
            h1: ({ children }) => <h1 className="mb-1 mt-3 text-base font-bold text-content">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-1 mt-2 text-sm font-bold text-content">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-content">{children}</h3>,
            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
            blockquote: ({ children }) => (
              <blockquote className="my-2 border-l-2 border-edge-strong pl-3 text-content-tertiary italic">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="my-2 overflow-x-auto">
                <table className="w-full text-xs">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-edge bg-surface-alt px-2 py-1 text-left font-medium text-content">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-edge px-2 py-1 text-content-secondary">{children}</td>
            ),
          }}
        >
          {content}
        </Markdown>
      </div>
    </div>
  );
}
