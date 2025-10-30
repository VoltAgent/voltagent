"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";

interface MessageContentProps {
  content: string;
  isUser?: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    // For user messages, just display plain text with line breaks
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  // For AI messages, render markdown with proper styling
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Paragraphs
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,

          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-emerald-100">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-emerald-100">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-3 mt-4 first:mt-0 text-emerald-100">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-emerald-100">
              {children}
            </h4>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 mb-4 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 mb-4 space-y-2">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,

          // Code blocks
          code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<"code">) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            const inline = !className;

            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-black/30 text-emerald-300 text-sm font-mono border border-white/10"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0d1117]">
                {lang && (
                  <div className="px-4 py-2 bg-black/30 border-b border-white/10 text-xs font-medium text-emerald-400">
                    {lang}
                  </div>
                )}
                <pre className="p-4 overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-2 my-4 italic text-emerald-100/80 bg-black/20 rounded-r">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => <hr className="my-6 border-t border-emerald-900/30" />,

          // Tables
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full divide-y divide-white/10">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-black/30">{children}</thead>,
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/10 bg-black/10">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-emerald-100/90">{children}</td>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-emerald-100">{children}</strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => <em className="italic text-emerald-100/90">{children}</em>,

          // Images
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || ""}
              className="max-w-full h-auto rounded-lg my-4 border border-white/10"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
