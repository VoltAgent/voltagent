import Link from "@docusaurus/Link";
import {
  HtmlClassNameProvider,
  PageMetadata,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import BlogLayout from "@theme/BlogLayout";
import SearchMetadata from "@theme/SearchMetadata";
import clsx from "clsx";
import React from "react";

export default function BlogTagsListPage({ tags }) {
  const allTags = tags || [];

  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogTagsListPage,
      )}
    >
      <PageMetadata title="All Tags" />
      <SearchMetadata tag="blog_tags_list" />
      <BlogLayout>
        <div className="relative w-full overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-24">
            <div className="mb-8">
              <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-main-emerald tracking-wide uppercase">
                Blog
              </h2>
              <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
                All Topics
              </p>
              <p className="max-w-3xl landing-md:text-base landing-xs:text-xs text-gray-400">
                Technical articles and best practices on building autonomous AI
                agents - Comprehensive guides on agent design, LLM integration,
                reasoning capabilities, and app development with the{" "}
                <span className="text-main-emerald">VoltAgent</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Tags Grid Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-8 landing-md:mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 landing-md:gap-6">
            {allTags.map((tag) => (
              <Link
                key={tag.permalink}
                to={tag.permalink}
                className={clsx(
                  "p-3 landing-md:p-5 rounded-lg transition-all",
                  "bg-white/5 hover:bg-white/10",
                  "no-underline hover:no-underline",
                  "border border-white/10 hover:border-main-emerald/20",
                  "group",
                )}
              >
                <div className="flex items-center justify-between mb-2 landing-md:mb-3">
                  <h3 className="landing-xs:text-base landing-md:text-lg font-semibold text-gray-200 group-hover:text-main-emerald transition-colors">
                    {tag.label}
                  </h3>
                  <span className="bg-white/10 text-gray-300 px-2 py-0.5 landing-md:py-1 rounded-full landing-xs:text-xs landing-md:text-sm font-medium">
                    {tag.count} {tag.count === 1 ? "post" : "posts"}
                  </span>
                </div>
                <p className="landing-xs:text-xs landing-md:text-sm text-gray-400">
                  View all posts about {tag.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </BlogLayout>
    </HtmlClassNameProvider>
  );
}
