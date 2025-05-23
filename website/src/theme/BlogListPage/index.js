import {
  HtmlClassNameProvider,
  PageMetadata,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { Footer } from "@site/src/components/footer";
import BlogLayout from "@theme/BlogLayout";
import BlogListPaginator from "@theme/BlogListPaginator";
import BlogPostItems from "@theme/BlogPostItems";
import SearchMetadata from "@theme/SearchMetadata";
import clsx from "clsx";
import React from "react";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import { DotPattern } from "../../components/ui/dot-pattern";

function BlogListPageMetadata(props) {
  const { metadata } = props;
  const {
    siteConfig: { title: siteTitle },
  } = useDocusaurusContext();
  const { blogDescription, blogTitle, permalink } = metadata;
  const isBlogOnlyMode = permalink === "/";
  const title = isBlogOnlyMode ? siteTitle : blogTitle;
  return (
    <>
      <PageMetadata title={title} description={blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
    </>
  );
}

function BlogListPageContent(props) {
  const { metadata, items } = props;
  const { pathname } = useLocation();
  const allTags = metadata.allTags || [];

  return (
    <BlogLayout>
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      <div className="relative w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-24">
          <div className="mb-8">
            <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-main-emerald tracking-wide uppercase">
              Blog
            </h2>
            <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
              AI Engineering
            </p>
            <p className="max-w-3xl landing-md:text-base landing-xs:text-xs text-gray-400">
              Technical articles and best practices on building autonomous AI
              agents - Comprehensive guides on agent design, LLM integration,
              reasoning capabilities, and app development with the{" "}
              <span className="text-main-emerald">VoltAgent</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center landing-xs:mb-4 landing-md:mb-8">
            <Link
              to="/blog"
              className={clsx(
                "px-4 py-1.5",
                "rounded-lg",
                "font-medium landing-md:text-sm landing-xs:text-xs",
                "cursor-pointer",
                "no-underline hover:no-underline",
                "transition-all duration-200",
                pathname === "/blog/"
                  ? "bg-main-emerald/20 text-main-emerald border border-main-emerald/30"
                  : "bg-white/5 text-gray-300 hover:bg-main-emerald/10 hover:text-main-emerald/80 border border-white/10 hover:border-main-emerald/20",
                "shadow-sm",
              )}
            >
              All Posts
            </Link>
            {allTags.map((tag) => (
              <Link
                key={tag.permalink}
                to={tag.permalink}
                className={clsx(
                  "px-4 py-1.5",
                  "rounded-lg",
                  "font-medium landing-md:text-sm landing-xs:text-xs",
                  "cursor-pointer",
                  "no-underline hover:no-underline",
                  "transition-all duration-200",
                  pathname === tag.permalink
                    ? "bg-main-emerald/20 text-main-emerald border border-main-emerald/30"
                    : "bg-white/5 text-gray-300 hover:bg-main-emerald/10 hover:text-main-emerald/80 border border-white/10 hover:border-main-emerald/20",
                  "shadow-sm",
                )}
              >
                {tag.label}
              </Link>
            ))}
          </div>

          <BlogPostItems items={items} tags={allTags} metadata={metadata} />

          <div className="mt-8 sm:mt-10 flex justify-center">
            <Link
              to="/blog"
              className="group flex items-center py-2 sm:py-3 px-3 border border-white/10 rounded-lg hover:border-gray-600 transition-colors no-underline"
            >
              <span className="text-sm  text-main-emerald font-medium  mr-2">
                <BlogListPaginator metadata={metadata} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </BlogLayout>
  );
}

export default function BlogListPage(props) {
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}
    >
      <BlogListPageMetadata {...props} />
      <BlogListPageContent {...props} />
      <Footer />
    </HtmlClassNameProvider>
  );
}
