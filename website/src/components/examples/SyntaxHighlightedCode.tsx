import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";
import type React from "react";
import { useEffect, useRef } from "react";

interface SyntaxHighlightedCodeProps {
  code: string;
  language?: string;
}

const SyntaxHighlightedCode: React.FC<SyntaxHighlightedCodeProps> = ({
  code,
  language = "typescript",
}) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  });

  return (
    <>
      <style>{`
        /* GitHub Dark theme colors */
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: #8b949e;
        }

        .token.punctuation {
          color: #79c0ff;
        }

        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
          color: #79c0ff;
        }

        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #a5d6ff;
        }

        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
          color: #ff7b72;
        }

        .token.atrule,
        .token.attr-value,
        .token.keyword {
          color: #ff7b72;
        }

        .token.function,
        .token.class-name {
          color: #d2a8ff;
        }

        .token.regex,
        .token.important,
        .token.variable {
          color: #ffa657;
        }

        .token.important,
        .token.bold {
          font-weight: bold;
        }
        
        .token.italic {
          font-style: italic;
        }

        code[class*="language-"],
        pre[class*="language-"] {
          color: #c9d1d9;
          background: none;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 0.875rem;
          text-align: left;
          white-space: pre;
          word-spacing: normal;
          word-break: normal;
          word-wrap: normal;
          line-height: 1.5;
          tab-size: 4;
          hyphens: none;
        }

        pre[class*="language-"] {
          padding: 1em;
          margin: 0;
          overflow: auto;
        }

        :not(pre) > code[class*="language-"],
        pre[class*="language-"] {
          background: #0d1117;
        }

        /* Inline code */
        :not(pre) > code[class*="language-"] {
          padding: .1em;
          border-radius: .3em;
          white-space: normal;
        }
      `}</style>
      <div className="relative">
        <pre className="!bg-[#0d1117] !p-4 rounded-lg overflow-x-auto !m-0">
          <code ref={codeRef} className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </>
  );
};

export default SyntaxHighlightedCode;
