/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import BlogSidebar from "@theme/BlogSidebar";
import Layout from "@theme/Layout";
import clsx from "clsx";
import React from "react";

import { useWindowSize } from "@docusaurus/theme-common";
import { Footer } from "@site/src/components/footer";

export default function BlogLayout(props) {
  const { sidebar, toc, children, ...layoutProps } = props;
  const windowSize = useWindowSize();

  const isMobile = windowSize === "mobile" || windowSize === "ssr";
  const isBlogPostPage = toc !== undefined;

  return (
    <Layout {...layoutProps}>
      <div className="container-fluid margin-vert--lg px-0">
        <div className="row mx-0">
          {sidebar && (
            <aside className="col col--2 px-1">
              <BlogSidebar sidebar={sidebar} />
            </aside>
          )}
          <main
            className={clsx(
              "col",
              {
                "col--8": sidebar && !isMobile && isBlogPostPage,
                "col--9":
                  (sidebar && !isMobile && !isBlogPostPage) ||
                  (!sidebar && !isMobile && isBlogPostPage),
                "col--12": isMobile,
              },
              "px-3",
            )}
            itemScope
            itemType="https://schema.org/Blog"
          >
            {children}
          </main>
          {toc && !isMobile && (
            <div
              className={clsx(
                "col",
                {
                  "col--2": sidebar,
                  "col--3": !sidebar,
                },
                "px-0",
              )}
            >
              <div className="tableOfContents">{toc}</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
