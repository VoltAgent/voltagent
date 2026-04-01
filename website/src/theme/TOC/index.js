import { useLocation } from "@docusaurus/router";
import { ListBulletIcon } from "@heroicons/react/24/outline";
import TOCItems from "@theme/TOCItems";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { ShareWidget } from "./ShareWidget";

const LINK_CLASS_NAME = "table-of-contents__link toc-highlight";

export default function TOC({ toc, ...props }) {
  const location = useLocation();
  const isBlogPost = location.pathname.includes("/blog/");
  const [activeId, setActiveId] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id) {
              setActiveId(id);
            }
          }
        }
      },
      {
        rootMargin: "-64px 0% -40% 0%",
        threshold: 0,
      },
    );

    const headings = document.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
    for (const heading of headings) {
      observer.observe(heading);
    }

    return () => observer.disconnect();
  }, [location.pathname]);

  const tocWithActiveState = toc.map((item) => ({
    ...item,
    isActive: item.id === activeId,
    children: item.children?.map((child) => ({
      ...child,
      isActive: child.id === activeId,
    })),
  }));

  return (
    <div className={clsx("toc-wrapper", "overflow-x-hidden", "sticky", "top-[100px]")}>
      <div className="flex items-center  gap-2">
        <ListBulletIcon className="w-4 h-4 text-[#94bfaebf]" />
        <h3 className="text-sm text-left font-semibold text-gray-900 dark:text-gray-100 m-0">
          Table of Contents
        </h3>
      </div>
      <style>
        {`
                .table-of-contents {
                    border-left: none !important;
                    padding-left: 0 !important;
                    margin-bottom: 1rem !important;
                }

                .table-of-contents__link {
                    display: block;
                    padding: 0.25rem 0;
                    color: #6B7280 !important;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    transition: all 0.2s;
                    border-radius: 0;
                    padding-left: 0.25rem;
                    margin-left: 0;
                }
                
                .table-of-contents__link--active {
                    color: #10b981 !important;
                    font-weight: 500;
                    background: transparent !important;
                    padding-left: 0.25rem;
                    border-left: none;
                    margin-left: 0;
                    padding-right: 0.25rem;
                }

                :root[data-theme='dark'] .table-of-contents__link {
                    color: #9CA3AF !important;
                }

                :root[data-theme='dark'] .table-of-contents__link--active {
                    color: #10b981 !important;
                    background: transparent !important;
                }

                .table-of-contents__link:hover:not(.table-of-contents__link--active) {
                    color: #10b981 !important;
                    background: transparent !important;
                    padding-left: 0.25rem;
                    padding-right: 0.25rem;
                }

                :root[data-theme='dark'] .table-of-contents__link:hover:not(.table-of-contents__link--active) {
                    color: #10b981 !important;
                    background: transparent !important;
                }
                
                /* Add spacing between top-level items */
                .table-of-contents > li {
                    margin-bottom: 0.25rem;
                }
                
                /* Nested items styling */
                .table-of-contents > li > ul {
                    margin-top: 0.125rem;
                    margin-bottom: 0.375rem;
                    padding-left: 0.75rem;
                }
                
                /* Improve nested items appearance */
                .table-of-contents > li > ul > li {
                    position: relative;
                }
                
                .table-of-contents > li > ul > li:before {
                    content: none;
                }
                `}
      </style>
      <TOCItems
        {...props}
        toc={tocWithActiveState}
        linkClassName={LINK_CLASS_NAME}
        linkActiveClassName="table-of-contents__link--active"
        className="table-of-contents"
      />
      {isBlogPost && (
        <div className=" p-4 mt-8">
          <ShareWidget />
        </div>
      )}
    </div>
  );
}
