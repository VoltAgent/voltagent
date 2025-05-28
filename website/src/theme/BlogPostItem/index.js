import Link from "@docusaurus/Link";
import { useBlogPost } from "@docusaurus/theme-common/internal";
import BlogPostItemContainer from "@theme/BlogPostItem/Container";
import React from "react";
import clsx from "clsx";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

export default function BlogPostItem({ className }) {
  const { metadata } = useBlogPost();
  const {
    permalink,
    title,
    date,
    formattedDate,
    frontMatter,
    description,
    tags,
    authors,
  } = metadata;

  const author = authors?.[0];

  // All tags now use main-emerald color
  const getTagColor = () => {
    return "bg-main-emerald/20 text-main-emerald border border-main-emerald/30 hover:bg-main-emerald/30 hover:border-main-emerald/40 transition-colors";
  };

  return (
    <BlogPostItemContainer className={className}>
      <div className="group p-4 sm:p-5 rounded-lg border border-solid border-white/10 no-underline hover:border-main-emerald/70 transition-colors flex flex-col landing-md:h-[220px] landing-xs:h-[190px] bg-white/5 hover:shadow-lg hover:shadow-main-emerald/5">
        <Link
          itemProp="url"
          to={permalink}
          className="block no-underline hover:no-underline h-full flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {author && (
                <>
                  {author.imageURL && (
                    <img
                      src={author.imageURL}
                      alt={author.name}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span className="text-xs text-gray-400">{author.name}</span>
                </>
              )}
              <span className="text-xs text-gray-500 ">•</span>
              <time className="text-xs text-gray-400 ">
                {new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-main-emerald group-hover:translate-x-1 transition-transform" />
          </div>

          <div className="">
            <h3 className="landing-xs:text-sm landing-lg:text-lg font-semibold leading-tight mb-2 text-main-emerald line-clamp-2 overflow-hidden group-hover:text-main-emerald">
              {title}
            </h3>
          </div>

          <div className="mb-3">
            <p className="text-gray-300 mb-0 text-xs line-clamp-2 overflow-hidden ">
              {description}
            </p>
          </div>

          <div className="mt-auto">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag) => (
                  <Link
                    key={tag.permalink}
                    to={tag.permalink}
                    onClick={(e) => e.stopPropagation()}
                    className={clsx(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium no-underline",
                      getTagColor(),
                    )}
                  >
                    {tag.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Link>
      </div>
    </BlogPostItemContainer>
  );
}
