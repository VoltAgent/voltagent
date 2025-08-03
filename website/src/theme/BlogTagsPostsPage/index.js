import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import {
  HtmlClassNameProvider,
  PageMetadata,
  ThemeClassNames,
  usePluralForm,
} from "@docusaurus/theme-common";
import BlogLayout from "@theme/BlogLayout";
import BlogListPaginator from "@theme/BlogListPaginator";
import BlogPostItems from "@theme/BlogPostItems";
import SearchMetadata from "@theme/SearchMetadata";
import Unlisted from "@theme/Unlisted";
import clsx from "clsx";
import React, { useEffect, useState, useRef } from "react";

const POSTS_PER_PAGE = 12;

// Very simple pluralization: probably good enough for now
function useBlogPostsPlural() {
  const { selectMessage } = usePluralForm();
  return (count) =>
    selectMessage(
      count,
      translate(
        {
          id: "theme.blog.post.plurals",
          description:
            'Pluralized label for "{count} posts". Use as much plural forms (separated by "|") as your language support (see https://www.unicode.org/cldr/cldr-aux/charts/34/supplemental/language_plural_rules.html)',
          message: "One post|{count} posts",
        },
        { count },
      ),
    );
}

function useBlogTagsPostsPageTitle(tag) {
  const blogPostsPlural = useBlogPostsPlural();
  return translate(
    {
      id: "theme.blog.tagTitle",
      description: "The title of the page for a blog tag",
      message: '{nPosts} tagged with "{tagName}"',
    },
    { nPosts: blogPostsPlural(tag.count), tagName: tag.label },
  );
}

function BlogTagsPostsPageMetadata({ tag }) {
  const title = useBlogTagsPostsPageTitle(tag);
  return (
    <>
      <PageMetadata title={title} />
      <SearchMetadata tag="blog_tags_posts" />
    </>
  );
}

function BlogTagsPostsPageContent({ tag, items, listMetadata, tags }) {
  const title = useBlogTagsPostsPageTitle(tag);
  const [visiblePosts, setVisiblePosts] = useState(
    ExecutionEnvironment.canUseDOM ? POSTS_PER_PAGE : items.length,
  );
  const [loadedPosts, setLoadedPosts] = useState(
    items.slice(0, ExecutionEnvironment.canUseDOM ? POSTS_PER_PAGE : items.length),
  );
  const loaderRef = useRef(null);
  const isLoading = useRef(false);
  const allTags = tags?.allTags || [];

  useEffect(() => {
    setLoadedPosts(items.slice(0, visiblePosts));
  }, [items, visiblePosts]);

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && visiblePosts < items.length && !isLoading.current) {
          isLoading.current = true;
          setVisiblePosts((prev) => Math.min(prev + POSTS_PER_PAGE, items.length));
          isLoading.current = false;
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0.1,
      },
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [items.length, visiblePosts]);

  return (
    <BlogLayout>
      {tag.unlisted && <Unlisted />}

      <div className="relative w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-24">
          <div className="mb-8">
            <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-main-emerald tracking-wide uppercase">
              Blog
            </h2>
            <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
              {title}
            </p>
            <p className="max-w-3xl landing-md:text-base landing-xs:text-xs text-gray-400">
              Technical articles and best practices on building autonomous AI agents - Comprehensive
              guides on agent design, LLM integration, reasoning capabilities, and app development
              with the <span className="text-main-emerald">VoltAgent</span>.
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
                !tag
                  ? "bg-main-emerald/20 text-main-emerald border border-main-emerald/30"
                  : "bg-white/5 text-gray-300 hover:bg-main-emerald/10 hover:text-main-emerald/80 border border-white/10 hover:border-main-emerald/20",
                "shadow-sm",
              )}
            >
              All Posts
            </Link>
            {allTags.map((tagItem) => (
              <Link
                key={tagItem.permalink}
                to={tagItem.permalink}
                className={clsx(
                  "px-4 py-1.5",
                  "rounded-lg",
                  "font-medium landing-md:text-sm landing-xs:text-xs",
                  "cursor-pointer",
                  "no-underline hover:no-underline",
                  "transition-all duration-200",
                  tagItem.label.toLowerCase() === tag.label.toLowerCase()
                    ? "bg-main-emerald/20 text-main-emerald border border-main-emerald/30"
                    : "bg-white/5 text-gray-300 hover:bg-main-emerald/10 hover:text-main-emerald/80 border border-white/10 hover:border-main-emerald/20",
                  "shadow-sm",
                )}
              >
                {tagItem.label}
              </Link>
            ))}
          </div>

          <BlogPostItems items={loadedPosts} tags={allTags}>
            <div className="flex flex-col gap-8" />
          </BlogPostItems>
        </div>
      </div>

      {ExecutionEnvironment.canUseDOM && visiblePosts < items.length && (
        <div ref={loaderRef} className="flex justify-center items-center py-4">
          <div className="w-4 h-4 border-2 border-primary-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div
        className={clsx(
          "blog-md:max-w-screen-blog-2xl",
          "w-full",
          "mx-auto",
          "blog-md:px-7",
          "blog-2xl:px-0",
          "blog-md:border-t border-t-gray-200 dark:border-t-gray-700",
          "blog-sm:mb-16 blog-2xl:mb-20 mb-10",
        )}
      >
        <BlogListPaginator metadata={listMetadata} />
      </div>
    </BlogLayout>
  );
}

export default function BlogTagsPostsPage(props) {
  const { tags = [], ...rest } = props;
  return (
    <HtmlClassNameProvider
      className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogTagPostListPage)}
    >
      <BlogTagsPostsPageMetadata {...rest} />
      <BlogTagsPostsPageContent {...rest} tags={tags} />
    </HtmlClassNameProvider>
  );
}
