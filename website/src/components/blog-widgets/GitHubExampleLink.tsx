import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import {
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
} from "@heroicons/react/24/outline";
import type React from "react";
import { useState } from "react";
import { GitHubLogo } from "../../../static/img/logos/github";

interface GitHubExampleLinkProps {
  repoUrl: string;
  npmCommand: string;
}

const GitHubExampleLink: React.FC<GitHubExampleLinkProps> = ({
  repoUrl,
  npmCommand,
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(npmCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-8 px-6 py-4 border-dashed border-emerald-500 rounded-lg bg-gray-800">
      <div className="flex-grow">
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-md text-emerald-400 hover:text-emerald-500 no-underline !hover:no-underline font-medium inline-flex items-center mb-3"
        >
          <GitHubLogo className="w-6 h-6 mr-2 hidden sm:inline-block" />
          Get the code example for this article on GitHub
          <ArrowTopRightOnSquareIcon
            className="w-5 h-5 ml-1 hidden sm:inline-block"
            aria-hidden="true"
          />
        </a>
        <p className="text-gray-400 mb-3">To run this example locally:</p>
        <div className="flex items-stretch">
          <code className="flex flex-grow justify-between items-center bg-gray-700 p-4 text-xs text-gray-200 font-mono whitespace-pre-wrap break-all">
            <span className="mr-2">{npmCommand}</span>
            <button
              type="button"
              onClick={copyToClipboard}
              className="bg-transparent flex items-center justify-center cursor-pointer border-0 outline-none"
              aria-label="Copy code"
              title="Copy to clipboard"
            >
              {copied ? (
                <ClipboardDocumentCheckIcon
                  className="w-5 h-5 text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <ClipboardIcon
                  className="w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
              )}
            </button>
          </code>
        </div>
      </div>
    </div>
  );
};

export default GitHubExampleLink;
