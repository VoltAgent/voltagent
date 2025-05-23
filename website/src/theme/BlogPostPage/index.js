import React from "react";

import {
  HtmlClassNameProvider,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import {
  BlogPostProvider,
  useBlogPost,
} from "@docusaurus/theme-common/internal";
import { BlogPostPageView } from "@site/src/components/blog/blog-post-page";
import BlogLayout from "@theme/BlogLayout";
import BlogPostPageMetadata from "@theme/BlogPostPage/Metadata";
import BlogPostPaginator from "@theme/BlogPostPaginator";
import TOC from "@theme/TOC";
import Unlisted from "@theme/Unlisted";
import clsx from "clsx";
import { Footer } from "@site/src/components/footer";

function BlogPostPageContent({ children }) {
  const { metadata, toc } = useBlogPost();
  const { nextItem, prevItem, frontMatter, unlisted } = metadata;
  const {
    hide_table_of_contents: hideTableOfContents,
    toc_min_heading_level: tocMinHeadingLevel,
    toc_max_heading_level: tocMaxHeadingLevel,
  } = frontMatter;

  return (
    <BlogLayout
      toc={
        !hideTableOfContents && toc.length > 0 ? (
          <TOC
            toc={toc}
            minHeadingLevel={tocMinHeadingLevel}
            maxHeadingLevel={tocMaxHeadingLevel}
          />
        ) : undefined
      }
    >
      {unlisted && <Unlisted />}

      <BlogPostPageView>{children}</BlogPostPageView>

      {(nextItem || prevItem) && (
        <BlogPostPaginator nextItem={nextItem} prevItem={prevItem} />
      )}
    </BlogLayout>
  );
}

export default function BlogPostPage(props) {
  const BlogPostContent = props.content;
  return (
    <BlogPostProvider content={props.content} isBlogPostPage>
      <HtmlClassNameProvider
        className={clsx(
          ThemeClassNames.wrapper.blogPages,
          ThemeClassNames.page.blogPostPage,
        )}
      >
        <BlogPostPageMetadata />
        <BlogPostPageContent>
          <BlogPostContent />
        </BlogPostPageContent>
      </HtmlClassNameProvider>
      <div className="mt-20">
        <Footer />
      </div>
    </BlogPostProvider>
  );
}
