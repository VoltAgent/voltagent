"use client";

import {
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { Claude37Logo } from "../../../static/img/logos/claudie";
import { CursorLogo } from "../../../static/img/logos/cursor";
import { MarkdownLogo } from "../../../static/img/logos/markdown";
import { MCPLogo } from "../../../static/img/logos/mcp";
import { VSCodeLogo } from "../../../static/img/logos/vscode";

// OpenAI/ChatGPT icon (from static/img/open-ai.svg)
const OpenAIIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

export default function CopyPageDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCurrentPageUrl = (): string => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  };

  const getPageContent = (): string => {
    const article = document.querySelector("article");
    if (!article) return "";

    const title = document.querySelector("h1")?.textContent || "";
    const content = article.textContent || "";

    return `# ${title}\n\n${content}`;
  };

  const copyPageAsMarkdown = async () => {
    const content = getPageContent();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const viewAsMarkdown = () => {
    const content = getPageContent();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const openLlmsTxt = () => {
    window.open("https://voltagent.dev/llms.txt", "_blank");
  };

  const openInChatGPT = () => {
    const pageUrl = getCurrentPageUrl();
    const prompt = `Read from ${pageUrl} so I can ask questions about it.`;
    window.open(`https://chatgpt.com/?hints=search&prompt=${encodeURIComponent(prompt)}`, "_blank");
  };

  const openInClaude = () => {
    const pageUrl = getCurrentPageUrl();
    const prompt = `Read from ${pageUrl} so I can ask questions about it.`;
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, "_blank");
  };

  const copyMCPServer = async () => {
    const mcpConfig = JSON.stringify(
      {
        name: "voltagent",
        command: "npx",
        args: ["-y", "@voltagent/docs-mcp"],
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(mcpConfig);
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const connectToCursor = () => {
    // MCP config for Cursor deeplink
    const mcpConfig = {
      name: "VoltAgent Docs",
      command: "npx",
      args: ["-y", "@voltagent/docs-mcp"],
    };
    const encodedConfig = btoa(JSON.stringify(mcpConfig));
    window.open(
      `cursor://anysphere.cursor-deeplink/mcp/install?name=VoltAgent%20Docs&config=${encodedConfig}`,
      "_blank",
    );
  };

  const connectToVSCode = () => {
    // VS Code MCP extension deeplink
    const mcpConfig = {
      name: "VoltAgent Docs",
      command: "npx",
      args: ["-y", "@voltagent/docs-mcp"],
    };
    const encodedConfig = btoa(JSON.stringify(mcpConfig));
    window.open(
      `vscode://anthropic.claude-code/mcp/install?name=VoltAgent%20Docs&config=${encodedConfig}`,
      "_blank",
    );
  };

  const menuItems = [
    {
      icon: DocumentDuplicateIcon,
      label: copied ? "Copied!" : "Copy page",
      description: "Copy page as Markdown for LLMs",
      onClick: copyPageAsMarkdown,
      hasArrow: false,
    },
    {
      icon: MarkdownLogo,
      label: "View as Markdown",
      description: "View this page as plain text",
      onClick: viewAsMarkdown,
      hasArrow: true,
    },
    {
      icon: DocumentTextIcon,
      label: "llms.txt",
      description: "Open llms.txt for this site",
      onClick: openLlmsTxt,
      hasArrow: true,
    },
    {
      icon: OpenAIIcon,
      label: "Open in ChatGPT",
      description: "Ask questions about this page",
      onClick: openInChatGPT,
      hasArrow: true,
    },
    {
      icon: Claude37Logo,
      label: "Open in Claude",
      description: "Ask questions about this page",
      onClick: openInClaude,
      hasArrow: true,
    },
    {
      icon: MCPLogo,
      label: mcpCopied ? "Copied!" : "Copy MCP Server",
      description: "Copy MCP Server config to clipboard",
      onClick: copyMCPServer,
      hasArrow: false,
    },
    {
      icon: CursorLogo,
      label: "Connect to Cursor",
      description: "Install MCP Server on Cursor",
      onClick: connectToCursor,
      hasArrow: true,
    },
    {
      icon: VSCodeLogo,
      label: "Connect to VS Code",
      description: "Install MCP Server on VS Code",
      onClick: connectToVSCode,
      hasArrow: true,
    },
  ];

  return (
    <div className="copy-page-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer border border-solid"
        style={{
          backgroundColor: "#0a0a0a",
          borderColor: "rgba(63, 63, 70, 0.8)",
          color: "#a1a1aa",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#18181b";
          e.currentTarget.style.borderColor = "rgba(82, 82, 91, 0.9)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#0a0a0a";
          e.currentTarget.style.borderColor = "rgba(63, 63, 70, 0.8)";
        }}
      >
        <DocumentDuplicateIcon className="w-4 h-4" />
        <span>Copy page</span>
        <ChevronUpIcon
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "" : "rotate-180"}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-lg overflow-hidden shadow-2xl z-50 border border-solid"
          style={{
            backgroundColor: "#0a0a0a",
            borderColor: "rgba(63, 63, 70, 0.8)",
          }}
        >
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick();
                if (!item.label.includes("Copy") && item.label !== "Copied!") {
                  setIsOpen(false);
                }
              }}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-150 cursor-pointer border-0"
              style={{
                backgroundColor: "transparent",
                borderBottom:
                  index < menuItems.length - 1 ? "1px solid rgba(63, 63, 70, 0.5)" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#18181b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <item.icon className="w-5 h-5 text-zinc-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                  {item.hasArrow && <ArrowTopRightOnSquareIcon className="w-3 h-3 text-zinc-500" />}
                </div>
                <div className="text-xs text-zinc-600">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
