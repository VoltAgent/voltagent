import { useBlogPost } from "@docusaurus/theme-common/internal";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import clsx from "clsx";
import React, { useState } from "react";

// Helper function to convert object to URL parameters
const objectToGetParams = (object) => {
  const params = Object.entries(object)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    );

  return params.length > 0 ? `?${params.join("&")}` : "";
};

export const ShareWidget = () => {
  const [copied, setCopied] = useState(false);
  const { metadata } = useBlogPost();
  const { permalink, title } = metadata;
  const {
    siteConfig: { url },
  } = useDocusaurusContext();

  const fullUrl = `${url}${permalink}`;
  // Get site name from URL for use as source
  const siteName = new URL(url).hostname;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      <div className="text-xs font-medium text-main-emerald uppercase tracking-wider mb-3">
        SHARE
      </div>
      <div className="flex items-center gap-3">
        <a
          href={`https://linkedin.com/shareArticle${objectToGetParams({
            url: fullUrl,
            mini: true,
            title: title,
            summary: metadata.description || "",
            source: siteName,
          })}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="t dark:text-gray-400 hover:text-main-emerald dark:hover:text-main-emerald transition-colors pl-0 p-1 rounded-full"
          title="Share on LinkedIn"
          aria-label="Share on LinkedIn"
        >
          <svg
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            role="img"
          >
            <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
          </svg>
          <span className="sr-only">Share on LinkedIn</span>
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
            fullUrl,
          )}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="t dark:text-gray-400 hover:text-main-emerald dark:hover:text-main-emerald transition-colors p-1 rounded-full"
          title="Share on X (Twitter)"
          aria-label="Share on X (Twitter)"
        >
          <svg
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            role="img"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="sr-only">Share on X (Twitter)</span>
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="t dark:text-gray-400 hover:text-main-emerald dark:hover:text-main-emerald transition-colors relative group p-1 border-0 bg-transparent cursor-pointer rounded-full"
          title="Copy URL"
          style={{ outline: "none" }}
          aria-label="Copy URL"
        >
          <svg
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            role="img"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span
            className={clsx(
              "absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded bg-gray-900 text-white whitespace-nowrap transition-opacity",
              copied ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {copied ? "Copied!" : "Copy URL"}
          </span>
        </button>
      </div>
    </>
  );
};
