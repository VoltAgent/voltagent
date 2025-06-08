import Link from "@docusaurus/Link";
// Assuming heroicons structure - adjust if needed
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import React from "react";
// Assuming SVG import structure - adjust if needed
// You might need to adjust this path based on your project structure
import { GitHubLogo } from "../../../static/img/logos/github";

interface GitHubDiscussionLinkProps {
  url: string;
  linkText?: string; // Optional custom text
}

export default function GitHubDiscussionLink({
  url,
  linkText,
}: GitHubDiscussionLinkProps): JSX.Element {
  const defaultText = "Share your ideas on GitHub Discussion";

  return (
    <div style={{ marginBottom: "1rem" }}>
      {" "}
      {/* Add some margin below the button */}
      <Link
        to={url}
        className="inline-flex items-center no-underline px-4 py-3 sm:py-4 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 text-base sm:text-lg font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 w-full justify-center"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="flex items-center justify-center">
          <GitHubLogo className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
          <span className="text-xs sm:text-base">
            {linkText || defaultText}
          </span>
          <ArrowTopRightOnSquareIcon
            className="hidden sm:inline-block w-5 h-5 ml-2 mb-1"
            aria-hidden="true"
          />
        </div>
      </Link>
    </div>
  );
}
