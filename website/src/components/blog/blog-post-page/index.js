import Link from "@docusaurus/Link";
import { useBlogPost } from "@docusaurus/theme-common/internal";
import { blogPostContainerID } from "@docusaurus/utils-common";
import BlogPostItemContainer from "@theme/BlogPostItem/Container";
import MDXContent from "@theme/MDXContent";
import clsx from "clsx";
import React from "react";

import { DateComponent, ReadingTime } from "@site/src/components/blog/common";

const SimilarBlogs = () => {
  const { metadata } = useBlogPost();
  const MAX_RELATED_POSTS = 3;
  const MAX_WORDS = 12;

  const relatedPosts = (metadata.relatedPosts || []).slice(0, MAX_RELATED_POSTS);

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <section className="blog-related">
      <div className="blog-related__header">
        <h2>Related Posts</h2>
      </div>
      <div className="blog-related__grid">
        {relatedPosts.map((post) => {
          const description = post.description ?? "";
          const words = description.split(/\s+/);
          const shortened =
            words.length > MAX_WORDS ? `${words.slice(0, MAX_WORDS).join(" ")}…` : description;

          return (
            <Link key={post.permalink} to={post.permalink} className="blog-related__card">
              <article>
                <header>
                  <h3>{post.title}</h3>
                  <p>{shortened}</p>
                </header>
                <footer>
                  <DateComponent date={post.date} formattedDate={post.formattedDate} />
                  {post.readingTime && (
                    <>
                      <span className="separator" />
                      <ReadingTime readingTime={post.readingTime} />
                    </>
                  )}
                </footer>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export const BlogPostPageView = ({ children }) => {
  const { metadata, isBlogPostPage } = useBlogPost();
  const { permalink, title, date, formattedDate, readingTime, tags, authors } = metadata;
  const author = authors[0];

  return (
    <BlogPostItemContainer
      className={clsx(
        "blog-sm:py-0",
        "blog-md:py-0",
        "w-full",
        "mx-auto landing-lg:mr-0",
        "blog-sm:max-w-screen-blog-sm",
        "blog-lg:max-w-screen-content-2xl",
        "blog-content",
      )}
    >
      <div className={clsx("flex", "justify-between", "items-center", "blog-sm:px-6", "mb-8")}>
        <Link to="/blog" className={clsx("!text-main-emerald text-sm no-underline")}>
          ← Back to blog
        </Link>
      </div>

      <div className="blog-sm:px-6">
        <p className="mb-6 leading-[1.3] text-3xl font-bold" itemProp="headline">
          {isBlogPostPage ? (
            title
          ) : (
            <Link itemProp="url" to={permalink}>
              {title}
            </Link>
          )}
        </p>

        <div className="mb-6 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            {author && (
              <div className="flex items-center mb-2 sm:mb-0">
                {author.imageURL && (
                  <Link
                    to={`/blog/author/${author.key.toLowerCase().replace(/_/g, "-")}`}
                    className="mr-3"
                  >
                    <img
                      src={author.imageURL}
                      alt={author.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                  </Link>
                )}
                <div>
                  <div className="flex items-center">
                    <Link
                      to={`/blog/author/${author.key.toLowerCase().replace(/_/g, "-")}`}
                      className="text-main-emerald no-underline font-medium"
                    >
                      {author.name}
                    </Link>
                  </div>
                  {author?.title && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      {author.title}
                      {author?.bio && <span className="mx-1">-</span>}
                      {author.bio}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-main-emerald text-xs">
              <DateComponent date={date} formattedDate={formattedDate} />
              {typeof readingTime !== "undefined" && (
                <>
                  <span className="w-[4px] h-[4px] rounded-full bg-gray-600 dark:bg-gray-500" />
                  <ReadingTime readingTime={readingTime} />
                </>
              )}
            </div>
          </div>
        </div>

        <div id={blogPostContainerID} className="markdown" itemProp="articleBody">
          <MDXContent>{children}</MDXContent>
        </div>

        <SimilarBlogs currentPostTags={tags} currentPostId={metadata.id} title={title} />
      </div>
    </BlogPostItemContainer>
  );
};
