import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import React from "react";

interface ApiKeyButtonProps {
  provider: string;
  href: string;
}

export default function ApiKeyButton({ provider, href }: ApiKeyButtonProps): JSX.Element {
  return (
    <div className="inline-flex api-key-button items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-solid border-emerald-500/30 rounded-lg transition-all text-sm font-medium">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-emerald-400 !border-bottom-none"
        style={{ textDecoration: "none" }}
      >
        Get {provider} API Key
        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
      </a>
    </div>
  );
}
