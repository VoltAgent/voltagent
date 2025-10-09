import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";
import { BlogPostProvider } from "@docusaurus/theme-common/internal";
import BlogPostItem from "@theme/BlogPostItem";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";

const POSTS_PER_PAGE = 12;
const ANIMATION_DELAY = 25;

export default function BlogPostItems({
  items,
  component: BlogPostItemComponent = BlogPostItem,
  children,
}) {
  const [visiblePosts, setVisiblePosts] = useState(
    ExecutionEnvironment.canUseDOM ? POSTS_PER_PAGE : items.length,
  );
  const [loadedPosts, setLoadedPosts] = useState(
    items.slice(0, ExecutionEnvironment.canUseDOM ? POSTS_PER_PAGE : items.length),
  );
  const loaderRef = useRef(null);
  const isLoading = useRef(false);

  useEffect(() => {
    setLoadedPosts(items.slice(0, visiblePosts));
  }, [items, visiblePosts]);

  useEffect(() => {
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
    <div className="w-full">
      {children}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadedPosts.map(({ content: BlogPostContent }, index) => (
          <BlogPostProvider key={BlogPostContent.metadata.permalink} content={BlogPostContent}>
            <div
              className={clsx(
                ExecutionEnvironment.canUseDOM && "opacity-0",
                ExecutionEnvironment.canUseDOM && "animate-fade-in-up",
              )}
              style={
                ExecutionEnvironment.canUseDOM
                  ? {
                      animationDelay: `${Math.min(index * ANIMATION_DELAY, 300)}ms`,
                      animationFillMode: "forwards",
                    }
                  : undefined
              }
            >
              <BlogPostItemComponent>
                <BlogPostContent />
              </BlogPostItemComponent>
            </div>
          </BlogPostProvider>
        ))}
      </div>

      {ExecutionEnvironment.canUseDOM && visiblePosts < items.length && (
        <div ref={loaderRef} className="flex justify-center items-center py-8 mt-4">
          <div className="w-5 h-5 border-2 border-main-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
