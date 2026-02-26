import Markdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-orange-500 px-4 py-2.5 text-sm leading-relaxed text-zinc-950 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-3 text-sm leading-relaxed text-zinc-200">
        <Markdown
          components={{
            pre: ({ children }) => (
              <pre className="my-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">
                {children}
              </pre>
            ),
            code: ({ className, children, ...props }) => {
              const isBlock = className?.startsWith("language-");
              if (isBlock) {
                return <code className="text-zinc-300" {...props}>{children}</code>;
              }
              return (
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-orange-400" {...props}>
                  {children}
                </code>
              );
            },
            a: ({ children, href }) => (
              <a href={href} className="text-orange-400 underline hover:text-orange-300" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="text-zinc-300">{children}</li>,
            h1: ({ children }) => <h1 className="mb-1 mt-3 text-base font-bold text-zinc-100">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-1 mt-2 text-sm font-bold text-zinc-100">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-zinc-200">{children}</h3>,
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
    </div>
  );
}
