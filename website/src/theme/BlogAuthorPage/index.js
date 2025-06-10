import Link from "@docusaurus/Link";
import {
  HtmlClassNameProvider,
  PageMetadata,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import BlogPostItems from "@theme/BlogPostItems";
import Layout from "@theme/Layout";
import SearchMetadata from "@theme/SearchMetadata";
import clsx from "clsx";
import React from "react";

export default function BlogAuthorPage({ metadata, items }) {
  const { author, blogTitle, blogDescription, authorPosts } = metadata;
  const totalPosts = authorPosts?.length || 0;

  // Author bilgilerini al
  const authorInfo = items[0]?.content.metadata.authors[0];
  const authorName = authorInfo?.name;
  const authorTitle = authorInfo?.title;
  const authorUrl = authorInfo?.url;
  const authorBio = authorInfo?.bio;
  const authorGithub = authorInfo?.github;
  const authorLinkedin = authorInfo?.linkedin;
  const authorTwitter = authorInfo?.twitter;
  const authorImageUrl = authorInfo?.imageURL;
  return (
    <Layout>
      <PageMetadata title={blogTitle} description={blogDescription} />
      <SearchMetadata tag="blog_author_posts" />

      <div
        className={clsx(
          "w-full max-w-[592px] h-full landing-sm:max-w-[656px] landing-md:max-w-[896px] landing-lg:max-w-[1200px]",
          "px-4 landing-sm:px-0",
          "mx-auto",
          "flex flex-col",
          "not-prose",
          "blog-content",
          "pt-2",
        )}
      >
        <div>
          <Link
            to="/blog"
            className={clsx("!text-gray-500 text-sm no-underline")}
          >
            ← Back to blog
          </Link>

          <div className="landing-lg:pl-6 landing-lg:pr-6 mt-3 lg:mt-10">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {authorImageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={authorImageUrl}
                    alt={`${authorName || author}`}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-100 dark:border-gray-800"
                  />
                </div>
              )}
              <div>
                <h1
                  className={clsx(
                    "landing-md:text-[36px] landing-xs:text-[20px]",
                    "font-bold",
                    "px-0",
                    "m-0",
                    "landing-md:leading-7 landing-xs:leading-6",
                    "text-gray-900 dark:text-gray-100",
                  )}
                >
                  {authorName || author}
                </h1>
                {authorTitle && (
                  <div className="mt-2 text-base lg:text-lg text-gray-600 dark:text-gray-400">
                    {authorTitle}
                  </div>
                )}
                {authorUrl && (
                  <Link
                    href={authorUrl}
                    className="mt-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    @{authorUrl.split("/").pop()}
                  </Link>
                )}
                {authorBio && (
                  <p className="mt-4 text-sm lg:text-base text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                    {authorBio}
                  </p>
                )}

                {/* Social Media Links */}
                <div className="mt-4 flex items-center gap-3">
                  {authorGithub && (
                    <Link
                      href={authorGithub}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        role="img"
                        aria-labelledby="githubTitle"
                      >
                        <title id="githubTitle">GitHub</title>
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </Link>
                  )}
                  {authorLinkedin && (
                    <Link
                      href={authorLinkedin}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        role="img"
                        aria-labelledby="linkedinTitle"
                      >
                        <title id="linkedinTitle">LinkedIn</title>
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </Link>
                  )}
                  {authorTwitter && (
                    <Link
                      href={authorTwitter}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Twitter"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        role="img"
                        aria-labelledby="twitterTitle"
                      >
                        <title id="twitterTitle">Twitter</title>
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </Link>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                    aria-hidden="true"
                    role="img"
                    aria-labelledby="articlesTitle"
                  >
                    <title id="articlesTitle">Published articles</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                  <span>{totalPosts} articles published</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="mt-12">
          <div className="space-y-10">
            <BlogPostItems items={items} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
